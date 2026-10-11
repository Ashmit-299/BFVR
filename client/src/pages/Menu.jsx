import { useEffect, useMemo, useState } from 'react';
import { get, post, put, del } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import Modal from '../components/Modal.jsx';
import { inr } from '../lib/format.js';
import { IconPencil, IconTrash } from '../components/Icons.jsx';

const EMPTY_FORM = { name: '', category: '', pricing: 'portions', halfPrice: '', fullPrice: '', price: '', sortOrder: '' };

export default function Menu() {
  const { can } = useAuth();
  const { t } = useLang();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [modal, setModal] = useState(null); // null | 'new' | item
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const data = await get('/api/menu');
      setItems(data.items);
      setCategories(data.categories || []);
    } catch (err) {
      if (err.status !== 0) toast.push(t('menu_load_err', { err: err.message }), 'error');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groups = useMemo(() => {
    const byCat = new Map();
    for (const it of items) {
      if (!byCat.has(it.category)) byCat.set(it.category, []);
      byCat.get(it.category).push(it);
    }
    const catOrder = [...byCat.entries()].sort(
      (a, b) => Math.min(...a[1].map((i) => i.sortOrder ?? 0)) - Math.min(...b[1].map((i) => i.sortOrder ?? 0))
    );
    const known = categories.filter((c) => byCat.has(c));
    const rest = catOrder.filter(([c]) => !known.includes(c)).map(([c]) => c);
    const ordered = [...known, ...rest];
    return ordered
      .filter((c) => byCat.has(c))
      .map((c) => ({ category: c, rows: byCat.get(c).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)) }));
  }, [items, categories]);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setModal('new');
  };

  const openEdit = (item) => {
    setForm({
      name: item.name,
      category: item.category,
      pricing: item.portions ? 'portions' : 'single',
      halfPrice: item.halfPrice ?? '',
      fullPrice: item.fullPrice ?? item.price ?? '',
      price: item.price ?? '',
      sortOrder: item.sortOrder ?? '',
    });
    setModal(item);
  };

  const save = async () => {
    if (!form.name.trim() || !form.category.trim()) {
      toast.push(t('menu_req'), 'error');
      return;
    }
    const body = {
      name: form.name.trim(),
      category: form.category.trim(),
      sortOrder: form.sortOrder === '' ? 0 : Number(form.sortOrder),
    };
    if (form.pricing === 'portions') {
      body.halfPrice = form.halfPrice;
      body.fullPrice = form.fullPrice;
    } else {
      body.price = form.price;
    }
    setBusy(true);
    try {
      if (modal === 'new') {
        await post('/api/menu', body, { label: `${t('menu_add')}: ${body.name}` });
        toast.push(t('menu_added'), 'success');
      } else {
        await put(`/api/menu/${modal.id}`, body, { label: `${body.name}` });
        toast.push(t('menu_updated'), 'success');
      }
      setModal(null);
      load();
    } catch (err) {
      toast.push(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggleAvailable = async (item) => {
    setItems((rows) => rows.map((r) => (r.id === item.id ? { ...r, available: !item.available } : r)));
    try {
      await put(`/api/menu/${item.id}`, { available: !item.available }, { label: item.name });
    } catch (err) {
      toast.push(err.message, 'error');
      load();
    }
  };

  const remove = async (item) => {
    if (!window.confirm(t('menu_delete_confirm', { name: item.name }))) return;
    try {
      await del(`/api/menu/${item.id}`, { label: item.name });
      toast.push(t('menu_deleted'), 'success');
      load();
    } catch (err) {
      toast.push(err.message, 'error');
    }
  };

  return (
    <div>
      <div className="page-head">
        <h2>{t('menu_title', { n: items.length })}</h2>
        {can('menu:manage') && (
          <button className="btn btn-primary" onClick={openNew}>
            {t('menu_add')}
          </button>
        )}
      </div>

      {!can('menu:manage') && <div className="info-banner">{t('menu_readonly')}</div>}

      <div className="menu-groups">
        {groups.map((g) => (
          <div className="card menu-group" key={g.category}>
            <div className="menu-cat-head">{g.category}</div>
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('col_item')}</th>
                    <th className="right">{t('col_half')}</th>
                    <th className="right">{t('col_full_rate')}</th>
                    {can('menu:manage') && <th>{t('col_avail')}</th>}
                    {can('menu:manage') && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((it) => (
                    <tr key={it.id} className={it.available === false ? 'row-off' : ''}>
                      <td>{it.name}</td>
                      <td className="right">{it.portions ? inr(it.halfPrice) : '—'}</td>
                      <td className="right">
                        <b>{inr(it.fullPrice)}</b>
                      </td>
                      {can('menu:manage') && (
                        <td>
                          <label className="switch">
                            <input type="checkbox" checked={it.available !== false} onChange={() => toggleAvailable(it)} />
                            <span />
                          </label>
                        </td>
                      )}
                      {can('menu:manage') && (
                        <td className="right row-actions">
                          <button className="btn btn-sm" onClick={() => openEdit(it)}>
                            <IconPencil size={16} />
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => remove(it)}>
                            <IconTrash size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <Modal
          title={modal === 'new' ? t('menu_add_title') : t('menu_edit_title', { name: modal.name })}
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn" onClick={() => setModal(null)}>
                {t('common_cancel')}
              </button>
              <button className="btn btn-primary" disabled={busy} onClick={save}>
                {t('common_save')}
              </button>
            </>
          }
        >
          <label className="field-label">{t('menu_name')}</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />

          <label className="field-label">{t('menu_cat')}</label>
          <input
            list="cat-list"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            placeholder={t('menu_cat_ph')}
          />
          <datalist id="cat-list">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>

          <label className="field-label">{t('menu_price_mode')}</label>
          <div className="method-chips">
            <button
              className={`method-chip ${form.pricing === 'portions' ? 'active' : ''}`}
              onClick={() => setForm({ ...form, pricing: 'portions' })}
            >
              {t('menu_portions')}
            </button>
            <button
              className={`method-chip ${form.pricing === 'single' ? 'active' : ''}`}
              onClick={() => setForm({ ...form, pricing: 'single' })}
            >
              {t('menu_single')}
            </button>
          </div>

          {form.pricing === 'portions' ? (
            <div className="form-grid">
              <div>
                <label className="field-label">{t('menu_half')}</label>
                <input
                  type="number"
                  min="0"
                  value={form.halfPrice}
                  onChange={(e) => setForm({ ...form, halfPrice: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">{t('menu_full')}</label>
                <input
                  type="number"
                  min="0"
                  value={form.fullPrice}
                  onChange={(e) => setForm({ ...form, fullPrice: e.target.value })}
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="field-label">{t('menu_rate')}</label>
              <input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
          )}

          <div>
            <label className="field-label">{t('menu_sort')}</label>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
              placeholder="0"
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
