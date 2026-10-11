import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import { get } from '../lib/api.js';
import { useLang } from '../context/LangContext.jsx';
import { inr, fmtDateTime } from '../lib/format.js';

let settingsCache = null;

// Printable bill — follows the current language, prints for customers.
export default function Bill({ order, onClose }) {
  const { t } = useLang();
  const [settings, setSettings] = useState(settingsCache);

  useEffect(() => {
    if (settingsCache) return;
    get('/api/settings')
      .then((d) => {
        settingsCache = d.settings;
        setSettings(d.settings);
      })
      .catch(() => {});
  }, []);

  const r = settings?.restaurant || {};

  return (
    <Modal title={`${t('bill_label')}${order.number ?? ''}`} onClose={onClose} width={460}>
      <div className="print-area">
        <div className="bill">
          <div className="bill-head">
            <div className="bill-logo">VS</div>
            <div className="bill-title">{r.name || t('brand_name')}</div>
            {r.nameEn && <div className="bill-sub">{r.nameEn}</div>}
            {r.address && <div className="bill-addr">{r.address}</div>}
            {r.phone && <div className="bill-addr">{r.phone}</div>}
          </div>

          <div className="bill-meta">
            <span>
              {t('bill_label')}: <b>{order.number ?? t('bill_pending')}</b>
            </span>
            <span>{fmtDateTime(order.placedAt || new Date().toISOString())}</span>
          </div>
          <div className="bill-meta">
            {order.table != null && (
              <span>
                {t('bill_table')}: <b>{order.table}</b>
              </span>
            )}
            {order.customerName && (
              <span>
                {t('bill_customer')}: <b>{order.customerName}</b>
              </span>
            )}
            {order.customerPhone && <span>{order.customerPhone}</span>}
          </div>

          <table className="bill-table">
            <thead>
              <tr>
                <th>{t('bill_item')}</th>
                <th>{t('bill_qty')}</th>
                <th>{t('bill_rate')}</th>
                <th>{t('bill_amount')}</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it, i) => (
                <tr key={i}>
                  <td>
                    {it.name}
                    {it.portion !== 'single' && <span className="bill-portion"> ({t(`portion_${it.portion}`)})</span>}
                  </td>
                  <td>{it.qty}</td>
                  <td>{inr(it.price)}</td>
                  <td>{inr(it.price * it.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="bill-totals">
            <div>
              <span>{t('bill_sub')}</span>
              <span>{inr(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div>
                <span>{t('bill_disc')}</span>
                <span>−{inr(order.discount)}</span>
              </div>
            )}
            <div className="bill-grand">
              <span>{t('bill_total')}</span>
              <span>{inr(order.total)}</span>
            </div>
            <div>
              <span>{t('bill_paid')}</span>
              <span>{inr(order.paid || 0)}</span>
            </div>
            {order.due > 0 && (
              <div className="bill-due">
                <span>{t('bill_due')}</span>
                <span>{inr(order.due)}</span>
              </div>
            )}
          </div>

          {order.payments && order.payments.length > 0 && (
            <div className="bill-payments">
              {order.payments.map((p) => (
                <div key={p.id}>
                  {t(`method_${p.method}`)} — {inr(p.amount)}
                </div>
              ))}
            </div>
          )}

          <div className="bill-foot">
            <div>{r.tagline || t('login_tag')}</div>
            <div className="bill-thanks">{t('bill_thanks')}</div>
          </div>
        </div>
      </div>

      <div className="bill-actions no-print">
        <button className="btn btn-primary" onClick={() => window.print()}>
          {t('bill_print')}
        </button>
        <button className="btn" onClick={onClose}>
          {t('common_close')}
        </button>
      </div>
    </Modal>
  );
}
