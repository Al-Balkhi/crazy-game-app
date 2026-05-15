import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Download, Edit3, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { CyberTable, CyberPagination } from '../components/shared/CyberTable';
import { CyberButton } from '../components/shared/CyberButton';
import { CyberInput } from '../components/shared/CyberInput';
import { CyberModal } from '../components/shared/CyberModal';
import { productsAPI, healthAPI } from '../lib/api';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useLanguage } from '../contexts/LanguageContext';
import '../components/shared/CyberShared.css';
import './Products.css';

const PAGE_SIZE = 15;

export function Products() {
  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [inventoryReady, setInventoryReady] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState({ name: '', purchase_price: '', selling_price: '', quantity: '' });

  const { t } = useLanguage();

  const loadProducts = useCallback(async () => {
    try {
      const [data, countRes] = await Promise.all([
        productsAPI.list({ search, page, page_size: PAGE_SIZE }),
        productsAPI.count({ search }),
      ]);
      setProducts(data);
      setTotalCount(countRes.count);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  useEffect(() => {
    healthAPI.check()
      .then((h) => setInventoryReady(Boolean(h?.inventory_enabled)))
      .catch(() => setInventoryReady(false));
  }, []);

  useEffect(() => { setPage(1); }, [search]);

  const openCreate = () => {
    setEditingProduct(null);
    setForm({ name: '', purchase_price: '', selling_price: '', quantity: '' });
    setModalOpen(true);
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      purchase_price: String(product.purchase_price),
      selling_price: String(product.selling_price),
      quantity: String(product.quantity ?? 0),
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const data = {
      name: form.name,
      purchase_price: parseFloat(form.purchase_price) || 0,
      selling_price: parseFloat(form.selling_price) || 0,
      quantity: Math.max(0, parseInt(form.quantity, 10) || 0),
    };
    try {
      let saved;
      if (editingProduct) {
        saved = await productsAPI.update(editingProduct.id, data);
      } else {
        saved = await productsAPI.create(data);
      }
      if (typeof saved?.quantity !== 'number' || saved.quantity !== data.quantity) {
        alert(t('quantity_not_saved'));
        return;
      }
      setModalOpen(false);
      loadProducts();
      window.dispatchEvent(new Event('inventory-changed'));
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('delete_confirm'))) return;
    try {
      await productsAPI.delete(id);
      loadProducts();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleToggle = async (id) => {
    try {
      await productsAPI.toggle(id);
      loadProducts();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const exportData = async (format) => {
    let exportList = products;
    try {
      exportList = await productsAPI.list({ search, page: 1, page_size: 1000 });
    } catch (err) {
      console.error('Export fetch failed:', err);
    }
    const rows = exportList.map(p => ({
      ID: p.id,
      [t('product_name')]: p.name,
      [t('purchase_price')]: p.purchase_price,
      [t('selling_price')]: p.selling_price,
      [t('available_quantity')]: Number(p.quantity) || 0,
      [t('status')]: p.is_active ? t('active') : t('disabled'),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t('products'));
    if (format === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, 'products.csv');
    } else {
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([buf], { type: 'application/octet-stream' });
      saveAs(blob, 'products.xlsx');
    }
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: t('product_name') },
    {
      key: 'purchase_price',
      label: t('purchase_price'),
      render: (val) => `${val.toLocaleString()} ${t('syp')}`,
    },
    {
      key: 'selling_price',
      label: t('selling_price'),
      render: (val) => <span style={{ color: 'var(--cyber-cyan)' }}>{val.toLocaleString()} {t('syp')}</span>,
    },
    {
      key: 'quantity',
      label: t('quantity'),
      render: (val, row) => {
        if (val === 0) {
          return <span className="cyber-badge cyber-badge--danger">{t('out_of_stock')}</span>;
        }
        if (row.is_low_stock) {
          return <span className="cyber-badge cyber-badge--warning">{val} — {t('low_stock')}</span>;
        }
        return <span>{val}</span>;
      },
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

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="page-enter">
      <div className="page-header">
        <h1>{t('products')}</h1>
        <p>{t('manage_products')}</p>
      </div>

      {!inventoryReady && (
        <div className="products-backend-warning" role="alert">
          <strong>{t('backend_outdated')}</strong>
          <p>{t('backend_outdated_desc')}</p>
        </div>
      )}

      {/* Toolbar */}
      <div className="cyber-toolbar">
        <CyberInput search placeholder={t('search_products')} value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="cyber-toolbar-spacer" />
        <CyberButton variant="ghost" size="sm" onClick={() => exportData('csv')}>
          <Download size={14} /> CSV
        </CyberButton>
        <CyberButton variant="ghost" size="sm" onClick={() => exportData('xlsx')}>
          <Download size={14} /> XLSX
        </CyberButton>
        <CyberButton variant="primary" onClick={openCreate}>
          <Plus size={16} /> {t('add_product')}
        </CyberButton>
      </div>

      {/* Table */}
      <CyberTable
        columns={columns}
        data={products}
        emptyMessage={t('no_devices')}
        actions={(row) => (
          <>
            <CyberButton variant="ghost" size="icon" onClick={() => openEdit(row)} title={t('edit_product')}>
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

      <CyberPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Add/Edit Modal */}
      <CyberModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingProduct ? t('edit_product') : t('new_product')}>
        <div className="cyber-modal-body">
          <CyberInput label={t('product_name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="form-row">
            <CyberInput label={`${t('purchase_price')} (${t('syp')})`} type="number" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} />
            <CyberInput label={`${t('selling_price')} (${t('syp')})`} type="number" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} />
          </div>
          <CyberInput
            label={t('available_quantity')}
            type="number"
            min="0"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          />
        </div>
        <div className="cyber-modal-footer">
          <CyberButton variant="ghost" onClick={() => setModalOpen(false)}>{t('cancel')}</CyberButton>
          <CyberButton variant="primary" onClick={handleSave} disabled={!form.name}>
            {editingProduct ? t('update') : t('create')}
          </CyberButton>
        </div>
      </CyberModal>
    </div>
  );
}
