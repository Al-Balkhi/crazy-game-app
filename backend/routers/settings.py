from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import extract
from database import get_db
from models import Settings, Session as GameSession, SessionProduct, SessionStatus
from schemas import (
    SettingsUpdate,
    SettingsResponse,
    AuthRequest,
    AuthResponse,
)
from auth import get_settings_row, hash_password

router = APIRouter(tags=["Settings"])


def _to_settings_response(settings: Settings) -> SettingsResponse:
    return SettingsResponse(
        id=settings.id,
        store_name=settings.store_name,
        logo_path=settings.logo_path,
        username=settings.username,
        password_enabled=settings.password_enabled,
        has_password=bool(settings.password_hash),
    )


@router.get("/settings", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    return _to_settings_response(get_settings_row(db))


@router.put("/settings", response_model=SettingsResponse)
def update_settings(data: SettingsUpdate, db: Session = Depends(get_db)):
    settings = get_settings_row(db)

    if data.store_name is not None:
        settings.store_name = data.store_name
    if data.username is not None:
        settings.username = data.username
    if data.password is not None:
        settings.password_hash = hash_password(data.password)

    if data.password_enabled is not None:
        if data.password_enabled and not settings.password_hash and not data.password:
            raise HTTPException(
                status_code=400,
                detail="Set a password before enabling password protection",
            )
        settings.password_enabled = data.password_enabled

    db.commit()
    db.refresh(settings)
    return _to_settings_response(settings)


@router.post("/settings/auth", response_model=AuthResponse)
def verify_auth(data: AuthRequest, db: Session = Depends(get_db)):
    settings = get_settings_row(db)
    if not settings.password_enabled:
        return {"success": True, "message": "Authentication disabled"}
    if not settings.password_hash:
        return {"success": False, "message": "No password configured"}
    if settings.password_hash == hash_password(data.password):
        return {"success": True, "message": "Authenticated"}
    return {"success": False, "message": "Invalid password"}


@router.get("/reports/monthly")
def get_monthly_report(
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    db: Session = Depends(get_db),
):
    # Sessions completed in the given month
    sessions = (
        db.query(GameSession)
        .filter(
            GameSession.status == SessionStatus.COMPLETED.value,
            extract("year", GameSession.start_time) == year,
            extract("month", GameSession.start_time) == month,
        )
        .all()
    )

    device_revenue = sum(s.session_price for s in sessions)
    product_revenue = 0.0
    total_products_sold = 0

    for s in sessions:
        for sp in s.products:
            product_revenue += sp.unit_price * sp.quantity
            total_products_sold += sp.quantity

    return {
        "month": f"{year}-{month:02d}",
        "device_revenue": device_revenue,
        "product_revenue": product_revenue,
        "total_income": device_revenue + product_revenue,
        "total_sessions": len(sessions),
        "total_products_sold": total_products_sold,
    }


@router.get("/reports/daily")
def get_daily_report(
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    day: int = Query(..., ge=1, le=31),
    db: Session = Depends(get_db),
):
    # Sessions completed on the given day
    sessions = (
        db.query(GameSession)
        .filter(
            GameSession.status == SessionStatus.COMPLETED.value,
            extract("year", GameSession.start_time) == year,
            extract("month", GameSession.start_time) == month,
            extract("day", GameSession.start_time) == day,
        )
        .all()
    )

    device_revenue = sum(s.session_price for s in sessions)
    product_revenue = 0.0
    total_products_sold = 0

    for s in sessions:
        for sp in s.products:
            product_revenue += sp.unit_price * sp.quantity
            total_products_sold += sp.quantity

    return {
        "day": f"{year}-{month:02d}-{day:02d}",
        "device_revenue": device_revenue,
        "product_revenue": product_revenue,
        "total_income": device_revenue + product_revenue,
        "total_sessions": len(sessions),
        "total_products_sold": total_products_sold,
    }

