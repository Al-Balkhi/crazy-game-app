import React, { useState, useEffect } from 'react';
import { Clock, Users, Zap, Plus, Minus, Infinity } from 'lucide-react';
import { CyberModal } from '../shared/CyberModal';
import { CyberButton } from '../shared/CyberButton';
import { useLanguage } from '../../contexts/LanguageContext';
import './BookingModal.css';

const MIN_DURATION = 30;
const DURATION_STEP = 15;
const DEFAULT_DURATION = 30;

export function BookingModal({ isOpen, onClose, device, onConfirm }) {
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_DURATION);
  const [sessionType, setSessionType] = useState('dual');
  const [isOpenSession, setIsOpenSession] = useState(false);
  const [price, setPrice] = useState(0);
  const [hourlyRate, setHourlyRate] = useState(0);
  const { t } = useLanguage();

  const SESSION_TYPES = [
    { key: 'dual', label: t('dual'), desc: t('players_2'), count: 2 },
    { key: 'triple', label: t('triple'), desc: t('players_3'), count: 3 },
    { key: 'quad', label: t('quad'), desc: t('players_4'), count: 4 },
  ];

  useEffect(() => {
    if (isOpen && device?.device_type) {
      setDurationMinutes(DEFAULT_DURATION);
      setSessionType('dual');
      setIsOpenSession(false);
    }
  }, [isOpen, device]);

  useEffect(() => {
    if (device?.device_type) {
      const dt = device.device_type;
      const hourlyMap = { dual: dt.dual_price, triple: dt.triple_price, quad: dt.quad_price };
      const hourly = hourlyMap[sessionType] || 0;
      setHourlyRate(hourly);
      if (isOpenSession) {
        setPrice(Math.round(hourly * (MIN_DURATION / 60)));
      } else {
        const minutes = Math.max(MIN_DURATION, parseInt(durationMinutes, 10) || MIN_DURATION);
        setPrice(Math.round(hourly * (minutes / 60)));
      }
    }
  }, [sessionType, device, durationMinutes, isOpenSession]);

  const resolvedDuration = Math.max(MIN_DURATION, parseInt(durationMinutes, 10) || MIN_DURATION);
  const isValidDuration = isOpenSession || (Number.isFinite(resolvedDuration) && resolvedDuration >= MIN_DURATION);

  const handleDurationChange = (e) => {
    const raw = e.target.value;
    if (raw === '') {
      setDurationMinutes('');
      return;
    }
    const parsed = parseInt(raw, 10);
    if (!Number.isNaN(parsed)) setDurationMinutes(parsed);
  };

  const handleDurationBlur = () => {
    const parsed = parseInt(durationMinutes, 10);
    setDurationMinutes(Number.isNaN(parsed) || parsed < MIN_DURATION ? MIN_DURATION : parsed);
  };

  const handleIncrease = () => {
    setDurationMinutes((prev) => {
      const current = parseInt(prev, 10);
      const base = Number.isNaN(current) || current < MIN_DURATION ? MIN_DURATION : current;
      return base + DURATION_STEP;
    });
  };

  const handleDecrease = () => {
    setDurationMinutes((prev) => {
      const current = parseInt(prev, 10);
      const base = Number.isNaN(current) || current < MIN_DURATION ? MIN_DURATION : current;
      return Math.max(MIN_DURATION, base - DURATION_STEP);
    });
  };

  const atMinDuration = resolvedDuration <= MIN_DURATION;

  const handleConfirm = () => {
    if (!isValidDuration) return;
    onConfirm({
      device_id: device.id,
      duration_minutes: isOpenSession ? 0 : resolvedDuration,
      session_type: sessionType,
      is_open_session: isOpenSession,
    });
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
          <div className={`booking-duration-controls ${isOpenSession ? 'booking-duration-controls--disabled' : ''}`}>
            <button
              type="button"
              className="booking-duration-step-btn"
              onClick={handleDecrease}
              disabled={isOpenSession || atMinDuration}
              aria-label={t('decrease')}
            >
              <Minus size={16} />
              <span>{t('decrease')}</span>
            </button>
            <div className="booking-duration-input-wrap">
              <input
                type="number"
                className="booking-duration-input"
                value={isOpenSession ? '—' : durationMinutes}
                onChange={handleDurationChange}
                onBlur={handleDurationBlur}
                min={MIN_DURATION}
                step={DURATION_STEP}
                disabled={isOpenSession}
              />
              <span className="booking-duration-suffix">{t('minutes')}</span>
            </div>
            <button
              type="button"
              className="booking-duration-step-btn"
              onClick={handleIncrease}
              disabled={isOpenSession}
              aria-label={t('increase')}
            >
              <Plus size={16} />
              <span>{t('increase')}</span>
            </button>
          </div>

          <button
            type="button"
            className={`booking-open-session-btn ${isOpenSession ? 'active' : ''}`}
            onClick={() => setIsOpenSession((v) => !v)}
          >
            <Infinity size={18} />
            <div className="booking-open-session-text">
              <span className="booking-open-session-title">{t('open_session')}</span>
              <span className="booking-open-session-desc">{t('open_session_desc')}</span>
            </div>
          </button>
        </div>

        <div className="booking-section">
          <label className="booking-section-label"><Users size={14} /> {t('session_type')}</label>
          <div className="booking-type-grid">
            {SESSION_TYPES.map((type) => (
              <button
                key={type.key}
                type="button"
                className={`booking-type-card ${sessionType === type.key ? 'active' : ''}`}
                onClick={() => setSessionType(type.key)}
              >
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
          <span className="booking-price-label">
            {isOpenSession ? t('open_session_billing') : t('booked_price')}
          </span>
          <span className="booking-price-value">
            {isOpenSession ? (
              <>
                {hourlyRate.toLocaleString()} {t('syp')}/{t('hour')}
                <small className="booking-price-min">
                  ({t('min_charge')}: {price.toLocaleString()} {t('syp')} / 30 {t('minutes')})
                </small>
              </>
            ) : (
              <>{price.toLocaleString()} {t('syp')}</>
            )}
          </span>
        </div>
      </div>

      <div className="cyber-modal-footer">
        <CyberButton variant="ghost" onClick={onClose}>{t('cancel')}</CyberButton>
        <CyberButton variant="primary" onClick={handleConfirm} disabled={!isValidDuration}>
          <Zap size={16} /> {t('start_session')}
        </CyberButton>
      </div>
    </CyberModal>
  );
}
