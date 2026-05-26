import React, { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import HeaderActions from '../components/ui/HeaderActions';
import { useFinance } from '../context/FinanceContext';
import { useLanguage } from '../context/LanguageContext';
import { downloadBase64File } from '../utils/downloadHelper';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, staggerItem } from '../utils/animations';
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from 'recharts';
import { SafeChartContainer } from '../components/ui/SafeChartContainer';
import {
  Download,
  Loader2,
  Brain,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Info,
  Sparkles,
  Target,
  Zap,
  Clock,
  CalendarDays,
  CheckCircle2,
} from 'lucide-react';
import { isThisMonth, isThisWeek } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ============================================================================
// Types
// ============================================================================
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    color?: string;
    name: string;
    value: number | string;
  }>;
  label?: string;
}

interface KpiCardProps {
  label: string;
  value: string | number;
  color: string;
  bg: string;
  isStr?: boolean;
}

interface ToastProps {
  message: string;
  visible: boolean;
  icon?: React.ComponentType<any> | null;
}

interface InsightType {
  icon: React.ComponentType<any>;
  color: string;
  bg: string;
  border: string;
  title: string;
  text: string;
}

interface TrendDataItem {
  date: string;
  income: number;
  expense: number;
}

interface CategoryDataItem {
  name: string;
  value: number;
}

interface MemberDataItem {
  name: string;
  income: number;
  expense: number;
}

// ============================================================================
// Subcomponents (memoized)
// ============================================================================
const CustomTooltip = React.memo<CustomTooltipProps>(({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="glass-panel-static p-4 border border-slate-900/10 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-3 mb-1">
            <span
              className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]"
              style={{ backgroundColor: p.color, color: p.color }}
            />
            <p className="font-semibold text-slate-900 capitalize text-sm">
              {p.name}:{' '}
              <span className="font-sans text-slate-700 ml-1 font-bold">
                ₹{Number(p.value).toLocaleString()}
              </span>
            </p>
          </div>
        ))}
      </div>
    );
  }
  return null;
});
CustomTooltip.displayName = 'CustomTooltip';

const KpiCard = React.memo<KpiCardProps>(
  ({
    label,
    value,
    color,
    bg,
    isStr = false,
  }) => (
    <div className="glass-panel p-4 md:p-5 flex flex-col justify-between relative overflow-hidden group">
      <div
        className={`absolute -right-4 -top-4 w-16 h-16 rounded-full blur-xl transition-all duration-500 opacity-0 group-hover:opacity-100 ${bg}`}
      />
      <p className="text-[10px] md:text-xs text-slate-600 font-bold uppercase tracking-[0.2em] relative z-10">
        {label}
      </p>
      <p
        className={`text-xl md:text-3xl font-black font-sans mt-2 md:mt-3 tracking-tighter relative z-10 ${color}`}
      >
        {!isStr && '₹'}
        {isStr ? value : Number(value).toLocaleString()}
      </p>
    </div>
  )
);
KpiCard.displayName = 'KpiCard';

// ============================================================================
// Toast Notification Component
// ============================================================================
const Toast: React.FC<ToastProps> = ({ message, visible, icon: ToastIcon }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        key="toast"
        initial={{ opacity: 0, scale: 0.8, x: '-50%', y: '-50%' }}
        animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
        exit={{ opacity: 0, scale: 0.8, x: '-50%', y: '-50%' }}
        className="fixed top-1/2 left-1/2 z-[200] bg-white/80 dark:bg-[#12121f]/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 text-slate-800 dark:text-slate-100 px-6 py-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center gap-3 text-center min-w-[200px] max-w-[80vw]"
      >
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
          {ToastIcon ? <ToastIcon size={24} className="text-emerald-500" /> : <CheckCircle2 size={24} className="text-emerald-500" />}
        </div>
        <p className="text-base font-bold leading-tight">{message}</p>
      </motion.div>
    )}
  </AnimatePresence>
);

// ============================================================================
// Animation variants
// ============================================================================
const container = staggerContainer(0.08, 0.1);
const item = staggerItem;

