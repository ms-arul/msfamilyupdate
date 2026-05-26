import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import HeaderActions from '../components/ui/HeaderActions';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { downloadBase64File } from '../utils/downloadHelper';
import { triggerInstantNotification } from '../utils/notificationService';
import { sendPushToUser } from '../utils/pushService';
import { staggerContainer, staggerItem } from '../utils/animations';
import {
  Banknote,
  Wallet,
  CheckCircle2,
  Clock,
  User,
  Calendar,
  AlertCircle,
  CalendarDays,
  CalendarRange,
  Repeat,
  BellRing,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  MoreVertical,
  Plus,
  X,
  Search,
  SortAsc,
  Edit3,
  RefreshCw,
  Download,
  BarChart3,
  Percent,
  Hash,
  Info,
  ChevronDown,
  ChevronUp,
  Tag,
  Zap,
  Trash2,
  MessageCircle,
} from 'lucide-react';
import AnimatedNumber from '../components/ui/AnimatedNumber';

// ─────────────────────────────────────────────────────────────────────────────
// Types & Interfaces
// ─────────────────────────────────────────────────────────────────────────────

interface PaymentHistoryLog {
  cycle: string;
  amount: number;
  paid_amount: number;
  date: string;
  status: 'paid' | 'partial' | 'unpaid';
}

interface Loan {
  id: string;
  person: string;
  type: 'lent' | 'borrowed' | string;
  loan_category: string;
  interest_rate: number | null;
  amount: number;
  paid_amount: number;
  date: string;
  due_date: string | null;
  recurring_day: number | null;
  recurring_week_day: string | null;
  notes: string;
  status: 'active' | 'settled' | string;
  user_id: string;
  recurring_cycle_id: string | null;
  next_due_date: string | null;
  last_notification_sent: string | null;
  installment_count: number;
  payment_history: PaymentHistoryLog[] | null;
}

interface LoanFormData {
  person: string;
  type: 'lent' | 'borrowed' | string;
  loan_category: string;
  interest_rate: string;
  amount: string;
  paid_amount: string;
  date: string;
  dueDate: string;
  notes: string;
  recurring_day: number;
  recurring_week_day: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants & Helpers
// ─────────────────────────────────────────────────────────────────────────────

const FILTER_TABS = [
  { id: 'all', label: 'All', icon: Hash },
  { id: 'active', label: 'Active', icon: Zap },
  { id: 'settled', label: 'Settled', icon: CheckCircle2 },
  { id: 'lent', label: 'Lent', icon: TrendingUp },
  { id: 'borrowed', label: 'Borrowed', icon: TrendingDown },
  { id: 'emi', label: 'EMI', icon: Repeat },
  { id: 'weekly', label: 'Weekly', icon: CalendarRange },
];

const SORT_OPTIONS = [
  { id: 'date_desc', label: 'Newest First' },
  { id: 'date_asc', label: 'Oldest First' },
  { id: 'amount_desc', label: 'Highest Amount' },
  { id: 'amount_asc', label: 'Lowest Amount' },
  { id: 'person', label: 'Name A–Z' },
];

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function formatCurrency(n: number): string {
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1000).toFixed(1)}K`; // Fixed division for thousands
  return `₹${n.toLocaleString('en-IN')}`;
}

function formatFullCurrency(n: number | string): string {
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const due = new Date(Date.UTC(y, m - 1, d));
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  return Math.round((due.getTime() - todayUTC.getTime()) / 86400000);
}

function getDueBadge(loan: Loan) {
  if (loan.status !== 'active') return null;
  const isEMI = loan.loan_category === 'EMI';
  const isWeekly = loan.loan_category === 'Weekly Finance';
  const targetDate = (isEMI || isWeekly) ? loan.next_due_date : loan.due_date;
  if (!targetDate) return null;

  const diff = daysUntil(targetDate);
  if (diff === null) return null;
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, color: 'rose', urgent: true };
  if (diff === 0) return { label: 'Due today', color: 'orange', urgent: true };
  if (diff <= 3) return { label: `${diff}d left`, color: 'amber', urgent: false };
  if (diff <= 7) return { label: `${diff}d left`, color: 'yellow', urgent: false };
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Timezone-safe date & recurring calculations
// ─────────────────────────────────────────────────────────────────────────────

function parseUTCDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatUTCDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function calculateInitialEMIDueDate(startDateStr: string, recurringDay: number): string {
  const [y, m, d] = startDateStr.split('-').map(Number);
  const maxDaysCurrent = new Date(y, m, 0).getDate();
  const dayCurrent = Math.min(recurringDay, maxDaysCurrent);

  if (dayCurrent >= d) {
    return `${y}-${String(m).padStart(2, '0')}-${String(dayCurrent).padStart(2, '0')}`;
  } else {
    let nextM = m + 1;
    let nextY = y;
    if (nextM > 12) {
      nextM = 1;
      nextY++;
    }
    const maxDaysNext = new Date(nextY, nextM, 0).getDate();
    const dayNext = Math.min(recurringDay, maxDaysNext);
    return `${nextY}-${String(nextM).padStart(2, '0')}-${String(dayNext).padStart(2, '0')}`;
  }
}

function calculateInitialWeeklyDueDate(startDateStr: string, targetWeekday: string): string {
  const WEEKDAYS_MAP = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const targetIdx = WEEKDAYS_MAP.indexOf(targetWeekday);
  if (targetIdx === -1) return startDateStr;

  const [y, m, d] = startDateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));

  const startIdx = date.getUTCDay();
  let diff = targetIdx - startIdx;
  if (diff <= 0) {
    diff += 7;
  }

  date.setUTCDate(date.getUTCDate() + diff);
  return formatUTCDate(date);
}

function getNextEMIDate(currentDueDateStr: string, recurringDay: number): string {
  const [y, m] = currentDueDateStr.split('-').map(Number);
  let nextM = m + 1;
  let nextY = y;
  if (nextM > 12) {
    nextM = 1;
    nextY++;
  }
  const maxDays = new Date(nextY, nextM, 0).getDate();
  const targetDay = Math.min(recurringDay, maxDays);
  return `${nextY}-${String(nextM).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
}

function getNextWeeklyDate(currentDueDateStr: string): string {
  const [y, m, d] = currentDueDateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + 7);
  return formatUTCDate(date);
}

