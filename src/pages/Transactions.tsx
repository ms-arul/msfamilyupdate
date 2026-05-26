import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useFinance } from '../context/FinanceContext';
import { downloadBase64File } from '../utils/downloadHelper';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
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
  X,
  SlidersHorizontal,
  BarChart3,
  Clock,
  Wallet,
  CheckCircle2,
  AlertCircle,
  MessageSquareText,
  Smartphone,
} from 'lucide-react';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import { Transaction } from '../types/finance';
import { staggerContainer, staggerItem, listItemVariants } from '../utils/animations';

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
  icon?: React.ComponentType<{ size?: number; className?: string }> | null;
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
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm p-7 border border-slate-100 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mb-5">
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
            className="flex-1 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 py-3.5 rounded-2xl bg-rose-500 text-white font-bold hover:bg-rose-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-rose-500/25 active:scale-95"
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
    let end = Math.min(totalPages, start + maxVisible - 1);
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
  const { t } = useLanguage();

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
  const [exportRange, setExportRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

  const [toast, setToast] = useState<{
    message: string;
    visible: boolean;
    icon: React.ComponentType<{ size?: number; className?: string }> | null;
    type: 'success' | 'error' | 'info';
  }>({ message: '', visible: false, icon: null, type: 'success' });

  const showToast = useCallback((
    msg: string,
    type: 'success' | 'error' | 'info' = 'success',
    icon: React.ComponentType<{ size?: number; className?: string }> | null = null
  ) => {
    setToast({ message: msg, visible: true, icon, type });
    setTimeout(() => setToast({ message: '', visible: false, icon: null, type: 'success' }), 2500);
  }, []);

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
    if (sourceFilter !== 'all') filtered = filtered.filter((tx) => (tx.source || 'manual') === sourceFilter);

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
    if (sourceFilter !== 'all') filters.push({ type: 'source', label: `Source: ${sourceFilter.toUpperCase()}`, value: sourceFilter });
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
    else if (value === 'sms' || value === 'manual' || value === sourceFilter) setSourceFilter('all');
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
      await deleteTransaction(transactionToDelete);
      showToast(t('Transaction deleted successfully'));
    } catch (err) {
      showToast(t('Failed to delete. Try again.'), 'error');
    } finally {
      setDeletingId(null);
      setDeleteModalOpen(false);
      setTransactionToDelete(null);
    }
  }, [transactionToDelete, deleteTransaction, t, showToast]);

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
    } catch (err) {
      console.error('PDF Error:', err);
      showToast(t('Failed to generate PDF'), 'error');
    } finally {
      setIsGeneratingPDF(false);
      setIsExportModalOpen(false);
    }
  }, [exportRange, transactions, t, showToast]);

  const hasActiveFilters = activeFilters.length > 0 || searchQuery;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 pb-28">
      {/* Header Actions Portal */}
      {document.getElementById('header-actions-portal') &&
        createPortal(
          <div className="flex gap-1.5 md:gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-glass !py-1.5 !px-2.5 md:!px-3 text-[10px] md:text-xs gap-1.5 ${showFilters ? '!bg-primary-500/10 !border-primary-500/30 !text-primary-500' : ''
                }`}
            >
              <SlidersHorizontal size={14} />
              <span className="hidden sm:inline">{t('Filters')}</span>
              {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />}
            </button>
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="btn-glass !py-1.5 !px-2.5 md:!px-3 text-[10px] md:text-xs gap-1.5"
              disabled={processedTransactions.length === 0}
            >
              <Download size={14} />
              <span className="hidden sm:inline">{t('Export')}</span>
            </button>
          </div>,
          document.getElementById('header-actions-portal') as HTMLElement
        )}

      {/* Quick Stats */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-panel p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">
            <BarChart3 size={12} /> {t('Total Count')}
          </div>
          <div className="text-xl font-black text-slate-900 font-sans">
            <AnimatedNumber value={stats.count} />
          </div>
        </div>
        <div className="glass-panel p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-emerald-500 text-[10px] font-bold uppercase tracking-widest mb-1">
            <TrendingUp size={12} /> {t('Income')}
          </div>
          <div className="text-xl font-black text-emerald-600 font-sans">
            <AnimatedNumber value={stats.income} prefix="₹" />
          </div>
        </div>
        <div className="glass-panel p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-rose-500 text-[10px] font-bold uppercase tracking-widest mb-1">
            <TrendingDown size={12} /> {t('Expense')}
          </div>
          <div className="text-xl font-black text-rose-600 font-sans">
            <AnimatedNumber value={stats.expense} prefix="₹" />
          </div>
        </div>
        <div className="glass-panel p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-violet-500 text-[10px] font-bold uppercase tracking-widest mb-1">
            <Wallet size={12} /> {t('Net')}
          </div>
          <div className={`text-xl font-black font-sans ${stats.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {stats.net >= 0 ? '+' : ''}
            <AnimatedNumber value={Math.abs(stats.net)} prefix="₹" />
          </div>
        </div>
      </motion.div>

      {/* Search Bar - Enhanced */}
      <motion.div variants={item} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('Search by category, notes, amount, or member...')}
          className="input-field !pl-11"
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

      {/* Filter Chips (active filters) */}
      <FilterChips filters={activeFilters} onRemove={removeFilter} onClearAll={clearFilters} />

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
                  <Filter size={14} /> {t('Advanced Filters')}
                </h3>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-primary-500 hover:text-primary-600 font-semibold"
                  >
                    {t('Clear All')}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Type Filter */}
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 block">
                    {t('Type')}
                  </label>
                  <div className="flex p-1 bg-slate-100 rounded-xl gap-1">
                    {['all', 'income', 'expense'].map((tf) => (
                      <button
                        key={tf}
                        onClick={() => setTypeFilter(tf)}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${typeFilter === tf ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                          }`}
                      >
                        {tf.charAt(0).toUpperCase() + tf.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Category Filter */}
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 block">
                    {t('Category')}
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="input-field !pl-3 !py-2.5 text-xs"
                  >
                    <option value="all">{t('All Categories')}</option>
                    {ALL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Sort */}
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 block">
                    {t('Sort By')}
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="input-field !pl-3 !py-2.5 text-xs"
                  >
                    <option value="date-desc">{t('Newest First')}</option>
                    <option value="date-asc">{t('Oldest First')}</option>
                    <option value="amount-desc">{t('Highest Amount')}</option>
                    <option value="amount-asc">{t('Lowest Amount')}</option>
                  </select>
                </div>
                {/* Date Range */}
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 block">
                    {t('Date Range')}
                  </label>
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
                {/* Source Filter (Manual vs SMS) */}
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 block">
                    {t('Source')}
                  </label>
                  <div className="flex p-1 bg-slate-100 rounded-xl gap-1">
                    {['all', 'manual', 'sms'].map((s) => (
                      <button
                        key={s}
                        onClick={() => setSourceFilter(s)}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${sourceFilter === s
                            ? s === 'sms'
                              ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-sm'
                              : 'bg-white shadow-sm text-slate-900'
                            : 'text-slate-500 hover:text-slate-700'
                          }`}
                      >
                        {s === 'sms' && <Smartphone size={11} />}
                        {s === 'all' ? 'All' : s === 'manual' ? 'Manual' : 'SMS'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Pagination placed BELOW search bar */}
      {isMobile && totalPages > 1 && (
        <div className="px-2">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      )}

      {/* Transaction List / Grid */}
      <motion.div variants={item} className="glass-panel overflow-hidden">
        {/* Desktop Table Header */}
        <div className="hidden sm:grid grid-cols-12 gap-3 px-5 py-3 border-b border-slate-200/60 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
          <div className="col-span-4">{t('Type')}</div>
          <div className="col-span-3">{t('Amount')}</div>
          <div className="col-span-3">{t('Member')}</div>
          <div className="col-span-2 text-right">{t('Actions')}</div>
        </div>

        <div className="divide-y divide-slate-100">
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
                  <div className="px-5 py-2.5 text-[10px] font-bold tracking-widest text-slate-500 uppercase bg-slate-50/50 dark:bg-slate-800/50 border-y border-slate-100 dark:border-slate-700/50">
                    {group.dateLabel}
                  </div>
                  {group.transactions.map((tx) => {
                    const isSms = tx.source === 'sms';
                    return (
                      <motion.div
                        key={tx.id}
                        layout
                        variants={listItemVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className={`flex flex-col sm:grid sm:grid-cols-12 gap-1 sm:gap-3 px-4 sm:px-5 py-3.5 sm:py-4 transition-all duration-200 group cursor-pointer sm:items-center border-b last:border-0 relative ${isSms
                            ? 'bg-gradient-to-r from-cyan-50/60 via-blue-50/30 to-transparent dark:from-cyan-950/20 dark:via-blue-950/10 dark:to-transparent border-cyan-100/50 dark:border-cyan-900/30 hover:from-cyan-50 hover:via-blue-50/50'
                            : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50 border-slate-100/50 dark:border-slate-700/30'
                          }`}
                        onClick={() => setSelectedTx(tx)}
                      >
                        {/* SMS indicator left bar */}
                        {isSms && (
                          <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-gradient-to-b from-cyan-400 to-blue-500" />
                        )}

                        <div className="flex justify-between items-center w-full sm:col-span-4">
                          {/* Category Mobile+Desktop */}
                          <div className="flex items-center gap-3 w-full">
                            <div className="relative">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isSms
                                    ? 'bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/40 dark:to-blue-900/40 text-cyan-600 dark:text-cyan-400'
                                    : tx.type === 'income'
                                      ? 'bg-emerald-50 text-emerald-500'
                                      : 'bg-rose-50 text-rose-500'
                                  }`}
                              >
                                {isSms ? (
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
                                <p className="font-semibold text-sm text-slate-800 truncate">{t(tx.category)}</p>
                                {isSms && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-sm shrink-0">
                                    SMS
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 sm:hidden mt-0.5">
                                {isSms && tx.bankName ? `${tx.bankName} • ` : `${tx.memberName} • `}
                                {new Date(tx.created_at || tx.date).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                              {tx.notes && (
                                <p className="text-[11px] text-slate-400 truncate max-w-[180px] hidden sm:block">
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
                                    ? 'text-emerald-600'
                                    : 'text-rose-600'
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
                                  ? 'text-emerald-600'
                                  : 'text-rose-600'
                              }`}
                          >
                            {tx.type === 'income' ? '+' : '-'}₹{Number(tx.amount).toLocaleString()}
                          </span>
                        </div>

                        {/* Desktop Member */}
                        <div className="col-span-3 hidden sm:flex sm:items-center sm:gap-2">
                          <span className="text-sm text-slate-600">{tx.memberName}</span>
                          {isSms && tx.bankName && (
                            <span className="text-[10px] font-semibold text-cyan-600 bg-cyan-50 dark:bg-cyan-900/30 dark:text-cyan-400 px-1.5 py-0.5 rounded-md">
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
                            className="p-2 rounded-lg text-slate-400 hover:text-primary-500 hover:bg-primary-50 transition-all opacity-0 group-hover:opacity-100"
                            aria-label="View details"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSingleDelete(tx.id);
                            }}
                            disabled={deletingId === tx.id}
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                            aria-label="Delete transaction"
                          >
                            {deletingId === tx.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        </div>
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
                className="bg-white dark:bg-[#12121f] rounded-2xl shadow-2xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto border border-slate-100 dark:border-slate-800/80 custom-scrollbar"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setSelectedTx(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
                <div className="space-y-5">
                  {/* Header */}
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center ${selectedTx.type === 'income'
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500'
                          : 'bg-rose-50 dark:bg-rose-950/30 text-rose-500'
                        }`}
                    >
                      {selectedTx.type === 'income' ? <ArrowUpRight size={28} /> : <ArrowDownRight size={28} />}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white">{t(selectedTx.category)}</h3>
                      <span
                        className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${selectedTx.type === 'income'
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400'
                          }`}
                      >
                        {t(selectedTx.type)}
                      </span>
                    </div>
                  </div>
                  {/* Amount */}
                  <div className="text-center py-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100/50 dark:border-slate-700/20">
                    <p
                      className={`text-4xl font-black font-sans ${selectedTx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                    >
                      {selectedTx.type === 'income' ? '+' : '-'}₹{Number(selectedTx.amount).toLocaleString()}
                    </p>
                  </div>
                  {/* Details */}
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/60">
                      <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <Calendar size={14} /> {t('Date')}
                      </span>
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {selectedTx.date}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/60">
                      <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <Clock size={14} /> {t('Time')}
                      </span>
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {new Date(selectedTx.created_at || selectedTx.date).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/60">
                      <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <Tag size={14} /> {t('Category')}
                      </span>
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {t(selectedTx.category)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/60">
                      <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <Clock size={14} /> {t('Member')}
                      </span>
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {t(selectedTx.memberName)}
                      </span>
                    </div>
                    {/* SMS Source Info */}
                    {selectedTx.source === 'sms' && (
                      <div className="mt-2 p-3 rounded-xl bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/20 dark:to-blue-950/15 border border-cyan-200/50 dark:border-cyan-800/30 space-y-2">
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
                      <div className="py-2">
                        <span className="text-sm text-slate-500 dark:text-slate-400 block mb-1">{t('Notes')}</span>
                        <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100/50 dark:border-slate-700/20">
                          {selectedTx.notes}
                        </p>
                      </div>
                    )}
                    {selectedTx.proofUrl && (
                      <div className="py-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-slate-500 dark:text-slate-400">{t('Receipt Proof')}</span>
                          <button
                            onClick={() => setLightboxImg(selectedTx.proofUrl)}
                            className="text-xs font-bold text-primary-500 hover:text-primary-600 flex items-center gap-1 bg-primary-50 dark:bg-primary-950/40 px-2 py-1 rounded-lg border border-primary-100/50 dark:border-primary-900/30"
                          >
                            <Eye size={12} /> {t('View Full')}
                          </button>
                        </div>
                        <div
                          className="relative rounded-xl overflow-hidden cursor-pointer group border border-slate-200 dark:border-slate-800/80 h-40"
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
                        handleSingleDelete(selectedTx.id);
                        setSelectedTx(null);
                      }
                    }}
                    className="w-full py-3 text-sm font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/20 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-all border border-rose-100/50 dark:border-rose-900/20"
                  >
                    {t('Delete Transaction')}
                  </button>
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

      {/* Export Modal */}
      {createPortal(
        <AnimatePresence>
          {isExportModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setIsExportModalOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 relative"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-primary-50 text-primary-500">
                      <Download size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{t('Export History')}</h3>
                  </div>
                  <button
                    onClick={() => setIsExportModalOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
                    aria-label="Close export modal"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5 block">
                      {t('From Date')}
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="date"
                        value={exportRange.from}
                        onChange={(e) => setExportRange((r) => ({ ...r, from: e.target.value }))}
                        className="input-field !pl-10 !py-2.5 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5 block">
                      {t('To Date')}
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="date"
                        value={exportRange.to}
                        onChange={(e) => setExportRange((r) => ({ ...r, to: e.target.value }))}
                        className="input-field !pl-10 !py-2.5 text-sm"
                      />
                    </div>
                  </div>
                  <div className="pt-4">
                    <button
                      onClick={generatePDF}
                      disabled={isGeneratingPDF}
                      className="w-full btn-primary !py-3 flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20 active:scale-95 transition-all"
                    >
                      {isGeneratingPDF ? (
                        <>
                          <Loader2 size={18} className="animate-spin" /> Generating Statement...
                        </>
                      ) : (
                        <>
                          <Download size={18} /> Download PDF Report
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
    </motion.div>
  );
}
