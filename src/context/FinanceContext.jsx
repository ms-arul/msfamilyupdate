import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const FinanceContext = createContext();

export const useFinance = () => useContext(FinanceContext);

export const FinanceProvider = ({ children }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [budgetLimit, setBudgetLimit] = useState(3000);
  const [savingsGoal, setSavingsGoal] = useState({ name: "Annual Vacation", target: 10000 });
  const { user } = useAuth();

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch transactions joined with profile name
      let query = supabase
        .from('transactions')
        .select(`
          *,
          profiles:member_id ( name )
        `)
        .order('date', { ascending: false });

      // STRICT ISOLATION: Only fetch transactions specifically belonging to the logged in user
      if (user?.id) {
        query = query.eq('member_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mapped = (data || []).map(tx => ({
        id: tx.id,
        amount: Number(tx.amount),
        category: tx.category,
        type: tx.type,
        date: tx.date,
        notes: tx.notes,
        memberId: tx.member_id,
        memberName: tx.profiles?.name || 'Unknown',
        proofUrl: tx.proof_url || null,
        created_at: tx.created_at,
      }));

      setTransactions(mapped);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      // Fallback to empty if Supabase tables don't exist yet
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions, user]);

  const addTransaction = async (transaction) => {
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

      const newTx = {
        id: data.id,
        amount: Number(data.amount),
        category: data.category,
        type: data.type,
        date: data.date,
        notes: data.notes,
        memberId: data.member_id,
        memberName: data.profiles?.name || 'Unknown',
        proofUrl: data.proof_url || null,
        created_at: data.created_at,
      };

      setTransactions(prev => [newTx, ...prev]);
    } catch (err) {
      console.error('Error adding transaction:', err);
    }
  };

  const deleteTransaction = async (id) => {
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

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const balance = totalIncome - totalExpense;

  // Personal isolated stats
  const personalTransactions = transactions.filter(t => t.memberId === user?.id);
  const personalIncome = personalTransactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const personalExpense = personalTransactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const personalBalance = personalIncome - personalExpense;

  return (
    <FinanceContext.Provider value={{
      // Global Family Stats
      transactions,
      totalIncome,
      totalExpense,
      balance,
      
      // Personal Stats
      personalTransactions,
      personalIncome,
      personalExpense,
      personalBalance,

      // Actions & Config
      addTransaction,
      deleteTransaction,
      budgetLimit,
      savingsGoal,
      loading,
      refetch: fetchTransactions,
    }}>
      {children}
    </FinanceContext.Provider>
  );
};
