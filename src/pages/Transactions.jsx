import React, { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  ArrowUpDown,
  Trash2,
  Loader2,
  Inbox,
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Calendar,
  Tag,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  X,
  SlidersHorizontal,
  BarChart3,
  Clock,
  Wallet,
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

const ITEMS_PER_PAGE = 10;

const ALL_CATEGORIES = [
  'Food', 'Travel', 'Bills', 'Entertainment', 'Shopping',
  'Health', 'Education', 'Groceries', 'Salary', 'Freelance',
  'Investment', 'Gift', 'Bonus', 'Other',
];

// ============================================================================
// Main Transactions Component
// ============================================================================
export default function Transactions() {
  const { transactions = [], deleteTransaction } = useFinance();
  const { user } = useAuth();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all | income | expense
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc'); // date-desc | date-asc | amount-desc | amount-asc
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingId, setDeletingId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [lightboxImg, setLightboxImg] = useState(null);

  // Filtered & sorted transactions
  const processedTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (tx) =>
          tx.category?.toLowerCase().includes(q) ||
          tx.notes?.toLowerCase().includes(q) ||
          tx.memberName?.toLowerCase().includes(q) ||
          String(tx.amount).includes(q)
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((tx) => tx.type === typeFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((tx) => tx.category === categoryFilter);
    }

    // Date range filter
    if (dateRange.from) {
      filtered = filtered.filter((tx) => tx.date >= dateRange.from);
    }
    if (dateRange.to) {
      filtered = filtered.filter((tx) => tx.date <= dateRange.to);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return new Date(a.created_at || a.date) - new Date(b.created_at || b.date);
        case 'amount-desc':
          return Number(b.amount) - Number(a.amount);
        case 'amount-asc':
          return Number(a.amount) - Number(b.amount);
        case 'date-desc':
        default:
          return new Date(b.created_at || b.date) - new Date(a.created_at || a.date);
      }
    });

    return filtered;
  }, [transactions, searchQuery, typeFilter, categoryFilter, sortBy, dateRange]);

  // Stats for filtered results
  const stats = useMemo(() => {
    const income = processedTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const expense = processedTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const avgAmount = processedTransactions.length > 0 ? (income + expense) / processedTransactions.length : 0;
    const uniqueCategories = new Set(processedTransactions.map((t) => t.category)).size;
    return { income, expense, net: income - expense, count: processedTransactions.length, avgAmount, uniqueCategories };
  }, [processedTransactions]);

  // Pagination
  const totalPages = Math.ceil(processedTransactions.length / ITEMS_PER_PAGE);
  const paginatedTx = useMemo(
    () => processedTransactions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [processedTransactions, currentPage]
  );

  // Reset page when filters change
  useMemo(() => setCurrentPage(1), [searchQuery, typeFilter, categoryFilter, sortBy, dateRange]);

  // Delete handler
  const handleDelete = useCallback(
    async (id) => {
      if (window.confirm('Delete this transaction permanently?')) {
        setDeletingId(id);
        try {
          await deleteTransaction(id);
        } catch (err) {
          alert('Failed to delete. Try again.');
        } finally {
          setDeletingId(null);
        }
      }
    },
    [deleteTransaction]
  );

  // Export CSV
  const handleExport = useCallback(() => {
    const header = 'Date,Type,Category,Amount,Member,Notes';
    const rows = processedTransactions.map(
      (t) => `${t.date},${t.type},${t.category},${t.amount},${t.memberName},${t.notes || ''}`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions_export.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [processedTransactions]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setCategoryFilter('all');
    setSortBy('date-desc');
    setDateRange({ from: '', to: '' });
  };

  const hasActiveFilters = searchQuery || typeFilter !== 'all' || categoryFilter !== 'all' || sortBy !== 'date-desc' || dateRange.from || dateRange.to;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
      {/* Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Transactions</h1>
          <p className="text-sm text-slate-500 mt-0.5">{stats.count} records found</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-glass text-xs gap-1.5 ${showFilters ? '!bg-primary-500/10 !border-primary-500/30 !text-primary-500' : ''}`}
          >
            <SlidersHorizontal size={14} />
            Filters
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
            )}
          </button>
          <button onClick={handleExport} className="btn-glass text-xs gap-1.5" disabled={processedTransactions.length === 0}>
            <Download size={14} />
            Export
          </button>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-panel p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">
            <BarChart3 size={12} /> Total Count
          </div>
          <p className="text-xl font-black text-slate-900 font-sans">{stats.count}</p>
        </div>
        <div className="glass-panel p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-emerald-500 text-[10px] font-bold uppercase tracking-widest mb-1">
            <TrendingUp size={12} /> Income
          </div>
          <p className="text-xl font-black text-emerald-600 font-sans">₹{stats.income.toLocaleString()}</p>
        </div>
        <div className="glass-panel p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-rose-500 text-[10px] font-bold uppercase tracking-widest mb-1">
            <TrendingDown size={12} /> Expense
          </div>
          <p className="text-xl font-black text-rose-600 font-sans">₹{stats.expense.toLocaleString()}</p>
        </div>
        <div className="glass-panel p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-violet-500 text-[10px] font-bold uppercase tracking-widest mb-1">
            <Wallet size={12} /> Net
          </div>
          <p className={`text-xl font-black font-sans ${stats.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {stats.net >= 0 ? '+' : ''}₹{stats.net.toLocaleString()}
          </p>
        </div>
      </motion.div>

      {/* Search Bar */}
      <motion.div variants={item} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by category, notes, amount, or member..."
          className="input-field !pl-11 !pr-10"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-slate-200 text-slate-400 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </motion.div>

      {/* Expandable Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-panel p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Filter size={14} /> Advanced Filters
                </h3>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-xs text-primary-500 hover:text-primary-600 font-semibold">
                    Clear All
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Type Filter */}
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 block">Type</label>
                  <div className="flex p-1 bg-slate-100 rounded-xl gap-1">
                    {['all', 'income', 'expense'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setTypeFilter(t)}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                          typeFilter === t
                            ? 'bg-white shadow-sm text-slate-900'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 block">Category</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="input-field !pl-3 !py-2.5 text-xs"
                  >
                    <option value="all">All Categories</option>
                    {ALL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Sort */}
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 block">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="input-field !pl-3 !py-2.5 text-xs"
                  >
                    <option value="date-desc">Newest First</option>
                    <option value="date-asc">Oldest First</option>
                    <option value="amount-desc">Highest Amount</option>
                    <option value="amount-asc">Lowest Amount</option>
                  </select>
                </div>

                {/* Date Range */}
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 block">Date Range</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={dateRange.from}
                      onChange={(e) => setDateRange((p) => ({ ...p, from: e.target.value }))}
                      className="input-field !pl-3 !py-2.5 text-xs flex-1"
                    />
                    <input
                      type="date"
                      value={dateRange.to}
                      onChange={(e) => setDateRange((p) => ({ ...p, to: e.target.value }))}
                      className="input-field !pl-3 !py-2.5 text-xs flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transaction List */}
      <motion.div variants={item} className="glass-panel overflow-hidden">
        {/* Table Header */}
        <div className="hidden sm:grid grid-cols-12 gap-3 px-5 py-3 border-b border-slate-200/60 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
          <div className="col-span-1">Type</div>
          <div className="col-span-3">Category</div>
          <div className="col-span-2">Amount</div>
          <div className="col-span-2">Member</div>
          <div className="col-span-2">Date</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {/* Transaction Rows */}
        <div className="divide-y divide-slate-100">
          <AnimatePresence initial={false}>
            {paginatedTx.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <Inbox size={40} className="mx-auto opacity-30 mb-3" />
                <p className="text-sm font-medium">No transactions match your filters</p>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="mt-3 text-xs text-primary-500 hover:text-primary-600 font-semibold">
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              paginatedTx.map((tx) => (
                <motion.div
                  key={tx.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex flex-col sm:grid sm:grid-cols-12 gap-1 sm:gap-3 px-4 sm:px-5 py-3.5 sm:py-4 hover:bg-slate-50/80 transition-all duration-200 group cursor-pointer sm:items-center"
                  onClick={() => setSelectedTx(tx)}
                >
                  <div className="flex justify-between items-center w-full sm:col-span-4">
                    {/* Category Mobile+Desktop */}
                    <div className="flex items-center gap-3 w-full">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        tx.type === 'income' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'
                      }`}>
                        {tx.type === 'income' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-800 truncate">{tx.category}</p>
                        <p className="text-[11px] text-slate-400 truncate max-w-[200px] sm:hidden mt-0.5">
                          {tx.memberName} • {tx.date}
                        </p>
                        {tx.notes && <p className="text-[11px] text-slate-400 truncate max-w-[180px] hidden sm:block">{tx.notes}</p>}
                      </div>
                    </div>
                    {/* Amount Mobile */}
                    <div className="sm:hidden text-right pl-2 shrink-0">
                       <span className={`font-black text-sm font-sans ${
                        tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {tx.type === 'income' ? '+' : '-'}₹{Number(tx.amount).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Amount Desktop */}
                  <div className="hidden sm:block sm:col-span-2">
                    <span className={`font-bold text-sm font-sans ${
                      tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {tx.type === 'income' ? '+' : '-'}₹{Number(tx.amount).toLocaleString()}
                    </span>
                  </div>

                  {/* Member Desktop */}
                  <div className="col-span-2 hidden sm:block">
                    <span className="text-sm text-slate-600">{tx.memberName}</span>
                  </div>

                  {/* Date & Time Desktop */}
                  <div className="col-span-2 hidden sm:flex flex-col justify-center">
                    <span className="text-sm text-slate-600 font-semibold">{tx.date}</span>
                    <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-0.5">
                      {new Date(tx.created_at || tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Actions Desktop */}
                  <div className="hidden sm:flex sm:col-span-2 justify-end gap-1.5 focus-within:opacity-100">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedTx(tx); }}
                      className="p-2 rounded-lg text-slate-400 hover:text-primary-500 hover:bg-primary-50 transition-all opacity-0 group-hover:opacity-100"
                      aria-label="View details"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(tx.id); }}
                      disabled={deletingId === tx.id}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                      aria-label="Delete transaction"
                    >
                      {deletingId === tx.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200/60">
            <span className="text-xs text-slate-500">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, currentPage - 2);
                const page = start + i;
                if (page > totalPages) return null;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                      currentPage === page ? 'bg-primary-500 text-white shadow-sm' : 'hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30 transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Transaction Detail Modal */}
      <AnimatePresence>
        {selectedTx && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedTx(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto hide-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedTx(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <X size={18} />
              </button>

              <div className="space-y-5">
                {/* Header */}
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                    selectedTx.type === 'income' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'
                  }`}>
                    {selectedTx.type === 'income' ? <ArrowUpRight size={28} /> : <ArrowDownRight size={28} />}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">{selectedTx.category}</h3>
                    <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      selectedTx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}>{selectedTx.type}</span>
                  </div>
                </div>

                {/* Amount */}
                <div className="text-center py-4 bg-slate-50 rounded-xl">
                  <p className={`text-4xl font-black font-sans ${
                    selectedTx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {selectedTx.type === 'income' ? '+' : '-'}₹{Number(selectedTx.amount).toLocaleString()}
                  </p>
                </div>

                {/* Details */}
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-500 flex items-center gap-2"><Calendar size={14} /> Date</span>
                    <span className="text-sm font-semibold text-slate-800">{selectedTx.date}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-500 flex items-center gap-2"><Tag size={14} /> Category</span>
                    <span className="text-sm font-semibold text-slate-800">{selectedTx.category}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-500 flex items-center gap-2"><Clock size={14} /> Member</span>
                    <span className="text-sm font-semibold text-slate-800">{selectedTx.memberName}</span>
                  </div>
                  {selectedTx.notes && (
                    <div className="py-2">
                      <span className="text-sm text-slate-500 block mb-1">Notes</span>
                      <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl">{selectedTx.notes}</p>
                    </div>
                  )}
                  {selectedTx.proofUrl && (
                    <div className="py-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-500 block">Receipt Proof</span>
                        <button
                          onClick={() => setLightboxImg(selectedTx.proofUrl)}
                          className="text-xs font-bold text-primary-500 hover:text-primary-600 flex items-center gap-1 bg-primary-50 px-2 py-1 rounded-lg"
                        >
                          <Eye size={12} /> View Full
                        </button>
                      </div>
                      <div 
                        className="relative rounded-xl overflow-hidden cursor-pointer group border border-slate-200 h-40"
                        onClick={() => setLightboxImg(selectedTx.proofUrl)}
                      >
                        <img src={selectedTx.proofUrl} alt="Receipt" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                        <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors flex items-center justify-center">
                          <Eye className="text-white opacity-0 group-hover:opacity-100 drop-shadow-md" size={24} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Delete Action */}
                <button
                  onClick={() => { handleDelete(selectedTx.id); setSelectedTx(null); }}
                  className="w-full py-3 text-sm font-bold text-rose-500 bg-rose-50 rounded-xl hover:bg-rose-100 transition-all"
                >
                  Delete Transaction
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reciept Image Lightbox Modal */}
      {createPortal(
        <AnimatePresence>
          {lightboxImg && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLightboxImg(null)}
              className="fixed inset-0 z-[9999] bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 md:p-8"
            >
              <button
                onClick={() => setLightboxImg(null)}
                className="absolute top-4 right-4 md:top-6 md:right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-50 backdrop-blur-md"
              >
                <X size={24} />
              </button>
              <motion.img
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                src={lightboxImg}
                alt="Receipt Full View"
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
}
