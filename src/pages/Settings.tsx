import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Moon, Sun, Monitor, Globe, User, Shield, Bell,
  Database, LogOut, Smartphone, Trash2, Download, RefreshCw,
  Volume2, VolumeX, Clock, Info, X, Pencil, Save, CheckCircle2,
  Cloud, CloudOff, Loader2, Fingerprint, Lock, ExternalLink,
  MessageSquare, Zap, Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage, LANGUAGES } from '../context/LanguageContext';
import { THEME_MODES, getStoredTheme, applyTheme } from '../utils/themeService';
import { saveSinglePreference, savePreferences, UserPreferences } from '../utils/preferencesService';
import { downloadBase64File } from '../utils/downloadHelper';
import { isSmsReaderEnabled, setSmsReaderEnabled } from '../utils/smsService';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  checkSecurityCapabilities,
  toggleAppLock,
  toggleBiometricUnlock,
  isAppLockEnabled,
  isBiometricEnabled,
  openSecuritySettings,
  SecurityCapabilities
} from '../utils/appLockService';

// ─── Reusable Sub-Components ───────────────────────────────

interface SectionHeaderProps {
  title: string;
  icon: React.ComponentType<any>;
  color?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, icon: Icon, color = 'text-primary-500' }) => (
  <div className="flex items-center gap-3 mb-4 mt-2">
    <div className={`w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-500/15 ${color} flex items-center justify-center`}>
      <Icon size={18} />
    </div>
    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h3>
  </div>
);

interface SettingCardProps {
  children: React.ReactNode;
  className?: string;
}

const SettingCard: React.FC<SettingCardProps> = ({ children, className = '' }) => (
  <div className={`bg-white/80 dark:bg-[#12121f]/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/30 rounded-2xl shadow-sm dark:shadow-black/20 overflow-hidden ${className}`}>
    {children}
  </div>
);

interface ToggleSwitchProps {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ enabled, onToggle, disabled = false }) => (
  <button
    onClick={onToggle}
    disabled={disabled}
    className={`w-12 h-7 rounded-full flex items-center px-1 transition-all duration-300 ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${enabled ? 'bg-primary-500 justify-end' : 'bg-slate-200 dark:bg-slate-700 justify-start'}`}
  >
    <motion.div
      layout
      className="w-5 h-5 bg-white rounded-full shadow-sm"
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    />
  </button>
);

interface SettingRowProps {
  icon?: React.ComponentType<any>;
  iconColor?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  last?: boolean;
}

const SettingRow: React.FC<SettingRowProps> = ({ icon: Icon, iconColor, title, subtitle, children, last = false }) => (
  <div className={`flex items-center justify-between p-4 ${!last ? 'border-b border-slate-100 dark:border-slate-700/20' : ''}`}>
    <div className="flex items-center gap-3.5 flex-1 min-w-0">
      {Icon && (
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconColor || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
          <Icon size={17} />
        </div>
      )}
      <div className="min-w-0">
        <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{title}</p>
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    <div className="ml-3 shrink-0 flex items-center justify-end">{children}</div>
  </div>
);

// ─── Toast Notification ────────────────────────────────────
interface ToastProps {
  message: string;
  visible: boolean;
  icon: React.ComponentType<any> | null;
}

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

// ─── Main Settings Component ───────────────────────────────

