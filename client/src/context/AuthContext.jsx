import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { get, postNow, getToken, setToken } from '../lib/api.js';

const AuthContext = createContext(null);
const USER_KEY = 'bfvr_user';

const readCachedUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeCachedUser = (u) => {
  try {
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* storage unavailable */
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (getToken()) {
        try {
          const data = await get('/api/auth/me');
          if (alive) {
            setUser(data.user);
            writeCachedUser(data.user);
          }
        } catch (err) {
          // 401 = the session really ended. Any other failure (offline, server
          // down) must NOT log the user out — boot from the cached profile and
          // let the background revalidate confirm it later.
          if (err.status === 401) {
            setToken(null);
            writeCachedUser(null);
            if (alive) setUser(null);
          } else {
            const cached = readCachedUser();
            if (alive && cached) setUser(cached);
          }
        }
      }
      if (alive) setLoading(false);
    })();
    const onUnauthorized = () => {
      setToken(null);
      writeCachedUser(null);
      setUser(null);
    };
    window.addEventListener('bfvr:unauthorized', onUnauthorized);
    return () => {
      alive = false;
      window.removeEventListener('bfvr:unauthorized', onUnauthorized);
    };
  }, []);

  const login = useCallback(async (username, password) => {
    // never queued — a login must reach the server or fail loudly
    const data = await postNow('/api/auth/login', { username, password });
    setToken(data.token);
    setUser(data.user);
    writeCachedUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    writeCachedUser(null);
    setUser(null);
  }, []);

  const can = useCallback((perm) => !!user && user.permissions.includes(perm), [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
