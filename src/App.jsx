import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { LowStockBanner } from './components/layout/LowStockBanner';
import { Dashboard } from './pages/Dashboard';
import { Products } from './pages/Products';
import { Devices } from './pages/Devices';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { useSettings } from './contexts/SettingsContext';
import { useLanguage } from './contexts/LanguageContext';
import './App.css';
import './pages/Login.css';

function AppRoutes() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar />
        <LowStockBanner />
        <main className="app-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/devices" element={<Devices />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const { loading, needsLogin } = useSettings();
  const { t } = useLanguage();

  if (loading) {
    return <div className="login-loading">{t('loading')}</div>;
  }

  if (needsLogin) {
    return <Login />;
  }

  return <AppRoutes />;
}
