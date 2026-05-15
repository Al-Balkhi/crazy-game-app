import React, { useState, useEffect } from 'react';
import { Clock, Users, Zap } from 'lucide-react';
import { CyberModal } from '../shared/CyberModal';
import { CyberButton } from '../shared/CyberButton';
import { useLanguage } from '../../contexts/LanguageContext';
import './BookingModal.css';

export function BookingModal({ isOpen, onClose, device, onConfirm }) {
  const [duration, setDuration] = useState(60);
  const [customDuration, setCustomDuration] = useState('');
  const [sessionType, setSessionType] = useState('dual');
  const [price, setPrice] = useState(0);
  const { t } = useLanguage();

  const DURATIONS = [
    { label: `30 ${t('custom_min').replace(')', '').replace('(', '').replace('مخصص ', '').replace('Custom ', '')}`, value: 30 },
    { label: `1 ${t('duration')} (1h)`, value: 60 },
    { label: `2 ${t('duration')} (2h)`, value: 120 },
    { label: `3 ${t('duration')} (3h)`, value: 180 },
    { label: `4 ${t('duration')} (4h)`, value: 240 },
  ];

  const SESSION_TYPES = [
    { key: 'dual', label: t('dual'), desc: t('players_2'), count: 2 },
    { key: 'triple', label: t('triple'), desc: t('players_3'), count: 3 },
    { key: 'quad', label: t('quad'), desc: t('players_4'), count: 4 },
  ];

  useEffect(() => {
    if (isOpen && device?.device_type) {
      setDuration(60);
      setSessionType('dual');
      setCustomDuration('');
    }
  }, [isOpen, device]);

  useEffect(() => {
    if (device?.device_type) {
      const dt = device.device_type;
      const priceMap = { dual: dt.dual_price, triple: dt.triple_price, quad: dt.quad_price };
      setPrice(priceMap[sessionType] || 0);
    }
  }, [sessionType, device]);

  const finalDuration = customDuration ? parseInt(customDuration) : duration;

  const handleConfirm = () => {
    if (finalDuration > 0) {
      onConfirm({ device_id: device.id, duration_minutes: finalDuration, session_type: sessionType });
    }
  };

  if (!device) return null;

  return (
    <CyberModal isOpen={isOpen} onClose={onClose} title={t('start_session')}>
      <div className="cyber-modal-body">
        <div className="booking-device-info">
          <Zap size={18} className="booking-device-icon" />
          <div>
            <h3>{device.name}</h3>
            <span>{device.device_type?.name}</span>
          </div>
        </div>

        <div className="booking-section">
          <label className="booking-section-label"><Clock size={14} /> {t('duration')}</label>
          <div className="booking-duration-grid">
            {DURATIONS.map((d) => (
              <button key={d.value} className={`booking-duration-btn ${duration === d.value && !customDuration ? 'active' : ''}`} onClick={() => { setDuration(d.value); setCustomDuration(''); }}>
                {d.label}
              </button>
            ))}
            <input type="number" className="booking-custom-input" placeholder={t('custom_min')} value={customDuration} onChange={(e) => setCustomDuration(e.target.value)} min="1" />
          </div>
        </div>

        <div className="booking-section">
          <label className="booking-section-label"><Users size={14} /> {t('session_type')}</label>
          <div className="booking-type-grid">
            {SESSION_TYPES.map((type) => (
              <button key={type.key} className={`booking-type-card ${sessionType === type.key ? 'active' : ''}`} onClick={() => setSessionType(type.key)}>
                <div className="booking-type-icon-row">
                  {Array.from({ length: type.count }).map((_, i) => (<Users key={i} size={14} />))}
                </div>
                <span className="booking-type-label">{type.label}</span>
                <span className="booking-type-desc">{type.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="booking-price">
          <span className="booking-price-label">{t('session_price')}</span>
          <span className="booking-price-value">{price.toLocaleString()} {t('syp')}</span>
        </div>
      </div>

      <div className="cyber-modal-footer">
        <CyberButton variant="ghost" onClick={onClose}>{t('cancel')}</CyberButton>
        <CyberButton variant="primary" onClick={handleConfirm} disabled={!finalDuration || finalDuration <= 0}>
          <Zap size={16} /> {t('start_session')}
        </CyberButton>
      </div>
    </CyberModal>
  );
}
