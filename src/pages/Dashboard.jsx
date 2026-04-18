import React, { useMemo, useCallback, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  Trash2,
  Loader2,
  Inbox,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Filter,
  MoreHorizontal,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';

// ============================================================================
// Animation Variants
// ============================================================================
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] },
  },
};

// ============================================================================
// Custom Tooltip
// ============================================================================
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="glass-panel-static p-3 text-sm border border-slate-900/10 shadow-lg rounded-xl">
        <p className="text-slate-500 text-xs mb-1.5">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="font-bold font-sans text-xs">
            ₹{Number(p.value).toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ============================================================================
// Horizontal Scrollable Stat Cards (APK hero row)
// ============================================================================
const StatCard = React.memo(({ title, amount, icon: Icon, gradient, textColor, prefix = '₹', suffix = '', delta }) => (
  <motion.div
    variants={item}
    whileTap={{ scale: 0.97 }}
    className="glass-panel relative overflow-hidden flex-shrink-0 cursor-default"
    style={{ minWidth: 'min(160px, 44vw)' }}
  >
    {/* Ambient glow */}
    <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-25 ${gradient}`} />

    <div className="p-3.5 sm:p-5 flex flex-col gap-3 relative z-10">
      {/* Icon + title row */}
      <div className="flex items-center justify-between">
        <div className={`p-2 sm:p-2.5 rounded-xl ${gradient} bg-opacity-20`}>
          <Icon size={15} className={`sm:w-[18px] sm:h-[18px] ${textColor}`} />
        </div>
        {delta !== undefined && (
          <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full ${delta >= 0 ? 'bg-success-500/15 text-success-400' : 'bg-accent-500/15 text-accent-400'}`}>
            {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
          </span>
        )}
      </div>

      {/* Amount */}
      <div>
        <h3 className="text-lg sm:text-2xl font-extrabold tracking-tight text-slate-900 truncate leading-none">
          {prefix}{typeof amount === 'number'
            ? amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
            : amount}{suffix}
        </h3>
        <p className="text-slate-500 text-[9px] sm:text-[10px] font-semibold tracking-wider uppercase mt-1 truncate">
          {title}
        </p>
      </div>
    </div>

    {/* Shimmer */}
    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent pointer-events-none" />
  </motion.div>
));

StatCard.displayName = 'StatCard';

// ============================================================================
// Balance Hero Card (mobile pinned top card)
// ============================================================================
const BalanceHeroCard = React.memo(({ balance, income, expense }) => (
  <motion.div
    variants={item}
    className="glass-panel relative overflow-hidden"
  >
    {/* Background decoration */}
    <div className="absolute inset-0 bg-gradient-to-br from-primary-500/8 via-transparent to-secondary-500/8 pointer-events-none" />
    <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full bg-primary-500/10 blur-3xl pointer-events-none" />

    <div className="relative z-10 p-4 sm:p-6">
      {/* Label */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] sm:text-xs text-slate-500 font-semibold tracking-widest uppercase">Total Balance</p>
        <div className="p-1.5 sm:p-2 rounded-xl bg-primary-500/15">
          <Wallet size={14} className="text-primary-400 sm:w-4 sm:h-4" />
        </div>
      </div>

      {/* Main balance */}
      <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mt-1 mb-4">
        ₹{balance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </h2>

      {/* Income / Expense pills */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 bg-success-500/10 rounded-xl px-3 py-2">
          <ArrowUpRight size={13} className="text-success-400 flex-shrink-0" />
          <div>
            <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Income</p>
            <p className="text-xs sm:text-sm font-bold text-success-400">
              ₹{income.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-2 bg-accent-500/10 rounded-xl px-3 py-2">
          <ArrowDownRight size={13} className="text-accent-400 flex-shrink-0" />
          <div>
            <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Expense</p>
            <p className="text-xs sm:text-sm font-bold text-accent-400">
              ₹{expense.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      </div>
    </div>
  </motion.div>
));

BalanceHeroCard.displayName = 'BalanceHeroCard';

// ============================================================================
// Savings Goal Card
// ============================================================================
const SavingsGoalCard = React.memo(({ goal, progress, balance }) => (
  <motion.div variants={item} className="glass-panel p-4 sm:p-5 relative overflow-hidden">
    <div className="absolute -left-8 -bottom-8 w-32 h-32 rounded-full bg-secondary-500/10 blur-2xl pointer-events-none" />
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] text-slate-500 font-semibold tracking-widest uppercase">Savings Goal</p>
          <h4 className="text-sm font-bold text-slate-800 mt-0.5 truncate max-w-[160px]">{goal.name}</h4>
        </div>
        <div className="text-right">
          <p className="text-lg font-extrabold text-secondary-500">{progress.toFixed(0)}%</p>
          <p className="text-[9px] text-slate-500">of ₹{goal.target.toLocaleString()}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          className="h-full rounded-full bg-gradient-to-r from-secondary-400 to-primary-500"
        />
      </div>

      <div className="flex justify-between mt-1.5">
        <p className="text-[9px] text-slate-500">₹{balance.toLocaleString()} saved</p>
        <p className="text-[9px] text-slate-500">₹{Math.max(0, goal.target - balance).toLocaleString()} to go</p>
      </div>
    </div>
  </motion.div>
));

SavingsGoalCard.displayName = 'SavingsGoalCard';

// ============================================================================
// Transaction Row
// ============================================================================
const TransactionRow = React.memo(({ tx, onDelete, isDeleting }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, x: -80, transition: { duration: 0.2 } }}
    className="flex items-center justify-between p-3 sm:p-3.5 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 transition-all duration-200 group border border-transparent hover:border-border touch-manipulation"
  >
    {/* Left: indicator + info */}
    <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
      {/* Color dot */}
      <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full flex-shrink-0 ${tx.type === 'income' ? 'bg-success-500 shadow-sm shadow-success-500/50' : 'bg-accent-500 shadow-sm shadow-accent-500/50'}`} />
      {/* Icon bubble */}
      <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-sm ${tx.type === 'income' ? 'bg-success-500/10' : 'bg-accent-500/10'}`}>
        {tx.type === 'income'
          ? <ArrowUpRight size={14} className="text-success-500" />
          : <ArrowDownRight size={14} className="text-accent-500" />}
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-xs sm:text-sm text-slate-800 truncate">{tx.category}</p>
        <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5 truncate">
          {tx.memberName} · {tx.date}
        </p>
      </div>
    </div>

    {/* Right: amount + delete */}
    <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0 ml-2">
      <span className={`font-extrabold text-xs sm:text-sm font-sans ${tx.type === 'income' ? 'text-success-400' : 'text-accent-400'}`}>
        {tx.type === 'income' ? '+' : '-'}₹{Number(tx.amount).toLocaleString()}
      </span>
      <button
        onClick={() => onDelete(tx.id)}
        disabled={isDeleting}
        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Delete transaction"
      >
        {isDeleting ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Trash2 size={13} />
        )}
      </button>
    </div>
  </motion.div>
));

