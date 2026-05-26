import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
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
        className="glass-panel p-5 flex flex-col relative group overflow-hidden"
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
      >
        <div
          className={`absolute inset-0 bg-gradient-to-t ${gradient} opacity-0 group-hover:opacity-[0.06] transition-opacity duration-500 pointer-events-none`}
        />

        {/* Avatar */}
        <div className="flex items-center gap-3 mb-4 relative z-10">
          <div
            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}
          >
            <span className="text-slate-900 font-bold text-lg">
              {member.name.charAt(0)}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-base truncate pr-2" title={member.name}>{member.name}</h4>
            <div
              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border mt-0.5 ${badge.color}`}
            >
              <BadgeIcon size={10} /> {badge.label}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-2.5 relative z-10 flex-1">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">{t('Income')}</span>
            <span className="text-success-400 font-bold font-sans">
              ₹{member.income.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">{t('Expense')}</span>
            <span className="text-accent-400 font-bold font-sans">
              ₹{member.expense.toLocaleString()}
            </span>
          </div>
          <div className="h-px bg-border my-1" />
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">{t('Net')}</span>
            <span
              className={`font-bold font-sans ${net >= 0 ? 'text-success-400' : 'text-accent-400'
                }`}
            >
              {net >= 0 ? '+' : ''}₹{net.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Spending Progress */}
        <div className="mt-4 relative z-10">
          <div className="flex justify-between text-[10px] text-slate-600 mb-1">
            <span>{t('Spend Ratio')}</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-white rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${progress > 80
                  ? 'bg-accent-500'
                  : progress > 50
                    ? 'bg-warning-500'
                    : 'bg-success-500'
                }`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, delay: index * 0.1, ease: 'easeOut' }}
            />
          </div>
        </div>

        <div className="mt-3 text-center relative z-10">
          <span className="text-[10px] text-gray-600">
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
  const [allTransactions, setAllTransactions] = useState<TransactionData[]>([]);
  const [allProfiles, setAllProfiles] = useState<ProfileData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const handlePrevMonth = useCallback(() => setCurrentDate(p => subMonths(p, 1)), []);
  const handleNextMonth = useCallback(() => setCurrentDate(p => addMonths(p, 1)), []);

  // Fetch ALL transactions and ALL profiles from Supabase (no member_id filter)
  useEffect(() => {
    async function fetchFamilyData() {
      setIsLoading(true);
      try {
        const [txRes, profileRes] = await Promise.all([
          supabase
            .from('transactions')
            .select(`*, profiles:member_id ( name )`)
            .order('date', { ascending: false }),
          supabase
            .from('profiles')
            .select('id, name')
        ]);

        if (txRes.error) throw txRes.error;
        if (profileRes.error) throw profileRes.error;

        const mapped = (txRes.data || []).map((tx: any) => ({
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
        setAllProfiles(profileRes.data || []);
      } catch (err) {
        console.error('Error fetching family data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchFamilyData();
  }, [user]);

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
  if (isLoading) {
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
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Hero Banner */}
      <motion.div
        variants={item}
        className="glass-panel p-6 sm:p-8 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary-500/20 to-transparent rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-secondary-500/20 to-transparent rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-600 font-bold uppercase tracking-widest">
              {t('MS Family')}
            </p>
            
            {/* Month Toggle */}
            <div className="flex items-center gap-2 sm:gap-3 bg-white/50 backdrop-blur-md px-2 sm:px-3 py-1.5 rounded-full border border-white/50 shadow-sm">
              <button 
                onClick={handlePrevMonth}
                className="p-1 rounded-full hover:bg-white text-slate-600 transition-colors"
                aria-label="Previous Month"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs sm:text-sm font-bold text-slate-800 min-w-[90px] sm:min-w-[110px] text-center font-sans tracking-wide">
                {format(currentDate, 'MMMM yyyy')}
              </span>
              <button 
                onClick={handleNextMonth}
                disabled={isSameMonth(currentDate, new Date())}
                className={`p-1 rounded-full transition-colors ${
                  isSameMonth(currentDate, new Date())
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'hover:bg-white text-slate-600'
                }`}
                aria-label="Next Month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {t('Family Ecosystem')}
          </h2>
          <p className="text-slate-500 mt-2 text-sm">
            {t('Your family\'s combined financial health at a glance')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mt-5">
            <div className="p-3 sm:p-4 bg-white/60 backdrop-blur-sm rounded-xl flex items-center justify-between border border-white/50 shadow-sm">
              <p className="text-xs text-slate-600 font-semibold uppercase tracking-wider">
                {t('Net Savings')}
              </p>
              <p
                className={`text-xl sm:text-2xl font-extrabold font-sans ${balance >= 0 ? 'text-success-500' : 'text-accent-500'
                  }`}
              >
                ₹{balance.toLocaleString()}
              </p>
            </div>
            <div className="p-3 sm:p-4 bg-white/60 backdrop-blur-sm rounded-xl flex items-center justify-between border border-white/50 shadow-sm">
              <p className="text-xs text-slate-600 font-semibold uppercase tracking-wider">
                {t('Total In')}
              </p>
              <p className="text-xl sm:text-2xl font-extrabold font-sans text-success-500 truncate">
                ₹{totalIncome.toLocaleString()}
              </p>
            </div>
            <div className="p-3 sm:p-4 bg-white/60 backdrop-blur-sm rounded-xl flex items-center justify-between border border-white/50 shadow-sm">
              <p className="text-xs text-slate-600 font-semibold uppercase tracking-wider">
                {t('Total Out')}
              </p>
              <p className="text-xl sm:text-2xl font-extrabold font-sans text-accent-500 truncate">
                ₹{totalExpense.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div variants={item} className="glass-panel p-5 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <Award size={16} className="text-success-400" />
            <p className="text-xs text-slate-600 font-bold uppercase tracking-wider">
              {t('Top Earner')}
            </p>
          </div>
          {topEarner ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success-500/15 flex items-center justify-center border border-success-500/30 shrink-0">
                <Crown size={18} className="text-success-500" />
              </div>
              <div className="flex-1 flex justify-between items-center min-w-0">
                <p className="font-bold text-slate-800 truncate pr-2" title={t(topEarner.name)}>{t(topEarner.name)}</p>
                <p className="text-sm font-sans text-success-500 font-bold shrink-0">
                  ₹{topEarner.income.toLocaleString()}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-slate-600 text-sm">{t('No data')}</p>
          )}
        </motion.div>

        <motion.div variants={item} className="glass-panel p-5 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <Flame size={16} className="text-accent-400" />
            <p className="text-xs text-slate-600 font-bold uppercase tracking-wider">
              {t('Top Spender')}
            </p>
          </div>
          {topSpender ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-500/15 flex items-center justify-center border border-accent-500/30 shrink-0">
                <Flame size={18} className="text-accent-500" />
              </div>
              <div className="flex-1 flex justify-between items-center min-w-0">
                <p className="font-bold text-slate-800 truncate pr-2">{t(topSpender.name)}</p>
                <p className="text-sm font-sans text-accent-500 font-bold shrink-0">
                  ₹{topSpender.expense.toLocaleString()}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-slate-600 text-sm">{t('No data')}</p>
          )}
        </motion.div>

        <motion.div variants={item} className="glass-panel p-5 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} className="text-primary-400" />
            <p className="text-xs text-slate-600 font-bold uppercase tracking-wider">
              {t('Best Saver')}
            </p>
          </div>
          {topSaver ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center border border-primary-500/30 shrink-0">
                <Shield size={18} className="text-primary-500" />
              </div>
              <div className="flex-1 flex justify-between items-center min-w-0">
                <p className="font-bold text-slate-800 truncate pr-2">{t(topSaver.name)}</p>
                <p className="text-sm font-sans text-primary-500 font-bold shrink-0">
                  ₹{(topSaver.income - topSaver.expense).toLocaleString()}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-slate-600 text-sm">{t('No data')}</p>
          )}
        </motion.div>
      </div>

      {/* Comparison Chart */}
      {comparisonData.length > 0 && (
        <motion.div variants={item} className="glass-panel p-6">
          <h3 className="text-base font-bold mb-6 flex items-center gap-2">
            <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-primary-400 to-secondary-400" />
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
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-3 h-1.5 rounded-full bg-success-500" /> {t('Income')}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-3 h-1.5 rounded-full bg-accent-500" /> {t('Expense')}
            </div>
          </div>
        </motion.div>
      )}

      {/* Member Profiles */}
      <div>
        <h3 className="text-lg font-bold mb-4">{t('Member Profiles')}</h3>
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
        <motion.div variants={item} className="glass-panel p-4 bg-primary-500/5 border-primary-500/20">
          <div className="flex items-center gap-3 text-sm">
            <Award size={18} className="text-primary-400" />
            <span className="text-slate-600">
              💡 Insight: {t(topSaver?.name)} is leading in savings! Encourage others to follow.
            </span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
