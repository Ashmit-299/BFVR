import { useEffect, useState } from 'react';
import { get } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import { inr, fmtDateTime } from '../lib/format.js';

// Super-admin only: how many admins/managers were created and how they are
// actually using the system (bills, payments, expenses, last activity).
export default function Overview() {
  const { user: me, can } = useAuth();
  const { t } = useLang();
  const toast = useToast();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (me.role !== 'superadmin') return;
    get('/api/users/overview')
      .then(setData)
      .catch((err) => {
        if (err.status !== 0) toast.push(t('ov_load_err', { err: err.message }), 'error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (me.role !== 'superadmin') {
    return <div className="info-banner">{t('ov_no_perm')}</div>;
  }

  if (!data) {
    return <div className="empty-state">{t('common_loading')}</div>;
  }

  const { counts, totals, users } = data;
  const others = users.filter((u) => u.role !== 'superadmin');

  return (
    <div>
      <div className="page-head">
        <h2>{t('ov_title')}</h2>
      </div>

      <div className="role-help card">{t('ov_help')}</div>

      <div className="stat-grid">
        <div className="stat-card pink">
          <span>{t('ov_admins')}</span>
          <b>{counts.admin}</b>
          <em>{t('ov_admins_hint')}</em>
        </div>
        <div className="stat-card gold">
          <span>{t('ov_managers')}</span>
          <b>{counts.manager}</b>
          <em>{t('ov_managers_hint')}</em>
        </div>
        <div className="stat-card green">
          <span>{t('ov_total_users')}</span>
          <b>{counts.total}</b>
          <em>{t('ov_active_n', { n: counts.active })}</em>
        </div>
        <div className="stat-card brown">
          <span>{t('ov_total_billed')}</span>
          <b>{inr(totals.billed)}</b>
          <em>{t('ov_orders_n', { n: totals.orders })}</em>
        </div>
      </div>

      <div className="table-card">
        <table className="table">
          <thead>
            <tr>
              <th>{t('col_name')}</th>
              <th>{t('col_role')}</th>
              <th>{t('ov_col_orders')}</th>
              <th>{t('ov_col_billed')}</th>
              <th>{t('ov_col_payments')}</th>
              <th>{t('ov_col_expenses')}</th>
              <th>{t('ov_col_last_activity')}</th>
            </tr>
          </thead>
          <tbody>
            {others.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">
                  {t('ov_empty')}
                </td>
              </tr>
            )}
            {others.map((u) => (
              <tr key={u.id}>
                <td>
                  <b>{u.name}</b>
                  <div className="muted small">{u.username}</div>
                </td>
                <td>
                  <span className={`badge badge-role-${u.role}`}>{t(`role_${u.role}`)}</span>
                  {!u.active && <span className="red small"> · {t('st_inactive')}</span>}
                </td>
                <td>{u.orders}</td>
                <td>{inr(u.billed)}</td>
                <td>
                  {inr(u.paid)}
                  <div className="muted small">{t('ov_payments_n', { n: u.payments })}</div>
                </td>
                <td>
                  {inr(u.expenseTotal)}
                  <div className="muted small">{t('ov_expenses_n', { n: u.expenses })}</div>
                </td>
                <td className="muted small">
                  {u.lastActivityAt ? fmtDateTime(u.lastActivityAt) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
