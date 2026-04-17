import React, { useMemo, useCallback } from 'react';
import { useFinance } from '../context/FinanceContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Award,
  Flame,
  Target,
  TrendingUp,
  TrendingDown,
  Shield,
  Star,
  Zap,
  Crown,
  AlertCircle,
  Users,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';



// ============================================================================
// Subcomponents (memoized for performance)
// ============================================================================
const CustomTooltip = ({ active, payload, label }) => {
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

const MemberCard = React.memo(
  ({
    member,
    gradient,
    badge,
    progress,
    net,
    index,
  }) => {
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
          <div>
            <h4 className="font-bold text-base">{member.name}</h4>
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
            <span className="text-slate-600">Income</span>
            <span className="text-success-400 font-bold font-sans">
              ₹{member.income.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Expense</span>
            <span className="text-accent-400 font-bold font-sans">
              ₹{member.expense.toLocaleString()}
            </span>
          </div>
          <div className="h-px bg-border my-1" />
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Net</span>
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
            <span>Spend Ratio</span>
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
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

// ============================================================================
// Main Component
// ============================================================================
export default function FamilyOverview() {
  const { transactions = [], totalIncome = 0, totalExpense = 0, balance = 0 } =
    useFinance();

  // Aggregate member statistics (memoized)
  const memberStatsMap = useMemo(() => {
    const map = new Map();
    transactions.forEach((tx) => {
      const key = tx.memberId || tx.memberName;
      if (!key) return; // skip if no member identifier

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: tx.memberName,
          income: 0,
          expense: 0,
          txCount: 0,
        });
      }
      const stat = map.get(key);
      if (tx.type === 'income') stat.income += Number(tx.amount);
      else stat.expense += Number(tx.amount);
      stat.txCount += 1;
    });
    return map;
  }, [transactions]);

  const members = useMemo(
    () => Array.from(memberStatsMap.values()),
    [memberStatsMap]
  );

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
  const getBadge = useCallback((member) => {
    const net = member.income - member.expense;
    if (net > 0 && member.income > 0 && member.expense / member.income < 0.4) {
      return {
        icon: Crown,
        label: 'Savings Champion',
        color: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30',
      };
    }
    if (member.income > 0 && member.expense / member.income < 0.6) {
      return {
        icon: Shield,
        label: 'Disciplined',
        color: 'text-success-400 bg-success-500/15 border-success-500/30',
      };
    }
    if (member.expense > member.income) {
      return {
        icon: Flame,
        label: 'Over Budget',
        color: 'text-accent-400 bg-accent-500/15 border-accent-500/30',
      };
    }
    return {
      icon: Star,
      label: 'Active',
      color: 'text-primary-400 bg-primary-500/15 border-primary-500/30',
    };
  }, []);

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

  // Empty state
  if (members.length === 0) {
    return (
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        <motion.div
          variants={item}
          className="glass-panel p-12 text-center"
        >
          <Users size={48} className="mx-auto text-slate-500 mb-4 opacity-40" />
          <h3 className="text-xl font-bold mb-2">No Family Members Yet</h3>
          <p className="text-slate-500">
            Start adding transactions with member names to see family insights.
          </p>
        </motion.div>
      </motion.div>
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
          <p className="text-xs text-slate-600 font-bold uppercase tracking-widest mb-2">
            MS Family
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Family Ecosystem
          </h2>
          <p className="text-slate-500 mt-2 text-sm">
            Your family's combined financial health at a glance
          </p>

          <div className="grid grid-cols-3 gap-4 mt-6">
            <div>
              <p className="text-xs text-slate-600 font-semibold uppercase tracking-wider">
                Net Savings
              </p>
              <p
                className={`text-2xl sm:text-3xl font-extrabold font-sans mt-1 ${balance >= 0 ? 'text-success-400' : 'text-accent-400'
                  }`}
              >
                ₹{balance.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600 font-semibold uppercase tracking-wider">
                Total In
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold font-sans mt-1 text-success-400">
                ₹{totalIncome.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600 font-semibold uppercase tracking-wider">
                Total Out
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold font-sans mt-1 text-accent-400">
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
            <TrendingUp size={16} className="text-success-400" />
            <p className="text-xs text-slate-600 font-bold uppercase tracking-wider">
              Top Earner
            </p>
          </div>
          {topEarner ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success-500/15 flex items-center justify-center border border-success-500/30">
                <Crown size={18} className="text-success-400" />
              </div>
              <div>
                <p className="font-bold">{topEarner.name}</p>
                <p className="text-sm font-sans text-success-400">
                  ₹{topEarner.income.toLocaleString()}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-slate-600 text-sm">No data</p>
          )}
        </motion.div>

        <motion.div variants={item} className="glass-panel p-5 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={16} className="text-accent-400" />
            <p className="text-xs text-slate-600 font-bold uppercase tracking-wider">
              Top Spender
            </p>
          </div>
          {topSpender ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-500/15 flex items-center justify-center border border-accent-500/30">
                <Flame size={18} className="text-accent-400" />
              </div>
              <div>
                <p className="font-bold">{topSpender.name}</p>
                <p className="text-sm font-sans text-accent-400">
                  ₹{topSpender.expense.toLocaleString()}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-slate-600 text-sm">No data</p>
          )}
        </motion.div>

        <motion.div variants={item} className="glass-panel p-5 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} className="text-primary-400" />
            <p className="text-xs text-slate-600 font-bold uppercase tracking-wider">
              Best Saver
            </p>
          </div>
          {topSaver ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center border border-primary-500/30">
                <Shield size={18} className="text-primary-400" />
              </div>
              <div>
                <p className="font-bold">{topSaver.name}</p>
                <p className="text-sm font-sans text-primary-400">
                  ₹{(topSaver.income - topSaver.expense).toLocaleString()} saved
                </p>
              </div>
            </div>
          ) : (
            <p className="text-slate-600 text-sm">No data</p>
          )}
        </motion.div>
      </div>

      {/* Comparison Chart */}
      {comparisonData.length > 0 && (
        <motion.div variants={item} className="glass-panel p-6">
          <h3 className="text-base font-bold mb-6 flex items-center gap-2">
            <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-primary-400 to-secondary-400" />
            Member Comparison
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} barCategoryGap="20%">
                <XAxis
                  dataKey="name"
                  stroke="#6b7280"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
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
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-6 mt-4 justify-center">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-3 h-1.5 rounded-full bg-success-500" /> Income
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-3 h-1.5 rounded-full bg-accent-500" /> Expenses
            </div>
          </div>
        </motion.div>
      )}

      {/* Member Profiles */}
      <div>
        <h3 className="text-lg font-bold mb-4">Member Profiles</h3>
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
              💡 Insight: {topSaver?.name} is leading in savings! Encourage others to follow.
            </span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}