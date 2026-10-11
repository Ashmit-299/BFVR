import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { get, post, getToken, setToken } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (getToken()) {
        try {
          const data = await get('/api/auth/me');
          if (alive) setUser(data.user);
        } catch {
          setToken(null);
        }
      }
      if (alive) setLoading(false);
    })();
    const onUnauthorized = () => {
      setToken(null);
      setUser(null);
    };
    window.addEventListener('bfvr:unauthorized', onUnauthorized);
    return () => {
      alive = false;
      window.removeEventListener('bfvr:unauthorized', onUnauthorized);
    };
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await post('/api/auth/login', { username, password });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  // Self-serve signup: creates a brand-new business + owner admin and signs them in.
  const register = useCallback(async ({ businessName, name, username, password }) => {
    const data = await post('/api/auth/register', { businessName, name, username, password });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const can = useCallback((perm) => !!user && user.permissions.includes(perm), [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
