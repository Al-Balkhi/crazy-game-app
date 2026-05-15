import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Search } from 'lucide-react';
import { CyberModal } from '../shared/CyberModal';
import { CyberButton } from '../shared/CyberButton';
import { productsAPI } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';
import './AddProductModal.css';

export function AddProductModal({ isOpen, onClose, session, onAdd }) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState({});
  const { t } = useLanguage();

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

  const maxQtyFor = (product) => {
    const inCart = cart[product.id] || 0;
    return Math.max(0, (product.quantity ?? 0) - inCart);
  };

  const updateQty = (product, delta) => {
    const productId = product.id;
    const max = maxQtyFor(product);
    setCart(prev => {
      const current = prev[productId] || 0;
      const next = Math.min(max, Math.max(0, current + delta));
      if (next === 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: next };
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
      alert(err.message || t('insufficient_stock'));
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
            const maxAdd = maxQtyFor(product);
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
                  <span className="add-product-qty">{qty}</span>
                  <button
                    type="button"
                    className="add-product-qty-btn add-product-qty-btn--plus"
                    onClick={() => updateQty(product, 1)}
                    disabled={outOfStock || maxAdd === 0}
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
