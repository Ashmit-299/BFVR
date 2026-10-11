import { useEffect, useState } from 'react';
import { get, post, put } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import Modal from '../components/Modal.jsx';
import { IconPencil } from '../components/Icons.jsx';

export default function Users() {
  const { user: me, can } = useAuth();
  const { t } = useLang();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(null); // null | 'new' | user
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'manager' });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const data = await get('/api/users');
      setUsers(data.users);
    } catch (err) {
      if (err.status !== 0) toast.push(t('u_load_err', { err: err.message }), 'error');
    }
  };

  useEffect(() => {
    if (can('users:manage')) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!can('users:manage')) {
    return <div className="info-banner">{t('users_no_perm')}</div>;
  }

  const allowedRoles = me.role === 'superadmin' ? ['admin', 'manager'] : ['manager'];

  const openNew = () => {
    setForm({ name: '', username: '', password: '', role: 'manager' });
    setModal('new');
  };

  const openEdit = (u) => {
    setForm({ name: u.name, username: u.username, password: '', role: u.role, active: u.active });
    setModal(u);
  };

  const save = async () => {
    if (!form.name.trim() || !form.username.trim()) {
      toast.push(t('u_req'), 'error');
      return;
    }
    setBusy(true);
    try {
      if (modal === 'new') {
        await post('/api/users', form, { label: `${t('users_add')}: ${form.username}` });
        toast.push(t('u_created'), 'success');
      } else {
        const body = { name: form.name, role: form.role, active: form.active };
        if (form.password) body.password = form.password;
        await put(`/api/users/${modal.id}`, body, { label: form.username });
        toast.push(t('u_updated'), 'success');
      }
      setModal(null);
      load();
    } catch (err) {
      toast.push(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (u) => {
    try {
      await put(`/api/users/${u.id}`, { active: !u.active }, { label: u.username });
      load();
    } catch (err) {
      toast.push(err.message, 'error');
    }
  };

  return (
    <div>
      <div className="page-head">
        <h2>{t('users_title')}</h2>
        <button className="btn btn-primary" onClick={openNew}>
          {t('users_add')}
        </button>
      </div>

      <div className="table-card">
        <table className="table">
          <thead>
            <tr>
              <th>{t('col_name')}</th>
              <th>{t('col_username')}</th>
              <th>{t('col_role')}</th>
              <th>{t('col_status')}</th>
              <th>{t('col_last_login')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={u.active ? '' : 'row-off'}>
                <td>
                  <b>{u.name}</b>
                  {u.id === me.id && <span className="badge badge-you">{t('you_badge')}</span>}
                </td>
                <td>{u.username}</td>
                <td>
                  <span className={`badge badge-role-${u.role}`}>{t(`role_${u.role}`)}</span>
                </td>
                <td>{u.active ? <span className="green">{t('st_active')}</span> : <span className="red">{t('st_inactive')}</span>}</td>
                <td className="muted">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('en-IN') : '—'}</td>
                <td className="right row-actions">
                  {u.role !== 'superadmin' && (
                    <>
                      <button className="btn btn-sm" onClick={() => openEdit(u)}>
                        <IconPencil size={16} />
                      </button>
                      {u.id !== me.id && (
                        <button className="btn btn-sm" onClick={() => toggleActive(u)}>
                          {u.active ? t('btn_deactivate') : t('btn_activate')}
                        </button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal
          title={modal === 'new' ? t('users_new_title') : t('users_edit_title', { u: modal.username })}
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
          <label className="field-label">{t('u_name')}</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />

          <label className="field-label">{t('u_username')}</label>
          <input value={form.username} disabled={modal !== 'new'} onChange={(e) => setForm({ ...form, username: e.target.value })} />

          <label className="field-label">{modal === 'new' ? t('u_pw_new') : t('u_pw_reset')}</label>
          <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />

          <label className="field-label">{t('u_role')}</label>
          <div className="method-chips">
            {allowedRoles.map((r) => (
              <button
                key={r}
                className={`method-chip ${form.role === r ? 'active' : ''}`}
                onClick={() => setForm({ ...form, role: r })}
              >
                {t(`role_${r}`)}
              </button>
            ))}
          </div>

          {modal !== 'new' && (
            <>
              <label className="field-label">{t('col_status')}</label>
              <div className="method-chips">
                <button
                  className={`method-chip ${form.active ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, active: true })}
                >
                  {t('st_active')}
                </button>
                <button
                  className={`method-chip ${!form.active ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, active: false })}
                >
                  {t('st_inactive')}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
