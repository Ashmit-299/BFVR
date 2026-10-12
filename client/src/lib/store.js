// Durable key-value storage for all of the app's local state (login token,
// user profile, server URL, offline queue, read cache, carts…).
//
// localStorage is fast, but Android WebView may reclaim Web Storage when the
// device runs low on space. When that happens the login session and the
// offline cache silently disappear, so the next app launch shows the login
// screen again and nothing works without internet — exactly the bug reported
// on phones. On native platforms (APK) every write is therefore also mirrored
// into @capacitor/preferences (native SharedPreferences on Android), and at
// boot anything localStorage lost is restored from there.
//
// Web builds keep today's behaviour exactly: localStorage only, no mirror.
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const isNative = () => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

export function getItem(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* quota exceeded / storage unavailable — the mirror below still keeps it */
  }
  if (isNative()) Preferences.set({ key, value }).catch(() => {});
}

export function removeItem(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* storage unavailable */
  }
  if (isNative()) Preferences.remove({ key }).catch(() => {});
}

let hydration = null;

// Restore from the durable copy everything localStorage lost. Runs once,
// before the first render (see main.jsx). No-op on the web — there is no
// second copy there.
export function hydrate() {
  if (hydration) return hydration;
  hydration = (async () => {
    if (!isNative()) return;
    try {
      const { keys } = await Preferences.keys();
      await Promise.all(
        keys.map(async (key) => {
          if (!key.startsWith('bfvr_')) return;
          if (getItem(key) != null) return; // localStorage still has it
          const { value } = await Preferences.get({ key });
          if (value == null) return;
          try {
            localStorage.setItem(key, value);
          } catch {
            /* storage unavailable */
          }
        })
      );
    } catch {
      /* Preferences unavailable — the app still runs, just without the backup */
    }
  })();
  return hydration;
}
