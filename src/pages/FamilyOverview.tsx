import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useFamily } from '../context/FamilyContext';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '../utils/animations';
import {
  Award,
  Flame,
  Shield,
  Star,
  Zap,
  Crown,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { SafeChartContainer } from '../components/ui/SafeChartContainer';
import { format, subMonths, addMonths, isSameMonth } from 'date-fns';

// ============================================================================
// Subcomponents (memoized for performance)
// ============================================================================
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    color: string;
    value: number;
    name: string;
  }>;
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="glass-panel-static p-3 text-sm border border-border shadow-lg">
        <p className="text-slate-500 text-xs mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="font-semibold font-sans">
            ₹{p.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

interface Member {
  id: string;
  name: string;
  income: number;
  expense: number;
  txCount: number;
}

interface MemberCardProps {
  member: Member;
  gradient: string;
  badge: {
    icon: React.ComponentType<any>;
    label: string;
    color: string;
  };
  progress: number;
  net: number;
  index: number;
}

const MemberCard: React.FC<MemberCardProps> = React.memo(
  ({
    member,
    gradient,
    badge,
    progress,
    net,
    index,
  }) => {
    const { t } = useLanguage();
    const BadgeIcon = badge.icon;
    return (
      <motion.div
        variants={item}
        className="backdrop-blur-xl bg-white/[0.04] dark:bg-white/[0.02] border border-white/[0.1] dark:border-white/[0.05] p-5 flex flex-col relative group overflow-hidden rounded-[24px] shadow-[0_8px_32px_0_rgba(0,0,0,0.06),inset_0_1px_1px_0_rgba(255,255,255,0.12)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3),inset_0_1px_1px_0_rgba(255,255,255,0.05)]"
        whileHover={{ y: -4, scale: 1.01 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Subtle blur decoration in the card itself */}
        <div
          className={`absolute -right-10 -top-10 w-24 h-24 bg-gradient-to-br ${gradient} opacity-[0.05] group-hover:opacity-[0.12] rounded-full blur-xl transition-all duration-500 pointer-events-none`}
        />

        {/* Avatar */}
        <div className="flex items-center gap-3.5 mb-4 relative z-10">
          <div
            className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg shadow-black/10`}
          >
            <span className="text-white font-bold text-lg">
              {member.name.charAt(0)}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-base text-slate-800 dark:text-slate-100 truncate pr-2" title={member.name}>
              {member.name}
            </h4>
            <div
              className={`inline-flex items-center gap-1 text-[9px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full border mt-1 shadow-sm ${badge.color}`}
            >
              <BadgeIcon size={9} /> {badge.label}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-3 relative z-10 flex-1">
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-slate-500 dark:text-slate-400">{t('Income')}</span>
            <span className="text-emerald-500 dark:text-emerald-400 font-bold font-sans">
              ₹{member.income.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-slate-500 dark:text-slate-400">{t('Expense')}</span>
            <span className="text-rose-500 dark:text-rose-400 font-bold font-sans">
              ₹{member.expense.toLocaleString()}
            </span>
          </div>
          <div className="h-px bg-white/[0.08] dark:bg-white/[0.04] my-1" />
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-slate-600 dark:text-slate-300 font-medium">{t('Net')}</span>
            <span
              className={`font-bold font-sans ${net >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
                }`}
            >
              {net >= 0 ? '+' : ''}₹{net.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Spending Progress */}
        <div className="mt-4 relative z-10">
          <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-medium">{t('Spend Ratio')}</span>
            <span className="font-bold font-sans">{progress.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-slate-200/50 dark:bg-slate-800/50 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${progress > 80
                ? 'bg-rose-500'
                : progress > 50
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
                }`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, delay: index * 0.1, ease: 'easeOut' }}
            />
          </div>
        </div>

        <div className="mt-3.5 text-center relative z-10">
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
            {member.txCount} transaction{member.txCount !== 1 ? 's' : ''}
          </span>
        </div>
      </motion.div>
    );
  }
);

MemberCard.displayName = 'MemberCard';

// ============================================================================
// Animation variants
// ============================================================================
const container = staggerContainer(0.08, 0.1);
const item = staggerItem;

interface TransactionData {
  id: string;
  amount: number;
  category: string;
  type: 'income' | 'expense' | 'savings' | 'loan';
  date: string;
  notes: string;
  memberId: string;
  memberName: string;
  created_at: string;
}

interface ProfileData {
  id: string;
  name: string;
}

// ============================================================================
// Main Component
// ============================================================================
export default function FamilyOverview() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { family, members: familyMembers, loading: familyLoading } = useFamily();
  const [allTransactions, setAllTransactions] = useState<TransactionData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const handlePrevMonth = useCallback(() => setCurrentDate(p => subMonths(p, 1)), []);
  const handleNextMonth = useCallback(() => setCurrentDate(p => addMonths(p, 1)), []);

  const allProfiles = useMemo<ProfileData[]>(() => {
    if (familyMembers.length > 0) {
      return familyMembers.map(m => ({
        id: m.user_id,
        name: m.profile?.name || 'Unknown',
      }));
    }
    if (user) {
      return [{
        id: user.id,
        name: user.name || user.email || 'Me',
      }];
    }
    return [];
  }, [familyMembers, user]);

  // Fetch transactions only for the joined family members
  useEffect(() => {
    if (familyLoading) return;

    async function fetchFamilyData() {
      setIsLoading(true);
      try {
        const memberIds = familyMembers.length > 0
          ? familyMembers.map(m => m.user_id)
          : (user ? [user.id] : []);

        if (memberIds.length === 0) {
          setAllTransactions([]);
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('transactions')
          .select(`*, profiles:profiles!transactions_member_id_fkey ( name )`)
          .in('member_id', memberIds)
          .order('date', { ascending: false });

        if (error) throw error;

        const mapped = (data || []).map((tx: any) => ({
          id: tx.id,
          amount: Number(tx.amount),
          category: tx.category,
          type: tx.type,
          date: tx.date,
          notes: tx.notes || '',
          memberId: tx.member_id,
          memberName: tx.profiles?.name || 'Unknown',
          created_at: tx.created_at,
        }));

        setAllTransactions(mapped);
      } catch (err) {
        console.error('Error fetching family data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchFamilyData();
  }, [user, familyMembers, familyLoading]);

  // Filter transactions for the selected month
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(tx => isSameMonth(new Date(tx.date), currentDate));
  }, [allTransactions, currentDate]);

  // Aggregate member statistics from filtered transactions
  const memberStatsMap = useMemo(() => {
    const map = new Map<string, Member>();

    // Seed the map with every profile so members with 0 transactions still appear
    allProfiles.forEach(p => {
      map.set(p.id, {
        id: p.id,
        name: t(p.name || 'Unknown'),
        income: 0,
        expense: 0,
        txCount: 0,
      });
    });

    // Accumulate transaction amounts
    filteredTransactions.forEach((tx) => {
      const key = tx.memberId;
      if (!key) return;

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: t(tx.memberName),
          income: 0,
          expense: 0,
          txCount: 0,
        });
      }
      const stat = map.get(key)!;
      if (tx.type === 'income') stat.income += Number(tx.amount);
      else stat.expense += Number(tx.amount);
      stat.txCount += 1;
    });
    return map;
  }, [filteredTransactions, allProfiles, t]);

  const members = useMemo(
    () => Array.from(memberStatsMap.values()),
    [memberStatsMap]
  );

  // These totals are across the filtered month
  const totalIncome = useMemo(() => filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), [filteredTransactions]);
  const totalExpense = useMemo(() => filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [filteredTransactions]);
  const balance = totalIncome - totalExpense;

  // Top performers (memoized)
  const topEarner = useMemo(
    () => [...members].sort((a, b) => b.income - a.income)[0],
    [members]
  );
  const topSpender = useMemo(
    () => [...members].sort((a, b) => b.expense - a.expense)[0],
    [members]
  );
  const topSaver = useMemo(
    () =>
      [...members].sort(
        (a, b) => b.income - b.expense - (a.income - a.expense)
      )[0],
    [members]
  );

  // Helper to get badge for a member (memoized per member via useCallback inside map)
  const getBadge = useCallback((member: Member) => {
    const net = member.income - member.expense;
    if (net > 0 && member.income > 0 && member.expense / member.income < 0.4) {
      return {
        icon: Crown,
        label: t('Savings Champion'),
        color: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30',
      };
    }
    if (member.income > 0 && member.expense / member.income < 0.6) {
      return {
        icon: Shield,
        label: t('Disciplined'),
        color: 'text-success-400 bg-success-500/15 border-success-500/30',
      };
    }
    if (member.expense > member.income) {
      return {
        icon: Flame,
        label: t('Over Budget'),
        color: 'text-accent-400 bg-accent-500/15 border-accent-500/30',
      };
    }
    return {
      icon: Star,
      label: t('Active'),
      color: 'text-primary-400 bg-primary-500/15 border-primary-500/30',
    };
  }, [t]);

  // Bar chart data (memoized)
  const comparisonData = useMemo(
    () =>
      members.map((m) => ({
        name: m.name,
        income: m.income,
        expense: m.expense,
      })),
    [members]
  );

  // Member gradients (constant)
  const memberGradients = [
    'from-primary-500 to-primary-700',
    'from-secondary-500 to-cyan-700',
    'from-accent-500 to-rose-700',
    'from-success-500 to-emerald-700',
    'from-warning-500 to-amber-700',
  ];

  // Loading state
  if (isLoading || familyLoading) {
    return (
      <div className="space-y-6">
        <div className="glass-panel p-12 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full mx-auto mb-4" />
          <p className="text-slate-500 font-medium">{t('Loading family data...')}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (members.length === 0) {
    return (
      <div className="space-y-6">
        <div className="glass-panel p-12 text-center">
          <Users size={48} className="mx-auto text-slate-500 mb-4 opacity-40" />
          <h3 className="text-xl font-bold mb-2">{t('No Family Members Yet')}</h3>
          <p className="text-slate-500">
            {t('Start adding transactions with member names to see family insights.')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 relative pb-12">
      {/* Background Decorative Ambient Glow Spheres (Apple visionOS vibe) */}
      <div className="absolute top-[-5%] left-[-5%] w-[45%] h-[45%] bg-gradient-to-br from-primary-500/10 to-indigo-500/0 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[45%] h-[45%] bg-gradient-to-tl from-secondary-500/10 to-cyan-500/0 rounded-full blur-[100px] pointer-events-none" />

      {/* Hero Banner */}
      <motion.div
        variants={item}
        className="backdrop-blur-xl bg-white/[0.04] dark:bg-white/[0.02] border border-white/[0.1] dark:border-white/[0.05] p-6 sm:p-8 relative overflow-hidden rounded-[32px] shadow-[0_8px_32px_0_rgba(0,0,0,0.06),inset_0_1px_1px_0_rgba(255,255,255,0.12)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.35),inset_0_1px_1px_0_rgba(255,255,255,0.05)]"
      >
        {/* Ambient Glows Inside Banner */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-primary-500/15 to-transparent rounded-full blur-[90px] -mr-32 -mt-32 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-secondary-500/15 to-transparent rounded-full blur-[90px] -ml-32 -mb-32 pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
              {t('MS Family')}
            </p>

            {/* Month Toggle Capsule */}
            <div className="flex items-center gap-1.5 bg-slate-200/40 dark:bg-white/[0.04] backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-300/40 dark:border-white/[0.06] shadow-sm">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-full hover:bg-slate-300/50 dark:hover:bg-white/[0.06] text-slate-600 dark:text-slate-300 transition-colors"
                aria-label="Previous Month"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 min-w-[90px] sm:min-w-[110px] text-center font-sans tracking-wide">
                {format(currentDate, 'MMMM yyyy')}
              </span>
              <button
                onClick={handleNextMonth}
                disabled={isSameMonth(currentDate, new Date())}
                className={`p-1.5 rounded-full transition-colors ${isSameMonth(currentDate, new Date())
                    ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                    : 'hover:bg-slate-300/50 dark:hover:bg-white/[0.06] text-slate-600 dark:text-slate-300'
                  }`}
                aria-label="Next Month"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            {t('Family Ecosystem')}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
            {t("Your family's combined financial health at a glance")}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 mt-6">
            <div className="p-4 bg-slate-100/50 dark:bg-white/[0.03] backdrop-blur-md rounded-2xl flex items-center justify-between border border-slate-200/50 dark:border-white/[0.04] shadow-sm relative group overflow-hidden">
              <div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                  {t('Net Savings')}
                </p>
                <p className={`text-xl sm:text-2xl font-extrabold font-sans mt-1 ${balance >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                  ₹{balance.toLocaleString()}
                </p>
              </div>
              <div className={`p-2.5 rounded-xl ${balance >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                <Award size={18} />
              </div>
            </div>
            <div className="p-4 bg-slate-100/50 dark:bg-white/[0.03] backdrop-blur-md rounded-2xl flex items-center justify-between border border-slate-200/50 dark:border-white/[0.04] shadow-sm relative group overflow-hidden">
              <div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                  {t('Total In')}
                </p>
                <p className="text-xl sm:text-2xl font-extrabold font-sans text-emerald-500 dark:text-emerald-400 mt-1">
                  ₹{totalIncome.toLocaleString()}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Zap size={18} />
              </div>
            </div>
            <div className="p-4 bg-slate-100/50 dark:bg-white/[0.03] backdrop-blur-md rounded-2xl flex items-center justify-between border border-slate-200/50 dark:border-white/[0.04] shadow-sm relative group overflow-hidden">
              <div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                  {t('Total Out')}
                </p>
                <p className="text-xl sm:text-2xl font-extrabold font-sans text-rose-500 dark:text-rose-400 mt-1">
                  ₹{totalExpense.toLocaleString()}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
                <Flame size={18} />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          variants={item}
          className="backdrop-blur-xl bg-white/[0.04] dark:bg-white/[0.02] border border-white/[0.1] dark:border-white/[0.05] p-5 relative overflow-hidden rounded-[24px] shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.12)] dark:shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.05)]"
        >
          <div className="flex items-center gap-2 mb-3.5">
            <Award size={15} className="text-emerald-500 dark:text-emerald-400" />
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
              {t('Top Earner')}
            </p>
          </div>
          {topEarner ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0 shadow-sm">
                <Crown size={18} className="text-emerald-500" />
              </div>
              <div className="flex-1 flex justify-between items-center min-w-0">
                <p className="font-bold text-slate-800 dark:text-slate-200 truncate pr-2" title={t(topEarner.name)}>{t(topEarner.name)}</p>
                <p className="text-sm font-bold font-sans text-emerald-500 dark:text-emerald-400 shrink-0">
                  ₹{topEarner.income.toLocaleString()}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 dark:text-slate-500 text-xs font-medium">{t('No data')}</p>
          )}
        </motion.div>

        <motion.div
          variants={item}
          className="backdrop-blur-xl bg-white/[0.04] dark:bg-white/[0.02] border border-white/[0.1] dark:border-white/[0.05] p-5 relative overflow-hidden rounded-[24px] shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.12)] dark:shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.05)]"
        >
          <div className="flex items-center gap-2 mb-3.5">
            <Flame size={15} className="text-rose-500 dark:text-rose-400" />
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
              {t('Top Spender')}
            </p>
          </div>
          {topSpender ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shrink-0 shadow-sm">
                <Flame size={18} className="text-rose-500" />
              </div>
              <div className="flex-1 flex justify-between items-center min-w-0">
                <p className="font-bold text-slate-800 dark:text-slate-200 truncate pr-2">{t(topSpender.name)}</p>
                <p className="text-sm font-bold font-sans text-rose-500 dark:text-rose-400 shrink-0">
                  ₹{topSpender.expense.toLocaleString()}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 dark:text-slate-500 text-xs font-medium">{t('No data')}</p>
          )}
        </motion.div>

        <motion.div
          variants={item}
          className="backdrop-blur-xl bg-white/[0.04] dark:bg-white/[0.02] border border-white/[0.1] dark:border-white/[0.05] p-5 relative overflow-hidden rounded-[24px] shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.12)] dark:shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.05)]"
        >
          <div className="flex items-center gap-2 mb-3.5">
            <Shield size={15} className="text-primary-500 dark:text-primary-400" />
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
              {t('Best Saver')}
            </p>
          </div>
          {topSaver ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center border border-primary-500/20 shrink-0 shadow-sm">
                <Shield size={18} className="text-primary-500" />
              </div>
              <div className="flex-1 flex justify-between items-center min-w-0">
                <p className="font-bold text-slate-800 dark:text-slate-200 truncate pr-2">{t(topSaver.name)}</p>
                <p className="text-sm font-bold font-sans text-primary-500 dark:text-primary-400 shrink-0">
                  ₹{(topSaver.income - topSaver.expense).toLocaleString()}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 dark:text-slate-500 text-xs font-medium">{t('No data')}</p>
          )}
        </motion.div>
      </div>

      {/* Comparison Chart */}
      {comparisonData.length > 0 && (
        <motion.div
          variants={item}
          className="backdrop-blur-xl bg-white/[0.04] dark:bg-white/[0.02] border border-white/[0.1] dark:border-white/[0.05] p-6 relative overflow-hidden rounded-[28px] shadow-[0_8px_32px_0_rgba(0,0,0,0.06),inset_0_1px_1px_0_rgba(255,255,255,0.12)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3),inset_0_1px_1px_0_rgba(255,255,255,0.05)]"
        >
          <h3 className="text-base font-bold mb-6 flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-primary-400 to-secondary-400 shadow-sm" />
            {t('Member Comparison')}
          </h3>
          <div className="h-64">
            <SafeChartContainer width="100%" height="100%" minHeight={180} data={comparisonData}>
              <BarChart data={comparisonData} barCategoryGap="20%">
                <XAxis
                  dataKey="name"
                  stroke="#6b7280"
                  tick={({ x, y, payload }: any) => {
                    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
                    const limit = isMobile ? 8 : 16;
                    const displayName = payload.value.length > limit ? `${payload.value.substring(0, limit - 1)}...` : payload.value;
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text
                          x={0}
                          y={0}
                          dy={16}
                          textAnchor="middle"
                          fill="#6b7280"
                          className="text-[10px] sm:text-xs font-medium"
                        >
                          {displayName}
                        </text>
                      </g>
                    );
                  }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  stroke="#4b5563"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="income"
                  fill="#10b981"
                  radius={[6, 6, 0, 0]}
                  barSize={28}
                  name="Income"
                />
                <Bar
                  dataKey="expense"
                  fill="#f43f5e"
                  radius={[6, 6, 0, 0]}
                  barSize={28}
                  name="Expense"
                />
              </BarChart>
            </SafeChartContainer>
          </div>
          <div className="flex items-center gap-6 mt-4 justify-center">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="w-3 h-1.5 rounded-full bg-emerald-500" /> {t('Income')}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="w-3 h-1.5 rounded-full bg-rose-500" /> {t('Expense')}
            </div>
          </div>
        </motion.div>
      )}

      {/* Member Profiles */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white px-1">{t('Member Profiles')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {members.map((member, idx) => {
            const badge = getBadge(member);
            const net = member.income - member.expense;
            const progress =
              member.income > 0
                ? Math.min((member.expense / member.income) * 100, 100)
                : 0;
            const gradient = memberGradients[idx % memberGradients.length];
            return (
              <MemberCard
                key={member.id}
                member={member}
                gradient={gradient}
                badge={badge}
                progress={progress}
                net={net}
                index={idx}
              />
            );
          })}
        </div>
      </div>

      {/* Family Insights Footer (optional) */}
      {members.length > 1 && (
        <motion.div
          variants={item}
          className="backdrop-blur-xl bg-primary-500/[0.04] border border-primary-500/20 p-4 rounded-2xl shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.05)]"
        >
          <div className="flex items-center gap-3 text-sm">
            <Award size={18} className="text-primary-500 dark:text-primary-400" />
            <span className="text-slate-600 dark:text-slate-300 font-medium">
              💡 Insight: {t(topSaver?.name)} is leading in savings! Encourage others to follow.
            </span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
