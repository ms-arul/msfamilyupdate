/**
 * Capacitor Preferences-backed 3-tier storage adapter for Supabase auth.
 *
 * Provides triple redundancy:
 * 1. Synchronous in-memory cache (for instant reads by Supabase gotrue)
 * 2. Web `localStorage` (for synchronous WebView persistence)
 * 3. Capacitor Native Preferences (survives Android WebView memory clears and force-stops)
 */
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

// In-memory cache so synchronous reads (used by Supabase internally)
// return the latest value without waiting for async native calls.
const memoryCache: Record<string, string> = {};

// Synchronously pre-seed memory cache from localStorage on module load
try {
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && (k.startsWith('sb-') || k.startsWith('msfamily_'))) {
      const v = localStorage.getItem(k);
      if (v !== null) {
        memoryCache[k] = v;
      }
    }
  }
} catch {}

// Flag to track if we've loaded persisted data into memory
let hydrated = false;

/**
 * Pre-load all Supabase auth and app session keys from native storage into memory and localStorage.
 * Must be called (and awaited) before creating the Supabase client.
 */
export async function hydrateAuthStorage(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    hydrated = true;
    return; // Web uses localStorage directly
  }

  try {
    const { keys } = await Preferences.keys();
    // Load all auth tokens (sb-) and app session keys (msfamily_)
    const targetKeys = keys.filter(k => k.startsWith('sb-') || k.startsWith('msfamily_'));

    for (const key of targetKeys) {
      const { value } = await Preferences.get({ key });
      if (value !== null) {
        memoryCache[key] = value;
        try {
          localStorage.setItem(key, value);
        } catch { }
      }
    }

    // Cross-sync: check localStorage for any tokens that native Preferences might have missed
    for (let i = 0; i < localStorage.length; i++) {
      const lsKey = localStorage.key(i);
      if (lsKey && (lsKey.startsWith('sb-') || lsKey.startsWith('msfamily_'))) {
        if (!memoryCache[lsKey]) {
          const lsVal = localStorage.getItem(lsKey);
          if (lsVal) {
            memoryCache[lsKey] = lsVal;
            Preferences.set({ key: lsKey, value: lsVal }).catch(() => { });
          }
        }
      }
    }
  } catch (err) {
    console.warn('[CapacitorStorage] Hydration failed:', err);
  }

  hydrated = true;
}

/**
 * Custom 3-tier storage adapter that conforms to the interface Supabase expects:
 *   getItem(key): string | null
 *   setItem(key, value): void
 *   removeItem(key): void
 */
export const capacitorStorage = {
  getItem(key: string): string | null {
    // 1. Try memory cache first (instant)
    const inMemory = memoryCache[key];
    if (inMemory !== undefined && inMemory !== null) {
      return inMemory;
    }

    // 2. Fallback to localStorage (synchronous disk)
    try {
      const fromLs = localStorage.getItem(key);
      if (fromLs !== null) {
        memoryCache[key] = fromLs; // sync back to memory cache
        return fromLs;
      }
    } catch { }

    return null;
  },

  setItem(key: string, value: string): void {
    // 1. Update memory cache immediately
    memoryCache[key] = value;

    // 2. Mirror to localStorage synchronously
    try {
      localStorage.setItem(key, value);
    } catch { }

    // 3. Persist to native storage (async, fire-and-forget on native)
    if (Capacitor.isNativePlatform()) {
      Preferences.set({ key, value }).catch(err =>
        console.warn('[CapacitorStorage] setItem failed:', err)
      );
    }
  },

  removeItem(key: string): void {
    delete memoryCache[key];
    try {
      localStorage.removeItem(key);
    } catch { }

    if (Capacitor.isNativePlatform()) {
      Preferences.remove({ key }).catch(err =>
        console.warn('[CapacitorStorage] removeItem failed:', err)
      );
    }
  },
};

export { hydrated };

