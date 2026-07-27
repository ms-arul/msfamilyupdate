import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSelectionPage } from '../components/LanguageSelectionPage';
import { saveSinglePreference } from '../utils/preferencesService';
import { LANGUAGE_LIST } from '../utils/translationDictionaries';

const SPRING_SOFT = { type: 'spring', stiffness: 380, damping: 30 } as const;

// ─── Toast Component ───
interface ToastProps {
  message: string;
  visible: boolean;
  icon: React.ComponentType<any> | null;
  syncStatus?: 'saving' | 'saved' | 'error';
  t: (key: string) => string;
}

const Toast: React.FC<ToastProps> = ({ message, visible, icon: ToastIcon, syncStatus, t }) => (
  <AnimatePresence>
    {visible && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
        <motion.div
          key="toast"
          initial={{ opacity: 0, scale: 0.82, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.82, y: 10 }}
          transition={SPRING_SOFT}
        >
          <div
            className="bg-white/85 dark:bg-[#1c1c1e]/90 backdrop-blur-3xl border border-white/60 dark:border-white/[0.1] rounded-[28px] shadow-[0_24px_60px_rgba(0,0,0,0.2)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.6)] flex flex-col items-center gap-3 px-8 py-5 min-w-[200px] max-w-[75vw]"
            style={{ textAlign: 'center' }}
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.08 }}
              className="flex items-center justify-center"
            >
              {syncStatus === 'saving' ? (
                <Loader2 size={32} className="animate-spin text-primary-500" />
              ) : ToastIcon ? (
                <ToastIcon size={32} className="text-[#34C759]" />
              ) : (
                <CheckCircle2 size={32} className="text-[#34C759]" />
              )}
            </motion.div>
            <p className="text-[14.5px] font-bold text-slate-800 dark:text-slate-100 leading-snug">
              {message}
            </p>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const LanguageSettings: React.FC = () => {
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const [toast, setToast] = useState<{
    message: string;
    visible: boolean;
    icon: React.ComponentType<any> | null;
    syncStatus?: 'saving' | 'saved' | 'error';
  }>({
    message: '', visible: false, icon: null,
  });

  const toastTimeoutRef = useRef<any>(null);

  const showToast = useCallback((
    msg: string, 
    icon: React.ComponentType<any> | null = null, 
    syncStatus?: 'saving' | 'saved' | 'error'
  ) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message: msg, visible: true, icon, syncStatus });
    if (syncStatus !== 'saving') {
      toastTimeoutRef.current = setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false }));
      }, 2500);
    }
  }, []);

  const syncToBackend = useCallback(async (key: string, value: any, actionLabel: string) => {
    if (!user?.id) return;
    showToast(actionLabel, null, 'saving');
    try {
      const success = await saveSinglePreference(user.id, key as any, value);
      const nextStatus = success ? 'saved' : 'error';
      setToast(prev => {
        if (!prev.visible) return prev;
        return { ...prev, syncStatus: nextStatus };
      });
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false }));
      }, 2000);
    } catch {
      setToast(prev => {
        if (!prev.visible) return prev;
        return { ...prev, syncStatus: 'error' };
      });
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false }));
      }, 2000);
    }
  }, [user?.id, showToast]);

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    const selectedLang = LANGUAGE_LIST.find(l => l.code === newLang);
    const label = selectedLang 
      ? t('Language set to {name}', { name: selectedLang.name })
      : t('Language set to {name}', { name: newLang });
    syncToBackend('language', newLang, label);
  };

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as any });
  }, []);

  return (
    <div className="relative min-h-full text-slate-900 dark:text-slate-100 overflow-y-auto custom-scrollbar px-4 pt-4 pb-28 animate-[fadeIn_0.2s_ease-out]">
      <div className="max-w-[390px] mx-auto">
        <LanguageSelectionPage
          onBack={() => navigate('/settings')}
          language={language}
          onLanguageSelect={handleLanguageChange}
          t={t}
        />
      </div>
      <Toast message={toast.message} visible={toast.visible} icon={toast.icon} syncStatus={toast.syncStatus} t={t} />
    </div>
  );
};

export default LanguageSettings;
