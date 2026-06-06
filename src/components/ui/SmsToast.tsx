import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Bell, ArrowRight, X, CreditCard, PiggyBank } from 'lucide-react';

interface SmsToastProps {
  toast: {
    amount: number;
    bankName: string;
    merchantName?: string;
    transactionType: 'credit' | 'debit';
  } | null;
  onClose: () => void;
}

export const SmsToast: React.FC<SmsToastProps> = ({ toast, onClose }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isIncome = toast.transactionType === 'credit';
  const displayAmount = Number(toast.amount).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    style: 'currency',
    currency: 'INR'
  });

  const handleClick = () => {
    navigate('/transactions');
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -30, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className="fixed top-6 left-4 right-4 z-[9999] mx-auto max-w-md pointer-events-auto"
      >
        <div 
          onClick={handleClick}
          className="relative overflow-hidden cursor-pointer rounded-2xl border border-white/[0.08] dark:border-white/[0.06] bg-white/70 dark:bg-black/75 p-4 shadow-[0_20px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:border-primary-500/30 group"
        >
          {/* Accent lighting glow */}
          <div className={`absolute -right-16 -top-16 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-500 group-hover:scale-125 ${
            isIncome ? 'bg-cyan-500' : 'bg-rose-500'
          }`} />

          <div className="flex items-start gap-3.5">
            {/* Action Icon with gradient */}
            <div className={`flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-xl shadow-inner ${
              isIncome 
                ? 'bg-cyan-500/10 text-cyan-500 dark:text-cyan-400' 
                : 'bg-rose-500/10 text-rose-500 dark:text-rose-400'
            }`}>
              {isIncome ? <PiggyBank className="w-5.5 h-5.5 animate-bounce" /> : <CreditCard className="w-5.5 h-5.5 animate-pulse" />}
            </div>

            {/* Content Details */}
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">
                  SMART SMS RECORDER
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                <span className="text-[10px] font-medium text-primary-500 dark:text-primary-400">
                  Auto-synced
                </span>
              </div>
              
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <span className="truncate">{toast.bankName}</span>
                {toast.merchantName && (
                  <>
                    <span className="text-slate-400 dark:text-slate-600 font-normal">→</span>
                    <span className="truncate text-slate-600 dark:text-slate-300 font-medium">{toast.merchantName}</span>
                  </>
                )}
              </h4>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Transaction auto-recorded via SMS notification
              </p>
            </div>

            {/* Price & Action */}
            <div className="flex flex-col items-end justify-between self-stretch flex-shrink-0 min-w-[70px]">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="p-1 -mr-1 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1 mt-auto">
                <span className={`text-base font-extrabold tracking-tight ${
                  isIncome ? 'text-cyan-500' : 'text-rose-500'
                }`}>
                  {isIncome ? '+' : '-'}{displayAmount}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-300" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