TransactionRow.displayName = 'TransactionRow';

// ============================================================================
// Empty State
// ============================================================================
const EmptyState = ({ message }) => (
  <div className="py-10 sm:py-14 flex flex-col items-center justify-center text-slate-400 select-none">
    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
      <Inbox size={24} className="opacity-50" />
    </div>
    <p className="text-sm font-medium text-slate-500">{message}</p>
  </div>
);

// ============================================================================
// Chart Section Title
// ============================================================================
const SectionTitle = ({ color = 'from-primary-400 to-secondary-400', children, right }) => (
  <div className="flex items-center justify-between mb-4 sm:mb-5">
    <h3 className="text-sm sm:text-base font-bold flex items-center gap-2">
      <div className={`w-1 h-4 sm:w-1.5 sm:h-5 rounded-full bg-gradient-to-b ${color}`} />
      {children}
    </h3>
    {right}
  </div>
);

// ============================================================================
// Main Dashboard
// ============================================================================
export default function Dashboard() {
  const {
    personalIncome: totalIncome = 0,
    personalExpense: totalExpense = 0,
    personalBalance: balance = 0,
    budgetLimit = 0,
    personalTransactions: transactions = [],
    deleteTransaction,
    savingsGoal = { name: 'Family Vacation', target: 100000 },
  } = useFinance();
  const { user } = useAuth();

  const [deletingId, setDeletingId] = useState(null);
  const [showAllTx, setShowAllTx] = useState(false);

  // Derived values
  const isOverBudget = useMemo(() => totalExpense > budgetLimit && budgetLimit > 0, [totalExpense, budgetLimit]);
  const savingsRate = useMemo(() => (totalIncome > 0 ? (balance / totalIncome) * 100 : 0), [balance, totalIncome]);
  const goalProgress = useMemo(() => Math.min((balance / savingsGoal.target) * 100, 100), [balance, savingsGoal.target]);

  // Category chart data
  const chartData = useMemo(() => {
    const map = transactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + Number(curr.amount);
        return acc;
      }, {});
    return Object.entries(map)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [transactions]);

  // Trend chart data
  const trendData = useMemo(() => {
    const map = new Map();
    [...transactions]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .forEach((tx) => {
        const existing = map.get(tx.date) || { income: 0, expense: 0 };
        if (tx.type === 'income') existing.income += Number(tx.amount);
        else existing.expense += Number(tx.amount);
        map.set(tx.date, existing);
      });
    return Array.from(map.entries()).map(([date, values]) => ({ date, ...values }));
  }, [transactions]);

  const handleDelete = useCallback(
    async (id) => {
      if (window.confirm('Delete this transaction?')) {
        setDeletingId(id);
        try {
          await deleteTransaction(id);
        } catch (err) {
          console.error('Delete failed:', err);
          alert('Could not delete. Please try again.');
        } finally {
          setDeletingId(null);
        }
      }
    },
    [deleteTransaction]
  );

  const colors = ['#8b5cf6', '#22d3ee', '#f43f5e', '#10b981', '#f59e0b', '#ec4899'];
  const displayedTx = showAllTx ? transactions : transactions.slice(0, 6);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-3 sm:space-y-5 pb-4">

      {/* ── Balance Hero (always shown, mobile-optimised) ── */}
      <BalanceHeroCard balance={balance} income={totalIncome} expense={totalExpense} />

      {/* ── Horizontal scrollable stat pills ── */}
      <motion.div variants={item}>
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-0.5 px-0.5 snap-x snap-mandatory hide-scrollbar">
          <StatCard
            title="Savings Rate"
            amount={savingsRate}
            icon={Sparkles}
            gradient="bg-secondary-500"
            textColor="text-secondary-400"
            prefix=""
            suffix="%"
          />
          <StatCard
            title="Budget Limit"
            amount={budgetLimit}
            icon={Wallet}
            gradient="bg-primary-500"
            textColor="text-primary-400"
          />
          <StatCard
            title="Total Income"
            amount={totalIncome}
            icon={TrendingUp}
            gradient="bg-success-500"
            textColor="text-success-400"
          />
          <StatCard
            title="Total Expenses"
            amount={totalExpense}
            icon={TrendingDown}
            gradient="bg-accent-500"
            textColor="text-accent-400"
          />
        </div>
      </motion.div>

      {/* ── Budget Alert ── */}
      <AnimatePresence>
        {isOverBudget && (
          <motion.div
            variants={item}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="glass-panel border-accent-500/30 p-3.5 sm:p-4 flex items-start sm:items-center gap-3 bg-accent-500/5"
          >
            <div className="p-2 rounded-xl bg-accent-500/15 flex-shrink-0 mt-0.5 sm:mt-0">
              <AlertTriangle className="text-accent-400" size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-accent-400 font-bold text-sm">Budget Exceeded</h4>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 leading-relaxed">
                Expenses (₹{totalExpense.toLocaleString()}) exceeded your ₹{budgetLimit.toLocaleString()} limit.
              </p>
            </div>
            <button className="flex-shrink-0 p-1 rounded-lg hover:bg-accent-500/10 text-slate-400 transition-colors">
              <ChevronRight size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Savings Goal ── */}
      <SavingsGoalCard goal={savingsGoal} progress={goalProgress} balance={balance} />

      {/* ── Charts: stacked on mobile, side-by-side on lg ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4">

        {/* Trend Chart */}
        <motion.div variants={item} className="glass-panel p-4 sm:p-5 lg:col-span-3">
          <SectionTitle color="from-primary-400 to-secondary-400">
            Income vs Expense
          </SectionTitle>
          <div className="h-44 sm:h-56">
            {trendData.length === 0 ? (
              <EmptyState message="No transaction data yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                  <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#9ca3af" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fill="url(#incomeGrad)" dot={{ r: 2.5, strokeWidth: 2 }} />
                  <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2} fill="url(#expenseGrad)" dot={{ r: 2.5, strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          {trendData.length > 0 && (
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <div className="w-3 h-1 rounded-full bg-success-500" /> Income
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <div className="w-3 h-1 rounded-full bg-accent-500" /> Expenses
              </div>
            </div>
          )}
        </motion.div>

        {/* Category Bar Chart */}
        <motion.div variants={item} className="glass-panel p-4 sm:p-5 lg:col-span-2">
          <SectionTitle color="from-accent-400 to-warning-400">
            Top Categories
          </SectionTitle>
          <div className="h-44 sm:h-56">
            {chartData.length === 0 ? (
              <EmptyState message="No expense data" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                  <XAxis type="number" stroke="#9ca3af" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                  <YAxis dataKey="name" type="category" stroke="#9ca3af" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="amount" radius={[0, 6, 6, 0]} barSize={12}>
                    {chartData.map((_, i) => (
                      <Cell key={`cell-${i}`} fill={colors[i % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Recent Transactions ── */}
      <motion.div variants={item} className="glass-panel p-4 sm:p-5">
        <SectionTitle
          color="from-secondary-400 to-primary-400"
          right={
            <div className="flex items-center gap-2">
              <span className="text-[9px] sm:text-[10px] text-slate-500 bg-slate-100 px-2 py-1 rounded-full font-medium">
                {transactions.length} records
              </span>
              <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                <Filter size={13} />
              </button>
            </div>
          }
        >
          Recent Transactions
        </SectionTitle>

        <div className="space-y-1.5 sm:space-y-2">
          <AnimatePresence initial={false}>
            {transactions.length === 0 ? (
              <EmptyState message="No transactions yet. Add your first one!" />
            ) : (
              displayedTx.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  tx={tx}
                  onDelete={handleDelete}
                  isDeleting={deletingId === tx.id}
                />
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Show more / less */}
        {transactions.length > 6 && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowAllTx(!showAllTx)}
            className="w-full mt-3 py-2.5 rounded-xl text-xs font-semibold text-primary-500 hover:bg-primary-500/8 transition-colors flex items-center justify-center gap-1.5"
          >
            {showAllTx ? 'Show less' : `View all ${transactions.length} transactions`}
            <ChevronRight size={13} className={`transition-transform ${showAllTx ? 'rotate-90' : ''}`} />
          </motion.button>
        )}
      </motion.div>

    </motion.div>
  );
}