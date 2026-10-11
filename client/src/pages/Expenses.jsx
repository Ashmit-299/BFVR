import { useCallback, useEffect, useState } from 'react';
import { get, post, put, del } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import { inr, todayKey, shiftDay } from '../lib/format.js';
import { IconPencil, IconTrash, IconX } from '../components/Icons.jsx';

const RANGES = [
  { key: 'today', labelKey: 'common_today' },
  { key: '7', labelKey: 'common_7days' },
  { key: '30', labelKey: 'common_30days' },
];

const CATS = ['kirana', 'vegetables', 'dairy', 'wages', 'rent', 'utilities', 'transport', 'other'];

export default function Expenses() {
  const { can } = useAuth();
  const { t } = useLang();
  const toast = useToast();
  const [expenses, setExpenses] = useState([]);
  const [range, setRange] = useState('today');
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('kirana');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [day, setDay] = useState(todayKey());
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editLabel, setEditLabel] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (range === 'today') params.set('day', todayKey());
      else params.set('from', shiftDay(todayKey(), -(Number(range) - 1)));
      const data = await get(`/api/expenses?${params.toString()}`);
      setExpenses(data.expenses);
    } catch (err) {
      if (err.status !== 0) toast.push(t('exp_load_err', { err: err.message }), 'error');
    } finally {
      setLoading(false);
    }
  }, [range, toast, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onRefresh = () => load();
    window.addEventListener('bfvr:refresh', onRefresh);
    return () => window.removeEventListener('bfvr:refresh', onRefresh);
  }, [load]);

  const addExpense = async (e) => {
    e.preventDefault();
    if (!Number(amount)) {
      toast.push(t('exp_amount_req'), 'error');
      return;
    }
    setBusy(true);
    try {
      const res = await post(
        '/api/expenses',
        { clientId: crypto.randomUUID(), category, label, amount: Number(amount), note, day },
        { label: `${t('exp_cat')}: ${t(`exp_${category}`)}` }
      );
      if (res.queued) toast.push(t('exp_offline'), 'success');
      else toast.push(t('exp_added'), 'success');
      setLabel('');
      setAmount('');
      setNote('');
      load();
    } catch (err) {
      toast.push(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    try {
      await put(
        `/api/expenses/${editing.id}`,
        { amount: Number(editAmount), label: editLabel },
        { label: t('exp_edit_title') }
      );
      toast.push(t('exp_updated'), 'success');
      setEditing(null);
      load();
    } catch (err) {
      toast.push(err.message, 'error');
    }
  };

  const removeExpense = async (x) => {
    if (!window.confirm(t('exp_delete_confirm', { amt: inr(x.amount) }))) return;
    try {
      await del(`/api/expenses/${x.id}`, { label: t('common_delete') });
      toast.push(t('exp_deleted'), 'success');
      load();
    } catch (err) {
      toast.push(err.message, 'error');
    }
  };

  const total = expenses.reduce((s, x) => s + x.amount, 0);
  const byCategory = expenses.reduce((acc, x) => {
    acc[x.category] = (acc[x.category] || 0) + x.amount;
    return acc;
  }, {});

  return (
    <div>
      <div className="page-head">
        <h2>{t('exp_title')}</h2>
        <div className="seg">
          {RANGES.map((r) => (
            <button key={r.key} className={range === r.key ? 'active' : ''} onClick={() => setRange(r.key)}>
              {t(r.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="expense-layout">
        {can('expenses:create') && (
          <form className="card expense-form" onSubmit={addExpense}>
            <h3>{t('exp_new')}</h3>
            <label className="field-label">{t('exp_cat')}</label>
            <div className="cat-grid">
              {CATS.map((k) => (
                <button
                  type="button"
                  key={k}
                  className={`cat-pick ${category === k ? 'active' : ''}`}
                  onClick={() => setCategory(k)}
                >
                  {t(`exp_${k}`)}
                </button>
              ))}
            </div>
            <div className="form-grid">
              <div>
                <label className="field-label">{t('exp_amount')}</label>
                <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500" required />
              </div>
              <div>
                <label className="field-label">{t('exp_date')}</label>
                <input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
              </div>
            </div>
            <label className="field-label">{t('exp_details')}</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t('exp_details_ph')} />
            <label className="field-label">{t('exp_note')}</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('exp_note_ph')} />
            <button className="btn btn-primary btn-block" disabled={busy}>
              {busy ? t('exp_saving') : t('exp_btn')}
            </button>
          </form>
        )}

        <div className="expense-list">
          <div className="summary-strip">
            <div className="strip-item">
              <span>{t('exp_total')}</span>
              <b className="red">{inr(total)}</b>
            </div>
            <div className="strip-item">
              <span>{t('exp_entries')}</span>
              <b>{expenses.length}</b>
            </div>
            {Object.entries(byCategory).map(([k, v]) => (
              <div className="strip-item" key={k}>
                <span>{t(`exp_${k}`)}</span>
                <b>{inr(v)}</b>
              </div>
            ))}
          </div>

          <div className="table-card">
            {loading ? (
              <div className="empty-state">{t('common_loading')}</div>
            ) : expenses.length === 0 ? (
              <div className="empty-state">{t('exp_empty')}</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('col_day')}</th>
                    <th>{t('exp_cat')}</th>
                    <th>{t('col_detail')}</th>
                    <th className="right">{t('pay_col_amount')}</th>
                    <th>{t('col_by')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((x) => (
                    <tr key={x.id}>
                      <td>{x.day}</td>
                      <td>
                        <span className="badge badge-cat">{t(`exp_${x.category}`)}</span>
                      </td>
                      <td>
                        {x.label || <span className="muted">—</span>}
                        {x.note && <div className="muted small">{x.note}</div>}
                      </td>
                      <td className="right">
                        <b>{inr(x.amount)}</b>
                      </td>
                      <td className="muted">{x.createdBy?.name || '—'}</td>
                      <td className="right row-actions">
                        {can('expenses:edit') && (
                          <button
                            className="btn btn-sm"
                            onClick={() => {
                              setEditing(x);
                              setEditAmount(String(x.amount));
                              setEditLabel(x.label);
                            }}
                          >
                            <IconPencil size={16} />
                          </button>
                        )}
                        {can('expenses:delete') && (
                          <button className="btn btn-sm btn-danger" onClick={() => removeExpense(x)}>
                            <IconTrash size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {editing && (
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setEditing(null)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-head">
              <h3>{t('exp_edit_title')}</h3>
              <button className="modal-close" onClick={() => setEditing(null)}><IconX size={17} /></button>
            </div>
            <div className="modal-body">
              <label className="field-label">{t('exp_amount')}</label>
              <input type="number" min="1" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
              <label className="field-label">{t('exp_details')}</label>
              <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setEditing(null)}>{t('common_cancel')}</button>
              <button className="btn btn-primary" onClick={saveEdit}>{t('common_save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
