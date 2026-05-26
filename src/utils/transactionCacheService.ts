import { Capacitor } from '@capacitor/core';
import { TransactionCache } from '../plugins';
import { Transaction } from '../types/finance';

export async function getCachedTransactions(): Promise<Transaction[]> {
  if (!Capacitor.isNativePlatform() || !TransactionCache) return [];
  try {
    const result = await TransactionCache.getCachedTransactions();
    return result?.transactions || [];
  } catch (err) {
    console.warn('[Cache] Failed to load transactions:', err);
    return [];
  }
}

export async function cacheTransactions(transactions: Transaction[]): Promise<void> {
  if (!Capacitor.isNativePlatform() || !TransactionCache) return;
  try {
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
    await TransactionCache.cacheTransactions({ transactions: mapped });
  } catch (err) {
    console.warn('[Cache] Failed to save transactions to cache:', err);
  }
}

export async function clearTransactionCache(): Promise<void> {
  if (!Capacitor.isNativePlatform() || !TransactionCache) return;
  try {
    await TransactionCache.clearCache();
  } catch (err) {
    console.warn('[Cache] Failed to clear transactions cache:', err);
  }
}
