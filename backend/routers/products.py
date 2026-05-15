from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Product
from schemas import ProductCreate, ProductUpdate, ProductResponse

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("/", response_model=List[ProductResponse])
def list_products(
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    active_only: bool = False,
    db: Session = Depends(get_db),
):
    query = db.query(Product)
    if active_only:
        query = query.filter(Product.is_active == True)
    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))
    return query.order_by(Product.id).offset((page - 1) * page_size).limit(page_size).all()


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
    product = Product(**data.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(product_id: int, data: ProductUpdate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(product, key, value)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()
    return {"message": "Product deleted"}


@router.patch("/{product_id}/toggle", response_model=ProductResponse)
def toggle_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_active = not product.is_active
    db.commit()
    db.refresh(product)
    return product
