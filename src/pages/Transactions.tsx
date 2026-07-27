import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useFinance } from '../context/FinanceContext';
import { downloadBase64File } from '../utils/downloadHelper';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useFamily } from '../context/FamilyContext';
import { invalidateStorageCache } from '../utils/storageService';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useSubscription } from '../context/SubscriptionContext';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Search,
  Filter,
  Trash2,
  Loader2,
  Inbox,
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Calendar,
  Tag,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Pencil,
  X,
  SlidersHorizontal,
  BarChart3,
  Clock,
  Wallet,
  CheckCircle2,
  AlertCircle,
  MessageSquareText,
  Smartphone,
  FileText,
  FileSpreadsheet,
} from 'lucide-react';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import { Transaction } from '../types/finance';
import { staggerContainer, staggerItem, listItemVariants } from '../utils/animations';
import { registerBackButtonHandler } from '../utils/backButtonManager';

// ============================================================================
// Custom Hooks
// ============================================================================
const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) setMatches(media.matches);
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);
  return matches;
};

const useDebounce = <T,>(value: T, delay = 300): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
};

// ============================================================================
// Types
// ============================================================================
interface ToastProps {
  message: string;
  visible: boolean;
  icon?: any;
  type?: 'success' | 'error' | 'info';
}

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  count?: number;
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

interface FilterChipsProps {
  filters: Array<{ type: string; label: string; value: string }>;
  onRemove: (value: string) => void;
  onClearAll: () => void;
}

interface GroupedTransaction {
  dateLabel: string;
  transactions: Transaction[];
}

// ============================================================================
// Animation variants
// ============================================================================
const container = staggerContainer(0.05, 0.1);
const item = staggerItem;

const ALL_CATEGORIES = [
  'Food',
  'Travel',
  'Bills',
  'Entertainment',
  'Shopping',
  'Health',
  'Education',
  'Groceries',
  'Salary',
  'Freelance',
  'Investment',
  'Gift',
  'Bonus',
  'Other',
];

// ============================================================================
// Toast Notification
// ============================================================================
const Toast: React.FC<ToastProps> = ({ message, visible, icon: ToastIcon, type = 'success' }) => {
  const colors = {
    success: 'bg-emerald-500/10 text-emerald-500',
    error: 'bg-rose-500/10 text-rose-500',
    info: 'bg-blue-500/10 text-blue-500',
  };
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="toast"
          initial={{ opacity: 0, scale: 0.8, x: '-50%', y: '-50%' }}
          animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
          exit={{ opacity: 0, scale: 0.8, x: '-50%', y: '-50%' }}
          className="fixed top-1/2 left-1/2 z-[200] bg-white/90 dark:bg-[#12121f]/90 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 text-slate-800 dark:text-slate-100 px-6 py-4 rounded-3xl shadow-xl flex flex-col items-center gap-3 text-center min-w-[200px] max-w-[80vw]"
        >
          <div className={`w-12 h-12 rounded-2xl ${colors[type]} flex items-center justify-center`}>
            {ToastIcon ? <ToastIcon size={24} /> : <CheckCircle2 size={24} />}
          </div>
          <p className="text-base font-bold leading-tight">{message}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============================================================================
// Delete Confirmation Modal
// ============================================================================
const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  count = 1,
}) => {
  if (!isOpen) return null;
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="apple-glass-modal w-full max-w-sm p-7 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 dark:bg-rose-900/30 flex items-center justify-center mb-5">
            <AlertCircle size={32} className="text-rose-500" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">
            {count > 1 ? `Delete ${count} Items?` : 'Delete Transaction?'}
          </h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-8">
            {count > 1
              ? `Are you sure you want to permanently remove these ${count} selected transactions? This action is irreversible.`
              : 'Are you sure you want to delete this transaction? All related data will be permanently removed.'}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-2xl border border-white/20 dark:border-white/5 bg-white/20 dark:bg-black/20 text-slate-600 dark:text-slate-300 font-bold hover:bg-white/30 dark:hover:bg-black/30 transition-all active:scale-95 backdrop-blur-md"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 py-3.5 rounded-2xl bg-rose-500 text-white font-bold hover:bg-rose-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-rose-500/25 active:scale-95 border border-rose-400/20"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
            Delete
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
};

// ============================================================================
// Pagination Component (mobile friendly)
// ============================================================================
const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-1 px-4 py-4 border-t border-slate-200/60 dark:border-slate-700/60">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 disabled:opacity-30 transition-all"
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </button>
      <div className="flex gap-1.5 items-center">
        {getPageNumbers().map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${currentPage === page
              ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
              : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
          >
            {page}
          </button>
        ))}
      </div>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 disabled:opacity-30 transition-all"
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

