import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import {
  Moon, Sun, Monitor, Globe, User, Shield, Bell,
  Database, LogOut, Smartphone, Trash2, Download, RefreshCw,
  Volume2, VolumeX, Clock, Info, X, Pencil, Save, CheckCircle2,
  Cloud, CloudOff, Loader2, Fingerprint, Lock, ExternalLink,
  MessageSquare, Zap, Check, AlertCircle, Camera, Users, ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import Cropper, { Area } from 'react-easy-crop';
import getCroppedImg from '../utils/cropImage';
import { compressForAvatar } from '../utils/imageCompressor';
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
import { hashPin, encryptPassword } from '../utils/cryptoHelper';

// ─── Spring configs ──────────────────────────────────────
const SPRING_SOFT = { type: 'spring', stiffness: 380, damping: 30 } as const;
const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 35 } as const;
const SPRING_GENTLE = { type: 'spring', stiffness: 260, damping: 26 } as const;

// ─── Glass style tokens ──────────────────────────────────
const glass = {
  card: 'bg-white/[0.72] dark:bg-white/[0.045] backdrop-blur-2xl border border-white/80 dark:border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_32px_rgba(0,0,0,0.45)]',
  inner: 'bg-white/50 dark:bg-white/[0.03] backdrop-blur-xl border border-white/60 dark:border-white/[0.06]',
  separator: 'border-b border-black/[0.06] dark:border-white/[0.06]',
};

// ─── Animated Background Orbs ────────────────────────────
const BackgroundOrbs: React.FC = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    <motion.div
      className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full"
      style={{ background: 'radial-gradient(circle, rgba(120,119,198,0.12) 0%, transparent 70%)' }}
      animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.05, 1] }}
      transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      className="absolute top-[40%] -right-[15%] w-[45vw] h-[45vw] rounded-full"
      style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)' }}
      animate={{ x: [0, -25, 0], y: [0, 20, 0], scale: [1, 1.08, 1] }}
      transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
    />
    <motion.div
      className="absolute -bottom-[10%] left-[25%] w-[40vw] h-[40vw] rounded-full"
      style={{ background: 'radial-gradient(circle, rgba(52,199,89,0.06) 0%, transparent 70%)' }}
      animate={{ x: [0, 20, 0], y: [0, -15, 0], scale: [1, 1.04, 1] }}
      transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
    />
  </div>
);

// ─── Section Header (Apple style: small caps, no icon) ───
interface SectionHeaderProps {
  title: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title }) => (
  <div className="px-1 mb-2 mt-1">
    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400/80 select-none">
      {title}
    </span>
  </div>
);

// ─── Glass Card ──────────────────────────────────────────
interface SettingCardProps {
  children: React.ReactNode;
  className?: string;
}

const SettingCard: React.FC<SettingCardProps> = ({ children, className = '' }) => (
  <div className={`${glass.card} rounded-[18px] overflow-hidden ${className}`}>
    {children}
  </div>
);

// ─── iOS-style Toggle ────────────────────────────────────
interface ToggleSwitchProps {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ enabled, onToggle, disabled = false }) => (
  <motion.button
    onClick={onToggle}
    disabled={disabled}
    whileTap={disabled ? {} : { scale: 0.94 }}
    transition={SPRING_SNAPPY}
    className={`relative w-[51px] h-[31px] rounded-full flex items-center transition-colors duration-300 focus:outline-none ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
      } ${enabled ? 'bg-[#34C759]' : 'bg-[#E5E5EA] dark:bg-[#3a3a3c]'}`}
    style={{
      boxShadow: enabled
        ? 'inset 0 0 0 0.5px rgba(0,0,0,0.08)'
        : 'inset 0 0 0 0.5px rgba(0,0,0,0.12)',
    }}
  >
    <motion.div
      layout
      transition={{ type: 'spring', stiffness: 600, damping: 38 }}
      className="absolute bg-white rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.2)]"
      style={{
        width: 27,
        height: 27,
        left: enabled ? 22 : 2,
        top: 2,
      }}
    />
  </motion.button>
);

// ─── Setting Row ─────────────────────────────────────────
interface SettingRowProps {
  icon?: React.ComponentType<any>;
  iconBg?: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  last?: boolean;
  danger?: boolean;
  onPress?: () => void;
}

