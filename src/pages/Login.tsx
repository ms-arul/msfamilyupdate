import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Lock,
  Mail,
  AlertCircle,
  Eye,
  EyeOff,
  Shield,
  X,
  Loader2,
  AtSign,
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { hashPin, decryptPassword } from '../utils/cryptoHelper';
import { supabase } from '../lib/supabase';

// ============================================================================
// Subcomponents
// ============================================================================
interface PasswordStrengthMeterProps {
  password?: string;
}

const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password }) => {
  const { t } = useLanguage();
  const strength = useMemo(() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (password.length < 6) return 1;
    if (score <= 1) return 1;
    if (score === 2) return 2;
    return 3;
  }, [password]);

  const getStrengthText = () => {
    switch (strength) {
      case 1: return t('Weak');
      case 2: return t('Medium');
      case 3: return t('Strong');
      default: return '';
    }
  };

  const getStrengthColor = () => {
    switch (strength) {
      case 1: return 'bg-red-500';
      case 2: return 'bg-yellow-500';
      case 3: return 'bg-green-500';
      default: return 'bg-slate-200';
    }
  };

  if (!password) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-1.5"
    >
      <div className="flex gap-1 h-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`flex-1 rounded-full transition-all duration-300 ${strength > i ? getStrengthColor() : 'bg-slate-200'
              }`}
          />
        ))}
      </div>
      <p className="text-[10px] mt-1 text-slate-500">
        {t('Password strength:')} <span className="font-medium">{getStrengthText()}</span>
      </p>
      {strength === 1 && (
        <p className="text-[10px] text-red-400 mt-0.5">
          {t('Use 8+ chars with uppercase, number & symbol')}
        </p>
      )}
    </motion.div>
  );
};

// Social login button (placeholder)
interface SocialButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  color: string;
}

const SocialButton: React.FC<SocialButtonProps> = ({ icon: Icon, label, onClick, color }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border ${color} bg-white hover:bg-slate-50 transition-all duration-200 text-sm font-medium`}
  >
    <Icon size={18} />
    <span>{label}</span>
  </button>
);

// ============================================================================
// Animation variants
// ============================================================================
const containerVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

const errorVariants = {
  hidden: { opacity: 0, y: -10, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.95 },
};

// ============================================================================
// Hero-Style Pulse Background
// ============================================================================
const PULSE_CONFIG = [
  { x: 8, y: 12, size: 200, delay: 0, dur: 3.4, opacity: 0.25, color: "primary" },
  { x: 25, y: 65, size: 140, delay: 0.8, dur: 4.1, opacity: 0.18, color: "secondary" },
  { x: 50, y: 18, size: 260, delay: 1.5, dur: 3.8, opacity: 0.22, color: "primary" },
  { x: 75, y: 80, size: 180, delay: 0.3, dur: 5.0, opacity: 0.16, color: "secondary" },
  { x: 90, y: 30, size: 220, delay: 2.1, dur: 3.5, opacity: 0.20, color: "primary" },
  { x: 12, y: 88, size: 160, delay: 1.0, dur: 4.5, opacity: 0.18, color: "secondary" },
  { x: 60, y: 50, size: 300, delay: 2.7, dur: 3.2, opacity: 0.15, color: "primary" },
  { x: 40, y: 35, size: 120, delay: 0.5, dur: 4.8, opacity: 0.25, color: "secondary" },
  { x: 5, y: 50, size: 190, delay: 3.2, dur: 4.2, opacity: 0.18, color: "primary" },
  { x: 80, y: 10, size: 130, delay: 0.9, dur: 5.2, opacity: 0.20, color: "secondary" },
];

