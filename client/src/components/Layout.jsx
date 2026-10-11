import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import { flushQueue, getQueue, get } from '../lib/api.js';
import {
  IconReceipt,
  IconList,
  IconChart,
  IconWallet,
  IconBook,
  IconUsers,
  IconBuilding,
  IconSliders,
  IconMenu,
  IconPower,
  IconSync,
  IconChevron,
  IconRestaurant,
} from './Icons.jsx';

const NAV = [
  { to: '/pos', Icon: IconReceipt, key: 'nav_pos', perm: 'orders:create' },
  { to: '/orders', Icon: IconList, key: 'nav_orders', perm: 'orders:view' },
  { to: '/analytics', Icon: IconChart, key: 'nav_analytics', perm: 'analytics:view' },
  { to: '/expenses', Icon: IconWallet, key: 'nav_expenses', perm: 'expenses:view' },
  { to: '/menu', Icon: IconBook, key: 'nav_menu', perm: 'menu:view' },
  { to: '/users', Icon: IconUsers, key: 'nav_users', perm: 'users:manage' },
  // superadmin only — see how the admins/managers they created are using the system
  { to: '/overview', Icon: IconBuilding, key: 'nav_overview', perm: 'users:manage', role: 'superadmin' },
  { to: '/settings', Icon: IconSliders, key: 'nav_settings', perm: null },
];

export default function Layout() {
  const { user, logout, can } = useAuth();
  const { t, lang, setLang } = useLang();
  const toast = useToast();
  const navigate = useNavigate();
  const [online, setOnline] = useState(navigator.onLine);
  const [queueLen, setQueueLen] = useState(getQueue().length);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settings, setSettings] = useState(null);

  const loadSettings = useCallback(() => {
    get('/api/settings')
      .then((d) => setSettings(d.settings))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadSettings();
    window.addEventListener('bfvr:settings', loadSettings);
    window.addEventListener('bfvr:refresh', loadSettings);
    return () => {
      window.removeEventListener('bfvr:settings', loadSettings);
      window.removeEventListener('bfvr:refresh', loadSettings);
    };
  }, [loadSettings]);

  useEffect(() => {
    let retryTimer = null;
    const onQueue = (e) => {
      setQueueLen(e.detail.length);
      // transient network errors also land here (no "online" event fires) — retry soon
      if (e.detail.length > 0) {
        clearTimeout(retryTimer);
        retryTimer = setTimeout(async () => {
          const r = await flushQueue();
          if (r && r.synced > 0) window.dispatchEvent(new CustomEvent('bfvr:refresh'));
        }, 4000);
      } else {
        clearTimeout(retryTimer);
      }
    };
    const onOnline = async () => {
      setOnline(true);
      const r = await flushQueue();
      if (r && r.synced > 0) {
        toast.push(t('sync_done', { n: r.synced }), 'success');
        window.dispatchEvent(new CustomEvent('bfvr:refresh'));
      }
      if (r && r.failed.length) toast.push(t('sync_failed', { err: r.failed[0].error }), 'error');
    };
    const onOffline = () => setOnline(false);
    window.addEventListener('bfvr:queue', onQueue);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    flushQueue().then((r) => {
      if (r && r.synced > 0) window.dispatchEvent(new CustomEvent('bfvr:refresh'));
    });
    return () => {
      clearTimeout(retryTimer);
      window.removeEventListener('bfvr:queue', onQueue);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [toast, t]);

  const items = NAV.filter(
    (n) => (!n.perm || can(n.perm)) && (!n.role || user.role === n.role)
  );

  const restaurant = settings?.restaurant;
  const brandName =
    lang === 'hi' ? restaurant?.name || t('brand_name') : restaurant?.nameEn || t('brand_name');
  const brandTag = restaurant?.tagline || t('brand_sub');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeMenu = () => setMenuOpen(false);

  const goProfile = () => {
    closeMenu();
    navigate('/settings');
  };

  const navLinks = () =>
    items.map(({ to, Icon, key }) => (
      <NavLink
        key={to}
        to={to}
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        onClick={closeMenu}
      >
        <span className="nav-icon">
          <Icon size={17} />
        </span>
        <span>{t(key)}</span>
      </NavLink>
    ));

  const profile = (variant) => (
    <button
      type="button"
      className={`profile-chip ${variant || ''}`}
      onClick={goProfile}
      title={t('profile_hint', { name: brandName })}
    >
      <span className="avatar">{user.name.charAt(0).toUpperCase()}</span>
      <span className="profile-text">
        <b>{user.name}</b>
        <em>
          {brandName} · {t(`role_${user.role}`)}
        </em>
      </span>
      <IconChevron size={16} className="profile-caret" />
    </button>
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-row">
          <button className="hamburger" onClick={() => setMenuOpen((v) => !v)} aria-label="menu">
            <IconMenu size={20} />
          </button>

          <div className="brand">
            <div className="brand-logo">
              <IconRestaurant size={20} />
            </div>
            <div className="brand-text">
              <div className="brand-name">{brandName}</div>
              <div className="brand-sub">{brandTag}</div>
            </div>
          </div>

          <div className="topbar-spacer" />

          <button
            className="lang-btn"
            onClick={() => setLang(lang === 'hi' ? 'en' : 'hi')}
            title="हिंदी / English"
          >
            {lang === 'hi' ? 'EN' : 'हिं'}
          </button>

          <div className={`conn-pill ${online ? 'on' : 'off'}`}>
            <span className="dot" />
            {online ? t('online') : t('offline')}
          </div>

          {queueLen > 0 && (
            <div className="queue-pill" title="pending sync">
              <IconSync size={14} />
              {t('sync_pending', { n: queueLen })}
            </div>
          )}

          <div className="topbar-date">
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'short',
              day: '2-digit',
              month: 'short',
            })}
          </div>

          {profile('topbar-profile')}

          <button className="icon-btn" onClick={handleLogout} title={t('logout')}>
            <IconPower size={17} />
          </button>
        </div>

        <nav className="nav topnav">{navLinks()}</nav>
      </header>

      {menuOpen && <div className="sidebar-backdrop" onClick={closeMenu} />}

      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-logo">
            <IconRestaurant size={20} />
          </div>
          <div className="brand-text">
            <div className="brand-name">{brandName}</div>
            <div className="brand-sub">{brandTag}</div>
          </div>
        </div>

        <nav className="nav nav-drawer">{navLinks()}</nav>

        <div className="sidebar-foot">
          {profile('drawer-profile')}
          <button className="btn btn-ghost btn-sm drawer-logout" onClick={handleLogout}>
            <IconPower size={15} />
            {t('logout')}
          </button>
        </div>
      </aside>

      <div className="main">
        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
