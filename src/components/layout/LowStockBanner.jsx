import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { productsAPI } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';
import './LowStockBanner.css';

const POLL_MS = 60_000;

export function LowStockBanner() {
  const [items, setItems] = useState([]);
  const { t } = useLanguage();
  const navigate = useNavigate();

  const load = useCallback(async (notify = false) => {
    try {
      const data = await productsAPI.lowStock();
      setItems(data);
      if (notify && data.length > 0) {
        const names = data.map((p) => p.name).join(', ');
        alert(`${t('low_stock_alert')}: ${names}\n${t('low_stock_detail')}`);
      }
    } catch {
      setItems([]);
    }
  }, [t]);

  useEffect(() => {
    load(false);
    const id = setInterval(() => load(false), POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    const onStockChange = () => load(true);
    window.addEventListener('inventory-changed', onStockChange);
    return () => window.removeEventListener('inventory-changed', onStockChange);
  }, [load]);

  if (items.length === 0) return null;

  const names = items.map((p) => p.name).join(', ');

  return (
    <div className="low-stock-banner" role="alert">
      <AlertTriangle size={18} className="low-stock-banner-icon" />
      <div className="low-stock-banner-text">
        <strong>{t('low_stock_alert')}</strong>
        <span>
          {items.length === 1
            ? `${names} — ${t('low_stock_detail')}`
            : `${items.length} ${t('products')} — ${names}`}
        </span>
      </div>
      <button type="button" className="low-stock-banner-link" onClick={() => navigate('/products')}>
        {t('view_products')}
      </button>
    </div>
  );
}
