import { Receipt, Package } from 'lucide-react';
import { CyberModal } from '../shared/CyberModal';
import { CyberButton } from '../shared/CyberButton';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSettings } from '../../contexts/SettingsContext';
import { formatTime } from '../../lib/utils';
import './InvoiceModal.css';

export function InvoiceModal({ isOpen, onClose, invoice }) {
  const { t } = useLanguage();
  const { timeFormat } = useSettings();
  if (!isOpen || !invoice) return null;

  const startTime = formatTime(invoice.start_time, timeFormat);
  const endTime = invoice.ended_at ? formatTime(invoice.ended_at, timeFormat) : 'N/A';

  const bookedPrice = invoice.booked_session_price ?? invoice.session_price;
  const showEarlyEnd = invoice.early_end && bookedPrice > invoice.session_price;

  return (
    <CyberModal isOpen={isOpen} onClose={onClose} title={t('invoice')} size="lg">
      <div className="cyber-modal-body">
        <div className="invoice-container">
          <div className="invoice-header-section">
            <Receipt size={24} className="invoice-icon" />
            <h3>{t('session_complete')}</h3>
          </div>

          <div className="invoice-row">
            <span className="invoice-label">{t('device')}</span>
            <span className="invoice-value">{invoice.device_name}</span>
          </div>
          <div className="invoice-row">
            <span className="invoice-label">{t('type')}</span>
            <span className="invoice-value">{invoice.device_type}</span>
          </div>
          <div className="invoice-row">
            <span className="invoice-label">{t('session_type')}</span>
            <span className="invoice-value invoice-value--badge">{invoice.session_type.toUpperCase()}</span>
          </div>
          {invoice.is_open_session ? (
            <div className="invoice-row">
              <span className="invoice-label">{t('open_session')}</span>
              <span className="invoice-value invoice-value--badge">{t('open_session').toUpperCase()}</span>
            </div>
          ) : (
            <div className="invoice-row">
              <span className="invoice-label">{t('booked_duration')}</span>
              <span className="invoice-value">{invoice.duration_minutes} {t('minutes')}</span>
            </div>
          )}
          {invoice.actual_minutes != null && (invoice.is_open_session || invoice.actual_minutes !== invoice.duration_minutes) && (
            <div className="invoice-row">
              <span className="invoice-label">{t('actual_duration')}</span>
              <span className="invoice-value">{invoice.actual_minutes} {t('minutes')}</span>
            </div>
          )}
          <div className="invoice-row">
            <span className="invoice-label">{t('time')}</span>
            <span className="invoice-value">{startTime} → {endTime}</span>
          </div>

          <div className="invoice-divider" />

          {showEarlyEnd && (
            <>
              <div className="invoice-row invoice-row--muted">
                <span className="invoice-label">{t('booked_price')}</span>
                <span className="invoice-value invoice-value--struck">
                  {bookedPrice.toLocaleString()} {t('syp')}
                </span>
              </div>
              <div className="invoice-row invoice-row--adjustment">
                <span className="invoice-label">{t('early_end_adjustment')}</span>
                <span className="invoice-value invoice-value--credit">
                  −{(bookedPrice - invoice.session_price).toLocaleString()} {t('syp')}
                </span>
              </div>
            </>
          )}
          <div className="invoice-row">
            <span className="invoice-label">{t('session_price')}</span>
            <span className="invoice-value">{invoice.session_price.toLocaleString()} {t('syp')}</span>
          </div>

          {invoice.products && invoice.products.length > 0 && (
            <>
              <div className="invoice-products-header">
                <Package size={14} />
                <span>{t('ordered_items')}</span>
              </div>
              {invoice.products.map((p, i) => (
                <div key={i} className="invoice-product-row">
                  <span>{p.product_name} × {p.quantity}</span>
                  <span>{(p.unit_price * p.quantity).toLocaleString()} {t('syp')}</span>
                </div>
              ))}
              <div className="invoice-row">
                <span className="invoice-label">{t('products_total')}</span>
                <span className="invoice-value">{invoice.products_total.toLocaleString()} {t('syp')}</span>
              </div>
            </>
          )}

          <div className="invoice-divider invoice-divider--strong" />

          <div className="invoice-total-row">
            <span>{t('total_cost')}</span>
            <span>{invoice.total_cost.toLocaleString()} {t('syp')}</span>
          </div>
        </div>
      </div>

      <div className="cyber-modal-footer">
        <CyberButton variant="ghost" onClick={onClose}>{t('close')}</CyberButton>
      </div>
    </CyberModal>
  );
}
