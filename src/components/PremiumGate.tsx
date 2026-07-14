import React from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';
import { useLanguage } from '../context/LanguageContext';

interface PremiumGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  feature?: string;
  hideEntirely?: boolean;
}

export default function PremiumGate({ children, fallback, feature = 'Premium Feature', hideEntirely = false }: PremiumGateProps) {
  const { t } = useLanguage();
  const { isPremium, setShowUpgradeModal } = useSubscription();

  if (isPremium) {
    return <>{children}</>;
  }

  if (hideEntirely) {
    return null;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  // Apple-style Glass lock overlay
  return (
    <div className="relative group overflow-hidden rounded-3xl border border-slate-200/50 dark:border-white/[0.04]">
      {/* Blurred background content */}
      <div className="blur-[4px] pointer-events-none select-none opacity-45 transition-all">
        {children}
      </div>

      {/* Lock Overlay */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-100/10 dark:bg-slate-900/10 backdrop-blur-[6px] p-4 text-center">
        <div className="w-10 h-10 rounded-xl bg-white/70 dark:bg-slate-900/80 shadow-md border border-slate-200/50 dark:border-slate-800 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform duration-300">
          <Lock size={16} className="text-primary-500" />
        </div>
        <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1">
          <Sparkles size={12} className="text-amber-500" />
          {t(feature)}
        </h4>
        <p className="text-[10px] text-slate-500 mt-1 max-w-[180px] leading-relaxed">
          {t('Upgrade to premium to unlock this feature.')}
        </p>
        <button
          type="button"
          onClick={() => setShowUpgradeModal(true)}
          className="mt-3 px-3 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-bold text-[10px] shadow-sm transition-all"
        >
          {t('Upgrade Now')}
        </button>
      </div>
    </div>
  );
}
