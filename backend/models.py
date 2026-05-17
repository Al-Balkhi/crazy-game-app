from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum
)
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import enum


class SessionType(str, enum.Enum):
    DUAL = "dual"
    TRIPLE = "triple"
    QUAD = "quad"


class SessionStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


# ---------------------------------------------------------------------------
# Device Type — PS5, PS4, Gaming PC, etc.  Each has its own pricing.
# ---------------------------------------------------------------------------
class DeviceType(Base):
    __tablename__ = "device_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    icon = Column(String(50), default="monitor")  # Lucide icon name
    dual_price = Column(Float, default=0.0)
    triple_price = Column(Float, default=0.0)
    quad_price = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    devices = relationship("Device", back_populates="device_type", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# Device — individual physical machine in the lounge
# ---------------------------------------------------------------------------
class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    device_type_id = Column(Integer, ForeignKey("device_types.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    device_type = relationship("DeviceType", back_populates="devices")
    sessions = relationship("Session", back_populates="device", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# Product — food / drink / accessory sold at the lounge
# ---------------------------------------------------------------------------
class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    purchase_price = Column(Float, default=0.0)
    selling_price = Column(Float, default=0.0)
    quantity = Column(Integer, default=0)
    initial_quantity = Column(Integer, default=0)  # baseline for 10% low-stock alert
    refill_count = Column(Integer, default=0)  # tracks how many times product has been restocked
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    session_products = relationship("SessionProduct", back_populates="product", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# Session — a rental session tying a device to a time window
# ---------------------------------------------------------------------------
class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    start_time = Column(DateTime, default=datetime.utcnow)
    duration_minutes = Column(Integer, nullable=False)  # booked duration; 0 when open session
    actual_minutes = Column(Integer, nullable=True)  # elapsed at end; billable may differ
    is_open_session = Column(Boolean, default=False)  # billed by time used when closed
    session_type = Column(String(20), nullable=False)  # dual / triple / quad
    booked_session_price = Column(Float, nullable=True)  # full price for booked time
    session_price = Column(Float, default=0.0)  # final device charge (prorated if early end)
    total_cost = Column(Float, default=0.0)
    status = Column(String(20), default=SessionStatus.ACTIVE.value)
    ended_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    device = relationship("Device", back_populates="sessions")
    products = relationship("SessionProduct", back_populates="session", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# SessionProduct — products ordered during a session
# ---------------------------------------------------------------------------
class SessionProduct(Base):
    __tablename__ = "session_products"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("Session", back_populates="products")
    product = relationship("Product", back_populates="session_products")


# ---------------------------------------------------------------------------
# Settings — global app settings (single row)
# ---------------------------------------------------------------------------
class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    store_name = Column(String(200), default="Crazy Game")
    logo_path = Column(Text, nullable=True)
    username = Column(String(100), default="admin")
    password_hash = Column(String(200), nullable=True)
    password_enabled = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
