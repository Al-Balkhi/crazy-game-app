from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from database import get_db
from models import Settings, Session as GameSession, SessionProduct, SessionStatus
from schemas import (
    SettingsUpdate,
    SettingsResponse,
    AuthRequest,
    AuthResponse,
    MonthlyReportResponse,
)
import hashlib

router = APIRouter(tags=["Settings"])


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def _get_or_create_settings(db: Session) -> Settings:
    settings = db.query(Settings).first()
    if not settings:
        settings = Settings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.get("/settings", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    return _get_or_create_settings(db)


@router.put("/settings", response_model=SettingsResponse)
def update_settings(data: SettingsUpdate, db: Session = Depends(get_db)):
    settings = _get_or_create_settings(db)

    if data.store_name is not None:
        settings.store_name = data.store_name
    if data.username is not None:
        settings.username = data.username
    if data.password is not None:
        settings.password_hash = _hash_password(data.password)
    if data.password_enabled is not None:
        settings.password_enabled = data.password_enabled

    db.commit()
    db.refresh(settings)
    return settings


@router.post("/settings/auth", response_model=AuthResponse)
def verify_auth(data: AuthRequest, db: Session = Depends(get_db)):
    settings = _get_or_create_settings(db)
    if not settings.password_enabled:
        return {"success": True, "message": "Authentication disabled"}
    if settings.password_hash == _hash_password(data.password):
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
