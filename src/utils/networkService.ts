import { useState, useEffect, useCallback } from 'react';

// ─── NETWORK STATE ───────────────────────────────────────────────────────────

type NetworkStatus = {
  isOnline: boolean;
  wasOffline: boolean;
  lastOnlineAt: number | null;
};

type NetworkListener = (isOnline: boolean) => void;

const listeners = new Set<NetworkListener>();
let currentOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
let wasEverOffline = false;

function notifyListeners(isOnline: boolean) {
  currentOnline = isOnline;
  if (!isOnline) wasEverOffline = true;
  listeners.forEach(fn => {
    try { fn(isOnline); } catch (e) { console.warn('[Network] Listener error:', e); }
  });
}

// Initialize browser event listeners once
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[Network] Back online');
    notifyListeners(true);
  });
  window.addEventListener('offline', () => {
    console.log('[Network] Gone offline');
    notifyListeners(false);
  });
}

// ─── PUBLIC API ──────────────────────────────────────────────────────────────

export function getNetworkStatus(): { isOnline: boolean; wasOffline: boolean } {
  return {
    isOnline: currentOnline,
    wasOffline: wasEverOffline,
  };
}

export function onNetworkChange(callback: NetworkListener): () => void {
  listeners.add(callback);
  return () => { listeners.delete(callback); };
}

// ─── REACT HOOK ──────────────────────────────────────────────────────────────

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: currentOnline,
    wasOffline: wasEverOffline,
    lastOnlineAt: currentOnline ? Date.now() : null,
  });

  useEffect(() => {
    const handler = (isOnline: boolean) => {
      setStatus(prev => ({
        isOnline,
        wasOffline: prev.wasOffline || !isOnline,
        lastOnlineAt: isOnline ? Date.now() : prev.lastOnlineAt,
      }));
    };

    const unsub = onNetworkChange(handler);
    return unsub;
  }, []);

  return status;
}

// ─── CONNECTIVITY CHECK ──────────────────────────────────────────────────────

/**
 * Proactively check if we can actually reach the backend.
 * navigator.onLine can be unreliable (returns true when on captive portal).
 */
export async function checkConnectivity(url?: string): Promise<boolean> {
  try {
    const testUrl = url || 'https://www.gstatic.com/generate_204';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const resp = await fetch(testUrl, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache',
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    return true;
  } catch {
    return false;
  }
}
