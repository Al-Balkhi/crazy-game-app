from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import extract, func
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
from datetime import datetime, timedelta
from typing import Optional

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


@router.get("/", tags=["Sessions"])
def list_sessions(
    filter: Optional[str] = Query(None, description="day, week, month, or None for all"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List completed sessions for the invoice log, newest first."""
    q = (
        db.query(GameSession)
        .options(joinedload(GameSession.products), joinedload(GameSession.device))
        .filter(GameSession.status == SessionStatus.COMPLETED.value)
    )
    now = datetime.utcnow()
    if filter == "day":
        q = q.filter(GameSession.ended_at >= now - timedelta(days=1))
    elif filter == "week":
        q = q.filter(GameSession.ended_at >= now - timedelta(weeks=1))
    elif filter == "month":
        q = q.filter(GameSession.ended_at >= now - timedelta(days=30))

    total = q.count()
    sessions = q.order_by(GameSession.ended_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    results = []
    for s in sessions:
        device = s.device
        products_total = sum(sp.unit_price * sp.quantity for sp in s.products)
        products_cost = sum(
            (db.query(Product).filter(Product.id == sp.product_id).first().purchase_price or 0) * sp.quantity
            for sp in s.products
        )
        # profit = revenue - cost_of_goods
        # device cost is 0 (labour/fixed cost not tracked), so profit = session_price - products cost
        profit = s.session_price + products_total - products_cost
        results.append({
            "session_id": s.id,
            "device_name": device.name if device else "Unknown",
            "device_type": device.device_type.name if device and device.device_type else "Unknown",
            "session_type": s.session_type,
            "is_open_session": bool(s.is_open_session),
            "start_time": s.start_time,
            "ended_at": s.ended_at,
            "duration_minutes": s.duration_minutes,
            "actual_minutes": s.actual_minutes,
            "session_price": s.session_price,
            "products_total": products_total,
            "total_cost": s.total_cost,
            "profit": profit,
            "status": s.status,
        })
    return {"total": total, "page": page, "page_size": page_size, "items": results}


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
    if session.status not in (SessionStatus.ACTIVE.value, "paused"):
        raise HTTPException(status_code=400, detail="Session is not active or paused")

    # If it was paused, treat the paused time as the end point (no extra charge while paused)
    if session.status == "paused" and session.paused_at:
        # Use paused_at as the effective end time so paused time isn't billed
        # but we still want to run the normal end logic with the current time
        session.status = SessionStatus.ACTIVE.value
        session.paused_at = None

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


@router.put("/{session_id}/pause")
def pause_session(session_id: int, db: Session = Depends(get_db)):
    """Pause an active session. Timer is frozen until resumed."""
    session = db.query(GameSession).filter(GameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status != SessionStatus.ACTIVE.value:
        raise HTTPException(status_code=400, detail="Session is not active")

    session.status = "paused"
    session.paused_at = datetime.utcnow()
    db.commit()
    return {"message": "Session paused", "paused_at": session.paused_at}


@router.put("/{session_id}/resume")
def resume_session(session_id: int, db: Session = Depends(get_db)):
    """Resume a paused session. Extends the end time by the pause duration."""
    session = db.query(GameSession).filter(GameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status != "paused":
        raise HTTPException(status_code=400, detail="Session is not paused")

    # Calculate how long the session was paused and extend start_time by that amount
    # This effectively shifts the session window forward so the timer reflects real play time
    if session.paused_at:
        pause_duration = datetime.utcnow() - session.paused_at
        session.start_time = session.start_time + pause_duration

    session.status = SessionStatus.ACTIVE.value
    session.paused_at = None
    db.commit()
    return {"message": "Session resumed", "new_start_time": session.start_time}


@router.delete("/{session_id}/products/{session_product_id}")
def remove_product_from_session(
    session_id: int, session_product_id: int, db: Session = Depends(get_db)
):
    """Remove a product from an active session and restore the stock."""
    session = (
        db.query(GameSession)
        .options(joinedload(GameSession.products))
        .filter(GameSession.id == session_id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status not in (SessionStatus.ACTIVE.value, "paused"):
        raise HTTPException(status_code=400, detail="Session is not active or paused")

    sp = db.query(SessionProduct).filter(
        SessionProduct.id == session_product_id,
        SessionProduct.session_id == session_id,
    ).first()
    if not sp:
        raise HTTPException(status_code=404, detail="Session product not found")

    # Restore inventory
    product = db.query(Product).filter(Product.id == sp.product_id).first()
    if product:
        product.quantity = (product.quantity or 0) + sp.quantity

    db.delete(sp)
    db.flush()

    # Recalculate total
    remaining_products = db.query(SessionProduct).filter(
        SessionProduct.session_id == session_id
    ).all()
    session.total_cost = session.session_price + sum(
        p.unit_price * p.quantity for p in remaining_products
    )
    db.commit()
    return {"message": "Product removed from session"}

