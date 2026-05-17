from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ── Device Type ──────────────────────────────────────────────────────────────
class DeviceTypeCreate(BaseModel):
    name: str
    icon: Optional[str] = "monitor"
    dual_price: float = 0.0
    triple_price: float = 0.0
    quad_price: float = 0.0


class DeviceTypeUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    dual_price: Optional[float] = None
    triple_price: Optional[float] = None
    quad_price: Optional[float] = None
    is_active: Optional[bool] = None


class DeviceTypeResponse(BaseModel):
    id: int
    name: str
    icon: str
    dual_price: float
    triple_price: float
    quad_price: float
    is_active: bool

    class Config:
        from_attributes = True


# ── Device ───────────────────────────────────────────────────────────────────
class DeviceCreate(BaseModel):
    name: str
    device_type_id: int


class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    device_type_id: Optional[int] = None
    is_active: Optional[bool] = None


class DeviceResponse(BaseModel):
    id: int
    name: str
    device_type_id: int
    is_active: bool
    device_type: Optional[DeviceTypeResponse] = None
    active_session: Optional["SessionResponse"] = None

    class Config:
        from_attributes = True


# ── Product ──────────────────────────────────────────────────────────────────
class ProductCreate(BaseModel):
    name: str
    purchase_price: float = 0.0
    selling_price: float = 0.0
    quantity: int = 0


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    purchase_price: Optional[float] = None
    selling_price: Optional[float] = None
    quantity: Optional[int] = None
    is_active: Optional[bool] = None


class ProductResponse(BaseModel):
    id: int
    name: str
    purchase_price: float
    selling_price: float
    quantity: int
    initial_quantity: int
    refill_count: int = 0
    is_low_stock: bool = False
    is_active: bool

    class Config:
        from_attributes = True


# ── Session Product ──────────────────────────────────────────────────────────
class SessionProductCreate(BaseModel):
    product_id: int
    quantity: int = 1


class SessionProductResponse(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    quantity: int
    unit_price: float

    class Config:
        from_attributes = True


# ── Session ──────────────────────────────────────────────────────────────────
class SessionCreate(BaseModel):
    device_id: int
    duration_minutes: int = 30
    session_type: str  # dual / triple / quad
    is_open_session: bool = False


class SessionResponse(BaseModel):
    id: int
    device_id: int
    start_time: datetime
    duration_minutes: int
    actual_minutes: Optional[int] = None
    is_open_session: bool = False
    session_type: str
    booked_session_price: Optional[float] = None
    session_price: float
    total_cost: float
    status: str
    ended_at: Optional[datetime] = None
    products: List[SessionProductResponse] = []

    class Config:
        from_attributes = True


class InvoiceResponse(BaseModel):
    session_id: int
    device_name: str
    device_type: str
    start_time: datetime
    ended_at: Optional[datetime] = None
    duration_minutes: int
    actual_minutes: Optional[int] = None
    is_open_session: bool = False
    session_type: str
    booked_session_price: float
    session_price: float
    early_end: bool = False
    products: List[SessionProductResponse] = []
    products_total: float
    total_cost: float


# ── Settings ─────────────────────────────────────────────────────────────────
class SettingsUpdate(BaseModel):
    store_name: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    password_enabled: Optional[bool] = None


class SettingsResponse(BaseModel):
    id: int
    store_name: str
    logo_path: Optional[str] = None
    username: str
    password_enabled: bool
    has_password: bool = False

    class Config:
        from_attributes = True


class AuthRequest(BaseModel):
    password: str


class AuthResponse(BaseModel):
    success: bool
    message: str


# ── Reports ──────────────────────────────────────────────────────────────────
class MonthlyReportResponse(BaseModel):
    month: str
    device_revenue: float
    product_revenue: float
    total_income: float
    total_sessions: int
    total_products_sold: int


class DailyReportResponse(BaseModel):
    day: str
    device_revenue: float
    product_revenue: float
    total_income: float
    total_sessions: int
    total_products_sold: int


# Rebuild forward refs
DeviceResponse.model_rebuild()
