import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Settings, Clock, Globe } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSettings } from '../../contexts/SettingsContext';
import { formatTime } from '../../lib/utils';
import './Navbar.css';

const pageTitles = {
  '/': 'dashboard',
  '/products': 'products',
  '/devices': 'devices',
  '/settings': 'settings',
};

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [time, setTime] = useState(new Date());
  const { t, lang, toggleLanguage } = useLanguage();
  const { timeFormat } = useSettings();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentTitleKey = pageTitles[location.pathname] || 'dashboard';

  return (
    <header className="navbar" id="top-navbar">
      <div className="navbar-inner">
        {/* Page Title */}
        <div className="navbar-title-section">
          <h1 className="navbar-title">{t(currentTitleKey)}</h1>
          <div className="navbar-title-line" />
        </div>

        {/* Right side */}
        <div className="navbar-right">
          {/* Live Clock */}
          <div className="navbar-clock">
            <Clock size={14} />
            <span className="navbar-clock-time">
              {formatTime(time, timeFormat, true)}
            </span>
          </div>

          {/* Language Toggle */}
          <button
            className="navbar-settings-btn"
            onClick={toggleLanguage}
            title={lang === 'en' ? 'Switch to Arabic' : 'التبديل للإنجليزية'}
          >
            <Globe size={18} />
          </button>

          {/* Settings */}
          <button
            className="navbar-settings-btn"
            id="settings-btn"
            onClick={() => navigate('/settings')}
            title={t('settings')}
          >
            <Settings size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
