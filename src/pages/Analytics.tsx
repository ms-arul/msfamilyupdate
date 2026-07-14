import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import HeaderActions from '../components/ui/HeaderActions';
import { useFinance } from '../context/FinanceContext';
import { useLanguage } from '../context/LanguageContext';
import { downloadBase64File } from '../utils/downloadHelper';
import { motion, AnimatePresence, animate } from 'framer-motion';
import { useSubscription } from '../context/SubscriptionContext';
import PremiumGate from '../components/PremiumGate';
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
  TrendingDown,
  Wallet,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
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
// Easing & Animation Tokens
// ============================================================================
const wrapV = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

const cardV = {
  hidden: { opacity: 0, y: 15, scale: 0.98, filter: 'blur(8px)' },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      opacity: { type: 'spring', stiffness: 300, damping: 28, mass: 0.8 },
      scale: { type: 'spring', stiffness: 300, damping: 28, mass: 0.8 },
      y: { type: 'spring', stiffness: 300, damping: 28, mass: 0.8 },
      filter: { type: 'tween', ease: 'easeOut', duration: 0.25 }
    },
  },
};

const hoverCard = {
  whileHover: { y: -3, scale: 1.015, transition: { type: 'spring', stiffness: 400, damping: 24 } },
  whileTap: { scale: 0.985, transition: { duration: 0.08 } },
};

const item = cardV;


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
  accentHex?: string;
  icon?: React.ComponentType<any>;
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
  accentHex: string;
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
// Animated count-up number (Direct DOM manipulation for 60FPS)
// ============================================================================
interface AnimNumProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

const AnimNum: React.FC<AnimNumProps> = ({ value, prefix = '₹', suffix = '', decimals = 0 }) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const prevValueRef = useRef(0);

  useEffect(() => {
    const node = spanRef.current;
    if (!node) return;

    const from = prevValueRef.current;
    prevValueRef.current = value;

    const controls = animate(from, value, {
      duration: 1.25,
      ease: [0.16, 1, 0.3, 1], // Apple HIG easeOut
      onUpdate(v) {
        const formatted = decimals > 0
          ? v.toFixed(decimals)
          : Math.round(v).toLocaleString();
        node.textContent = `${prefix}${formatted}${suffix}`;
      },
    });

    return () => controls.stop();
  }, [value, prefix, suffix, decimals]);

  const initialFormatted = decimals > 0
    ? value.toFixed(decimals)
    : value.toLocaleString();
  return <span ref={spanRef}>{prefix}{initialFormatted}{suffix}</span>;
};

// ============================================================================
// Subcomponents (memoized)
// ============================================================================
const CustomTooltip = React.memo<CustomTooltipProps>(({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
        className="backdrop-blur-2xl bg-white/80 dark:bg-black/55 p-3.5 border border-white/40 dark:border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)] rounded-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 dark:via-white/10 to-transparent pointer-events-none" />
        <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2 mb-1.5 last:mb-0">
            <span
              className="w-1.5 h-1.5 rounded-full shadow-[0_0_6px_currentColor]"
              style={{ backgroundColor: p.color, color: p.color }}
            />
            <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
              {p.name}:{' '}
              <span className="font-sans font-bold text-slate-900 dark:text-white ml-0.5">
                ₹{Number(p.value).toLocaleString()}
              </span>
            </p>
          </div>
        ))}
      </motion.div>
    );
  }
  return null;
});
CustomTooltip.displayName = 'CustomTooltip';

const AppleTooltip = CustomTooltip;


