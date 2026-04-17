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
// Subcomponents (memoized for performance)
// ============================================================================
const StatCard = React.memo(
  ({
    title,
    amount,
    icon: Icon,
    iconBg,
    prefix = '₹',
  }) => (
    <motion.div
      variants={item}
      className="glass-panel p-6 relative overflow-hidden group cursor-default"
      whileH={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity bg-gradient-to-br from-primary-500 to-secondary-500" />
      <div className="flex justify-between items-start relative z-10">
        <div>
          <p className="text-slate-500 text-xs font-semibold tracking-widest uppercase">
            {title}
          </p>
          <h3 className="text-3xl font-extrabold mt-2 tracking-tight font-sans text-slate-900">
            {prefix}
            {amount.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </h3>
        </div>
        <div className={`p-3 rounded-xl ${iconBg}`}>
          <Icon size={22} />
        </div>
      </div>
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
    </motion.div>
  )
);

StatCard.displayName = 'StatCard';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="glass-panel-static p-3 text-sm border border-slate-900/10 shadow-lg">
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
// Main Dashboard Component
// ============================================================================
export default function Dashboard() {
  const {
    personalIncome: totalIncome = 0,
    personalExpense: totalExpense = 0,
    personalBalance: balance = 0,
    budgetLimit = 0, // fallback
    personalTransactions: transactions = [], // fallback
    deleteTransaction,
    savingsGoal = { name: 'Family Vacation', target: 100000 }, // fallback
  } = useFinance();
  const { user } = useAuth();

  // Local state for delete confirmation & loading
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Derived values (memoized)
  const isOverBudget = useMemo(
    () => totalExpense > budgetLimit,
    [totalExpense, budgetLimit]
  );
  const savingsRate = useMemo(
    () => (totalIncome > 0 ? (balance / totalIncome) * 100 : 0),
    [balance, totalIncome]
  );
  const goalProgress = useMemo(
    () => Math.min((balance / savingsGoal.target) * 100, 100),
    [balance, savingsGoal.target]
  );

  // Chart data: expenses by category (memoized)
  const chartData = useMemo(() => {
    const expensesByCategory = transactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + Number(curr.amount);
        return acc;
      }, {});
    return Object.entries(expensesByCategory)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  // Trend data: daily income/expense (memoized)
  const trendData = useMemo(() => {
    const map = new Map();
  [...transactions]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .forEach((tx) => {
      const existing = map.get(tx.date);
      if (existing) {
        if (tx.type === 'income') existing.income += Number(tx.amount);
        else existing.expense += Number(tx.amount);
      } else {
        map.set(tx.date, {
          income: tx.type === 'income' ? Number(tx.amount) : 0,
          expense: tx.type === 'expense' ? Number(tx.amount) : 0,
        });
      }
    });
  return Array.from(map.entries()).map(([date, values]) => ({ date, ...values }));
}, [transactions]);

// Delete handler with confirmation & loading state
const handleDelete = useCallback(
  async (id) => {
    setConfirmDelete(id);
    // Simple confirm dialog (can be replaced with a modal)
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      setDeletingId(id);
      try {
        await deleteTransaction(id);
      } catch (error) {
        console.error('Failed to delete transaction:', error);
        alert('Could not delete transaction. Please try again.');
      } finally {
        setDeletingId(null);
        setConfirmDelete(null);
      }
    } else {
      setConfirmDelete(null);
    }
  },
  [deleteTransaction]
);

// Colors for bar chart
const colors = ['#8b5cf6', '#22d3ee', '#f43f5e', '#10b981', '#f59e0b', '#ec4899'];

// Loading state (if your context provides isLoading)
// For demonstration, we assume no loading, but you can add:
// if (isLoading) return <DashboardSkeleton />;

return (
  <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">


    {/* Stats Grid */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Balance"
        amount={balance}
        icon={Wallet}
        iconBg="bg-primary-500/15 text-primary-400"
      />
      <StatCard
        title="Total Income"
        amount={totalIncome}
        icon={TrendingUp}
        iconBg="bg-success-500/15 text-success-400"
      />
      <StatCard
        title="Total Expenses"
        amount={totalExpense}
        icon={TrendingDown}
        iconBg="bg-accent-500/15 text-accent-400"
      />
      <StatCard
        title="Savings Rate"
        amount={savingsRate}
        icon={Sparkles}
        iconBg="bg-secondary-500/15 text-secondary-400"
        prefix=""
        suffix="%"
      />
    </div>

    {/* Budget Alert */}
    <AnimatePresence>
      {isOverBudget && (
        <motion.div
          variants={item}
          initial="hidden"
          animate="show"
          exit="hidden"
          className="glass-panel border-accent-500/30 p-4 flex items-center gap-4 bg-accent-500/5"
        >
          <div className="p-2 rounded-xl bg-accent-500/15">
            <AlertTriangle className="text-accent-400" size={22} />
          </div>
          <div className="flex-1">
            <h4 className="text-accent-400 font-bold text-sm">Budget Exceeded</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Expenses (₹{totalExpense.toLocaleString()}) exceeded your ₹
              {budgetLimit.toLocaleString()} limit. Review your spending patterns.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Charts Row */}
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* Trend Chart */}
      <motion.div variants={item} className="glass-panel p-6 lg:col-span-3">
        <h3 className="text-base font-bold mb-6 flex items-center gap-2">
          <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-primary-400 to-secondary-400" />
          Income vs Expense Flow
        </h3>
        <div className="h-60">
          {trendData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
              <Inbox size={32} className="opacity-40 mb-2" />
              <p className="text-sm">No transaction data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="date"
                  stroke="#4b5563"
                  tick={{ fontSize: 11 }}
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
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fill="url(#incomeGrad)"
                  dot={{ r: 3, strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  stroke="#f43f5e"
                  strokeWidth={2.5}
                  fill="url(#expenseGrad)"
                  dot={{ r: 3, strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="flex items-center gap-6 mt-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-3 h-1.5 rounded-full bg-success-500" /> Income
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-3 h-1.5 rounded-full bg-accent-500" /> Expenses
          </div>
        </div>
      </motion.div>

      {/* Category Bar Chart */}
      <motion.div variants={item} className="glass-panel p-6 lg:col-span-2">
        <h3 className="text-base font-bold mb-6 flex items-center gap-2">
          <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-accent-400 to-warning-400" />
          Top Categories
        </h3>
        <div className="h-60">
          {chartData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
              <Inbox size={32} className="opacity-40 mb-2" />
              <p className="text-sm">No expense data</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <XAxis
                  type="number"
                  stroke="#4b5563"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `₹${val}`}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#9ca3af"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="amount" radius={[0, 6, 6, 0]} barSize={16}>
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>
    </div>

    {/* Recent Transactions */}
    <motion.div variants={item} className="glass-panel p-6">
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-base font-bold flex items-center gap-2">
          <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-secondary-400 to-primary-400" />
          Recent Transactions
        </h3>
        <span className="text-xs text-slate-600">{transactions.length} records</span>
      </div>

      <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
        <AnimatePresence initial={false}>
          {transactions.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Inbox size={40} className="mx-auto opacity-40 mb-3" />
              <p className="text-sm">No transactions yet. Add your first one!</p>
            </div>
          ) : (
            transactions.slice(0, 8).map((tx) => (
              <motion.div
                key={tx.id}
                layout
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-between p-3.5 rounded-xl bg-white hover:bg-slate-100 transition-all duration-300 group border border-transparent hover:border-border"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`neon-dot flex-shrink-0 ${tx.type === 'income'
                        ? 'bg-success-500 text-success-500'
                        : 'bg-accent-500 text-accent-500'
                      }`}
                  />
                  <div>
                    <p className="font-semibold text-sm">{tx.category}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {tx.memberName} • {tx.date}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span
                      className={`font-bold text-sm font-sans ${tx.type === 'income' ? 'text-success-400' : 'text-accent-400'
                        }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}₹
                      {tx.amount.toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(tx.id)}
                    disabled={deletingId === tx.id}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  </motion.div>
);
}