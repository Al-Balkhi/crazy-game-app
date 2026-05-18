import React, { useMemo, useCallback } from 'react';
import { Monitor, Gamepad2, Cpu, ShoppingCart, Square, Clock, Users, Zap, Pause, Play } from 'lucide-react';
import { useTimer } from '../../hooks/useTimer';
import { useElapsedTimer } from '../../hooks/useElapsedTimer';
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

function getSessionEndTime(session) {
  if (session?.is_open_session) return null;
  if (!session?.start_time || !session.duration_minutes) return null;
  let startStr = session.start_time;
  if (typeof startStr === 'string' && !/Z|[+-]\d{2}:\d{2}$/.test(startStr)) {
    startStr = `${startStr.replace(' ', 'T')}Z`;
  }
  const start = new Date(startStr).getTime();
  if (Number.isNaN(start)) return null;
  return new Date(start + session.duration_minutes * 60 * 1000);
}

export function DeviceCard({
  device,
  onBook,
  onEndSession,
  onPauseSession,
  onResumeSession,
  onAddProduct,
  onSessionExpired,
  onViewSession,
}) {
  const session = device.active_session;
  const isBusy = session && (session.status === 'active' || session.status === 'paused');
  const isPaused = session?.status === 'paused';
  const typeName = device.device_type?.name || 'Device';
  const style = getDeviceStyle(typeName);
  const DeviceIcon = style.icon;
  const { t } = useLanguage();

  const SESSION_TYPE_LABELS = {
    dual: { label: t('dual'), icon: Users, count: 2 },
    triple: { label: t('triple'), icon: Users, count: 3 },
    quad: { label: t('quad'), icon: Users, count: 4 },
  };

  const isOpenSession = isBusy && session?.is_open_session;

  const endTime = useMemo(() => {
    if (!isBusy || !session || isOpenSession || isPaused) return null;
    return getSessionEndTime(session);
  }, [isBusy, session, isOpenSession, isPaused]);

  const handleExpire = useCallback(() => {
    if (onSessionExpired) onSessionExpired(device, session);
  }, [device, session, onSessionExpired]);

  const countdown = useTimer(endTime, handleExpire);
  const elapsed = useElapsedTimer(isOpenSession ? session?.start_time : null);
  const timer = isOpenSession ? elapsed : countdown;

  const sessionInfo = isBusy ? SESSION_TYPE_LABELS[session.session_type] || SESSION_TYPE_LABELS.dual : null;

  const cardClass = [
    'device-card',
    style.className,
    isPaused ? 'device-card--paused' : isBusy ? 'device-card--busy' : 'device-card--available',
    !device.is_active ? 'device-card--disabled' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cardClass}
      id={`device-card-${device.id}`}
      onClick={() => {
        if (!isBusy && device.is_active && onBook) onBook(device);
        if (isBusy && onViewSession) onViewSession(device, session);
      }}
      style={{ cursor: (!isBusy && device.is_active) || isBusy ? 'pointer' : 'default' }}
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
              {isOpenSession && (
                <span className="device-card-badge device-card-badge--open">{t('open_session')}</span>
              )}
              {isPaused && (
                <span className="device-card-badge device-card-badge--paused">{t('paused')}</span>
              )}
            </div>
            {!isPaused && (
              <div
                className={`device-card-timer ${!isOpenSession && timer.totalSeconds <= 300 ? 'device-card-timer--warning' : ''} ${isOpenSession ? 'device-card-timer--open' : ''}`}
                aria-live="polite"
                aria-label={isOpenSession ? t('elapsed_time') : t('time_remaining')}
              >
                <Clock size={14} className="device-card-timer-icon" />
                <div className="device-card-timer-body">
                  <span className="device-card-timer-label">
                    {isOpenSession ? t('elapsed_time') : t('time_remaining')}
                  </span>
                  <div className="device-card-timer-digits" key={timer.seconds}>
                    {timer.hours > 0 && (
                      <>
                        <span className="timer-digit">{String(timer.hours).padStart(2, '0')}</span>
                        <span className="timer-sep">:</span>
                      </>
                    )}
                    <span className="timer-digit">{String(timer.minutes).padStart(2, '0')}</span>
                    <span className="timer-sep">:</span>
                    <span className="timer-digit timer-digit--seconds">{String(timer.seconds).padStart(2, '0')}</span>
                  </div>
                </div>
              </div>
            )}
            {isPaused && (
              <div className="device-card-timer device-card-timer--paused">
                <Pause size={14} className="device-card-timer-icon" />
                <div className="device-card-timer-body">
                  <span className="device-card-timer-label">{t('paused')}</span>
                </div>
              </div>
            )}
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
              {isPaused ? (
                <button
                  className="device-card-action-btn device-card-action-btn--resume"
                  onClick={(e) => { e.stopPropagation(); onResumeSession && onResumeSession(device, session); }}
                  title={t('resume_session')}
                >
                  <Play size={14} />
                  <span>{t('resume_session')}</span>
                </button>
              ) : (
                <button
                  className="device-card-action-btn device-card-action-btn--pause"
                  onClick={(e) => { e.stopPropagation(); onPauseSession && onPauseSession(device, session); }}
                  title={t('pause_session')}
                >
                  <Pause size={14} />
                  <span>{t('pause_session')}</span>
                </button>
              )}
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