// ============================================================================
// Main Component
// ============================================================================
export default function Analytics() {
  const { transactions = [], savingsGoal = { name: 'Family Goal', target: 100000 } } =
    useFinance();
  const [timeFilter, setTimeFilter] = useState<'all' | 'month' | 'week'>('all');
  const { t } = useLanguage();

  // Toast and loading states
  const [toast, setToast] = useState<{
    message: string;
    visible: boolean;
    icon: React.ComponentType<any> | null;
  }>({ message: '', visible: false, icon: null });
  const [isExporting, setIsExporting] = useState(false);

  const showToast = useCallback((msg: string, icon: React.ComponentType<any> | null = null) => {
    setToast({ message: msg, visible: true, icon });
    setTimeout(() => setToast({ message: '', visible: false, icon: null }), 2500);
  }, []);

  const COLORS = ['#8b5cf6', '#22d3ee', '#f43f5e', '#10b981', '#f59e0b', '#ec4899', '#6366f1'];

  // Filter transactions based on time filter (memoized)
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (timeFilter === 'all') return true;
      const date = new Date(tx.date);
      if (timeFilter === 'month') return isThisMonth(date);
      if (timeFilter === 'week') return isThisWeek(date);
      return true;
    });
  }, [transactions, timeFilter]);

  // Aggregate totals (memoized)
  const { totalIncome, totalExpense, netBalance, savingsRate } = useMemo(() => {
    const inc = filteredTransactions
      .filter((tx) => tx.type === 'income')
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
    const exp = filteredTransactions
      .filter((tx) => tx.type === 'expense')
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
    const net = inc - exp;
    const rate = inc > 0 ? (net / inc) * 100 : 0;
    return { totalIncome: inc, totalExpense: exp, netBalance: net, savingsRate: rate };
  }, [filteredTransactions]);

  // Trend data for area chart (memoized)
  const trendData = useMemo<TrendDataItem[]>(() => {
    const map = new Map<string, { income: number; expense: number }>();
    [...filteredTransactions]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach((tx) => {
        const date = tx.date;
        const existing = map.get(date);
        if (existing) {
          if (tx.type === 'income') existing.income += Number(tx.amount);
          else existing.expense += Number(tx.amount);
        } else {
          map.set(date, {
            income: tx.type === 'income' ? Number(tx.amount) : 0,
            expense: tx.type === 'expense' ? Number(tx.amount) : 0,
          });
        }
      });
    return Array.from(map.entries()).map(([date, values]) => ({ date, ...values }));
  }, [filteredTransactions]);

  // Category breakdown (memoized)
  const categoryData = useMemo<CategoryDataItem[]>(() => {
    const map = new Map<string, number>();
    filteredTransactions
      .filter((tx) => tx.type === 'expense')
      .forEach((tx) => {
        const cat = t(tx.category);
        map.set(cat, (map.get(cat) || 0) + Number(tx.amount));
      });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions, t]);

  // Member data for leaderboard (memoized)
  const memberData = useMemo<MemberDataItem[]>(() => {
    const map = new Map<string, { income: number; expense: number }>();
    filteredTransactions.forEach((tx) => {
      const member = t(tx.memberName || 'Unknown');
      if (!member) return;
      const existing = map.get(member);
      if (existing) {
        if (tx.type === 'income') existing.income += Number(tx.amount);
        else existing.expense += Number(tx.amount);
      } else {
        map.set(member, {
          income: tx.type === 'income' ? Number(tx.amount) : 0,
          expense: tx.type === 'expense' ? Number(tx.amount) : 0,
        });
      }
    });
    return Array.from(map.entries()).map(([name, stats]) => ({ name, ...stats }));
  }, [filteredTransactions, t]);

  // AI Insights (memoized)
  const aiInsights = useMemo<InsightType[]>(() => {
    const insights: InsightType[] = [];
    const topCat = categoryData[0];

    // High spending alert
    if (topCat && topCat.value > totalExpense * 0.4 && totalExpense > 0) {
      insights.push({
        icon: AlertTriangle,
        color: 'text-accent-400',
        bg: 'bg-accent-500/10',
        border: 'border-accent-500/20',
        title: 'Spending Pattern Alert',
        text: `"${topCat.name}" is bleeding capital, causing ${((topCat.value / totalExpense) * 100).toFixed(
          0
        )}% of all expenses. Consider isolating this category.`,
      });
    }

    // Savings rate evaluation
    if (savingsRate > 30) {
      insights.push({
        icon: Target,
        color: 'text-success-400',
        bg: 'bg-success-500/10',
        border: 'border-success-500/20',
        title: 'Exceptional Discipline',
        text: `Your family savings rate is at a highly optimized ${savingsRate.toFixed(
          1
        )}%. You are accelerating towards "${savingsGoal?.name || 'your goal'}".`,
      });
    } else if (savingsRate < 10 && savingsRate > -100 && totalIncome > 0) {
      insights.push({
        icon: Lightbulb,
        color: 'text-warning-400',
        bg: 'bg-warning-500/10',
        border: 'border-warning-500/20',
        title: 'Capital Erosion Risk',
        text: `A savings rate of ${savingsRate.toFixed(
          1
        )}% indicates high friction. Auditing lower-tier expenses could yield a 15% efficiency gain.`,
      });
    }

    // Asymmetric spending
    const biggestSpender = [...memberData].sort((a, b) => b.expense - a.expense)[0];
    if (biggestSpender && biggestSpender.expense > totalExpense * 0.6 && memberData.length > 1) {
      insights.push({
        icon: Zap,
        color: 'text-primary-400',
        bg: 'bg-primary-500/10',
        border: 'border-primary-500/20',
        title: 'Asymmetric Spending',
        text: `${biggestSpender.name} drove the majority of the expenditures (₹${biggestSpender.expense.toLocaleString()}). Balancing output might reduce systemic friction.`,
      });
    }

    // Default insight
    if (insights.length === 0) {
      insights.push({
        icon: Info,
        color: 'text-secondary-400',
        bg: 'bg-secondary-500/10',
        border: 'border-secondary-500/20',
        title: 'System Stable',
        text: 'Insufficient variance detected. Inject more data to trigger advanced pattern recognition.',
      });
    }
    return insights;
  }, [categoryData, totalExpense, totalIncome, savingsRate, memberData, savingsGoal]);

  // Export handler
  const exportData = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const doc = new jsPDF();

      // Custom Fonts & Colors
      const headerColor = [30, 41, 59];
      const sublineColor = [100, 116, 139];

      // Header Title
      doc.setFontSize(22);
      doc.setTextColor(headerColor[0], headerColor[1], headerColor[2]);
      doc.text('MS Family Intelligence Report', 14, 22);

      // Generation & Filter Meta
      doc.setFontSize(10);
      doc.setTextColor(sublineColor[0], sublineColor[1], sublineColor[2]);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
      doc.text(`Period Filter: ${timeFilter.toUpperCase()} TIME`, 14, 35);
      doc.setLineWidth(0.1);
      doc.setDrawColor(200, 200, 200);
      doc.line(14, 40, 196, 40);

      // Section: KPI Matrix
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('Financial Matrix (KPIs)', 14, 50);

      autoTable(doc, {
        startY: 55,
        head: [['Metric Segment', 'Value Readout']],
        body: [
          ['Gross Inflow', `Rs ${totalIncome.toLocaleString()}`],
          ['Capital Burn', `Rs ${totalExpense.toLocaleString()}`],
          ['Net Retained', `Rs ${netBalance.toLocaleString()}`],
          ['Save Velocity', `${savingsRate.toFixed(1)}%`]
        ],
        headStyles: { fillColor: [79, 70, 229], fontStyle: 'bold' },
        styles: { cellPadding: 3, fontSize: 10 },
        theme: 'grid',
      });

      let finalY = (doc as any).lastAutoTable.finalY + 15;

      // Section: Resource Allocation
      if (categoryData.length > 0) {
        if (finalY > 250) {
          doc.addPage();
          finalY = 20;
        }
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text('Resource Allocation Target Matrix', 14, finalY);
        autoTable(doc, {
          startY: finalY + 5,
          head: [['Allocated Category', 'Burn Amount']],
          body: categoryData.map((c) => [c.name, `Rs ${c.value.toLocaleString()}`]),
          headStyles: { fillColor: [244, 63, 94] },
          styles: { cellPadding: 3, fontSize: 10 },
          theme: 'grid',
        });
        finalY = (doc as any).lastAutoTable.finalY + 15;
      }

      // Section: Entity Impact Ratio
      if (memberData.length > 0) {
        if (finalY > 240) {
          doc.addPage();
          finalY = 20;
        }
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text('Entity Impact Ratio', 14, finalY);
        autoTable(doc, {
          startY: finalY + 5,
          head: [['Entity Name', 'Capital Burn', 'Gross Inflow']],
          body: memberData.map((m) => [
            m.name,
            `Rs ${m.expense.toLocaleString()}`,
            `Rs ${m.income.toLocaleString()}`,
          ]),
          headStyles: { fillColor: [245, 158, 11] },
          styles: { cellPadding: 3, fontSize: 10 },
          theme: 'grid',
        });
        finalY = (doc as any).lastAutoTable.finalY + 15;
      }

      // Section: AI Synaptic Insights
      if (aiInsights.length > 0) {
        if (finalY > 220) {
          doc.addPage();
          finalY = 20;
        }
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text('Synaptic Insights (AI Generation)', 14, finalY);

        const insightsBody = aiInsights.map((i) => [i.title, i.text]);

        autoTable(doc, {
          startY: finalY + 5,
          head: [['Core Insight', 'Strategy Recommendations']],
          body: insightsBody,
          headStyles: { fillColor: [14, 165, 233] },
          styles: { cellPadding: 5, fontSize: 9, valign: 'middle' },
          columnStyles: { 0: { cellWidth: 40, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } },
          theme: 'grid',
        });
      }

      // Final Output
      const pdfDataUri = doc.output('datauristring');
      const result = await downloadBase64File(pdfDataUri, `ms_family_analytics_${timeFilter}_report.pdf`);

      if (result && !result.success) {
        throw new Error(result.message);
      }

      showToast(t('PDF Generated Successfully'));
    } catch (err: any) {
      console.error('PDF Error:', err);
      showToast(t('Failed to generate PDF'));
    } finally {
      setIsExporting(false);
    }
  }, [
    categoryData,
    memberData,
    aiInsights,
    totalIncome,
    totalExpense,
    netBalance,
    savingsRate,
    timeFilter,
    showToast,
    t,
    isExporting,
  ]);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-4 md:space-y-6 pb-20 md:pb-6 max-w-7xl mx-auto"
    >
      {/* Header & Controls */}
      <motion.div
        variants={item}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 md:p-6 rounded-[1.5rem] border border-slate-900/5 relative overflow-hidden shadow-sm"
      >
        <div className="relative z-10 flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-glow-primary">
              <Brain size={20} className="text-slate-900" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                {t('Intelligence Node')}
              </h2>
              <p className="text-[10px] md:text-xs text-secondary-400 uppercase tracking-widest font-bold mt-1">
                {t('Cross-referencing financial matrix')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto relative z-10 mt-2 md:mt-0">
          {/* Time Filter Segmented Control */}
          <div className="flex p-1 bg-white border border-slate-900/10 rounded-xl">
            {(
              [
                { id: 'all', icon: Clock, label: t('All Time') },
                { id: 'month', icon: CalendarDays, label: '30D' },
                { id: 'week', icon: Sparkles, label: '7D' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setTimeFilter(f.id)}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
                  timeFilter === f.id
                    ? 'bg-slate-900/10 shadow-sm text-slate-900'
                    : 'text-slate-600 hover:text-slate-700'
                }`}
                aria-label={`Filter by ${f.label}`}
              >
                <f.icon size={14} className={timeFilter === f.id ? 'text-primary-400' : ''} />
                {f.label}
              </button>
            ))}
          </div>

          {/* Actions Portaled to Top Header */}
          <HeaderActions>
            <button
              onClick={exportData}
              disabled={isExporting}
              className="glass-btn relative w-10 h-10 sm:w-auto sm:px-3 sm:h-10 rounded-[12px] flex items-center justify-center gap-1.5 text-slate-600 dark:text-slate-300 transition-all disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-primary-500/40 uppercase tracking-wider"
              aria-label="Export report as PDF"
            >
              <span className="absolute top-0 left-2 right-2 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent pointer-events-none" />
              {isExporting ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} strokeWidth={2.3} />}
              <span className="hidden sm:inline text-xs font-semibold">{isExporting ? t('EXPORTING...') : t('EXPORT PDF')}</span>
            </button>
          </HeaderActions>
        </div>
      </motion.div>

      {/* KPI Matrix */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KpiCard label={t('Gross Inflow')} value={totalIncome} color="text-success-400" bg="bg-success-500/10" />
        <KpiCard label={t('Capital Burn')} value={totalExpense} color="text-accent-400" bg="bg-accent-500/10" />
        <KpiCard
          label={t('Net Retained')}
          value={netBalance}
          color={netBalance >= 0 ? 'text-slate-900' : 'text-accent-400'}
          bg="bg-primary-500/10"
        />
        <KpiCard
          label={t('Save Velocity')}
          value={savingsRate.toFixed(1) + '%'}
          color="text-secondary-400"
          bg="bg-secondary-500/10"
          isStr
        />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Main Flow Chart */}
        <motion.div
          variants={item}
          className="glass-panel p-4 md:p-6 lg:col-span-2 h-[350px] md:h-[450px] flex flex-col"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm md:text-base font-extrabold flex items-center gap-2">
              <TrendingUp size={18} className="text-primary-400" />
              {t('Liquidity Velocity')}
            </h3>
            <div className="flex items-center gap-4 text-xs font-bold text-slate-600 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-success-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" /> In
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-accent-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" /> Out
              </span>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            {trendData.length > 0 ? (
              <SafeChartContainer width="100%" height="100%" minHeight={180} data={trendData}>
                <AreaChart data={trendData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#4b5563"
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={10}
                  />
                  <YAxis
                    stroke="#4b5563"
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `₹${val}`}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="income"
                    name="Inflow"
                    stroke="#10b981"
                    strokeWidth={3}
                    fill="url(#colorInc)"
                    activeDot={{ r: 6, fill: '#10b981', stroke: '#06060e', strokeWidth: 4 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    name="Burn"
                    stroke="#f43f5e"
                    strokeWidth={3}
                    fill="url(#colorExp)"
                    activeDot={{ r: 6, fill: '#f43f5e', stroke: '#06060e', strokeWidth: 4 }}
                  />
                </AreaChart>
              </SafeChartContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 text-sm font-medium">
                {t('No liquidity data for selected period.')}
              </div>
            )}
          </div>
        </motion.div>

        {/* Intelligence Side Column */}
        <div className="space-y-4 md:space-y-6 flex flex-col">
          {/* Donut Chart */}
          <motion.div variants={item} className="glass-panel p-4 md:p-6 flex-1 min-h-[280px] flex flex-col">
            <h3 className="text-sm md:text-base font-extrabold mb-2 flex items-center gap-2">
              <Target size={18} className="text-secondary-400" />
              {t('Resource Allocation')}
            </h3>
            <div className="flex-1 relative min-h-0">
              {categoryData.length > 0 ? (
                <>
                  <SafeChartContainer width="100%" height="100%" minHeight={180} data={categoryData}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={typeof window !== 'undefined' && window.innerWidth < 768 ? 60 : 75}
                        outerRadius={typeof window !== 'undefined' && window.innerWidth < 768 ? 85 : 105}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="rgba(0,0,0,0.5)"
                        strokeWidth={2}
                        cornerRadius={4}
                      >
                        {categoryData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<CustomTooltip />} />
                    </PieChart>
                  </SafeChartContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                      {t('Total Out')}
                    </span>
                    <span className="text-xl font-black font-sans mt-1 text-slate-900">
                      ₹{totalExpense.toLocaleString()}
                    </span>
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-600 text-sm font-medium">
                  {t('Initialize allocations to view.')}
                </div>
              )}
            </div>
          </motion.div>

          {/* Leaderboard */}
          <motion.div
            variants={item}
            className="glass-panel p-4 md:p-6 bg-gradient-to-br from-white/[0.03] to-transparent shrink-0"
          >
            <h3 className="text-sm md:text-base font-extrabold mb-4 flex items-center gap-2">
              <Zap size={18} className="text-warning-400" />
              {t('Entity Impact Ratio')}
            </h3>
            <div className="space-y-3">
              {memberData.length > 0 ? (
                memberData
                  .sort((a, b) => b.expense - a.expense)
                  .slice(0, 3)
                  .map((m, i) => {
                    const percent = totalExpense > 0 ? (m.expense / totalExpense) * 100 : 0;
                    return (
                      <div key={m.name} className="relative">
                        <div className="flex justify-between text-[11px] md:text-xs font-bold mb-1.5">
                          <span className="text-slate-700">{m.name}</span>
                          <span className="font-sans text-slate-500">
                            ₹{m.expense.toLocaleString()}{' '}
                            <span className="text-accent-400/80 ml-1">({percent.toFixed(0)}%)</span>
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-white rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percent}%` }}
                            transition={{ duration: 1, ease: 'easeOut', delay: i * 0.1 }}
                            className={`h-full rounded-full ${
                              i === 0
                                ? 'bg-accent-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                                : i === 1
                                ? 'bg-warning-400'
                                : 'bg-primary-400'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })
              ) : (
                <span className="text-slate-600 text-sm font-medium">{t('No entities active.')}</span>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* AI Synapse Feed */}
      <motion.div variants={item} className="glass-panel relative overflow-hidden">
        <div className="absolute top-0 right-0 h-full w-[400px] bg-gradient-to-l from-primary-500/10 via-secondary-500/5 to-transparent pointer-events-none" />

        <div className="p-4 md:p-6 border-b border-slate-900/5 flex items-center gap-3 bg-white/[0.01]">
          <div className="p-2 rounded-xl bg-primary-500/20 shadow-glow-primary">
            <Brain size={18} className="text-primary-400 animate-pulse-slow" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-extrabold text-slate-900">{t('Synaptic Insights')}</h3>
            <p className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">
              {t('AI Generated Strategies')}
            </p>
          </div>
        </div>

        <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {aiInsights.map((insight, i) => (
              <motion.div
                key={insight.title}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className={`p-4 md:p-5 rounded-[1.25rem] border backdrop-blur-md relative overflow-hidden group ${insight.bg} ${insight.border}`}
              >
                <div
                  className={`absolute top-0 right-0 w-24 h-24 blur-[40px] opacity-20 transition-opacity group-hover:opacity-40 ${insight.color.replace(
                    'text-',
                    'bg-'
                  )}`}
                />
                <div className="flex items-start gap-4 w-full relative z-10">
                  <div
                    className={`mt-0.5 shrink-0 p-2.5 rounded-xl bg-white ${insight.color} border border-slate-900/5`}
                  >
                    <insight.icon size={18} />
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-xs uppercase tracking-widest font-extrabold mb-1.5 ${insight.color}`}>
                      {insight.title}
                    </h4>
                    <p className="text-[13px] md:text-sm text-slate-700 leading-relaxed font-medium">
                      {insight.text}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Toast Notification */}
      <Toast message={toast.message} visible={toast.visible} icon={toast.icon} />
    </motion.div>
  );
}
