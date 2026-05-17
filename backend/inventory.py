"""Product stock helpers — 10% low-stock threshold."""


def low_stock_threshold(initial_quantity: int) -> int:
    """Minimum quantity before low-stock alert (10% of initial, at least 1)."""
    if initial_quantity <= 0:
        return 0
    return max(1, int(initial_quantity * 0.1))


def is_low_stock(quantity: int, initial_quantity: int) -> bool:
    if initial_quantity <= 0:
        return False
    return quantity <= low_stock_threshold(initial_quantity)


def product_to_response(product) -> dict:
    """Build API dict with computed is_low_stock."""
    qty = product.quantity or 0
    initial = product.initial_quantity or 0
    refills = getattr(product, 'refill_count', 0) or 0
    return {
        "id": product.id,
        "name": product.name,
        "purchase_price": product.purchase_price,
        "selling_price": product.selling_price,
        "quantity": qty,
        "initial_quantity": initial,
        "refill_count": refills,
        "is_low_stock": is_low_stock(qty, initial),
        "is_active": product.is_active,
    }
