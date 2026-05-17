from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Product
from schemas import ProductCreate, ProductUpdate, ProductResponse
from inventory import product_to_response, is_low_stock

router = APIRouter(prefix="/products", tags=["Products"])


def _set_product_quantity(product: Product, new_qty: int) -> None:
    """Update stock and baseline for low-stock alerts. Track refills."""
    new_qty = max(0, int(new_qty))
    current = product.quantity if product.quantity is not None else 0
    initial = product.initial_quantity if product.initial_quantity is not None else 0
    if new_qty > current:
        # If restocking (qty going up), increment refill counter
        if initial > 0 and current < initial:
            product.refill_count = (product.refill_count or 0) + 1
        product.initial_quantity = new_qty
    elif initial == 0 and new_qty > 0:
        product.initial_quantity = new_qty
    product.quantity = new_qty


def _apply_product_update(product: Product, data: ProductUpdate) -> None:
    payload = data.model_dump(exclude_unset=True)
    quantity = payload.pop("quantity", None)

    for key, value in payload.items():
        setattr(product, key, value)

    if quantity is not None:
        _set_product_quantity(product, quantity)


@router.get("/alerts/low-stock", response_model=List[ProductResponse])
def list_low_stock_products(db: Session = Depends(get_db)):
    products = (
        db.query(Product)
        .filter(Product.is_active == True)
        .order_by(Product.name)
        .all()
    )
    return [product_to_response(p) for p in products if is_low_stock(p.quantity or 0, p.initial_quantity or 0)]


@router.get("/", response_model=List[ProductResponse])
def list_products(
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=1000),
    active_only: bool = False,
    db: Session = Depends(get_db),
):
    query = db.query(Product)
    if active_only:
        query = query.filter(Product.is_active == True)
    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))
    rows = query.order_by(Product.id).offset((page - 1) * page_size).limit(page_size).all()
    return [product_to_response(p) for p in rows]


@router.get("/count")
def count_products(
    search: Optional[str] = None,
    active_only: bool = False,
    db: Session = Depends(get_db),
):
    query = db.query(Product)
    if active_only:
        query = query.filter(Product.is_active == True)
    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))
    return {"count": query.count()}


@router.post("/", response_model=ProductResponse)
def create_product(data: ProductCreate, db: Session = Depends(get_db)):
    qty = max(0, int(data.quantity))
    product = Product(
        name=data.name,
        purchase_price=data.purchase_price,
        selling_price=data.selling_price,
        quantity=qty,
        initial_quantity=qty,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product_to_response(product)


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(product_id: int, data: ProductUpdate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    _apply_product_update(product, data)
    db.flush()
    db.commit()
    db.refresh(product)
    return product_to_response(product)


@router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    try:
        db.delete(product)
        db.commit()
        return {"message": "Product deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Cannot delete product: {str(e)}")


@router.patch("/{product_id}/toggle", response_model=ProductResponse)
def toggle_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_active = not product.is_active
    db.commit()
    db.refresh(product)
    return product_to_response(product)
