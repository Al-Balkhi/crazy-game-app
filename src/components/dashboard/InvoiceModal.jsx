import React, { useState, useEffect } from 'react';
import { Receipt, Clock, Users, Package, Printer } from 'lucide-react';
import { CyberModal } from '../shared/CyberModal';
import { CyberButton } from '../shared/CyberButton';
import { useLanguage } from '../../contexts/LanguageContext';
import './InvoiceModal.css';

export function InvoiceModal({ isOpen, onClose, invoice }) {
  const { t } = useLanguage();
  if (!isOpen || !invoice) return null;

  const startTime = new Date(invoice.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const endTime = invoice.ended_at ? new Date(invoice.ended_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : 'N/A';

  return (
    <CyberModal isOpen={isOpen} onClose={onClose} title={t('invoice')} size="lg">
      <div className="cyber-modal-body">
        <div className="invoice-container">
          {/* Header */}
          <div className="invoice-header-section">
            <Receipt size={24} className="invoice-icon" />
            <h3>{t('session_complete')}</h3>
          </div>

          {/* Device Info */}
          <div className="invoice-row">
            <span className="invoice-label">{t('device')}</span>
            <span className="invoice-value">{invoice.device_name}</span>
          </div>
          <div className="invoice-row">
            <span className="invoice-label">{t('type')}</span>
            <span className="invoice-value">{invoice.device_type}</span>
          </div>
          <div className="invoice-row">
            <span className="invoice-label">{t('session_type')}</span>
            <span className="invoice-value invoice-value--badge">{invoice.session_type.toUpperCase()}</span>
          </div>
          <div className="invoice-row">
            <span className="invoice-label">{t('duration')}</span>
            <span className="invoice-value">{invoice.duration_minutes} min</span>
          </div>
          <div className="invoice-row">
            <span className="invoice-label">{t('time')}</span>
            <span className="invoice-value">{startTime} → {endTime}</span>
          </div>

          <div className="invoice-divider" />

          {/* Session Price */}
          <div className="invoice-row">
            <span className="invoice-label">{t('session_price')}</span>
            <span className="invoice-value">{invoice.session_price.toLocaleString()} {t('syp')}</span>
          </div>

          {/* Products */}
          {invoice.products && invoice.products.length > 0 && (
            <>
              <div className="invoice-products-header">
                <Package size={14} />
                <span>{t('ordered_items')}</span>
              </div>
              {invoice.products.map((p, i) => (
                <div key={i} className="invoice-product-row">
                  <span>{p.product_name} × {p.quantity}</span>
                  <span>{(p.unit_price * p.quantity).toLocaleString()} {t('syp')}</span>
                </div>
              ))}
              <div className="invoice-row">
                <span className="invoice-label">{t('products_total')}</span>
                <span className="invoice-value">{invoice.products_total.toLocaleString()} {t('syp')}</span>
              </div>
            </>
          )}

          <div className="invoice-divider invoice-divider--strong" />

          {/* Total */}
          <div className="invoice-total-row">
            <span>{t('total_cost')}</span>
            <span>{invoice.total_cost.toLocaleString()} {t('syp')}</span>
          </div>
        </div>
      </div>

      <div className="cyber-modal-footer">
        <CyberButton variant="ghost" onClick={onClose}>{t('close')}</CyberButton>
      </div>
    </CyberModal>
  );
}
