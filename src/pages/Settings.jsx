import React, { useState, useEffect, useCallback } from 'react';
import { Save, Plus, Edit3, Trash2, Download, Lock, Unlock, DollarSign, Palette, FileSpreadsheet } from 'lucide-react';
import { CyberButton } from '../components/shared/CyberButton';
import { CyberInput, CyberSelect } from '../components/shared/CyberInput';
import { CyberModal } from '../components/shared/CyberModal';
import { CyberTable } from '../components/shared/CyberTable';
import { settingsAPI, deviceTypesAPI, reportsAPI } from '../lib/api';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useLanguage } from '../contexts/LanguageContext';
import '../components/shared/CyberShared.css';
import './Settings.css';

export function Settings() {
  const [settings, setSettings] = useState(null);
  const [settingsForm, setSettingsForm] = useState({ store_name: '', username: '', password: '', password_enabled: false });

  const [deviceTypes, setDeviceTypes] = useState([]);
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [typeForm, setTypeForm] = useState({ name: '', dual_price: '', triple_price: '', quad_price: '' });

  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [report, setReport] = useState(null);

  const { t } = useLanguage();

  const loadAll = useCallback(async () => {
    try {
      const [s, types] = await Promise.all([settingsAPI.get(), deviceTypesAPI.list()]);
      setSettings(s);
      setSettingsForm({ store_name: s.store_name, username: s.username, password: '', password_enabled: s.password_enabled });
      setDeviceTypes(types);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleSaveSettings = async () => {
    try {
      const data = { store_name: settingsForm.store_name, username: settingsForm.username, password_enabled: settingsForm.password_enabled };
      if (settingsForm.password) data.password = settingsForm.password;
      await settingsAPI.update(data);
      alert('Settings saved!');
      loadAll();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const openTypeCreate = () => {
    setEditingType(null);
    setTypeForm({ name: '', dual_price: '', triple_price: '', quad_price: '' });
    setTypeModalOpen(true);
  };

  const openTypeEdit = (tObj) => {
    setEditingType(tObj);
    setTypeForm({ name: tObj.name, dual_price: String(tObj.dual_price), triple_price: String(tObj.triple_price), quad_price: String(tObj.quad_price) });
    setTypeModalOpen(true);
  };

  const handleTypeSave = async () => {
    const data = {
      name: typeForm.name,
      dual_price: parseFloat(typeForm.dual_price) || 0,
      triple_price: parseFloat(typeForm.triple_price) || 0,
      quad_price: parseFloat(typeForm.quad_price) || 0,
    };
    try {
      if (editingType) { await deviceTypesAPI.update(editingType.id, data); }
      else { await deviceTypesAPI.create(data); }
      setTypeModalOpen(false);
      loadAll();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleTypeDelete = async (id) => {
    if (!confirm(t('delete_confirm'))) return;
    try { await deviceTypesAPI.delete(id); loadAll(); }
    catch (err) { alert('Error: ' + err.message); }
  };

  const loadReport = async () => {
    try {
      const r = await reportsAPI.monthly(reportYear, reportMonth);
      setReport(r);
    } catch (err) { alert('Error: ' + err.message); }
  };

  const exportReport = () => {
    if (!report) return;
    const rows = [
      { Metric: t('month'), Value: report.month },
      { Metric: t('device_revenue'), Value: report.device_revenue },
      { Metric: t('product_revenue'), Value: report.product_revenue },
      { Metric: t('total_income'), Value: report.total_income },
      { Metric: t('sessions_count'), Value: report.total_sessions },
      { Metric: t('products_sold'), Value: report.total_products_sold },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t('reports_export'));
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf]), `report_${report.month}.xlsx`);
  };

  const typeColumns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: t('type_name') },
    { key: 'dual_price', label: t('dual_price'), render: (v) => `${v.toLocaleString()} ${t('syp')}` },
    { key: 'triple_price', label: t('triple_price'), render: (v) => `${v.toLocaleString()} ${t('syp')}` },
    { key: 'quad_price', label: t('quad_price'), render: (v) => `${v.toLocaleString()} ${t('syp')}` },
  ];

  return (
    <div className="page-enter">
      <div className="page-header">
        <h1>{t('settings')}</h1>
        <p>{t('configure_lounge')}</p>
      </div>

      <div className="settings-grid">
        <div className="settings-panel">
          <div className="settings-panel-header">
            <Palette size={18} />
            <h2>{t('branding')}</h2>
          </div>
          <div className="settings-panel-body">
            <CyberInput label={t('store_name')} value={settingsForm.store_name} onChange={(e) => setSettingsForm({ ...settingsForm, store_name: e.target.value })} />
            <p className="settings-hint">{t('store_logo_hint')}</p>
          </div>
        </div>

        <div className="settings-panel">
          <div className="settings-panel-header">
            {settingsForm.password_enabled ? <Lock size={18} /> : <Unlock size={18} />}
            <h2>{t('authentication')}</h2>
          </div>
          <div className="settings-panel-body">
            <CyberInput label={t('username')} value={settingsForm.username} onChange={(e) => setSettingsForm({ ...settingsForm, username: e.target.value })} />
            <CyberInput label={t('password')} type="password" value={settingsForm.password} onChange={(e) => setSettingsForm({ ...settingsForm, password: e.target.value })} />
            <div className="settings-toggle-row">
              <span>{t('enable_password')}</span>
              <button className={`settings-toggle ${settingsForm.password_enabled ? 'active' : ''}`} onClick={() => setSettingsForm({ ...settingsForm, password_enabled: !settingsForm.password_enabled })}>
                <div className="settings-toggle-knob" />
              </button>
            </div>
            <CyberButton variant="primary" onClick={handleSaveSettings} size="sm">
              <Save size={14} /> {t('save_settings')}
            </CyberButton>
          </div>
        </div>

        <div className="settings-panel settings-panel--wide">
          <div className="settings-panel-header">
            <DollarSign size={18} />
            <h2>{t('device_type_pricing')}</h2>
            <div className="cyber-toolbar-spacer" />
            <CyberButton variant="primary" size="sm" onClick={openTypeCreate}>
              <Plus size={14} /> {t('add_type')}
            </CyberButton>
          </div>
          <div className="settings-panel-body">
            <CyberTable
              columns={typeColumns}
              data={deviceTypes}
              emptyMessage={t('no_devices')}
              actions={(row) => (
                <>
                  <CyberButton variant="ghost" size="icon" onClick={() => openTypeEdit(row)}><Edit3 size={14} /></CyberButton>
                  <CyberButton variant="ghost" size="icon" onClick={() => handleTypeDelete(row.id)}><Trash2 size={14} style={{ color: 'var(--cyber-danger)' }} /></CyberButton>
                </>
              )}
            />
          </div>
        </div>

        <div className="settings-panel settings-panel--wide">
          <div className="settings-panel-header">
            <FileSpreadsheet size={18} />
            <h2>{t('reports_export')}</h2>
          </div>
          <div className="settings-panel-body">
            <div className="form-row">
              <CyberInput label={t('year')} type="number" value={reportYear} onChange={(e) => setReportYear(parseInt(e.target.value))} />
              <CyberSelect label={t('month')} value={reportMonth} onChange={(e) => setReportMonth(parseInt(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </CyberSelect>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <CyberButton variant="primary" size="sm" onClick={loadReport}>{t('generate_report')}</CyberButton>
              {report && (
                <CyberButton variant="secondary" size="sm" onClick={exportReport}>
                  <Download size={14} /> {t('export_excel')}
                </CyberButton>
              )}
            </div>
            {report && (
              <div className="report-summary">
                <div className="report-stat">
                  <span className="report-stat-label">{t('device_revenue')}</span>
                  <span className="report-stat-value" style={{ color: 'var(--cyber-cyan)' }}>{report.device_revenue.toLocaleString()} {t('syp')}</span>
                </div>
                <div className="report-stat">
                  <span className="report-stat-label">{t('product_revenue')}</span>
                  <span className="report-stat-value" style={{ color: 'var(--cyber-purple)' }}>{report.product_revenue.toLocaleString()} {t('syp')}</span>
                </div>
                <div className="report-stat report-stat--total">
                  <span className="report-stat-label">{t('total_income')}</span>
                  <span className="report-stat-value" style={{ color: 'var(--cyber-cyan)' }}>{report.total_income.toLocaleString()} {t('syp')}</span>
                </div>
                <div className="report-stat">
                  <span className="report-stat-label">{t('sessions_count')}</span>
                  <span className="report-stat-value">{report.total_sessions}</span>
                </div>
                <div className="report-stat">
                  <span className="report-stat-label">{t('products_sold')}</span>
                  <span className="report-stat-value">{report.total_products_sold}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <CyberModal isOpen={typeModalOpen} onClose={() => setTypeModalOpen(false)} title={editingType ? t('edit_type') : t('new_type')}>
        <div className="cyber-modal-body">
          <CyberInput label={t('type_name')} value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} />
          <CyberInput label={`${t('dual_price')} (${t('syp')})`} type="number" value={typeForm.dual_price} onChange={(e) => setTypeForm({ ...typeForm, dual_price: e.target.value })} />
          <CyberInput label={`${t('triple_price')} (${t('syp')})`} type="number" value={typeForm.triple_price} onChange={(e) => setTypeForm({ ...typeForm, triple_price: e.target.value })} />
          <CyberInput label={`${t('quad_price')} (${t('syp')})`} type="number" value={typeForm.quad_price} onChange={(e) => setTypeForm({ ...typeForm, quad_price: e.target.value })} />
        </div>
        <div className="cyber-modal-footer">
          <CyberButton variant="ghost" onClick={() => setTypeModalOpen(false)}>{t('cancel')}</CyberButton>
          <CyberButton variant="primary" onClick={handleTypeSave} disabled={!typeForm.name}>{editingType ? t('update') : t('create')}</CyberButton>
        </div>
      </CyberModal>
    </div>
  );
}