const PulseBackground = React.memo(() => {
  return (
    <>
      <style>{`
        @keyframes pulse-fade {
          0%, 100% { opacity: 0; } 50% { opacity: 1; }
        }
        .pulse-blob {
          animation: pulse-fade ease-in-out infinite;
          will-change: opacity;
        }
      `}</style>
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {PULSE_CONFIG.map((p, i) => (
          <div
            key={i}
            className="pulse-blob absolute rounded-full"
            style={{
              left: `${p.x}%`, top: `${p.y}%`,
              width: p.size, height: p.size,
              transform: "translate(-50%, -50%)",
              background: p.color === "primary"
                ? `radial-gradient(circle, rgba(99,102,241,${p.opacity}) 0%, rgba(79,70,229,${p.opacity * 0.5}) 42%, transparent 70%)` 
                : `radial-gradient(circle, rgba(236,72,153,${p.opacity}) 0%, rgba(219,39,119,${p.opacity * 0.5}) 42%, transparent 70%)`,
              filter: "blur(44px)",
              animationDuration: `${p.dur}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>
    </>
  );
});
PulseBackground.displayName = "PulseBackground";

// ============================================================================
// Main Component
// ============================================================================
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const usernameDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const { login, signUp, user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Passkey PIN Mode state
  const [pinMode, setPinMode] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [savedName, setSavedName] = useState('');
  const [savedAvatar, setSavedAvatar] = useState('');
  const [shake, setShake] = useState(false);

  // Fresh install profile selection states
  const [familyProfiles, setFamilyProfiles] = useState<any[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [showProfileSelector, setShowProfileSelector] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  // Load saved email, check if PIN login is active
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    const pinEnabled = localStorage.getItem('msfamily_passkey_pin_enabled') === 'true';
    const nameVal = localStorage.getItem('msfamily_user_name') || '';
    const avatarVal = localStorage.getItem('msfamily_user_avatar') || '';

    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }

    if (pinEnabled && savedEmail) {
      setPinMode(true);
      setSavedName(nameVal);
      setSavedAvatar(avatarVal);
    } else {
      setTimeout(() => emailInputRef.current?.focus(), 100);
    }
  }, []);

  // Clear error & confirm password when toggling mode
  const toggleMode = useCallback(() => {
    setIsLogin((prev) => !prev);
    setError('');
    setPassword('');
    setConfirmPassword('');
    if (!isLogin) {
      setFullName('');
      setUsername('');
      setUsernameAvailable(null);
    }
    setAcceptTerms(false);
  }, [isLogin]);

  // Real-time validation
  const validateForm = useCallback(() => {
    if (!email.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return 'Please enter a valid email address';
    if (!password) return 'Password is required';
    if (!isLogin) {
      if (fullName.trim().length < 2)
        return 'Full name must be at least 2 characters';
      if (username.trim().length > 0 && !/^[a-zA-Z0-9_]{3,20}$/.test(username.trim()))
        return 'Username must be 3-20 characters (letters, numbers, underscores)';
      if (username.trim() && usernameAvailable === false)
        return 'This username is already taken';
      if (password.length < 6)
        return 'Password must be at least 6 characters';
      if (password !== confirmPassword)
        return 'Passwords do not match';
      if (!acceptTerms)
        return 'You must accept the terms to continue';
    }
    return null;
  }, [email, password, confirmPassword, fullName, username, usernameAvailable, isLogin, acceptTerms]);

  const handleVerifyPin = useCallback(async (enteredPin: string) => {
    setLoading(true);
    setError('');
    try {
      const emailVal = email;
      if (!emailVal) {
        throw new Error(t('No user email selected.'));
      }

      // 1. Retrieve the encrypted password from the database using email and hashed PIN
      const hashedPin = await hashPin(enteredPin);
      const { data: encryptedPassword, error: rpcError } = await supabase.rpc('get_encrypted_password', {
        p_email: emailVal,
        p_pin_hash: hashedPin,
      });

      if (rpcError) {
        throw rpcError;
      }

      if (!encryptedPassword) {
        setError(t('Invalid PIN code'));
        setPinCode('');
        setShake(true);
        setTimeout(() => setShake(false), 500);
        return;
      }

      // 2. Decrypt the retrieved password using the entered PIN
      const decrypted = decryptPassword(encryptedPassword, enteredPin);
      if (!decrypted) {
        setError(t('Decryption failed. Please enter your email and password.'));
        setPinCode('');
        return;
      }

      // 3. Authenticate with Supabase using decrypted password
      await login(emailVal, decrypted);

      // 4. Save credentials locally for next times
      localStorage.setItem('rememberedEmail', emailVal);
      localStorage.setItem('msfamily_passkey_pin_enabled', 'true');
      localStorage.setItem('msfamily_encrypted_password', encryptedPassword);
      localStorage.setItem('msfamily_user_name', savedName);
      localStorage.setItem('msfamily_user_avatar', savedAvatar);

    } catch (err: any) {
      console.error('PIN verification error:', err);
      let msg = t('PIN login failed. Please use your password.');
      if (err.message) msg = err.message;
      setError(msg);
      setPinCode('');
    } finally {
      setLoading(false);
    }
  }, [login, email, savedName, savedAvatar, t]);

  const handleKeypadPress = useCallback((val: string) => {
    if (loading) return;
    setError('');

    if (val === 'delete') {
      setPinCode(prev => prev.slice(0, -1));
    } else if (val === 'clear') {
      setPinCode('');
    } else if (pinCode.length < 4) {
      const nextPin = pinCode + val;
      setPinCode(nextPin);
      if (nextPin.length === 4) {
        handleVerifyPin(nextPin);
      }
    }
  }, [pinCode, loading, handleVerifyPin]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const validationError = validateForm();
      if (validationError) {
        setError(validationError);
        return;
      }

      setLoading(true);
      setError('');

      try {
        if (isLogin) {
          await login(email, password);
          if (rememberMe) {
            localStorage.setItem('rememberedEmail', email);
          } else {
            localStorage.removeItem('rememberedEmail');
          }
        } else {
          await signUp(email, password, fullName.trim(), username.trim() || undefined);
          localStorage.removeItem('rememberedEmail');
        }
      } catch (err: any) {
        let message = 'Authentication failed. Please try again.';
        if (err.code === 'auth/user-not-found')
          message = 'No account found with this email.';
        else if (err.code === 'auth/wrong-password')
          message = 'Incorrect password.';
        else if (err.code === 'auth/email-already-in-use')
          message = 'Email already registered.';
        else if (err.code === 'auth/weak-password')
          message = 'Password is too weak.';
        else if (err.message) message = err.message;
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [email, password, fullName, isLogin, login, signUp, rememberMe, validateForm]
  );

  return (
    <div className="min-h-screen flex items-center justify-center relative px-4 bg-gradient-to-br from-slate-50 via-slate-100 to-white dark:from-[#0a0a14] dark:via-[#12121f] dark:to-[#0a0a14] transition-colors duration-300">
      {/* Hero-style pulsing random blobs */}
      <PulseBackground />

      {/* Clean dot grid (replaces the linear boxes) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none dark:opacity-40"
        style={{
          zIndex: 1,
          backgroundImage: "radial-gradient(rgba(99,102,241,0.06) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Radial soft highlight center */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none dark:hidden"
        style={{
          zIndex: 2,
          background: "radial-gradient(ellipse 70% 60% at 50% 45%, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none hidden dark:block"
        style={{
          zIndex: 2,
          background: "radial-gradient(ellipse 70% 60% at 50% 45%, rgba(10,10,20,0) 0%, rgba(10,10,20,0.8) 100%)",
        }}
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="p-6 sm:p-8 w-full max-w-[440px] z-10 relative"
      >
        {pinMode ? (
          /* ─── Passkey PIN Login View ─── */
          <div className="flex flex-col items-center w-full">
            {showProfileSelector ? (
              /* ─── Profile Selector View (Fresh Install) ─── */
              <div className="w-full animate-scale-in flex flex-col items-center">
                <div className="text-center mb-6 w-full">
                  <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-4 overflow-hidden">
                    <img
                      src="/mslogoinapp.png"
                      alt="MS Family Logo"
                      className="w-full h-full object-contain scale-90"
                      loading="eager"
                    />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    {t('Select Your Profile')}
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs font-semibold uppercase tracking-wider">
                    {t('To login with Passkey PIN')}
                  </p>
                </div>

                {/* Profiles Grid */}
                <div className="grid grid-cols-2 gap-4 w-full max-w-[340px] mt-2 mb-6">
                  {familyProfiles.map((prof) => (
                    <button
                      key={prof.id}
                      type="button"
                      onClick={() => {
                        setSelectedProfile(prof);
                        setSavedName(prof.name);
                        setSavedAvatar(prof.avatar);
                        setEmail(prof.email || '');
                        setShowProfileSelector(false);
                        setPinCode('');
                        setError('');
                      }}
                      className="flex flex-col items-center p-4 rounded-3xl glass-btn transition-all duration-300 hover:scale-105 active:scale-95 group relative"
                    >
                      {prof.avatar ? (
                        <div className="w-16 h-16 rounded-2xl border-2 border-primary-500/20 overflow-hidden shadow-md mb-2.5 transition-all group-hover:border-primary-500/50">
                          <img src={prof.avatar} alt={prof.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold text-xl shadow-md mb-2.5 transition-all">
                          {prof.name ? prof.name.charAt(0).toUpperCase() : <User size={24} />}
                        </div>
                      )}
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 text-center truncate w-full group-hover:text-primary-500 transition-colors">
                        {prof.name}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Go Back Option */}
                <button
                  type="button"
                  onClick={() => {
                    setPinMode(false);
                    setShowProfileSelector(false);
                    setError('');
                  }}
                  className="text-xs text-primary-400 hover:text-primary-350 transition-colors font-bold uppercase tracking-wider"
                >
                  {t('Use email & password instead')}
                </button>
              </div>
            ) : (
              /* ─── Numeric PIN Keypad Entry View ─── */
              <div className="flex flex-col items-center w-full">
                {/* Header / Avatar */}
                <div className="text-center mb-6 w-full animate-scale-in">
                  {savedAvatar ? (
                    <div className="w-20 h-20 mx-auto rounded-2xl border-2 border-primary-500/40 overflow-hidden shadow-lg mb-4">
                      <img src={savedAvatar} alt={savedName} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold text-3xl shadow-lg mb-4">
                      {savedName ? savedName.charAt(0).toUpperCase() : <User size={32} />}
                    </div>
                  )}
                  <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    {t('Welcome back')}{savedName ? `, ${savedName}` : ''}
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 mt-2 text-xs font-semibold uppercase tracking-wider">
                    {t('Enter Passkey PIN')}
                  </p>
                </div>

                {/* Error Alert */}
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div
                      key="error"
                      variants={errorVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="mb-4 w-full p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2.5 text-xs text-red-400"
                      role="alert"
                    >
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* PIN Dots Indicator */}
                <motion.div
                  animate={shake ? { x: [-10, 10, -10, 10, -5, 5, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  className="flex justify-center gap-4 my-6"
                >
                  {[0, 1, 2, 3].map((index) => (
                    <div
                      key={index}
                      className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                        pinCode.length > index
                          ? 'bg-primary-500 border-primary-500 scale-110 shadow-[0_0_8px_rgba(124,58,237,0.5)]'
                          : 'border-slate-350 dark:border-slate-650 bg-transparent'
                      }`}
                    />
                  ))}
                </motion.div>

                {/* Numeric Keypad (Glassmorphism layout) */}
                <div className="grid grid-cols-3 gap-3.5 w-full max-w-[280px] mt-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleKeypadPress(String(num))}
                      className="w-16 h-16 rounded-2xl glass-btn text-xl font-bold flex items-center justify-center mx-auto text-slate-800 dark:text-slate-200"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const pinEnabled = localStorage.getItem('msfamily_passkey_pin_enabled') === 'true';
                      if (!pinEnabled) {
                        setShowProfileSelector(true);
                      } else {
                        setPinMode(false);
                      }
                      setError('');
                      setPinCode('');
                    }}
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 hover:bg-slate-100/50 dark:hover:bg-white/5 transition-all active:scale-95"
                  >
                    {localStorage.getItem('msfamily_passkey_pin_enabled') === 'true' ? t('Cancel') : t('Back')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeypadPress('0')}
                    className="w-16 h-16 rounded-2xl glass-btn text-xl font-bold flex items-center justify-center mx-auto text-slate-800 dark:text-slate-200"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeypadPress('delete')}
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-slate-500 dark:text-slate-400 hover:text-slate-700 hover:bg-slate-100/50 dark:hover:bg-white/5 transition-all active:scale-95"
                    aria-label="Delete"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
                  </button>
                </div>

                {/* Switch Account Option */}
                <button
                  type="button"
                  onClick={() => {
                    setPinMode(false);
                    setError('');
                    setPinCode('');
                  }}
                  className="mt-8 text-xs text-primary-400 hover:text-primary-350 transition-colors font-bold uppercase tracking-wider"
                >
                  {t('Use email & password instead')}
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ─── Standard Email/Password Form View ─── */
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-4 overflow-hidden">
                <img
                  src="/mslogoinapp.png"
                  alt="MS Family Logo"
                  className="w-full h-full object-contain scale-90"
                  loading="eager"
                />
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight">
                <span className="text-gradient">MS {t('Family')}</span>
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium">
                {isLogin
                  ? t('Sign in to your family dashboard')
                  : t('Create your family account')}
              </p>
            </div>

            {/* Error Alert */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="error"
                  variants={errorVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2.5 text-sm text-red-400"
                  role="alert"
                >
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Full Name (Signup only) */}
              <AnimatePresence initial={false}>
                {!isLogin && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="relative overflow-hidden"
                  >
                    <div className="relative">
                      <User
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 z-10"
                        size={18}
                        aria-hidden="true"
                      />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={t('Full Name (e.g., Dad, Mom, Son)')}
                        className="input-field"
                        required
                        aria-label="Full name"
                        autoComplete="name"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Username (Signup only) */}
              <AnimatePresence initial={false}>
                {!isLogin && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="relative overflow-hidden"
                  >
                    <div className="relative">
                      <AtSign
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 z-10"
                        size={18}
                        aria-hidden="true"
                      />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => {
                          const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                          setUsername(val);
                          setUsernameAvailable(null);
                          if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current);
                          if (val.length >= 3) {
                            setUsernameChecking(true);
                            usernameDebounceRef.current = setTimeout(async () => {
                              try {
                                const { data } = await supabase
                                  .from('profiles')
                                  .select('id')
                                  .eq('username', val)
                                  .maybeSingle();
                                setUsernameAvailable(!data);
                              } catch {
                                setUsernameAvailable(null);
                              } finally {
                                setUsernameChecking(false);
                              }
                            }, 500);
                          } else {
                            setUsernameChecking(false);
                          }
                        }}
                        placeholder={t('Username (optional, e.g. arulprakash)')}
                        className="input-field !pr-10"
                        aria-label="Username"
                        autoComplete="username"
                        maxLength={20}
                      />
                      {/* Availability indicator */}
                      {username.length >= 3 && (
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 z-10">
                          {usernameChecking ? (
                            <Loader2 size={14} className="animate-spin text-slate-400" />
                          ) : usernameAvailable === true ? (
                            <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                            </div>
                          ) : usernameAvailable === false ? (
                            <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                              <X size={10} strokeWidth={3} className="text-white" />
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                    {username.length >= 3 && usernameAvailable === true && (
                      <p className="text-[10px] text-green-500 mt-0.5 pl-1">{t('Username available!')}</p>
                    )}
                    {username.length >= 3 && usernameAvailable === false && (
                      <p className="text-[10px] text-red-400 mt-0.5 pl-1">{t('Username already taken')}</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email */}
              <div className="relative">
                <Mail
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 z-10"
                  size={18}
                  aria-hidden="true"
                />
                <input
                  ref={emailInputRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('Email address')}
                  className="input-field !pr-10"
                  required
                  aria-label="Email address"
                  autoComplete="email"
                  disabled={loading}
                />
                {email && (
                  <button
                    type="button"
                    onClick={() => { setEmail(''); emailInputRef.current?.focus(); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-500 transition-colors z-10"
                    aria-label="Clear email"
                  >
                    <X size={12} strokeWidth={3} />
                  </button>
                )}
              </div>

              {/* Password */}
              <div className="relative">
                <Lock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 z-10"
                  size={18}
                  aria-hidden="true"
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('Password (min 6 characters)')}
                  className="input-field !pr-11"
                  required
                  aria-label="Password"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-700 transition-colors z-10 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                {!isLogin && <PasswordStrengthMeter password={password} />}
              </div>

              {/* Confirm Password (Signup only) */}
              <AnimatePresence initial={false}>
                {!isLogin && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="relative overflow-hidden"
                  >
                    <div className="relative">
                      <Shield
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 z-10"
                        size={18}
                      />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={t('Confirm password')}
                        className="input-field !pr-11"
                        required
                        aria-label="Confirm password"
                        autoComplete="new-password"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-700 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Remember Me & Forgot Password (Login only) */}
              {isLogin && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-primary-500 focus:ring-primary-500"
                    />
                    <span>{t('Remember me')}</span>
                  </label>
                  <button
                    type="button"
                    className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                    onClick={() => setError('Password reset not implemented in demo')}
                  >
                    {t('Forgot password?')}
                  </button>
                </div>
              )}

              {/* Terms & Conditions (Signup only) */}
              <AnimatePresence initial={false}>
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-start gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      id="terms"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-primary-500 focus:ring-primary-500"
                    />
                    <label htmlFor="terms" className="text-slate-600 dark:text-slate-400 text-xs">
                      {t('I agree to the')}{' '}
                      <button
                        type="button"
                        className="text-primary-400 hover:underline"
                        onClick={() => alert('Terms & Conditions would be shown here.')}
                      >
                        {t('Terms of Service')}
                      </button>{' '}
                      {t('and')}{' '}
                      <button
                        type="button"
                        className="text-primary-400 hover:underline"
                        onClick={() => alert('Privacy Policy would be shown here.')}
                      >
                        {t('Privacy Policy')}
                      </button>
                    </label>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full !mt-6 relative overflow-hidden group"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    {t('Processing...')}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    {isLogin ? t('Access Dashboard') : t('Create Account')}
                  </span>
                )}
              </button>

              {/* Passkey PIN Quick Login Button */}
              {isLogin && (
                <button
                  type="button"
                  disabled={profilesLoading}
                  onClick={async () => {
                    const pinEnabled = localStorage.getItem('msfamily_passkey_pin_enabled') === 'true';
                    if (pinEnabled) {
                      const nameVal = localStorage.getItem('msfamily_user_name') || '';
                      const avatarVal = localStorage.getItem('msfamily_user_avatar') || '';
                      const emailVal = localStorage.getItem('rememberedEmail') || '';
                      setSavedName(nameVal);
                      setSavedAvatar(avatarVal);
                      setEmail(emailVal);
                      setPinMode(true);
                      setPinCode('');
                      setError('');
                      setShowProfileSelector(false);
                    } else {
                      // Fresh install PIN login flow: fetch profiles from backend
                      setProfilesLoading(true);
                      setError('');
                      try {
                        const { data, error: rpcError } = await supabase.rpc('get_family_profiles');
                        if (rpcError) throw rpcError;
                        if (data && data.length > 0) {
                          setFamilyProfiles(data);
                          setShowProfileSelector(true);
                          setPinMode(true);
                        } else {
                          setError(t('No family profiles found. Please log in with password first.'));
                        }
                      } catch (err) {
                        console.error('Fetch profiles error:', err);
                        setError(t('Could not load family profiles. Please use email & password.'));
                      } finally {
                        setProfilesLoading(false);
                      }
                    }
                  }}
                  className="w-full mt-3 py-3 rounded-2xl glass-btn flex items-center justify-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  {profilesLoading ? (
                    <>
                      <Loader2 className="animate-spin text-primary-500" size={16} />
                      {t('Loading family profiles...')}
                    </>
                  ) : (
                    <>
                      <Lock size={16} className="text-primary-500" />
                      {t('Login with Passkey PIN')}
                    </>
                  )}
                </button>
              )}
            </form>

            {/* Toggle between Login and Signup */}
            <div className="mt-6 text-center">
              <button
                onClick={toggleMode}
                className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-2 py-1"
                aria-label={isLogin ? 'Switch to sign up' : 'Switch to sign in'}
              >
                {isLogin ? t("No account yet? ") : t("Already a member? ")}
                <span className="text-primary-400 hover:text-primary-350">
                  {isLogin ? t('Sign Up') : t('Sign In')}
                </span>
              </button>
            </div>

            {/* Info note */}
            <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800/50">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center leading-relaxed">
                {t('Sign up each family member (Shanmugasundaram, Arulprakash, Malathi, Subiksha) with unique emails. All members share the same financial dashboard.')}
              </p>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
