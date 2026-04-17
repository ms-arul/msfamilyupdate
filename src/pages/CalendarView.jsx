import React, { useState, useMemo, useCallback } from 'react';
import { useFinance } from '../context/FinanceContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  format,
  startOfWeek,
  addDays,
  startOfMonth,
  endOfMonth,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays, Inbox, TrendingUp, TrendingDown } from 'lucide-react';



// ============================================================================
// Subcomponents (memoized)
// ============================================================================
const CalendarDay = React.memo(
  ({
    dayItem,
    isCurrentMonth,
    isSelected,
    today,
    dayIncome,
    dayExpense,
    dayTxCount,
    onClick,
  }) => {
    return (
      <motion.div
        variants={item}
        onClick={onClick}
        className={`min-h-[72px] sm:min-h-[80px] p-2 rounded-xl cursor-pointer transition-all duration-300 border relative ${!isCurrentMonth
            ? 'opacity-30 border-transparent'
            : isSelected
              ? 'bg-primary-500/15 border-primary-500/40 shadow-glow-primary'
              : today
                ? 'bg-slate-100 border-borderHover'
                : 'bg-white border-border hover:bg-slate-100 hover:border-borderHover'
          }`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        role="button"
        tabIndex={0}
        aria-label={`Date ${format(dayItem, 'MMMM d, yyyy')}${dayTxCount > 0 ? `, ${dayTxCount} transactions` : ''
          }`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onClick();
        }}
      >
        <div className="flex justify-between items-center">
          <span
            className={`text-xs font-bold ${today
                ? 'text-primary-400'
                : isSelected
                  ? 'text-slate-900'
                  : 'text-slate-500'
              }`}
          >
            {format(dayItem, 'd')}
          </span>
          {today && (
            <div className="w-1.5 h-1.5 rounded-full bg-primary-400 shadow-glow-primary" />
          )}
        </div>
        {dayIncome > 0 && (
          <div className="text-[10px] font-bold text-success-400 mt-1 truncate">
            +₹{dayIncome.toLocaleString()}
          </div>
        )}
        {dayExpense > 0 && (
          <div className="text-[10px] font-bold text-accent-400 truncate">
            -₹{dayExpense.toLocaleString()}
          </div>
        )}
        {dayTxCount > 0 && (
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-0.5">
            {Array.from({ length: Math.min(dayTxCount, 3) }).map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-primary-400/60" />
            ))}
          </div>
        )}
      </motion.div>
    );
  }
);

CalendarDay.displayName = 'CalendarDay';

// ============================================================================
// Animation variants
// ============================================================================
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.03, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

// ============================================================================
// Main Component
// ============================================================================
export default function CalendarView() {
  const { transactions = [] } = useFinance();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Memoized calendar data
  const calendarData = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const daysArray = [];
    let day = startDate;
    while (day <= endDate) {
      daysArray.push(day);
      day = addDays(day, 1);
    }

    // Pre-aggregate transactions per day for performance
    const txMap = new Map();
  transactions.forEach((tx) => {
    const dateStr = tx.date;
    const existing = txMap.get(dateStr);
    if (existing) {
      if (tx.type === 'income') existing.income += Number(tx.amount);
      else existing.expense += Number(tx.amount);
      existing.count += 1;
    } else {
      txMap.set(dateStr, {
        income: tx.type === 'income' ? Number(tx.amount) : 0,
        expense: tx.type === 'expense' ? Number(tx.amount) : 0,
        count: 1,
      });
    }
  });

  return { days: daysArray, monthStart, txMap };
}, [currentDate, transactions]);

const { days, monthStart, txMap } = calendarData;

// Transactions for selected date (memoized)
const selectedTx = useMemo(() => {
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  return transactions.filter((t) => t.date === dateStr);
}, [transactions, selectedDate]);

const selectedIncome = useMemo(
  () => selectedTx.filter((t) => t.type === 'income').reduce((a, c) => a + Number(c.amount), 0),
  [selectedTx]
);
const selectedExpense = useMemo(
  () => selectedTx.filter((t) => t.type === 'expense').reduce((a, c) => a + Number(c.amount), 0),
  [selectedTx]
);