export default function Settings() {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(getStoredTheme());
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Notification Settings (persisted in localStorage + backend)
  const [notifEnabled, setNotifEnabled] = useState(() =>
    localStorage.getItem('msfamily_notif_enabled') !== 'false'
  );
  const [notifSound, setNotifSound] = useState(() =>
    localStorage.getItem('msfamily_notif_sound') !== 'false'
  );
  const [reminderFreq, setReminderFreq] = useState(() =>
    localStorage.getItem('msfamily_reminder_freq') || 'daily'
  );

  // Security state
  const [securityLoading, setSecurityLoading] = useState(true);
  const [securityCaps, setSecurityCaps] = useState<SecurityCapabilities | null>(null);
  const [appLockOn, setAppLockOn] = useState(isAppLockEnabled());
  const [biometricOn, setBiometricOn] = useState(isBiometricEnabled());
  const [securityBusy, setSecurityBusy] = useState(false);

  // SMS Reader state
  const [smsEnabled, setSmsEnabled] = useState(isSmsReaderEnabled());

  // Toast state
  const [toast, setToast] = useState<{
    message: string;
    visible: boolean;
    icon: React.ComponentType<any> | null;
  }>({ message: '', visible: false, icon: null });

  const showToast = useCallback((msg: string, icon: React.ComponentType<any> | null = null) => {
    setToast({ message: msg, visible: true, icon });
    setTimeout(() => setToast({ message: '', visible: false, icon: null }), 2500);
  }, []);

  // Check device security capabilities on mount
  useEffect(() => {
    let cancelled = false;
    checkSecurityCapabilities().then(caps => {
      if (!cancelled) {
        setSecurityCaps(caps);
        setSecurityLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Security toggle handlers
  const handleToggleAppLock = useCallback(async () => {
    if (securityBusy) return;
    setSecurityBusy(true);
    const newState = !appLockOn;
    const result = await toggleAppLock(newState);
    if (result.success) {
      setAppLockOn(newState);
      if (!newState) setBiometricOn(false);
      showToast(newState ? t('Security Enabled') : t('Security Disabled'), newState ? Shield : null);
    } else if (result.error === 'cancelled') {
      // User cancelled — do nothing
    } else if (result.error === 'no_device_lock') {
      showToast(t('Device lock not configured'));
    } else {
      showToast(t('Authentication failed'));
    }
    setSecurityBusy(false);
  }, [appLockOn, securityBusy, showToast, t]);

  const handleToggleBiometric = useCallback(async () => {
    if (securityBusy) return;
    if (!appLockOn) {
      showToast(t('Enable App Lock first'));
      return;
    }
    setSecurityBusy(true);
    const newState = !biometricOn;
    const result = await toggleBiometricUnlock(newState);
    if (result.success) {
      setBiometricOn(newState);
      showToast(newState ? t('Security Enabled') : t('Security Disabled'), newState ? Fingerprint : null);
    } else if (result.error === 'cancelled') {
      // User cancelled
    } else if (result.error === 'no_biometric_enrolled') {
      showToast(t('No biometric enrolled'));
    } else {
      showToast(t('Authentication failed'));
    }
    setSecurityBusy(false);
  }, [biometricOn, appLockOn, securityBusy, showToast, t]);

  // Edit Profile state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');

  // ── Sync to Backend Helper ──
  const syncToBackend = useCallback(async (key: string, value: any) => {
    if (!user?.id) return;
    setSyncStatus('saving');
    try {
      const success = await saveSinglePreference(user.id, key as keyof UserPreferences, value);
      setSyncStatus(success ? 'saved' : 'error');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  }, [user?.id]);

  // ── Theme ──
  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme as any);
    applyTheme(newTheme as any);
    syncToBackend('theme', newTheme);
    showToast(t('Theme updated'));
  };

  // ── Language ──
  const handleLanguageChange = (newLang: typeof LANGUAGES[keyof typeof LANGUAGES]) => {
    setLanguage(newLang);
    syncToBackend('language', newLang);
    showToast(newLang === LANGUAGES.EN ? 'Language set to English' : 'மொழி தமிழாக மாற்றப்பட்டது');
  };

  // ── Profile Name Update ──
  const handleSaveName = async () => {
    if (!user) return;
    if (!editName.trim() || editName === user.name) {
      setIsEditingName(false);
      return;
    }
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: editName.trim() })
        .eq('id', user.id);

      if (!error) {
        showToast(t('Name updated successfully'));
        // Force re-fetch by reloading session
        window.location.reload();
      } else {
        showToast(t('Failed to update name'));
      }
    } catch (e) {
      showToast(t('Failed to update name'));
    }
    setIsEditingName(false);
  };

  // ── Notification Preferences ──
  const toggleNotif = () => {
    const next = !notifEnabled;
    setNotifEnabled(next);
    localStorage.setItem('msfamily_notif_enabled', String(next));
    syncToBackend('notif_enabled', next);
    showToast(next ? t('Notifications enabled') : t('Notifications disabled'));
  };

  const toggleSound = () => {
    const next = !notifSound;
    setNotifSound(next);
    localStorage.setItem('msfamily_notif_sound', String(next));
    syncToBackend('notif_sound', next);
    showToast(next ? t('Sound on') : t('Sound off'));
  };

  const handleFreqChange = (freq: string) => {
    setReminderFreq(freq);
    localStorage.setItem('msfamily_reminder_freq', freq);
    syncToBackend('reminder_freq', freq);
    showToast(t('Reminder frequency updated'));
  };

  // ── Data Management ──
  const handleClearCache = () => {
    localStorage.removeItem('msfamily_translations_cache');
    showToast(t('Translation cache cleared'));
  };

  const handleResetSettings = () => {
    localStorage.removeItem('msfamily_theme_preference');
    localStorage.removeItem('msfamily_language');
    localStorage.removeItem('msfamily_notif_enabled');
    localStorage.removeItem('msfamily_notif_sound');
    localStorage.removeItem('msfamily_reminder_freq');
    localStorage.removeItem('msfamily_translations_cache');
    applyTheme(THEME_MODES.LIGHT);
    setTheme(THEME_MODES.LIGHT);
    setLanguage(LANGUAGES.EN);
    setNotifEnabled(true);
    setNotifSound(true);
    setReminderFreq('daily');
    // Sync reset to backend
    if (user?.id) {
      savePreferences(user.id, {
        theme: 'light',
        language: 'en',
        notif_enabled: true,
        notif_sound: true,
        reminder_freq: 'daily',
        budget_limit: 3000,
        savings_target: 10000,
      });
    }
    showToast(t('Settings reset to default'));
  };

  const handleExportData = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('member_id', user.id)
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(22);
        doc.setTextColor(40, 44, 52);
        doc.text('MS Family Finance Hub', 14, 22);

        doc.setFontSize(14);
        doc.setTextColor(100);
        doc.text('Complete Account Statement', 14, 30);

        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 40);

        // Calculate Stats
        const income = data.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
        const expense = data.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
        const net = income - expense;

        doc.setDrawColor(240);
        doc.setFillColor(252, 252, 253);
        doc.roundedRect(14, 50, 182, 25, 3, 3, 'FD');

        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text('TOTAL INCOME', 25, 58);
        doc.text('TOTAL EXPENSE', 85, 58);
        doc.text('NET BALANCE', 145, 58);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(16, 185, 129);
        doc.text(`+Rs. ${income.toLocaleString()}`, 25, 67);

        doc.setTextColor(244, 63, 94);
        doc.text(`-Rs. ${expense.toLocaleString()}`, 85, 67);

        doc.setTextColor(net >= 0 ? 16 : 244, net >= 0 ? 185 : 63, net >= 0 ? 129 : 94);
        doc.text(`${net >= 0 ? '+' : ''}Rs. ${net.toLocaleString()}`, 145, 67);

        autoTable(doc, {
          startY: 85,
          head: [['Date', 'Category', 'Member', 'Type', 'Amount']],
          body: data.map(t => [
            t.date,
            t.category,
            t.member_name || user.name,
            t.type.toUpperCase(),
            `${t.type === 'income' ? '+' : '-'}Rs. ${Number(t.amount).toLocaleString()}`
          ]),
          theme: 'grid',
          styles: { fontSize: 9, cellPadding: 4 },
          headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: {
            4: { halign: 'right', fontStyle: 'bold' }
          },
          didParseCell: function(data) {
            if (data.section === 'body' && data.column.index === 4) {
              const type = (data.row.raw as any)[3];
              if (type === 'INCOME') {
                data.cell.styles.textColor = [16, 185, 129]; // Success Green
              } else {
                data.cell.styles.textColor = [244, 63, 94]; // Rose Red
              }
            }
          }
        });

        const pdfDataUri = doc.output('datauristring');
        await downloadBase64File(pdfDataUri, `ms_family_export_${new Date().toISOString().split('T')[0]}.pdf`);
        showToast(t('Data exported as PDF successfully'));
      } else {
        showToast(t('No data found to export'));
      }
    } catch (e) {
      console.error(e);
      showToast(t('Export failed'));
    }
  };

  // ── Logout ──
  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      navigate('/login', { replace: true });
      window.location.reload();
    }
  };

  // ── Animation variants ──
  const stagger = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06 }
    }
  };
  const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35 } }
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-6 pb-28">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="max-w-2xl mx-auto space-y-7"
      >
        {/* Header */}
        <motion.div variants={fadeUp} className="mb-6 flex items-center justify-end">
          {/* Sync Status Indicator */}
          <AnimatePresence mode="wait">
            {syncStatus !== 'idle' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${syncStatus === 'saving'
                    ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400'
                    : syncStatus === 'saved'
                      ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400'
                  }`}
              >
                {syncStatus === 'saving' && <Loader2 size={12} className="animate-spin" />}
                {syncStatus === 'saved' && <Cloud size={12} />}
                {syncStatus === 'error' && <CloudOff size={12} />}
                {syncStatus === 'saving' ? t('Syncing...') : syncStatus === 'saved' ? t('Saved to cloud') : t('Error')}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ═══ APPEARANCE ═══ */}
        <motion.section variants={fadeUp}>
          <SectionHeader title={t('Appearance')} icon={Sun} />
          <SettingCard className="p-1.5">
            <div className="flex bg-slate-100 dark:bg-[#1a1a2e] rounded-xl p-1">
              {[
                { id: THEME_MODES.LIGHT, icon: Sun, label: t('Light') },
                { id: THEME_MODES.DARK, icon: Moon, label: t('Dark') },
                { id: THEME_MODES.AUTO, icon: Monitor, label: t('System') }
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => handleThemeChange(mode.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${theme === mode.id
                      ? 'bg-white dark:bg-[#242440] text-primary-600 dark:text-primary-400 shadow-sm shadow-slate-200/50 dark:shadow-black/30'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                >
                  <mode.icon size={16} />
                  {mode.label}
                </button>
              ))}
            </div>
          </SettingCard>
        </motion.section>

        {/* ═══ LANGUAGE ═══ */}
        <motion.section variants={fadeUp}>
          <SectionHeader title={t('Language')} icon={Globe} />
          <SettingCard>
            <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-700/20">
              {[
                { id: LANGUAGES.EN, label: 'English' },
                { id: LANGUAGES.TA, label: 'தமிழ்' }
              ].map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => handleLanguageChange(lang.id)}
                  className={`p-3 flex flex-col items-center gap-2 transition-all ${language === lang.id
                      ? 'bg-primary-50 dark:bg-primary-500/10'
                      : 'hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${language === lang.id ? 'border-primary-500 bg-primary-500 text-white scale-110' : 'border-slate-300 dark:border-slate-600'
                    }`}>
                    {language === lang.id && <Check size={14} />}
                  </div>
                  <span className={`font-bold text-sm ${language === lang.id ? 'text-primary-700 dark:text-primary-400' : 'text-slate-600 dark:text-slate-400'
                    }`}>
                    {lang.label}
                  </span>
                </button>
              ))}
            </div>
            {language === LANGUAGES.TA && (
              <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs text-center border-t border-amber-100 dark:border-amber-500/20 flex items-center justify-center gap-1.5">
                <Info size={13} /> {t('Translated successfully and cached locally')}
              </div>
            )}
          </SettingCard>
        </motion.section>

        {/* ═══ ACCOUNT ═══ */}
        <motion.section variants={fadeUp}>
          <SectionHeader title={t('Account')} icon={User} />
          <SettingCard>
            <div className="p-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-primary-500/20">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-sm font-bold border border-primary-300 dark:border-primary-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-[#1a1a2e] dark:text-white"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                      />
                      <button onClick={handleSaveName} className="p-1.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors">
                        <Save size={16} />
                      </button>
                      <button onClick={() => setIsEditingName(false)} className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 dark:text-white text-lg">{user?.name || 'User'}</p>
                      <button
                        onClick={() => { setEditName(user?.name || ''); setIsEditingName(true); }}
                        className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-500 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  )}
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{user?.email}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t('Role')}: {user?.role || 'Member'}</p>
                </div>
              </div>
            </div>
            <div className="border-t border-slate-100 dark:border-slate-700/20 px-4 py-3 flex items-center justify-between bg-slate-50/50 dark:bg-[#0e0e1a]/50">
              <span className="text-xs text-slate-400 dark:text-slate-500">{t('App Version')}</span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">1.0.0</span>
            </div>
          </SettingCard>
        </motion.section>

        {/* ═══ NOTIFICATIONS ═══ */}
        <motion.section variants={fadeUp}>
          <SectionHeader title={t('Notifications')} icon={Bell} />
          <SettingCard>
            <SettingRow
              icon={Bell}
              iconColor="bg-blue-50 dark:bg-blue-500/15 text-blue-500"
              title={t('Push Notifications')}
              subtitle={t('Receive alerts and reminders')}
            >
              <ToggleSwitch enabled={notifEnabled} onToggle={toggleNotif} />
            </SettingRow>
            <SettingRow
              icon={notifSound ? Volume2 : VolumeX}
              iconColor="bg-violet-50 dark:bg-violet-500/15 text-violet-500"
              title={t('Sound')}
              subtitle={t('Play sound on notification')}
            >
              <ToggleSwitch enabled={notifSound} onToggle={toggleSound} />
            </SettingRow>
            <SettingRow
              icon={Clock}
              iconColor="bg-amber-50 dark:bg-amber-500/15 text-amber-500"
              title={t('Reminder Frequency')}
              subtitle={t('How often to receive reminders')}
              last
            >
              <select
                value={reminderFreq}
                onChange={(e) => handleFreqChange(e.target.value)}
                className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-[#1a1a2e] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
              >
                <option value="daily">{t('Daily')}</option>
                <option value="weekly">{t('Weekly')}</option>
                <option value="monthly">{t('Monthly')}</option>
                <option value="off">{t('Off')}</option>
              </select>
            </SettingRow>
          </SettingCard>
        </motion.section>

        {/* ═══ SECURITY ═══ */}
        <motion.section variants={fadeUp}>
          <SectionHeader title={t('Security')} icon={Shield} />
          <SettingCard>
            {securityLoading ? (
              <div className="flex items-center justify-center gap-3 p-6">
                <Loader2 size={20} className="animate-spin text-primary-500" />
                <span className="text-sm text-slate-500 dark:text-slate-400">{t('Checking device security...')}</span>
              </div>
            ) : securityCaps && !securityCaps.isNative ? (
              <div className="p-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                  <Shield size={22} className="text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">{t('Available on Android app only')}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t('Install the APK to use security features')}</p>
              </div>
            ) : securityCaps && !securityCaps.hasDeviceLock ? (
              <div className="p-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                  <Lock size={22} className="text-amber-500" />
                </div>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">{t('Device lock not configured')}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t('Set up PIN, pattern, or password in device settings')}</p>
                <button
                  onClick={() => openSecuritySettings()}
                  className="mt-3 px-4 py-2 text-xs font-semibold bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-500/25 transition-colors inline-flex items-center gap-1.5"
                >
                  <ExternalLink size={13} /> {t('Open Settings')}
                </button>
              </div>
            ) : (
              <>
                <SettingRow
                  icon={Lock}
                  iconColor="bg-emerald-50 dark:bg-emerald-500/15 text-emerald-500"
                  title={t('App Lock')}
                  subtitle={t('Require PIN to open app')}
                >
                  <ToggleSwitch
                    enabled={appLockOn}
                    onToggle={handleToggleAppLock}
                    disabled={securityBusy}
                  />
                </SettingRow>
                <SettingRow
                  icon={Fingerprint}
                  iconColor={securityCaps?.hasBiometric ? 'bg-rose-50 dark:bg-rose-500/15 text-rose-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}
                  title={t('Biometric Unlock')}
                  subtitle={
                    !securityCaps?.biometricHardwarePresent
                      ? t('Not supported on this device')
                      : securityCaps?.biometricNotEnrolled
                        ? t('No biometric enrolled')
                        : securityCaps?.biometricType === 'fingerprint'
                          ? t('Use fingerprint to unlock')
                          : securityCaps?.biometricType === 'face'
                            ? t('Use face unlock')
                            : t('Use fingerprint or Face ID')
                  }
                >
                  {securityCaps?.biometricNotEnrolled ? (
                    <button
                      onClick={() => openSecuritySettings()}
                      className="px-3 py-1.5 text-xs font-semibold bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/25 transition-colors inline-flex items-center gap-1.5"
                    >
                      <ExternalLink size={12} /> {t('Enroll')}
                    </button>
                  ) : (
                    <ToggleSwitch
                      enabled={biometricOn}
                      onToggle={handleToggleBiometric}
                      disabled={securityBusy || !appLockOn || !securityCaps?.hasBiometric}
                    />
                  )}
                </SettingRow>
                {securityBusy && (
                  <div className="flex items-center justify-center gap-2 py-2 border-t border-slate-100 dark:border-slate-700/20">
                    <Loader2 size={14} className="animate-spin text-primary-500" />
                    <span className="text-xs text-slate-500 dark:text-slate-400">{t('Verifying...')}</span>
                  </div>
                )}
              </>
            )}
          </SettingCard>
        </motion.section>

        {/* ═══ SMART SMS READER ═══ */}
        <motion.section variants={fadeUp}>
          <SectionHeader title={t('Smart SMS Reader')} icon={MessageSquare} />
          <SettingCard>
            {/* Glassmorphic disclosure hero */}
            <div className="relative overflow-hidden">
              {/* Gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 via-secondary-500/5 to-transparent" />
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary-500/10 rounded-full blur-2xl" />
              <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-secondary-500/10 rounded-full blur-2xl" />

              <div className="relative p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-lg shadow-primary-500/25 shrink-0">
                    <Zap size={22} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-bold text-slate-800 dark:text-white">{t('Automatic Transaction Detection')}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                      {t('This feature uses Android Notification Access to read incoming bank SMS alerts. Transactions are parsed locally on your device and synced to your private account. No SMS content is ever shared with third parties.')}
                    </p>
                  </div>
                </div>

                {/* Privacy badges */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {[
                    { icon: Shield, label: t('100% Private') },
                    { icon: Smartphone, label: t('On-Device Parsing') },
                    { icon: Lock, label: t('No SMS Permission') },
                  ].map((badge, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/60 dark:bg-white/5 border border-slate-200/50 dark:border-slate-700/30 backdrop-blur-sm">
                      <badge.icon size={11} className="text-primary-500" />
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">{badge.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Toggle row */}
            <SettingRow
              icon={MessageSquare}
              iconColor="bg-primary-50 dark:bg-primary-500/15 text-primary-500"
              title={t('Enable SMS Sync')}
              subtitle={smsEnabled ? t('Actively monitoring bank notifications') : t('SMS transaction sync is paused')}
              last
            >
              <ToggleSwitch
                enabled={smsEnabled}
                onToggle={() => {
                  const next = !smsEnabled;
                  setSmsEnabled(next);
                  setSmsReaderEnabled(next);
                  showToast(next ? t('SMS Reader enabled') : t('SMS Reader disabled'));
                }}
              />
            </SettingRow>
          </SettingCard>
        </motion.section>

        {/* ═══ DATA ═══ */}
        <motion.section variants={fadeUp}>
          <SectionHeader title={t('Data Management')} icon={Database} />
          <SettingCard>
            <SettingRow
              icon={Download}
              iconColor="bg-sky-50 dark:bg-sky-500/15 text-sky-500"
              title={t('Export Data')}
              subtitle={t('Download your transactions as PDF')}
            >
              <button
                onClick={handleExportData}
                className="px-3.5 py-1.5 text-xs font-semibold bg-primary-50 dark:bg-primary-500/15 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-500/25 transition-colors"
              >
                {t('Export')}
              </button>
            </SettingRow>
            <SettingRow
              icon={Trash2}
              iconColor="bg-orange-50 dark:bg-orange-500/15 text-orange-500"
              title={t('Clear Translation Cache')}
              subtitle={t('Removes saved translations')}
            >
              <button
                onClick={handleClearCache}
                className="px-3.5 py-1.5 text-xs font-semibold bg-orange-50 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-500/25 transition-colors"
              >
                {t('Clear')}
              </button>
            </SettingRow>
            <SettingRow
              icon={RefreshCw}
              iconColor="bg-red-50 dark:bg-red-500/15 text-red-500"
              title={t('Reset All Settings')}
              subtitle={t('Restore to defaults')}
              last
            >
              <button
                onClick={handleResetSettings}
                className="px-3.5 py-1.5 text-xs font-semibold bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/25 transition-colors"
              >
                {t('Reset')}
              </button>
            </SettingRow>
          </SettingCard>
        </motion.section>

        {/* ═══ SIGN OUT ═══ */}
        <motion.section variants={fadeUp}>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 text-white font-bold text-base shadow-lg shadow-red-500/20 flex items-center justify-center gap-2.5 hover:shadow-xl hover:shadow-red-500/30 transition-all"
          >
            <LogOut size={18} />
            {t('Sign Out')}
          </motion.button>
        </motion.section>

        {/* Spacer */}
        <div className="h-8" />
      </motion.div>

      {/* Toast */}
      <Toast message={toast.message} visible={toast.visible} icon={toast.icon} />
    </div>
  );
}
