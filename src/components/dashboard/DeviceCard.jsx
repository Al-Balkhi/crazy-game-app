import React, { useMemo, useCallback } from 'react';
import { Monitor, Gamepad2, Cpu, ShoppingCart, Square, Clock, Users, Zap } from 'lucide-react';
import { useTimer } from '../../hooks/useTimer';
import { useLanguage } from '../../contexts/LanguageContext';
import './DeviceCard.css';

const DEVICE_STYLES = {
  ps5: { className: 'device-card--ps5', icon: Gamepad2 },
  ps4: { className: 'device-card--ps4', icon: Gamepad2 },
  'gaming pc': { className: 'device-card--pc', icon: Cpu },
  pc: { className: 'device-card--pc', icon: Cpu },
  default: { className: 'device-card--default', icon: Monitor },
};

function getDeviceStyle(typeName) {
  const key = (typeName || '').toLowerCase();
  for (const [k, v] of Object.entries(DEVICE_STYLES)) {
    if (key.includes(k)) return v;
  }
  return DEVICE_STYLES.default;
}

export function DeviceCard({ device, onBook, onEndSession, onAddProduct, onSessionExpired }) {
  const session = device.active_session;
  const isBusy = session && session.status === 'active';
  const typeName = device.device_type?.name || 'Device';
  const style = getDeviceStyle(typeName);
  const DeviceIcon = style.icon;
  const { t } = useLanguage();

  const SESSION_TYPE_LABELS = {
    dual: { label: t('dual'), icon: Users, count: 2 },
    triple: { label: t('triple'), icon: Users, count: 3 },
    quad: { label: t('quad'), icon: Users, count: 4 },
  };

  const endTime = useMemo(() => {
    if (!isBusy || !session) return null;
    const start = new Date(session.start_time).getTime();
    return new Date(start + session.duration_minutes * 60 * 1000);
  }, [isBusy, session]);

  const handleExpire = useCallback(() => {
    if (onSessionExpired) onSessionExpired(device, session);
  }, [device, session, onSessionExpired]);

  const timer = useTimer(endTime, handleExpire);

  const sessionInfo = isBusy ? SESSION_TYPE_LABELS[session.session_type] || SESSION_TYPE_LABELS.dual : null;

  return (
    <div
      className={`device-card ${style.className} ${isBusy ? 'device-card--busy' : 'device-card--available'} ${!device.is_active ? 'device-card--disabled' : ''}`}
      id={`device-card-${device.id}`}
      onClick={() => {
        if (!isBusy && device.is_active && onBook) onBook(device);
      }}
      style={{ cursor: !isBusy && device.is_active ? 'pointer' : 'default' }}
    >
      <div className="device-card-accent" />
      <div className="device-card-header">
        <div className="device-card-icon-wrapper">
          <DeviceIcon size={22} />
        </div>
        <div className="device-card-info">
          <h3 className="device-card-name">{device.name}</h3>
          <span className="device-card-type">{typeName}</span>
        </div>
      </div>
      <div className="device-card-status-area">
        {!device.is_active ? (
          <div className="device-card-badge device-card-badge--disabled">
            <span>{t('disabled')}</span>
          </div>
        ) : isBusy ? (
          <>
            <div className="device-card-badge device-card-badge--session">
              <Users size={12} />
              <span>{sessionInfo?.label}</span>
            </div>
            <div className={`device-card-timer ${timer.totalSeconds <= 300 ? 'device-card-timer--warning' : ''}`}>
              <Clock size={14} />
              <div className="device-card-timer-digits">
                <span className="timer-digit">{String(timer.hours).padStart(2, '0')}</span>
                <span className="timer-sep">:</span>
                <span className="timer-digit">{String(timer.minutes).padStart(2, '0')}</span>
                <span className="timer-sep">:</span>
                <span className="timer-digit">{String(timer.seconds).padStart(2, '0')}</span>
              </div>
            </div>
            <div className="device-card-start-time">
              <Zap size={12} />
              <span>{t('started')} {new Date(session.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
            </div>
            <div className="device-card-actions">
              <button
                className="device-card-action-btn device-card-action-btn--add"
                onClick={(e) => { e.stopPropagation(); onAddProduct && onAddProduct(device, session); }}
                title={t('add_items')}
              >
                <ShoppingCart size={14} />
                <span>{t('add_items')}</span>
              </button>
              <button
                className="device-card-action-btn device-card-action-btn--end"
                onClick={(e) => { e.stopPropagation(); onEndSession && onEndSession(device, session); }}
                title={t('end_session')}
              >
                <Square size={14} />
                <span>{t('end_session')}</span>
              </button>
            </div>
          </>
        ) : (
          <div className="device-card-available">
            <div className="device-card-available-pulse" />
            <span className="device-card-available-text">{t('available').toUpperCase()}</span>
          </div>
        )}
      </div>
      <div className="device-card-corner device-card-corner--tl" />
      <div className="device-card-corner device-card-corner--tr" />
      <div className="device-card-corner device-card-corner--bl" />
      <div className="device-card-corner device-card-corner--br" />
    </div>
  );
}