// ============================================================================
// Filter Chips
// ============================================================================
const FilterChips: React.FC<FilterChipsProps> = ({ filters, onRemove, onClearAll }) => {
  if (filters.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 items-center px-4 py-2">
      <span className="text-xs text-slate-500 dark:text-slate-400">Active:</span>
      {filters.map((filter) => (
        <span
          key={filter.value}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
        >
          {filter.label}
          <button
            onClick={() => onRemove(filter.value)}
            className="hover:bg-primary-100 dark:hover:bg-primary-800 rounded-full p-0.5"
            aria-label={`Remove filter: ${filter.label}`}
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <button
        onClick={onClearAll}
        className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
      >
        Clear all
      </button>
    </div>
  );
};

// ============================================================================
// Main Transactions Component
// ============================================================================
export default function Transactions() {
  const { transactions = [], deleteTransaction, refetch, loading } = useFinance();
  const { isPremium, setShowUpgradeModal } = useSubscription();
  const { t } = useLanguage();
  const { family } = useFamily();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isMobile = useMediaQuery('(max-width: 640px)');

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date-desc');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>('all'); // 'all' | 'manual' | 'sms'
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('pdf');
  const [exportRange, setExportRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    if (isExportModalOpen) {
      return registerBackButtonHandler('transactions_export_modal', 100, () => {
        setIsExportModalOpen(false);
        return true;
      });
    }
  }, [isExportModalOpen]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

  const [toast, setToast] = useState<{
    message: string;
    visible: boolean;
    icon: any;
    type: 'success' | 'error' | 'info';
  }>({ message: '', visible: false, icon: null, type: 'success' });

  const showToast = useCallback((
    msg: string,
    type: 'success' | 'error' | 'info' = 'success',
    icon: any = null
  ) => {
    setToast({ message: msg, visible: true, icon, type });
    setTimeout(() => setToast({ message: '', visible: false, icon: null, type: 'success' }), 2500);
  }, []);

  // Approve low confidence SMS transaction handler
  const approveSmsTransaction = useCallback(async (txId: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ sms_confidence: 1.0 })
        .eq('id', txId);

      if (!error) {
        showToast(t('SMS transaction verified & approved!'), 'success', CheckCircle2);
        refetch();
      } else {
        showToast(t('Failed to approve transaction'), 'error');
      }
    } catch {
      showToast(t('Error approving transaction'), 'error');
    }
  }, [refetch, showToast, t]);

  // Count unreviewed low-confidence SMS (< 75% confidence)
  const unreviewedSmsCount = useMemo(() => {
    return transactions.filter(tx => 
      (tx.source === 'sms' || tx.smsConfidence !== null) && 
      Number(tx.smsConfidence || 0) < 0.75 && 
      Number(tx.smsConfidence || 0) !== 1.0
    ).length;
  }, [transactions]);

  // Process transactions (deduplicate + filter + sort)
  const processedTransactions = useMemo(() => {
    // Deduplicate by ID (cache + fresh fetch can overlap)
    const seen = new Set<string>();
    let filtered = transactions.filter((tx) => {
      if (!tx.id || seen.has(tx.id)) return false;
      seen.add(tx.id);
      return true;
    });

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (tx) =>
          tx.category?.toLowerCase().includes(q) ||
          tx.notes?.toLowerCase().includes(q) ||
          tx.memberName?.toLowerCase().includes(q) ||
          String(tx.amount).includes(q)
      );
    }
    if (typeFilter !== 'all') filtered = filtered.filter((tx) => tx.type === typeFilter);
    if (categoryFilter !== 'all') filtered = filtered.filter((tx) => tx.category === categoryFilter);
    if (dateRange.from) filtered = filtered.filter((tx) => tx.date >= dateRange.from);
    if (dateRange.to) filtered = filtered.filter((tx) => tx.date <= dateRange.to);

    // Source filter (including low-confidence review filter)
    if (sourceFilter === 'needs-review') {
      filtered = filtered.filter((tx) => 
        (tx.source === 'sms' || tx.smsConfidence !== null) && 
        Number(tx.smsConfidence || 0) < 0.75 && 
        Number(tx.smsConfidence || 0) !== 1.0
      );
    } else if (sourceFilter !== 'all') {
      filtered = filtered.filter((tx) => (tx.source || 'manual') === sourceFilter);
    }

    // Sort with null-safe date handling
    filtered.sort((a, b) => {
      const dateA = a.date || '0000-00-00';
      const dateB = b.date || '0000-00-00';
      switch (sortBy) {
        case 'date-asc': {
          if (dateA !== dateB) return dateA < dateB ? -1 : 1;
          return new Date(a.created_at || a.date || 0).getTime() - new Date(b.created_at || b.date || 0).getTime();
        }
        case 'amount-desc':
          return Number(b.amount) - Number(a.amount);
        case 'amount-asc':
          return Number(a.amount) - Number(b.amount);
        default: {
          // date-desc: newest first
          if (dateA !== dateB) return dateA > dateB ? -1 : 1;
          return new Date(b.created_at || b.date || 0).getTime() - new Date(a.created_at || a.date || 0).getTime();
        }
      }
    });
    return filtered;
  }, [transactions, debouncedSearch, typeFilter, categoryFilter, sortBy, dateRange, sourceFilter]);

  // Stats (Soft reset for current month, unless date filter is active)
  const stats = useMemo(() => {
    let targetTransactions = processedTransactions;

    // If no date filter is explicitly set, default the 4 stat fields to the current month
    if (!dateRange.from && !dateRange.to) {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      targetTransactions = processedTransactions.filter((t) => {
        // Support both explicit month/year properties and date string parsing
        if (t.month && t.year) {
          return t.month === currentMonth && t.year === currentYear;
        }
        const txDate = new Date(t.date);
        return txDate.getMonth() + 1 === currentMonth && txDate.getFullYear() === currentYear;
      });
    }

    const income = targetTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const expense = targetTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

    // Calculate net based on ALL processedTransactions, ignoring the current month restriction.
    // This ensures Net reflects all-time balance for the current filters (or explicit date range).
    const allTimeIncome = processedTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const allTimeExpense = processedTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

    return {
      income,
      expense,
      net: allTimeIncome - allTimeExpense,
      count: targetTransactions.length,
    };
  }, [processedTransactions, dateRange]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(processedTransactions.length / itemsPerPage));

  // Clamp currentPage when totalPages shrinks (e.g. after delete or filter change)
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [currentPage, totalPages]);

  // Use clamped page for slicing to avoid blank pages during the render before the effect fires
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTx = useMemo(
    () => processedTransactions.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage),
    [processedTransactions, safePage, itemsPerPage]
  );

  // Group paginated transactions by date — uses raw date string as key to prevent duplicates
  const groupedTransactions = useMemo<GroupedTransaction[]>(() => {
    if (paginatedTx.length === 0) return [];

    // Compute today/yesterday as ISO date strings for reliable comparison
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const yd = new Date(now);
    yd.setDate(yd.getDate() - 1);
    const yesterdayStr = `${yd.getFullYear()}-${String(yd.getMonth() + 1).padStart(2, '0')}-${String(yd.getDate()).padStart(2, '0')}`;

    // Group by raw date key (maintains insertion order = sort order)
    const groupMap = new Map<string, Transaction[]>();
    for (const tx of paginatedTx) {
      const dateKey = tx.date || (tx.created_at ? tx.created_at.split('T')[0] : todayStr);
      if (!groupMap.has(dateKey)) {
        groupMap.set(dateKey, []);
      }
      groupMap.get(dateKey)!.push(tx);
    }

    // Convert to array with human-readable labels
    const groups: GroupedTransaction[] = [];
    groupMap.forEach((txs, dateKey) => {
      // Safety: skip if somehow empty
      if (txs.length === 0) return;

      let label: string;
      if (dateKey === todayStr) {
        label = 'TODAY';
      } else if (dateKey === yesterdayStr) {
        label = 'YESTERDAY';
      } else {
        // Parse YYYY-MM-DD safely without timezone issues
        const [y, m, d] = dateKey.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
        if (y !== now.getFullYear()) {
          options.year = 'numeric';
        }
        label = dateObj.toLocaleDateString('en-US', options).toUpperCase();
      }

      groups.push({ dateLabel: label, transactions: txs });
    });

    return groups;
  }, [paginatedTx]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, typeFilter, categoryFilter, sortBy, dateRange, sourceFilter]);

  // Listen for global app refresh
  useEffect(() => {
    const handleAppRefresh = () => {
      refetch();
    };
    window.addEventListener('app:refresh', handleAppRefresh);
    return () => {
      window.removeEventListener('app:refresh', handleAppRefresh);
    };
  }, [refetch]);

  // Active filters for chips
  const activeFilters = useMemo(() => {
    const filters = [];
    if (typeFilter !== 'all') filters.push({ type: 'type', label: `Type: ${typeFilter}`, value: typeFilter });
    if (categoryFilter !== 'all') filters.push({ type: 'category', label: `Category: ${categoryFilter}`, value: categoryFilter });
    if (sortBy !== 'date-desc') filters.push({ type: 'sort', label: `Sort: ${sortBy.replace('-', ' ')}`, value: sortBy });
    if (dateRange.from) filters.push({ type: 'date', label: `From: ${dateRange.from}`, value: 'date-from' });
    if (dateRange.to) filters.push({ type: 'date', label: `To: ${dateRange.to}`, value: 'date-to' });
    if (sourceFilter === 'needs-review') {
      filters.push({ type: 'source', label: `Review SMS (<75%)`, value: 'needs-review' });
    } else if (sourceFilter !== 'all') {
      filters.push({ type: 'source', label: `Source: ${sourceFilter.toUpperCase()}`, value: sourceFilter });
    }
    return filters;
  }, [typeFilter, categoryFilter, sortBy, dateRange, sourceFilter]);

  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setCategoryFilter('all');
    setSortBy('date-desc');
    setDateRange({ from: '', to: '' });
    setSourceFilter('all');
  };

  const removeFilter = (value: string) => {
    if (value === typeFilter) setTypeFilter('all');
    else if (value === categoryFilter) setCategoryFilter('all');
    else if (value === sortBy) setSortBy('date-desc');
    else if (value === 'date-from') setDateRange((p) => ({ ...p, from: '' }));
    else if (value === 'date-to') setDateRange((p) => ({ ...p, to: '' }));
    else if (value === 'sms' || value === 'manual' || value === 'needs-review' || value === sourceFilter) setSourceFilter('all');
  };

  // Delete handlers
  const handleSingleDelete = useCallback((id: string) => {
    setTransactionToDelete(id);
    setDeleteModalOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!transactionToDelete) return;

    setDeletingId(transactionToDelete);
    try {
      // Find the transaction object to get its details before deleting
      const tx = transactions.find(t => t.id === transactionToDelete);
      
      // If the transaction has a receipt, delete it from storage first
      if (tx?.proofUrl) {
        try {
          const oldPath = tx.proofUrl.split('/proofs/')[1];
          if (oldPath) {
            await supabase.storage.from('proofs').remove([oldPath]);
          }
        } catch (delErr) {
          console.warn('Failed to delete receipt during transaction deletion:', delErr);
        }
      }

      await deleteTransaction(transactionToDelete);
      
      // Invalidate storage cache
      if (user?.id) {
        invalidateStorageCache(user.id, family?.id);
      }

      showToast(t('Transaction deleted successfully'));
    } catch (err) {
      showToast(t('Failed to delete. Try again.'), 'error');
    } finally {
      setDeletingId(null);
      setDeleteModalOpen(false);
      setTransactionToDelete(null);
    }
  }, [transactionToDelete, deleteTransaction, t, showToast, transactions, user, family]);

  // Export PDF
  const generatePDF = useCallback(async () => {
    if (!exportRange.from || !exportRange.to) {
      showToast(t('Please select both From and To dates'), 'error');
      return;
    }
    setIsGeneratingPDF(true);
    try {
      const doc = new jsPDF();
      const fromDate = new Date(exportRange.from);
      fromDate.setHours(0, 0, 0, 0);
      const toDate = new Date(exportRange.to);
      toDate.setHours(23, 59, 59, 999);
      const filtered = transactions.filter((tx) => {
        if (!tx.date) return false;
        const tDate = new Date(tx.date);
        return tDate >= fromDate && tDate <= toDate;
      });
      if (filtered.length === 0) {
        showToast(t('No transactions found in this date range'), 'error');
        return;
      }
      filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const income = filtered.filter((tx) => tx.type === 'income').reduce((s, tx) => s + Number(tx.amount), 0);
      const expense = filtered.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + Number(tx.amount), 0);
      const net = income - expense;

      doc.setFontSize(22);
      doc.setTextColor(40, 44, 52);
      doc.text('MS Family Finance Hub', 14, 22);
      doc.setFontSize(14);
      doc.setTextColor(100);
      doc.text('Account Statement', 14, 30);
      doc.setFontSize(10);
      doc.text(`Period: ${exportRange.from} to ${exportRange.to}`, 14, 40);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 45);

      doc.setDrawColor(240);
      doc.setFillColor(252, 252, 253);
      doc.roundedRect(14, 55, 182, 25, 3, 3, 'FD');
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text('TOTAL INCOME', 25, 63);
      doc.text('TOTAL EXPENSE', 85, 63);
      doc.text('NET BALANCE', 145, 63);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text(`+Rs. ${income.toLocaleString()}`, 25, 72);
      doc.setTextColor(244, 63, 94);
      doc.text(`-Rs. ${expense.toLocaleString()}`, 85, 72);
      doc.setTextColor(net >= 0 ? 16 : 244, net >= 0 ? 185 : 63, net >= 0 ? 129 : 94);
      doc.text(`${net >= 0 ? '+' : ''}Rs. ${net.toLocaleString()}`, 145, 72);

      autoTable(doc, {
        startY: 90,
        head: [['Date', 'Category', 'Member', 'Type', 'Amount']],
        body: filtered.map((tx) => [
          tx.date,
          tx.category,
          tx.memberName,
          tx.type.toUpperCase(),
          `${tx.type === 'income' ? '+' : '-'}Rs. ${Number(tx.amount).toLocaleString()}`,
        ]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } },
        didParseCell: function (data) {
          if (data.section === 'body' && data.column.index === 4) {
            const val = data.cell.raw as string;
            if (val.includes('+')) data.cell.styles.textColor = [16, 185, 129];
            if (val.includes('-')) data.cell.styles.textColor = [244, 63, 94];
          }
        },
      });
      const pdfDataUri = doc.output('datauristring');
      await downloadBase64File(pdfDataUri, `Transaction_History_${exportRange.from}_to_${exportRange.to}.pdf`);
      showToast(t('PDF Generated Successfully'));
      setIsExportModalOpen(false);
    } catch (err) {
      console.error('PDF Error:', err);
      showToast(t('Failed to generate PDF'), 'error');
    } finally {
      setIsGeneratingPDF(false);
      setIsExportModalOpen(false);
    }
  }, [exportRange, transactions, t, showToast]);

  // Export Excel (.csv sheet format)
  const generateExcel = useCallback(async () => {
    if (!exportRange.from || !exportRange.to) {
      showToast(t('Please select both From and To dates'), 'error');
      return;
    }
    setIsGeneratingPDF(true);
    try {
      const fromDate = new Date(exportRange.from);
      fromDate.setHours(0, 0, 0, 0);
      const toDate = new Date(exportRange.to);
      toDate.setHours(23, 59, 59, 999);
      const filtered = transactions.filter((tx) => {
        if (!tx.date) return false;
        const tDate = new Date(tx.date);
        return tDate >= fromDate && tDate <= toDate;
      });
      if (filtered.length === 0) {
        showToast(t('No transactions found in this date range'), 'error');
        return;
      }
      filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const formatDateForExcel = (dStr: string) => {
        if (!dStr) return '';
        const parts = dStr.split('-');
        if (parts.length === 3) {
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const mIndex = parseInt(parts[1], 10) - 1;
          if (mIndex >= 0 && mIndex < 12) {
            return `${parts[2]} ${months[mIndex]} ${parts[0]}`;
          }
        }
        return dStr;
      };

      // Format CSV for Excel with UTF-8 BOM
      const headers = ['Date', 'Category', 'Description / Merchant', 'Type', 'Amount (INR)', 'Member', 'Source', 'Transaction Notes'];
      const rows = filtered.map(tx => {
        const formattedDate = formatDateForExcel(tx.date);
        const category = (tx.category || '').replace(/"/g, '""');
        const merchant = (tx.merchantName || (tx.notes ? tx.notes.split('\n')[0] : '') || tx.category || '').replace(/[\r\n]+/g, ' ').trim().replace(/"/g, '""');
        const type = (tx.type || '').toUpperCase();
        const amount = tx.type === 'income' ? Number(tx.amount) : -Number(tx.amount);
        const member = (tx.memberName || '').replace(/"/g, '""');
        const source = (tx.source || 'manual').toUpperCase();
        const notes = (tx.notes || '').replace(/[\r\n]+/g, ' -- ').trim().replace(/"/g, '""');

        return [
          `"${formattedDate}"`,
          `"${category}"`,
          `"${merchant}"`,
          `"${type}"`,
          amount,
          `"${member}"`,
          `"${source}"`,
          `"${notes}"`
        ];
      });

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const base64Data = btoa(unescape(encodeURIComponent(csvContent)));
      const fileName = `MS_Family_Transactions_${exportRange.from}_to_${exportRange.to}.csv`;

      // Close modal before download trigger to avoid backdrop pointer lock
      setIsExportModalOpen(false);

      const downloadResult = await downloadBase64File(
        base64Data,
        fileName,
        'text/csv;charset=utf-8;'
      );

      if (downloadResult.success) {
        showToast(t('Excel statement downloaded successfully'));
      } else {
        showToast(t('Download failed: ') + downloadResult.message, 'error');
      }
    } catch (err: any) {
      showToast(t('Error exporting Excel statement: ') + err.message, 'error');
    } finally {
      setIsGeneratingPDF(false);
      setIsExportModalOpen(false);
    }
  }, [exportRange, transactions, showToast, t]);

  const hasActiveFilters = activeFilters.length > 0 || searchQuery;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="transactions-page space-y-6 pb-28 relative">
      {/* Background decoration blobs */}
      <div className="transactions-page-bg" aria-hidden="true">
        <div className="transactions-blob transactions-blob-1" />
        <div className="transactions-blob transactions-blob-2" />
        <div className="transactions-blob transactions-blob-3" />
      </div>
      {/* Header Actions Portal */}
      {document.getElementById('header-actions-portal') &&
        createPortal(
          <div className="flex gap-1.5">
            <button
              onClick={() => setShowFilters(!showFilters)}
              aria-label="Toggle filters"
              className={`glass-btn relative w-10 h-10 rounded-[12px] flex items-center justify-center transition-all ${showFilters
                ? 'text-primary-500 !border-primary-500/30 !bg-primary-500/10 dark:!bg-primary-500/15'
                : 'text-slate-600 dark:text-slate-300'
                }`}
            >
              <span className="absolute top-0 left-2 right-2 h-px bg-gradient-to-r from-transparent via-white/60 dark:via-white/15 to-transparent pointer-events-none" />
              <SlidersHorizontal size={17} strokeWidth={2.3} />
              {hasActiveFilters && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary-500 ring-2 ring-white dark:ring-[#0a0a0a]" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!isPremium) {
                  setShowUpgradeModal(true);
                } else {
                  setIsExportModalOpen(true);
                }
              }}
              aria-label="Export Statement"
              className="relative w-10 h-10 rounded-[14px] flex items-center justify-center bg-gradient-to-r from-primary-500/25 via-purple-500/20 to-indigo-500/25 dark:from-primary-500/35 dark:via-purple-600/30 dark:to-indigo-600/35 backdrop-blur-xl border border-primary-400/40 dark:border-primary-400/50 text-primary-600 dark:text-primary-300 shadow-[0_2px_16px_rgba(124,58,237,0.3)] hover:shadow-[0_4px_24px_rgba(124,58,237,0.45)] hover:scale-[1.03] active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 disabled:opacity-40"
              disabled={processedTransactions.length === 0}
            >
              <span className="absolute top-0 left-2 right-2 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/40 to-transparent pointer-events-none" />
              <Download size={18} strokeWidth={2.4} className="text-primary-500 dark:text-primary-300 drop-shadow-[0_1px_4px_rgba(124,58,237,0.4)]" />
            </button>
          </div>,
          document.getElementById('header-actions-portal') as HTMLElement
        )}

      {/* Quick Stats */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="apple-glass-card apple-glass-card-interactive apple-stat-card group">
          <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-blue-500/0 via-blue-500/40 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="apple-stat-icon-wrapper bg-blue-500/10 text-blue-500 dark:bg-blue-500/20 mb-1">
            <BarChart3 size={13} strokeWidth={2.5} />
          </div>
          <div className="apple-stat-label text-slate-500 dark:text-slate-400">
            {t('Total Count')}
          </div>
          <div className="apple-stat-value text-slate-900 dark:text-white">
            <AnimatedNumber value={stats.count} />
          </div>
        </div>
        <div className="apple-glass-card apple-glass-card-interactive apple-stat-card group">
          <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-emerald-500/0 via-emerald-500/40 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="apple-stat-icon-wrapper bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20 mb-1">
            <TrendingUp size={13} strokeWidth={2.5} />
          </div>
          <div className="apple-stat-label text-emerald-600 dark:text-emerald-400">
            {t('Income')}
          </div>
          <div className="apple-stat-value text-emerald-600 dark:text-emerald-400">
            <AnimatedNumber value={stats.income} prefix="₹" />
          </div>
        </div>
        <div className="apple-glass-card apple-glass-card-interactive apple-stat-card group">
          <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-rose-500/0 via-rose-500/40 to-rose-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="apple-stat-icon-wrapper bg-rose-500/10 text-rose-500 dark:bg-rose-500/20 mb-1">
            <TrendingDown size={13} strokeWidth={2.5} />
          </div>
          <div className="apple-stat-label text-rose-600 dark:text-rose-400">
            {t('Expense')}
          </div>
          <div className="apple-stat-value text-rose-600 dark:text-rose-400">
            <AnimatedNumber value={stats.expense} prefix="₹" />
          </div>
        </div>
        <div className="apple-glass-card apple-glass-card-interactive apple-stat-card group">
          <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-violet-500/0 via-violet-500/40 to-violet-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="apple-stat-icon-wrapper bg-violet-500/10 text-violet-500 dark:bg-violet-500/20 mb-1">
            <Wallet size={13} strokeWidth={2.5} />
          </div>
          <div className="apple-stat-label text-violet-600 dark:text-violet-400">
            {t('Net')}
          </div>
          <div className={`apple-stat-value ${stats.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {stats.net >= 0 ? '+' : ''}
            <AnimatedNumber value={Math.abs(stats.net)} prefix="₹" />
          </div>
        </div>
      </motion.div>

      {/* Search Bar - Enhanced */}
      <motion.div variants={item} className="relative w-full max-w-md">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('Search transactions...')}
          className="apple-glass-input !pl-11"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none z-10" size={18} />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors z-10"
          >
            <X size={16} />
          </button>
        )}
      </motion.div>

      {/* Filter Chips (active filters) */}
      <FilterChips filters={activeFilters} onRemove={removeFilter} onClearAll={clearFilters} />

      {/* Filter Dialog Modal */}
      {createPortal(
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
              onClick={() => setShowFilters(false)}
            >
              <motion.div
                initial={{ opacity: 0, y: 100, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 100, scale: 0.95 }}
                transition={{ type: 'spring', damping: 28, stiffness: 340 }}
                className="apple-glass-modal w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[85vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Drag Handle (mobile affordance) */}
                <div className="flex justify-center pt-3 pb-1 sm:hidden">
                  <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800/60">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-950/40 flex items-center justify-center text-primary-500">
                      <SlidersHorizontal size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">{t('Filters & Sort')}</h3>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        {processedTransactions.length} {t('results')}
                        {activeFilters.length > 0 && ` • ${activeFilters.length} ${t('active')}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors"
                    aria-label="Close filters"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 space-y-5">

                  {/* Transaction Type */}
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-2 block">
                      {t('Transaction Type')}
                    </label>
                    <div className="flex p-1 bg-black/5 dark:bg-black/40 border border-slate-200/30 dark:border-white/5 rounded-xl gap-1 backdrop-blur-sm">
                      {['all', 'income', 'expense'].map((tf) => (
                        <button
                          key={tf}
                          onClick={() => setTypeFilter(tf)}
                          className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${typeFilter === tf
                            ? tf === 'income'
                              ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/25'
                              : tf === 'expense'
                                ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/25'
                                : 'bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                        >
                          {tf === 'income' && <ArrowUpRight size={12} />}
                          {tf === 'expense' && <ArrowDownRight size={12} />}
                          {tf.charAt(0).toUpperCase() + tf.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Source Filter */}
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-2 flex items-center justify-between">
                      <span>{t('Source')}</span>
                      {unreviewedSmsCount > 0 && (
                        <span className="text-[10px] font-extrabold text-amber-500 flex items-center gap-1">
                          <AlertCircle size={10} />
                          {unreviewedSmsCount} Need Review
                        </span>
                      )}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 p-1 bg-black/5 dark:bg-black/40 border border-slate-200/30 dark:border-white/5 rounded-xl gap-1 backdrop-blur-sm">
                      {[
                        { id: 'all', label: 'All' },
                        { id: 'manual', label: 'Manual' },
                        { id: 'sms', label: 'SMS' },
                        { id: 'needs-review', label: `Review (${unreviewedSmsCount})` }
                      ].map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setSourceFilter(s.id)}
                          className={`py-2 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${sourceFilter === s.id
                            ? s.id === 'needs-review'
                              ? 'bg-amber-500 text-white shadow-sm'
                              : s.id === 'sms'
                                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-sm'
                                : 'bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                        >
                          {s.id === 'sms' && <Smartphone size={12} />}
                          {s.id === 'needs-review' && <AlertCircle size={12} />}
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-2 block">
                      {t('Category')}
                    </label>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="apple-glass-input !pl-3 !py-3 text-sm"
                    >
                      <option value="all">{t('All Categories')}</option>
                      {ALL_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sort By */}
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-2 block">
                      {t('Sort By')}
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="apple-glass-input !pl-3 !py-3 text-sm"
                    >
                      <option value="date-desc">{t('Newest First')}</option>
                      <option value="date-asc">{t('Oldest First')}</option>
                      <option value="amount-desc">{t('Highest Amount')}</option>
                      <option value="amount-asc">{t('Lowest Amount')}</option>
                    </select>
                  </div>

                  {/* Date Range */}
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-2 block">
                      {t('Date Range')}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold uppercase mb-1 block">{t('From')}</span>
                        <input
                          type="date"
                          value={dateRange.from}
                          onChange={(e) => setDateRange((p) => ({ ...p, from: e.target.value }))}
                          className="apple-glass-input !pl-3 !py-2.5 text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold uppercase mb-1 block">{t('To')}</span>
                        <input
                          type="date"
                          value={dateRange.to}
                          onChange={(e) => setDateRange((p) => ({ ...p, to: e.target.value }))}
                          className="apple-glass-input !pl-3 !py-2.5 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800/60 flex gap-3">
                  <button
                    onClick={() => {
                      clearFilters();
                      setShowFilters(false);
                    }}
                    className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-900 transition-all active:scale-95"
                  >
                    {t('Reset All')}
                  </button>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="flex-1 py-3 rounded-2xl bg-primary-500 text-white font-bold text-sm hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/20 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Filter size={14} />
                    {t('Apply')} ({processedTransactions.length})
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Mobile Pagination placed BELOW search bar */}
      {isMobile && totalPages > 1 && (
        <div className="px-2">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      )}

      {/* SMS Review Alert Banner if any SMS has confidence < 0.75 */}
      {unreviewedSmsCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border border-amber-500/30 shadow-lg backdrop-blur-md flex flex-wrap items-center justify-between gap-3 mb-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
              <AlertCircle size={20} />
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-700 dark:text-amber-300">
                {unreviewedSmsCount} Automated SMS Parsed Below 75% Confidence
              </h4>
              <p className="text-xs text-amber-600/80 dark:text-amber-400/80 font-medium">
                Review amount, category, and merchant details before approving into your balance.
              </p>
            </div>
          </div>

          <button
            onClick={() => setSourceFilter('needs-review')}
            className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-amber-500 text-white shadow-md hover:bg-amber-600 transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Filter size={14} />
            Filter Low-Confidence SMS ({unreviewedSmsCount})
          </button>
        </motion.div>
      )}

      {/* Transaction List / Grid */}
      <motion.div variants={item} className="apple-glass-card overflow-hidden">
        {/* Desktop Table Header */}
        <div className="hidden sm:grid grid-cols-12 gap-3 px-5 py-4 border-b border-slate-200/20 dark:border-white/5 text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest bg-white/10 dark:bg-black/10">
          <div className="col-span-4">{t('Type')}</div>
          <div className="col-span-3">{t('Amount')}</div>
          <div className="col-span-3">{t('Member')}</div>
          <div className="col-span-2 text-right">{t('Actions')}</div>
        </div>

        <div className="divide-y divide-slate-200/10 dark:divide-white/5">
          <AnimatePresence initial={false}>
            {loading && paginatedTx.length === 0 ? (
              <div className="space-y-4 p-5 animate-pulse">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
                    </div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16" />
                  </div>
                ))}
              </div>
            ) : paginatedTx.length === 0 ? (
              <div className="py-16 text-center text-slate-500 col-span-full">
                <Inbox size={40} className="mx-auto opacity-30 mb-3" />
                <p className="text-sm font-medium">{t('No transactions match your filters')}</p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-3 text-xs text-primary-500 hover:text-primary-600 font-semibold"
                  >
                    {t('Clear Filters')}
                  </button>
                )}
              </div>
            ) : (
              // List view
              groupedTransactions.map((group) => (
                <div key={group.dateLabel}>
                  <div className="px-5 py-2.5 text-[10px] font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase bg-white/20 dark:bg-black/20 backdrop-blur-md border-y border-slate-200/20 dark:border-white/5 sticky top-0 z-10">
                    {group.dateLabel}
                  </div>
                  {group.transactions.map((tx) => {
                    const isSms = tx.source === 'sms' || tx.smsConfidence !== null;
                    const confidenceVal = Number(tx.smsConfidence ?? 1.0);
                    const isNeedsReview = isSms && confidenceVal < 0.75 && confidenceVal !== 1.0;
                    return (
                      <motion.div
                        key={tx.id}
                        variants={listItemVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className={`flex flex-col sm:grid sm:grid-cols-12 gap-1 sm:gap-3 px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-200/20 dark:border-white/5 last:border-0 relative row-contain apple-glass-row ${isNeedsReview
                          ? 'bg-amber-500/10 dark:bg-amber-500/10 border-l-4 border-l-amber-500'
                          : isSms
                            ? 'bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-transparent dark:from-cyan-500/5 dark:via-blue-500/5 dark:to-transparent border-l-2 border-l-cyan-500'
                            : ''
                          }`}
                        onClick={() => setSelectedTx(tx)}
                      >
                        {/* SMS indicator left bar */}
                        {isSms && !isNeedsReview && (
                          <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-gradient-to-b from-cyan-400 to-blue-500" />
                        )}

                        <div className="flex justify-between items-center w-full sm:col-span-4">
                          {/* Category Mobile+Desktop */}
                          <div className="flex items-center gap-3 w-full">
                            <div className="relative">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 backdrop-blur-sm border shadow-sm ${isNeedsReview
                                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-500'
                                  : isSms
                                    ? 'bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/20 text-cyan-600 dark:text-cyan-400'
                                    : tx.type === 'income'
                                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                      : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                                  }`}
                              >
                                {isNeedsReview ? (
                                  <AlertCircle size={18} className="text-amber-500" />
                                ) : isSms ? (
                                  <MessageSquareText size={18} />
                                ) : tx.type === 'income' ? (
                                  <ArrowUpRight size={18} />
                                ) : (
                                  <ArrowDownRight size={18} />
                                )}
                              </div>
                              {/* SMS mini badge */}
                              {isSms && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-sm">
                                  <Smartphone size={8} className="text-white" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">{t(tx.category)}</p>
                                {isNeedsReview ? (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-full bg-amber-500 text-white shadow-sm shrink-0">
                                    Needs Review
                                  </span>
                                ) : isSms && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-sm shrink-0">
                                    SMS
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 sm:hidden mt-0.5">
                                {isSms && tx.bankName ? `${tx.bankName} • ` : `${tx.memberName} • `}
                                {new Date(tx.created_at || tx.date).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                              {tx.notes && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[180px] hidden sm:block">
                                  {tx.notes}
                                </p>
                              )}
                            </div>
                          </div>
                          {/* Amount Mobile */}
                          <div className="sm:hidden text-right pl-2 shrink-0">
                            <span
                              className={`font-black text-sm font-sans ${isSms
                                ? tx.type === 'income'
                                  ? 'text-cyan-600'
                                  : 'text-blue-600'
                                : tx.type === 'income'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                                }`}
                            >
                              {tx.type === 'income' ? '+' : '-'}₹{Number(tx.amount).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Amount Desktop */}
                        <div className="hidden sm:block sm:col-span-3">
                          <span
                            className={`font-bold text-sm font-sans ${isSms
                              ? tx.type === 'income'
                                ? 'text-cyan-600'
                                : 'text-blue-600'
                              : tx.type === 'income'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                              }`}
                          >
                            {tx.type === 'income' ? '+' : '-'}₹{Number(tx.amount).toLocaleString()}
                          </span>
                        </div>

                        {/* Desktop Member */}
                        <div className="col-span-3 hidden sm:flex sm:items-center sm:gap-2">
                          <span className="text-sm text-slate-700 dark:text-slate-300">{tx.memberName}</span>
                          {isSms && tx.bankName && (
                            <span className="text-[10px] font-semibold text-cyan-600 bg-cyan-500/10 dark:text-cyan-400 px-1.5 py-0.5 rounded-md">
                              {tx.bankName}
                            </span>
                          )}
                        </div>

                        {/* Desktop Actions */}
                        <div className="hidden sm:flex sm:col-span-2 justify-end gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTx(tx);
                            }}
                            className="p-2 rounded-lg text-slate-400 hover:text-primary-500 hover:bg-primary-500/10 dark:hover:bg-primary-500/20 border border-transparent hover:border-primary-500/20 transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm"
                            aria-label="View details"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/edit-transaction/${tx.id}`, { state: tx });
                            }}
                            className="p-2 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10 dark:hover:bg-indigo-500/20 border border-transparent hover:border-indigo-500/20 transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm"
                            aria-label="Edit transaction"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSingleDelete(tx.id);
                            }}
                            disabled={deletingId === tx.id}
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 border border-transparent hover:border-rose-500/20 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50 backdrop-blur-sm"
                            aria-label="Delete transaction"
                          >
                            {deletingId === tx.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        </div>

                        {/* Low Confidence Review Action Bar */}
                        {isNeedsReview && (
                          <div
                            className="col-span-12 mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-2 z-10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                              <AlertCircle size={14} className="text-amber-500 shrink-0" />
                              <span>Automated SMS low confidence ({(confidenceVal * 100).toFixed(0)}% Accuracy)</span>
                            </div>
                            <div className="flex items-center gap-1.5 ml-auto">
                              <button
                                onClick={() => approveSmsTransaction(tx.id)}
                                className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 transition-colors flex items-center gap-1"
                              >
                                <CheckCircle2 size={12} />
                                {t('Approve')}
                              </button>
                              <button
                                onClick={() => navigate(`/edit-transaction/${tx.id}`, { state: tx })}
                                className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-colors flex items-center gap-1"
                              >
                                <Pencil size={12} />
                                {t('Edit')}
                              </button>
                              <button
                                onClick={() => handleSingleDelete(tx.id)}
                                className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors flex items-center gap-1"
                              >
                                <Trash2 size={12} />
                                {t('Reject')}
                              </button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Desktop Pagination (below list) */}
        {!isMobile && totalPages > 1 && (
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        )}
      </motion.div>

      {/* Transaction Detail Modal */}
      {createPortal(
        <AnimatePresence>
          {selectedTx && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setSelectedTx(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="apple-glass-modal w-full max-w-md relative max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Sticky Close Button Header */}
                <div className="sticky top-0 z-20 flex justify-end px-4 pt-4 pb-1">
                  <button
                    onClick={() => setSelectedTx(null)}
                    className="p-2 rounded-xl bg-white/40 dark:bg-black/30 backdrop-blur-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all border border-slate-200/30 dark:border-white/10 shadow-sm"
                    aria-label="Close modal"
                  >
                    <X size={18} />
                  </button>
                </div>
                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6">
                  <div className="space-y-5">
                    {/* Header */}
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-sm border shadow-sm ${selectedTx.type === 'income'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                          }`}
                      >
                        {selectedTx.type === 'income' ? <ArrowUpRight size={28} /> : <ArrowDownRight size={28} />}
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">{t(selectedTx.category)}</h3>
                        <span
                          className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${selectedTx.type === 'income'
                            ? 'bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-500/10 dark:bg-rose-950/30 border border-rose-500/20 text-rose-600 dark:text-rose-400'
                            }`}
                        >
                          {t(selectedTx.type)}
                        </span>
                      </div>
                    </div>
                    {/* Amount */}
                    <div className="text-center py-6 bg-white/20 dark:bg-black/30 rounded-2xl border border-white/20 dark:border-white/5 shadow-inner">
                      <p
                        className={`text-4.5xl font-black font-sans tracking-tight ${selectedTx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                      >
                        {selectedTx.type === 'income' ? '+' : '-'}₹{Number(selectedTx.amount).toLocaleString()}
                      </p>
                    </div>
                    {/* Details */}
                    <div className="space-y-3">
                      <div className="flex justify-between py-3 apple-detail-item">
                        <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                          <Calendar size={14} /> {t('Date')}
                        </span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          {selectedTx.date}
                        </span>
                      </div>
                      <div className="flex justify-between py-3 apple-detail-item">
                        <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                          <Clock size={14} /> {t('Time')}
                        </span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          {new Date(selectedTx.created_at || selectedTx.date).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between py-3 apple-detail-item">
                        <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                          <Tag size={14} /> {t('Category')}
                        </span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          {t(selectedTx.category)}
                        </span>
                      </div>
                      <div className="flex justify-between py-3 apple-detail-item">
                        <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                          <Clock size={14} /> {t('Member')}
                        </span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          {t(selectedTx.memberName)}
                        </span>
                      </div>
                      {/* SMS Source Info */}
                      {selectedTx.source === 'sms' && (
                        <div className="mt-2.5 p-3.5 rounded-2xl bg-cyan-500/5 dark:bg-cyan-500/10 border border-cyan-500/20 space-y-2.5 backdrop-blur-md">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                              <Smartphone size={12} className="text-white" />
                            </div>
                            <span className="text-xs font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
                              Auto-detected from SMS
                            </span>
                          </div>
                          {selectedTx.bankName && (
                            <div className="flex justify-between">
                              <span className="text-xs text-cyan-600 dark:text-cyan-400">Bank</span>
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {selectedTx.bankName}
                              </span>
                            </div>
                          )}
                          {selectedTx.merchantName && (
                            <div className="flex justify-between">
                              <span className="text-xs text-cyan-600 dark:text-cyan-400">Merchant</span>
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {selectedTx.merchantName}
                              </span>
                            </div>
                          )}
                          {selectedTx.smsConfidence && (
                            <div className="flex justify-between">
                              <span className="text-xs text-cyan-600 dark:text-cyan-400">Confidence</span>
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {(selectedTx.smsConfidence * 100).toFixed(0)}%
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      {selectedTx.notes && (
                        <div className="py-2.5">
                          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">{t('Notes')}</span>
                          <p className="text-sm text-slate-700 dark:text-slate-300 bg-white/20 dark:bg-black/20 p-3.5 rounded-2xl border border-white/20 dark:border-white/5 whitespace-pre-wrap">
                            {selectedTx.notes}
                          </p>
                        </div>
                      )}
                      {selectedTx.proofUrl && (
                        <div className="py-2.5">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{t('Receipt Proof')}</span>
                            <button
                              onClick={() => setLightboxImg(selectedTx.proofUrl)}
                              className="text-xs font-bold text-primary-500 hover:text-primary-600 flex items-center gap-1 bg-primary-500/10 dark:bg-primary-500/20 px-2.5 py-1 rounded-lg border border-primary-500/20 backdrop-blur-sm"
                            >
                              <Eye size={12} /> {t('View Full')}
                            </button>
                          </div>
                          <div
                            className="relative rounded-2xl overflow-hidden cursor-pointer group border border-slate-200/30 dark:border-white/5 h-40"
                            onClick={() => setLightboxImg(selectedTx.proofUrl)}
                          >
                            <img
                              src={selectedTx.proofUrl}
                              alt="Receipt"
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors flex items-center justify-center">
                              <Eye className="text-white opacity-0 group-hover:opacity-100 drop-shadow-md" size={24} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (selectedTx) {
                          setSelectedTx(null);
                          navigate(`/edit-transaction/${selectedTx.id}`, { state: selectedTx });
                        }
                      }}
                      className="w-full py-3.5 mb-2.5 text-sm font-bold text-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-2xl hover:bg-indigo-500/20 dark:hover:bg-indigo-500/30 transition-all border border-indigo-500/20 backdrop-blur-md flex items-center justify-center gap-2"
                    >
                      <Pencil size={16} />
                      {t('Edit Transaction')}
                    </button>
                    <button
                      onClick={() => {
                        if (selectedTx) {
                          handleSingleDelete(selectedTx.id);
                          setSelectedTx(null);
                        }
                      }}
                      className="w-full py-3.5 text-sm font-bold text-rose-500 bg-rose-500/10 dark:bg-rose-500/20 rounded-2xl hover:bg-rose-500/20 dark:hover:bg-rose-500/30 transition-all border border-rose-500/20 backdrop-blur-md"
                    >
                      {t('Delete Transaction')}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Image Lightbox */}
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
                aria-label="Close image"
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

      {/* Export Modal - Apple Vision OS Glass UI */}
      {createPortal(
        <AnimatePresence>
          {isExportModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4"
              onClick={() => setIsExportModalOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 20 }}
                className="w-full max-w-sm p-6 relative rounded-3xl overflow-hidden bg-white/80 dark:bg-[#12121f]/80 backdrop-blur-2xl border border-white/60 dark:border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.35),0_0_30px_rgba(124,58,237,0.15)]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Top Specular Highlight Streak */}
                <span className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/90 dark:via-white/30 to-transparent pointer-events-none" />

                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-2xl bg-gradient-to-br from-primary-500/20 to-purple-500/20 border border-primary-500/30 text-primary-500 dark:text-primary-300 shadow-inner">
                      <Download size={20} strokeWidth={2.4} />
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">{t('Export History')}</h3>
                  </div>
                  <button
                    onClick={() => setIsExportModalOpen(false)}
                    className="p-2 rounded-xl bg-slate-100/80 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-500 dark:text-slate-400 transition-colors backdrop-blur-md border border-slate-200/50 dark:border-white/10"
                    aria-label="Close export modal"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Export Format Segmented Glass Toggle with Smooth Sliding Animation */}
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-widest mb-2 block">
                      {t('Export Format')}
                    </label>
                    <div className="grid grid-cols-2 gap-1 bg-slate-200/60 dark:bg-black/40 backdrop-blur-xl p-1 rounded-2xl border border-slate-300/40 dark:border-white/10 shadow-inner relative overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExportFormat('pdf')}
                        className={`relative flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-colors duration-200 z-10 ${
                          exportFormat === 'pdf' ? 'text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                        }`}
                      >
                        {exportFormat === 'pdf' && (
                          <motion.div
                            layoutId="activeExportFormatPill"
                            className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-600 to-purple-600 shadow-[0_4px_16px_rgba(124,58,237,0.35)] border border-white/20 -z-10"
                            transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                          />
                        )}
                        <FileText size={16} />
                        PDF Report
                      </button>
                      <button
                        type="button"
                        onClick={() => setExportFormat('excel')}
                        className={`relative flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-colors duration-200 z-10 ${
                          exportFormat === 'excel' ? 'text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                        }`}
                      >
                        {exportFormat === 'excel' && (
                          <motion.div
                            layoutId="activeExportFormatPill"
                            className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 shadow-[0_4px_16px_rgba(16,185,129,0.35)] border border-white/20 -z-10"
                            transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                          />
                        )}
                        <FileSpreadsheet size={16} />
                        Excel Sheet
                      </button>
                    </div>
                  </div>

                  {/* Quick Date Presets Glass Pills with Smooth Motion Sliding */}
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-widest mb-2 block">
                      {t('Date Presets')}
                    </label>
                    <div className="flex flex-wrap gap-1.5 relative">
                      {[
                        { label: t('Today'), days: 0 },
                        { label: t('Last 7 Days'), days: 6 },
                        { label: t('Last 30 Days'), days: 29 },
                        { label: t('This Month'), type: 'month' },
                      ].map((preset) => {
                        const now = new Date();
                        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                        let fromStr = todayStr;

                        if (preset.type === 'month') {
                          fromStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
                        } else if (preset.days) {
                          const pastDate = new Date(now);
                          pastDate.setDate(now.getDate() - preset.days);
                          fromStr = `${pastDate.getFullYear()}-${String(pastDate.getMonth() + 1).padStart(2, '0')}-${String(pastDate.getDate()).padStart(2, '0')}`;
                        }

                        const isSelected = exportRange.from === fromStr && exportRange.to === todayStr;

                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => setExportRange({ from: fromStr, to: todayStr })}
                            className={`relative px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors duration-200 z-10 ${
                              isSelected
                                ? 'text-white'
                                : 'bg-white/40 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-white/40 dark:border-white/10 hover:border-primary-400/50 hover:bg-white/70 dark:hover:bg-white/10 backdrop-blur-md shadow-sm'
                            }`}
                          >
                            {isSelected && (
                              <motion.div
                                layoutId="activePresetPill"
                                className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500 to-purple-600 border border-primary-400/40 shadow-[0_4px_16px_rgba(124,58,237,0.35)] -z-10"
                                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                              />
                            )}
                            <span className="relative z-10">{preset.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Glass Date Range Inputs */}
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-widest mb-1.5 block">
                      {t('From Date')}
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary-500/70 dark:text-primary-400/70" size={16} />
                      <input
                        type="date"
                        value={exportRange.from}
                        onChange={(e) => setExportRange((r) => ({ ...r, from: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/40 dark:bg-white/5 backdrop-blur-md border border-slate-200/60 dark:border-white/10 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-primary-500/60 focus:ring-2 focus:ring-primary-500/20 shadow-inner transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-widest mb-1.5 block">
                      {t('To Date')}
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary-500/70 dark:text-primary-400/70" size={16} />
                      <input
                        type="date"
                        value={exportRange.to}
                        onChange={(e) => setExportRange((r) => ({ ...r, to: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/40 dark:bg-white/5 backdrop-blur-md border border-slate-200/60 dark:border-white/10 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-primary-500/60 focus:ring-2 focus:ring-primary-500/20 shadow-inner transition-all"
                      />
                    </div>
                  </div>

                  {/* Primary Action Glass Button */}
                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={exportFormat === 'pdf' ? generatePDF : generateExcel}
                      disabled={isGeneratingPDF}
                      className={`relative w-full py-3.5 rounded-2xl text-white font-extrabold text-sm shadow-[0_8px_25px_rgba(124,58,237,0.35)] hover:shadow-[0_12px_35px_rgba(124,58,237,0.5)] active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 overflow-hidden border border-white/20 ${
                        exportFormat === 'excel'
                          ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 shadow-emerald-500/25'
                          : 'bg-gradient-to-r from-primary-600 via-purple-600 to-indigo-600 shadow-primary-500/25'
                      }`}
                    >
                      <span className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />
                      {isGeneratingPDF ? (
                        <>
                          <Loader2 size={18} className="animate-spin" /> Generating Statement...
                        </>
                      ) : exportFormat === 'excel' ? (
                        <>
                          <FileSpreadsheet size={18} strokeWidth={2.4} /> Download Excel Sheet
                        </>
                      ) : (
                        <>
                          <Download size={18} strokeWidth={2.4} /> Download PDF Report
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        isLoading={deletingId !== null}
      />

      {/* Toast */}
      <Toast message={toast.message} visible={toast.visible} icon={toast.icon} type={toast.type} />

      {/* Scoped Apple Glass UI Styles */}
      <style>{`
        /* Scoped styles to the transactions page only */
        .transactions-page {
          --glass-bg: rgba(255, 255, 255, 0.45);
          --glass-border: rgba(255, 255, 255, 0.4);
          --glass-border-hover: rgba(255, 255, 255, 0.6);
          --glass-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.04);
          --glass-text-muted: rgba(15, 23, 42, 0.6);
          --glass-input-bg: rgba(255, 255, 255, 0.35);
          --glass-inner-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.03);
        }

        .dark .transactions-page {
          --glass-bg: rgba(15, 15, 25, 0.45);
          --glass-border: rgba(255, 255, 255, 0.08);
          --glass-border-hover: rgba(255, 255, 255, 0.15);
          --glass-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
          --glass-text-muted: rgba(226, 232, 240, 0.6);
          --glass-input-bg: rgba(0, 0, 0, 0.3);
          --glass-inner-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.2);
        }

        /* Background animated mesh blobs */
        .transactions-page-bg {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .transactions-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.15;
          mix-blend-mode: multiply;
          animation: float-blob 20s infinite ease-in-out;
        }

        .dark .transactions-blob {
          display: none;
        }

        .transactions-blob-1 {
          top: 10%;
          left: 15%;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.6) 0%, rgba(59, 130, 246, 0.6) 100%);
          animation-duration: 25s;
        }

        .transactions-blob-2 {
          top: 40%;
          right: 10%;
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, rgba(236, 72, 153, 0.6) 0%, rgba(139, 92, 246, 0.6) 100%);
          animation-delay: -5s;
          animation-duration: 30s;
        }

        .transactions-blob-3 {
          bottom: 10%;
          left: 30%;
          width: 280px;
          height: 280px;
          background: radial-gradient(circle, rgba(6, 182, 212, 0.6) 0%, rgba(59, 130, 246, 0.6) 100%);
          animation-delay: -10s;
          animation-duration: 22s;
        }

        @keyframes float-blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.95);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }

        /* Apple-style Glass Cards */
        .apple-glass-card {
          background: var(--glass-bg);
          backdrop-filter: blur(25px) saturate(190%);
          -webkit-backdrop-filter: blur(25px) saturate(190%);
          border: 1px solid var(--glass-border);
          box-shadow: 
            var(--glass-shadow),
            inset 0 1px 1px 0 rgba(255, 255, 255, 0.2),
            inset 0 -1px 1px 0 rgba(0, 0, 0, 0.05);
          border-radius: 24px;
          position: relative;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .apple-glass-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 24px;
          background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.02) 100%);
          pointer-events: none;
        }

        .dark .apple-glass-card::before {
          background: linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.01) 100%);
        }

        /* Glass card hover effect */
        .apple-glass-card-interactive {
          cursor: pointer;
        }
        
        .apple-glass-card-interactive:hover {
          transform: translateY(-4px);
          border-color: var(--glass-border-hover);
          box-shadow: 
            0 20px 40px rgba(0, 0, 0, 0.08),
            inset 0 1px 1px 0 rgba(255, 255, 255, 0.3);
        }

        .dark .apple-glass-card-interactive:hover {
          box-shadow: 
            0 20px 40px rgba(0, 0, 0, 0.45),
            inset 0 1px 1px 0 rgba(255, 255, 255, 0.15);
        }

        .apple-glass-card-interactive:active {
          transform: translateY(-1px) scale(0.98);
        }

        /* Glass Stats Cards specific styling */
        .apple-stat-card {
          padding: 0.55rem 0.45rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          z-index: 1;
          border-radius: 16px;
        }

        .apple-stat-label {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 0.08rem;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .apple-stat-value {
          font-size: 1.15rem;
          font-weight: 900;
          letter-spacing: -0.02em;
        }

        .apple-stat-icon-wrapper {
          width: 26px;
          height: 26px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 4px 10px rgba(0, 0, 0, 0.03);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .apple-glass-card-interactive:hover .apple-stat-icon-wrapper {
          transform: scale(1.1) rotate(3deg);
        }

        /* Apple-style Glass Input */
        .apple-glass-input {
          width: 100%;
          background: var(--glass-input-bg);
          backdrop-filter: blur(15px) saturate(150%);
          -webkit-backdrop-filter: blur(15px) saturate(150%);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          padding: 0.875rem 1rem 0.875rem 2.75rem;
          color: inherit;
          outline: none;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: var(--glass-inner-shadow);
        }

        .apple-glass-input:focus {
          border-color: #8b5cf6;
          background: rgba(255, 255, 255, 0.55);
          box-shadow: 
            0 0 0 4px rgba(139, 92, 246, 0.15),
            var(--glass-inner-shadow);
        }

        .dark .apple-glass-input:focus {
          background: rgba(0, 0, 0, 0.45);
          box-shadow: 
            0 0 0 4px rgba(139, 92, 246, 0.25),
            var(--glass-inner-shadow);
        }

        /* Glass row items */
        .apple-glass-row {
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .apple-glass-row:hover {
          background: rgba(255, 255, 255, 0.25) !important;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        .dark .apple-glass-row:hover {
          background: rgba(255, 255, 255, 0.04) !important;
        }

        /* Glass Modal Sheet (Vision Pro / macOS style) */
        .apple-glass-modal {
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(40px) saturate(200%);
          -webkit-backdrop-filter: blur(40px) saturate(200%);
          border: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow: 
            0 30px 70px rgba(0, 0, 0, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 0.4);
          border-radius: 28px;
        }

        .dark .apple-glass-modal {
          background: rgba(20, 20, 25, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 
            0 30px 70px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        /* Fine tuning the modal details */
        .apple-detail-item {
          border-bottom: 1px solid rgba(226, 232, 240, 0.3);
        }

        .dark .apple-detail-item {
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }
      `}</style>
    </motion.div>
  );
}
