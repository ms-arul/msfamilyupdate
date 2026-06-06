import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { saveSinglePreference } from '../utils/preferencesService';
import { useAuth } from './AuthContext';
import { getCachedTransactions, cacheTransactions } from '../utils/transactionCacheService';
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

  // Create a ref for user to avoid stale closures in listeners
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

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

  const fetchTransactions = useCallback(async (loadAll = false) => {
    const currentUserId = userRef.current?.id;
    if (!currentUserId) {
      setTransactions([]);
      setLoading(false);
      return;
    }
    
    // Debounce: prevent rapid consecutive calls (within 1s)
    const now = Date.now();
    if (now - lastFetchTimeRef.current < 1000) {
      console.log('[Context] Fetch call debounced (too rapid)');
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
      console.log('[Context] Offline — using cached transactions only');
      setLoading(false);
      return;
    }

    // 3. Fetch latest in background with retry fallback
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
          `)
          .eq('member_id', currentUserId);

        if (!loadAll) {
          const ninetyDaysAgo = new Date();
          ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
          const dateLimitStr = ninetyDaysAgo.toISOString().split('T')[0];
          query = query.gte('date', dateLimitStr);
        }

        const { data, error } = await query.order('date', { ascending: false });

        if (error) throw error;

        const mapped = (data || []).map(tx => {
          const d = new Date(tx.date);
          return {
            id: tx.id,
            amount: Number(tx.amount),
            category: tx.category,
            type: tx.type as TransactionType,
            date: tx.date,
            month: d.getMonth() + 1,
            year: d.getFullYear(),
            notes: tx.notes || '',
            memberId: tx.member_id,
            memberName: (tx.profiles as any)?.name || 'Unknown',
            proofUrl: tx.proof_url || null,
            created_at: tx.created_at,
            source: tx.source || 'manual',
            bankName: tx.bank_name || null,
            merchantName: tx.merchant_name || null,
            smsConfidence: tx.sms_confidence || null,
            smsReference: tx.sms_reference || null,
          };
        });

        setTransactions(mapped.slice(0, 1000));
        
        // Update cache
        await cacheTransactions(mapped);
        success = true;
      } catch (err: any) {
        console.error(`[Context] Error fetching transactions (attempt ${attempt}/${maxAttempts}):`, err);
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
  }, [fetchTransactions, user]);

  // Auto-refetch when network comes back online
  useEffect(() => {
    const unsub = onNetworkChange((isOnline) => {
      if (isOnline && userRef.current?.id) {
        console.log('[Context] Network restored — auto-refetching transactions');
        fetchTransactions();
      }
    });
    return unsub;
  }, [fetchTransactions]);

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
        })
        .select(`
          *,
          profiles:profiles!transactions_member_id_fkey ( name )
        `)
        .single();

      if (error) throw error;

      const d = new Date(data.date);
      const newTx: Transaction = {
        id: data.id,
        amount: Number(data.amount),
        category: data.category,
        type: data.type as TransactionType,
        date: data.date,
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        notes: data.notes || '',
        memberId: data.member_id,
        memberName: (data.profiles as any)?.name || 'Unknown',
        proofUrl: data.proof_url || null,
        created_at: data.created_at,
        source: data.source || 'manual',
        bankName: data.bank_name || null,
        merchantName: data.merchant_name || null,
        smsConfidence: data.sms_confidence || null,
        smsReference: data.sms_reference || null,
      };

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

  const deleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('Error deleting transaction:', err);
    }
  };

  // ── SMS Transaction Auto-Add with Queue & Dedup ──────────────────────────────
  const processSingleSmsTransaction = useCallback(async (parsedSms: any) => {
    const currentUserId = userRef.current?.id;
    if (!currentUserId) {
      throw new Error('No authenticated user available for SMS transaction insertion');
    }

    const cleanDate = parsedSms.smsDate ? parsedSms.smsDate.split('T')[0] : new Date().toISOString().split('T')[0];
    const dedupKey = parsedSms.referenceNumber || `SMS-${Number(parsedSms.amount)}-${cleanDate}-${(parsedSms.bankName || 'unknown').replace(/\s+/g, '')}`;
    
    if (inMemoryDedupSet.has(dedupKey)) {
      console.log('[SMS Context] Prevented duplicate in-memory insert for key:', dedupKey);
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

    // ── LOW CONFIDENCE CHECK: route to pending queue ──
    const confidence = parsedSms.confidence || 0;
    if (confidence < 0.70) {
      console.log(`[SMS Context] Low confidence (${(confidence * 100).toFixed(0)}%) — routing to pending queue`);
      setPendingSmsTransactions(prev => {
        const updated = [...prev, { parsedSms, timestamp: Date.now() }];
        savePendingSms(updated);
        return updated;
      });
      return;
    }

    console.log('[SMS Context] Processing queued SMS insert for key:', dedupKey);

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
      // Handle both JS parser ('credit'/'debit') and native parser ('income'/'expense') formats
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
            console.log('[SMS Context] Unique constraint violation (duplicate) prevented by Supabase.');
            success = true;
            return;
          }
          throw error;
        }

        if (data) {
          const d = new Date(data.date);
          const newTx: Transaction = {
            id: data.id,
            amount: Number(data.amount),
            category: data.category,
            type: data.type as TransactionType,
            date: data.date,
            month: d.getMonth() + 1,
            year: d.getFullYear(),
            notes: data.notes || '',
            memberId: data.member_id,
            memberName: (data.profiles as any)?.name || 'Unknown',
            proofUrl: null,
            created_at: data.created_at,
            source: 'sms',
            bankName: data.bank_name,
            merchantName: data.merchant_name,
            smsConfidence: data.sms_confidence,
            smsReference: data.sms_reference,
          };

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

          console.log('[SMS Context] SMS Transaction added:', newTx.amount);
          success = true;

          // Perform lazy sync fetch to ensure everything aligns perfectly
          setTimeout(() => {
            fetchTransactions();
          }, 1500);
        }
      } catch (err: any) {
        console.error(`[SMS Context] DB insert failed (attempt ${attempt}/${maxAttempts}):`, err);
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
      console.error('[SMS Context] Queue processing failure:', err);
    });

    return currentInsert;
  }, [processSingleSmsTransaction]);

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
    const personalTransactions = currentMonthTransactions.filter(t => t.memberId === user?.id);
    const personalIncome = personalTransactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + Number(curr.amount), 0);
    const personalExpense = personalTransactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + Number(curr.amount), 0);
    const personalBalance = personalIncome - personalExpense;

    // Make all personal transactions available for historical graphs/history (unfiltered by month)
    const allPersonalTransactions = transactions.filter(t => t.memberId === user?.id);

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
