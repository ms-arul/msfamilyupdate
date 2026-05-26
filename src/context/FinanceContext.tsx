import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { saveSinglePreference } from '../utils/preferencesService';
import { useAuth } from './AuthContext';
import { getCachedTransactions, cacheTransactions } from '../utils/transactionCacheService';
import { createSafeContext } from './contextHelper';
import { Transaction, TransactionType, SavingsGoal } from '../types/finance';

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
  refetch: () => Promise<void>;
}

const [useFinance, FinanceContextProvider] = createSafeContext<FinanceContextType>('Finance');

export { useFinance };

interface FinanceProviderProps {
  children: React.ReactNode;
}

export const FinanceProvider: React.FC<FinanceProviderProps> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [budgetLimit, setBudgetLimit] = useState<number>(() => {
    const val = localStorage.getItem('msfamily_budget_limit');
    return val ? Number(val) : 3000;
  });
  const [savingsGoal, setSavingsGoal] = useState<SavingsGoal>(() => {
    const target = localStorage.getItem('msfamily_savings_target');
    return { name: "Annual Vacation", target: target ? Number(target) : 10000 };
  });
  const { user } = useAuth();

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

  const fetchTransactions = useCallback(async () => {
    if (!user?.id) {
      setTransactions([]);
      setLoading(false);
      return;
    }
    
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
        setTransactions(mappedCached);
        setLoading(false);
      }
    } catch (cacheErr) {
      console.warn('[Cache] Error loading cached transactions:', cacheErr);
    }

    // 2. Fetch latest in background
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          profiles:member_id ( name )
        `)
        .eq('member_id', user.id)
        .order('date', { ascending: false });

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
          // SMS source fields
          source: tx.source || 'manual',
          bankName: tx.bank_name || null,
          merchantName: tx.merchant_name || null,
          smsConfidence: tx.sms_confidence || null,
          smsReference: tx.sms_reference || null,
        };
      });

      setTransactions(mapped);
      
      // Update cache
      await cacheTransactions(mapped);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions, user]);

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
          profiles:member_id ( name )
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

      setTransactions(prev => [newTx, ...prev]);
    } catch (err) {
      console.error('Error adding transaction:', err);
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

  // ── SMS Transaction Auto-Add ──────────────────────────────────────────────
  const addSmsTransaction = useCallback(async (parsedSms: any) => {
    if (!user?.id) return;
    try {
      // Build the insert payload
      const insertData = {
        amount: parsedSms.amount,
        category: parsedSms.suggestedCategory || 'Other',
        type: parsedSms.transactionType === 'credit' ? 'income' : 'expense',
        date: parsedSms.smsDate ? parsedSms.smsDate.split('T')[0] : new Date().toISOString().split('T')[0],
        notes: `SMS: ${parsedSms.bankName || ''}${parsedSms.merchantName ? ' • ' + parsedSms.merchantName : ''}`,
        member_id: user.id,
        proof_url: null,
        source: 'sms',
        bank_name: parsedSms.bankName || null,
        merchant_name: parsedSms.merchantName || null,
        sms_confidence: parsedSms.confidence || null,
        sms_reference: parsedSms.referenceNumber || null,
      };

      // If we have a reference number, use upsert to avoid duplicate from background sync
      const query = parsedSms.referenceNumber
        ? supabase.from('transactions').upsert(insertData, {
            onConflict: 'sms_reference',
            ignoreDuplicates: true,
          })
        : supabase.from('transactions').insert(insertData);

      const { data, error } = await query
        .select('*, profiles:member_id ( name )')
        .single();

      if (error) {
        // Code 23505 = unique violation (duplicate) — not an error for us
        if (error.code === '23505') {
          console.log('[SMS] Duplicate transaction prevented by DB constraint');
          return;
        }
        throw error;
      }

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

      setTransactions(prev => [newTx, ...prev]);
      console.log('[SMS] Auto-added transaction:', newTx.amount, newTx.category);
    } catch (err) {
      console.error('[SMS] Error auto-adding transaction:', err);
    }
  }, [user?.id]);

  // Initialize lastResetDate logic
  useEffect(() => {
    const today = new Date();
    const currentMonthKey = `${today.getFullYear()}-${today.getMonth() + 1}`;
    const lastResetDate = localStorage.getItem('msfamily_last_reset_date');
    if (lastResetDate !== currentMonthKey) {
      localStorage.setItem('msfamily_last_reset_date', currentMonthKey);
    }
  }, []);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

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
    t.date === new Date().toISOString().split('T')[0]
  ).length;

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
    }}>
      {children}
    </FinanceContextProvider>
  );
};
