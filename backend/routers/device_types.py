from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import DeviceType
from schemas import DeviceTypeCreate, DeviceTypeUpdate, DeviceTypeResponse
router = APIRouter(prefix="/device-types", tags=["Device Types"])


@router.get("/", response_model=List[DeviceTypeResponse])
def list_device_types(
    active_only: bool = False,
    db: Session = Depends(get_db),
):
    query = db.query(DeviceType)
    if active_only:
        query = query.filter(DeviceType.is_active == True)
    return query.order_by(DeviceType.id).all()


@router.post("/", response_model=DeviceTypeResponse)
def create_device_type(data: DeviceTypeCreate, db: Session = Depends(get_db)):
    existing = db.query(DeviceType).filter(DeviceType.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Device type already exists")
    device_type = DeviceType(**data.model_dump())
    db.add(device_type)
    db.commit()
    db.refresh(device_type)
    return device_type


@router.put("/{type_id}", response_model=DeviceTypeResponse)
def update_device_type(
    type_id: int, data: DeviceTypeUpdate, db: Session = Depends(get_db)
):
    device_type = db.query(DeviceType).filter(DeviceType.id == type_id).first()
    if not device_type:
        raise HTTPException(status_code=404, detail="Device type not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(device_type, key, value)
    db.commit()
    db.refresh(device_type)
    return device_type


@router.delete("/{type_id}")
def delete_device_type(type_id: int, db: Session = Depends(get_db)):
    device_type = db.query(DeviceType).filter(DeviceType.id == type_id).first()
    if not device_type:
        raise HTTPException(status_code=404, detail="Device type not found")
    
    try:
        db.delete(device_type)
        db.commit()
        return {"message": "Device type deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Cannot delete device type: {str(e)}")


@router.patch("/{type_id}/toggle", response_model=DeviceTypeResponse)
def toggle_device_type(type_id: int, db: Session = Depends(get_db)):
    device_type = db.query(DeviceType).filter(DeviceType.id == type_id).first()
    if not device_type:
        raise HTTPException(status_code=404, detail="Device type not found")
    device_type.is_active = not device_type.is_active
    db.commit()
    db.refresh(device_type)
    return device_type
