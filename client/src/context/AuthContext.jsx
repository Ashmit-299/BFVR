import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { get, postNow, getToken, setToken } from '../lib/api.js';
import { getItem, setItem, removeItem } from '../lib/store.js';

const AuthContext = createContext(null);
const USER_KEY = 'bfvr_user';

const readCachedUser = () => {
  try {
    const raw = getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeCachedUser = (u) => {
  try {
    if (u) setItem(USER_KEY, JSON.stringify(u));
    else removeItem(USER_KEY);
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
      const token = getToken();
      const cached = token ? readCachedUser() : null;
      if (!token) {
        if (alive) setLoading(false);
        return;
      }
      // Open instantly from the stored profile — never block the first screen
      // on the network. This is what keeps the app logged in across launches
      // and lets it start with no internet at all; the /me call below then
      // only confirms (or ends) the session in the background.
      if (cached) {
        if (alive) {
          setUser(cached);
          setLoading(false);
        }
      }
      try {
        const data = await get('/api/auth/me');
        if (alive) {
          setUser(data.user);
          writeCachedUser(data.user);
          setLoading(false);
        }
      } catch (err) {
        // 401 = the session really ended. Any other failure (offline, server
        // down) must NOT log the user out — the stored profile stays in place.
        if (err.status === 401) {
          setToken(null);
          writeCachedUser(null);
          if (alive) setUser(null);
        }
        if (alive) setLoading(false);
      }
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
