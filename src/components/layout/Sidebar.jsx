import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Monitor, Package, Gamepad2, FileText } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import './Sidebar.css';

const navItems = [
  { path: '/', icon: Monitor, labelKey: 'dashboard' },
  { path: '/devices', icon: Gamepad2, labelKey: 'devices' },
  { path: '/products', icon: Package, labelKey: 'products' },
  { path: '/invoice-log', icon: FileText, labelKey: 'invoice_log' },
];

export function Sidebar() {
  const location = useLocation();
  const { t } = useLanguage();

  return (
    <aside className="sidebar">
      {/* Brand / Logo */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <Gamepad2 size={24} color="var(--cyber-cyan)" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
            >
              {isActive && <div className="sidebar-active-indicator" />}
              <div className="sidebar-nav-icon">
                <Icon size={20} />
              </div>
              <span className="sidebar-nav-label">{t(item.labelKey)}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-pulse" />
      </div>
    </aside>
  );
}
