import React, { useState, useEffect, useCallback } from 'react';
import { DeviceCard } from '../components/dashboard/DeviceCard';
import { BookingModal } from '../components/dashboard/BookingModal';
import { InvoiceModal } from '../components/dashboard/InvoiceModal';
import { AddProductModal } from '../components/dashboard/AddProductModal';
import { SessionInfoModal } from '../components/dashboard/SessionInfoModal';
import { devicesAPI, sessionsAPI } from '../lib/api';
import { useSound } from '../hooks/useSound';
import { Monitor } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotify } from '../contexts/NotifyContext';
import './Dashboard.css';

export function Dashboard() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [bookingDevice, setBookingDevice] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);
  const [addProductTarget, setAddProductTarget] = useState(null);
  const [sessionInfoTarget, setSessionInfoTarget] = useState(null);

  const { playLoop, stop: stopSound } = useSound();
  const { t } = useLanguage();
  const notify = useNotify();

  const loadDevices = useCallback(async () => {
    try {
      const data = await devicesAPI.list();
      setDevices(data);
    } catch (err) {
      console.error('Failed to load devices:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDevices();
    const interval = setInterval(loadDevices, 15000);
    return () => clearInterval(interval);
  }, [loadDevices]);

  // Start session
  const handleBookConfirm = async (sessionData) => {
    try {
      await sessionsAPI.start(sessionData);
      setBookingDevice(null);
      await loadDevices();
    } catch (err) {
      notify.error(err.message);
    }
  };

  // End session
  const handleEndSession = async (device, session) => {
    try {
      await sessionsAPI.end(session.id);
      const invoice = await sessionsAPI.invoice(session.id);
      playLoop();
      setInvoiceData(invoice);
      await loadDevices();
    } catch (err) {
      notify.error(err.message);
    }
  };

  // Session expired
  const handleSessionExpired = useCallback(async (device, session) => {
    playLoop();
    try {
      await sessionsAPI.end(session.id);
      const invoice = await sessionsAPI.invoice(session.id);
      setInvoiceData(invoice);
      await loadDevices();
    } catch (err) {
      console.error('Auto-end failed:', err);
    }
  }, [playLoop, loadDevices]);

  // Add product to session
  const handleAddProduct = async (sessionId, productData) => {
    try {
      await sessionsAPI.addProduct(sessionId, productData);
      await loadDevices();
      window.dispatchEvent(new Event('inventory-changed'));
    } catch (err) {
      notify.error(err.message || t('insufficient_stock'));
      throw err;
    }
  };

  const activeCount = devices.filter(d => d.active_session?.status === 'active').length;
  const availableCount = devices.filter(d => d.is_active && !d.active_session).length;

  return (
    <div className="page-enter">
      {/* Stats Bar */}
      <div className="dashboard-stats">
        <div className="dashboard-stat">
          <span className="dashboard-stat-value dashboard-stat-value--cyan">{availableCount}</span>
          <span className="dashboard-stat-label">{t('available')}</span>
        </div>
        <div className="dashboard-stat">
          <span className="dashboard-stat-value dashboard-stat-value--pink">{activeCount}</span>
          <span className="dashboard-stat-label">{t('active')}</span>
        </div>
        <div className="dashboard-stat">
          <span className="dashboard-stat-value dashboard-stat-value--purple">{devices.length}</span>
          <span className="dashboard-stat-label">{t('total')}</span>
        </div>
      </div>

      {/* Device Grid */}
      {loading ? (
        <div className="dashboard-loading">
          <Monitor size={40} className="dashboard-loading-icon" />
          <p>{t('loading_devices')}</p>
        </div>
      ) : devices.length === 0 ? (
        <div className="empty-state">
          <Monitor size={48} className="empty-state-icon" />
          <h3>{t('no_devices')}</h3>
          <p>{t('no_devices_desc')}</p>
        </div>
      ) : (
        <div className="dashboard-grid">
          {devices.filter(d => d.is_active).map(device => (
            <DeviceCard
              key={device.id}
              device={device}
              onBook={(d) => setBookingDevice(d)}
              onEndSession={handleEndSession}
              onAddProduct={(d, s) => setAddProductTarget({ device: d, session: s })}
              onSessionExpired={handleSessionExpired}
              onViewSession={(d, s) => setSessionInfoTarget({ device: d, session: s })}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <BookingModal
        isOpen={!!bookingDevice}
        onClose={() => setBookingDevice(null)}
        device={bookingDevice}
        onConfirm={handleBookConfirm}
      />

      <InvoiceModal
        isOpen={!!invoiceData}
        onClose={() => { stopSound(); setInvoiceData(null); }}
        invoice={invoiceData}
      />

      <AddProductModal
        isOpen={!!addProductTarget}
        onClose={() => setAddProductTarget(null)}
        session={addProductTarget?.session}
        onAdd={handleAddProduct}
      />

      <SessionInfoModal
        isOpen={!!sessionInfoTarget}
        onClose={() => setSessionInfoTarget(null)}
        device={sessionInfoTarget?.device}
        session={sessionInfoTarget?.session}
      />
    </div>
  );
}
