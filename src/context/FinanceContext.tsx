import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { saveSinglePreference } from '../utils/preferencesService';
import { useAuth } from './AuthContext';
import { useFamily } from './FamilyContext';
import { getCachedTransactions, cacheTransactions, clearTransactionCache } from '../utils/transactionCacheService';
import { createSafeContext } from './contextHelper';
import { Transaction, TransactionType, SavingsGoal } from '../types/finance';
import { getNetworkStatus, onNetworkChange } from '../utils/networkService';

export interface FinanceContextType {
  // Global Family Stats
  transactions: Transaction[];
  totalIncome: number;
  totalExpense: number;
  balance: number;
  
  // Personal Stats (Current Month Reset)
  personalTransactions: Transaction[];
  personalIncome: number;
  personalExpense: number;
  personalBalance: number;

  // Historical Data (All Time)
  allPersonalTransactions: Transaction[];
  allTimeBalance: number;
  allTimePersonalBalance: number;

  // Actions & Config
  addTransaction: (transaction: {
    amount: number;
    category: string;
    type: TransactionType;
    date: string;
    notes: string;
    memberId: string;
    proofUrl?: string | null;
  }) => Promise<void>;
  updateTransaction: (id: string, updates: {
    amount?: number;
    category?: string;
    type?: TransactionType;
    date?: string;
    notes?: string;
    memberId?: string;
    proofUrl?: string | null;
  }) => Promise<void>;
  addSmsTransaction: (parsedSms: any) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  budgetLimit: number;
  updateBudgetLimit: (newLimit: number) => Promise<void>;
  savingsGoal: SavingsGoal;
  updateSavingsGoal: (newTarget: number) => Promise<void>;
  loading: boolean;
  smsTransactionCount: number;
  todaySmsCount: number;
  refetch: (loadAll?: boolean) => Promise<void>;

  // Pending SMS (low confidence)
  pendingSmsTransactions: PendingSmsEntry[];
  confirmPendingSms: (index: number) => Promise<void>;
  dismissPendingSms: (index: number) => void;

  // In-app SMS Toast Notification Feedback
  activeSmsToast: {
    amount: number;
    bankName: string;
    merchantName?: string;
    transactionType: 'credit' | 'debit';
  } | null;
  setActiveSmsToast: (toast: {
    amount: number;
    bankName: string;
    merchantName?: string;
    transactionType: 'credit' | 'debit';
  } | null) => void;
}

const [useFinance, FinanceContextProvider] = createSafeContext<FinanceContextType>('Finance');

export { useFinance };

interface FinanceProviderProps {
  children: React.ReactNode;
}

// Pending SMS entry for low confidence transactions
export interface PendingSmsEntry {
  parsedSms: any;
  timestamp: number;
}

const PENDING_SMS_KEY = 'sms_pending_confirm';

