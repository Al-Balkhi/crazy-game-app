import React, { useState, useEffect, useCallback } from 'react';
import { FileSpreadsheet, Filter, Download, Receipt, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { CyberButton } from '../components/shared/CyberButton';
import { CyberModal } from '../components/shared/CyberModal';
import { InvoiceModal } from '../components/dashboard/InvoiceModal';
import { sessionsAPI } from '../lib/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';
import { formatTime } from '../lib/utils';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import './InvoiceLog.css';

const PAGE_SIZE = 15;

export function InvoiceLog() {
  const [sessions, setSessions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState(null); // null | 'day' | 'week' | 'month'
  const [loading, setLoading] = useState(true);

  const [viewInvoice, setViewInvoice] = useState(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  const { t } = useLanguage();
  const { timeFormat } = useSettings();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await sessionsAPI.list({
        filter: filter || undefined,
        page,
        page_size: PAGE_SIZE,
      });
      setSessions(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to load invoice log:', err);
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 1 when filter changes
  useEffect(() => { setPage(1); }, [filter]);

  const handleRowClick = async (s) => {
    setLoadingInvoice(true);
    try {
      const invoice = await sessionsAPI.invoice(s.session_id);
      setViewInvoice(invoice);
    } catch (err) {
      console.error('Failed to load invoice:', err);
    } finally {
      setLoadingInvoice(false);
    }
  };

  const exportToExcel = async () => {
    // Export ALL matching the filter (no pagination limit)
    let allSessions = [];
    try {
      const data = await sessionsAPI.list({
        filter: filter || undefined,
        page: 1,
        page_size: 1000,
      });
      allSessions = data.items || [];
    } catch {
      allSessions = sessions;
    }

    const totalProfit = allSessions.reduce((sum, s) => sum + (s.profit || 0), 0);

    const rows = allSessions.map((s) => ({
      [t('session_id')]: s.session_id,
      [t('device')]: s.device_name,
      [t('session_type')]: s.session_type,
      [t('booked_duration')]: s.duration_minutes ? `${s.duration_minutes} ${t('minutes')}` : t('open_session'),
      [t('actual_duration')]: s.actual_minutes ? `${s.actual_minutes} ${t('minutes')}` : '-',
      [t('started')]: s.start_time ? new Date(s.start_time).toLocaleString() : '-',
      [t('ended')]: s.ended_at ? new Date(s.ended_at).toLocaleString() : '-',
      [t('session_price')]: s.session_price,
      [t('products_total')]: s.products_total,
      [t('total_cost')]: s.total_cost,
    }));

    // Append summary row
    rows.push({});
    rows.push({
      [t('session_id')]: t('total_profit'),
      [t('device')]: '',
      [t('session_type')]: '',
      [t('booked_duration')]: '',
      [t('actual_duration')]: '',
      [t('started')]: '',
      [t('ended')]: '',
      [t('session_price')]: '',
      [t('products_total')]: '',
      [t('total_cost')]: totalProfit,
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t('invoice_log'));

    const filterLabel = filter ? `_${filter}` : '_all';
    const filename = `invoice_log${filterLabel}.xlsx`;

    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), filename);

    // Auto-save to program folder
    try {
      if (window.electronFS) {
        const result = window.electronFS.saveReport(filename, buf);
        if (result.success) console.log(`Auto-saved to: ${result.path}`);
      }
    } catch { /* no-op */ }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const FILTERS = [
    { key: null, label: t('all') },
    { key: 'day', label: t('today') },
    { key: 'week', label: t('this_week') },
    { key: 'month', label: t('this_month') },
  ];

  return (
    <div className="page-enter">
      <div className="page-header">
        <h1>{t('invoice_log')}</h1>
        <p>{t('invoice_log_desc')}</p>
      </div>

      {/* Toolbar */}
      <div className="invoice-log-toolbar">
        <div className="invoice-log-filters">
          <Filter size={16} className="invoice-log-filter-icon" />
          {FILTERS.map((f) => (
            <button
              key={String(f.key)}
              className={`invoice-log-filter-btn ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <CyberButton variant="secondary" size="sm" onClick={exportToExcel}>
          <Download size={14} />
          {t('export_excel')}
        </CyberButton>
      </div>

      {/* Table */}
      <div className="invoice-log-table-wrap">
        {loading ? (
          <div className="invoice-log-loading">
            <Receipt size={40} />
            <p>{t('loading')}...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="invoice-log-empty">
            <Receipt size={48} />
            <p>{t('no_invoices')}</p>
          </div>
        ) : (
          <table className="invoice-log-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{t('device')}</th>
                <th>{t('session_type')}</th>
                <th>{t('started')}</th>
                <th>{t('ended')}</th>
                <th>{t('booked_duration')}</th>
                <th>{t('session_price')}</th>
                <th>{t('products_total')}</th>
                <th>{t('total_cost')}</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr
                  key={s.session_id}
                  className="invoice-log-row"
                  onClick={() => handleRowClick(s)}
                  title={t('click_to_view_invoice')}
                >
                  <td className="invoice-log-cell--id">{s.session_id}</td>
                  <td>{s.device_name}</td>
                  <td>
                    <span className="invoice-log-type-badge">
                      {s.session_type?.toUpperCase()}
                      {s.is_open_session && ' ∞'}
                    </span>
                  </td>
                  <td className="invoice-log-cell--time">
                    {s.start_time ? formatTime(s.start_time, timeFormat) : '-'}
                  </td>
                  <td className="invoice-log-cell--time">
                    {s.ended_at ? formatTime(s.ended_at, timeFormat) : '-'}
                  </td>
                  <td>
                    {s.is_open_session
                      ? t('open_session')
                      : s.actual_minutes
                      ? `${s.actual_minutes} ${t('minutes')}`
                      : '-'}
                  </td>
                  <td className="invoice-log-cell--price">
                    {s.session_price?.toLocaleString()} {t('syp')}
                  </td>
                  <td className="invoice-log-cell--price">
                    {s.products_total?.toLocaleString()} {t('syp')}
                  </td>
                  <td className="invoice-log-cell--total">
                    {s.total_cost?.toLocaleString()} {t('syp')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="invoice-log-pagination">
          <button
            className="invoice-log-page-btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="invoice-log-page-info">
            {page} / {totalPages} &nbsp;·&nbsp; {total} {t('records')}
          </span>
          <button
            className="invoice-log-page-btn"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Invoice Detail Modal */}
      <InvoiceModal
        isOpen={!!viewInvoice}
        onClose={() => setViewInvoice(null)}
        invoice={viewInvoice}
      />
    </div>
  );
}
