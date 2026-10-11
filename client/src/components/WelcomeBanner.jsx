import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import { get } from '../lib/api.js';

let settingsCache = null;

function greetKey(hour) {
  if (hour >= 4 && hour < 12) return 'greet_morning';
  if (hour >= 12 && hour < 17) return 'greet_afternoon';
  if (hour >= 17 && hour < 21) return 'greet_evening';
  return 'greet_night';
}

// Shown at the top of the POS right after login: greeting + user + business name.
export default function WelcomeBanner() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [settings, setSettings] = useState(settingsCache);

  useEffect(() => {
    const load = () =>
      get('/api/settings')
        .then((d) => {
          settingsCache = d.settings;
          setSettings(d.settings);
        })
        .catch(() => {});
    load();
    window.addEventListener('bfvr:settings', load);
    return () => window.removeEventListener('bfvr:settings', load);
  }, []);

  const hour = new Date().getHours();
  const greet = t(greetKey(hour));
  const r = settings?.restaurant;
  const business = lang === 'hi' ? r?.name || t('brand_name') : r?.nameEn || r?.name || t('brand_name');
  const dateStr = new Date().toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="welcome-banner">
      <div className="welcome-avatar">{user.name.charAt(0).toUpperCase()}</div>
      <div className="welcome-text">
        <h3>
          {greet}, {user.name}
        </h3>
        <div className="welcome-biz">{business}</div>
        <p className="welcome-note">{t('greet_note', { date: dateStr })}</p>
      </div>
    </div>
  );
}
