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

  const updateQty = (productId, delta) => {
    setCart(prev => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
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
    for (const [productId, quantity] of Object.entries(cart)) {
      await onAdd(session.id, { product_id: parseInt(productId), quantity });
    }
    onClose();
  };

  return (
    <CyberModal isOpen={isOpen} onClose={onClose} title={t('add_products')} size="lg">
      <div className="cyber-modal-body">
        {/* Search */}
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

        {/* Product Grid */}
        <div className="add-product-grid">
          {filtered.map(product => {
            const qty = cart[product.id] || 0;
            return (
              <div key={product.id} className={`add-product-item ${qty > 0 ? 'selected' : ''}`}>
                <div className="add-product-item-info">
                  <span className="add-product-item-name">{product.name}</span>
                  <span className="add-product-item-price">{product.selling_price.toLocaleString()} {t('syp')}</span>
                </div>
                <div className="add-product-item-controls">
                  <button className="add-product-qty-btn" onClick={() => updateQty(product.id, -1)} disabled={qty === 0}>
                    <Minus size={14} />
                  </button>
                  <span className="add-product-qty">{qty}</span>
                  <button className="add-product-qty-btn add-product-qty-btn--plus" onClick={() => updateQty(product.id, 1)}>
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
