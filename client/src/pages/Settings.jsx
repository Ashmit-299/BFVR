import { useEffect, useState } from 'react';
import { get, put, post } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useLang } from '../context/LangContext.jsx';

const FIELDS = [
  { key: 'name', labelKey: 'set_name' },
  { key: 'nameEn', labelKey: 'set_name_en' },
  { key: 'tagline', labelKey: 'set_tagline' },
  { key: 'address', labelKey: 'set_address' },
  { key: 'phone', labelKey: 'set_phone' },
  { key: 'upiId', labelKey: 'set_upi' },
  { key: 'gstin', labelKey: 'set_gstin' },
];

export default function Settings() {
  const { user, can } = useAuth();
  const { t } = useLang();
  const toast = useToast();
  const [settings, setSettings] = useState(null);
  const [float, setFloat] = useState('');
  const [tableCount, setTableCount] = useState(6);
  const [busy, setBusy] = useState(false);
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');

  useEffect(() => {
    get('/api/settings')
      .then((d) => {
        setSettings(d.settings);
        setFloat(String(d.settings.openingFloat));
        setTableCount(d.settings.tableCount || 6);
      })
      .catch((err) => toast.push(t('set_load_err', { err: err.message }), 'error'));
  }, [toast, t]);

  const saveSettings = async () => {
    setBusy(true);
    try {
      const res = await put(
        '/api/settings',
        { restaurant: settings.restaurant, openingFloat: Number(float), tableCount: Number(tableCount) },
        { label: t('set_title') }
      );
      setSettings(res.settings);
      setFloat(String(res.settings.openingFloat));
      setTableCount(res.settings.tableCount || 6);
      window.dispatchEvent(new CustomEvent('bfvr:settings'));
      toast.push(t('set_saved'), 'success');
    } catch (err) {
      toast.push(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    try {
      await post('/api/auth/change-password', { oldPassword: oldPw, newPassword: newPw });
      toast.push(t('pw_changed'), 'success');
      setOldPw('');
      setNewPw('');
    } catch (err) {
      toast.push(err.message, 'error');
    }
  };

  if (!settings) return <div className="card empty-state">{t('common_loading')}</div>;

  const editable = can('settings:manage');

  return (
    <div>
      <div className="page-head">
        <h2>{t('set_title')}</h2>
      </div>

      <div className="settings-grid">
        <div className="card">
          <div className="chart-head">
            <h3>{t('set_restaurant')}</h3>
            {!editable && <span className="muted small">{t('set_admin_only')}</span>}
          </div>
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="field-label">{t(f.labelKey)}</label>
              <input
                value={settings.restaurant[f.key] || ''}
                disabled={!editable}
                onChange={(e) => setSettings({ ...settings, restaurant: { ...settings.restaurant, [f.key]: e.target.value } })}
              />
            </div>
          ))}
          <div>
            <label className="field-label">{t('set_tables')}</label>
            <input
              type="number"
              min="1"
              max="10"
              value={tableCount}
              disabled={!editable}
              onChange={(e) => setTableCount(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">{t('set_starting_cash')}</label>
            <input
              type="number"
              min="0"
              value={float}
              disabled={!editable}
              onChange={(e) => setFloat(e.target.value)}
            />
            <div className="muted small">{t('set_starting_hint')}</div>
          </div>
          {editable && (
            <button className="btn btn-primary" disabled={busy} onClick={saveSettings}>
              {busy ? '…' : t('set_save')}
            </button>
          )}
        </div>

        <div className="card">
          {user.role !== 'superadmin' && (
            <>
              <div className="chart-head">
                <h3>{t('pw_title')}</h3>
              </div>
              <form onSubmit={changePassword}>
                <label className="field-label">{t('pw_old')}</label>
                <input type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} required />
                <label className="field-label">{t('pw_new')}</label>
                <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={6} />
                <button className="btn btn-primary btn-block">{t('pw_btn')}</button>
              </form>
            </>
          )}

          <div className="chart-head" style={{ marginTop: user.role !== 'superadmin' ? 24 : 0 }}>
            <h3>{t('acc_title')}</h3>
          </div>
          <div className="account-box">
            <div>
              <span className="muted small">{t('acc_name')}</span>
              <b>{user.name}</b>
            </div>
            <div>
              <span className="muted small">{t('acc_username')}</span>
              <b>{user.username}</b>
            </div>
            <div>
              <span className="muted small">{t('acc_role')}</span>
              <b>{t(`role_${user.role}`)}</b>
            </div>
          </div>

          <div className="chart-head" style={{ marginTop: 24 }}>
            <h3>{t('about_title')}</h3>
          </div>
          <div className="muted small">{t('about_text')}</div>
        </div>
      </div>
    </div>
  );
}
