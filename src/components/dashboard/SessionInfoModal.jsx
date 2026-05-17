import React, { useState, useEffect } from 'react';
import { Monitor, Users, Clock, Zap, Package } from 'lucide-react';
import { CyberModal } from '../shared/CyberModal';
import { CyberButton } from '../shared/CyberButton';
import { sessionsAPI } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSettings } from '../../contexts/SettingsContext';
import { formatTime, formatDuration } from '../../lib/utils';
import './SessionInfoModal.css';

export function SessionInfoModal({ isOpen, onClose, device, session }) {
  const { t } = useLanguage();
  const { timeFormat } = useSettings();
  const [sessionDetail, setSessionDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && session?.id) {
      setLoading(true);
      sessionsAPI.get(session.id)
        .then((data) => setSessionDetail(data))
        .catch((err) => console.error('Failed to load session:', err))
        .finally(() => setLoading(false));
    } else {
      setSessionDetail(null);
    }
  }, [isOpen, session?.id]);

  if (!isOpen || !session || !device) return null;

  const startTime = formatTime(session.start_time, timeFormat);
  const typeName = device.device_type?.name || t('unknown');
  const sessionTypeLabels = {
    dual: t('dual'),
    triple: t('triple'),
    quad: t('quad'),
  };

  const detail = sessionDetail || session;
  const products = detail.products || [];
  const productsTotal = products.reduce((sum, p) => sum + p.unit_price * p.quantity, 0);

  // Calculate elapsed time
  const startMs = new Date(session.start_time).getTime();
  const elapsedMs = Date.now() - startMs;
  const elapsedMin = Math.max(0, Math.floor(elapsedMs / 60000));

  return (
    <CyberModal isOpen={isOpen} onClose={onClose} title={t('session_info')} size="lg">
      <div className="cyber-modal-body">
        <div className="session-info-container">
          <div className="session-info-header-section">
            <Monitor size={24} className="session-info-icon" />
            <h3>{device.name}</h3>
            <span className="session-info-type-badge">{typeName}</span>
          </div>

          <div className="session-info-row">
            <span className="session-info-label">
              <Users size={14} /> {t('session_type')}
            </span>
            <span className="session-info-value session-info-value--badge">
              {sessionTypeLabels[session.session_type] || session.session_type}
            </span>
          </div>

          {session.is_open_session && (
            <div className="session-info-row">
              <span className="session-info-label">
                <Zap size={14} /> {t('type')}
              </span>
              <span className="session-info-value session-info-value--open">
                {t('open_session')}
              </span>
            </div>
          )}

          <div className="session-info-row">
            <span className="session-info-label">
              <Clock size={14} /> {t('started')}
            </span>
            <span className="session-info-value">{startTime}</span>
          </div>

          <div className="session-info-row">
            <span className="session-info-label">
              <Clock size={14} /> {t('elapsed_time')}
            </span>
            <span className="session-info-value">{formatDuration(elapsedMin)}</span>
          </div>

          {!session.is_open_session && (
            <div className="session-info-row">
              <span className="session-info-label">{t('booked_duration')}</span>
              <span className="session-info-value">
                {session.duration_minutes} {t('minutes')}
              </span>
            </div>
          )}

          <div className="session-info-divider" />

          <div className="session-info-row">
            <span className="session-info-label">{t('session_price')}</span>
            <span className="session-info-value session-info-value--price">
              {(detail.session_price || 0).toLocaleString()} {t('syp')}
            </span>
          </div>

          {products.length > 0 && (
            <>
              <div className="session-info-products-header">
                <Package size={14} />
                <span>{t('ordered_items')}</span>
              </div>
              {products.map((p, i) => (
                <div key={i} className="session-info-product-row">
                  <span>{p.product_name} × {p.quantity}</span>
                  <span>{(p.unit_price * p.quantity).toLocaleString()} {t('syp')}</span>
                </div>
              ))}
              <div className="session-info-row">
                <span className="session-info-label">{t('products_total')}</span>
                <span className="session-info-value">
                  {productsTotal.toLocaleString()} {t('syp')}
                </span>
              </div>
            </>
          )}

          <div className="session-info-divider session-info-divider--strong" />

          <div className="session-info-total-row">
            <span>{t('total_cost')}</span>
            <span>{(detail.total_cost || 0).toLocaleString()} {t('syp')}</span>
          </div>
        </div>
      </div>

      <div className="cyber-modal-footer">
        <CyberButton variant="ghost" onClick={onClose}>{t('close')}</CyberButton>
      </div>
    </CyberModal>
  );
}
