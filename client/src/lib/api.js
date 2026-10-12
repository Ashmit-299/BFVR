// API client with an offline write queue and a stale-while-revalidate read cache.
//
// Reads: every successful GET is cached in localStorage. Later calls return the
// cached copy instantly (never blocking on the network) and refresh it in the
// background; when the refreshed data differs, pages are told to reload. When
// the network fails, the cached copy is served — so the whole app boots and
// runs with no connection at all.
//
// Writes: mutations attempted offline (or that fail on network) are queued in
// localStorage and replayed in order as soon as connectivity returns.
// The server de-duplicates by clientId, so replaying is always safe.

const TOKEN_KEY = 'bfvr_token';
const QUEUE_KEY = 'bfvr_queue';
const API_BASE_KEY = 'bfvr_api_base';
const CACHE_PREFIX = 'bfvr_cache:';
const CACHE_INDEX_KEY = 'bfvr_cache_index';
const DIRTY_KEY = 'bfvr_cache_dirty';
const CACHE_MAX_ENTRIES = 40;
const REVALIDATE_COOLDOWN_MS = 4000;

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

// ---------- read cache (stale-while-revalidate) ----------
function readCacheIndex() {
  try {
    const arr = JSON.parse(localStorage.getItem(CACHE_INDEX_KEY));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function cacheRead(path) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + path);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function cacheWrite(path, data) {
  try {
    localStorage.setItem(CACHE_PREFIX + path, JSON.stringify(data));
    const idx = readCacheIndex().filter((k) => k !== path);
    idx.push(path);
    while (idx.length > CACHE_MAX_ENTRIES) {
      localStorage.removeItem(CACHE_PREFIX + idx.shift());
    }
    localStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(idx));
  } catch {
    /* quota exceeded / storage unavailable — cache is an optimization only */
  }
}

// Drop all cached GETs so the next reads come from the server.
// Called after every successful mutation and after the offline queue syncs.
// Entries are KEPT but flagged dirty: online reads then wait for fresh server
// data, while offline reads can still fall back to the last known copy.
export function invalidateCache() {
  try {
    const dirty = readDirty();
    for (const k of readCacheIndex()) dirty.add(k);
    writeDirty(dirty);
  } catch {
    /* storage unavailable */
  }
}

function readDirty() {
  try {
    const arr = JSON.parse(localStorage.getItem(DIRTY_KEY));
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function writeDirty(set) {
  try {
    localStorage.setItem(DIRTY_KEY, JSON.stringify([...set]));
  } catch {
    /* storage unavailable */
  }
}

function clearDirty(path) {
  const dirty = readDirty();
  if (dirty.delete(path)) writeDirty(dirty);
}

const revalidating = new Set();
const lastRevalidated = new Map();

// Refresh one cached path in the background; tell pages to reload if changed.
function revalidate(path) {
  if (revalidating.has(path)) return;
  const now = Date.now();
  if (now - (lastRevalidated.get(path) || 0) < REVALIDATE_COOLDOWN_MS) return;
  revalidating.add(path);
  lastRevalidated.set(path, now);
  rawRequest('GET', path)
    .then((data) => {
      const prev = cacheRead(path);
      cacheWrite(path, data);
      clearDirty(path);
      if (JSON.stringify(prev) !== JSON.stringify(data)) {
        window.dispatchEvent(new CustomEvent('bfvr:refresh', { detail: { path } }));
      }
    })
    .catch(() => {
      /* offline — the cached copy stays valid */
    })
    .finally(() => revalidating.delete(path));
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

// GET — returns cached data instantly when available, refreshes in background.
// Dirty entries (mutations happened) wait for the server while online, but the
// cache always remains the fallback when the network fails or is offline.
export async function get(path) {
  const entry = cacheRead(path);
  const cached = entry ? entry.data : undefined;
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  const dirty = readDirty().has(path);

  if (cached !== undefined && (offline || !dirty)) {
    if (!offline && !dirty) revalidate(path);
    return cached; // instant — the UI never waits on the network
  }
  try {
    const data = await rawRequest('GET', path);
    cacheWrite(path, data);
    clearDirty(path);
    return data;
  } catch (err) {
    // network died mid-flight — fall back to whatever we know
    if (err.status === 0 && cached !== undefined) return cached;
    throw err;
  }
}

// One-shot request that never queues — used by login (a queued login is useless).
export const postNow = (path, body) => rawRequest('POST', path, body);

// Mutate with offline fallback: queue when offline, rethrow real API errors
export async function mutate(method, path, body, { label = '' } = {}) {
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (!offline) {
    try {
      const res = await rawRequest(method, path, body);
      invalidateCache(); // server state changed — next reads must be fresh
      return res;
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
    if (synced > 0) invalidateCache(); // replayed writes changed server state
    window.dispatchEvent(new CustomEvent('bfvr:sync', { detail: result }));
    return result;
  } finally {
    flushing = false;
  }
}
