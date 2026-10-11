// API client with an offline write queue.
// Mutations attempted while offline (or that fail on network) are queued in
// localStorage and replayed in order as soon as connectivity returns.
// The server de-duplicates by clientId, so replaying is always safe.

const TOKEN_KEY = 'bfvr_token';
const QUEUE_KEY = 'bfvr_queue';
const API_BASE_KEY = 'bfvr_api_base';

// Server address resolution:
//  - packaged apps (APK / EXE) carry a baked-in default from VITE_API_BASE
//  - the login screen can override it at runtime (saved in localStorage)
//  - normal web deployment leaves it empty → same-origin /api requests
export function getApiBase() {
  let stored = null;
  try {
    stored = localStorage.getItem(API_BASE_KEY);
  } catch {
    /* storage unavailable */
  }
  const base = stored ?? import.meta.env.VITE_API_BASE ?? '';
  return String(base).replace(/\/+$/, '');
}

export function setApiBase(url) {
  try {
    if (url) localStorage.setItem(API_BASE_KEY, String(url).replace(/\/+$/, ''));
    else localStorage.removeItem(API_BASE_KEY);
  } catch {
    /* storage unavailable */
  }
}

const apiUrl = (path) => {
  const base = getApiBase();
  return base ? `${base}${path}` : path;
};

// Packaged builds (APK / EXE) must ask for the server address at runtime;
// normal web deployments are same-origin and never show the setup field.
export function needsServerSetup() {
  if (typeof window === 'undefined') return false;
  if (import.meta.env.VITE_SHELL === '1') return true;
  return !/^https?:$/.test(window.location.protocol);
}

// Reachability probe (with timeout) — used by the first-run server setup screen.
export async function checkServer(base) {
  const url = `${String(base || '').replace(/\/+$/, '')}/api/health`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    const data = await res.json().catch(() => null);
    return !!(res.ok && data && data.ok);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.status = status;
  }
}

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

async function rawRequest(method, path, body) {
  let res;
  try {
    res = await fetch(apiUrl(path), {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('offline', 0);
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('bfvr:unauthorized'));
  }
  if (!res.ok) throw new ApiError((data && data.error) || `Request failed (${res.status})`, res.status);
  return data;
}

export async function get(path) {
  return rawRequest('GET', path);
}

// Mutate with offline fallback: queue when offline, rethrow real API errors
export async function mutate(method, path, body, { label = '' } = {}) {
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (!offline) {
    try {
      return await rawRequest(method, path, body);
    } catch (err) {
      if (err.status !== 0) throw err;
    }
  }
  const entry = {
    qid: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    method,
    path,
    body,
    label,
    createdAt: Date.now(),
  };
  const q = getQueue();
  q.push(entry);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  notifyQueue();
  return { queued: true, qid: entry.qid };
}

export const post = (path, body, opts) => mutate('POST', path, body, opts);
export const put = (path, body, opts) => mutate('PUT', path, body, opts);
export const del = (path, opts) => mutate('DELETE', path, undefined, opts);

export function getQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY)) || [];
  } catch {
    return [];
  }
}

function notifyQueue() {
  window.dispatchEvent(new CustomEvent('bfvr:queue', { detail: { length: getQueue().length } }));
}

let flushing = false;

// Replay queued writes in order; stop cleanly if we go offline again
export async function flushQueue() {
  if (flushing || typeof navigator === 'undefined' || !navigator.onLine) return null;
  flushing = true;
  try {
    const q = getQueue();
    if (q.length === 0) return null;
    const remaining = [];
    let synced = 0;
    const failed = [];
    for (let i = 0; i < q.length; i++) {
      const entry = q[i];
      try {
        await rawRequest(entry.method, entry.path, entry.body);
        synced++;
      } catch (err) {
        if (err.status === 0) {
          // offline again — keep this and everything after it
          for (let j = i; j < q.length; j++) remaining.push(q[j]);
          break;
        }
        failed.push({ label: entry.label || entry.path, error: err.message });
      }
    }
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    notifyQueue();
    const result = { synced, failed };
    window.dispatchEvent(new CustomEvent('bfvr:sync', { detail: result }));
    return result;
  } finally {
    flushing = false;
  }
}
