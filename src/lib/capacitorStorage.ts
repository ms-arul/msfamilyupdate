/**
 * Capacitor Preferences-backed storage adapter for Supabase auth.
 *
 * On native platforms (Android/iOS), localStorage can be wiped when the
 * WebView is destroyed (low memory, force-stop, etc.), causing the user
 * to appear logged out. This adapter persists auth tokens in Capacitor's
 * native key-value store, which survives WebView restarts.
 *
 * On web, it falls back to localStorage.
 */
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

// In-memory cache so synchronous reads (used by Supabase internally)
// return the latest value without waiting for async native calls.
const memoryCache: Record<string, string> = {};

// Flag to track if we've loaded persisted data into memory
let hydrated = false;

/**
 * Pre-load all Supabase auth keys from native storage into the memory cache.
 * Must be called (and awaited) before creating the Supabase client.
 */
export async function hydrateAuthStorage(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    hydrated = true;
    return; // Web uses localStorage directly
  }

  try {
    // Supabase stores its auth token under a key like:
    // sb-<project-ref>-auth-token
    const { keys } = await Preferences.keys();
    const sbKeys = keys.filter(k => k.startsWith('sb-'));

    for (const key of sbKeys) {
      const { value } = await Preferences.get({ key });
      if (value !== null) {
        memoryCache[key] = value;
      }
    }
  } catch (err) {
    console.warn('[CapacitorStorage] Hydration failed:', err);
  }

  hydrated = true;
}

/**
 * Custom storage adapter that conforms to the interface Supabase expects:
 *   getItem(key): string | null
 *   setItem(key, value): void
 *   removeItem(key): void
 *
 * On native, reads from the in-memory cache (populated by hydrateAuthStorage)
 * and writes are mirrored to both the cache and Capacitor Preferences.
 * On web, delegates directly to localStorage.
 */
export const capacitorStorage = {
  getItem(key: string): string | null {
    if (!Capacitor.isNativePlatform()) {
      return localStorage.getItem(key);
    }
    return memoryCache[key] ?? null;
  },

  setItem(key: string, value: string): void {
    if (!Capacitor.isNativePlatform()) {
      localStorage.setItem(key, value);
      return;
    }
    // Update memory cache immediately (synchronous)
    memoryCache[key] = value;
    // Persist to native storage (async, fire-and-forget)
    Preferences.set({ key, value }).catch(err =>
      console.warn('[CapacitorStorage] setItem failed:', err)
    );
  },

  removeItem(key: string): void {
    if (!Capacitor.isNativePlatform()) {
      localStorage.removeItem(key);
      return;
    }
    delete memoryCache[key];
    Preferences.remove({ key }).catch(err =>
      console.warn('[CapacitorStorage] removeItem failed:', err)
    );
  },
};

export { hydrated };
