import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit3, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { CyberTable } from '../components/shared/CyberTable';
import { CyberButton } from '../components/shared/CyberButton';
import { CyberInput, CyberSelect } from '../components/shared/CyberInput';
import { CyberModal } from '../components/shared/CyberModal';
import { devicesAPI, deviceTypesAPI } from '../lib/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotify } from '../contexts/NotifyContext';
import '../components/shared/CyberShared.css';
import './Devices.css';

export function Devices() {
  const [devices, setDevices] = useState([]);
  const [deviceTypes, setDeviceTypes] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [form, setForm] = useState({ name: '', device_type_id: '' });

  const { t } = useLanguage();
  const notify = useNotify();

  const load = useCallback(async () => {
    try {
      const [devs, types] = await Promise.all([
        devicesAPI.list(),
        deviceTypesAPI.list(),
      ]);
      setDevices(devs);
      setDeviceTypes(types);
    } catch (err) {
      console.error('Failed to load devices:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = devices.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.device_type?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditingDevice(null);
    setForm({ name: '', device_type_id: deviceTypes[0]?.id || '' });
    setModalOpen(true);
  };

  const openEdit = (device) => {
    setEditingDevice(device);
    setForm({ name: device.name, device_type_id: device.device_type_id });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const data = { name: form.name, device_type_id: parseInt(form.device_type_id) };
    try {
      if (editingDevice) {
        await devicesAPI.update(editingDevice.id, data);
      } else {
        await devicesAPI.create(data);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      notify.error(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!(await notify.confirm(t('delete_confirm')))) return;
    try {
      await devicesAPI.delete(id);
      load();
    } catch (err) {
      notify.error(err.message);
    }
  };

  const handleToggle = async (id) => {
    try {
      await devicesAPI.toggle(id);
      load();
    } catch (err) {
      notify.error(err.message);
    }
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: t('device_name') },
    {
      key: 'device_type',
      label: t('type'),
      render: (val) => val?.name || t('unknown'),
    },
    {
      key: 'is_active',
      label: t('status'),
      render: (val) => (
        <span className={`cyber-badge ${val ? 'cyber-badge--success' : 'cyber-badge--danger'}`}>
          {val ? t('active') : t('disabled')}
        </span>
      ),
    },
  ];

  return (
    <div className="page-enter">
      <div className="page-header">
        <h1>{t('devices')}</h1>
        <p>{t('manage_devices')}</p>
      </div>

      <div className="cyber-toolbar">
        <CyberInput search placeholder={t('search_products')} value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="cyber-toolbar-spacer" />
        <CyberButton variant="primary" onClick={openCreate} disabled={deviceTypes.length === 0}>
          <Plus size={16} /> {t('add_device')}
        </CyberButton>
      </div>

      <CyberTable
        columns={columns}
        data={filtered}
        emptyMessage={t('no_devices')}
        actions={(row) => (
          <>
            <CyberButton variant="ghost" size="icon" onClick={() => openEdit(row)} title={t('edit_device')}>
              <Edit3 size={14} />
            </CyberButton>
            <CyberButton variant="ghost" size="icon" onClick={() => handleToggle(row.id)} title={row.is_active ? t('disabled') : t('active')}>
              {row.is_active ? <ToggleRight size={14} style={{ color: 'var(--cyber-success)' }} /> : <ToggleLeft size={14} />}
            </CyberButton>
            <CyberButton variant="ghost" size="icon" onClick={() => handleDelete(row.id)} title="Delete">
              <Trash2 size={14} style={{ color: 'var(--cyber-danger)' }} />
            </CyberButton>
          </>
        )}
      />

      <CyberModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingDevice ? t('edit_device') : t('new_device')}>
        <div className="cyber-modal-body">
          <CyberInput label={t('device_name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <CyberSelect label={t('type')} value={form.device_type_id} onChange={(e) => setForm({ ...form, device_type_id: e.target.value })}>
            {deviceTypes.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </CyberSelect>
        </div>
        <div className="cyber-modal-footer">
          <CyberButton variant="ghost" onClick={() => setModalOpen(false)}>{t('cancel')}</CyberButton>
          <CyberButton variant="primary" onClick={handleSave} disabled={!form.name || !form.device_type_id}>
            {editingDevice ? t('update') : t('create')}
          </CyberButton>
        </div>
      </CyberModal>
    </div>
  );
}
