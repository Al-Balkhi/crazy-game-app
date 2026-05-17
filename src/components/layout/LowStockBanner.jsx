import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { productsAPI } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotify } from '../../contexts/NotifyContext';
import './LowStockBanner.css';

const POLL_MS = 60_000;

export function LowStockBanner() {
  const [items, setItems] = useState([]);
  const { t } = useLanguage();
  const notify = useNotify();
  const navigate = useNavigate();
  const knownLowStockRef = useRef(new Set());

  const showLowStockAlert = useCallback((products) => {
    if (!products.length) return;
    const names = products.map((p) => p.name).join(', ');
    const message =
      products.length === 1
        ? `${names} — ${t('low_stock_detail')}`
        : `${products.length} ${t('products')}: ${names}\n${t('low_stock_detail')}`;

    notify.warning(message, { title: t('low_stock_alert') });
  }, [notify, t]);

  const load = useCallback(async (checkForNewAlert = false) => {
    try {
      const data = await productsAPI.lowStock();
      setItems(data);

      if (checkForNewAlert && data.length > 0) {
        const newlyLow = data.filter((p) => !knownLowStockRef.current.has(p.id));
        if (newlyLow.length > 0) {
          showLowStockAlert(newlyLow);
        }
      }

      knownLowStockRef.current = new Set(data.map((p) => p.id));
    } catch {
      setItems([]);
    }
  }, [showLowStockAlert]);

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
