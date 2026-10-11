import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import { getApiBase, needsServerSetup } from '../lib/api.js';
import ServerSetup from '../components/ServerSetup.jsx';

export default function Register() {
  const { register } = useAuth();
  const { t, lang, setLang } = useLang();
  const navigate = useNavigate();
  const [form, setForm] = useState({ businessName: '', name: '', username: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (needsServerSetup() && !getApiBase()) {
      setError(t('srv_required'));
      return;
    }
    if (!form.businessName.trim() || !form.name.trim() || !form.username.trim() || !form.password) {
      setError(t('reg_all_required'));
      return;
    }
    if (form.password.length < 6) {
      setError(t('reg_short_password'));
      return;
    }
    setBusy(true);
    try {
      await register({
        businessName: form.businessName.trim(),
        name: form.name.trim(),
        username: form.username.trim(),
        password: form.password,
      });
      navigate('/pos', { replace: true });
    } catch (err) {
      setError(err.message || t('reg_failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <button
          className="lang-btn login-lang"
          onClick={() => setLang(lang === 'hi' ? 'en' : 'hi')}
          title="हिंदी / English"
        >
          {lang === 'hi' ? 'EN' : 'हिं'}
        </button>
        <div className="login-logo">VS</div>
        <h1>{t('reg_title')}</h1>
        <p className="login-tag">{t('reg_sub')}</p>

        <ServerSetup />

        <form onSubmit={submit}>
          <label>{t('reg_biz_name')}</label>
          <input
            value={form.businessName}
            onChange={set('businessName')}
            placeholder={t('reg_biz_name_ph')}
            autoFocus
            autoComplete="organization"
          />
          <label>{t('reg_owner_name')}</label>
          <input
            value={form.name}
            onChange={set('name')}
            placeholder={t('reg_owner_name_ph')}
            autoComplete="name"
          />
          <label>{t('login_username')}</label>
          <input
            value={form.username}
            onChange={set('username')}
            placeholder={t('reg_username_ph')}
            autoComplete="username"
          />
          <label>{t('login_password')}</label>
          <input
            type="password"
            value={form.password}
            onChange={set('password')}
            placeholder="••••••••"
            autoComplete="new-password"
          />
          {error && <div className="form-error">{error}</div>}
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? t('reg_working') : t('reg_btn')}
          </button>
        </form>

        <div className="login-hint">
          <span>{t('reg_fresh_note')}</span>
          <Link to="/login" className="reg-login-link">
            {t('reg_have_account')}
          </Link>
        </div>
      </div>
    </div>
  );
}