// Navigation handlers (memoized)
const nextMonth = useCallback(() => setCurrentDate((prev) => addMonths(prev, 1)), []);
const prevMonth = useCallback(() => setCurrentDate((prev) => subMonths(prev, 1)), []);
const goToday = useCallback(() => {
  const today = new Date();
  setCurrentDate(today);
  setSelectedDate(today);
}, []);

return (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
    {/* Calendar Grid Section */}
    <div className="lg:col-span-2">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-5 sm:p-6"
      >
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
          <h2 className="text-xl font-extrabold text-gradient">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={goToday}
              className="btn-glass text-xs !px-3"
              aria-label="Go to today"
            >
              Today
            </button>
            <button
              onClick={prevMonth}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 transition-colors border border-border"
              aria-label="Previous month"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 transition-colors border border-border"
              aria-label="Next month"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Week Headers */}
        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div
              key={d}
              className="text-center text-[11px] font-bold text-slate-600 uppercase tracking-widest py-2"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-7 gap-1.5"
        >
          {days.map((dayItem, idx) => {
            const dateStr = format(dayItem, 'yyyy-MM-dd');
            const dayStats = txMap.get(dateStr) || { income: 0, expense: 0, count: 0 };
            const isSelected = isSameDay(dayItem, selectedDate);
            const isCurrentMonth = isSameMonth(dayItem, monthStart);
            const today = isToday(dayItem);

            return (
              <CalendarDay
                key={idx}
                dayItem={dayItem}
                isCurrentMonth={isCurrentMonth}
                isSelected={isSelected}
                today={today}
                dayIncome={dayStats.income}
                dayExpense={dayStats.expense}
                dayTxCount={dayStats.count}
                onClick={() => setSelectedDate(dayItem)}
              />
            );
          })}
        </motion.div>
      </motion.div>
    </div>

    {/* Detail Sidebar */}
    <AnimatePresence mode="wait">
      <motion.div
        key={selectedDate.toString()}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="glass-panel p-5 sm:p-6 flex flex-col"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-primary-500/15">
            <CalendarDays size={20} className="text-primary-400" />
          </div>
          <div>
            <p className="text-xs text-slate-600 font-semibold uppercase tracking-wider">
              Selected Date
            </p>
            <p className="text-lg font-extrabold text-gradient">
              {format(selectedDate, 'MMM do, yyyy')}
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        {selectedTx.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="p-3 rounded-xl bg-success-500/10 border border-success-500/20 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp size={12} className="text-success-400" />
                <p className="text-[10px] text-slate-600 uppercase font-bold">Income</p>
              </div>
              <p className="text-lg font-bold font-sans text-success-400">
                ₹{selectedIncome.toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-accent-500/10 border border-accent-500/20 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingDown size={12} className="text-accent-400" />
                <p className="text-[10px] text-slate-600 uppercase font-bold">Expense</p>
              </div>
              <p className="text-lg font-bold font-sans text-accent-400">
                ₹{selectedExpense.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Transactions List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
          {selectedTx.length === 0 ? (
            <div className="text-center py-10 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-slate-900/5 flex items-center justify-center mb-4 text-gray-600 border border-slate-900/5">
                <Inbox size={28} />
              </div>
              <p className="text-slate-600 text-sm font-medium">No records on this date</p>
              <p className="text-xs text-slate-500 mt-1">Add a transaction to see it here</p>
            </div>
          ) : (
            selectedTx.map((tx) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-xl bg-white hover:bg-slate-100 transition-all border border-border group"
              >
                <div className="flex justify-between items-start mb-1.5">
                  <span
                    className={`stat-badge text-[10px] ${tx.type === 'income'
                        ? 'bg-success-500/15 text-success-400'
                        : 'bg-accent-500/15 text-accent-400'
                      }`}
                  >
                    {tx.category}
                  </span>
                  <span
                    className={`font-bold font-sans text-sm ${tx.type === 'income' ? 'text-success-400' : 'text-accent-400'
                      }`}
                  >
                    {tx.type === 'income' ? '+' : '-'}₹{Number(tx.amount).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm font-semibold">{tx.memberName}</p>
                {tx.notes && (
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">{tx.notes}</p>
                )}
              </motion.div>
            ))
          )}
        </div>

        {/* Optional footer with total count */}
        {selectedTx.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border text-center">
            <p className="text-[11px] text-slate-500">
              {selectedTx.length} transaction{selectedTx.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  </div>
);
}