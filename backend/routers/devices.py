from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from database import get_db
from models import Device, DeviceType, Session as GameSession, SessionStatus
from schemas import DeviceCreate, DeviceUpdate, DeviceResponse

router = APIRouter(prefix="/devices", tags=["Devices"])


def _enrich_device(device: Device, db: Session) -> dict:
    """Convert device ORM object to dict with active session info."""
    active_session = (
        db.query(GameSession)
        .filter(
            GameSession.device_id == device.id,
            GameSession.status == SessionStatus.ACTIVE.value,
        )
        .first()
    )

    result = {
        "id": device.id,
        "name": device.name,
        "device_type_id": device.device_type_id,
        "is_active": device.is_active,
        "device_type": device.device_type,
        "active_session": None,
    }

    if active_session:
        products = []
        for sp in active_session.products:
            products.append({
                "id": sp.id,
                "product_id": sp.product_id,
                "product_name": sp.product.name if sp.product else None,
                "quantity": sp.quantity,
                "unit_price": sp.unit_price,
            })
        result["active_session"] = {
            "id": active_session.id,
            "device_id": active_session.device_id,
            "start_time": active_session.start_time,
            "duration_minutes": active_session.duration_minutes,
            "session_type": active_session.session_type,
            "session_price": active_session.session_price,
            "total_cost": active_session.total_cost,
            "status": active_session.status,
            "ended_at": active_session.ended_at,
            "products": products,
        }

    return result


@router.get("/")
def list_devices(db: Session = Depends(get_db)):
    devices = (
        db.query(Device)
        .options(joinedload(Device.device_type))
        .order_by(Device.id)
        .all()
    )
    return [_enrich_device(d, db) for d in devices]


@router.post("/", response_model=DeviceResponse)
def create_device(data: DeviceCreate, db: Session = Depends(get_db)):
    device_type = db.query(DeviceType).filter(DeviceType.id == data.device_type_id).first()
    if not device_type:
        raise HTTPException(status_code=404, detail="Device type not found")
    device = Device(**data.model_dump())
    db.add(device)
    db.commit()
    db.refresh(device)
    device.device_type = device_type
    return device


@router.put("/{device_id}", response_model=DeviceResponse)
def update_device(device_id: int, data: DeviceUpdate, db: Session = Depends(get_db)):
    device = db.query(Device).options(joinedload(Device.device_type)).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(device, key, value)
    db.commit()
    db.refresh(device)
    return device


@router.delete("/{device_id}")
def delete_device(device_id: int, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    db.delete(device)
    db.commit()
    return {"message": "Device deleted"}


@router.patch("/{device_id}/toggle", response_model=DeviceResponse)
def toggle_device(device_id: int, db: Session = Depends(get_db)):
    device = db.query(Device).options(joinedload(Device.device_type)).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    device.is_active = not device.is_active
    db.commit()
    db.refresh(device)
    return device
