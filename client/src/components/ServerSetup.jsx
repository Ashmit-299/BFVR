import { useState } from 'react';
import { checkServer, getApiBase, setApiBase, needsServerSetup } from '../lib/api.js';
import { useLang } from '../context/LangContext.jsx';

// Server address picker — only rendered in packaged builds (APK / EXE) where the
// cloud server URL cannot be baked in at build time. The value is saved to
// localStorage so the app remembers it on every launch.
export default function ServerSetup() {
  const { t } = useLang();
  const [url, setUrl] = useState(getApiBase());
  const [state, setState] = useState(''); // '' | 'checking' | 'ok' | 'fail'

  if (!needsServerSetup()) return null;

  const onChange = (e) => {
    setUrl(e.target.value);
    setApiBase(e.target.value.trim());
    setState('');
  };

  const test = async () => {
    const v = url.trim();
    if (!/^https?:\/\//i.test(v)) {
      setState('fail');
      return;
    }
    setState('checking');
    const ok = await checkServer(v);
    setApiBase(v);
    setState(ok ? 'ok' : 'fail');
  };

  return (
    <div className="server-setup">
      <label>{t('srv_label')}</label>
      <div className="server-setup-row">
        <input
          value={url}
          onChange={onChange}
          placeholder={t('srv_ph')}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          inputMode="url"
        />
        <button
          type="button"
          className="btn btn-ghost server-setup-btn"
          onClick={test}
          disabled={state === 'checking'}
        >
          {state === 'checking' ? t('srv_checking') : t('srv_check')}
        </button>
      </div>
      <div className={`server-setup-status ${state}`}>
        {state === 'ok' && t('srv_ok')}
        {state === 'fail' && t('srv_fail')}
        {!state && t('srv_hint')}
      </div>
    </div>
  );
}
