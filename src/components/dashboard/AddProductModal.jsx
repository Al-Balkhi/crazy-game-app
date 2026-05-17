import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Search } from 'lucide-react';
import { CyberModal } from '../shared/CyberModal';
import { CyberButton } from '../shared/CyberButton';
import { productsAPI } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotify } from '../../contexts/NotifyContext';
import './AddProductModal.css';

export function AddProductModal({ isOpen, onClose, session, onAdd }) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState({});
  const { t } = useLanguage();
  const notify = useNotify();

  useEffect(() => {
    if (isOpen) {
      loadProducts();
      setCart({});
      setSearch('');
    }
  }, [isOpen]);

  const loadProducts = async () => {
    try {
      const data = await productsAPI.list({ active_only: true, page_size: 100 });
      setProducts(data);
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const updateQty = (product, delta) => {
    const productId = product.id;
    setCart(prev => {
      const current = prev[productId] || 0;
      const availableStock = product.quantity ?? 0;
      
      // Calculate the new quantity
      const newQty = current + delta;
      
      // Ensure the new quantity is within valid bounds
      const clampedQty = Math.min(availableStock, Math.max(0, newQty));
      
      if (clampedQty === 0) {
        // Remove from cart if quantity becomes 0
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      
      return { ...prev, [productId]: clampedQty };
    });
  };

  const setQtyDirect = (product, value) => {
    const productId = product.id;
    const availableStock = product.quantity ?? 0;
    const parsed = parseInt(value, 10);

    // Allow clearing the field (empty string) → treat as 0
    if (value === '' || isNaN(parsed)) {
      setCart(prev => {
        const { [productId]: _, ...rest } = prev;
        return rest;
      });
      return;
    }

    const clampedQty = Math.min(availableStock, Math.max(0, parsed));

    setCart(prev => {
      if (clampedQty === 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: clampedQty };
    });
  };

  const total = Object.entries(cart).reduce((sum, [id, qty]) => {
    const product = products.find(p => p.id === parseInt(id));
    return sum + (product ? product.selling_price * qty : 0);
  }, 0);

  const handleConfirm = async () => {
    try {
      for (const [productId, quantity] of Object.entries(cart)) {
        await onAdd(session.id, { product_id: parseInt(productId), quantity });
      }
      window.dispatchEvent(new Event('inventory-changed'));
      onClose();
    } catch (err) {
      notify.error(err.message || t('insufficient_stock'));
    }
  };

  return (
    <CyberModal isOpen={isOpen} onClose={onClose} title={t('add_products')} size="lg">
      <div className="cyber-modal-body">
        <div className="add-product-search">
          <Search size={16} className="add-product-search-icon" />
          <input
            type="text"
            className="cyber-input cyber-input--search"
            placeholder={t('search_products')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="add-product-grid">
          {filtered.map(product => {
            const qty = cart[product.id] || 0;
            const stock = product.quantity ?? 0;
            const outOfStock = stock === 0;
            const canAddMore = qty < stock;
            return (
              <div
                key={product.id}
                className={`add-product-item ${qty > 0 ? 'selected' : ''} ${outOfStock ? 'add-product-item--disabled' : ''}`}
              >
                <div className="add-product-item-info">
                  <span className="add-product-item-name">{product.name}</span>
                  <span className="add-product-item-price">
                    {product.selling_price.toLocaleString()} {t('syp')}
                  </span>
                  <span className={`add-product-item-stock ${product.is_low_stock ? 'add-product-item-stock--low' : ''}`}>
                    {outOfStock ? t('out_of_stock') : `${t('in_stock')}: ${stock}`}
                  </span>
                </div>
                <div className="add-product-item-controls">
                  <button
                    type="button"
                    className="add-product-qty-btn"
                    onClick={() => updateQty(product, -1)}
                    disabled={qty === 0}
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    type="number"
                    className="add-product-qty-input"
                    value={qty}
                    min={0}
                    max={stock}
                    onChange={(e) => setQtyDirect(product, e.target.value)}
                    disabled={outOfStock}
                  />
                  <button
                    type="button"
                    className="add-product-qty-btn add-product-qty-btn--plus"
                    onClick={() => updateQty(product, 1)}
                    disabled={outOfStock || !canAddMore}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {Object.keys(cart).length > 0 && (
          <div className="add-product-total">
            <span>{t('total_cost')}</span>
            <span className="add-product-total-value">{total.toLocaleString()} {t('syp')}</span>
          </div>
        )}
      </div>

      <div className="cyber-modal-footer">
        <CyberButton variant="ghost" onClick={onClose}>{t('cancel')}</CyberButton>
        <CyberButton variant="primary" onClick={handleConfirm} disabled={Object.keys(cart).length === 0}>
          <ShoppingCart size={16} />
          {t('add_to_session')}
        </CyberButton>
      </div>
    </CyberModal>
  );
}