const SettingRow: React.FC<SettingRowProps> = ({
  icon: Icon, iconBg, iconColor, title, subtitle, children, last = false, danger = false, onPress
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
      <p className={`text-[15px] font-[450] leading-snug ${danger ? 'text-[#FF3B30]' : 'text-slate-900 dark:text-white'}`}>
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

// ─── Toast ────────────────────────────────────────────────
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
            className="bg-white/80 dark:bg-[#1c1c1e]/90 backdrop-blur-3xl border border-white/60 dark:border-white/[0.1] rounded-[28px] shadow-[0_24px_60px_rgba(0,0,0,0.2)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.6)] flex flex-col items-center gap-3 px-8 py-5 min-w-[200px] max-w-[75vw]"
            style={{ textAlign: 'center' }}
          >
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ ...SPRING_SNAPPY, delay: 0.05 }}
              className="w-12 h-12 rounded-[16px] bg-emerald-500/15 flex items-center justify-center"
            >
              {ToastIcon ? (
                <ToastIcon size={22} className="text-emerald-500" />
              ) : (
                <CheckCircle2 size={22} className="text-emerald-500" />
              )}
            </motion.div>
            <p className="text-[14px] font-semibold text-slate-900 dark:text-white leading-tight">{message}</p>
            <AnimatePresence mode="wait">
              {syncStatus && (
                <motion.div
                  key={syncStatus}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                    syncStatus === 'saving'
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      : syncStatus === 'saved'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400'
                  }`}
                >
                  {syncStatus === 'saving' && <Loader2 size={11} className="animate-spin" />}
                  {syncStatus === 'saved' && <Cloud size={11} />}
                  {syncStatus === 'error' && <CloudOff size={11} />}
                  <span>
                    {syncStatus === 'saving' && t('Syncing...')}
                    {syncStatus === 'saved' && t('Saved to cloud')}
                    {syncStatus === 'error' && t('Error')}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

// ─── Main Component ───────────────────────────────────────
export default function Settings() {
  const { user, logout } = useAuth();
  const { family } = useFamily();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(getStoredTheme());

  const [notifEnabled, setNotifEnabled] = useState(() =>
    localStorage.getItem('msfamily_notif_enabled') !== 'false'
  );
  const [notifSound, setNotifSound] = useState(() =>
    localStorage.getItem('msfamily_notif_sound') !== 'false'
  );
  const [reminderFreq, setReminderFreq] = useState(() =>
    localStorage.getItem('msfamily_reminder_freq') || 'daily'
  );

  const [securityLoading, setSecurityLoading] = useState(true);
  const [securityCaps, setSecurityCaps] = useState<SecurityCapabilities | null>(null);
  const [appLockOn, setAppLockOn] = useState(isAppLockEnabled());
  const [biometricOn, setBiometricOn] = useState(isBiometricEnabled());
  const [securityBusy, setSecurityBusy] = useState(false);

  const [smsEnabled, setSmsEnabled] = useState(isSmsReaderEnabled());

  const [hasPasskeyPin, setHasPasskeyPin] = useState(false);
  const [showPasskeyModal, setShowPasskeyModal] = useState(false);
  const [passkeyVerifyPassword, setPasskeyVerifyPassword] = useState('');
  const [passkeyPin, setPasskeyPin] = useState('');
  const [passkeyConfirmPin, setPasskeyConfirmPin] = useState('');
  const [passkeyError, setPasskeyError] = useState('');
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    visible: boolean;
    icon: React.ComponentType<any> | null;
    syncStatus?: 'saving' | 'saved' | 'error';
  }>({
    message: '', visible: false, icon: null,
  });

  const toastTimeoutRef = useRef<any>(null);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');

  // Profile picture upload / crop states
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isCropping, setIsCropping] = useState<boolean>(false);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('user_preferences')
      .select('passkey_pin_hash')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.passkey_pin_hash) {
          setHasPasskeyPin(true);
        } else {
          setHasPasskeyPin(false);
          localStorage.removeItem('msfamily_passkey_pin_enabled');
          localStorage.removeItem('msfamily_encrypted_password');
        }
      });
  }, [user?.id]);

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

  useEffect(() => {
    let cancelled = false;
    checkSecurityCapabilities().then(caps => {
      if (!cancelled) { setSecurityCaps(caps); setSecurityLoading(false); }
    });
    return () => { cancelled = true; };
  }, []);

  const syncToBackend = useCallback(async (key: string, value: any, actionLabel: string) => {
    if (!user?.id) return;
    showToast(actionLabel, null, 'saving');
    try {
      const success = await saveSinglePreference(user.id, key as keyof UserPreferences, value);
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

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme as any);
    applyTheme(newTheme as any);
    syncToBackend('theme', newTheme, t('Theme updated'));
  };

  const handleLanguageChange = (newLang: typeof LANGUAGES[keyof typeof LANGUAGES]) => {
    setLanguage(newLang);
    const label = newLang === LANGUAGES.EN ? 'Language set to English' : 'மொழி தமிழாக மாற்றப்பட்டது';
    syncToBackend('language', newLang, label);
  };

  const handleSaveName = async () => {
    if (!user) return;
    if (!editName.trim() || editName === user.name) { setIsEditingName(false); return; }
    try {
      const { error } = await supabase.from('profiles').update({ name: editName.trim() }).eq('id', user.id);
      if (!error) { showToast(t('Name updated successfully')); window.location.reload(); }
      else showToast(t('Failed to update name'));
    } catch { showToast(t('Failed to update name')); }
    setIsEditingName(false);
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImageSrc(reader.result);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = ''; // Reset input
    }
  };

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSaveAvatar = async () => {
    if (!user || !imageSrc || !croppedAreaPixels) return;
    try {
      setIsCropping(true);
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (!croppedBlob) {
        showToast(t('Failed to crop image'));
        return;
      }
      
      const fileFromBlob = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
      const compressedFile = await compressForAvatar(fileFromBlob);

      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onloadend = async () => {
        if (typeof reader.result === 'string') {
          const avatarDataUrl = reader.result;
          
          const { error } = await supabase
            .from('profiles')
            .update({ avatar: avatarDataUrl })
            .eq('id', user.id);
            
          if (!error) {
            localStorage.setItem('msfamily_user_avatar', avatarDataUrl);
            showToast(t('Profile picture updated successfully'));
            setImageSrc(null);
            window.location.reload();
          } else {
            console.error('Error updating avatar:', error);
            showToast(t('Failed to save avatar to database'));
          }
        }
      };
    } catch (e) {
      console.error(e);
      showToast(t('Failed to update profile picture'));
    } finally {
      setIsCropping(false);
    }
  };

  const toggleNotif = () => {
    const next = !notifEnabled;
    setNotifEnabled(next);
    localStorage.setItem('msfamily_notif_enabled', String(next));
    syncToBackend('notif_enabled', next, next ? t('Notifications enabled') : t('Notifications disabled'));
  };

  const toggleSound = () => {
    const next = !notifSound;
    setNotifSound(next);
    localStorage.setItem('msfamily_notif_sound', String(next));
    syncToBackend('notif_sound', next, next ? t('Sound on') : t('Sound off'));
  };

  const handleFreqChange = (freq: string) => {
    setReminderFreq(freq);
    localStorage.setItem('msfamily_reminder_freq', freq);
    syncToBackend('reminder_freq', freq, t('Reminder frequency updated'));
  };

  const handleToggleAppLock = useCallback(async () => {
    if (securityBusy) return;
    setSecurityBusy(true);
    const newState = !appLockOn;
    const result = await toggleAppLock(newState);
    if (result.success) {
      setAppLockOn(newState);
      if (!newState) setBiometricOn(false);
      showToast(newState ? t('Security Enabled') : t('Security Disabled'), newState ? Shield : null);
    } else if (result.error === 'no_device_lock') {
      showToast(t('Device lock not configured'));
    } else if (result.error !== 'cancelled') {
      showToast(t('Authentication failed'));
    }
    setSecurityBusy(false);
  }, [appLockOn, securityBusy, showToast, t]);

  const handleToggleBiometric = useCallback(async () => {
    if (securityBusy) return;
    if (!appLockOn) { showToast(t('Enable App Lock first')); return; }
    setSecurityBusy(true);
    const newState = !biometricOn;
    const result = await toggleBiometricUnlock(newState);
    if (result.success) {
      setBiometricOn(newState);
      showToast(newState ? t('Security Enabled') : t('Security Disabled'), newState ? Fingerprint : null);
    } else if (result.error === 'no_biometric_enrolled') {
      showToast(t('No biometric enrolled'));
    } else if (result.error !== 'cancelled') {
      showToast(t('Authentication failed'));
    }
    setSecurityBusy(false);
  }, [biometricOn, appLockOn, securityBusy, showToast, t]);

  const handleRemovePasskeyPin = useCallback(async () => {
    if (!user?.id) return;
    setSecurityBusy(true);
    try {
      const { error } = await supabase.from('user_preferences')
        .update({ passkey_pin_hash: null, encrypted_password: null })
        .eq('user_id', user.id);
      if (!error) {
        localStorage.removeItem('msfamily_passkey_pin_enabled');
        localStorage.removeItem('msfamily_encrypted_password');
        setHasPasskeyPin(false);
        showToast(t('Passkey PIN removed successfully'));
      } else { showToast(t('Failed to remove Passkey PIN')); }
    } catch { showToast(t('Failed to remove Passkey PIN')); }
    finally { setSecurityBusy(false); }
  }, [user?.id, showToast, t]);

  const handleConfigurePasskeyPin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !user?.email) return;
    if (passkeyPin.length !== 4 || !/^\d+$/.test(passkeyPin)) {
      setPasskeyError(t('PIN must be exactly 4 digits')); return;
    }
    if (passkeyPin !== passkeyConfirmPin) {
      setPasskeyError(t('PINs do not match')); return;
    }
    setPasskeyLoading(true);
    setPasskeyError('');
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email, password: passkeyVerifyPassword,
      });
      if (authError) { setPasskeyError(t('Incorrect main password')); setPasskeyLoading(false); return; }

      const hashedPin = await hashPin(passkeyPin);
      const encrypted = encryptPassword(passkeyVerifyPassword, passkeyPin);
      const { error: dbError } = await supabase.from('user_preferences')
        .update({ passkey_pin_hash: hashedPin, encrypted_password: encrypted })
        .eq('user_id', user.id);
      if (dbError) { setPasskeyError(t('Failed to save to database')); setPasskeyLoading(false); return; }

      localStorage.setItem('msfamily_passkey_pin_enabled', 'true');
      localStorage.setItem('msfamily_encrypted_password', encrypted);
      localStorage.setItem('rememberedEmail', user.email);
      localStorage.setItem('msfamily_user_name', user.name || '');
      localStorage.setItem('msfamily_user_avatar', user.avatar || '');

      setHasPasskeyPin(true);
      setShowPasskeyModal(false);
      setPasskeyPin(''); setPasskeyConfirmPin(''); setPasskeyVerifyPassword('');
      showToast(t('Passkey PIN configured successfully'), Check);
    } catch (err: any) {
      setPasskeyError(err.message || t('An error occurred'));
    } finally { setPasskeyLoading(false); }
  }, [user, passkeyPin, passkeyConfirmPin, passkeyVerifyPassword, showToast, t]);

  const handleClearCache = () => {
    localStorage.removeItem('msfamily_translations_cache');
    showToast(t('Translation cache cleared'));
  };

  const handleResetSettings = async () => {
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
    if (user?.id) {
      showToast(t('Settings reset to default'), null, 'saving');
      try {
        await savePreferences(user.id, { theme: 'light', language: 'en', notif_enabled: true, notif_sound: true, reminder_freq: 'daily', budget_limit: 3000, savings_target: 10000 });
        setToast(prev => ({ ...prev, syncStatus: 'saved' }));
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2000);
      } catch {
        setToast(prev => ({ ...prev, syncStatus: 'error' }));
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2000);
      }
    } else {
      showToast(t('Settings reset to default'));
    }
  };

  const handleExportData = async () => {
    if (!user) return;
    try {
      const { data } = await supabase.from('transactions').select('*').eq('member_id', user.id).order('created_at', { ascending: false });
      if (data && data.length > 0) {
        const doc = new jsPDF();
        doc.setFontSize(22); doc.setTextColor(40, 44, 52);
        doc.text('MS Family Finance Hub', 14, 22);
        doc.setFontSize(14); doc.setTextColor(100);
        doc.text('Complete Account Statement', 14, 30);
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 40);
        const income = data.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
        const expense = data.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
        const net = income - expense;
        doc.setDrawColor(240); doc.setFillColor(252, 252, 253);
        doc.roundedRect(14, 50, 182, 25, 3, 3, 'FD');
        doc.setFontSize(9); doc.setTextColor(120);
        doc.text('TOTAL INCOME', 25, 58); doc.text('TOTAL EXPENSE', 85, 58); doc.text('NET BALANCE', 145, 58);
        doc.setFontSize(12); doc.setFont('helvetica', 'bold');
        doc.setTextColor(16, 185, 129); doc.text(`+Rs. ${income.toLocaleString()}`, 25, 67);
        doc.setTextColor(244, 63, 94); doc.text(`-Rs. ${expense.toLocaleString()}`, 85, 67);
        doc.setTextColor(net >= 0 ? 16 : 244, net >= 0 ? 185 : 63, net >= 0 ? 129 : 94);
        doc.text(`${net >= 0 ? '+' : ''}Rs. ${net.toLocaleString()}`, 145, 67);
        autoTable(doc, {
          startY: 85,
          head: [['Date', 'Category', 'Member', 'Type', 'Amount']],
          body: data.map(t => [t.date, t.category, t.member_name || user.name, t.type.toUpperCase(), `${t.type === 'income' ? '+' : '-'}Rs. ${Number(t.amount).toLocaleString()}`]),
          theme: 'grid',
          styles: { fontSize: 9, cellPadding: 4 },
          headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } },
          didParseCell: function (data) {
            if (data.section === 'body' && data.column.index === 4) {
              const type = (data.row.raw as any)[3];
              data.cell.styles.textColor = type === 'INCOME' ? [16, 185, 129] : [244, 63, 94];
            }
          }
        });
        const pdfDataUri = doc.output('datauristring');
        await downloadBase64File(pdfDataUri, `ms_family_export_${new Date().toISOString().split('T')[0]}.pdf`);
        showToast(t('Data exported as PDF successfully'));
      } else {
        showToast(t('No data found to export'));
      }
    } catch (e) { showToast(t('Export failed')); }
  };

  const handleLogout = async () => {
    try { await logout(); } catch { }
    finally { navigate('/login', { replace: true }); window.location.reload(); }
  };

  // ── Stagger animation config ──
  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
  };
  const item = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    show: { opacity: 1, y: 0, scale: 1, transition: SPRING_GENTLE },
  };

  // ── Theme mode configs ──
  const themeModes = [
    { id: THEME_MODES.LIGHT, icon: Sun, label: t('Light'), description: t('Always bright') },
    { id: THEME_MODES.DARK, icon: Moon, label: t('Dark'), description: t('Easy on eyes') },
    { id: THEME_MODES.AUTO, icon: Monitor, label: t('System'), description: t('Follows device') },
    { id: THEME_MODES.SCHEDULE, icon: Clock, label: t('Schedule'), description: t('Sunset to sunrise') },
  ];

  return (
    <div className="relative min-h-full text-slate-900 dark:text-slate-100">
      {/* Main scroll container */}
      <div className="relative z-10 h-full overflow-y-auto custom-scrollbar pb-28">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="max-w-[390px] mx-auto px-4 pt-2 pb-4 space-y-[30px]"
        >



          {/* ════ PROFILE SECTION ════ */}
          <motion.section variants={item}>
            <SettingCard>
              {/* Avatar + info */}
              <div className="px-4 pt-5 pb-4">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <motion.div
                    whileHover={{ scale: 1.04 }}
                    transition={SPRING_SOFT}
                    className="relative shrink-0 cursor-pointer"
                    onClick={() => document.getElementById('avatar-upload-input')?.click()}
                  >
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-[68px] h-[68px] rounded-[20px] object-cover shadow-lg border-2 border-primary-500/30"
                        style={{
                          boxShadow: '0 8px 24px rgba(102,126,234,0.35)',
                        }}
                      />
                    ) : (
                      <div
                        className="w-[68px] h-[68px] rounded-[20px] flex items-center justify-center text-white font-bold text-[28px] shadow-lg"
                        style={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          boxShadow: '0 8px 24px rgba(102,126,234,0.35)',
                        }}
                      >
                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    )}
                    
                    {/* Camera icon badge */}
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 text-white rounded-full flex items-center justify-center shadow-md border border-white dark:border-[#1c1c1e]">
                      <Camera size={11} strokeWidth={2.5} />
                    </div>

                    {/* Online dot */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#34C759] rounded-full border-2 border-white dark:border-[#1c1c1e]" />
                  </motion.div>

                  <input
                    type="file"
                    id="avatar-upload-input"
                    accept="image/*"
                    onChange={onFileChange}
                    className="hidden"
                  />

                  {/* Name + email */}
                  <div className="flex-1 min-w-0">
                    {isEditingName ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-3 py-1.5 text-[15px] font-semibold rounded-[10px] border border-primary-300 dark:border-primary-500/40 bg-white/80 dark:bg-white/[0.07] dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 backdrop-blur-xl"
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                        />
                        <motion.button whileTap={{ scale: 0.9 }} onClick={handleSaveName} className="p-1.5 rounded-[8px] bg-primary-500 text-white">
                          <Save size={14} />
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setIsEditingName(false)} className="p-1.5 rounded-[8px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          <X size={14} />
                        </motion.button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-[17px] text-slate-900 dark:text-white tracking-[-0.01em] truncate">
                          {user?.name || 'User'}
                        </p>
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={() => { setEditName(user?.name || ''); setIsEditingName(true); }}
                          className="p-1 rounded-[6px] text-slate-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors"
                        >
                          <Pencil size={13} />
                        </motion.button>
                      </div>
                    )}
                    <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{user?.email}</p>
                    <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-[3px] rounded-full bg-primary-50 dark:bg-primary-500/[0.15] border border-primary-100 dark:border-primary-500/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                      <span className="text-[11px] font-semibold text-primary-600 dark:text-primary-400 capitalize">
                        {user?.role || 'Member'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* App version footer */}
              <div className="px-4 py-2.5 border-t border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between">
                <span className="text-[12px] text-slate-400 dark:text-slate-500">{t('App Version')}</span>
                <span className="text-[12px] font-mono text-slate-500 dark:text-slate-400">1.0.0</span>
              </div>
            </SettingCard>
          </motion.section>

          {/* ════ FAMILY SETUP ════ */}
          <motion.section variants={item}>
            <SectionHeader title={t('Family Setup')} />
            <SettingCard>
              <SettingRow
                icon={Users}
                iconBg="rgba(124,58,237,0.12)"
                iconColor="#7C3AED"
                title={t('Manage Family')}
                subtitle={family ? t('Members, invites, and family code') : t('Create or join a family group')}
                last
                onPress={() => navigate('/settings/family-setup')}
              >
                <ChevronRight size={16} className="text-slate-400" />
              </SettingRow>
            </SettingCard>
          </motion.section>

          {/* ════ APPEARANCE ════ */}
          <motion.section variants={item}>
            <SectionHeader title={t('Appearance')} />
            <SettingCard>
              <div className="p-3.5">
                <div className="grid grid-cols-2 gap-2.5">
                  {themeModes.map((mode) => {
                    const isActive = theme === mode.id;
                    return (
                      <motion.button
                        key={mode.id}
                        onClick={() => handleThemeChange(mode.id)}
                        whileTap={{ scale: 0.97 }}
                        transition={SPRING_SNAPPY}
                        className={`relative flex flex-col items-start gap-1 p-3.5 rounded-[14px] transition-all duration-300 text-left border ${
                          isActive
                            ? 'bg-primary-500/[0.08] dark:bg-primary-500/[0.12] border-primary-500/30'
                            : 'bg-black/[0.02] dark:bg-white/[0.02] border-transparent hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className={`p-1.5 rounded-[8px] transition-colors ${isActive ? 'bg-primary-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                            <mode.icon size={14} />
                          </div>
                          {isActive && (
                            <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                              <Check size={11} color="white" strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <span className={`text-[13.5px] font-semibold mt-2.5 transition-colors ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-800 dark:text-slate-200'}`}>
                          {mode.label}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400/80 leading-tight">
                          {mode.description}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </SettingCard>
          </motion.section>

          {/* ════ LANGUAGE ════ */}
          <motion.section variants={item}>
            <SectionHeader title={t('Language')} />
            <SettingCard>
              <div className="grid grid-cols-2">
                {[{ id: LANGUAGES.EN, label: 'English' }, { id: LANGUAGES.TA, label: 'தமிழ்' }].map((lang, i) => (
                  <motion.button
                    key={lang.id}
                    onClick={() => handleLanguageChange(lang.id)}
                    whileTap={{ scale: 0.97 }}
                    transition={SPRING_SNAPPY}
                    className={`relative flex flex-col items-center justify-center py-4 ${i === 0 ? 'border-r border-black/[0.06] dark:border-white/[0.06]' : ''} transition-colors ${language === lang.id
                        ? 'bg-primary-500/[0.08] dark:bg-primary-500/[0.12]'
                        : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                      }`}
                  >
                    {language === lang.id && (
                      <motion.div
                        layoutId="lang-check"
                        className="absolute top-2.5 right-3 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center"
                        transition={SPRING_SOFT}
                      >
                        <Check size={11} color="white" strokeWidth={3} />
                      </motion.div>
                    )}
                    <span className={`text-[14px] font-semibold ${language === lang.id ? 'text-primary-600 dark:text-primary-400' : 'text-slate-700 dark:text-slate-300'}`}>
                      {lang.label}
                    </span>
                  </motion.button>
                ))}
              </div>
              <AnimatePresence>
                {language === LANGUAGES.TA && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={SPRING_GENTLE}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-50/80 dark:bg-amber-500/10 border-t border-amber-100 dark:border-amber-500/20">
                      <Info size={11} className="text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="text-[11px] text-amber-700 dark:text-amber-400">
                        {t('Translated successfully and cached locally')}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </SettingCard>
          </motion.section>

          {/* ════ NOTIFICATIONS ════ */}
          <motion.section variants={item}>
            <SectionHeader title={t('Notifications')} />
            <SettingCard>
              <SettingRow
                icon={Bell}
                iconBg="rgba(0,122,255,0.12)"
                iconColor="#007AFF"
                title={t('Push Notifications')}
                subtitle={t('Receive alerts and reminders')}
              >
                <ToggleSwitch enabled={notifEnabled} onToggle={toggleNotif} />
              </SettingRow>
              <SettingRow
                icon={notifSound ? Volume2 : VolumeX}
                iconBg="rgba(175,82,222,0.12)"
                iconColor="#AF52DE"
                title={t('Sound')}
                subtitle={t('Play sound on notification')}
              >
                <ToggleSwitch enabled={notifSound} onToggle={toggleSound} />
              </SettingRow>
              <SettingRow
                icon={Clock}
                iconBg="rgba(255,149,0,0.12)"
                iconColor="#FF9500"
                title={t('Reminder Frequency')}
                subtitle={t('How often to receive reminders')}
                last
              >
                <select
                  value={reminderFreq}
                  onChange={(e) => handleFreqChange(e.target.value)}
                  className="text-[13px] border border-black/[0.1] dark:border-white/[0.1] rounded-[9px] px-2.5 py-1.5 bg-white/60 dark:bg-white/[0.07] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500/30 backdrop-blur-xl cursor-pointer appearance-none pr-7"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238e8e93' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
                >
                  <option value="daily">{t('Daily')}</option>
                  <option value="weekly">{t('Weekly')}</option>
                  <option value="monthly">{t('Monthly')}</option>
                  <option value="off">{t('Off')}</option>
                </select>
              </SettingRow>
            </SettingCard>
          </motion.section>

          {/* ════ SECURITY ════ */}
          <motion.section variants={item}>
            <SectionHeader title={t('Security')} />
            <SettingCard>
              <SettingRow
                icon={Lock}
                iconBg="rgba(88,86,214,0.12)"
                iconColor="#5856D6"
                title={t('Passkey PIN')}
                subtitle={hasPasskeyPin ? t('4-digit PIN login enabled') : t('Quick access not set up')}
                last={!securityLoading && !securityCaps?.isNative}
              >
                <div className="flex items-center gap-2">
                  {hasPasskeyPin && (
                    <motion.button
                      whileTap={{ scale: 0.93 }}
                      onClick={handleRemovePasskeyPin}
                      className="px-3 py-1.5 text-[12px] font-semibold bg-red-50 dark:bg-red-500/10 text-[#FF3B30] rounded-[9px] hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                    >
                      {t('Remove')}
                    </motion.button>
                  )}
                  <motion.button
                    whileTap={{ scale: 0.93 }}
                    onClick={() => setShowPasskeyModal(true)}
                    className="px-3 py-1.5 text-[12px] font-semibold bg-primary-50 dark:bg-primary-500/[0.12] text-primary-600 dark:text-primary-400 rounded-[9px] hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-colors"
                  >
                    {hasPasskeyPin ? t('Change') : t('Set Up')}
                  </motion.button>
                </div>
              </SettingRow>

              {securityLoading ? (
                <div className="flex items-center justify-center gap-2.5 py-5 border-t border-black/[0.06] dark:border-white/[0.06]">
                  <Loader2 size={17} className="animate-spin text-primary-500" />
                  <span className="text-[13px] text-slate-500 dark:text-slate-400">{t('Checking device security...')}</span>
                </div>
              ) : securityCaps && !securityCaps.isNative ? (
                <div className="px-4 py-3 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center gap-2 bg-black/[0.015] dark:bg-white/[0.015]">
                  <Info size={12} className="text-slate-400 shrink-0" />
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    {t('Native features like Biometric Auth are available on the Android app only.')}
                  </span>
                </div>
              ) : securityCaps && !securityCaps.hasDeviceLock ? (
                <div className="p-5 text-center border-t border-black/[0.06] dark:border-white/[0.06]">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ ...SPRING_SOFT, delay: 0.1 }}
                    className="w-12 h-12 rounded-[14px] bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center mx-auto mb-3"
                  >
                    <Lock size={20} className="text-amber-500" />
                  </motion.div>
                  <p className="text-[14px] font-semibold text-slate-700 dark:text-slate-300">{t('Device lock not configured')}</p>
                  <p className="text-[12px] text-slate-400 mt-0.5">{t('Set up PIN, pattern, or password in device settings')}</p>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => openSecuritySettings()}
                    className="mt-3 px-4 py-2 text-[12px] font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-[10px] inline-flex items-center gap-1.5 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
                  >
                    <ExternalLink size={12} /> {t('Open Settings')}
                  </motion.button>
                </div>
              ) : (
                <>
                  <SettingRow
                    icon={Lock}
                    iconBg="rgba(52,199,89,0.12)"
                    iconColor="#34C759"
                    title={t('App Lock')}
                    subtitle={t('Require PIN to open app')}
                  >
                    <ToggleSwitch enabled={appLockOn} onToggle={handleToggleAppLock} disabled={securityBusy} />
                  </SettingRow>
                  <SettingRow
                    icon={Fingerprint}
                    iconBg={securityCaps?.hasBiometric ? 'rgba(255,59,48,0.12)' : 'rgba(142,142,147,0.1)'}
                    iconColor={securityCaps?.hasBiometric ? '#FF3B30' : '#8e8e93'}
                    title={t('Biometric Unlock')}
                    subtitle={
                      !securityCaps?.biometricHardwarePresent ? t('Not supported on this device')
                        : securityCaps?.biometricNotEnrolled ? t('No biometric enrolled')
                          : securityCaps?.biometricType === 'fingerprint' ? t('Use fingerprint to unlock')
                            : securityCaps?.biometricType === 'face' ? t('Use face unlock')
                              : t('Use fingerprint or Face ID')
                    }
                    last
                  >
                    {securityCaps?.biometricNotEnrolled ? (
                      <motion.button
                        whileTap={{ scale: 0.93 }}
                        onClick={() => openSecuritySettings()}
                        className="px-3 py-1.5 text-[12px] font-semibold bg-red-50 dark:bg-red-500/10 text-[#FF3B30] rounded-[9px] inline-flex items-center gap-1"
                      >
                        <ExternalLink size={11} /> {t('Enroll')}
                      </motion.button>
                    ) : (
                      <ToggleSwitch
                        enabled={biometricOn}
                        onToggle={handleToggleBiometric}
                        disabled={securityBusy || !appLockOn || !securityCaps?.hasBiometric}
                      />
                    )}
                  </SettingRow>
                </>
              )}

              <AnimatePresence>
                {securityBusy && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={SPRING_GENTLE}
                    className="overflow-hidden border-t border-black/[0.06] dark:border-white/[0.06]"
                  >
                    <div className="flex items-center justify-center gap-2 py-2.5">
                      <Loader2 size={13} className="animate-spin text-primary-500" />
                      <span className="text-[12px] text-slate-500">{t('Verifying...')}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </SettingCard>
          </motion.section>

          {/* ════ SMART SMS READER ════ */}
          <motion.section variants={item}>
            <SectionHeader title={t('Smart SMS Reader')} />
            <SettingCard>
              {/* Hero banner */}
              <div className="relative overflow-hidden">
                <div
                  className="absolute inset-0 opacity-[0.07] dark:opacity-[0.04]"
                  style={{ background: 'linear-gradient(135deg, #667eea, #764ba2, #f093fb)' }}
                />
                <div className="relative p-4">
                  <div className="flex items-start gap-3.5">
                    <div
                      className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 shadow-lg"
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        boxShadow: '0 6px 20px rgba(102,126,234,0.3)',
                      }}
                    >
                      <Zap size={20} color="white" />
                    </div>
                    <div>
                      <h4 className="text-[15px] font-bold text-slate-900 dark:text-white">
                        {t('Automatic Transaction Detection')}
                      </h4>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {t('This feature uses Android Notification Access to read incoming bank SMS alerts. Transactions are parsed locally on your device and synced to your private account. No SMS content is ever shared with third parties.')}
                      </p>
                    </div>
                  </div>

                  {/* Privacy badges */}
                  <div className="flex flex-wrap gap-1.5 mt-3.5">
                    {[
                      { icon: Shield, label: t('100% Private') },
                      { icon: Smartphone, label: t('On-Device Parsing') },
                      { icon: Lock, label: t('No SMS Permission') },
                    ].map((badge, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ ...SPRING_SNAPPY, delay: 0.1 + i * 0.05 }}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/70 dark:bg-white/[0.06] border border-white/80 dark:border-white/[0.08] backdrop-blur-sm"
                      >
                        <badge.icon size={10} className="text-primary-500" />
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                          {badge.label}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              <SettingRow
                icon={MessageSquare}
                iconBg="rgba(0,122,255,0.12)"
                iconColor="#007AFF"
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

          {/* ════ DATA MANAGEMENT ════ */}
          <motion.section variants={item}>
            <SectionHeader title={t('Data Management')} />
            <SettingCard>
              <SettingRow
                icon={Download}
                iconBg="rgba(48,209,88,0.12)"
                iconColor="#30D158"
                title={t('Export Data')}
                subtitle={t('Download your transactions as PDF')}
              >
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={handleExportData}
                  className="px-3 py-1.5 text-[12px] font-semibold bg-primary-50 dark:bg-primary-500/[0.12] text-primary-600 dark:text-primary-400 rounded-[9px] hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-colors"
                >
                  {t('Export')}
                </motion.button>
              </SettingRow>
              <SettingRow
                icon={Trash2}
                iconBg="rgba(255,149,0,0.12)"
                iconColor="#FF9500"
                title={t('Clear Translation Cache')}
                subtitle={t('Removes saved translations')}
              >
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={handleClearCache}
                  className="px-3 py-1.5 text-[12px] font-semibold bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-[9px] hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-colors"
                >
                  {t('Clear')}
                </motion.button>
              </SettingRow>
              <SettingRow
                icon={RefreshCw}
                iconBg="rgba(255,59,48,0.12)"
                iconColor="#FF3B30"
                title={t('Reset All Settings')}
                subtitle={t('Restore to defaults')}
                last
              >
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={handleResetSettings}
                  className="px-3 py-1.5 text-[12px] font-semibold bg-red-50 dark:bg-red-500/10 text-[#FF3B30] rounded-[9px] hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                >
                  {t('Reset')}
                </motion.button>
              </SettingRow>
            </SettingCard>
          </motion.section>

          {/* ════ SIGN OUT ════ */}
          <motion.section variants={item}>
            <SettingCard>
              <SettingRow
                icon={LogOut}
                iconBg="rgba(255,59,48,0.12)"
                iconColor="#FF3B30"
                title={t('Sign Out')}
                danger
                last
                onPress={handleLogout}
              >
                <div />
              </SettingRow>
            </SettingCard>
          </motion.section>

          {/* Bottom spacer */}
          <div className="h-4" />
        </motion.div>
      </div>

      {/* ════ PASSKEY MODAL ════ */}
      <AnimatePresence>
        {showPasskeyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.55)' }}
            onClick={(e) => { if (e.target === e.currentTarget) { setShowPasskeyModal(false); setPasskeyPin(''); setPasskeyConfirmPin(''); setPasskeyVerifyPassword(''); setPasskeyError(''); } }}
          >
            {/* Backdrop blur layer */}
            <div className="absolute inset-0 backdrop-blur-[20px]" />

            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.96 }}
              transition={SPRING_SOFT}
              className="relative w-full max-w-[340px] rounded-[28px] overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.4)]"
              style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(40px) saturate(180%)' }}
            >
              <div className="dark:hidden" />
              {/* Dark mode overlay */}
              <div
                className="hidden dark:block absolute inset-0 rounded-[28px]"
                style={{ background: 'rgba(28,28,30,0.95)', backdropFilter: 'blur(40px)' }}
              />

              <div className="relative p-6">
                {/* Close */}
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={() => { setShowPasskeyModal(false); setPasskeyPin(''); setPasskeyConfirmPin(''); setPasskeyVerifyPassword(''); setPasskeyError(''); }}
                  className="absolute right-4 top-4 w-7 h-7 rounded-full bg-black/[0.06] dark:bg-white/[0.08] flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-black/[0.1] dark:hover:bg-white/[0.12] transition-colors"
                >
                  <X size={14} />
                </motion.button>

                {/* Header */}
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="w-[42px] h-[42px] rounded-[13px] flex items-center justify-center shadow-md"
                    style={{ background: 'linear-gradient(135deg, #5856D6 0%, #007AFF 100%)', boxShadow: '0 6px 18px rgba(88,86,214,0.3)' }}
                  >
                    <Lock size={18} color="white" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-bold text-slate-900 dark:text-white">
                      {hasPasskeyPin ? t('Change Passkey PIN') : t('Set Up Passkey PIN')}
                    </h3>
                    <p className="text-[12px] text-slate-500 dark:text-slate-400">
                      {t('Authenticate quickly on this device')}
                    </p>
                  </div>
                </div>

                {/* Error */}
                <AnimatePresence>
                  {passkeyError && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={SPRING_GENTLE}
                      className="overflow-hidden mb-4"
                    >
                      <div className="p-3 rounded-[12px] bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 flex items-center gap-2">
                        <AlertCircle size={13} className="text-[#FF3B30] shrink-0" />
                        <span className="text-[12px] text-[#FF3B30]">{passkeyError}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleConfigurePasskeyPin} className="space-y-4">
                  {/* Main password */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500 block mb-1.5">
                      {t('Verify Main Password')}
                    </label>
                    <input
                      type="password"
                      required
                      value={passkeyVerifyPassword}
                      onChange={(e) => setPasskeyVerifyPassword(e.target.value)}
                      placeholder={t('Enter your login password')}
                      className="w-full px-3.5 py-2.5 text-[14px] rounded-[12px] border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.05] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
                    />
                  </div>

                  {/* PIN fields */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: t('4-Digit PIN'), value: passkeyPin, onChange: (v: string) => setPasskeyPin(v) },
                      { label: t('Confirm PIN'), value: passkeyConfirmPin, onChange: (v: string) => setPasskeyConfirmPin(v) },
                    ].map((field, i) => (
                      <div key={i}>
                        <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500 block mb-1.5">
                          {field.label}
                        </label>
                        <input
                          type="password"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={4}
                          required
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="••••"
                          className="w-full px-3 py-2.5 text-center text-[18px] tracking-[0.35em] font-mono rounded-[12px] border border-black/[0.1] dark:border-white/[0.1] bg-black/[0.03] dark:bg-white/[0.05] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
                        />
                      </div>
                    ))}
                  </div>

                  {/* PIN dots indicator */}
                  <div className="flex items-center justify-center gap-3 py-1">
                    {[0, 1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        animate={{
                          scale: passkeyPin.length > i ? 1.2 : 1,
                          backgroundColor: passkeyPin.length > i ? '#007AFF' : 'rgba(0,0,0,0.15)',
                        }}
                        transition={SPRING_SNAPPY}
                        className="w-2.5 h-2.5 rounded-full"
                      />
                    ))}
                    <div className="w-px h-4 bg-black/10 dark:bg-white/10 mx-1" />
                    {[0, 1, 2, 3].map((i) => (
                      <motion.div
                        key={`c${i}`}
                        animate={{
                          scale: passkeyConfirmPin.length > i ? 1.2 : 1,
                          backgroundColor: passkeyConfirmPin.length > i
                            ? (passkeyPin.length === 4 && passkeyConfirmPin.length > i && passkeyPin[i] !== passkeyConfirmPin[i] ? '#FF3B30' : '#34C759')
                            : 'rgba(0,0,0,0.15)',
                        }}
                        transition={SPRING_SNAPPY}
                        className="w-2.5 h-2.5 rounded-full"
                      />
                    ))}
                  </div>

                  {/* Submit */}
                  <motion.button
                    type="submit"
                    disabled={passkeyLoading}
                    whileTap={passkeyLoading ? {} : { scale: 0.97 }}
                    transition={SPRING_SNAPPY}
                    className="w-full py-3 rounded-[14px] text-[15px] font-bold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
                    style={{
                      background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)',
                      boxShadow: '0 8px 24px rgba(0,122,255,0.3)',
                    }}
                  >
                    {passkeyLoading ? (
                      <><Loader2 size={15} className="animate-spin" /> {t('Configuring...')}</>
                    ) : (
                      <><CheckCircle2 size={15} /> {hasPasskeyPin ? t('Update PIN') : t('Enable PIN')}</>
                    )}
                  </motion.button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════ IMAGE CROPPER MODAL ════ */}
      <AnimatePresence>
        {imageSrc && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-[360px] rounded-[28px] overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.5)] flex flex-col h-[70vh]"
              style={{ background: 'rgba(28,28,30,0.95)', backdropFilter: 'blur(40px)' }}
            >
              <div className="p-4 border-b border-white/[0.06] flex justify-between items-center bg-[#1c1c1e]">
                <h3 className="font-bold text-white text-[16px]">{t('Crop Avatar')}</h3>
                <button
                  onClick={() => setImageSrc(null)}
                  className="p-1 rounded-full text-slate-400 hover:bg-white/[0.08]"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="relative flex-1 bg-black/40">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>
              
              <div className="p-5 border-t border-white/[0.06] bg-[#1c1c1e] space-y-4">
                <div>
                  <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2 block">{t('Zoom')}</label>
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    aria-label="Zoom"
                    onChange={(e: any) => setZoom(Number(e.target.value))}
                    className="w-full accent-primary-500"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setImageSrc(null)}
                    className="flex-1 py-2.5 rounded-[12px] font-bold text-slate-300 bg-white/[0.06] hover:bg-white/[0.1] transition-colors text-[14px]"
                  >
                    {t('Cancel')}
                  </button>
                  <button
                    onClick={handleSaveAvatar}
                    disabled={isCropping}
                    className="flex-1 py-2.5 rounded-[12px] font-bold text-white bg-primary-500 hover:bg-primary-600 shadow-lg shadow-primary-500/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-all text-[14px]"
                  >
                    {isCropping ? <Loader2 size={16} className="animate-spin" /> : t('Crop & Apply')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Toast message={toast.message} visible={toast.visible} icon={toast.icon} syncStatus={toast.syncStatus} t={t} />
    </div>
  );
}