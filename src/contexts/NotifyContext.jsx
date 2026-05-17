import React, { createContext, useCallback, useContext, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { CyberButton } from '../components/shared/CyberButton';
import { useLanguage } from './LanguageContext';
import '../components/shared/CyberNotify.css';

const NotifyContext = createContext(null);

let toastId = 0;

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

export function NotifyProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const { t } = useLanguage();

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((message, { type = 'info', duration = 4500 } = {}) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => dismissToast(id), duration);
    }
    return id;
  }, [dismissToast]);

  const alert = useCallback((message, { type = 'info', title } = {}) => {
    return new Promise((resolve) => {
      setDialog({
        message,
        type,
        title: title ?? (type === 'error' ? t('error') : type === 'success' ? t('success') : t('notice')),
        confirm: false,
        resolve,
      });
    });
  }, [t]);

  const confirm = useCallback((message, { title } = {}) => {
    return new Promise((resolve) => {
      setDialog({
        message,
        type: 'warning',
        title: title ?? t('confirm'),
        confirm: true,
        resolve,
      });
    });
  }, [t]);

  const closeDialog = useCallback((result = true) => {
    setDialog((current) => {
      if (current?.resolve) current.resolve(result);
      return null;
    });
  }, []);

  const notify = {
    toast,
    alert,
    confirm,
    success: (msg, opts) => toast(msg, { type: 'success', ...opts }),
    error: (msg, opts) => alert(msg, { type: 'error', ...opts }),
    warning: (msg, opts) => alert(msg, { type: 'warning', ...opts }),
    info: (msg, opts) => toast(msg, { type: 'info', ...opts }),
  };

  return (
    <NotifyContext.Provider value={notify}>
      {children}

      <div className="cyber-toast-stack" aria-live="polite">
        {toasts.map((item) => {
          const Icon = ICONS[item.type] || Info;
          return (
            <div key={item.id} className={`cyber-toast cyber-toast--${item.type}`} role="status">
              <Icon size={20} className="cyber-toast-icon" />
              <p className="cyber-toast-message">{item.message}</p>
              <button
                type="button"
                className="cyber-toast-close"
                onClick={() => dismissToast(item.id)}
                aria-label={t('close')}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>

      {dialog && (
        <div className="cyber-alert-overlay" onClick={() => dialog.confirm ? closeDialog(false) : closeDialog(true)}>
          <div
            className={`cyber-alert cyber-alert--${dialog.type}`}
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cyber-alert-title"
          >
            {(() => {
              const Icon = ICONS[dialog.type] || Info;
              return <Icon size={28} className="cyber-alert-icon" />;
            })()}
            <h2 id="cyber-alert-title" className="cyber-alert-title">{dialog.title}</h2>
            <p className="cyber-alert-message">{dialog.message}</p>
            <div className="cyber-alert-actions">
              {dialog.confirm ? (
                <>
                  <CyberButton variant="ghost" onClick={() => closeDialog(false)}>
                    {t('cancel')}
                  </CyberButton>
                  <CyberButton variant="primary" onClick={() => closeDialog(true)}>
                    {t('confirm')}
                  </CyberButton>
                </>
              ) : (
                <CyberButton variant="primary" onClick={() => closeDialog(true)}>
                  {t('ok')}
                </CyberButton>
              )}
            </div>
          </div>
        </div>
      )}
    </NotifyContext.Provider>
  );
}

export function useNotify() {
  const ctx = useContext(NotifyContext);
  if (!ctx) throw new Error('useNotify must be used within NotifyProvider');
  return ctx;
}
