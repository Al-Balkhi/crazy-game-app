import { useState } from 'react';
import { Lock, Zap } from 'lucide-react';
import { CyberButton } from '../components/shared/CyberButton';
import { CyberInput } from '../components/shared/CyberInput';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';
import '../components/shared/CyberShared.css';
import './Login.css';

export function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { t } = useLanguage();
  const { settings, login } = useSettings();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setError(t('password_required'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await login(password);
    } catch (err) {
      setError(err.message || t('invalid_password'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-bg-grid" aria-hidden="true" />
      <div className="login-card">
        <div className="login-card-accent" />
        <div className="login-header">
          <div className="login-icon">
            <Zap size={28} />
          </div>
          <h1 className="login-title">{settings?.store_name || t('login_title')}</h1>
          <p className="login-subtitle">{t('login_subtitle')}</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {settings?.username && (
            <div className="login-username">
              <span className="login-username-label">{t('username')}</span>
              <span className="login-username-value">{settings.username}</span>
            </div>
          )}
          <CyberInput
            label={t('password')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          {error && <p className="login-error">{error}</p>}
          <CyberButton type="submit" variant="primary" disabled={submitting || !password.trim()}>
            <Lock size={16} />
            {submitting ? t('signing_in') : t('login')}
          </CyberButton>
        </form>
      </div>
    </div>
  );
}
