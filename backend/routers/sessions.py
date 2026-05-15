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
from pricing import (
    calc_booked_session_price,
    min_open_session_price,
    resolve_open_session_charge,
    resolve_session_charge,
)
from datetime import datetime

router = APIRouter(prefix="/sessions", tags=["Sessions"])


def _calc_total_cost(session: GameSession) -> float:
    """Final session device charge + all ordered products."""
    products_total = sum(sp.unit_price * sp.quantity for sp in session.products)
    return session.session_price + products_total


def _booked_price_for(session: GameSession) -> float:
    if session.booked_session_price is not None:
        return session.booked_session_price
    return session.session_price


@router.post("/", response_model=SessionResponse)
def start_session(data: SessionCreate, db: Session = Depends(get_db)):
    if not data.is_open_session:
        if data.duration_minutes < 30:
            raise HTTPException(status_code=400, detail="Duration must be at least 30 minutes")
        if data.duration_minutes % 15 != 0:
            raise HTTPException(
                status_code=400,
                detail="Duration must be in 15-minute increments (30, 45, 60, etc.)",
            )

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

    if data.is_open_session:
        booked_price = 0.0
        duration_minutes = 0
    else:
        booked_price = calc_booked_session_price(
            device.device_type, data.session_type, data.duration_minutes
        )
        duration_minutes = data.duration_minutes

    session = GameSession(
        device_id=data.device_id,
        duration_minutes=duration_minutes,
        session_type=data.session_type,
        is_open_session=data.is_open_session,
        booked_session_price=booked_price,
        session_price=booked_price,
        total_cost=booked_price,
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

    device = (
        db.query(Device)
        .options(joinedload(Device.device_type))
        .filter(Device.id == session.device_id)
        .first()
    )

    ended_at = datetime.utcnow()
    booked_price = _booked_price_for(session)

    if session.is_open_session:
        device_type = device.device_type
        final_price, actual_minutes, _billable = resolve_open_session_charge(
            device_type,
            session.session_type,
            session.start_time,
            ended_at,
        )
        booked_price = min_open_session_price(device_type, session.session_type)
        early_end = False
    else:
        final_price, actual_minutes, _billable = resolve_session_charge(
            booked_price,
            session.duration_minutes,
            session.start_time,
            ended_at,
        )
        early_end = actual_minutes < session.duration_minutes

    session.status = SessionStatus.COMPLETED.value
    session.ended_at = ended_at
    session.actual_minutes = actual_minutes
    session.session_price = final_price
    if session.is_open_session:
        session.booked_session_price = final_price
    session.total_cost = _calc_total_cost(session)
    db.commit()
    db.refresh(session)
    return {
        "message": "Session ended",
        "total_cost": session.total_cost,
        "session_price": session.session_price,
        "booked_session_price": booked_price,
        "actual_minutes": actual_minutes,
        "booked_minutes": session.duration_minutes,
        "early_end": early_end,
        "is_open_session": session.is_open_session,
    }


@router.post("/{session_id}/products", response_model=SessionProductResponse)
def add_product_to_session(
    session_id: int, data: SessionProductCreate, db: Session = Depends(get_db)
):
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

    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    available = product.quantity or 0
    if data.quantity > available:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock for {product.name}. Available: {available}",
        )

    product.quantity = available - data.quantity

    sp = SessionProduct(
        session_id=session_id,
        product_id=data.product_id,
        quantity=data.quantity,
        unit_price=product.selling_price,
    )
    db.add(sp)
    db.flush()

    session.total_cost = session.session_price + sum(
        s.unit_price * s.quantity for s in session.products
    )

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

    result = {
        "id": session.id,
        "device_id": session.device_id,
        "start_time": session.start_time,
        "duration_minutes": session.duration_minutes,
        "actual_minutes": session.actual_minutes,
        "is_open_session": bool(session.is_open_session),
        "session_type": session.session_type,
        "booked_session_price": _booked_price_for(session),
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

    booked_price = _booked_price_for(session)
    actual = session.actual_minutes
    is_open = bool(session.is_open_session)
    early_end = (
        not is_open
        and actual is not None
        and actual < session.duration_minutes
        and session.session_price < booked_price
    )

    return {
        "session_id": session.id,
        "device_name": device.name,
        "device_type": device_type.name if device_type else "Unknown",
        "start_time": session.start_time,
        "ended_at": session.ended_at,
        "duration_minutes": session.duration_minutes,
        "actual_minutes": actual,
        "is_open_session": is_open,
        "session_type": session.session_type,
        "booked_session_price": booked_price if not is_open else session.session_price,
        "session_price": session.session_price,
        "early_end": early_end,
        "products": products,
        "products_total": products_total,
        "total_cost": session.total_cost,
    }
