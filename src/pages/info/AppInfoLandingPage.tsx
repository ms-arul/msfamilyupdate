import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ChevronRight,
  Info,
  FileText,
  BookOpen,
  Lock,
  CreditCard,
  Database,
  HelpCircle,
  Tag,
  History
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const SPRING_SOFT = { type: 'spring', stiffness: 380, damping: 30 } as const;
const SPRING_GENTLE = { type: 'spring', stiffness: 260, damping: 26 } as const;

const glass = {
  card: 'bg-white/[0.72] dark:bg-white/[0.045] backdrop-blur-2xl border border-white/80 dark:border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_32px_rgba(0,0,0,0.45)]',
  separator: 'border-b border-black/[0.06] dark:border-white/[0.06]',
};

// ─── Setting Card ───
const SettingCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className={`rounded-[28px] overflow-hidden ${glass.card}`}>
    <div className="flex flex-col">{children}</div>
  </div>
);

// ─── Setting Row ───
interface SettingRowProps {
  icon?: React.ComponentType<any>;
  iconBg?: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  last?: boolean;
  onPress?: () => void;
}

const SettingRow: React.FC<SettingRowProps> = ({
  icon: Icon, iconBg, iconColor, title, subtitle, children, last = false, onPress
}) => (
  <motion.div
    whileHover={onPress ? { backgroundColor: 'rgba(0,0,0,0.025)' } : {}}
    onClick={onPress}
    className={`flex items-center gap-3.5 px-4 py-[13px] ${!last ? glass.separator : ''} ${onPress ? 'cursor-pointer' : ''}`}
  >
    {Icon && (
      <div
        className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center shrink-0"
        style={{ background: iconBg || 'rgba(142,142,147,0.18)' }}
      >
        <Icon size={16} color={iconColor || '#8e8e93'} />
      </div>
    )}
    <div className="flex-1 min-w-0">
      <p className="text-[15px] font-[450] leading-snug text-slate-900 dark:text-white">
        {title}
      </p>
      {subtitle && (
        <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{subtitle}</p>
      )}
    </div>
    <div className="ml-auto shrink-0 flex items-center gap-2">
      {children}
    </div>
  </motion.div>
);

export default function AppInfoLandingPage() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
  };

  const item = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    show: { opacity: 1, y: 0, scale: 1, transition: SPRING_GENTLE },
  };

  return (
    <div className="relative min-h-full text-slate-900 dark:text-slate-100 overflow-y-auto custom-scrollbar px-4 pt-4 pb-28 animate-[fadeIn_0.2s_ease-out]">
      <div className="max-w-[390px] mx-auto">
        
        {/* ── AppBar (Header Row) ── */}
        <div className="flex items-center justify-between mb-6">
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => navigate('/settings')}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/60 dark:bg-white/[0.05] border border-slate-200/50 dark:border-white/[0.08] shadow-sm backdrop-blur-md text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.1] transition-all"
            aria-label="Back"
          >
            <ArrowLeft size={20} className={language === 'ar' ? 'rotate-180' : ''} />
          </motion.button>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white mr-auto ml-4">
            {t('App Information')}
          </h1>
        </div>

        {/* ── List of Options ── */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          <motion.div variants={item}>
            <SettingCard>
              <SettingRow
                icon={Info}
                iconBg="rgba(9,185,252,0.12)"
                iconColor="#09b9fc"
                title={t('About MS Family')}
                subtitle={t('Learn more about the platform')}
                onPress={() => navigate('/settings/about')}
              >
                <ChevronRight size={15} className="text-slate-400 dark:text-slate-600" />
              </SettingRow>

              <SettingRow
                icon={FileText}
                iconBg="rgba(79,70,229,0.12)"
                iconColor="#4F46E5"
                title={t('Legal Information')}
                subtitle={t('Intellectual property & availability')}
                onPress={() => navigate('/settings/legal')}
              >
                <ChevronRight size={15} className="text-slate-400 dark:text-slate-600" />
              </SettingRow>

              <SettingRow
                icon={BookOpen}
                iconBg="rgba(255,149,0,0.12)"
                iconColor="#FF9500"
                title={t('Terms of Service')}
                subtitle={t('Usage rules & eligibility')}
                onPress={() => navigate('/settings/terms')}
              >
                <ChevronRight size={15} className="text-slate-400 dark:text-slate-600" />
              </SettingRow>

              <SettingRow
                icon={Lock}
                iconBg="rgba(52,199,89,0.12)"
                iconColor="#34C759"
                title={t('Privacy Policy')}
                subtitle={t('How we protect your data')}
                onPress={() => navigate('/settings/privacy')}
              >
                <ChevronRight size={15} className="text-slate-400 dark:text-slate-600" />
              </SettingRow>

              <SettingRow
                icon={CreditCard}
                iconBg="rgba(255,45,85,0.12)"
                iconColor="#FF2D55"
                title={t('Subscription & Refund Policy')}
                subtitle={t('Plans, renewals & cancellations')}
                onPress={() => navigate('/settings/subscription-refund')}
              >
                <ChevronRight size={15} className="text-slate-400 dark:text-slate-600" />
              </SettingRow>

              <SettingRow
                icon={Database}
                iconBg="rgba(175,82,222,0.12)"
                iconColor="#AF52DE"
                title={t('Data Retention Policy')}
                subtitle={t('How long we keep your data')}
                onPress={() => navigate('/settings/data-retention')}
              >
                <ChevronRight size={15} className="text-slate-400 dark:text-slate-600" />
              </SettingRow>


              <SettingRow
                icon={HelpCircle}
                iconBg="rgba(0,122,255,0.12)"
                iconColor="#007AFF"
                title={t('Contact & Support')}
                subtitle={t('Get assistance & submit feedback')}
                onPress={() => navigate('/settings/contact-support')}
              >
                <ChevronRight size={15} className="text-slate-400 dark:text-slate-600" />
              </SettingRow>

              <SettingRow
                icon={Tag}
                iconBg="rgba(88,86,214,0.12)"
                iconColor="#5856D6"
                title={t('App Version')}
                subtitle="v1.0.0 (100)"
                onPress={() => navigate('/settings/version')}
              >
                <ChevronRight size={15} className="text-slate-400 dark:text-slate-600" />
              </SettingRow>

              <SettingRow
                icon={History}
                iconBg="rgba(255,59,48,0.12)"
                iconColor="#FF3B30"
                title={t('Changelog')}
                subtitle={t('Latest updates & fixes')}
                last
                onPress={() => navigate('/settings/changelog')}
              >
                <ChevronRight size={15} className="text-slate-400 dark:text-slate-600" />
              </SettingRow>
            </SettingCard>
          </motion.div>
        </motion.div>

      </div>
    </div>
  );
}
