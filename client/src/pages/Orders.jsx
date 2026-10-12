import { useCallback, useEffect, useState } from 'react';
import { get, post, put, del } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import Modal from '../components/Modal.jsx';
import Bill from '../components/Bill.jsx';
import { inr, fmtTime, todayKey, shiftDay } from '../lib/format.js';
import { IconEye, IconCash, IconLock, IconPencil, IconTrash, IconX } from '../components/Icons.jsx';

const RANGES = [
  { key: 'today', labelKey: 'common_today' },
  { key: '7', labelKey: 'common_7days' },
  { key: '30', labelKey: 'common_30days' },
  { key: 'all', labelKey: 'common_all' },
];

export default function Orders() {
  const { can } = useAuth();
  const { t, dish } = useLang();
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('today');
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [billView, setBillView] = useState(null);
  const [payFor, setPayFor] = useState(null);
  const [payMethod, setPayMethod] = useState('cash');
  const [payAmount, setPayAmount] = useState('');
  const [editing, setEditing] = useState(null);
  const [editItems, setEditItems] = useState([]);
  const [editDiscount, setEditDiscount] = useState('');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [menuItems, setMenuItems] = useState([]);
  // bulk delete: selected bills (checkbox column)
  const [selected, setSelected] = useState(new Set());
  const selectAll = useCallback((rows) => {
    setSelected(new Set(rows.map((o) => o.id)));
  }, []);
  const toggleSelect = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);
  const clearSelection = useCallback(() => setSelected(new Set()), []);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (range === 'today') params.set('day', todayKey());
      else if (range !== 'all') params.set('from', shiftDay(todayKey(), -(Number(range) - 1)));
      if (status !== 'all') params.set('status', status);
      if (q.trim()) params.set('q', q.trim());
      const data = await get(`/api/orders?${params.toString()}`);
      setOrders(data.orders);
    } catch (err) {
      if (err.status !== 0) toast.push(t('ord_load_err', { err: err.message }), 'error');
    } finally {
      setLoading(false);
    }
  }, [range, status, q, toast, t]);

  const bulkDelete = useCallback(async () => {
    if (selected.size === 0) return;
    if (!window.confirm(t('ord_bulk_delete_confirm', { n: selected.size }))) return;
    let ok = 0;
    let failed = 0;
    for (const id of selected) {
      try {
        await del(`/api/orders/${id}`, { label: t('ord_bulk_delete') });
        ok++;
      } catch {
        failed++;
      }
    }
    clearSelection();
    if (ok) toast.push(t('ord_bulk_deleted', { n: ok }), 'success');
    if (failed) toast.push(t('ord_bulk_failed', { n: failed }), 'error');
    load();
  }, [selected, clearSelection, load, toast, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    get('/api/settings').then((d) => setSettings(d.settings)).catch(() => {});
    get('/api/menu').then((d) => setMenuItems(d.items)).catch(() => {});
    const onRefresh = () => load();
    window.addEventListener('bfvr:refresh', onRefresh);
    return () => window.removeEventListener('bfvr:refresh', onRefresh);
  }, [load]);

  const openPay = (o) => {
    setPayFor(o);
    setPayMethod('cash');
    setPayAmount(String(o.due));
  };

  const submitPayment = async () => {
    try {
      const res = await post(
        `/api/orders/${payFor.id}/payments`,
        { clientId: crypto.randomUUID(), method: payMethod, amount: Number(payAmount) },
        { label: `${t('ord_pay')} #${payFor.number}` }
      );
      if (res.queued) {
        toast.push(t('pay_offline'), 'success');
      } else {
        toast.push(t('pay_recorded'), 'success');
        // Fully paid → the bill is finished: close it so its table is freed
        const paid = res.order;
        if (paid && paid.status === 'open' && paid.due <= 0) {
          try {
            const cres = await post(
              '/api/orders/close',
              { id: paid.id, orderClientId: paid.clientId || undefined },
              { label: `${t('ord_close')} #${payFor.number}` }
            );
            if (!cres.queued) toast.push(t('ord_closed'), 'success');
          } catch (err) {
            toast.push(err.message, 'error'); // stays open — can be closed manually
          }
        }
      }
      setPayFor(null);
      load();
    } catch (err) {
      toast.push(err.message, 'error');
    }
  };

  const closeBill = async (o) => {
    if (!window.confirm(t('ord_close_confirm', { n: o.number }))) return;
    try {
      const res = await post(
        '/api/orders/close',
        { id: o.id, orderClientId: o.clientId || undefined },
        { label: `${t('ord_close')} #${o.number}` }
      );
      if (res.queued) toast.push(t('edit_queued'), 'success');
      else toast.push(t('ord_closed'), 'success');
      load();
    } catch (err) {
      toast.push(err.message, 'error');
    }
  };

  const openEdit = (o) => {
    setEditing(o);
    setEditItems(o.items.map((it) => ({ itemId: it.item, name: it.name, nameEn: it.nameEn || '', portion: it.portion, price: it.price, qty: it.qty })));
    setEditDiscount(String(o.discount || ''));
    setEditName(o.customerName || '');
    setEditPhone(o.customerPhone || '');
  };

  const addEditItem = (value) => {
    if (!value) return;
    const [itemId, portion] = value.split('|');
    const menu = menuItems.find((m) => m.id === itemId);
    if (!menu) return;
    const price = portion === 'half' ? menu.halfPrice : portion === 'full' ? menu.fullPrice : menu.price;
    const existing = editItems.find((it) => it.itemId === itemId && it.portion === portion);
    if (existing) {
      setEditItems((rows) => rows.map((r) => (r === existing ? { ...r, qty: r.qty + 1 } : r)));
    } else {
      setEditItems((rows) => [...rows, { itemId, name: menu.name, nameEn: menu.nameEn || '', portion, price, qty: 1 }]);
    }
  };

  const saveEdit = async () => {
    try {
      const res = await put(
        `/api/orders/${editing.id}`,
        {
          customerName: editName,
          customerPhone: editPhone,
          discount: Number(editDiscount) || 0,
          items: editItems.map(({ itemId, portion, qty }) => ({ itemId, portion, qty })),
        },
        { label: `${t('edit_title', { n: editing.number })}` }
      );
      toast.push(t('edit_saved'), 'success');
      setEditing(null);
      load();
      if (res.queued) toast.push(t('edit_queued'), 'info');
    } catch (err) {
      toast.push(err.message, 'error');
    }
  };

  const removeOrder = async (o) => {
    if (!window.confirm(t('ord_delete_confirm', { n: o.number }))) return;
    try {
      await del(`/api/orders/${o.id}`, { label: `${t('ord_delete')} #${o.number}` });
      toast.push(t('ord_deleted'), 'success');
      load();
    } catch (err) {
      toast.push(err.message, 'error');
    }
  };

  const isSelected = (o) => selected.has(o.id);

  const totals = orders.reduce(
    (a, o) => ({ total: a.total + o.total, paid: a.paid + o.paid, due: a.due + o.due }),
    { total: 0, paid: 0, due: 0 }
  );

  return (
    <div>
      <div className="page-head">
        <h2>{t('orders_title')}</h2>
        <div className="page-actions">
          <input
            className="search"
            placeholder={t('ord_search')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ minWidth: 180 }}
          />
        </div>
      </div>

      <div className="filter-bar">
        <div className="seg">
          {RANGES.map((r) => (
            <button key={r.key} className={range === r.key ? 'active' : ''} onClick={() => setRange(r.key)}>
              {t(r.labelKey)}
            </button>
          ))}
        </div>
        <div className="seg">
          {[
            { key: 'all', labelKey: 'status_all' },
            { key: 'due', labelKey: 'status_due' },
            { key: 'paid', labelKey: 'status_paid' },
          ].map((r) => (
            <button key={r.key} className={status === r.key ? 'active' : ''} onClick={() => setStatus(r.key)}>
              {t(r.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="summary-strip">
        <div className="strip-item">
          <span>{t('ord_bills')}</span>
          <b>{orders.length}</b>
        </div>
        <div className="strip-item">
          <span>{t('ord_total')}</span>
          <b>{inr(totals.total)}</b>
        </div>
        <div className="strip-item">
          <span>{t('ord_received')}</span>
          <b className="green">{inr(totals.paid)}</b>
        </div>
        <div className="strip-item">
          <span>{t('ord_due')}</span>
          <b className="red">{inr(totals.due)}</b>
        </div>
      </div>

      <div className="table-card">
        {loading ? (
          <div className="empty-state">{t('common_loading')}</div>
        ) : orders.length === 0 ? (
          <div className="empty-state">{t('ord_empty')}</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th className="check-col">
                  <input
                    type="checkbox"
                    className="check-all"
                    checked={selected.size === orders.length && selected.size > 0}
                    onChange={() => selectAll(orders)}
                  />
                </th>
                <th>#</th>
                <th>{t('col_time')}</th>
                <th>{t('col_table')}</th>
                <th>{t('col_items')}</th>
                <th>{t('col_customer')}</th>
                <th className="right">{t('ord_total')}</th>
                <th className="right">{t('ord_received')}</th>
                <th className="right">{t('ord_due')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="check-col">
                    <input
                      type="checkbox"
                      className="check-row"
                      checked={isSelected(o)}
                      onChange={() => toggleSelect(o.id)}
                    />
                  </td>
                  <td>
                    <b>{o.number}</b>
                    <div>
                      <span className={`badge ${o.status === 'open' ? 'badge-open' : 'badge-closed'}`}>
                        {o.status === 'open' ? t('status_open') : t('status_closed')}
                      </span>
                    </div>
                  </td>
                  <td>
                    {fmtTime(o.placedAt)}
                    <span className="muted"> · {o.day}</span>
                  </td>
                  <td>{o.table != null ? <b>T{o.table}</b> : <span className="muted">{t('ord_table_na')}</span>}</td>
                  <td className="items-cell">
                    {o.items
                      .slice(0, 3)
                      .map((it) => `${dish(it)}${it.portion !== 'single' ? ` (${t(`portion_${it.portion}`)})` : ''}×${it.qty}`)
                      .join(', ')}
                    {o.items.length > 3 && ` +${o.items.length - 3}`}
                  </td>
                  <td>{o.customerName || <span className="muted">—</span>}</td>
                  <td className="right">{inr(o.total)}</td>
                  <td className="right green">{inr(o.paid)}</td>
                  <td className={`right ${o.due > 0 ? 'red' : ''}`}>{o.due > 0 ? inr(o.due) : '✓'}</td>
                  <td className="right row-actions">
                    <button className="btn btn-sm" onClick={() => setBillView(o)} title={t('ord_view')}>
                      <IconEye size={16} />
                    </button>
                    {o.due > 0 && (
                      <button className="btn btn-sm btn-primary" onClick={() => openPay(o)} title={t('ord_pay')}>
                        <IconCash size={16} />
                      </button>
                    )}
                    {o.status === 'open' && can('orders:create') && (
                      <button className="btn btn-sm" onClick={() => closeBill(o)} title={t('ord_close')}>
                        <IconLock size={16} />
                      </button>
                    )}
                    {can('orders:edit') && (
                      <button className="btn btn-sm" onClick={() => openEdit(o)} title={t('common_edit')}>
                        <IconPencil size={16} />
                      </button>
                    )}
                    {can('orders:delete') && (
                      <button className="btn btn-sm btn-danger" onClick={() => removeOrder(o)} title={t('common_delete')}>
                        <IconTrash size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      {selected.size > 0 && can('orders:delete') && (
        <div className="bulk-toolbar">
          <span>{t('ord_bulk_selected', { n: selected.size })}</span>
          <button className="btn btn-danger" onClick={bulkDelete}>
            {t('ord_bulk_delete')} ({selected.size})
          </button>
          <button className="btn" onClick={clearSelection}>{t('common_cancel')}</button>
        </div>
      )}
      </div>

      {billView && <Bill order={billView} onClose={() => setBillView(null)} />}

      {payFor && (
        <Modal
          title={`${t('pay_title')} — ${t('pos_bill_no', { n: payFor.number })} (${t('ord_due')} ${inr(payFor.due)})`}
          onClose={() => setPayFor(null)}
          footer={
            <>
              <button className="btn" onClick={() => setPayFor(null)}>
                {t('common_cancel')}
              </button>
              <button className="btn btn-primary" onClick={submitPayment}>
                {t('common_save')}
              </button>
            </>
          }
        >
          <label className="field-label">{t('pay_method')}</label>
          <div className="method-chips">
            {['cash', 'upi', 'card', 'other'].map((k) => (
              <button
                key={k}
                className={`method-chip ${payMethod === k ? 'active' : ''}`}
                onClick={() => setPayMethod(k)}
              >
                {t(`method_${k}`)}
              </button>
            ))}
          </div>
          <label className="field-label">{t('pay_col_amount')}</label>
          <input type="number" min="0" max={payFor.due} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} autoFocus />
        </Modal>
      )}

      {editing && (
        <Modal
          title={t('edit_title', { n: editing.number })}
          onClose={() => setEditing(null)}
          width={640}
          footer={
            <>
              <button className="btn" onClick={() => setEditing(null)}>
                {t('common_cancel')}
              </button>
              <button className="btn btn-primary" onClick={saveEdit}>
                {t('common_save')}
              </button>
            </>
          }
        >
          <div className="form-grid">
            <div>
              <label className="field-label">{t('edit_cust')}</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <label className="field-label">{t('edit_phone')}</label>
              <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} maxLength={15} />
            </div>
          </div>

          <label className="field-label">{t('col_items')}</label>
          <div className="edit-rows">              {editItems.map((it, i) => (
                <div className="edit-row" key={`${it.itemId}:${it.portion}:${i}`}>
                  <span>
                    {dish(it)}
                    {it.portion !== 'single' && <em className="portion-tag">{t(`portion_${it.portion}`)}</em>}
                  </span>
                <div className="qty-stepper">
                  <button onClick={() => setEditItems((rows) => rows.map((r, j) => (j === i ? { ...r, qty: Math.max(1, r.qty - 1) } : r)))}>−</button>
                  <span>{it.qty}</span>
                  <button onClick={() => setEditItems((rows) => rows.map((r, j) => (j === i ? { ...r, qty: r.qty + 1 } : r)))}>+</button>
                </div>
                <b>{inr(it.price * it.qty)}</b>
                <button className="cart-del" onClick={() => setEditItems((rows) => rows.filter((_, j) => j !== i))}>
                  <IconX size={15} />
                </button>
              </div>
            ))}
          </div>

          <select className="add-select" value="" onChange={(e) => addEditItem(e.target.value)}>
            <option value="">{t('edit_add_item')}</option>
            {menuItems.map((m) =>
              m.portions ? (
                <optgroup key={m.id} label={dish(m)}>
                  <option value={`${m.id}|half`}>
                    {dish(m)} — {t('portion_half')} {inr(m.halfPrice)}
                  </option>
                  <option value={`${m.id}|full`}>
                    {dish(m)} — {t('portion_full')} {inr(m.fullPrice)}
                  </option>
                </optgroup>
              ) : (
                <option key={m.id} value={`${m.id}|single`}>
                  {dish(m)} — {inr(m.price)}
                </option>
              )
            )}
          </select>

          <div className="form-grid" style={{ marginTop: 12 }}>
            <div>
              <label className="field-label">{t('pos_discount')}</label>
              <input type="number" min="0" value={editDiscount} onChange={(e) => setEditDiscount(e.target.value)} />
            </div>
            <div>
              <label className="field-label">{t('edit_new_total')}</label>
              <div className="readonly-total">
                {inr(
                  Math.max(
                    0,
                    editItems.reduce((s, r) => s + r.price * r.qty, 0) - (Number(editDiscount) || 0)
                  )
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
