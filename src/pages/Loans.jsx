import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Banknote,
  HandCoins,
  Wallet,
  ArrowRightLeft,
  Search,
  Plus,
  X,
  CheckCircle2,
  Clock,
  User,
  Calendar,
  AlertCircle,
  Inbox,
} from 'lucide-react';

// ============================================================================
// Animation variants
// ============================================================================
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

// ============================================================================
// Main Component
// ============================================================================

export default function Loans() {
  const { user } = useAuth();
  const [loans, setLoans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all, active, settled, lent, borrowed
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    person: '',
    type: 'lent',
    loan_category: 'Standard', // Standard, EMI, Weekly Interest
    interest_rate: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    notes: '',
  });

  // Fetch loans from Supabase
  useEffect(() => {
    async function fetchLoans() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('loans')
          .select('*')
          .order('date', { ascending: false });

        if (error) throw error;
        setLoans(data || []);
      } catch (err) {
        console.error('Error fetching loans:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLoans();
  }, [user]);

  // Handle Due Date Notifications
  useEffect(() => {
    if ('Notification' in window) {
      Notification.requestPermission();
    }

    const checkDueDates = () => {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const upcomingLoans = loans.filter((loan) => {
        if (loan.status !== 'active' || !loan.dueDate) return false;

        const dueDate = new Date(loan.dueDate);
        const timeDiff = dueDate.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

        // Alert if due date is within the next 2 days (including today)
        return daysDiff >= 0 && daysDiff <= 2;
      });

      const lastNotified = localStorage.getItem('ms_family_last_notification');
      const todayStr = today.toISOString().split('T')[0];

      // Only notify once per day to prevent spam
      if (upcomingLoans.length > 0 && lastNotified !== todayStr) {
        upcomingLoans.forEach(loan => {
          const actionText = loan.type === 'lent' ? `receive ₹${loan.amount} from` : `pay ₹${loan.amount} to`;
          new Notification('Family Finance Reminder 🔔', {
            body: `Upcoming due date! You need to ${actionText} ${loan.person}.`,
            icon: '/mslogo.png'
          });
        });
        localStorage.setItem('ms_family_last_notification', todayStr);
      }
    };

    const timeoutId = setTimeout(checkDueDates, 2000);
    return () => clearTimeout(timeoutId);
  }, [loans]);

  // Derived Stats
  const stats = useMemo(() => {
    const activeLoans = loans.filter((l) => l.status === 'active');
    const totalLent = activeLoans.filter((l) => l.type === 'lent').reduce((acc, curr) => acc + Number(curr.amount), 0);
    const totalBorrowed = activeLoans.filter((l) => l.type === 'borrowed').reduce((acc, curr) => acc + Number(curr.amount), 0);
    const net = totalLent - totalBorrowed;
    return { totalLent, totalBorrowed, net, activeCount: activeLoans.length };
  }, [loans]);

  // Filtered list
  const filteredLoans = useMemo(() => {
    let result = [...loans];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) => l.person.toLowerCase().includes(q) || l.notes.toLowerCase().includes(q)
      );
    }

    switch (filter) {
      case 'active':
        result = result.filter((l) => l.status === 'active');
        break;
      case 'settled':
        result = result.filter((l) => l.status === 'settled');
        break;
      case 'lent':
        result = result.filter((l) => l.type === 'lent');
        break;
      case 'borrowed':
        result = result.filter((l) => l.type === 'borrowed');
        break;
      case 'emi':
        result = result.filter((l) => l.loan_category === 'EMI');
        break;
      case 'weekly':
        result = result.filter((l) => l.loan_category === 'Weekly Finance');
        break;
      default:
        break;
    }

    // Sort by date (newest first), but keep active ones on top
    result.sort((a, b) => {
      if (a.status === 'active' && b.status === 'settled') return -1;
      if (a.status === 'settled' && b.status === 'active') return 1;
      return new Date(b.date) - new Date(a.date);
    });

    return result;
  }, [loans, searchQuery, filter]);

  // Handlers
  const handleAddLoan = async (e) => {
    e.preventDefault();
    if (!formData.person || !formData.amount || !formData.date || !user) return;

    setIsSubmitting(true);
    try {
      const newLoanData = {
        person: formData.person,
        type: formData.type,
        loan_category: formData.loan_category,
        interest_rate: formData.loan_category !== 'Standard' && formData.interest_rate ? Number(formData.interest_rate) : null,
        amount: Number(formData.amount),
        date: formData.date,
        due_date: formData.dueDate || null,
        notes: formData.notes,
        status: 'active',
        user_id: user.id
      };

      const { data, error } = await supabase
        .from('loans')
        .insert([newLoanData])
        .select()
        .single();

      if (error) throw error;

      setLoans([data, ...loans]);
      setShowAddModal(false);
      setFormData({
        person: '',
        type: 'lent',
        loan_category: 'Standard',
        interest_rate: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        dueDate: '',
        notes: '',
      });
    } catch (err) {
      console.error('Error adding loan:', err);
      alert('Failed to save loan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSettle = async (id) => {
    try {
      const { error } = await supabase
        .from('loans')
        .update({ status: 'settled' })
        .eq('id', id);

      if (error) throw error;
      setLoans(loans.map((l) => (l.id === id ? { ...l, status: 'settled' } : l)));
    } catch (err) {
      console.error('Error settling loan:', err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this record entirely?')) {
      try {
        const { error } = await supabase
          .from('loans')
          .delete()
          .eq('id', id);

        if (error) throw error;
        setLoans(loans.filter((l) => l.id !== id));
      } catch (err) {
        console.error('Error deleting loan:', err);
      }
    }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
      {/* Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-sm text-slate-500 mt-0.5">Track money given or taken</h2>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> New Record
        </button>
      </motion.div>

      {/* KPI Stats */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Lent (To Receive) */}
        <div className="glass-panel p-5 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-emerald-500/20 blur-xl transition-all duration-500 opacity-50 group-hover:opacity-100" />
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-500">
              <Banknote size={20} />
            </div>
            <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-widest">
              To Receive (Lent)
            </p>
          </div>
          <p className="text-3xl font-black font-sans text-emerald-600 relative z-10">
            ₹{stats.totalLent.toLocaleString()}
          </p>
        </div>

        {/* Total Borrowed (To Pay) */}
        <div className="glass-panel p-5 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-rose-500/20 blur-xl transition-all duration-500 opacity-50 group-hover:opacity-100" />
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className="p-2 bg-rose-50 rounded-xl text-rose-500">
              <HandCoins size={20} />
            </div>
            <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-widest">
              To Pay (Borrowed)
            </p>
          </div>
          <p className="text-3xl font-black font-sans text-rose-600 relative z-10">
            ₹{stats.totalBorrowed.toLocaleString()}
          </p>
        </div>

        {/* Net Balance */}
        <div className="glass-panel p-5 relative overflow-hidden group">
          <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full blur-xl transition-all duration-500 opacity-50 group-hover:opacity-100 ${stats.net >= 0 ? 'bg-indigo-500/20' : 'bg-rose-500/20'
            }`} />
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className={`p-2 rounded-xl border ${stats.net >= 0 ? 'bg-indigo-50 text-indigo-500 border-indigo-100' : 'bg-rose-50 text-rose-500 border-rose-100'
              }`}>
              <Wallet size={20} />
            </div>
            <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-widest">
              Net Balance
            </p>
          </div>
          <p className={`text-3xl font-black font-sans relative z-10 ${stats.net >= 0 ? 'text-indigo-600' : 'text-rose-600'
            }`}>
            {stats.net >= 0 ? '+' : ''}₹{stats.net.toLocaleString()}
          </p>
        </div>
      </motion.div>

      {/* Main List Section */}
      <motion.div variants={item} className="glass-panel overflow-hidden">
        {/* Controls */}
        <div className="p-4 border-b border-slate-200/60 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search people..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
            />
          </div>
          <div className="flex overflow-x-auto gap-2 pb-1 sm:pb-0 scrollbar-hide">
            {[
              { id: 'all', label: 'All' },
              { id: 'active', label: 'Active' },
              { id: 'settled', label: 'Settled' },
              { id: 'lent', label: 'Lent' },
              { id: 'borrowed', label: 'Borrowed' },
              { id: 'emi', label: '📅 EMI' },
              { id: 'weekly', label: '📆 Weekly' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${filter === f.id
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="divide-y divide-slate-100">
          {isLoading ? (
            <div className="py-12 flex justify-center text-slate-400">Loading records...</div>
          ) : (
            <AnimatePresence initial={false}>
              {filteredLoans.length === 0 ? (
                <div className="py-16 text-center text-slate-500 flex flex-col items-center">
                  <Inbox size={48} className="opacity-30 mb-4" />
                  <p className="text-sm font-medium">No records found tracking debts or loans.</p>
                  <button onClick={() => setShowAddModal(true)} className="mt-4 text-xs font-bold text-primary-500 hover:text-primary-600">
                    + Add First Record
                  </button>
                </div>
              ) : (
                filteredLoans.map((loan) => {
                  const isLent = loan.type === 'lent';
                  const isSettled = loan.status === 'settled';

                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      key={loan.id}
                      className={`p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-center justify-between transition-colors ${isSettled ? 'bg-slate-50/50 grayscale-[0.3] opacity-75' : 'hover:bg-slate-50'
                        }`}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border ${isSettled
                          ? 'bg-slate-100 text-slate-400 border-slate-200'
                          : isLent
                            ? 'bg-emerald-50 text-emerald-500 border-emerald-100 shadow-emerald-500/10'
                            : 'bg-rose-50 text-rose-500 border-rose-100 shadow-rose-500/10'
                          }`}>
                          {isSettled ? <CheckCircle2 size={24} /> : isLent ? <ArrowRightLeft size={20} className="rotate-45" /> : <ArrowRightLeft size={20} className="-rotate-45" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`text-base font-bold truncate ${isSettled ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-900'}`}>
                              {loan.person}
                            </h3>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${isSettled
                              ? 'bg-slate-200 text-slate-600'
                              : isLent
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-rose-100 text-rose-700'
                              }`}>
                              {isSettled ? 'Settled' : isLent ? 'You Lent' : 'You Borrowed'}
                            </span>
                            {loan.loan_category && loan.loan_category !== 'Standard' && (
                              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                loan.loan_category === 'EMI'
                                  ? 'bg-violet-100 text-violet-700 border border-violet-200'
                                  : 'bg-amber-100 text-amber-700 border border-amber-200'
                              }`}>
                                {loan.loan_category === 'EMI' ? '📅 EMI' : '📆 Weekly'}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><Calendar size={12} /> {loan.date}</span>
                            {loan.due_date && !isSettled && (
                              <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/50">
                                <AlertCircle size={10} /> Due: {loan.due_date}
                              </span>
                            )}
                            {loan.notes && <span className="truncate max-w-[200px] border-l border-slate-300 pl-2">{loan.notes}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-6 sm:pl-4 sm:border-l border-slate-100">
                        <div className="text-left sm:text-right">
                          <p className={`text-xl font-black font-sans ${isSettled ? 'text-slate-400' : isLent ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                            ₹{loan.amount.toLocaleString()}
                          </p>
                          {loan.interest_rate > 0 && (
                            <p className="text-[10px] font-bold text-violet-500 mt-0.5">
                              {loan.interest_rate}% interest
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {!isSettled && (
                            <button
                              onClick={() => handleSettle(loan.id)}
                              className="bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
                            >
                              Settle
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(loan.id)}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                            title="Delete Record"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          )}
        </div>
      </motion.div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative border border-slate-200"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowAddModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <X size={18} />
              </button>

              <h2 className="text-xl font-black text-slate-900 mb-6">Record Loan / Debt</h2>

              <form onSubmit={handleAddLoan} className="space-y-4 relative z-10">
                {/* Type Selection */}
                <div className="flex p-1 bg-slate-100 rounded-xl gap-1">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'lent' })}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all ${formData.type === 'lent'
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
                      }`}
                  >
                    <ArrowRightLeft size={14} className="rotate-45" /> I Lent Money
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'borrowed' })}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all ${formData.type === 'borrowed'
                      ? 'bg-rose-500 text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
                      }`}
                  >
                    <ArrowRightLeft size={14} className="-rotate-45" /> I Borrowed
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest pl-1">Person Name</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={formData.person}
                      onChange={(e) => setFormData({ ...formData, person: e.target.value })}
                      placeholder="e.g. John Doe"
                      className="input-field !pl-9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest pl-1">Loan Label</label>
                    <div className="relative">
                      <select
                        value={formData.loan_category}
                        onChange={(e) => setFormData({ ...formData, loan_category: e.target.value })}
                        className="input-field !py-2.5 appearance-none font-semibold text-sm"
                      >
                        <option value="Standard">Standard Split</option>
                        <option value="EMI">Monthly EMI</option>
                        <option value="Weekly Finance">Weekly Lenture</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest pl-1">Amount (₹)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-sans">₹</span>
                      <input
                        type="number"
                        required
                        min="1"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="0.00"
                        className="input-field !pl-9 font-sans font-bold !py-2.5"
                      />
                    </div>
                  </div>
                </div>

                {/* Show dynamic Interest Rate if it's an EMI or Weekly Loan */}
                <AnimatePresence>
                  {formData.loan_category !== 'Standard' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-1.5 overflow-hidden"
                    >
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest pl-1">Interest Rate (%)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-sans">%</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.interest_rate}
                          onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                          placeholder="e.g. 1.5"
                          className="input-field !pl-9 font-sans font-bold"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest pl-1">Date Given</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="input-field !py-2.5"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest pl-1 flex items-center gap-1">Due Date <span className="text-[8px] font-normal lowercase tracking-normal text-slate-400">(opt)</span></label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="input-field !py-2.5"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest pl-1">Short Note</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="e.g. Dinner bill split"
                    className="input-field"
                  />
                </div>

                <button type="submit" disabled={isSubmitting} className="w-full btn-primary py-3 !mt-6 shadow-xl shadow-primary-500/20 disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : 'Save Record'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
