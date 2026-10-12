import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import { IconRestaurant } from '../components/Icons.jsx';

export default function Login() {
  const { login } = useAuth();
  const { t, lang, setLang } = useLang();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(username, password);
      navigate('/pos', { replace: true });
    } catch (err) {
      setError(err.status === 0 ? t('login_offline') : err.message || t('login_failed'));
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
        <div className="login-logo">
          <IconRestaurant size={34} />
        </div>
        <h1>{t('brand_name')}</h1>
        <p className="login-tag">{t('login_tag')}</p>

        <form onSubmit={submit}>
          <label>{t('login_username')}</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t('login_username_ph')}
            autoFocus
            autoComplete="username"
          />
          <label>{t('login_password')}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
          {error && <div className="form-error">{error}</div>}
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? t('login_checking') : t('login_btn')}
          </button>
        </form>
      </div>
    </div>
  );
}
