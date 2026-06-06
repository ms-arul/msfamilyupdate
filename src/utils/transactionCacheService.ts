import { Capacitor } from '@capacitor/core';
import { TransactionCache } from '../plugins';
import { Transaction } from '../types/finance';

const LS_CACHE_KEY = 'msfamily_tx_cache';
const LS_SYNC_TS_KEY = 'msfamily_last_sync_ts';

// ─── NATIVE CACHE ────────────────────────────────────────────────────────────

export async function getCachedTransactions(): Promise<Transaction[]> {
  // 1. Try native cache first
  if (Capacitor.isNativePlatform() && TransactionCache) {
    try {
      const result = await TransactionCache.getCachedTransactions();
      const nativeTx = result?.transactions || [];
      if (nativeTx.length > 0) return nativeTx;
    } catch (err) {
      console.warn('[Cache] Native cache failed, falling back to localStorage:', err);
    }
  }

  // 2. Fallback: localStorage cache
  try {
    const lastSync = getLastSyncTimestamp();
    const ageMs = lastSync ? Date.now() - lastSync : null;
    const isExpired = ageMs !== null && ageMs > 24 * 60 * 60 * 1000; // 24 hours
    
    if (isExpired) {
      console.log('[Cache] localStorage cache is older than 24 hours. Invalidating.');
      localStorage.removeItem(LS_CACHE_KEY);
    } else {
      const raw = localStorage.getItem(LS_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`[Cache] Loaded ${parsed.length} transactions from localStorage cache`);
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('[Cache] localStorage cache read failed:', err);
  }

  return [];
}

export async function cacheTransactions(transactions: Transaction[]): Promise<void> {
  const mapped: Transaction[] = transactions.map((t) => ({
    id: t.id,
    amount: Number(t.amount),
    category: t.category || 'Other',
    type: t.type || 'expense',
    date: t.date,
    notes: t.notes || '',
    memberId: t.memberId || '',
    memberName: t.memberName || 'Unknown',
    proofUrl: t.proofUrl || null,
    source: t.source || 'manual',
    bankName: t.bankName || null,
    merchantName: t.merchantName || null,
    smsConfidence: t.smsConfidence || null,
    smsReference: t.smsReference || null,
    created_at: t.created_at || t.date || new Date().toISOString(),
  }));

  // 1. Native cache
  if (Capacitor.isNativePlatform() && TransactionCache) {
    try {
      await TransactionCache.cacheTransactions({ transactions: mapped });
    } catch (err) {
      console.warn('[Cache] Failed to save transactions to native cache:', err);
    }
  }

  // 2. Always save to localStorage as backup (limit to last 500 for size)
  try {
    const toStore = mapped.slice(0, 500);
    localStorage.setItem(LS_CACHE_KEY, JSON.stringify(toStore));
  } catch (err) {
    console.warn('[Cache] Failed to save transactions to localStorage:', err);
  }

  // Update sync timestamp
  setLastSyncTimestamp();
}

export async function clearTransactionCache(): Promise<void> {
  if (Capacitor.isNativePlatform() && TransactionCache) {
    try {
      await TransactionCache.clearCache();
    } catch (err) {
      console.warn('[Cache] Failed to clear native transactions cache:', err);
    }
  }

  try {
    localStorage.removeItem(LS_CACHE_KEY);
  } catch (err) {
    console.warn('[Cache] Failed to clear localStorage cache:', err);
  }
}

// ─── SYNC TIMESTAMP ──────────────────────────────────────────────────────────

export function getLastSyncTimestamp(): number | null {
  try {
    const raw = localStorage.getItem(LS_SYNC_TS_KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

export function setLastSyncTimestamp(): void {
  try {
    localStorage.setItem(LS_SYNC_TS_KEY, String(Date.now()));
  } catch {
    // Silent fail
  }
}