function loadPendingSms(): PendingSmsEntry[] {
  try {
    const raw = localStorage.getItem(PENDING_SMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePendingSms(entries: PendingSmsEntry[]): void {
  try {
    localStorage.setItem(PENDING_SMS_KEY, JSON.stringify(entries.slice(-50)));
  } catch {}
}

// ── Helper: Map DB row to Transaction ────────────────────────────────────────
function mapDbToTransaction(tx: any): Transaction {
  let year = new Date().getFullYear();
  let month = new Date().getMonth() + 1;
  if (tx.date) {
    const parts = String(tx.date).split('T')[0].split('-');
    if (parts.length === 3) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
    } else {
      const d = new Date(tx.date);
      year = d.getFullYear();
      month = d.getMonth() + 1;
    }
  }
  return {
    id: tx.id,
    amount: Number(tx.amount),
    category: tx.category,
    type: tx.type as TransactionType,
    date: tx.date,
    month,
    year,
    notes: tx.notes || '',
    memberId: tx.member_id,
    memberName: (tx.profiles as any)?.name || 'Unknown',
    proofUrl: tx.proof_url || null,
    created_at: tx.created_at,
    familyId: tx.family_id || null,
    updatedAt: tx.updated_at || null,
    editedBy: tx.edited_by || null,
    editCount: tx.edit_count || 0,
    source: tx.source || 'manual',
    bankName: tx.bank_name || null,
    merchantName: tx.merchant_name || null,
    smsConfidence: tx.sms_confidence || null,
    smsReference: tx.sms_reference || null,
  };
}

// Global static queue and dedup set to survive state updates
let insertQueue = Promise.resolve();
const inMemoryDedupSet = new Set<string>();

export const FinanceProvider: React.FC<FinanceProviderProps> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeSmsToast, setActiveSmsToast] = useState<{
    amount: number;
    bankName: string;
    merchantName?: string;
    transactionType: 'credit' | 'debit';
  } | null>(null);

  // Pending SMS state
  const [pendingSmsTransactions, setPendingSmsTransactions] = useState<PendingSmsEntry[]>(() => loadPendingSms());

  const [budgetLimit, setBudgetLimit] = useState<number>(() => {
    const val = localStorage.getItem('msfamily_budget_limit');
    return val ? Number(val) : 3000;
  });
  const [savingsGoal, setSavingsGoal] = useState<SavingsGoal>(() => {
    const target = localStorage.getItem('msfamily_savings_target');
    return { name: "Annual Vacation", target: target ? Number(target) : 10000 };
  });
  const { user } = useAuth();

  // ── Family Context Integration ─────────────────────────────────────────────
  let familyId: string | null = null;
  try {
    const familyCtx = useFamily();
    familyId = familyCtx.family?.id || null;
  } catch {
    // FamilyContext may not be available during initial mount
    familyId = null;
  }

  // Create refs for user and familyId to avoid stale closures in listeners
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const familyIdRef = useRef(familyId);
  useEffect(() => {
    familyIdRef.current = familyId;
  }, [familyId]);

  // ── Clear cache when family changes ────────────────────────────────────────
  const prevFamilyIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevFamilyIdRef.current !== null && prevFamilyIdRef.current !== familyId) {
      // Family changed — clear stale data
      console.log('[Finance] Family changed, clearing cache');
      setTransactions([]);
      clearTransactionCache();
    }
    prevFamilyIdRef.current = familyId;
  }, [familyId]);

  useEffect(() => {
    const handleStorageChange = () => {
      const bLimit = localStorage.getItem('msfamily_budget_limit');
      if (bLimit) setBudgetLimit(Number(bLimit));
      
      const sTarget = localStorage.getItem('msfamily_savings_target');
      if (sTarget) setSavingsGoal(prev => ({ ...prev, target: Number(sTarget) }));
    };

    window.addEventListener('storage', handleStorageChange);
    // Sync after mount in case AuthContext loaded preferences
    const timer = setTimeout(handleStorageChange, 500);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearTimeout(timer);
    };
  }, []);

  const updateBudgetLimit = async (newLimit: number) => {
    setBudgetLimit(newLimit);
    if (user?.id) {
      await saveSinglePreference(user.id, 'budget_limit', newLimit);
    }
  };

  const updateSavingsGoal = async (newTarget: number) => {
    setSavingsGoal(prev => ({ ...prev, target: newTarget }));
    if (user?.id) {
      await saveSinglePreference(user.id, 'savings_target', newTarget);
    }
  };

  const lastFetchTimeRef = useRef<number>(0);

  // ── Fetch Transactions — FAMILY SCOPED ─────────────────────────────────────
  const fetchTransactions = useCallback(async (loadAll = false) => {
    const currentUserId = userRef.current?.id;
    const currentFamilyId = familyIdRef.current;
    if (!currentUserId) {
      setTransactions([]);
      setLoading(false);
      return;
    }
    
    // Debounce: prevent rapid consecutive calls (within 1s)
    const now = Date.now();
    if (now - lastFetchTimeRef.current < 1000) {
      console.log('[Finance] Fetch call debounced (too rapid)');
      return;
    }
    lastFetchTimeRef.current = now;

    // 1. Try loading from cache first for instant load
    try {
      const cached = await getCachedTransactions();
      if (cached && cached.length > 0) {
        const mappedCached = cached.map(tx => {
          const d = new Date(tx.date || tx.created_at);
          return {
            ...tx,
            month: d.getMonth() + 1,
            year: d.getFullYear(),
          };
        });
        setTransactions(mappedCached.slice(0, 1000));
        setLoading(false);
      }
    } catch (cacheErr) {
      console.warn('[Cache] Error loading cached transactions:', cacheErr);
    }

    // 2. If offline, skip Supabase and use cache only
    const { isOnline } = getNetworkStatus();
    if (!isOnline) {
      console.log('[Finance] Offline — using cached transactions only');
      setLoading(false);
      return;
    }

    // 3. Fetch latest in background with retry fallback — FAMILY SCOPED
    let attempt = 0;
    const maxAttempts = 3;
    let success = false;

    while (attempt < maxAttempts && !success) {
      try {
        attempt++;
        let query = supabase
          .from('transactions')
          .select(`
            *,
            profiles:profiles!transactions_member_id_fkey ( name )
          `);

        // Scope query to fetch both family transactions and member's own personal transactions
        if (currentFamilyId) {
          query = query.or(`family_id.eq.${currentFamilyId},member_id.eq.${currentUserId}`);
        } else {
          query = query.eq('member_id', currentUserId);
        }

        if (!loadAll) {
          const ninetyDaysAgo = new Date();
          ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
          const dateLimitStr = ninetyDaysAgo.toISOString().split('T')[0];
          query = query.gte('date', dateLimitStr);
        }

        const { data, error } = await query.order('date', { ascending: false });

        if (error) throw error;

        const mapped = (data || []).map(mapDbToTransaction);

        setTransactions(prev => {
          if (mapped.length === 0 && prev.length > 0) {
            console.warn('[Finance] Received 0 transactions from server while existing transactions exist in state. Preserving current state.');
            return prev;
          }
          return mapped.slice(0, 1000);
        });
        
        // Update cache
        if (mapped.length > 0) {
          await cacheTransactions(mapped);
        }
        success = true;
      } catch (err: any) {
        console.error(`[Finance] Error fetching transactions (attempt ${attempt}/${maxAttempts}):`, err);
        if (err && typeof err === 'object') {
          console.error(
            'Relationship Error',
            err.details || '',
            err.hint || ''
          );
        }
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      } finally {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions, user, familyId]);

  // ── Listen for global auth session refresh/recovery events ────────────────
  useEffect(() => {
    const handleAuthRefreshed = () => {
      console.log('[Finance] Auth session refreshed event received. Re-fetching transactions...');
      lastFetchTimeRef.current = 0;
      fetchTransactions(true);
    };

    window.addEventListener('msfamily_auth_refreshed', handleAuthRefreshed);
    return () => {
      window.removeEventListener('msfamily_auth_refreshed', handleAuthRefreshed);
    };
  }, [fetchTransactions]);

  // ── Realtime subscription — FAMILY SCOPED (BUG 9) ─────────────────────────
  useEffect(() => {
    if (!user) return;
    const currentFamilyId = familyId;

    // Build filter: scope by family_id if available
    const filterStr = currentFamilyId
      ? `family_id=eq.${currentFamilyId}`
      : `member_id=eq.${user.id}`;

    const channel = supabase
      .channel(`transactions_realtime_${currentFamilyId || user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: filterStr,
      }, (payload) => {
        // Auto-refresh on any transaction change (BUG 9)
        // Debounced via fetchTransactions internal debounce
        if (payload.eventType === 'INSERT') {
          const newTx = mapDbToTransaction(payload.new);
          setTransactions(prev => {
            if (prev.some(t => t.id === newTx.id)) return prev;
            return [newTx, ...prev].slice(0, 1000);
          });
        } else if (payload.eventType === 'UPDATE') {
          const updatedTx = mapDbToTransaction(payload.new);
          setTransactions(prev =>
            prev.map(t => t.id === updatedTx.id ? updatedTx : t)
          );
        } else if (payload.eventType === 'DELETE') {
          const deletedId = (payload.old as any)?.id;
          if (deletedId) {
            setTransactions(prev => prev.filter(t => t.id !== deletedId));
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, familyId]);

  // Auto-refetch when network comes back online
  useEffect(() => {
    const unsub = onNetworkChange((isOnline) => {
      if (isOnline && userRef.current?.id) {
        console.log('[Finance] Network restored — auto-refetching transactions');
        fetchTransactions();
      }
    });
    return unsub;
  }, [fetchTransactions]);

  // ── Add Transaction — with family_id ───────────────────────────────────────
  const addTransaction = async (transaction: {
    amount: number;
    category: string;
    type: TransactionType;
    date: string;
    notes: string;
    memberId: string;
    proofUrl?: string | null;
  }) => {
    try {
      const currentFamilyId = familyIdRef.current;

      const { data, error } = await supabase
        .from('transactions')
        .insert({
          amount: transaction.amount,
          category: transaction.category,
          type: transaction.type,
          date: transaction.date,
          notes: transaction.notes,
          member_id: transaction.memberId,
          proof_url: transaction.proofUrl || null,
          family_id: currentFamilyId,
        })
        .select(`
          *,
          profiles:profiles!transactions_member_id_fkey ( name )
        `)
        .single();

      if (error) throw error;

      const newTx = mapDbToTransaction(data);
      setTransactions(prev => [newTx, ...prev].slice(0, 1000));
    } catch (err: any) {
      console.error('Error adding transaction:', err);
      if (err && typeof err === 'object') {
        console.error(
          'Relationship Error',
          err.details || '',
          err.hint || ''
        );
      }
    }
  };

  // ── Update Transaction (BUG 3) ────────────────────────────────────────────
  const updateTransaction = async (id: string, updates: {
    amount?: number;
    category?: string;
    type?: TransactionType;
    date?: string;
    notes?: string;
    memberId?: string;
    proofUrl?: string | null;
  }) => {
    const currentUserId = userRef.current?.id;
    if (!currentUserId) throw new Error('Not authenticated');

    // Build DB update payload
    const dbUpdates: Record<string, any> = {};
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.memberId !== undefined) dbUpdates.member_id = updates.memberId;
    if (updates.proofUrl !== undefined) dbUpdates.proof_url = updates.proofUrl;
    dbUpdates.edited_by = currentUserId;

    try {
      // Get current transaction for audit log
      const { data: currentTx } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single();

      // Optimistic UI update
      setTransactions(prev =>
        prev.map(t => {
          if (t.id !== id) return t;
          const d = updates.date ? new Date(updates.date) : undefined;
          return {
            ...t,
            ...(updates.amount !== undefined && { amount: updates.amount }),
            ...(updates.category !== undefined && { category: updates.category }),
            ...(updates.type !== undefined && { type: updates.type }),
            ...(updates.date !== undefined && { date: updates.date, month: d!.getMonth() + 1, year: d!.getFullYear() }),
            ...(updates.notes !== undefined && { notes: updates.notes }),
            ...(updates.memberId !== undefined && { memberId: updates.memberId }),
            ...(updates.proofUrl !== undefined && { proofUrl: updates.proofUrl }),
            editedBy: currentUserId,
            editCount: (t.editCount || 0) + 1,
            updatedAt: new Date().toISOString(),
          };
        })
      );

      // Perform DB update
      const { data, error } = await supabase
        .from('transactions')
        .update({
          ...dbUpdates,
          edited_by: currentUserId,
          edit_count: (currentTx?.edit_count || 0) + 1,
        })
        .eq('id', id)
        .select(`
          *,
          profiles:profiles!transactions_member_id_fkey ( name )
        `)
        .single();

      if (error) throw error;

      // Create audit log entry
      if (currentTx) {
        const changes: Record<string, any> = {};
        const previousValues: Record<string, any> = {};
        for (const [key, val] of Object.entries(dbUpdates)) {
          if (key === 'edited_by' || key === 'edit_count') continue;
          if (currentTx[key] !== val) {
            changes[key] = val;
            previousValues[key] = currentTx[key];
          }
        }
        if (Object.keys(changes).length > 0) {
          await supabase.from('transaction_audit_log').insert({
            transaction_id: id,
            edited_by: currentUserId,
            action: 'updated',
            changes,
            previous_values: previousValues,
          });
        }
      }

      // Update with server response
      if (data) {
        const updatedTx = mapDbToTransaction(data);
        setTransactions(prev =>
          prev.map(t => t.id === id ? updatedTx : t)
        );
      }
    } catch (err: any) {
      console.error('Error updating transaction:', err);
      // Revert optimistic update by refetching
      fetchTransactions();
      throw err;
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      // Optimistic UI update
      setTransactions(prev => prev.filter(t => t.id !== id));

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) {
        // Revert on failure
        fetchTransactions();
        throw error;
      }

      // Create audit log entry
      const currentUserId = userRef.current?.id;
      if (currentUserId) {
        try {
          await supabase.from('transaction_audit_log').insert({
            transaction_id: id,
            edited_by: currentUserId,
            action: 'deleted',
            changes: {},
            previous_values: {},
          });
        } catch {
          // Audit logging is best-effort
        }
      }
    } catch (err) {
      console.error('Error deleting transaction:', err);
    }
  };

  // ── SMS Transaction Auto-Add with Queue & Dedup ──────────────────────────────
  const processSingleSmsTransaction = useCallback(async (parsedSms: any) => {
    const currentUserId = userRef.current?.id;
    const currentFamilyId = familyIdRef.current;
    if (!currentUserId) {
      throw new Error('No authenticated user available for SMS transaction insertion');
    }

    const cleanDate = parsedSms.smsDate ? parsedSms.smsDate.split('T')[0] : new Date().toISOString().split('T')[0];
    const dedupKey = parsedSms.referenceNumber || `SMS-${Number(parsedSms.amount)}-${cleanDate}-${(parsedSms.bankName || 'unknown').replace(/\s+/g, '')}`;
    
    if (inMemoryDedupSet.has(dedupKey)) {
      console.log('[SMS Finance] Prevented duplicate in-memory insert for key:', dedupKey);
      return;
    }
    inMemoryDedupSet.add(dedupKey);

    // Limit memory usage
    if (inMemoryDedupSet.size > 200) {
      const iterator = inMemoryDedupSet.values();
      const firstVal = iterator.next().value;
      if (firstVal !== undefined) {
        inMemoryDedupSet.delete(firstVal);
      }
    }

    // ── LOW CONFIDENCE CHECK: Mark for review (<75% accuracy rate) ──
    const confidence = parsedSms.confidence || 0.65;
    if (confidence < 0.75) {
      console.log(`[SMS Finance] Low confidence (${(confidence * 100).toFixed(0)}%) — inserting into database marked for review on Transactions page`);
    }

    console.log('[SMS Finance] Processing queued SMS insert for key:', dedupKey);

    // Build notes with full SMS body
    const noteParts: string[] = [];
    if (parsedSms.bankName) noteParts.push(parsedSms.bankName);
    if (parsedSms.merchantName) noteParts.push(parsedSms.merchantName);
    const noteHeader = noteParts.length > 0 ? `SMS: ${noteParts.join(' • ')}` : 'SMS Transaction';
    const fullNotes = parsedSms.rawBody
      ? `${noteHeader}\n---\n${parsedSms.rawBody}`
      : noteHeader;

    const insertData = {
      amount: Number(parsedSms.amount),
      category: parsedSms.suggestedCategory || 'Other',
      type: (parsedSms.transactionType === 'credit' || parsedSms.transactionType === 'income') ? 'income' : 'expense',
      date: cleanDate,
      notes: fullNotes,
      member_id: currentUserId,
      proof_url: null,
      source: 'sms',
      bank_name: parsedSms.bankName || null,
      merchant_name: parsedSms.merchantName || null,
      sms_confidence: parsedSms.confidence || null,
      sms_reference: dedupKey,
      family_id: currentFamilyId,
    };

    let attempt = 0;
    const maxAttempts = 3;
    let success = false;
    let finalError = null;

    while (attempt < maxAttempts && !success) {
      try {
        attempt++;
        const query = parsedSms.referenceNumber
          ? supabase.from('transactions').upsert(insertData, {
              onConflict: 'sms_reference',
              ignoreDuplicates: true,
            })
          : supabase.from('transactions').insert(insertData);

        const { data, error } = await query
          .select('*, profiles:profiles!transactions_member_id_fkey ( name )')
          .single();

        if (error) {
          if (error.code === '23505') {
            console.log('[SMS Finance] Unique constraint violation (duplicate) prevented by Supabase.');
            success = true;
            return;
          }
          throw error;
        }

        if (data) {
          const newTx = mapDbToTransaction(data);

          setTransactions(prev => {
            if (prev.some(t => t.id === newTx.id || (newTx.smsReference && t.smsReference === newTx.smsReference))) {
              return prev;
            }
            return [newTx, ...prev].slice(0, 1000);
          });

          // Show elegant in-app SMS toast feedback
          setActiveSmsToast({
            amount: Number(data.amount),
            bankName: data.bank_name || 'Bank',
            merchantName: data.merchant_name || undefined,
            transactionType: (parsedSms.transactionType === 'credit' || parsedSms.transactionType === 'income' || data.type === 'income') ? 'credit' : 'debit'
          });

          console.log('[SMS Finance] SMS Transaction added:', newTx.amount);
          success = true;

          // Perform lazy sync fetch to ensure everything aligns perfectly
          setTimeout(() => {
            fetchTransactions();
          }, 1500);
        }
      } catch (err: any) {
        console.error(`[SMS Finance] DB insert failed (attempt ${attempt}/${maxAttempts}):`, err);
        if (err && typeof err === 'object') {
          console.error(
            'Relationship Error',
            err.details || '',
            err.hint || ''
          );
        }
        finalError = err;
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    if (!success && finalError) {
      throw finalError;
    }
  }, [fetchTransactions]);

  const addSmsTransaction = useCallback(async (parsedSms: any) => {
    // Chain onto sequential insert queue to avoid concurrent inserts
    const currentInsert = insertQueue.then(async () => {
      await processSingleSmsTransaction(parsedSms);
    });

    insertQueue = currentInsert.catch(err => {
      console.error('[SMS Finance] Queue processing failure:', err);
    });

    return currentInsert;
  }, [processSingleSmsTransaction]);

  // Flush legacy pending SMS entries to database marked for review
  useEffect(() => {
    if (!user || pendingSmsTransactions.length === 0) return;
    const pendingToProcess = [...pendingSmsTransactions];
    setPendingSmsTransactions([]);
    savePendingSms([]);
    pendingToProcess.forEach(entry => {
      if (entry?.parsedSms) {
        addSmsTransaction(entry.parsedSms);
      }
    });
  }, [user, pendingSmsTransactions, addSmsTransaction]);

  // ── Pending SMS Confirm / Dismiss ──────────────────────────────────────────
  const confirmPendingSms = useCallback(async (index: number) => {
    const entry = pendingSmsTransactions[index];
    if (!entry) return;

    // Override confidence to bypass the <70% check
    const boostedSms = { ...entry.parsedSms, confidence: 1.0 };

    // Remove from pending first
    setPendingSmsTransactions(prev => {
      const updated = prev.filter((_, i) => i !== index);
      savePendingSms(updated);
      return updated;
    });

    // Process as normal SMS transaction
    await addSmsTransaction(boostedSms);
  }, [pendingSmsTransactions, addSmsTransaction]);

  const dismissPendingSms = useCallback((index: number) => {
    setPendingSmsTransactions(prev => {
      const updated = prev.filter((_, i) => i !== index);
      savePendingSms(updated);
      return updated;
    });
  }, []);

  // Initialize lastResetDate logic
  useEffect(() => {
    const today = new Date();
    const currentMonthKey = `${today.getFullYear()}-${today.getMonth() + 1}`;
    const lastResetDate = localStorage.getItem('msfamily_last_reset_date');
    if (lastResetDate !== currentMonthKey) {
      localStorage.setItem('msfamily_last_reset_date', currentMonthKey);
    }
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const todayStr = now.toISOString().split('T')[0];

    // Filter for current month's calculated stats to implement Monthly Reset (without deleting data)
    const currentMonthTransactions = transactions.filter(t => t.month === currentMonth && t.year === currentYear);

    const totalIncome = currentMonthTransactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + Number(curr.amount), 0);
    const totalExpense = currentMonthTransactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + Number(curr.amount), 0);
    const balance = totalIncome - totalExpense;

    // Personal isolated stats
    const personalTransactions = currentMonthTransactions.filter(t => !t.memberId || t.memberId === user?.id);
    const personalIncome = personalTransactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + Number(curr.amount), 0);
    const personalExpense = personalTransactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + Number(curr.amount), 0);
    const personalBalance = personalIncome - personalExpense;

    // Make all personal transactions available for historical graphs/history (unfiltered by month)
    const allPersonalTransactions = transactions.filter(t => !t.memberId || t.memberId === user?.id);

    const allTimeBalance = transactions.reduce((acc, curr) => curr.type === 'income' ? acc + Number(curr.amount) : acc - Number(curr.amount), 0);
    const allTimePersonalBalance = allPersonalTransactions.reduce((acc, curr) => curr.type === 'income' ? acc + Number(curr.amount) : acc - Number(curr.amount), 0);

    // SMS transaction count (for badges) — includes both 'sms' and legacy 'sms_background'
    const smsTransactionCount = transactions.filter(t => t.source === 'sms' || t.source === 'sms_background').length;
    const todaySmsCount = transactions.filter(t =>
      (t.source === 'sms' || t.source === 'sms_background') &&
      t.date === todayStr
    ).length;

    return {
      totalIncome,
      totalExpense,
      balance,
      personalTransactions,
      personalIncome,
      personalExpense,
      personalBalance,
      allPersonalTransactions,
      allTimeBalance,
      allTimePersonalBalance,
      smsTransactionCount,
      todaySmsCount,
    };
  }, [transactions, user]);

  const {
    totalIncome,
    totalExpense,
    balance,
    personalTransactions,
    personalIncome,
    personalExpense,
    personalBalance,
    allPersonalTransactions,
    allTimeBalance,
    allTimePersonalBalance,
    smsTransactionCount,
    todaySmsCount,
  } = stats;

  return (
    <FinanceContextProvider value={{
      // Global Family Stats
      transactions,
      totalIncome,
      totalExpense,
      balance,
      
      // Personal Stats (Current Month Reset)
      personalTransactions,
      personalIncome,
      personalExpense,
      personalBalance,

      // Historical Data (All Time)
      allPersonalTransactions,
      allTimeBalance,
      allTimePersonalBalance,

      // Actions & Config
      addTransaction,
      updateTransaction,
      addSmsTransaction,
      deleteTransaction,
      budgetLimit,
      updateBudgetLimit,
      savingsGoal,
      updateSavingsGoal,
      loading,
      smsTransactionCount,
      todaySmsCount,
      refetch: fetchTransactions,

      // Pending SMS (low confidence)
      pendingSmsTransactions,
      confirmPendingSms,
      dismissPendingSms,

      // SMS Toast Feedback
      activeSmsToast,
      setActiveSmsToast
    }}>
      {children}
    </FinanceContextProvider>
  );
};
