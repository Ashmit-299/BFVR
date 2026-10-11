import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { useLang } from './context/LangContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import POS from './pages/POS.jsx';
import Orders from './pages/Orders.jsx';
import Analytics from './pages/Analytics.jsx';
import Expenses from './pages/Expenses.jsx';
import Menu from './pages/Menu.jsx';
import Users from './pages/Users.jsx';
import Overview from './pages/Overview.jsx';
import Settings from './pages/Settings.jsx';
import { IconRestaurant } from './components/Icons.jsx';

function Boot() {
  const { t } = useLang();
  return (
    <div className="boot-screen">
      <div className="boot-logo">
        <IconRestaurant size={34} />
      </div>
      <p>{t('common_loading')}</p>
    </div>
  );
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Boot />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/pos" replace />} />
        <Route path="pos" element={<POS />} />
        <Route path="orders" element={<Orders />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="menu" element={<Menu />} />
        <Route path="users" element={<Users />} />
        <Route path="overview" element={<Overview />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