function getCycleName(dateStr: string, category: string): string {
  const [y, m] = dateStr.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (category === 'EMI') {
    return `${months[m - 1]} ${y}`;
  } else {
    const date = parseUTCDate(dateStr);
    const day = date.getUTCDate();
    return `Wk of ${months[m - 1]} ${day}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Animation Variants
// ─────────────────────────────────────────────────────────────────────────────

const containerVariants = staggerContainer(0.06, 0.08);
const itemVariants = staggerItem;
const slideUp = staggerItem;


// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ComponentType<any>;
  label: string;
  value: React.ReactNode;
  color: 'emerald' | 'rose' | 'indigo' | 'violet';
  sub?: string;
}

function StatCard({ icon: Icon, label, value, color, sub }: StatCardProps) {
  const colors = {
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', glow: 'bg-emerald-400/25', icon: 'text-emerald-500', border: 'border-emerald-100 dark:border-emerald-500/20' },
    rose: { bg: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', glow: 'bg-rose-400/25', icon: 'text-rose-500', border: 'border-rose-100 dark:border-rose-500/20' },
    indigo: { bg: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', glow: 'bg-indigo-400/25', icon: 'text-indigo-500', border: 'border-indigo-100 dark:border-indigo-500/20' },
    violet: { bg: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400', glow: 'bg-violet-400/25', icon: 'text-violet-500', border: 'border-violet-100 dark:border-violet-500/20' },
  };
  const c = colors[color] || colors.indigo;

  return (
    <motion.div variants={itemVariants} className="glass-panel p-3.5 sm:p-5 relative overflow-hidden group cursor-default select-none">
      <div className={`absolute -right-5 -top-5 w-20 h-20 rounded-full ${c.glow} blur-2xl transition-all duration-700 opacity-40 group-hover:opacity-100 group-hover:scale-150`} />
      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 relative z-10">
        <div className={`p-1.5 sm:p-2 ${c.bg} border ${c.border} rounded-lg sm:rounded-xl ${c.icon} shrink-0`}>
          <Icon size={16} className="sm:w-5 sm:h-5" />
        </div>
        <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest truncate leading-none">
          {label}
        </p>
      </div>
      <div className={`text-2xl sm:text-3xl font-black font-sans ${c.text} relative z-10 truncate leading-none`}>
        {value}
      </div>
      {sub && (
        <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-1.5 relative z-10 font-medium">{sub}</p>
      )}
    </motion.div>
  );
}

interface LoanCardProps {
  loan: Loan;
  onSettle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (loan: Loan) => void;
  onRemind: (loan: Loan) => void;
  onRecordPayment: (loan: Loan, amount: number) => Promise<void>;
  getOrdinalFn: (n: number) => string;
}

function LoanCard({ loan, onSettle, onDelete, onEdit, onRemind, onRecordPayment, getOrdinalFn }: LoanCardProps) {
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isLent = loan.type === 'lent';
  const isSettled = loan.status === 'settled';
  const dueBadge = getDueBadge(loan);

  const isEMI = loan.loan_category === 'EMI';
  const isWeekly = loan.loan_category === 'Weekly Finance';
  const targetDueDate = (isEMI || isWeekly) ? loan.next_due_date : loan.due_date;
  
  const diffDays = daysUntil(targetDueDate);
  const isOverdue = !isSettled && diffDays !== null && diffDays < 0;

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleQuickPaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(payAmount);
    if (!amt || amt <= 0) return;
    setIsPaying(true);
    try {
      await onRecordPayment(loan, amt);
      setPayAmount('');
    } catch (err) {}
    setIsPaying(false);
  };

  const accentColor = isSettled ? 'slate' : isLent ? 'emerald' : 'rose';
  const accentMap = {
    emerald: { bar: 'bg-emerald-400', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200/60 dark:border-emerald-500/20' },
    rose: { bar: 'bg-rose-400', text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10', border: 'border-rose-200/60 dark:border-rose-500/20' },
    slate: { bar: 'bg-slate-300', text: 'text-slate-400', bg: 'bg-slate-50 dark:bg-slate-500/5', border: 'border-slate-200/60 dark:border-slate-805' },
  };
  const ac = accentMap[accentColor];

  // Calculate repayment stats
  const totalPaidInHistory = (loan.payment_history || []).reduce((sum, item) => sum + Number(item.paid_amount || 0), 0);
  const currentInstallmentNumber = (loan.installment_count || 0) + 1;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98, y: 8 }}
      animate={isOverdue ? {
        opacity: 1,
        scale: 1,
        y: 0,
        borderColor: ['rgba(244, 63, 94, 0.1)', 'rgba(244, 63, 94, 0.4)', 'rgba(244, 63, 94, 0.1)'],
        boxShadow: ['0 0 0 rgba(244, 63, 94, 0)', '0 4px 14px rgba(244, 63, 94, 0.08)', '0 0 0 rgba(244, 63, 94, 0)'],
      } : { opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: -4, transition: { duration: 0.2 } }}
      transition={isOverdue ? {
        scale: { duration: 0.2 },
        borderColor: { repeat: Infinity, duration: 2.2, ease: 'easeInOut' },
        boxShadow: { repeat: Infinity, duration: 2.2, ease: 'easeInOut' }
      } : {}}
      className={`relative transition-colors border border-slate-150 dark:border-slate-800/80 rounded-2xl overflow-hidden ${isSettled ? 'opacity-55' : ''} ${isOverdue ? 'border-rose-400/40 bg-rose-50/10 dark:bg-rose-950/5' : ''}`}
    >
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-[4px] ${ac.bar} rounded-full`} />

      <div 
        onClick={() => setExpanded(!expanded)}
        className="pl-4 pr-3 sm:pl-5 sm:pr-4 py-3.5 hover:bg-slate-50/80 dark:hover:bg-[#1a1a2e]/50 transition-colors active:bg-slate-100/50 dark:active:bg-[#242440]/30 cursor-pointer select-none"
      >
        {/* ── Row 1: Name + Amount + Menu ── */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full ${ac.bg} ${ac.border} border flex items-center justify-center shrink-0 mt-0.5`}>
              <span className={`text-xs font-black ${ac.text}`}>
                {loan.person.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h3 className={`text-[14.5px] font-black leading-tight truncate ${isSettled ? 'text-slate-400 line-through decoration-slate-300/70' : 'text-slate-800 dark:text-slate-200'}`}>
                  {loan.person}
                </h3>
                {isEMI && !isSettled && (
                  <span className="text-[9px] font-extrabold text-violet-500 bg-violet-50 dark:bg-violet-950/20 px-1 py-[1px] rounded border border-violet-100 dark:border-violet-900/30">
                    Cycle #{currentInstallmentNumber}
                  </span>
                )}
              </div>
              
              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-1 mt-1.5">
                <span className={`text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-[2px] rounded-md ${isSettled ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                    : isLent ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
                  }`}>
                  {isSettled ? 'Settled' : isLent ? '↑ Lent' : '↓ Borrowed'}
                </span>

                {loan.loan_category && loan.loan_category !== 'Standard' && (
                  <span className={`text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-[2px] rounded-md ${loan.loan_category === 'EMI' ? 'bg-violet-100 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'
                    }`}>
                    {loan.loan_category === 'EMI' ? '📅 EMI' : '🗓 Weekly'}
                  </span>
                )}

                {dueBadge && (
                  <span className={`text-[8px] font-bold px-1.5 py-[2px] rounded-md flex items-center gap-0.5 ${dueBadge.urgent ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 animate-pulse' : 'bg-amber-100 text-amber-750 dark:bg-amber-950/30 dark:text-amber-400'
                    }`}>
                    <AlertCircle size={7} /> {dueBadge.label}
                  </span>
                )}

                {loan.recurring_day && isEMI && !isSettled && (
                  <span className="text-[8px] font-bold text-violet-600 bg-violet-50 dark:bg-violet-950/20 px-1.5 py-[2px] rounded-md border border-violet-200/50 dark:border-violet-850 flex items-center gap-0.5">
                    <BellRing size={7} /> {loan.recurring_day}{getOrdinalFn(loan.recurring_day)}
                  </span>
                )}
                {loan.recurring_week_day && isWeekly && !isSettled && (
                  <span className="text-[8px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-1.5 py-[2px] rounded-md border border-amber-200/50 dark:border-amber-850 flex items-center gap-0.5">
                    <BellRing size={7} /> {loan.recurring_week_day.slice(0, 3)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Amount + Menu */}
          <div className="flex items-start gap-1 shrink-0" onClick={e => e.stopPropagation()}>
            <div className="text-right">
              <p className={`text-[17px] font-black font-sans leading-none ${isSettled ? 'text-slate-350 dark:text-slate-600' : isLent ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                {formatFullCurrency(loan.amount - (loan.paid_amount || 0))}
              </p>
              {(loan.paid_amount > 0 || (loan.interest_rate !== null && loan.interest_rate > 0)) && (
                <div className="flex flex-col items-end gap-0.5 mt-1">
                  {loan.paid_amount > 0 && (
                    <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500">
                      of {formatFullCurrency(loan.amount)}
                    </p>
                  )}
                  {loan.interest_rate !== null && loan.interest_rate > 0 && (
                    <p className="text-[9px] font-bold text-violet-500">{loan.interest_rate}% p.a.</p>
                  )}
                </div>
              )}
            </div>

            {/* 3-dot menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                className={`p-1.5 rounded-xl transition-all ${menuOpen ? 'bg-slate-800 text-white dark:bg-slate-700' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                <MoreVertical size={16} />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-7 z-50 bg-white dark:bg-[#1a1a2e] rounded-xl shadow-xl border border-slate-200/80 dark:border-slate-750 py-1 min-w-[140px] overflow-hidden"
                  >
                    {!isSettled && (
                      <>
                        <button
                          type="button"
                          onClick={() => { onSettle(loan.id); setMenuOpen(false); }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12px] font-semibold text-emerald-600 dark:text-emerald-450 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                        >
                          <CheckCircle2 size={13} /> {t('Mark Settled')}
                        </button>
                        <button
                          type="button"
                          onClick={() => { onRemind(loan); setMenuOpen(false); }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12px] font-semibold text-blue-600 dark:text-blue-455 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                        >
                          <MessageCircle size={13} /> {t('Send Reminder')}
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => { onEdit(loan); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                    >
                      <Edit3 size={13} /> {t('Edit')}
                    </button>
                    <div className="h-px bg-slate-100 dark:bg-slate-800 mx-2 my-1" />
                    <button
                      type="button"
                      onClick={() => { onDelete(loan.id); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12px] font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                    >
                      <X size={13} /> {t('Delete')}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ── Row 2: Meta (date, due) ── */}
        <div className="flex items-center gap-x-3 gap-y-1 flex-wrap ml-10.5 text-[10.5px] text-slate-400 dark:text-slate-500">
          <span className="flex items-center gap-1">
            <Calendar size={9} /> {loan.date}
          </span>
          {targetDueDate && !isSettled && (
            <span className={`flex items-center gap-1 font-bold ${isOverdue ? 'text-rose-500 dark:text-rose-455' : 'text-slate-500 dark:text-slate-400'}`}>
              <Clock size={9} /> {isEMI || isWeekly ? 'next due' : 'due'} {targetDueDate}
            </span>
          )}
        </div>

        {/* ── Progress Bar (For active EMI/Weekly Finance) ── */}
        {!isSettled && (isEMI || isWeekly) && (
          <div className="ml-10.5 mt-3">
            <div className="flex justify-between text-[9px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-1">
              <span>Current Cycle</span>
              <span>{Math.round(Math.min((loan.paid_amount / loan.amount) * 100, 100))}% ({formatFullCurrency(loan.paid_amount)} / {formatFullCurrency(loan.amount)})</span>
            </div>
            <div className="w-full h-[6px] bg-slate-150 dark:bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((loan.paid_amount / loan.amount) * 100, 100)}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className={`h-full rounded-full ${isLent ? 'bg-emerald-500' : 'bg-rose-500'}`}
              />
            </div>
          </div>
        )}

        {/* ── Expandable Detail Section ── */}
        {expanded && (
          <div className="ml-10.5 mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-3" onClick={e => e.stopPropagation()}>
            {/* Notes */}
            {loan.notes && (
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Notes</p>
                <p className="text-[12px] text-slate-650 dark:text-slate-355 leading-relaxed pl-0.5">{loan.notes}</p>
              </div>
            )}

            {/* Repayment History Timeline */}
            {loan.payment_history && loan.payment_history.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Repayment History ({loan.payment_history.length})</p>
                <div className="relative pl-3 border-l-[1.5px] border-slate-100 dark:border-slate-800 ml-1.5 space-y-3 py-1">
                  {loan.payment_history.map((hist, idx) => (
                    <div key={idx} className="relative flex items-center justify-between text-xs">
                      {/* Timeline dot */}
                      <div 
                        className="absolute -left-[16.5px] w-2 h-2 rounded-full border border-white dark:border-[#12121f] bg-current text-current"
                        style={{
                          color: hist.status === 'paid' ? '#10b981' : hist.status === 'partial' ? '#f59e0b' : '#f43f5e'
                        }}
                      />
                      <div className="pl-1">
                        <p className="font-bold text-slate-700 dark:text-slate-300">{hist.cycle}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">Paid {formatFullCurrency(hist.paid_amount)} of {formatFullCurrency(hist.amount)} on {hist.date}</p>
                      </div>
                      <span className={`text-[9px] font-extrabold uppercase px-1.5 py-[2px] rounded ${
                        hist.status === 'paid' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-450' :
                        hist.status === 'partial' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-450' :
                        'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-450'
                      }`}>
                        {hist.status}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 pl-0.5">
                  Total logged in history: <strong className="text-slate-650 dark:text-slate-300">{formatFullCurrency(totalPaidInHistory)}</strong>
                </div>
              </div>
            )}

            {/* Inline Quick Payment Option */}
            {!isSettled && (isEMI || isWeekly) && (
              <form onSubmit={handleQuickPaySubmit} className="pt-2 flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                  <input
                    type="number"
                    min="1"
                    placeholder={`Pay active cycle (Remaining: ${formatFullCurrency(Math.max(loan.amount - loan.paid_amount, 0))})`}
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#12121f] border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-7 pr-3 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/25 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isPaying || !payAmount}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center shrink-0"
                >
                  {isPaying ? 'Saving...' : 'Pay EMI'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Chevron indicators at card base to show expandability */}
        {!expanded && (loan.notes || loan.payment_history?.length || !isSettled) && (
          <div className="flex justify-center text-slate-350 dark:text-slate-700 mt-1 mb-[-4px]">
            <ChevronDown size={11} className="animate-bounce" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Form Field Components (reusable within the modal)
// ─────────────────────────────────────────────────────────────────────────────

interface FieldGroupProps {
  label: string;
  icon?: React.ComponentType<any>;
  required?: boolean;
  children: React.ReactNode;
  accent?: string;
}

function FieldGroup({ label, icon: Icon, required, children, accent }: FieldGroupProps) {
  const accentClass = accent ? `text-${accent}-500` : 'text-slate-400';
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest pl-0.5 flex items-center gap-1.5">
        {Icon && <Icon size={10} className={accentClass} />}
        {label}
        {!required && <span className="text-[8px] font-normal normal-case tracking-normal text-slate-300 dark:text-slate-600">(optional)</span>}
      </label>
      {children}
    </div>
  );
}

const getEmptyForm = (): LoanFormData => ({
  person: '',
  type: 'lent',
  loan_category: 'Standard',
  interest_rate: '',
  amount: '',
  paid_amount: '',
  date: new Date().toISOString().split('T')[0],
  dueDate: '',
  notes: '',
  recurring_day: 15,
  recurring_week_day: 'Monday',
});

export default function Loans() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);  // loan being edited
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<LoanFormData>(getEmptyForm());
  const [formStep, setFormStep] = useState(1); // 1 or 2 (two-step form)
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean; icon: any }>({ message: '', visible: false, icon: null });
  const [deleteConfirm, setDeleteConfirm] = useState<{ visible: boolean; loanId: string | null }>({ visible: false, loanId: null });
  const sortMenuRef = useRef<HTMLDivElement>(null);

  // ── Toast ──────────────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string, icon: any = null) => {
    setToast({ message: msg, visible: true, icon });
    setTimeout(() => setToast({ message: '', visible: false, icon: null }), 2500);
  }, []);

  // ── Sync Recurring EMI / Weekly Loans ──────────────────────────────────────
  const syncRecurringLoans = useCallback(async (rawLoans: Loan[]): Promise<Loan[]> => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    const updatedList = [...rawLoans];
    let needsListWrite = false;

    for (let i = 0; i < updatedList.length; i++) {
      const loan = updatedList[i];
      if (loan.status !== 'active') continue;

      const isEMI = loan.loan_category === 'EMI';
      const isWeekly = loan.loan_category === 'Weekly Finance';
      if (!isEMI && !isWeekly) continue;

      const currentLoan = { ...loan };
      let loanNeedsWrite = false;

      // 1. Initialize next_due_date if missing
      if (!currentLoan.next_due_date) {
        if (isEMI) {
          currentLoan.next_due_date = calculateInitialEMIDueDate(currentLoan.date, currentLoan.recurring_day || 15);
        } else {
          currentLoan.next_due_date = calculateInitialWeeklyDueDate(currentLoan.date, currentLoan.recurring_week_day || 'Monday');
        }
        currentLoan.recurring_cycle_id = currentLoan.recurring_cycle_id || `cycle_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        currentLoan.payment_history = currentLoan.payment_history || [];
        currentLoan.installment_count = currentLoan.installment_count || 0;
        loanNeedsWrite = true;
      }

      // 2. Rollover cycle recursively if today has reached/passed next_due_date
      while (currentLoan.next_due_date && todayStr >= currentLoan.next_due_date) {
        const currentHistory = currentLoan.payment_history || [];
        const cycleLabel = getCycleName(currentLoan.next_due_date, currentLoan.loan_category);

        let cycleStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
        if (Number(currentLoan.paid_amount) >= Number(currentLoan.amount)) {
          cycleStatus = 'paid';
        } else if (Number(currentLoan.paid_amount) > 0) {
          cycleStatus = 'partial';
        }

        const newHistoryLog: PaymentHistoryLog = {
          cycle: cycleLabel,
          amount: Number(currentLoan.amount),
          paid_amount: Number(currentLoan.paid_amount || 0),
          date: todayStr,
          status: cycleStatus
        };

        currentLoan.payment_history = [...currentHistory, newHistoryLog];
        currentLoan.installment_count = (currentLoan.installment_count || 0) + 1;
        
        // Reset paid amount for new cycle
        currentLoan.paid_amount = 0;

        // Advance next date
        if (isEMI) {
          currentLoan.next_due_date = getNextEMIDate(currentLoan.next_due_date, currentLoan.recurring_day || 15);
        } else {
          currentLoan.next_due_date = getNextWeeklyDate(currentLoan.next_due_date);
        }

        loanNeedsWrite = true;
      }

      if (loanNeedsWrite) {
        needsListWrite = true;
        try {
          await supabase
            .from('loans')
            .update({
              next_due_date: currentLoan.next_due_date,
              paid_amount: currentLoan.paid_amount,
              installment_count: currentLoan.installment_count,
              payment_history: currentLoan.payment_history,
              recurring_cycle_id: currentLoan.recurring_cycle_id
            })
            .eq('id', currentLoan.id);

          updatedList[i] = currentLoan;
        } catch (dbErr) {
          console.error('Failed to save rolled over loan status in Supabase:', dbErr);
        }
      }
    }

    return updatedList;
  }, []);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchLoans = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      
      const normalized = await syncRecurringLoans(data || []);
      setLoans(normalized);
    } catch (err) {
      console.error('Error fetching loans:', err);
      showToast('Failed to load records.', AlertCircle);
    } finally {
      setIsLoading(false);
    }
  }, [user, syncRecurringLoans, showToast]);

  useEffect(() => { 
    fetchLoans(); 

    const handleAppRefresh = () => {
      fetchLoans();
    };
    window.addEventListener('app:refresh', handleAppRefresh);

    return () => {
      window.removeEventListener('app:refresh', handleAppRefresh);
    };
  }, [fetchLoans]);

  // ── Notification permission + due-date checks ──────────────────────────────
  useEffect(() => {
    if ('Notification' in window) Notification.requestPermission();
  }, []);

  useEffect(() => {
    const checkDueDates = async () => {
      if (!user || loans.length === 0) return;
      
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      for (const loan of loans) {
        if (loan.status !== 'active') continue;

        // Prevent duplicate reminders on the same day
        if (loan.last_notification_sent === todayStr) continue;

        const isEMI = loan.loan_category === 'EMI';
        const isWeekly = loan.loan_category === 'Weekly Finance';
        const targetDate = (isEMI || isWeekly) ? loan.next_due_date : loan.due_date;
        if (!targetDate) continue;

        const diff = daysUntil(targetDate);
        if (diff === null) continue;

        let title = '';
        let body = '';
        const verbTamil = loan.type === 'lent' ? `${loan.person}-இடமிருந்து பெற வேண்டிய` : `${loan.person}-இடத்திற்கு செலுத்த வேண்டிய`;
        const amountStr = formatFullCurrency(loan.amount - (loan.paid_amount || 0));

        if (diff < 0) {
          title = 'காலக்கெடு முடிந்தது! ⚠️';
          body = `தாமதக் கட்டணம்: ${verbTamil} ${amountStr} காலக்கெடு முடிந்துவிட்டது. உடனே தொடர்பு கொள்ளவும்.`;
        } else if (diff === 0) {
          title = 'தவணை நினைவூட்டல் (இன்று) 🔔';
          body = `இன்று செலுத்த வேண்டிய தவணை: ${verbTamil} ${amountStr}.`;
        } else if (diff === 2) {
          title = 'தவணை நினைவூட்டல் (2 நாட்களில்) 📅';
          body = `இன்னும் 2 நாட்களில்: ${verbTamil} ${amountStr} செலுத்த வேண்டும்.`;
        }

        if (title && body) {
          try {
            // 1. Native/Browser Instant Alert
            await triggerInstantNotification(title, body, '/loans');
            
            // 2. Persistent Feed in Notifications
            await supabase.from('notifications').insert({
              user_id: user.id,
              type: 'warning',
              title,
              message: body,
              is_read: false
            });
            
            // 3. Remote Push
            await sendPushToUser(user.id, title, body);

            // 4. Update last_notification_sent in database to prevent duplicates
            await supabase
              .from('loans')
              .update({ last_notification_sent: todayStr })
              .eq('id', loan.id);
            
            // Optimistically update memory state to avoid re-triggering during active session
            loan.last_notification_sent = todayStr;
          } catch (err) {
            console.error('Failed to trigger notification:', err);
          }
        }
      }
    };
    
    const id = setTimeout(checkDueDates, 3000);
    return () => clearTimeout(id);
  }, [loans, user]);

  // ── Close sort menu outside click ─────────────────────────────────────────
  useEffect(() => {
    if (!showSortMenu) return;
    const h = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showSortMenu]);

  // ── Derived Stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const active = loans.filter(l => l.status === 'active');
    const lentList = active.filter(l => l.type === 'lent');
    const borrList = active.filter(l => l.type === 'borrowed');
    const totalLent = lentList.reduce((s, l) => s + (Number(l.amount) - Number(l.paid_amount || 0)), 0);
    const totalBorr = borrList.reduce((s, l) => s + (Number(l.amount) - Number(l.paid_amount || 0)), 0);
    const net = totalLent - totalBorr;
    const overdueLoans = active.filter(l => {
      const d = daysUntil(l.due_date);
      return d !== null && d < 0;
    });
    const overdueCount = overdueLoans.length;
    const overdueNames = overdueLoans.map(l => l.person);
    return { totalLent, totalBorr, net, activeCount: active.length, overdueCount, overdueNames, lentCount: lentList.length, borrCount: borrList.length };
  }, [loans]);

  // ── Filtered + Sorted list ────────────────────────────────────────────────
  const filteredLoans = useMemo(() => {
    let result = [...loans];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l =>
        l.person.toLowerCase().includes(q) ||
        (l.notes || '').toLowerCase().includes(q)
      );
    }

    switch (filter) {
      case 'active': result = result.filter(l => l.status === 'active'); break;
      case 'settled': result = result.filter(l => l.status === 'settled'); break;
      case 'lent': result = result.filter(l => l.type === 'lent'); break;
      case 'borrowed': result = result.filter(l => l.type === 'borrowed'); break;
      case 'emi': result = result.filter(l => l.loan_category === 'EMI'); break;
      case 'weekly': result = result.filter(l => l.loan_category === 'Weekly Finance'); break;
    }

    switch (sortBy) {
      case 'date_asc': result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); break;
      case 'amount_desc': result.sort((a, b) => Number(b.amount) - Number(a.amount)); break;
      case 'amount_asc': result.sort((a, b) => Number(a.amount) - Number(b.amount)); break;
      case 'person': result.sort((a, b) => a.person.localeCompare(b.person)); break;
      default: // date_desc — active first, then by date
        result.sort((a, b) => {
          if (a.status === 'active' && b.status !== 'active') return -1;
          if (a.status !== 'active' && b.status === 'active') return 1;
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
    }
    return result;
  }, [loans, searchQuery, filter, sortBy]);

  // Autosave draft form
  useEffect(() => {
    if (showAddModal && !editingLoan) {
      localStorage.setItem('loans_form_draft', JSON.stringify(formData));
    }
  }, [formData, showAddModal, editingLoan]);

  // ── Open modal for new or edit ────────────────────────────────────────────
  const openAddModal = () => {
    setEditingLoan(null);
    const draft = localStorage.getItem('loans_form_draft');
    if (draft) {
      try {
        setFormData(JSON.parse(draft));
      } catch (e) {
        setFormData(getEmptyForm());
      }
    } else {
      setFormData(getEmptyForm());
    }
    setFormStep(1);
    setShowAddModal(true);
  };

  const openEditModal = (loan: Loan) => {
    setEditingLoan(loan);
    setFormData({
      person: loan.person || '',
      type: loan.type || 'lent',
      loan_category: loan.loan_category || 'Standard',
      interest_rate: loan.interest_rate !== null ? String(loan.interest_rate) : '',
      amount: String(loan.amount) || '',
      paid_amount: String(loan.paid_amount) || '',
      date: loan.date || new Date().toISOString().split('T')[0],
      dueDate: loan.due_date || '',
      notes: loan.notes || '',
      recurring_day: loan.recurring_day || 15,
      recurring_week_day: loan.recurring_week_day || 'Monday',
    });
    setFormStep(1);
    setShowAddModal(true);
  };

  // ── Submit (add or update) ────────────────────────────────────────────────
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Prevent submission if we are still on Step 1 OR if we are currently transitioning
    if (formStep === 1 || isTransitioning) {
      if (isTransitioning) return;
      
      if (!formData.person.trim()) {
        showToast('Please enter a person name', AlertCircle);
        return;
      }
      if (!formData.amount || Number(formData.amount) <= 0) {
        showToast('Please enter a valid amount', AlertCircle);
        return;
      }
      
      setIsTransitioning(true);
      setFormStep(2);
      // Brief delay to prevent accidental double-clicks from triggering Step 2 submit
      setTimeout(() => setIsTransitioning(false), 400);
      return;
    }
    
    if (!formData.person.trim()) {
      showToast('Please enter a person name', AlertCircle);
      return;
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
      showToast('Please enter a valid amount', AlertCircle);
      return;
    }
    if (!formData.date) {
      showToast('Please select a date', AlertCircle);
      return;
    }
    if (!user) return;
    
    setIsSubmitting(true);

    const isEMI = formData.loan_category === 'EMI';
    const isWeekly = formData.loan_category === 'Weekly Finance';
    
    let computedNextDue: string | null = null;
    if (isEMI) {
      computedNextDue = calculateInitialEMIDueDate(formData.date, formData.recurring_day || 15);
    } else if (isWeekly) {
      computedNextDue = calculateInitialWeeklyDueDate(formData.date, formData.recurring_week_day || 'Monday');
    }

    const payload = {
      person: formData.person.trim(),
      type: formData.type,
      loan_category: formData.loan_category,
      interest_rate: formData.loan_category !== 'Standard' && formData.interest_rate ? Number(formData.interest_rate) : null,
      amount: Number(formData.amount),
      paid_amount: Number(formData.paid_amount || 0),
      date: formData.date,
      due_date: isEMI || isWeekly ? null : (formData.dueDate || null),
      recurring_day: isEMI && formData.recurring_day ? Number(formData.recurring_day) : null,
      recurring_week_day: isWeekly ? formData.recurring_week_day : null,
      notes: (formData.notes || '').trim(),
      user_id: user.id,

      // New tracking columns
      next_due_date: computedNextDue,
      recurring_cycle_id: editingLoan?.recurring_cycle_id || (isEMI || isWeekly ? `cycle_${Date.now()}_${Math.floor(Math.random() * 1000)}` : null),
      installment_count: editingLoan?.installment_count || 0,
      payment_history: editingLoan?.payment_history || []
    };

    try {
      if (editingLoan) {
        const { data, error } = await supabase.from('loans').update(payload).eq('id', editingLoan.id).select().single();
        if (error) throw error;
        setLoans(prev => prev.map(l => l.id === editingLoan.id ? data : l));
        showToast('Record updated!', CheckCircle2);
      } else {
        const { data, error } = await supabase.from('loans').insert([{ ...payload, status: 'active' }]).select().single();
        if (error) throw error;
        setLoans(prev => [data, ...prev]);
        showToast('Record saved!', CheckCircle2);
      }
      setShowAddModal(false);
      setFormData(getEmptyForm());
      setEditingLoan(null);
      // Clear draft after successful save
      localStorage.removeItem('loans_form_draft');
    } catch (err) {
      console.error(err);
      showToast('Failed to save record.', AlertCircle);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Record Payment (EMI Cycle specific) ───────────────────────────────────
  const handleRecordPayment = useCallback(async (loan: Loan, payAmountVal: number) => {
    if (payAmountVal <= 0) {
      showToast('Please enter a valid payment amount', AlertCircle);
      return;
    }
    
    const newPaidAmount = Number(loan.paid_amount || 0) + payAmountVal;
    
    try {
      const { error } = await supabase
        .from('loans')
        .update({ paid_amount: newPaidAmount })
        .eq('id', loan.id);
      if (error) throw error;
      
      setLoans(prev => prev.map(l => l.id === loan.id ? { ...l, paid_amount: newPaidAmount } : l));
      showToast('Payment recorded successfully!', CheckCircle2);
    } catch (err) {
      console.error('Failed to record payment:', err);
      showToast('Failed to save payment.', AlertCircle);
      throw err;
    }
  }, [showToast]);

  // ── Settle ─────────────────────────────────────────────────────────────────
  const handleSettle = async (id: string) => {
    try {
      const { error } = await supabase.from('loans').update({ status: 'settled' }).eq('id', id);
      if (error) throw error;
      setLoans(prev => prev.map(l => l.id === id ? { ...l, status: 'settled' } : l));
      showToast('Marked as settled', CheckCircle2);
    } catch (err) {
      console.error(err);
      showToast('Failed to update.', AlertCircle);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = (id: string) => {
    setDeleteConfirm({ visible: true, loanId: id });
  };

  const confirmDelete = async () => {
    const id = deleteConfirm.loanId;
    if (!id) return;
    
    try {
      const { error } = await supabase.from('loans').delete().eq('id', id);
      if (error) throw error;
      setLoans(prev => prev.filter(l => l.id !== id));
      showToast(t('Record deleted.'), Info);
    } catch (err) {
      console.error(err);
      showToast(t('Failed to delete.'), AlertCircle);
    } finally {
      setDeleteConfirm({ visible: false, loanId: null });
    }
  };

  // ── Export PDF ─────────────────────────────────────────────────────────────
  const generatePDF = async () => {
    if (filteredLoans.length === 0) {
      showToast(t('No records to export'));
      return;
    }

    setIsGeneratingPDF(true);
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(40, 44, 52);
      doc.text('MS Family Finance Hub', 14, 22);

      doc.setFontSize(14);
      doc.setTextColor(100);
      doc.text('Loans & Debts Statement', 14, 30);

      // Period and Generation time
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 40);

      // Summary Stats
      const totalLent = stats.totalLent;
      const totalBorr = stats.totalBorr;
      const net = stats.net;

      doc.setDrawColor(240);
      doc.setFillColor(252, 252, 253);
      doc.roundedRect(14, 50, 182, 25, 3, 3, 'FD');

      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text('TOTAL LENT', 25, 58);
      doc.text('TOTAL BORROWED', 85, 58);
      doc.text('NET BALANCE', 145, 58);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129); // Emerald
      doc.text(`Rs. ${totalLent.toLocaleString()}`, 25, 67);

      doc.setTextColor(244, 63, 94); // Rose
      doc.text(`Rs. ${totalBorr.toLocaleString()}`, 85, 67);

      doc.setTextColor(net >= 0 ? 16 : 244, net >= 0 ? 185 : 63, net >= 0 ? 129 : 94);
      doc.text(`${net >= 0 ? '+' : ''}Rs. ${net.toLocaleString()}`, 145, 67);

      // Table
      autoTable(doc, {
        startY: 85,
        head: [['Person', 'Type', 'Category', 'Amount', 'Paid', 'Balance', 'Date', 'Status']],
        body: filteredLoans.map(l => [
          l.person,
          l.type.toUpperCase(),
          l.loan_category,
          `Rs. ${Number(l.amount).toLocaleString()}`,
          `Rs. ${Number(l.paid_amount || 0).toLocaleString()}`,
          `Rs. ${Number(l.amount - (l.paid_amount || 0)).toLocaleString()}`,
          l.date,
          l.status.toUpperCase()
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right', fontStyle: 'bold' }
        },
        didParseCell: function(data) {
          if (data.section === 'body' && data.column.index === 1) {
            if (data.cell.raw === 'LENT') data.cell.styles.textColor = [16, 185, 129];
            if (data.cell.raw === 'BORROWED') data.cell.styles.textColor = [244, 63, 94];
          }
          if (data.section === 'body' && data.column.index === 7) {
            if (data.cell.raw === 'ACTIVE') data.cell.styles.textColor = [245, 158, 11]; // Amber
            if (data.cell.raw === 'SETTLED') data.cell.styles.textColor = [16, 185, 129]; // Emerald
          }
        }
      });

      const pdfDataUri = doc.output('datauristring');
      await downloadBase64File(pdfDataUri, `Loans_Statement_${new Date().toISOString().split('T')[0]}.pdf`);
      showToast(t('PDF Generated Successfully'), Download);
    } catch (err) {
      console.error('PDF Error:', err);
      showToast(t('Failed to generate PDF'), AlertCircle);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // ── Send Reminder ──────────────────────────────────────────────────────────
  const handleSendReminder = (loan: Loan) => {
    const amount = formatFullCurrency(loan.amount - (loan.paid_amount || 0));
    const msg = `Reminder: Pending amount of ${amount} for ${loan.person} (${loan.loan_category}). Due date: ${loan.due_date || 'N/A'}.`;
    if (navigator.share) {
      navigator.share({ title: 'Payment Reminder', text: msg }).catch((err) => console.error('Share failed', err));
    } else {
      const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
      window.open(waUrl, '_blank');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4 sm:space-y-5 pb-8">

      {/* ── Portal: Header button ── */}
      <HeaderActions>
        <div className="flex items-center gap-1.5">
          <button
            onClick={generatePDF}
            title={t('Export PDF')}
            disabled={isGeneratingPDF}
            className="glass-btn relative w-10 h-10 rounded-[12px] flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors disabled:opacity-40"
          >
            <span className="absolute top-0 left-2 right-2 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent pointer-events-none" />
            {isGeneratingPDF ? <RefreshCw size={17} strokeWidth={2.3} className="animate-spin" /> : <Download size={17} strokeWidth={2.3} />}
          </button>
          <button
            onClick={openAddModal}
            className="glass-btn relative w-10 h-10 sm:w-auto sm:px-3 sm:h-10 rounded-[12px] flex items-center justify-center gap-1.5 text-slate-600 dark:text-slate-300 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          >
            <span className="absolute top-0 left-2 right-2 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent pointer-events-none" />
            <Plus size={17} strokeWidth={2.3} />
            <span className="hidden sm:inline text-xs font-semibold">{t('New Record')}</span>
          </button>
        </div>
      </HeaderActions>

      {/* ── KPI Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard
          icon={TrendingUp} label={t('To Receive')}
          value={<AnimatedNumber value={stats.totalLent} formatFn={formatCurrency} />}
          sub={`${stats.lentCount} ${t('active')} ${t('loan')}${stats.lentCount !== 1 ? 's' : ''}`}
          color="emerald"
        />
        <StatCard
          icon={TrendingDown} label={t('To Pay')}
          value={<AnimatedNumber value={stats.totalBorr} formatFn={formatCurrency} />}
          sub={`${stats.borrCount} ${t('active')} ${t('debt')}${stats.borrCount !== 1 ? 's' : ''}`}
          color="rose"
        />
        <StatCard
          icon={Wallet} label={t('Net Balance')}
          value={<AnimatedNumber value={Math.abs(stats.net)} prefix={stats.net >= 0 ? '+' : '-'} formatFn={formatCurrency} />}
          sub={stats.net >= 0 ? t('You are owed more') : t('You owe more')}
          color={stats.net >= 0 ? 'indigo' : 'rose'}
        />
        <StatCard
          icon={BarChart3} label={t('Records')}
          value={<AnimatedNumber value={loans.length} />}
          sub={stats.overdueCount > 0 ? `${stats.overdueCount} ${t('overdue')}` : `${stats.activeCount} ${t('active')}`}
          color={stats.overdueCount > 0 ? 'rose' : 'violet'}
        />
      </div>

      {/* ── Overdue Banner ── */}
      <AnimatePresence>
        {stats.overdueCount > 0 && (
          <motion.div
            variants={slideUp} initial="hidden" animate="show" exit="hidden"
            className="flex items-center gap-3 bg-rose-50 border border-rose-200/70 rounded-2xl px-4 py-3"
          >
            <div className="p-1.5 bg-rose-100 rounded-lg text-rose-500 shrink-0">
              <AlertCircle size={14} />
            </div>
            <div>
              <p className="text-[12px] font-bold text-rose-700">
                {stats.overdueCount} {t('overdue')} {t('records')}
              </p>
              <p className="text-[10px] text-rose-500">
                {stats.overdueNames.slice(0, 2).join(', ')}
                {stats.overdueCount > 2 ? ` +${stats.overdueCount - 2} more` : ''}
              </p>
            </div>
            <button onClick={() => setFilter('active')} className="ml-auto text-[10px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 shrink-0">
              {t('View')} <ChevronRight size={11} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main List Panel ── */}
      <motion.div variants={itemVariants} className="glass-panel">

        {/* Controls */}
        <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 space-y-2.5 rounded-t-[1.25rem]">
          {/* Search + Sort */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('Search people or notes…')}
                className="w-full bg-slate-50 dark:bg-[#1a1a2e] border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-10 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Sort dropdown */}
            <div className="relative" ref={sortMenuRef}>
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className={`p-2 rounded-xl border transition-all ${showSortMenu ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-50 dark:bg-[#1a1a2e] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-[#242440]'}`}
              >
                <SortAsc size={15} />
              </button>
              <AnimatePresence>
                {showSortMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-10 z-50 bg-white rounded-xl shadow-xl border border-slate-200/80 py-1 min-w-[180px]"
                  >
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => { setSortBy(opt.id); setShowSortMenu(false); }}
                        className={`w-full text-left px-3.5 py-2 text-[12px] font-semibold transition-colors flex items-center justify-between ${sortBy === opt.id ? 'text-primary-600 bg-primary-50' : 'text-slate-600 hover:bg-slate-50'
                          }`}
                      >
                        {opt.label}
                        {sortBy === opt.id && <CheckCircle2 size={11} className="text-primary-500" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Refresh */}
            <button
              onClick={fetchLoans}
              title="Refresh"
              className="p-2 rounded-xl bg-slate-50 dark:bg-[#1a1a2e] border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#242440] transition-all"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {/* Filter tabs — scrollable */}
          <div className="flex gap-1 overflow-x-auto pb-1 hide-scrollbar">
            {['all', 'active', 'settled'].map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all border ${filter === cat ? 'bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-500/20' : 'bg-white dark:bg-[#1a1a2e] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}
              >
                {t(cat.charAt(0).toUpperCase() + cat.slice(1))}
              </button>
            ))}
          </div>

          {/* Result count */}
          <div className="flex items-center justify-between mt-3 px-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {filteredLoans.length} {t('records')}
            </p>
            <button
              onClick={generatePDF}
              disabled={isGeneratingPDF}
              className="text-[10px] font-bold text-slate-400 hover:text-primary-600 flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              {isGeneratingPDF ? (
                <RefreshCw size={10} className="animate-spin" />
              ) : (
                <Download size={10} />
              )}
              {isGeneratingPDF ? t('Generating...') : t('Export PDF')}
            </button>
          </div>
        </div>

        {/* List */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center gap-3 text-slate-400">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <RefreshCw size={20} className="opacity-50" />
              </motion.div>
              <p className="text-sm font-medium">Loading records…</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {filteredLoans.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-slate-800">
                    <Search size={24} className="text-slate-300 dark:text-slate-600" />
                  </div>
                  <h3 className="text-slate-800 dark:text-slate-200 font-bold mb-1">{t('No records found.')}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">{t('Start by adding a new loan or debt record.')}</p>
                </div>
              ) : (
                filteredLoans.map(loan => (
                  <LoanCard
                    key={loan.id}
                    loan={loan}
                    onSettle={handleSettle}
                    onDelete={handleDelete}
                    onEdit={openEditModal}
                    onRemind={handleSendReminder}
                    onRecordPayment={handleRecordPayment}
                    getOrdinalFn={getOrdinal}
                  />
                ))
              )}
            </AnimatePresence>
          )}
        </div>

      </motion.div>

      {/* ── Add / Edit Modal ── */}
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
              initial={{ opacity: 0, y: 60, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.97 }}
              transition={{ type: 'spring', duration: 0.45, bounce: 0.12 }}
              className="bg-white dark:bg-[#12121f] w-full max-w-md rounded-3xl shadow-2xl relative border border-slate-200/80 dark:border-slate-800/50 flex flex-col overflow-hidden"
              style={{ maxHeight: 'min(90vh, 700px)' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Sticky header */}
              <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#12121f] shrink-0">
                <div>
                  <h2 className="text-[15px] font-black text-slate-900 dark:text-slate-100 leading-none">
                    {editingLoan ? t('Edit Record') : t('New Loan / Debt')}
                  </h2>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {formStep === 1 ? t('Step 1 of 2 . Basic details') : t('Step 2 of 2 . Schedule & notes')}
                  </p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors">
                  <X size={16} />
                </button>
              </div>

              {/* Step progress bar */}
              <div className="h-[2px] bg-slate-100 dark:bg-slate-800 shrink-0">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary-500 to-primary-400"
                  animate={{ width: formStep === 1 ? '50%' : '100%' }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                />
              </div>

              {/* Scrollable form body */}
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">

                  {/* ── STEP 1: Basic Details ── */}
                  {formStep === 1 && (
                    <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                      {/* Type toggle */}
                      <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl gap-1">
                        {[{ v: 'lent', label: t('I Lent Money') }, { v: 'borrowed', label: t('I Borrowed') }].map(opt => (
                          <button
                            key={opt.v}
                            type="button"
                            onClick={() => setFormData(p => ({ ...p, type: opt.v }))}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[12px] font-bold rounded-lg transition-all ${formData.type === opt.v
                                ? opt.v === 'lent' ? 'bg-emerald-500 text-white shadow-md' : 'bg-rose-500 text-white shadow-md'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'
                              }`}
                          >
                            {opt.v === 'lent' ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      {/* Person name */}
                      <FieldGroup label={t('Person Name')} icon={User} required>
                        <div className="relative">
                          <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            value={formData.person}
                            onChange={e => setFormData(p => ({ ...p, person: e.target.value }))}
                            placeholder={t('e.g. Ravi Kumar')}
                            className="input-field !pl-9"
                          />
                        </div>
                      </FieldGroup>

                      {/* Category + Amount */}
                      <div className="grid grid-cols-2 gap-3">
                        <FieldGroup label={t('Loan Type')} icon={Tag} required>
                          <div className="relative">
                            <select
                              value={formData.loan_category}
                              onChange={e => setFormData(p => ({ ...p, loan_category: e.target.value }))}
                              className="input-field !py-2.5 appearance-none font-semibold text-[13px]"
                            >
                              <option value="Standard">{t('Standard')}</option>
                              <option value="EMI">{t('Monthly EMI')}</option>
                              <option value="Weekly Finance">{t('Weekly')}</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          </div>
                        </FieldGroup>

                        <FieldGroup label={t('Amount (₹)')} icon={Banknote} required>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm pointer-events-none">₹</span>
                            <input
                              type="number" min="1"
                              value={formData.amount}
                              onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))}
                              placeholder="0"
                              className="input-field !pl-8 font-bold font-sans !py-2.5"
                            />
                          </div>
                        </FieldGroup>

                        <FieldGroup label={t('Paid Already (₹)')} icon={CheckCircle2}>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-sm pointer-events-none">₹</span>
                            <input
                              type="number" min="0"
                              value={formData.paid_amount}
                              onChange={e => setFormData(p => ({ ...p, paid_amount: e.target.value }))}
                              placeholder="0"
                              className="input-field !pl-8 font-bold font-sans !py-2.5 !border-emerald-100"
                            />
                          </div>
                        </FieldGroup>
                      </div>

                      {/* Interest Rate (conditional) */}
                      <AnimatePresence>
                        {formData.loan_category !== 'Standard' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }} className="overflow-hidden"
                          >
                            <FieldGroup label={t('Interest Rate (%)')} icon={Percent}>
                              <div className="relative">
                                <Percent size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                  type="number" min="0" step="0.01"
                                  value={formData.interest_rate}
                                  onChange={e => setFormData(p => ({ ...p, interest_rate: e.target.value }))}
                                  placeholder="e.g. 2.5"
                                  className="input-field !pl-9 font-sans"
                                />
                              </div>
                            </FieldGroup>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}

                  {/* ── STEP 2: Schedule & Notes ── */}
                  {formStep === 2 && (
                    <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">

                      {/* Dates */}
                      <div className="grid grid-cols-2 gap-3">
                        <FieldGroup label="Date Given" icon={Calendar}>
                          <input
                            type="date"
                            value={formData.date}
                            onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                            className="input-field !py-2.5 text-[13px]"
                          />
                        </FieldGroup>
                        <FieldGroup label="Due Date" icon={CalendarDays}>
                          <input
                            type="date"
                            value={formData.dueDate}
                            onChange={e => setFormData(p => ({ ...p, dueDate: e.target.value }))}
                            className="input-field !py-2.5 text-[13px]"
                          />
                        </FieldGroup>
                      </div>

                      {/* EMI Recurring Reminder */}
                      <AnimatePresence>
                        {formData.loan_category === 'EMI' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }} className="overflow-hidden"
                          >
                            <div className="p-3.5 bg-violet-50 dark:bg-violet-500/10 rounded-xl border border-violet-200/60 dark:border-violet-500/20 space-y-2.5">
                              <p className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider flex items-center gap-1.5">
                                <BellRing size={11} /> {t('Monthly EMI Reminder')}
                              </p>
                              <div className="relative">
                                <Repeat size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-400 pointer-events-none" />
                                <select
                                  value={formData.recurring_day}
                                  onChange={e => setFormData(p => ({ ...p, recurring_day: Number(e.target.value) }))}
                                  className="input-field !py-2 !pl-8 !border-violet-200 dark:!border-violet-800/50 focus:!ring-violet-500 font-bold text-violet-700 dark:text-violet-300 bg-white dark:bg-[#12121f] text-[13px]"
                                >
                                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                    <option key={d} value={d}>{d}{getOrdinal(d)} {t('of every month')}</option>
                                  ))}
                                </select>
                              </div>
                              <p className="text-[10px] text-violet-500 dark:text-violet-400 pl-0.5">
                                {t('Notified 2 days before & on the')} {formData.recurring_day}{getOrdinal(Number(formData.recurring_day))} {t('each month')}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Weekly Recurring Reminder */}
                      <AnimatePresence>
                        {formData.loan_category === 'Weekly Finance' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }} className="overflow-hidden"
                          >
                            <div className="p-3.5 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200/60 dark:border-amber-500/20 space-y-2.5">
                              <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                <BellRing size={11} /> {t('Weekly Reminder')}
                              </p>
                              <div className="grid grid-cols-4 gap-1.5">
                                {WEEKDAYS.map(day => (
                                  <button
                                    key={day}
                                    type="button"
                                    onClick={() => setFormData(p => ({ ...p, recurring_week_day: day }))}
                                    className={`py-1.5 rounded-lg text-[10px] font-bold transition-all ${formData.recurring_week_day === day
                                        ? 'bg-amber-500 text-white shadow'
                                        : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-500/30'
                                      }`}
                                  >
                                    {t(day.slice(0, 3))}
                                  </button>
                                ))}
                              </div>
                              <p className="text-[10px] text-amber-600 dark:text-amber-400 pl-0.5">
                                {t('Notified every')} {t(formData.recurring_week_day)}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Notes */}
                      <FieldGroup label={t('Notes')} icon={Info}>
                        <textarea
                          value={formData.notes}
                          onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                          placeholder={t('e.g. Dinner bill, medical emergency…')}
                          rows={3}
                          className="input-field resize-none text-sm leading-relaxed"
                        />
                      </FieldGroup>

                      {/* Summary card */}
                      {formData.person && formData.amount && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                          className={`p-3 rounded-xl border ${formData.type === 'lent' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/60 dark:border-emerald-500/20 text-slate-700 dark:text-slate-300' : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200/60 dark:border-rose-500/20 text-slate-700 dark:text-slate-300'}`}
                        >
                          <p className={`text-[11px] font-bold ${formData.type === 'lent' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                            {t('Summary')}
                          </p>
                          <p className={`text-[12px] mt-1 ${formData.type === 'lent' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {formData.type === 'lent' ? t('You lent') : t('You borrowed')} <strong>{formatFullCurrency(formData.amount)}</strong>
                            {formData.interest_rate ? ` ${t('at')} ${formData.interest_rate}%` : ''}
                            {' '}{formData.type === 'lent' ? t('to') : t('from')} <strong>{formData.person}</strong>
                            {Number(formData.paid_amount) > 0 && (
                              <> ({t('Remaining')}: <strong>{formatFullCurrency(Number(formData.amount) - Number(formData.paid_amount))}</strong>)</>
                            )}
                            {formData.dueDate ? `, due ${formData.dueDate}` : ''}.
                          </p>
                        </motion.div>
                      )}

                      {/* Dynamic EMI / Weekly Preview */}
                      {(formData.loan_category === 'EMI' || formData.loan_category === 'Weekly Finance') && formData.amount && formData.date && (
                        <div className="p-3 bg-violet-50/50 dark:bg-violet-950/10 border border-violet-100 dark:border-violet-900/30 rounded-xl space-y-2">
                          <p className="text-[10px] font-extrabold text-violet-600 dark:text-violet-400 uppercase tracking-widest">
                            ⚡ Upcoming Recurring Schedule
                          </p>
                          <div className="space-y-1.5 pl-0.5">
                            {(() => {
                              const previewCycles = [];
                              let currentDate = '';
                              if (formData.loan_category === 'EMI') {
                                currentDate = calculateInitialEMIDueDate(formData.date, formData.recurring_day || 15);
                              } else {
                                currentDate = calculateInitialWeeklyDueDate(formData.date, formData.recurring_week_day || 'Monday');
                              }

                              for (let step = 1; step <= 3; step++) {
                                previewCycles.push({
                                  num: step,
                                  date: currentDate,
                                  label: getCycleName(currentDate, formData.loan_category)
                                });
                                if (formData.loan_category === 'EMI') {
                                  currentDate = getNextEMIDate(currentDate, formData.recurring_day || 15);
                                } else {
                                  currentDate = getNextWeeklyDate(currentDate);
                                }
                              }

                              return previewCycles.map((c, i) => (
                                <div key={i} className="flex items-center justify-between text-[11px] text-slate-650 dark:text-slate-400">
                                  <span className="font-semibold">Installment #{c.num} ({c.label})</span>
                                  <span className="font-bold font-sans text-slate-800 dark:text-slate-300">{c.date}</span>
                                </div>
                              ));
                            })()}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Sticky footer buttons */}
                <div className="shrink-0 px-5 sm:px-6 pb-5 pt-3 bg-white dark:bg-[#12121f] border-t border-slate-100 dark:border-slate-800/80 flex gap-2.5">
                  {formStep === 2 && (
                    <button
                      type="button"
                      onClick={() => setFormStep(1)}
                      className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold text-[13px] hover:bg-slate-50 dark:hover:bg-slate-850 transition-all"
                    >
                      ← {t('Back')}
                    </button>
                  )}
                  {formStep === 1 ? (
                    <button
                      type="button"
                      disabled={isTransitioning}
                      onClick={() => {
                        if (isTransitioning) return;
                        if (!formData.person.trim()) {
                          showToast(t('Please enter a person name'), AlertCircle);
                          return;
                        }
                        if (!formData.amount || Number(formData.amount) <= 0) {
                          showToast(t('Please enter a valid amount'), AlertCircle);
                          return;
                        }
                        setIsTransitioning(true);
                        setFormStep(2);
                        setTimeout(() => setIsTransitioning(false), 400);
                      }}
                      className={`flex-1 btn-primary py-3 rounded-xl font-bold text-[13px] shadow-lg shadow-primary-500/15 transition-all ${isTransitioning ? 'opacity-50' : ''}`}
                    >
                      {isTransitioning ? t('Loading...') : `${t('Next')} →`}
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 btn-primary py-3 rounded-xl font-bold text-[13px] disabled:opacity-50 shadow-lg shadow-primary-500/15"
                    >
                      {isSubmitting ? t('Saving...') : editingLoan ? t('Update Record') : t('Save Record')}
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm.visible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-[#12121f] rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-800 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} className="text-rose-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('Delete Permanently?')}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                {t('This action cannot be undone. All data for this record will be lost forever.')}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm({ visible: false, loanId: null })}
                  className="flex-1 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold text-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                >
                  {t('Cancel')}
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="flex-1 py-3.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm shadow-lg shadow-rose-500/20 hover:shadow-xl hover:shadow-rose-500/30 transition-all"
                >
                  {t('Delete')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <Toast message={toast.message} visible={toast.visible} icon={toast.icon} />
    </motion.div>
  );
}

// ─── Toast Notification ────────────────────────────────────
interface ToastProps {
  message: string;
  visible: boolean;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}

const Toast: React.FC<ToastProps> = ({ message, visible, icon: ToastIcon }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        key="toast"
        initial={{ opacity: 0, scale: 0.8, x: '-50%', y: '-50%' }}
        animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
        exit={{ opacity: 0, scale: 0.8, x: '-50%', y: '-50%' }}
        className="fixed top-1/2 left-1/2 z-[250] bg-white/80 dark:bg-[#12121f]/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 text-slate-800 dark:text-slate-100 px-6 py-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center gap-3 text-center min-w-[200px] max-w-[80vw]"
      >
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
          {ToastIcon ? <ToastIcon size={24} className="text-emerald-500" /> : <CheckCircle2 size={24} className="text-emerald-500" />}
        </div>
        <p className="text-base font-bold leading-tight">{message}</p>
      </motion.div>
    )}
  </AnimatePresence>
);
