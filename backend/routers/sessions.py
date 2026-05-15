from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import (
    Session as GameSession,
    SessionProduct,
    Device,
    DeviceType,
    Product,
    SessionStatus,
)
from schemas import (
    SessionCreate,
    SessionResponse,
    SessionProductCreate,
    SessionProductResponse,
    InvoiceResponse,
)
from datetime import datetime

router = APIRouter(prefix="/sessions", tags=["Sessions"])


def _calc_session_price(device_type: DeviceType, session_type: str) -> float:
    """Look up the price for a given session type on a device type."""
    price_map = {
        "dual": device_type.dual_price,
        "triple": device_type.triple_price,
        "quad": device_type.quad_price,
    }
    return price_map.get(session_type, 0.0)


def _calc_total_cost(session: GameSession) -> float:
    """Session price + all ordered products."""
    products_total = sum(sp.unit_price * sp.quantity for sp in session.products)
    return session.session_price + products_total


@router.post("/", response_model=SessionResponse)
def start_session(data: SessionCreate, db: Session = Depends(get_db)):
    # Validate device exists and is active
    device = (
        db.query(Device)
        .options(joinedload(Device.device_type))
        .filter(Device.id == data.device_id)
        .first()
    )
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    if not device.is_active:
        raise HTTPException(status_code=400, detail="Device is disabled")

    # Check no active session on this device
    active = (
        db.query(GameSession)
        .filter(
            GameSession.device_id == data.device_id,
            GameSession.status == SessionStatus.ACTIVE.value,
        )
        .first()
    )
    if active:
        raise HTTPException(status_code=400, detail="Device already has an active session")

    # Calculate price
    session_price = _calc_session_price(device.device_type, data.session_type)

    session = GameSession(
        device_id=data.device_id,
        duration_minutes=data.duration_minutes,
        session_type=data.session_type,
        session_price=session_price,
        total_cost=session_price,
        status=SessionStatus.ACTIVE.value,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.put("/{session_id}/end")
def end_session(session_id: int, db: Session = Depends(get_db)):
    session = (
        db.query(GameSession)
        .options(joinedload(GameSession.products))
        .filter(GameSession.id == session_id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status != SessionStatus.ACTIVE.value:
        raise HTTPException(status_code=400, detail="Session is not active")

    session.status = SessionStatus.COMPLETED.value
    session.ended_at = datetime.utcnow()
    session.total_cost = _calc_total_cost(session)
    db.commit()
    db.refresh(session)
    return {"message": "Session ended", "total_cost": session.total_cost}


@router.post("/{session_id}/products", response_model=SessionProductResponse)
def add_product_to_session(
    session_id: int, data: SessionProductCreate, db: Session = Depends(get_db)
):
    session = db.query(GameSession).filter(GameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status != SessionStatus.ACTIVE.value:
        raise HTTPException(status_code=400, detail="Session is not active")

    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    sp = SessionProduct(
        session_id=session_id,
        product_id=data.product_id,
        quantity=data.quantity,
        unit_price=product.selling_price,
    )
    db.add(sp)

    # Update session total
    session.total_cost = session.session_price + sum(
        s.unit_price * s.quantity for s in session.products
    ) + (sp.unit_price * sp.quantity)

    db.commit()
    db.refresh(sp)
    return {
        "id": sp.id,
        "product_id": sp.product_id,
        "product_name": product.name,
        "quantity": sp.quantity,
        "unit_price": sp.unit_price,
    }


@router.get("/{session_id}", response_model=SessionResponse)
def get_session(session_id: int, db: Session = Depends(get_db)):
    session = (
        db.query(GameSession)
        .options(joinedload(GameSession.products))
        .filter(GameSession.id == session_id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Enrich product names
    result = {
        "id": session.id,
        "device_id": session.device_id,
        "start_time": session.start_time,
        "duration_minutes": session.duration_minutes,
        "session_type": session.session_type,
        "session_price": session.session_price,
        "total_cost": session.total_cost,
        "status": session.status,
        "ended_at": session.ended_at,
        "products": [],
    }
    for sp in session.products:
        product = db.query(Product).filter(Product.id == sp.product_id).first()
        result["products"].append({
            "id": sp.id,
            "product_id": sp.product_id,
            "product_name": product.name if product else "Unknown",
            "quantity": sp.quantity,
            "unit_price": sp.unit_price,
        })
    return result


@router.get("/{session_id}/invoice", response_model=InvoiceResponse)
def get_invoice(session_id: int, db: Session = Depends(get_db)):
    session = (
        db.query(GameSession)
        .options(joinedload(GameSession.products), joinedload(GameSession.device))
        .filter(GameSession.id == session_id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    device = session.device
    device_type = db.query(DeviceType).filter(DeviceType.id == device.device_type_id).first()

    products = []
    products_total = 0.0
    for sp in session.products:
        product = db.query(Product).filter(Product.id == sp.product_id).first()
        products.append({
            "id": sp.id,
            "product_id": sp.product_id,
            "product_name": product.name if product else "Unknown",
            "quantity": sp.quantity,
            "unit_price": sp.unit_price,
        })
        products_total += sp.unit_price * sp.quantity

    return {
        "session_id": session.id,
        "device_name": device.name,
        "device_type": device_type.name if device_type else "Unknown",
        "start_time": session.start_time,
        "ended_at": session.ended_at,
        "duration_minutes": session.duration_minutes,
        "session_type": session.session_type,
        "session_price": session.session_price,
        "products": products,
        "products_total": products_total,
        "total_cost": session.total_cost,
    }
