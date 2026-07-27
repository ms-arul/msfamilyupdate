import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getUserStorageUsage, formatBytes } from '../utils/storageService';
import { useSubscription } from '../context/SubscriptionContext';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  Loader2,
  Inbox,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Maximize,
  X,
  MessageSquareText,
  Smartphone,
  Activity,
} from 'lucide-react';
import { getLiveRates, calculateAssetMetrics } from '../utils/rateService';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import { staggerContainer, staggerItem } from '../utils/animations';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import { SafeChartContainer } from '../components/ui/SafeChartContainer';
import { PROVERBS } from '../utils/proverbs';
import { AdMobBanner } from '../components/AdMobBanner';

// Dashboard-local glass styles are now in index.css for better performance

// ============================================================================
// Animation Variants
// ============================================================================
const container = staggerContainer(0.065, 0.04);
const item = staggerItem;

// ============================================================================
// Custom Chart Tooltip
// ============================================================================
interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="g-tooltip p-3 text-sm">
        <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1.5">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="font-black text-xs font-sans">
            ₹{Number(p.value).toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ============================================================================
// Stat Card
// ============================================================================
interface StatCardProps {
  title: string;
  amount: number;
  icon: React.ComponentType<any>;
  glowColor: string;
  iconBg: string;
  iconColor: string;
  prefix?: string;
  suffix?: string;
  delta?: number;
}

const StatCard: React.FC<StatCardProps> = React.memo(({
  title, amount, icon: Icon, glowColor, iconBg, iconColor,
  prefix = '₹', suffix = '', delta,
}) => (
  <motion.div
    variants={item}
    whileTap={{ scale: 0.96 }}
    className="g-stat overflow-hidden cursor-default"
  >
    {/* Ambient color glow */}
    <div className={`absolute -right-5 -top-5 w-20 h-20 rounded-full blur-2xl opacity-20 ${glowColor} dark:hidden`} />

    <div className="relative z-10 p-3.5 sm:p-4 flex flex-col gap-3">
      {/* Icon row */}
      <div className="flex items-center justify-between">
        <div className={`g-icon-bubble w-9 h-9 rounded-[11px] flex items-center justify-center ${iconBg}`}>
          <Icon size={16} className={iconColor} />
        </div>
        {delta !== undefined && (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${delta >= 0
            ? 'bg-emerald-500/12 text-emerald-500 border border-emerald-500/20'
            : 'bg-rose-500/12 text-rose-400 border border-rose-500/20'
            }`}>
            {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
          </span>
        )}
      </div>

      {/* Value */}
      <div>
        <h3 className="text-lg sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white truncate leading-none">
          <AnimatedNumber value={amount} prefix={prefix} suffix={suffix} />
        </h3>
        <p className="text-slate-400 dark:text-slate-500 text-[9px] font-semibold tracking-wider uppercase mt-1 truncate">
          {title}
        </p>
      </div>
    </div>

    {/* Shimmer sweep */}
    <div className="absolute inset-0 -translate-x-full hover:translate-x-full transition-transform duration-[1200ms] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent pointer-events-none" />
  </motion.div>
));

StatCard.displayName = 'StatCard';

// ============================================================================
// Balance Hero Card
// ============================================================================
interface BalanceHeroCardProps {
  balance: number;
  income: number;
  expense: number;
  received: number;
  t: (key: string) => string;
  balanceFilter: string;
  onFilterChange: (filter: string) => void;
  streakCount?: number;
}

const BALANCE_FILTERS = ['Today', 'Yesterday', 'This Month', 'Last Month'];

const BalanceHeroCard: React.FC<BalanceHeroCardProps> = React.memo(({ balance, income, expense, received, t, balanceFilter, onFilterChange, streakCount = 1 }) => (
  <motion.div variants={item} className="g-panel overflow-hidden">
    {/* Gradient wash */}
    <div className="absolute inset-0 bg-gradient-to-br from-primary-500/6 via-transparent to-secondary-500/6 pointer-events-none dark:hidden" />
    {/* Glow orb */}
    <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-primary-500/8 blur-3xl pointer-events-none dark:hidden" />

    <div className="relative z-10 p-4 sm:p-6">
      {/* Label row with Streak Badge replacing the top right wallet icon */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-widest uppercase">
          {t('Net Balance')}
        </p>
        <div
          className="h-7 px-2.5 rounded-[10px] bg-gradient-to-r from-amber-500/15 via-orange-500/12 to-amber-500/15 border border-amber-500/30 dark:border-amber-400/25 shadow-sm inline-flex items-center justify-center gap-1.5 shrink-0 select-none"
          title={`${streakCount} Days Streak`}
        >
          <img
            src="/icons/streak.png"
            alt="Streak"
            className="w-4 h-4 object-contain shrink-0"
          />
          <span className="text-xs font-extrabold text-amber-500 dark:text-amber-400 leading-none tracking-tight flex items-center">
            {streakCount}
          </span>
        </div>
      </div>

      {/* Balance */}
      <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white mt-1 mb-3 leading-none">
        <AnimatedNumber value={balance} prefix="₹" />
      </h2>

      {/* Filter Tabs */}
      <div className="g-filter-track flex items-center gap-0.5 mb-4 w-max overflow-x-auto custom-scrollbar">
        {BALANCE_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => onFilterChange(f)}
            className={`relative px-3 py-1.5 text-[10px] font-bold rounded-[10px] transition-colors duration-200 ${balanceFilter === f
              ? 'text-primary-500 dark:text-primary-400'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
              }`}
          >
            {balanceFilter === f && (
              <motion.span
                layoutId="balance-filter-indicator"
                className="absolute inset-0 rounded-[10px] bg-primary-500/10 dark:bg-primary-400/15 border border-primary-500/20 dark:border-primary-400/20"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10">{t(f)}</span>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="g-divider mb-4" />

      {/* Income / Expense / Received pills — animated crossfade on filter change */}
      <AnimatePresence mode="wait">
        <motion.div
          key={balanceFilter}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-2 sm:gap-3"
        >
          <div className="flex-1 min-w-0 flex items-center gap-1.5 sm:gap-2 rounded-[14px] px-2 sm:px-3 py-2 sm:py-2.5 g-icon-bubble bg-emerald-500/8">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-[6px] sm:rounded-[8px] bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
              <ArrowUpRight size={11} className="text-emerald-500 sm:size-[12px]" />
            </div>
            <div className="min-w-0">
              <p className="text-[8px] sm:text-[8.5px] text-slate-400 uppercase tracking-wider font-bold">{t('Income')}</p>
              <p className="text-[11px] sm:text-sm font-extrabold text-emerald-500 truncate leading-tight">
                <AnimatedNumber value={income} prefix="₹" />
              </p>
            </div>
          </div>
          <div className="flex-1 min-w-0 flex items-center gap-1.5 sm:gap-2 rounded-[14px] px-2 sm:px-3 py-2 sm:py-2.5 g-icon-bubble bg-rose-500/8">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-[6px] sm:rounded-[8px] bg-rose-500/15 flex items-center justify-center flex-shrink-0">
              <ArrowDownRight size={11} className="text-rose-400 sm:size-[12px]" />
            </div>
            <div className="min-w-0">
              <p className="text-[8px] sm:text-[8.5px] text-slate-400 uppercase tracking-wider font-bold">{t('Expense')}</p>
              <p className="text-[11px] sm:text-sm font-extrabold text-rose-400 truncate leading-tight">
                <AnimatedNumber value={expense} prefix="₹" />
              </p>
            </div>
          </div>
          <div className="flex-1 min-w-0 flex items-center gap-1.5 sm:gap-2 rounded-[14px] px-2 sm:px-3 py-2 sm:py-2.5 g-icon-bubble bg-blue-500/8">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-[6px] sm:rounded-[8px] bg-blue-500/15 flex items-center justify-center flex-shrink-0">
              <ArrowUpRight size={11} className="text-blue-500 sm:size-[12px]" />
            </div>
            <div className="min-w-0">
              <p className="text-[8px] sm:text-[8.5px] text-slate-400 uppercase tracking-wider font-bold">{t('Received')}</p>
              <p className="text-[11px] sm:text-sm font-extrabold text-blue-500 truncate leading-tight">
                <AnimatedNumber value={received} prefix="₹" />
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  </motion.div>
));

BalanceHeroCard.displayName = 'BalanceHeroCard';

// ============================================================================
// Savings Goal Card
// ============================================================================
interface SavingsGoalCardProps {
  goal: { name: string; target: number };
  progress: number;
  balance: number;
  t: (key: string) => string;
}

const SavingsGoalCard: React.FC<SavingsGoalCardProps> = React.memo(({ goal, progress, balance, t }) => (
  <motion.div variants={item} className="g-panel p-4 sm:p-5 overflow-hidden">
    <div className="absolute -left-8 -bottom-8 w-36 h-36 rounded-full bg-secondary-500/8 blur-3xl pointer-events-none dark:hidden" />
    <div className="relative z-10">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">{t('Savings Goal')}</p>
          <h4 className="text-sm font-bold text-slate-800 dark:text-white mt-0.5 truncate max-w-[160px]">
            {goal.name}
          </h4>
        </div>
        <div className="text-right">
          <p className="text-xl font-black text-secondary-500 leading-none">
            <AnimatedNumber value={progress} suffix="%" />
          </p>
          <p className="text-[9px] text-slate-400 mt-0.5">of ₹{goal.target.toLocaleString()}</p>
        </div>
      </div>

      {/* Progress track */}
      <div className="g-progress-track h-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          className="h-full rounded-full bg-gradient-to-r from-secondary-400 to-primary-500 relative"
        >
          {/* Progress shine */}
          <span className="absolute inset-y-0 right-0 w-4 bg-gradient-to-r from-transparent to-white/30 rounded-full" />
        </motion.div>
      </div>

      <div className="flex justify-between mt-2">
        <p className="text-[9.5px] text-slate-400 font-medium">
          <AnimatedNumber value={balance} prefix="₹" suffix=" saved" />
        </p>
        <p className="text-[9.5px] text-slate-400 font-medium">
          <AnimatedNumber value={Math.max(0, goal.target - balance)} prefix="₹" suffix=" to go" />
        </p>
      </div>
    </div>
  </motion.div>
));

SavingsGoalCard.displayName = 'SavingsGoalCard';

// ============================================================================
// Savings Glance Card
// ============================================================================
interface SavingsGlanceProps {
  t: (key: string) => string;
  navigate: (path: string) => void;
}

const SavingsGlance: React.FC<SavingsGlanceProps> = React.memo(({ t, navigate }) => {
  const { user } = useAuth();
  const [assets, setAssets] = useState<any[]>([]);
  const [marketData, setMarketData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      try {
        const [ratesData, assetsRes] = await Promise.all([
          getLiveRates(),
          supabase.from('savings_assets').select('*').eq('user_id', user.id),
        ]);
        setMarketData(ratesData);
        if (assetsRes.data) setAssets(assetsRes.data);
      } catch (err) {
        console.error('Savings glance error:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();

    const handleAuthRefreshed = () => {
      console.log('[SavingsGlance] Auth session refreshed event received. Re-fetching assets...');
      loadData();
    };
    window.addEventListener('msfamily_auth_refreshed', handleAuthRefreshed);
    return () => {
      window.removeEventListener('msfamily_auth_refreshed', handleAuthRefreshed);
    };
  }, [user]);

  const totalMetrics = useMemo(() => {
    if (!marketData || assets.length === 0) return { totalValue: 0, totalProfit: 0, percentage: 0 };
    let totalValue = 0, totalPurchase = 0;
    assets.forEach(asset => {
      const m = calculateAssetMetrics(asset, marketData);
      totalValue += m.currentValue;
      totalPurchase += asset.purchase_price;
    });
    const profit = totalValue - totalPurchase;
    return { totalValue, totalProfit: profit, percentage: totalPurchase > 0 ? (profit / totalPurchase) * 100 : 0 };
  }, [assets, marketData]);

  if (loading) return (
    <div className="g-panel h-24 flex items-center justify-center">
      <Loader2 size={22} className="animate-spin text-primary-400/60" />
    </div>
  );

  const isProfit = totalMetrics.totalProfit >= 0;

  return (
    <motion.div
      variants={item}
      whileTap={{ scale: 0.985 }}
      onClick={() => navigate('/savings')}
      className="g-panel overflow-hidden p-4 sm:p-5 cursor-pointer group"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-amber-400/5 via-transparent to-primary-500/5 pointer-events-none dark:hidden" />
      <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-amber-400/8 blur-3xl pointer-events-none dark:hidden" />

      <div className="relative z-10 flex flex-wrap items-center justify-between sm:justify-start gap-4 sm:gap-6">
        {/* Total Value */}
        <div className="flex flex-col shrink-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity size={13} className="text-amber-500 shrink-0" />
            <p className="text-[8.5px] text-slate-400 font-bold tracking-widest uppercase">{t('Savings Glance')}</p>
          </div>
          <h2 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white leading-none">
            <AnimatedNumber value={totalMetrics.totalValue} prefix="₹" />
          </h2>
          <p className="text-[9px] text-slate-400 font-semibold mt-0.5">{t('Total Asset Value')}</p>
        </div>

        {/* Divider */}
        <div className="hidden xs:block w-px h-12 sm:h-14 bg-gradient-to-b from-transparent via-slate-200/60 dark:via-white/8 to-transparent shrink-0" />

        {/* Market Rates */}
        <div className="flex flex-col gap-2 shrink-0">
          <div>
            <p className="text-[8px] text-slate-400 font-bold uppercase leading-none mb-0.5">{t('Gold')}</p>
            <p className="text-[11px] sm:text-sm font-black text-slate-800 dark:text-slate-200 whitespace-nowrap">
              ₹{marketData?.gold24?.toLocaleString() || '---'}
            </p>
          </div>
          <div>
            <p className="text-[8px] text-slate-400 font-bold uppercase leading-none mb-0.5">{t('Silver')}</p>
            <p className="text-[11px] sm:text-sm font-black text-slate-800 dark:text-slate-200 whitespace-nowrap">
              ₹{marketData?.silver?.toLocaleString() || '---'}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-10 sm:h-12 bg-gradient-to-b from-transparent via-slate-200/60 dark:via-white/8 to-transparent shrink-0" />

        {/* Growth */}
        <div className="flex flex-col min-w-0">
          <p className="text-[8px] text-slate-400 font-bold uppercase leading-none mb-1">{t('Growth')}</p>
          <div className={`flex items-center gap-1 font-black text-xs sm:text-lg ${isProfit ? 'text-emerald-500' : 'text-rose-400'}`}>
            {isProfit ? <TrendingUp size={14} className="sm:size-5" /> : <TrendingDown size={14} className="sm:size-5" />}
            <span className="whitespace-nowrap">{Math.abs(totalMetrics.percentage).toFixed(1)}%</span>
          </div>
          <p className={`text-[9px] sm:text-xs font-bold mt-0.5 whitespace-nowrap ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isProfit ? '+' : '-'}<AnimatedNumber value={Math.abs(totalMetrics.totalProfit)} prefix="₹" />
          </p>
        </div>

        {/* Arrow */}
        <div className="ml-auto flex shrink-0">
          <div className="g-icon-bubble w-9 h-9 rounded-[12px] bg-slate-100/70 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-primary-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-primary-500/30 transition-all duration-300">
            <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </motion.div>
  );
});

SavingsGlance.displayName = 'SavingsGlance';

// ============================================================================
// Transaction Row
// ============================================================================
interface TransactionRowProps {
  tx: any;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  t: (key: string) => string;
}

const TransactionRow: React.FC<TransactionRowProps> = React.memo(({ tx, onDelete, isDeleting, t }) => {
  const isIncome = tx.type === 'income';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -60, transition: { duration: 0.18 } }}
      className="g-row flex items-center justify-between px-3 py-2.5 sm:py-3 touch-manipulation row-contain"
    >
      {/* Left */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
        {/* Dot */}
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isIncome
          ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]'
          : 'bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.5)]'
          }`} />
        {/* Icon bubble */}
        <div className={`g-icon-bubble w-8 h-8 sm:w-9 sm:h-9 rounded-[10px] flex-shrink-0 flex items-center justify-center ${isIncome ? 'bg-emerald-500/10' : 'bg-rose-500/10'
          }`}>
          {isIncome
            ? <ArrowUpRight size={13} className="text-emerald-500" />
            : <ArrowDownRight size={13} className="text-rose-400" />}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200 truncate">{t(tx.category)}</p>
          <p className="text-[9px] text-slate-400 mt-0.5 truncate">{t(tx.memberName)} · {tx.date}</p>
        </div>
      </div>

      {/* Amount */}
      <span className={`font-extrabold text-xs sm:text-sm font-sans ml-2 flex-shrink-0 ${isIncome ? 'text-emerald-500' : 'text-rose-400'
        }`}>
        {isIncome ? '+' : '-'}₹{Number(tx.amount).toLocaleString()}
      </span>
    </motion.div>
  );
});

TransactionRow.displayName = 'TransactionRow';

// ============================================================================
// Empty State
// ============================================================================
const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="py-12 flex flex-col items-center justify-center text-slate-400 select-none">
    <div className="g-icon-bubble w-14 h-14 rounded-[18px] bg-slate-100/60 dark:bg-white/4 flex items-center justify-center mb-3">
      <Inbox size={22} className="opacity-40" />
    </div>
    <p className="text-sm font-medium text-slate-400">{message}</p>
  </div>
);

// ============================================================================
// Section Title
// ============================================================================
interface SectionTitleProps {
  color?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}

const SectionTitle: React.FC<SectionTitleProps> = ({
  color = 'from-primary-400 to-secondary-400',
  children,
  right,
}) => (
  <div className="flex items-center justify-between mb-4 sm:mb-5">
    <h3 className="text-sm sm:text-[15px] font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
      <div className={`w-1 h-4 sm:h-[18px] rounded-full bg-gradient-to-b ${color} shadow-sm`} />
      {children}
    </h3>
    {right}
  </div>
);

// ============================================================================
// Typing Greeting Component (AI-style chat response typewriter animation)
// ============================================================================
interface TypingGreetingProps {
  prefix: string;
  name: string;
  suffix: string;
  iconSrc: string;
}

const TypingGreeting: React.FC<TypingGreetingProps> = React.memo(({ prefix, name, suffix, iconSrc }) => {
  const fullText = prefix + name + suffix;
  const [displayedLength, setDisplayedLength] = useState(0);

  useEffect(() => {
    setDisplayedLength(0);

    let index = 0;
    const interval = setInterval(() => {
      index += 1;
      setDisplayedLength(index);
      if (index >= fullText.length) {
        clearInterval(interval);
      }
    }, 15); // Fast, active typewriter animation (15ms per character)

    return () => clearInterval(interval);
  }, [prefix, name, suffix, fullText.length]);

  const renderContent = () => {
    const showCursor = displayedLength < fullText.length;
    const cursor = showCursor ? (
      <span className="inline-block w-1.5 h-3 ml-0.5 bg-primary-500 dark:bg-primary-400 animate-pulse rounded-sm align-middle" />
    ) : null;

    if (displayedLength <= prefix.length) {
      return (
        <>
          <span>{prefix.slice(0, displayedLength)}</span>
          {cursor}
        </>
      );
    }
    if (displayedLength <= prefix.length + name.length) {
      const nameLength = displayedLength - prefix.length;
      return (
        <>
          <span>{prefix}</span>
          <span className="font-bold text-slate-800 dark:text-slate-100">{name.slice(0, nameLength)}</span>
          {cursor}
        </>
      );
    }
    const suffixLength = displayedLength - prefix.length - name.length;
    return (
      <>
        <span>{prefix}</span>
        <span className="font-bold text-slate-800 dark:text-slate-100">{name}</span>
        <span>{suffix.slice(0, suffixLength)}</span>
        {cursor}
      </>
    );
  };

  return (
    <div
      className="g-pill inline-flex items-center gap-2.5 px-3.5 py-1.5 select-none max-w-full overflow-hidden"
      style={{ borderRadius: '16px' }}
    >
      <span className="flex items-center justify-center shrink-0">
        <img
          src={iconSrc}
          alt="Greeting icon"
          className="w-[22px] h-[22px] object-contain shrink-0"
        />
      </span>
      <span className="block text-[10px] sm:text-[11px] font-semibold tracking-wide text-slate-600 dark:text-slate-300 line-clamp-2 max-w-[calc(100vw-6rem)]">
        {renderContent()}
      </span>
    </div>
  );
});

TypingGreeting.displayName = 'TypingGreeting';

const mapWeatherCodeToIcon = (code: number, isDay: boolean, hour: number, dateDay: number): string => {
  if (isDay) {
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
      return '/greeting_icons/cloud-with-rain.png';
    }
    if ([95, 96, 99].includes(code)) {
      return '/greeting_icons/cloud-with-lightning-and-rain.png';
    }
    if ([71, 73, 75, 77, 85, 86].includes(code)) {
      return '/greeting_icons/cloud-with-snow.png';
    }
    if ([2, 3, 45, 48].includes(code)) {
      return '/greeting_icons/cloud.png';
    }
    if (code === 0 || code === 1) {
      if (hour >= 5 && hour < 9) return '/greeting_icons/sunrise.png';
      if (hour >= 17 && hour < 19) return '/greeting_icons/sunset.png';
      if (hour >= 12 && hour < 17) return '/greeting_icons/afternoon.png';
      return '/greeting_icons/sun.png';
    }
  } else {
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
      return '/greeting_icons/cloud-with-rain.png';
    }
    if ([95, 96, 99].includes(code)) {
      return '/greeting_icons/cloud-with-lightning-and-rain.png';
    }
    if ([71, 73, 75, 77, 85, 86].includes(code)) {
      return '/greeting_icons/cloud-with-snow.png';
    }
    if ([2, 3, 45, 48].includes(code)) {
      return '/greeting_icons/cloud.png';
    }
    const moonIcons = [
      '/greeting_icons/fullmoon.png',
      '/greeting_icons/halfmoon.png',
      '/greeting_icons/moonrightquater.png',
      '/greeting_icons/fullblackmoon.png',
      '/greeting_icons/waning-crescent-moon.png',
      '/greeting_icons/waxing-gibbous-moon.png'
    ];
    return moonIcons[dateDay % moonIcons.length];
  }
  return '/greeting_icons/sun.png';
};

// ============================================================================
// Main Dashboard
// ============================================================================
export default function Dashboard() {
  const {
    personalIncome: totalIncome = 0,
    personalExpense: totalExpense = 0,
    budgetLimit = 0,
    updateBudgetLimit,
    personalTransactions: transactions = [],
    allPersonalTransactions = [],
    allTimePersonalBalance = 0,
    deleteTransaction,
    savingsGoal = { name: 'Family Vacation', target: 100000 },
    smsTransactionCount = 0,
    todaySmsCount = 0,
  } = useFinance();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { planId, isPremium, expiresAt, setShowUpgradeModal } = useSubscription();
  const navigate = useNavigate();



  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showBudgetModal, setShowBudgetModal] = useState<boolean>(false);
  const [editBudgetVal, setEditBudgetVal] = useState<string>('');
  const [graphFilter, setGraphFilter] = useState<string>('Month');
  const [isFullscreenGraph, setIsFullscreenGraph] = useState<boolean>(false);
  const [balanceFilter, setBalanceFilter] = useState<string>('This Month');
  const [storageUsage, setStorageUsage] = useState<{ usedBytes: number; limitBytes: number; percentage: number } | null>(null);
  const [weatherData, setWeatherData] = useState<{ code: number; isDay: boolean } | null>(null);

  // Load weather from Open-Meteo based on current geolocation coordinates
  useEffect(() => {
    let active = true;
    async function loadWeather() {
      try {
        const { getCurrentLocation } = await import('../utils/trackingService');
        const pos = await getCurrentLocation();
        let lat = 13.0827; // Chennai fallback
        let lon = 80.2707;
        if (pos?.coords) {
          lat = pos.coords.latitude;
          lon = pos.coords.longitude;
        }
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code,is_day`);
        if (res.ok) {
          const data = await res.json();
          if (data?.current && active) {
            setWeatherData({
              code: data.current.weather_code,
              isDay: data.current.is_day === 1
            });
          }
        }
      } catch (err) {
        console.warn('Weather fetch failed:', err);
      }
    }
    loadWeather();
    return () => {
      active = false;
    };
  }, []);

  const daysRemaining = useMemo(() => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [expiresAt]);

  // Load storage usage
  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    let active = true;

    async function loadStorage() {
      try {
        const data = await getUserStorageUsage(userId!);
        if (active) {
          setStorageUsage(data);
        }
      } catch (err) {
        console.warn('Failed to load storage usage:', err);
      }
    }

    loadStorage();

    return () => {
      active = false;
    };
  }, [user?.id, transactions]);

  // ── Filtered Balance Stats based on balance filter ──
  const filteredStats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    let filtered: typeof allPersonalTransactions;

    if (balanceFilter === 'Today') {
      filtered = allPersonalTransactions.filter(tx => tx.date && String(tx.date).split('T')[0] === todayStr);
    } else if (balanceFilter === 'Yesterday') {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
      filtered = allPersonalTransactions.filter(tx => tx.date && String(tx.date).split('T')[0] === yesterdayStr);
    } else if (balanceFilter === 'Last Month') {
      filtered = allPersonalTransactions.filter(tx => {
        if (!tx.date) return false;
        const parts = String(tx.date).split('T')[0].split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          return m === lastMonth && y === lastMonthYear;
        }
        const d = new Date(tx.date);
        return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
      });
    } else {
      // 'This Month' (default)
      filtered = allPersonalTransactions.filter(tx => {
        if (!tx.date) return false;
        const parts = String(tx.date).split('T')[0].split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          return m === currentMonth && y === currentYear;
        }
        const d = new Date(tx.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
    }

    const income = filtered
      .filter(tx => tx.type === 'income' && tx.category !== 'Transfer')
      .reduce((acc, curr) => acc + Number(curr.amount), 0);
    const expense = filtered
      .filter(tx => tx.type === 'expense' && tx.category !== 'Transfer')
      .reduce((acc, curr) => acc + Number(curr.amount), 0);
    const received = filtered
      .filter(tx => tx.type === 'income' && tx.category === 'Transfer')
      .reduce((acc, curr) => acc + Number(curr.amount), 0);
    const balance = income - expense;

    return { income, expense, balance, received };
  }, [allPersonalTransactions, balanceFilter]);

  const isOverBudget = useMemo(() => filteredStats.expense > budgetLimit && budgetLimit > 0, [filteredStats.expense, budgetLimit]);
  const savingsRate = useMemo(() => {
    const overallIncome = allPersonalTransactions
      .filter(tx => tx.type === 'income' && tx.category !== 'Transfer')
      .reduce((acc, curr) => acc + Number(curr.amount), 0);
    const overallExpense = allPersonalTransactions
      .filter(tx => tx.type === 'expense' && tx.category !== 'Transfer')
      .reduce((acc, curr) => acc + Number(curr.amount), 0);
    const overallBalance = overallIncome - overallExpense;
    return overallIncome > 0 ? (overallBalance / overallIncome) * 100 : 0;
  }, [allPersonalTransactions]);

  // ── Calculate Daily Logging Streak & Sync to Supabase ──
  const streakCount = useMemo(() => {
    if (!allPersonalTransactions || allPersonalTransactions.length === 0) return 1;
    const datesSet = new Set<string>();
    allPersonalTransactions.forEach(tx => {
      if (tx.date) {
        datesSet.add(tx.date.split('T')[0]);
      }
    });

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    let streak = 0;
    let checkDate = datesSet.has(todayStr) ? today : (datesSet.has(yesterdayStr) ? yesterday : null);

    if (!checkDate) return 1;

    while (checkDate) {
      const dStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      if (datesSet.has(dStr)) {
        streak++;
        checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
      } else {
        break;
      }
    }

    return Math.max(1, streak);
  }, [allPersonalTransactions]);

  useEffect(() => {
    if (user?.id && streakCount > 0) {
      try {
        localStorage.setItem(`msfamily_streak_${user.id}`, String(streakCount));
      } catch {}
    }
  }, [user?.id, streakCount]);

  const goalProgress = useMemo(() => Math.min((allTimePersonalBalance / savingsGoal.target) * 100, 100), [allTimePersonalBalance, savingsGoal.target]);

  const chartData = useMemo(() => {
    const map = transactions
      .filter((tx: any) => tx.type === 'expense')
      .reduce((acc: { [key: string]: number }, curr: any) => {
        acc[curr.category] = (acc[curr.category] || 0) + Number(curr.amount);
        return acc;
      }, {});
    return Object.entries(map)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [transactions]);

  const trendData = useMemo(() => {
    let filtered = [...(allPersonalTransactions || [])];
    const now = new Date();
    if (graphFilter === 'Day') filtered = filtered.filter(tx => new Date(tx.date).toDateString() === now.toDateString());
    else if (graphFilter === 'Week') { const d = new Date(); d.setDate(now.getDate() - 7); filtered = filtered.filter(tx => new Date(tx.date) >= d); }
    else if (graphFilter === 'Month') { const d = new Date(); d.setMonth(now.getMonth() - 1); filtered = filtered.filter(tx => new Date(tx.date) >= d); }
    else if (graphFilter === 'Year') { const d = new Date(); d.setFullYear(now.getFullYear() - 1); filtered = filtered.filter(tx => new Date(tx.date) >= d); }

    const map = new Map<string, { income: number; expense: number }>();
    filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach(tx => {
      const d = new Date(tx.date);
      const key = graphFilter === 'Year'
        ? d.toLocaleString('default', { month: 'short', year: '2-digit' })
        : d.toLocaleString('default', { month: 'short', day: 'numeric' });
      const existing = map.get(key) || { income: 0, expense: 0 };
      if (tx.type === 'income') existing.income += Number(tx.amount);
      else existing.expense += Number(tx.amount);
      map.set(key, existing);
    });
    return Array.from(map.entries()).map(([date, values]) => ({ date, ...values }));
  }, [allPersonalTransactions, graphFilter]);

  const handleDelete = useCallback(async (id: string) => {
    if (window.confirm(t('Delete this transaction?'))) {
      setDeletingId(id);
      try { await deleteTransaction(id); }
      catch (err) { console.error('Delete failed:', err); alert('Could not delete. Please try again.'); }
      finally { setDeletingId(null); }
    }
  }, [deleteTransaction, t]);

  const handleEditBudgetClick = useCallback(() => {
    setEditBudgetVal(String(budgetLimit));
    setShowBudgetModal(true);
  }, [budgetLimit]);

  const handleSaveBudget = useCallback(() => {
    const parsed = Number(editBudgetVal);
    if (!isNaN(parsed) && parsed >= 0) { updateBudgetLimit(parsed); setShowBudgetModal(false); }
  }, [editBudgetVal, updateBudgetLimit]);

  const chartColors = ['#8b5cf6', '#22d3ee', '#f43f5e', '#10b981', '#f59e0b', '#ec4899'];
  const displayedTx = transactions.slice(0, 10);

  // Keep date/time updated in real-time to prevent cached/stale values (e.g. sunset icon showing at night)
  const [currentDate, setCurrentDate] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000); // Ticks every minute
    return () => clearInterval(timer);
  }, []);

  // Combined greeting text and matching icon (AI-Style, friendly, and auto-synced)
  const greeting = useMemo(() => {
    if (!user?.name) return null;
    const hour = currentDate.getHours();

    // 1. Time-based compact greeting prefix
    let timeGreeting = '';
    if (hour >= 5 && hour < 12) {
      timeGreeting = t('Good morning');
    } else if (hour >= 12 && hour < 17) {
      timeGreeting = t('Good afternoon');
    } else if (hour >= 17 && hour < 19) {
      timeGreeting = t('Good evening');
    } else {
      timeGreeting = t('Good night');
    }

    let iconSrc = '';
    if (weatherData) {
      iconSrc = mapWeatherCodeToIcon(weatherData.code, weatherData.isDay, hour, currentDate.getDate());
    } else {
      // Time-based default fallback
      if (hour >= 5 && hour < 9) {
        iconSrc = '/greeting_icons/sunrise.png';
      } else if (hour >= 9 && hour < 12) {
        iconSrc = '/greeting_icons/sun.png';
      } else if (hour >= 12 && hour < 17) {
        iconSrc = '/greeting_icons/afternoon.png';
      } else if (hour >= 17 && hour < 19) {
        iconSrc = '/greeting_icons/sunset.png';
      } else {
        const moonIcons = [
          '/greeting_icons/fullmoon.png',
          '/greeting_icons/halfmoon.png',
          '/greeting_icons/moonrightquater.png',
          '/greeting_icons/fullblackmoon.png'
        ];
        iconSrc = moonIcons[currentDate.getDate() % moonIcons.length];
      }
    }

    // Use only first name/part to keep it extremely short and clean
    const name = user.name.split(' ')[0];
    const insights: string[] = [];

    // 2. Compile active insights based on user data
    const expense = filteredStats.expense;
    const limit = budgetLimit;
    const isOver = isOverBudget;

    if (isOver && limit > 0) {
      insights.push(`${t('We are over budget by')} ₹${(expense - limit).toLocaleString()}.`);
    } else if (limit > 0 && expense >= limit * 0.8) {
      insights.push(`${t('Budget alert')}: ${((expense / limit) * 100).toFixed(0)}% ${t('used already')}.`);
      insights.push(`₹${(limit - expense).toLocaleString()} ${t('left to spend carefully')}.`);
    } else if (limit > 0 && expense > 0) {
      insights.push(`₹${(limit - expense).toLocaleString()} ${t('left in budget. Keep it up!')}`);
    }

    if (goalProgress > 0 && goalProgress < 100) {
      insights.push(`${goalProgress.toFixed(0)}% ${t('closer to your savings goal!')}`);
    }

    if (savingsRate > 20) {
      insights.push(`${t('Amazing savings rate of')} ${savingsRate.toFixed(0)}%!`);
    } else if (savingsRate > 0) {
      insights.push(`${t('You saved')} ${savingsRate.toFixed(0)}% ${t('this month!')}`);
    }

    if (todaySmsCount > 0) {
      insights.push(`${todaySmsCount} ${t('new transactions to verify.')}`);
    } else if (smsTransactionCount > 0) {
      insights.push(`${smsTransactionCount} ${t('transactions auto-logged via SMS.')}`);
    }

    // AI financial tips (friendly and encouraging)
    const tips = [
      t("Let's make today a great savings day!"),
      t("Every little rupee saved counts!"),
      t("Consistent saving builds big dreams."),
      t("Tracking your spends is the first step to freedom."),
      t("Remember to review your daily transactions!"),
      t("You're doing great with your budget, keep it up!"),
      t("Hope you're having a wonderful day! Keep smiling."),
      t("Small steps everyday lead to big savings. Proud of you!")
    ];

    // Localized proverbs & quotes based on current active language
    const localizedProverbs = PROVERBS[language] || PROVERBS['en'] || [];

    insights.push(...tips);
    insights.push(...localizedProverbs);

    // Pick a random insight or rotate based on time/minutes
    const seed = currentDate.getMinutes() + currentDate.getDate();
    const chosenInsight = insights[seed % insights.length];

    // Combine timeGreeting, name, and chosen insight
    return {
      prefix: `${timeGreeting}, `,
      name,
      suffix: `! ${chosenInsight}`,
      iconSrc
    };
  }, [user?.name, filteredStats.expense, budgetLimit, isOverBudget, goalProgress, savingsGoal.name, allTimePersonalBalance, savingsRate, todaySmsCount, smsTransactionCount, currentDate, t, language, weatherData]);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-3 sm:space-y-4 pb-4">

      {/* ── Greeting Pill ── */}
      {greeting && (
        <motion.div variants={item}>
          <TypingGreeting
            prefix={greeting.prefix}
            name={greeting.name}
            suffix={greeting.suffix}
            iconSrc={greeting.iconSrc}
          />
        </motion.div>
      )}

      {/* ── Balance Hero ── */}
      <BalanceHeroCard
        balance={allTimePersonalBalance}
        income={filteredStats.income}
        expense={filteredStats.expense}
        received={filteredStats.received}
        t={t}
        balanceFilter={balanceFilter}
        onFilterChange={setBalanceFilter}
        streakCount={streakCount}
      />

      {/* ── Stat Grid ── */}
      <motion.div variants={item} className="grid grid-cols-1 xs:grid-cols-2 gap-3">
        <StatCard
          title={t('Savings Rate')}
          amount={savingsRate}
          icon={Sparkles}
          glowColor="bg-violet-500"
          iconBg="bg-violet-500/12"
          iconColor="text-violet-500"
          prefix=""
          suffix="%"
        />
        <div onClick={handleEditBudgetClick} className="cursor-pointer">
          <StatCard
            title={t('Budget Limit')}
            amount={budgetLimit}
            icon={Wallet}
            glowColor="bg-primary-500"
            iconBg="bg-primary-500/12"
            iconColor="text-primary-500"
          />
        </div>
      </motion.div>

      {/* ── Budget Alert ── */}
      <AnimatePresence>
        {isOverBudget && (
          <motion.div
            variants={item} initial="hidden" animate="show" exit="hidden"
            onClick={handleEditBudgetClick}
            className="g-panel cursor-pointer overflow-hidden p-3.5 sm:p-4"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-rose-500/6 to-orange-500/4 pointer-events-none" />
            <div className="relative z-10 flex items-start sm:items-center gap-3">
              <div className="g-icon-bubble w-9 h-9 rounded-[11px] bg-rose-500/12 flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
                <AlertTriangle className="text-rose-400" size={17} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-rose-400 font-bold text-sm">{t('Budget Exceeded')}</h4>
                <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Expenses (₹{filteredStats.expense.toLocaleString()}) exceeded your ₹{budgetLimit.toLocaleString()} limit.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Google AdMob Banner (Dashboard Only - Above Savings Container) ── */}
      <AdMobBanner />

      {/* ── Savings Glance ── */}
      <SavingsGlance t={t} navigate={navigate} />

      {/* ── Savings Goal ── */}
      <SavingsGoalCard goal={savingsGoal} progress={goalProgress} balance={allTimePersonalBalance} t={t} />

      {/* ── Smart SMS Widget ── */}
      {smsTransactionCount > 0 && (
        <motion.div
          variants={item}
          whileTap={{ scale: 0.985 }}
          onClick={() => navigate('/transactions')}
          className="g-panel overflow-hidden p-4 sm:p-5 cursor-pointer group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 pointer-events-none dark:hidden" />
          <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-cyan-400/8 blur-3xl pointer-events-none dark:hidden" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="g-icon-bubble w-10 h-10 rounded-[13px] bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <span className="absolute top-0 left-1.5 right-1.5 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                <MessageSquareText size={17} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{t('Smart SMS Reader')}</p>
                <p className="text-[10px] text-slate-400">
                  {todaySmsCount > 0
                    ? `${todaySmsCount} detected today · ${smsTransactionCount} total`
                    : `${smsTransactionCount} transactions auto-recorded`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200/40 dark:border-cyan-500/20 px-2.5 py-1.5 rounded-[10px]">
                <Smartphone size={11} className="text-cyan-500" />
                <span className="text-xs font-black text-cyan-600 dark:text-cyan-400">{smsTransactionCount}</span>
              </div>
              <ChevronRight size={15} className="text-slate-300 group-hover:text-cyan-500 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Premium Subscription & Storage Card (Placed under SMS widget) ── */}
      {storageUsage && (
        <motion.div
          variants={item}
          whileTap={{ scale: 0.985 }}
          onClick={() => navigate('/settings/manage-storage')}
          className="g-panel p-4 sm:p-5 overflow-hidden group relative cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-secondary-500/5 pointer-events-none dark:hidden" />
          <div className="relative z-10 space-y-4">
            {/* Header: Plan & Action */}
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-bold text-primary-500 uppercase tracking-widest block mb-0.5">{t('Membership & Cloud')}</span>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 capitalize">
                    {planId === 'personal_monthly' ? t('Personal Premium Monthly') :
                      planId === 'personal_yearly' ? t('Personal Premium Yearly') :
                        planId === 'family_monthly' ? t('Family Premium Monthly') :
                          planId === 'family_yearly' ? t('Family Premium Yearly') :
                            t(planId.replace(/_/g, ' '))}
                  </h4>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-[6px] uppercase ${isPremium
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200/50 dark:border-slate-700/50'
                    }`}>
                    {isPremium ? t('Premium') : t('Free')}
                  </span>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUpgradeModal(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-extrabold text-[10px] shadow-sm transition-colors relative z-10"
              >
                {isPremium ? t('Manage') : t('Upgrade')}
              </button>
            </div>

            {/* Storage Progress */}
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1.5">
                <span>{t('Shared Storage')}</span>
                <span className="font-bold">
                  {formatBytes(storageUsage.usedBytes)} / {formatBytes(storageUsage.limitBytes)} ({storageUsage.percentage}%)
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 overflow-hidden border border-slate-200/10 dark:border-white/5 shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${storageUsage.percentage}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={`h-full rounded-full ${storageUsage.percentage > 80
                      ? 'bg-gradient-to-r from-rose-500 to-red-600 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                      : storageUsage.percentage > 50
                        ? 'bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                        : 'bg-gradient-to-r from-emerald-400 to-teal-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                    }`}
                />
              </div>
            </div>

            {/* Metadata Footer: Renew Date / Days Remaining / Coupon */}
            <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-200/30 dark:border-white/5 pt-3">
              {expiresAt ? (
                <div>
                  <span className="text-slate-400">{t('Renews on')}: </span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {new Date(expiresAt).toLocaleDateString()}
                  </span>
                  {daysRemaining !== null && (
                    <span className="ml-1 text-primary-500 dark:text-primary-400 font-bold">
                      ({daysRemaining} {t('days left')})
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-slate-400 font-semibold">{t('Basic storage limits applied')}</div>
              )}

              {isPremium && (
                <div className="flex items-center gap-1 text-[9px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  {t('Active Coupon')}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4">

        {/* Trend Chart */}
        <motion.div variants={item} className="g-panel p-4 sm:p-5 lg:col-span-3">
          <SectionTitle
            color="from-primary-400 to-secondary-400"
            right={
              <button
                onClick={() => setIsFullscreenGraph(true)}
                className="g-icon-bubble w-7 h-7 rounded-[9px] bg-slate-100/70 dark:bg-white/5 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                <Maximize size={13} />
              </button>
            }
          >
            {t('Income vs Expense')}
          </SectionTitle>

          {/* Filter tabs */}
          <div className="g-filter-track flex items-center gap-0.5 mb-4 w-max">
            {['Day', 'Week', 'Month', 'Year'].map(f => (
              <button
                key={f}
                onClick={() => setGraphFilter(f)}
                className={`relative px-3 py-1.5 text-[10px] font-bold rounded-[10px] transition-colors duration-200 ${graphFilter === f
                  ? 'text-primary-500 dark:text-primary-400'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
                  }`}
              >
                {graphFilter === f && (
                  <motion.span
                    layoutId="graph-filter-indicator"
                    className="absolute inset-0 rounded-[10px] bg-primary-500/10 dark:bg-primary-400/15 border border-primary-500/20 dark:border-primary-400/20"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{t(f)}</span>
              </button>
            ))}
          </div>

          <div className="w-full min-w-0" style={{ height: 'clamp(180px, 25vw, 280px)' }}>
            {trendData.length === 0 ? <EmptyState message={t('No transaction data yet')} /> : (
              <SafeChartContainer width="100%" height="100%" minWidth={0} minHeight={180} data={trendData}>
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                  <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fill="url(#incomeGrad)" dot={{ r: 2.5, strokeWidth: 2 }} />
                  <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2} fill="url(#expenseGrad)" dot={{ r: 2.5, strokeWidth: 2 }} />
                </AreaChart>
              </SafeChartContainer>
            )}
          </div>

          {trendData.length > 0 && (
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <div className="w-3 h-1 rounded-full bg-emerald-500" />{t('Income')}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <div className="w-3 h-1 rounded-full bg-rose-400" />{t('Expense')}
              </div>
            </div>
          )}
        </motion.div>

        {/* Category Bar Chart */}
        <motion.div variants={item} className="g-panel p-4 sm:p-5 lg:col-span-2">
          <SectionTitle color="from-rose-400 to-amber-400">{t('Top Categories')}</SectionTitle>
          <div className="w-full min-w-0" style={{ height: 'clamp(180px, 25vw, 280px)' }}>
            {chartData.length === 0 ? <EmptyState message={t('No expense data')} /> : (
              <SafeChartContainer width="100%" height="100%" minWidth={0} minHeight={180} data={chartData}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                  <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="amount" radius={[0, 7, 7, 0]} barSize={11}>
                    {chartData.map((_, i) => <Cell key={`cell-${i}`} fill={chartColors[i % chartColors.length]} />)}
                  </Bar>
                </BarChart>
              </SafeChartContainer>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Recent Transactions ── */}
      <motion.div variants={item} className="g-panel p-4 sm:p-5">
        <SectionTitle
          color="from-secondary-400 to-primary-400"
          right={
            <span className="text-[9px] text-slate-400 g-pill px-2.5 py-1 font-semibold">
              {transactions.length} {t('records')}
            </span>
          }
        >
          {t('Recent Transactions')}
        </SectionTitle>

        <div className="space-y-1.5 sm:space-y-2">
          <AnimatePresence initial={false}>
            {transactions.length === 0 ? (
              <EmptyState message={t('No transactions yet. Add your first one!')} />
            ) : (
              displayedTx.map(tx => (
                <TransactionRow key={tx.id} tx={tx} onDelete={handleDelete} isDeleting={deletingId === tx.id} t={t} />
              ))
            )}
          </AnimatePresence>
        </div>

        {transactions.length > 10 && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/transactions')}
            className="g-ghost-btn w-full mt-4 py-2.5 text-xs font-semibold text-primary-500 flex items-center justify-center gap-1.5 transition-all"
          >
            {`${t('View All')} ${transactions.length} ${t('Transactions')}`}
            <ChevronRight size={13} />
          </motion.button>
        )}
      </motion.div>

      {/* ── Budget Modal ── */}
      <AnimatePresence>
        {showBudgetModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-[10px] p-4"
            onClick={() => setShowBudgetModal(false)}
          >
            <motion.div
              initial={{ scale: 0.90, opacity: 0, y: 20, filter: 'blur(5px)' }}
              animate={{ scale: 1, opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ scale: 0.92, opacity: 0, y: 10, filter: 'blur(4px)' }}
              transition={{
                opacity: { type: 'spring', stiffness: 400, damping: 30 },
                scale: { type: 'spring', stiffness: 400, damping: 30 },
                y: { type: 'spring', stiffness: 400, damping: 30 },
                filter: { type: 'tween', ease: 'easeOut', duration: 0.2 }
              }}
              onClick={e => e.stopPropagation()}
              className="relative w-full max-w-sm g-modal p-6"
            >
              {/* Specular edge */}
              <span className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/90 dark:via-white/15 to-transparent" />

              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-1">{t('Edit Budget Limit')}</h3>
              <p className="text-sm text-slate-400 mb-5">{t('Enter your new monthly budget limit.')}</p>

              <div className="relative mb-5">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg pointer-events-none">₹</span>
                <input
                  type="number"
                  value={editBudgetVal}
                  onChange={e => setEditBudgetVal(e.target.value)}
                  className="g-input w-full pl-10 pr-4 py-3.5 text-lg font-bold text-slate-900 dark:text-white"
                  placeholder="3000"
                  autoFocus
                />
              </div>

              <div className="g-divider mb-5" />

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowBudgetModal(false)}
                  className="flex-1 py-2.5 rounded-[14px] font-semibold text-sm text-slate-500 dark:text-slate-400 glass-btn"
                >
                  {t('Cancel')}
                </button>
                <button
                  onClick={handleSaveBudget}
                  className="flex-1 py-2.5 rounded-[14px] font-semibold text-sm text-white bg-gradient-to-r from-primary-500 to-secondary-500 shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-shadow active:scale-95"
                  style={{ transition: 'transform 0.14s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s' }}
                >
                  {t('Save')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Fullscreen Chart ── */}
      {createPortal(
        <AnimatePresence>
          {isFullscreenGraph && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] bg-white/95 dark:bg-black/95 backdrop-blur-2xl flex flex-col landscape:flex-row"
            >
              {/* Controls panel */}
              <div className="p-4 pt-[calc(env(safe-area-inset-top,24px)+20px)] sm:pt-[calc(env(safe-area-inset-top,24px)+24px)] flex flex-row landscape:flex-col justify-between items-center landscape:items-start border-b landscape:border-b-0 landscape:border-r border-slate-200/40 dark:border-white/[0.06] landscape:w-48 shrink-0">
                <div className="landscape:mb-6">
                  <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <Activity size={17} className="text-primary-500" />
                    {t('Financial Trend')}
                  </h2>
                  <p className="text-[10px] text-slate-400 mt-1 hidden landscape:block">
                    Interactive view of your income and expenses over time.
                  </p>
                </div>

                <div className="flex landscape:flex-col items-center landscape:items-stretch gap-2 landscape:w-full">
                  <div className="g-filter-track flex landscape:flex-col gap-0.5">
                    {['Day', 'Week', 'Month', 'Year'].map(f => (
                      <button
                        key={f}
                        onClick={() => setGraphFilter(f)}
                        className={`relative px-3 py-1.5 landscape:py-2 text-xs font-bold rounded-[10px] transition-colors duration-200 ${graphFilter === f
                          ? 'text-primary-500 dark:text-primary-400'
                          : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
                          }`}
                      >
                        {graphFilter === f && (
                          <motion.span
                            layoutId="fullscreen-graph-filter-indicator"
                            className="absolute inset-0 rounded-[10px] bg-primary-500/10 dark:bg-primary-400/15 border border-primary-500/20 dark:border-primary-400/20"
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          />
                        )}
                        <span className="relative z-10">{t(f)}</span>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setIsFullscreenGraph(false)}
                    className="g-close-btn p-2 ml-2 landscape:ml-0 landscape:mt-4 flex justify-center items-center gap-2 font-bold text-xs text-rose-400"
                  >
                    <X size={15} />
                    <span className="hidden landscape:inline">{t('Close')}</span>
                  </button>
                </div>
              </div>

              {/* Chart area */}
              <div className="flex-1 p-3 sm:p-8 min-h-[300px]">
                {trendData.length === 0 ? <EmptyState message={t('No transaction data for this period')} /> : (
                  <SafeChartContainer width="100%" height="100%" minWidth={0} minHeight={280} data={trendData}>
                    <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="incomeGradFS" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="expenseGradFS" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                      <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} fill="url(#incomeGradFS)" dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                      <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={3} fill="url(#expenseGradFS)" dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                    </AreaChart>
                  </SafeChartContainer>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
}