const KpiCard = React.memo<KpiCardProps>(
  ({
    label,
    value,
    color,
    bg,
    isStr = false,
    accentHex = '#5e5ce6',
    icon: Icon,
  }) => (
    <motion.div
      variants={cardV}
      whileHover={{
        y: -4,
        scale: 1.018,
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.08)',
        borderColor: 'rgba(255, 255, 255, 0.25)',
      }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      className="glass-panel p-4 md:p-5 flex flex-col justify-between min-h-[96px] md:min-h-[110px] relative overflow-hidden group cursor-default select-none border border-white/40 dark:border-white/[0.06] backdrop-blur-2xl bg-white/70 dark:bg-black/35 shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-300"
    >
      {/* Specular top highlight */}
      <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/70 dark:via-white/20 to-transparent pointer-events-none" />

      {/* Ambient glow */}
      <div
        className={`absolute -right-6 -top-6 w-20 h-20 rounded-full blur-2xl transition-all duration-700 opacity-20 group-hover:opacity-45 group-hover:scale-125 ${bg}`}
      />

      <div className="flex flex-col h-full w-full justify-between gap-3 relative z-10">
        <div className="flex justify-between items-center w-full gap-2">
          <p className="text-[9px] md:text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-[0.1em] md:tracking-[0.15em] truncate">
            {label}
          </p>
          {Icon && (
            <div className={`p-1.5 md:p-2 rounded-lg border border-white/40 dark:border-white/[0.08] ${bg} shadow-inner shrink-0 flex items-center justify-center`}>
              <Icon size={14} className={color} strokeWidth={2.5} />
            </div>
          )}
        </div>

        <div className={`text-xl sm:text-2xl md:text-3xl font-black font-sans tracking-tight md:tracking-tighter ${color} truncate`}>
          {isStr ? (
            value
          ) : (
            <AnimNum value={Number(value)} />
          )}
        </div>
      </div>

      {/* Accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[1.5px]"
        style={{
          background: `linear-gradient(90deg, transparent 10%, ${accentHex}55 50%, transparent 90%)`,
        }}
      />
    </motion.div>
  )
);
KpiCard.displayName = 'KpiCard';

// ============================================================================
// Toast Notification Component (Apple HIG notification style)
// ============================================================================
const Toast: React.FC<ToastProps> = ({ message, visible, icon: ToastIcon }) => (
  <AnimatePresence>
    {visible && (
      <div className="fixed top-6 left-0 right-0 z-[200] flex justify-center pointer-events-none px-4">
        <motion.div
          key="toast"
          initial={{ opacity: 0, y: -60, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -40, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur-3xl border border-white/80 dark:border-white/[0.06] text-slate-900 dark:text-white px-5 py-3 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)] flex items-center gap-3 max-w-sm pointer-events-auto"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
            {ToastIcon ? <ToastIcon size={18} className="text-emerald-500 dark:text-emerald-400" /> : <CheckCircle2 size={18} className="text-emerald-500 dark:text-emerald-400" />}
          </div>
          <p className="text-xs font-bold leading-tight">{message}</p>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

// ============================================================================
// Floating Animated Background Orbs
// ============================================================================
const ORB_CFG = [
  { hex: '#5e5ce6', pos: { top: '-12%', right: '8%' }, size: '55vw', dur: 22, d: 0 },
  { hex: '#30d158', pos: { bottom: '-5%', left: '-5%' }, size: '48vw', dur: 26, d: 2 },
  { hex: '#ff9f0a', pos: { top: '25%', left: '35%' }, size: '38vw', dur: 30, d: 4 },
  { hex: '#bf5af2', pos: { bottom: '25%', right: '15%' }, size: '42vw', dur: 28, d: 6 },
];

const BackgroundOrbs = React.memo(() => (
  <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
    {ORB_CFG.map((o, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full filter blur-[140px]"
        style={{
          ...o.pos,
          width: o.size,
          height: o.size,
          background: `radial-gradient(circle, ${o.hex}10, transparent 72%)`,
        }}
        animate={{
          x: [0, 50, -30, 0],
          y: [0, -50, 40, 0],
          scale: [1, 1.08, 0.92, 1],
        }}
        transition={{ duration: o.dur, repeat: Infinity, ease: 'easeInOut', delay: o.d }}
      />
    ))}
  </div>
));
BackgroundOrbs.displayName = 'BackgroundOrbs';

function parseGeminiJson(text: string): any {
  try {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonStr = match ? match[1] : text;
    return JSON.parse(jsonStr.trim());
  } catch (e) {
    throw new Error('Invalid JSON format from AI');
  }
}

// ============================================================================
// Main Component
// ============================================================================
export default function Analytics() {
  const { transactions = [], savingsGoal = { name: 'Family Goal', target: 100000 } } =
    useFinance();
  const { isPremium, setShowUpgradeModal } = useSubscription();
  const [timeFilter, setTimeFilter] = useState<'all' | 'month' | 'week'>('all');
  const [hoveredPieIndex, setHoveredPieIndex] = useState<number | null>(null);
  const { t } = useLanguage();

  // Toast and loading states
  const [toast, setToast] = useState<{
    message: string;
    visible: boolean;
    icon: React.ComponentType<any> | null;
  }>({ message: '', visible: false, icon: null });
  const [isExporting, setIsExporting] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);

  const showToast = useCallback((msg: string, icon: React.ComponentType<any> | null = null) => {
    setToast({ message: msg, visible: true, icon });
    setTimeout(() => setToast({ message: '', visible: false, icon: null }), 2500);
  }, []);

  const mapRawInsights = useCallback((raw: any[]): InsightType[] => {
    return raw.map((item: any) => {
      let icon = Info;
      let color = 'text-[#32ade6]';
      let bg = 'bg-[#32ade6]/10';
      let border = 'border-[#32ade6]/20';
      let accentHex = '#32ade6';

      if (item.type === 'alert') {
        icon = AlertTriangle;
        color = 'text-[#ff3b30]';
        bg = 'bg-[#ff3b30]/10';
        border = 'border-[#ff3b30]/20';
        accentHex = '#ff3b30';
      } else if (item.type === 'success') {
        icon = Target;
        color = 'text-[#30d158]';
        bg = 'bg-[#30d158]/10';
        border = 'border-[#30d158]/20';
        accentHex = '#30d158';
      } else if (item.type === 'warning') {
        icon = Lightbulb;
        color = 'text-[#ff9f0a]';
        bg = 'bg-[#ff9f0a]/10';
        border = 'border-[#ff9f0a]/20';
        accentHex = '#ff9f0a';
      }

      return {
        icon,
        color,
        bg,
        border,
        title: item.title,
        text: item.text,
        accentHex,
      };
    });
  }, []);

  const [dynamicInsights, setDynamicInsights] = useState<InsightType[] | null>(() => {
    try {
      const stored = localStorage.getItem('ms_family_ai_insights');
      if (stored) {
        const parsed = JSON.parse(stored);
        return mapRawInsights(parsed);
      }
    } catch (e) {
      console.warn('Failed to parse cached AI insights', e);
    }
    return null;
  });

  // Premium Apple HIG UI color tokens
  const COLORS = [
    '#5e5ce6', // Indigo
    '#30d158', // Green
    '#ff3b30', // Red
    '#ff9f0a', // Orange
    '#32ade6', // Teal
    '#bf5af2', // Purple
    '#0071e3', // Blue
  ];

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
        color: 'text-[#ff3b30]',
        bg: 'bg-[#ff3b30]/10',
        border: 'border-[#ff3b30]/20',
        accentHex: '#ff3b30',
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
        color: 'text-[#30d158]',
        bg: 'bg-[#30d158]/10',
        border: 'border-[#30d158]/20',
        accentHex: '#30d158',
        title: 'Exceptional Discipline',
        text: `Your family savings rate is at a highly optimized ${savingsRate.toFixed(
          1
        )}%. You are accelerating towards "${savingsGoal?.name || 'your goal'}".`,
      });
    } else if (savingsRate < 10 && savingsRate > -100 && totalIncome > 0) {
      insights.push({
        icon: Lightbulb,
        color: 'text-[#ff9f0a]',
        bg: 'bg-[#ff9f0a]/10',
        border: 'border-[#ff9f0a]/20',
        accentHex: '#ff9f0a',
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
        color: 'text-[#5e5ce6]',
        bg: 'bg-[#5e5ce6]/10',
        border: 'border-[#5e5ce6]/20',
        accentHex: '#5e5ce6',
        title: 'Asymmetric Spending',
        text: `${biggestSpender.name} drove the majority of the expenditures (₹${biggestSpender.expense.toLocaleString()}). Balancing output might reduce systemic friction.`,
      });
    }

    // Default insight
    if (insights.length === 0) {
      insights.push({
        icon: Info,
        color: 'text-[#32ade6]',
        bg: 'bg-[#32ade6]/10',
        border: 'border-[#32ade6]/20',
        accentHex: '#32ade6',
        title: 'System Stable',
        text: 'Insufficient variance detected. Inject more data to trigger advanced pattern recognition.',
      });
    }
    return insights;
  }, [categoryData, totalExpense, totalIncome, savingsRate, memberData, savingsGoal]);

  const triggerAiAnalysis = useCallback(async () => {
    if (!isPremium) {
      setShowUpgradeModal(true);
      return;
    }
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      showToast(t('Gemini API key is missing'), AlertTriangle);
      return;
    }

    setIsAiAnalyzing(true);
    try {
      const prompt = `
You are a brilliant financial advisor AI. Analyze the following family financial data:
- Total Inflow: ₹${totalIncome.toLocaleString()}
- Total Outflow: ₹${totalExpense.toLocaleString()}
- Net Retained: ₹${netBalance.toLocaleString()}
- Savings Rate: ${savingsRate.toFixed(1)}%
- Savings Goal: "${savingsGoal?.name || 'Family Goal'}" (Target: ₹${savingsGoal?.target?.toLocaleString() || 'N/A'})
- Category Expenses: ${JSON.stringify(categoryData)}
- Member Transactions summary: ${JSON.stringify(memberData)}

Based on this, return exactly 3 actionable, highly professional financial recommendations or warnings for this family to improve their finances.
You MUST respond in JSON format ONLY, as a JSON array of objects with the exact schema:
[
  {
    "title": "Short Upper-Case Header",
    "text": "Detailed strategy recommendation, tailored specifically to their data. Max 2 sentences.",
    "type": "alert" | "success" | "warning" | "info"
  }
]
Use 'alert' for high category spends/over-budgeting, 'success' for good savings velocity or goal progression, 'warning' for generic financial risks, and 'info' for general financial optimization advice.
Do not wrap the JSON in markdown code blocks. Just return the raw JSON array.
`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2 }
          })
        }
      );

      if (!response.ok) throw new Error('Failed to generate insights from Gemini API');

      const responseData = await response.json();
      const textResponse = responseData.candidates[0].content.parts[0].text;

      const parsed = parseGeminiJson(textResponse);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localStorage.setItem('ms_family_ai_insights', JSON.stringify(parsed));
        setDynamicInsights(mapRawInsights(parsed));
        showToast(t('Synaptic Insights updated!'));
      } else {
        throw new Error('Invalid array response structure from AI');
      }
    } catch (err: any) {
      console.error('AI Insights Error:', err);
      showToast(t('Failed to generate AI insights. Using local matrix.'), AlertTriangle);
    } finally {
      setIsAiAnalyzing(false);
    }
  }, [totalIncome, totalExpense, netBalance, savingsRate, savingsGoal, categoryData, memberData, t, showToast, mapRawInsights]);

  const displayedInsights = dynamicInsights || aiInsights;

  // Export handler
  const exportData = useCallback(async () => {
    if (!isPremium) {
      setShowUpgradeModal(true);
      return;
    }
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

  // Segmented control tabs configuration
  const TABS = [
    { id: 'all' as const, icon: Clock, label: t('All Time') },
    { id: 'month' as const, icon: CalendarDays, label: '30D' },
    { id: 'week' as const, icon: Sparkles, label: '7D' },
  ];

  return (
    <>
      <BackgroundOrbs />

      <motion.div
        variants={wrapV}
        initial="hidden"
        animate="show"
        className="space-y-4 md:space-y-6 pb-20 md:pb-6 max-w-7xl mx-auto relative z-10"
      >
        {/* Header & Controls */}
        <motion.div
          variants={cardV}
          className="glass-panel flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 md:p-6 relative overflow-hidden"
        >
          {/* Specular light sheen */}
          <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/50 dark:via-white/10 to-transparent pointer-events-none" />

          <div className="relative z-10 flex-1">
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{ rotate: [0, -10, 10, 0], scale: 1.05 }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5e5ce6] to-[#bf5af2] flex items-center justify-center shadow-md shrink-0"
              >
                <Brain size={20} className="text-white" />
              </motion.div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {t('Intelligence Node')}
                </h2>
                <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold mt-0.5">
                  {t('Cross-referencing financial matrix')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto relative z-10 mt-2 md:mt-0">
            {/* Time Filter Segmented Control */}
            <div className="flex p-1 bg-black/[0.03] dark:bg-white/[0.04] backdrop-blur-xl border border-black/[0.05] dark:border-white/[0.08] rounded-2xl relative">
              {TABS.map((f) => (
                <motion.button
                  key={f.id}
                  onClick={() => setTimeFilter(f.id)}
                  whileTap={{ scale: 0.96 }}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-[10px] text-xs font-bold transition-all duration-300 relative z-10 ${timeFilter === f.id
                      ? 'text-slate-900 dark:text-white font-extrabold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  aria-label={`Filter by ${f.label}`}
                >
                  {timeFilter === f.id && (
                    <motion.div
                      layoutId="segmented-tab"
                      className="absolute inset-0 rounded-[10px] bg-white dark:bg-white/[0.10] shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-black/[0.02] dark:border-white/[0.05]"
                      transition={{ type: 'spring', stiffness: 420, damping: 33 }}
                    />
                  )}
                  <f.icon size={13} className="relative z-10" />
                  <span className="relative z-10">{f.label}</span>
                </motion.button>
              ))}
            </div>

            {/* Actions Portaled to Top Header */}
            <HeaderActions>
              <button
                onClick={exportData}
                disabled={isExporting}
                className="glass-btn relative w-10 h-10 sm:w-auto sm:px-3 sm:h-10 rounded-[12px] flex items-center justify-center gap-1.5 text-slate-600 dark:text-slate-300 transition-all disabled:opacity-40 focus:outline-none"
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
          <KpiCard label={t('Gross Inflow')} value={totalIncome} color="text-[#30d158]" bg="bg-[#30d158]/10" accentHex="#30d158" icon={ArrowUpRight} />
          <KpiCard label={t('Capital Burn')} value={totalExpense} color="text-[#ff3b30]" bg="bg-[#ff3b30]/10" accentHex="#ff3b30" icon={ArrowDownRight} />
          <KpiCard
            label={t('Net Retained')}
            value={netBalance}
            color={netBalance >= 0 ? 'text-[#0071e3] dark:text-[#32ade6]' : 'text-[#ff3b30]'}
            bg="bg-[#0071e3]/10"
            accentHex={netBalance >= 0 ? '#32ade6' : '#ff3b30'}
            icon={Wallet}
          />
          <KpiCard
            label={t('Save Velocity')}
            value={savingsRate.toFixed(1) + '%'}
            color="text-[#5e5ce6]"
            bg="bg-[#5e5ce6]/10"
            isStr
            accentHex="#5e5ce6"
            icon={Percent}
          />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Main Flow Chart */}
          <motion.div
            variants={cardV}
            whileHover={{ y: -4, scale: 1.012, borderColor: 'rgba(255, 255, 255, 0.25)' }}
            transition={{ type: 'spring', stiffness: 350, damping: 24 }}
            className="glass-panel p-4 md:p-6 lg:col-span-2 h-[350px] md:h-[450px] flex flex-col relative overflow-hidden border border-white/40 dark:border-white/[0.06] backdrop-blur-2xl bg-white/70 dark:bg-black/35 shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-300"
          >
            {/* Specular line */}
            <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/70 dark:via-white/20 to-transparent pointer-events-none" />

            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm md:text-base font-extrabold flex items-center gap-2">
                <TrendingUp size={18} className="text-[#5e5ce6]" />
                {t('Liquidity Velocity')}
              </h3>
              <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#30d158] shadow-[0_0_8px_rgba(48,209,88,0.6)]" /> In
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#ff3b30] shadow-[0_0_8px_rgba(255,59,48,0.6)]" /> Out
                </span>
              </div>
            </div>

            <div className="flex-1 min-h-0">
              {trendData.length > 0 ? (
                <SafeChartContainer width="100%" height="100%" minHeight={180} data={trendData}>
                  <AreaChart data={trendData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#30d158" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#30d158" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ff3b30" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#ff3b30" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="rgba(148, 163, 184, 0.08)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="#8e8e93"
                      tick={{ fontSize: 9, fill: '#8e8e93' }}
                      axisLine={false}
                      tickLine={false}
                      tickMargin={10}
                    />
                    <YAxis
                      stroke="#8e8e93"
                      tick={{ fontSize: 9, fill: '#8e8e93' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => `₹${val}`}
                    />
                    <RechartsTooltip content={<AppleTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="income"
                      name="Inflow"
                      stroke="#30d158"
                      strokeWidth={3.5}
                      fill="url(#colorInc)"
                      activeDot={{ r: 6, fill: '#30d158', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="expense"
                      name="Burn"
                      stroke="#ff3b30"
                      strokeWidth={3.5}
                      fill="url(#colorExp)"
                      activeDot={{ r: 6, fill: '#ff3b30', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </SafeChartContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm font-medium">
                  {t('No liquidity data for selected period.')}
                </div>
              )}
            </div>
          </motion.div>

          {/* Intelligence Side Column */}
          <div className="space-y-4 md:space-y-6 flex flex-col">
            {/* Donut Chart */}
            <motion.div
              variants={cardV}
              whileHover={{ y: -4, scale: 1.012, borderColor: 'rgba(255, 255, 255, 0.25)' }}
              transition={{ type: 'spring', stiffness: 350, damping: 24 }}
              className="glass-panel p-4 md:p-6 flex-1 min-h-[280px] flex flex-col relative border border-white/40 dark:border-white/[0.06] backdrop-blur-2xl bg-white/70 dark:bg-black/35 shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-300"
            >
              {/* Specular line */}
              <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/70 dark:via-white/20 to-transparent pointer-events-none" />

              <h3 className="text-sm md:text-base font-extrabold mb-2 flex items-center gap-2">
                <Target size={18} className="text-[#32ade6]" />
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
                          innerRadius={65}
                          outerRadius={88}
                          paddingAngle={4}
                          dataKey="value"
                          stroke="rgba(0,0,0,0.05)"
                          strokeWidth={1}
                          cornerRadius={5}
                          onMouseEnter={(_, index) => setHoveredPieIndex(index)}
                          onMouseLeave={() => setHoveredPieIndex(null)}
                        >
                          {categoryData.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                              style={{
                                transform: hoveredPieIndex === index ? 'scale(1.04)' : 'scale(1)',
                                transformOrigin: 'center',
                                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                opacity: hoveredPieIndex === null || hoveredPieIndex === index ? 1 : 0.7,
                                filter: hoveredPieIndex === index ? 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' : 'none',
                                cursor: 'pointer',
                              }}
                            />
                          ))}
                        </Pie>
                        <RechartsTooltip content={<AppleTooltip />} />
                      </PieChart>
                    </SafeChartContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                        {t('Total Out')}
                      </span>
                      <span className="text-xl font-black font-sans mt-0.5 text-slate-900 dark:text-white">
                        ₹{totalExpense.toLocaleString()}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm font-medium">
                    {t('Initialize allocations to view.')}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Leaderboard */}
            <motion.div
              variants={cardV}
              whileHover={{ y: -4, scale: 1.012, borderColor: 'rgba(255, 255, 255, 0.25)' }}
              transition={{ type: 'spring', stiffness: 350, damping: 24 }}
              className="glass-panel p-4 md:p-6 bg-gradient-to-br from-white/[0.02] to-transparent shrink-0 relative border border-white/40 dark:border-white/[0.06] backdrop-blur-2xl bg-white/70 dark:bg-black/35 shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-300"
            >
              {/* Specular line */}
              <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/70 dark:via-white/20 to-transparent pointer-events-none" />

              <h3 className="text-sm md:text-base font-extrabold mb-4 flex items-center gap-2">
                <Zap size={18} className="text-[#ff9f0a]" />
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
                          <div className="flex justify-between items-center text-[11px] md:text-xs font-bold mb-1.5">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0 shadow-sm"
                                style={{
                                  backgroundColor: i === 0 ? '#ff3b30' : i === 1 ? '#ff9f0a' : '#5e5ce6',
                                }}
                              >
                                {m.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-slate-700 dark:text-slate-300 font-extrabold">{m.name}</span>
                            </div>
                            <span className="font-sans text-slate-500 dark:text-slate-400">
                              ₹{m.expense.toLocaleString()}{' '}
                              <span className="text-[#ff3b30] ml-1 font-bold">({percent.toFixed(0)}%)</span>
                            </span>
                          </div>
                          <div className="h-2 w-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.03] dark:border-white/[0.04] rounded-full overflow-hidden relative shadow-inner">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percent}%` }}
                              transition={{ duration: 1.1, ease: 'easeOut', delay: i * 0.1 }}
                              className={`h-full rounded-full transition-all duration-300 ${i === 0
                                  ? 'bg-gradient-to-r from-[#ff3b30] to-[#ff453a] shadow-[0_0_10px_rgba(255,59,48,0.4)]'
                                  : i === 1
                                    ? 'bg-gradient-to-r from-[#ff9f0a] to-[#ffb340] shadow-[0_0_10px_rgba(255,159,10,0.3)]'
                                    : 'bg-gradient-to-r from-[#5e5ce6] to-[#7d7aff] shadow-[0_0_10px_rgba(94,92,230,0.3)]'
                                }`}
                            />
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t('No entities active.')}</span>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {/* AI Synapse Feed */}
        <motion.div
          variants={cardV}
          whileHover={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}
          transition={{ type: 'spring', stiffness: 350, damping: 24 }}
          className="glass-panel relative overflow-hidden border border-white/40 dark:border-white/[0.06] backdrop-blur-2xl bg-white/70 dark:bg-black/35 shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-300"
        >
          {/* Specular line */}
          <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/70 dark:via-white/20 to-transparent pointer-events-none" />

          <div className="absolute top-0 right-0 h-full w-[400px] bg-gradient-to-l from-[#5e5ce6]/10 via-[#bf5af2]/5 to-transparent pointer-events-none" />

          <div className="p-4 md:p-6 border-b border-black/[0.05] dark:border-white/[0.05] flex justify-between items-center gap-3 bg-white/[0.01]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary-500/10 dark:bg-primary-500/20">
                <Brain size={18} className="text-[#5e5ce6] animate-pulse-slow" />
              </div>
              <div>
                <h3 className="text-sm md:text-base font-extrabold text-slate-900 dark:text-white">{t('Synaptic Insights')}</h3>
                <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider mt-0.5">
                  {t('AI Generated Strategies')}
                </p>
              </div>
            </div>

            <motion.button
              onClick={triggerAiAnalysis}
              disabled={isAiAnalyzing}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              className="glass-btn px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-40 transition-all focus:outline-none"
            >
              {isAiAnalyzing ? (
                <>
                  <Loader2 size={13} className="animate-spin text-[#5e5ce6]" />
                  <span>{t('ANALYZING...')}</span>
                </>
              ) : (
                <>

                  <span>{t('ANALYZE FINANCE')}</span>
                </>
              )}
            </motion.button>
          </div>

          <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence>
              {displayedInsights.map((insight, i) => (
                <motion.div
                  key={insight.title}
                  initial={{ opacity: 0, scale: 0.94, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  transition={{
                    opacity: { type: 'spring', stiffness: 280, damping: 24, delay: i * 0.08 },
                    scale: { type: 'spring', stiffness: 280, damping: 24, delay: i * 0.08 },
                    filter: { type: 'tween', ease: 'easeOut', duration: 0.25 }
                  }}
                  whileHover={{ y: -4, scale: 1.018, transition: { type: 'spring', stiffness: 400, damping: 22 } }}
                  whileTap={{ scale: 0.985 }}
                  className={`p-4 md:p-5 rounded-[1.25rem] border backdrop-blur-md relative overflow-hidden group shadow-sm transition-all duration-300 ${insight.bg} ${insight.border}`}
                  style={{ boxShadow: `0 4px 16px rgba(0,0,0,0.02)` }}
                >
                  {/* Siri pulsing active dot indicator */}
                  <div className="absolute top-4 right-4 flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${insight.color.replace('text-', 'bg-')}`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${insight.color.replace('text-', 'bg-')}`}></span>
                  </div>

                  {/* Specular highlight */}
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent pointer-events-none" />
                  <div
                    className={`absolute top-0 right-0 w-24 h-24 blur-[40px] opacity-15 transition-opacity group-hover:opacity-30 ${insight.color.replace(
                      'text-',
                      'bg-'
                    )}`}
                  />
                  <div className="flex items-start gap-4 w-full relative z-10">
                    <div
                      className={`mt-0.5 shrink-0 p-2.5 rounded-xl bg-white dark:bg-[#1c1c1e] ${insight.color} border border-black/[0.05] dark:border-white/[0.05] shadow-sm`}
                    >
                      <insight.icon size={18} />
                    </div>
                    <div className="flex-1">
                      <h4 className={`text-[10px] uppercase tracking-widest font-extrabold mb-1.5 ${insight.color}`}>
                        {insight.title}
                      </h4>
                      <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
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
    </>
  );
}