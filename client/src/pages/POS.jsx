import { useEffect, useMemo, useRef, useState } from 'react';
import { get, post } from '../lib/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import Bill from '../components/Bill.jsx';
import Modal from '../components/Modal.jsx';
import { inr } from '../lib/format.js';
import { IconX, IconCash, IconQr, IconCard, IconReceipt } from '../components/Icons.jsx';
import WelcomeBanner from '../components/WelcomeBanner.jsx';

const METHOD_ICONS = { cash: IconCash, upi: IconQr, card: IconCard, other: IconReceipt };

const MENU_CACHE = 'bfvr_menu_cache';
const CART_STORE = 'bfvr_table_carts'; // { [billKey]: { cart, customer, phone, discount, meta } }

const loadStore = () => {
  try {
    return JSON.parse(localStorage.getItem(CART_STORE)) || {};
  } catch {
    return {};
  }
};

const emptyBill = () => ({ cart: [], customer: '', phone: '', discount: '', meta: {} });

export default function POS() {
  const toast = useToast();
  const { t } = useLang();

  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(MENU_CACHE)) || [];
    } catch {
      return [];
    }
  });
  const [categories, setCategories] = useState([]);
  const [cat, setCat] = useState('सभी');
  const [q, setQ] = useState('');
  const [tablesData, setTablesData] = useState({ count: 6, tables: [] });
  const [activeKey, setActiveKey] = useState('0'); // '0' = direct bill, '1'..'10' = tables

  // working state for the active bill
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState('');
  const [phone, setPhone] = useState('');
  const [discount, setDiscount] = useState('');
  const [meta, setMeta] = useState({}); // { orderClientId, orderId, orderNumber }

  const [payOpen, setPayOpen] = useState(false);
  const [method, setMethod] = useState('cash');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [savedBill, setSavedBill] = useState(null);
  const storeRef = useRef(loadStore());
  const dirtyRef = useRef(false);
  const switchingRef = useRef(false);
  const tablesSeq = useRef(0);
  const menuSeq = useRef(0);

  // ---------- data loading ----------
  const loadMenu = async () => {
    const seq = ++menuSeq.current;
    try {
      const data = await get('/api/menu');
      if (seq !== menuSeq.current) return; // stale response — a newer load is in flight
      setItems(data.items);
      setCategories(data.categories || []);
      localStorage.setItem(MENU_CACHE, JSON.stringify(data.items));
    } catch (err) {
      if (err.status !== 0) toast.push(t('pos_load_err', { err: err.message }), 'error');
    }
  };

  const loadTables = async () => {
    const seq = ++tablesSeq.current;
    try {
      const data = await get('/api/orders/tables');
      if (seq !== tablesSeq.current) return; // ignore out-of-order responses
      setTablesData({ count: data.count, tables: data.tables });
    } catch {
      /* offline — strip shows last known state */
    }
  };

  useEffect(() => {
    loadMenu();
    loadTables();
    get('/api/settings').catch(() => {});
    const onRefresh = () => {
      loadMenu();
      loadTables();
    };
    window.addEventListener('bfvr:refresh', onRefresh);
    return () => window.removeEventListener('bfvr:refresh', onRefresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- persistence of the working bill (device-local, survives refresh) ----------
  useEffect(() => {
    if (switchingRef.current) return;
    storeRef.current[activeKey] = { cart, customer, phone, discount, meta };
    localStorage.setItem(CART_STORE, JSON.stringify(storeRef.current));
  }, [activeKey, cart, customer, phone, discount, meta]);

  const markDirty = () => {
    dirtyRef.current = true;
  };

  const hydrate = (key) => {
    const saved = storeRef.current[key];
    if (saved && saved.cart) {
      setCart(saved.cart);
      setCustomer(saved.customer || '');
      setPhone(saved.phone || '');
      setDiscount(saved.discount || '');
      setMeta(saved.meta || {});
      return;
    }
    // fall back to the server's open order for this table
    const tableNo = key === '0' ? null : Number(key);
    const serverOrder =
      tableNo != null ? tablesData.tables.find((x) => x.table === tableNo)?.order : null;
    if (serverOrder) {
      setCart(
        serverOrder.items.map((it) => ({
          key: `${it.item}:${it.portion}`,
          itemId: it.item,
          name: it.name,
          portion: it.portion,
          price: it.price,
          qty: it.qty,
        }))
      );
      setCustomer(serverOrder.customerName || '');
      setPhone(serverOrder.customerPhone || '');
      setDiscount(String(serverOrder.discount || ''));
      setMeta({
        orderClientId: serverOrder.clientId,
        orderId: serverOrder.id,
        orderNumber: serverOrder.number,
        paid: serverOrder.paid,
      });
      return;
    }
    setCart([]);
    setCustomer('');
    setPhone('');
    setDiscount('');
    setMeta({});
  };

  const selectTable = async (key) => {
    if (key === activeKey) return;
    // auto-save the bill we are leaving so tables stay accurate
    if (dirtyRef.current && cart.length > 0) {
      await doSave({ silent: true });
    }
    switchingRef.current = true;
    hydrate(key);
    setActiveKey(key);
    dirtyRef.current = false;
    requestAnimationFrame(() => {
      switchingRef.current = false;
    });
  };

  // ---------- cart ops ----------
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter(
      (i) => (cat === 'सभी' || i.category === cat) && (!needle || i.name.toLowerCase().includes(needle))
    );
  }, [items, cat, q]);

  const subtotal = cart.reduce((s, r) => s + r.price * r.qty, 0);
  const discValue = Math.max(0, Math.min(Number(discount) || 0, subtotal));
  const total = subtotal - discValue;

  const add = (item, portion) => {
    const price = portion === 'half' ? item.halfPrice : portion === 'full' ? item.fullPrice : item.price;
    if (price == null) return;
    const key = `${item.id}:${portion}`;
    setCart((c) => {
      const ix = c.findIndex((x) => x.key === key);
      if (ix >= 0) {
        const next = [...c];
        next[ix] = { ...next[ix], qty: next[ix].qty + 1 };
        return next;
      }
      return [...c, { key, itemId: item.id, name: item.name, portion, price, qty: 1 }];
    });
    markDirty();
  };

  const setQty = (key, delta) => {
    setCart((c) =>
      c.flatMap((r) => (r.key === key ? (r.qty + delta <= 0 ? [] : [{ ...r, qty: r.qty + delta }]) : [r]))
    );
    markDirty();
  };

  const removeRow = (key) => {
    setCart((c) => c.filter((r) => r.key !== key));
    markDirty();
  };

  const clearActive = () => {
    setCart([]);
    setCustomer('');
    setPhone('');
    setDiscount('');
    setMeta({});
    dirtyRef.current = false;
    delete storeRef.current[activeKey];
    localStorage.setItem(CART_STORE, JSON.stringify(storeRef.current));
  };

  // ---------- save / close ----------
  const doSave = async ({ silent = false } = {}) => {
    if (cart.length === 0) {
      if (!silent) toast.push(t('pos_no_items'), 'error');
      return null;
    }
    const clientId = meta.orderClientId || crypto.randomUUID();
    try {
      const res = await post(
        '/api/orders/upsert',
        {
          clientId,
          table: activeKey === '0' ? null : Number(activeKey),
          customerName: customer,
          customerPhone: phone,
          items: cart.map(({ itemId, portion, qty }) => ({ itemId, portion, qty })),
          discount: discValue,
        },
        { label: t('pos_save') }
      );
      if (res.queued) {
        if (!silent) toast.push(t('pos_offline_saved'), 'success');
        setMeta((m) => ({ ...m, orderClientId: clientId }));
        return { queued: true, clientId };
      }
      const order = res.order;
      const finalClientId = order.clientId || clientId;
      const savedMeta = {
        orderClientId: finalClientId,
        orderId: order.id,
        orderNumber: order.number,
        paid: order.paid,
      };
      setMeta(savedMeta);
      storeRef.current[activeKey] = { cart, customer, phone, discount, meta: savedMeta };
      localStorage.setItem(CART_STORE, JSON.stringify(storeRef.current));
      dirtyRef.current = false;
      if (!silent) toast.push(t('pos_saved'), 'success');
      loadTables();
      return { order, clientId: finalClientId };
    } catch (err) {
      if (!silent) toast.push(err.message, 'error');
      return null;
    }
  };

  const openPayment = () => {
    if (cart.length === 0) {
      toast.push(t('pos_no_items'), 'error');
      return;
    }
    const alreadyPaid = meta.paid || 0;
    setAmount(String(Math.max(0, total - alreadyPaid)));
    setMethod('cash');
    setPayOpen(true);
  };

  const doClose = async ({ withPayment }) => {
    setBusy(true);
    try {
      const saved = await doSave({ silent: true });
      if (!saved) return; // empty cart or hard error (toast already shown for non-silent)
      let finalOrder = saved.order || null;
      const refClientId = saved.clientId || meta.orderClientId;
      const orderRef = {
        id: finalOrder?.id || meta.orderId || undefined,
        orderClientId: refClientId,
      };

      if (withPayment) {
        const value = Number(amount) || 0;
        if (value > 0) {
          try {
            const pres = await post(
              '/api/orders/payments',
              { clientId: crypto.randomUUID(), orderClientId: refClientId, method, amount: value },
              { label: t('pay_title') }
            );
            if (pres.queued) toast.push(t('pos_pay_offline'), 'success');
            else finalOrder = pres.order;
          } catch (err) {
            toast.push(err.message, 'error');
            return; // keep the bill open so the amount can be corrected
          }
        }
      }

      try {
        const cres = await post('/api/orders/close', orderRef, { label: t('ord_close') });
        if (cres.queued) toast.push(t('pos_close_offline'), 'success');
        else finalOrder = cres.order || finalOrder;
      } catch (err) {
        toast.push(err.message, 'error');
        return;
      }

      clearActive();
      setPayOpen(false);
      await loadTables(); // fresh table state before the bill modal opens
      if (finalOrder && !saved.queued) {
        setSavedBill(finalOrder);
      }
      toast.push(t('pos_closed'), 'success');
    } finally {
      setBusy(false);
    }
  };

  const cats = ['सभी', ...new Set([...(categories || []), ...items.map((i) => i.category)])];
  const activeTable = activeKey === '0' ? null : Number(activeKey);
  const serverOpen = activeTable != null
    ? tablesData.tables.find((x) => x.table === activeTable)?.order
    : null;

  return (
    <div>
      <WelcomeBanner />
      <div className="pos">
      <section className="pos-menu">
        {/* table selector */}
        <div className="table-strip">
          <button
            className={`table-tab direct ${activeKey === '0' ? 'active' : ''}`}
            onClick={() => selectTable('0')}
          >
            <b>{t('pos_direct')}</b>
            <span>{t('pos_direct_hint')}</span>
          </button>
          {tablesData.tables.map(({ table, order }) => (
            <button
              key={table}
              className={`table-tab ${order ? 'busy' : 'free'} ${activeKey === String(table) ? 'active' : ''}`}
              onClick={() => selectTable(String(table))}
            >
              <b>T{table}</b>
              <span>
                {order
                  ? `${t('pos_bill_no', { n: order.number })} · ${inr(order.total)}`
                  : t('pos_free')}
              </span>
            </button>
          ))}
        </div>

        <div className="pos-toolbar">
          <input
            className="search"
            placeholder={t('common_search')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="cat-chips">
            {cats.map((c) => (
              <button
                key={c}
                className={`cat-chip ${cat === c ? 'active' : ''}`}
                onClick={() => setCat(c)}
              >
                {c === 'सभी' ? t('common_all') : c}
              </button>
            ))}
          </div>
        </div>

        <div className="dish-grid">
          {visible.map((item) => (
            <div key={item.id} className={`dish-card ${item.available === false ? 'off' : ''}`}>
              <div className="dish-name">{item.name}</div>
              <div className="dish-prices">
                {item.portions ? (
                  <>
                    <button
                      className="price-chip half"
                      disabled={item.available === false}
                      onClick={() => add(item, 'half')}
                    >
                      {t('portion_half')} {inr(item.halfPrice)}
                    </button>
                    <button
                      className="price-chip full"
                      disabled={item.available === false}
                      onClick={() => add(item, 'full')}
                    >
                      {t('portion_full')} {inr(item.fullPrice)}
                    </button>
                  </>
                ) : (
                  <button
                    className="price-chip single"
                    disabled={item.available === false}
                    onClick={() => add(item, 'single')}
                  >
                    {inr(item.price)}
                  </button>
                )}
              </div>
            </div>
          ))}
          {visible.length === 0 && (
            <div className="empty-state">
              {t('pos_empty')}
              {items.length === 0 ? t('pos_offline_hint') : ''}
            </div>
          )}
        </div>
      </section>

      <aside className="cart-panel" id="cart-panel">
        <div className="cart-head">
          <b>
            {activeTable != null ? t('pos_table', { n: activeTable }) : t('pos_direct')}
            {meta.orderNumber && <em className="cart-billno">{t('pos_bill_no', { n: meta.orderNumber })}</em>}
          </b>
          {cart.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={clearActive}>
              {t('pos_clear')}
            </button>
          )}
        </div>

        <div className="cart-customer">
          <input
            placeholder={t('pos_customer_ph')}
            value={customer}
            onChange={(e) => {
              setCustomer(e.target.value);
              markDirty();
            }}
          />
          <input
            placeholder={t('pos_phone_ph')}
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              markDirty();
            }}
            maxLength={15}
          />
        </div>

        <div className="cart-rows">
          {cart.length === 0 && (
            <div className="empty-state">
              {activeTable != null && serverOpen ? t('pos_bill_no', { n: serverOpen.number }) : t('pos_pick_items')}
            </div>
          )}
          {cart.map((r) => (
            <div className="cart-row" key={r.key}>
              <div className="cart-row-main">
                <span className="cart-item-name">
                  {r.name}
                  {r.portion !== 'single' && <em className="portion-tag">{t(`portion_${r.portion}`)}</em>}
                </span>
                <button className="cart-del" onClick={() => removeRow(r.key)} title={t('common_delete')}>
                  <IconX size={15} />
                </button>
              </div>
              <div className="cart-row-sub">
                <div className="qty-stepper">
                  <button onClick={() => setQty(r.key, -1)}>−</button>
                  <span>{r.qty}</span>
                  <button onClick={() => setQty(r.key, 1)}>+</button>
                </div>
                <span className="cart-rate">{inr(r.price)}</span>
                <span className="cart-line">{inr(r.price * r.qty)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="cart-totals">
          <div>
            <span>{t('pos_subtotal')}</span>
            <span>{inr(subtotal)}</span>
          </div>
          <div className="discount-row">
            <span>{t('pos_discount')}</span>
            <input
              type="number"
              min="0"
              value={discount}
              onChange={(e) => {
                setDiscount(e.target.value);
                markDirty();
              }}
              placeholder="0"
            />
          </div>
          <div className="grand">
            <span>{t('pos_total')}</span>
            <span>{inr(total)}</span>
          </div>
        </div>

        <div className="cart-actions">
          <button className="btn btn-outline" disabled={busy} onClick={() => doSave()}>
            {t('pos_save')}
          </button>
          <button className="btn btn-primary" disabled={busy} onClick={openPayment}>
            {t('pos_pay_close')}
          </button>
          <div className="cart-hint">{t('pos_save_hint')}</div>
        </div>
      </aside>

      {/* mobile quick bar */}
      {cart.length > 0 && (
        <div className="mobile-cartbar">
          <span>
            {cart.reduce((s, r) => s + r.qty, 0)} × {inr(total)}
          </span>
          <button className="btn btn-sm" onClick={() => doSave()}>
            {t('pos_save')}
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => document.getElementById('cart-panel')?.scrollIntoView({ behavior: 'smooth' })}
          >
            {t('pos_total')}: {inr(total)}
          </button>
        </div>
      )}
      </div>

      {payOpen && (
        <Modal
          title={t('pay_title')}
          onClose={() => setPayOpen(false)}
          footer={
            <>
              <button className="btn" onClick={() => setPayOpen(false)} disabled={busy}>
                {t('common_cancel')}
              </button>
              <button className="btn" disabled={busy} onClick={() => doClose({ withPayment: false })}>
                {t('pay_close_only')}
              </button>
              <button className="btn btn-primary" disabled={busy} onClick={() => doClose({ withPayment: true })}>
                {t('pay_confirm')}
              </button>
            </>
          }
        >
          <div className="pay-total">
            {t('pay_total_label')}: <b>{inr(total)}</b>
          </div>
          <label className="field-label">{t('pay_method')}</label>
          <div className="method-chips">
            {['cash', 'upi', 'card', 'other'].map((k) => {
              const MethodIcon = METHOD_ICONS[k];
              return (
                <button
                  key={k}
                  className={`method-chip ${method === k ? 'active' : ''}`}
                  onClick={() => setMethod(k)}
                >
                  <MethodIcon size={16} /> {t(`method_${k}`)}
                </button>
              );
            })}
          </div>
          <label className="field-label">{t('pay_amount')}</label>
          <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
          {Number(amount) < total && Number(amount) >= 0 && (
            <div className="pay-due-note">{t('pay_due_note', { amt: inr(total - Number(amount)) })}</div>
          )}
          {Number(amount) > total && <div className="pay-change-note">{t('pay_change', { amt: inr(Number(amount) - total) })}</div>}
        </Modal>
      )}

      {savedBill && <Bill order={savedBill} onClose={() => setSavedBill(null)} />}
    </div>
  );
}
