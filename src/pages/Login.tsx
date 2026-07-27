import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
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
  ArrowRight,
  Check,
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Variants } from 'framer-motion';
import { APP_INFO_DOCS } from '../data/appInfoDocs';

// Apple's "spring-like" ease curve, typed as a literal tuple so Framer
// Motion's strict Variants type accepts it (a plain number[] does not).
const APPLE_EASE = [0.16, 1, 0.3, 1] as const;

// ============================================================================
// Password Strength Meter — glass pill segments
// ============================================================================
interface PasswordStrengthMeterProps {
  password?: string;
}

const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password }) => {
  const { t } = useLanguage();
  const isDark = document.documentElement.classList.contains('dark');
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
      case 1: return 'linear-gradient(90deg, #ff5f56, #ff8a65)';
      case 2: return 'linear-gradient(90deg, #ffb020, #ffd060)';
      case 3: return 'linear-gradient(90deg, #30d158, #64e08a)';
      default: return 'transparent';
    }
  };

  if (!password) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -6, height: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="mt-2 overflow-hidden"
    >
      <div className="flex gap-1 h-[3px]">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex-1 rounded-full overflow-hidden"
            style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(120,120,140,0.18)' }}
          >
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: strength > i ? '100%' : '0%' }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: i * 0.04 }}
              style={{ background: getStrengthColor() }}
            />
          </div>
        ))}
      </div>
      <p className="text-[10.5px] mt-1.5 tracking-wide text-slate-500 dark:text-slate-400">
        {t('Password strength:')}{' '}
        <span className="font-semibold text-slate-600 dark:text-slate-300">
          {getStrengthText()}
        </span>
      </p>
      {strength === 1 && (
        <p className="text-[10.5px] mt-0.5 text-red-500 dark:text-red-400">
          {t('Use 8+ chars with uppercase, number & symbol')}
        </p>
      )}
    </motion.div>
  );
};

// Kept for API compatibility — not rendered in this layout, but preserved
// so any external references to SocialButton continue to resolve.
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
const containerVariants: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.965 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.7, ease: APPLE_EASE },
  },
};

const errorVariants: Variants = {
  hidden: { opacity: 0, y: -8, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.97 },
};

const fieldVariants: Variants = {
  hidden: { height: 0, opacity: 0 },
  visible: { height: 'auto', opacity: 1 },
  exit: { height: 0, opacity: 0 },
};

// ============================================================================
// Ambient Aurora Background — softly drifting light fields behind the glass.
// Liquid Glass reads correctly only when there is something optically
// interesting underneath it to bend and refract.
// ============================================================================
const AURORA_CONFIG = [
  { x: 14, y: 18, size: 520, hue: 'a', dur: 22, delay: 0 },
  { x: 82, y: 12, size: 460, hue: 'b', dur: 26, delay: 2 },
  { x: 50, y: 85, size: 560, hue: 'a', dur: 24, delay: 4 },
  { x: 88, y: 78, size: 420, hue: 'c', dur: 28, delay: 1 },
  { x: 8, y: 72, size: 400, hue: 'b', dur: 20, delay: 3 },
];

const AuroraBackground = React.memo(() => {
  return (
    <>
      <style>{`
        @keyframes aurora-drift-1 {
          0%, 100% { transform: translate(-50%, -50%) translate(0px, 0px) scale(1); }
          33% { transform: translate(-50%, -50%) translate(40px, -30px) scale(1.08); }
          66% { transform: translate(-50%, -50%) translate(-25px, 25px) scale(0.95); }
        }
        @keyframes aurora-drift-2 {
          0%, 100% { transform: translate(-50%, -50%) translate(0px, 0px) scale(1); }
          50% { transform: translate(-50%, -50%) translate(-45px, 35px) scale(1.1); }
        }
        @keyframes grain-shift {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-1%, -1%); }
          30% { transform: translate(1%, 1%); }
          50% { transform: translate(-1%, 1%); }
          70% { transform: translate(1%, -1%); }
          90% { transform: translate(-1%, -1%); }
        }
        .aurora-blob {
          will-change: transform;
        }
        .aurora-blob:nth-child(odd) {
          animation-name: aurora-drift-1;
        }
        .aurora-blob:nth-child(even) {
          animation-name: aurora-drift-2;
        }
      `}</style>
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {AURORA_CONFIG.map((p, i) => {
          const hueMap: Record<string, string> = {
            a: 'rgba(94,92,230,0.32)',   // indigo-violet
            b: 'rgba(255,105,180,0.22)', // warm pink
            c: 'rgba(64,200,224,0.24)',  // cyan
          };
          return (
            <div
              key={i}
              className="aurora-blob absolute rounded-full"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.size,
                height: p.size,
                transform: 'translate(-50%, -50%)',
                background: `radial-gradient(circle, ${hueMap[p.hue]} 0%, transparent 68%)`,
                filter: 'blur(60px)',
                animationDuration: `${p.dur}s`,
                animationDelay: `${p.delay}s`,
                animationIterationCount: 'infinite',
                animationTimingFunction: 'ease-in-out',
              }}
            />
          );
        })}
      </div>
      {/* Fine film-grain noise — keeps large blurred gradients from banding,
          and is part of what makes Liquid Glass feel physically real rather
          than like a flat CSS blur. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-[0.035] dark:opacity-[0.05]"
        style={{
          zIndex: 1,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          animation: 'grain-shift 8s steps(8) infinite',
        }}
      />
    </>
  );
});
AuroraBackground.displayName = 'AuroraBackground';

// ============================================================================
// Glass Field — a reusable Liquid Glass input wrapper.
// Real Liquid Glass = a bright specular top edge, a soft inner shadow that
// reads as "recessed", a subtle chromatic rim, and a focus state that
// blooms rather than just changing a border color.
// ============================================================================
interface GlassFieldWrapperProps {
  children: React.ReactNode;
  focused: boolean;
}

const GlassFieldWrapper: React.FC<GlassFieldWrapperProps> = ({ children, focused }) => {
  const isDark = document.documentElement.classList.contains('dark');

  const lightBg = focused
    ? 'linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0.28))'
    : 'linear-gradient(180deg, rgba(255,255,255,0.38), rgba(255,255,255,0.16))';
  const darkBg = focused
    ? 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.05))'
    : 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))';

  const lightShadow = focused
    ? 'inset 0 1px 1px rgba(255,255,255,0.9), inset 0 -1px 6px rgba(255,255,255,0.4), 0 0 0 1.5px rgba(120,110,255,0.55), 0 4px 24px rgba(99,102,241,0.18)'
    : 'inset 0 1px 1px rgba(255,255,255,0.7), inset 0 -1px 4px rgba(0,0,0,0.02), 0 0 0 1px rgba(255,255,255,0.5)';
  const darkShadow = focused
    ? 'inset 0 1px 1px rgba(255,255,255,0.08), inset 0 -1px 6px rgba(0,0,0,0.2), 0 0 0 1.5px rgba(120,110,255,0.6), 0 4px 24px rgba(99,102,241,0.25)'
    : 'inset 0 1px 1px rgba(255,255,255,0.05), inset 0 -1px 4px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.08)';

  return (
    <div
      className="relative rounded-[18px] transition-all duration-300 ease-out"
      style={{
        background: isDark ? darkBg : lightBg,
        backdropFilter: isDark ? 'blur(20px) saturate(120%)' : undefined,
        WebkitBackdropFilter: isDark ? 'blur(20px) saturate(120%)' : undefined,
        boxShadow: isDark ? darkShadow : lightShadow,
      }}
    >
      {children}
    </div>
  );
};

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
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const { login, signUp, user } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();
  const isRecoveryMode = searchParams.get('type') === 'recovery';

  // Forgot password states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  // Password reset (recovery mode) states
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotError(t('Email is required'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      setForgotError(t('Please enter a valid email address'));
      return;
    }

    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/login?type=recovery`,
      });

      if (error) {
        throw error;
      }

      setForgotSuccess(t('Password reset email sent! Please check your inbox.'));
    } catch (err: any) {
      setForgotError(err.message || t('Failed to send reset link. Please try again.'));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      setResetError(t('Password is required'));
      return;
    }
    if (newPassword.length < 6) {
      setResetError(t('Password must be at least 6 characters'));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setResetError(t('Passwords do not match'));
      return;
    }

    setResetLoading(true);
    setResetError('');
    setResetSuccess('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      setResetSuccess(t('Password updated successfully!'));
      setTimeout(() => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('type');
        setSearchParams(nextParams);
        navigate('/', { replace: true });
      }, 2000);
    } catch (err: any) {
      setResetError(err.message || t('Failed to reset password. Please try again.'));
    } finally {
      setResetLoading(false);
    }
  };
  const { t } = useLanguage();
  const navigate = useNavigate();
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Focus-tracking for the Liquid Glass field bloom effect
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Pointer-reactive specular highlight on the card itself
  const cardRef = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState({ x: 50, y: 20 });

  const handleCardPointerMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPointer({ x, y });
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !isRecoveryMode) {
      console.log('[AuthFlow] Dashboard Navigation - User logged in, navigating to dashboard...');
      navigate('/', { replace: true });
    }
  }, [user, navigate, isRecoveryMode]);

  // Redirect to Onboarding if first launch and not completed
  useEffect(() => {
    const completed = localStorage.getItem('hasCompletedOnboarding') === 'true';
    if (!completed) {
      navigate('/onboarding', { replace: true });
    }
  }, [navigate]);

  // Load saved email
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');

    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
    setTimeout(() => emailInputRef.current?.focus(), 100);
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

  const handleGoogleLogin = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const platform = Capacitor.getPlatform();
      const isNative = Capacitor.isNativePlatform();
      const redirectTo = isNative
        ? 'msfamily://callback'
        : window.location.origin;

      console.log('[AuthFlow] ═══════════════════════════════════════');
      console.log('[AuthFlow] Step 1: OAuth Started');
      console.log('[AuthFlow]   Platform:', platform);
      console.log('[AuthFlow]   isNativePlatform():', isNative);
      console.log('[AuthFlow]   redirectTo:', redirectTo);
      console.log('[AuthFlow] ═══════════════════════════════════════');

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: isNative,
          queryParams: isNative ? {
            client_id: '476989919442-1tbtgjdc6fknvrsujhf9dgbfuq2ga3tk.apps.googleusercontent.com',
            access_type: 'offline',
            prompt: 'consent'
          } : {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });

      if (error) throw error;

      console.log('[AuthFlow] Step 2: signInWithOAuth returned');
      console.log('[AuthFlow]   data.url:', data?.url);
      console.log('[AuthFlow]   skipBrowserRedirect:', isNative);

      // Verify the redirect_to parameter in the generated URL
      if (data?.url) {
        try {
          const oauthUrl = new URL(data.url);
          const redirectParam = oauthUrl.searchParams.get('redirect_to');
          console.log('[AuthFlow]   redirect_to param in URL:', redirectParam);
          if (redirectParam !== 'msfamily://callback' && isNative) {
            console.error('[AuthFlow] ⚠️ WARNING: redirect_to is NOT msfamily://callback!');
            console.error('[AuthFlow]   This means Supabase will redirect to:', redirectParam);
          }
        } catch (parseErr) {
          console.warn('[AuthFlow]   Could not parse OAuth URL:', parseErr);
        }
      }

      if (isNative && data?.url) {
        console.log('[AuthFlow] Step 3: Opening Browser Custom Tab...');
        await Browser.open({ url: data.url, windowName: '_self' });
        console.log('[AuthFlow] Step 3: Browser.open() completed');
      }
    } catch (err: any) {
      console.error('[AuthFlow] OAuth error:', err);
      setError(err.message || t('Google authentication failed.'));
      setLoading(false);
    }
  }, [t]);

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
    <div className="min-h-screen flex items-center justify-center relative px-4 py-10 overflow-hidden bg-[#eef0f6] dark:bg-[#07070d] transition-colors duration-500">
      {/* Base gradient wash beneath the aurora — gives Liquid Glass something
          bright to sample at the top and something deep to sample lower down */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          background:
            'linear-gradient(165deg, #f3f0fb 0%, #eef0f6 38%, #e6ecf7 100%)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none hidden dark:block"
        style={{
          zIndex: 0,
          background: 'linear-gradient(165deg, #0b0a17 0%, #07070d 45%, #0a0d16 100%)',
        }}
      />

      <AuroraBackground />

      {/* Fine dot-grid — sits above aurora, below glass, giving the glass
          blur something crisp+small to soften, which sells the refraction */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 2,
          backgroundImage: 'radial-gradient(rgba(99,102,241,0.10) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse 60% 55% at 50% 42%, black 0%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 55% at 50% 42%, black 0%, transparent 75%)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none hidden dark:block"
        style={{
          zIndex: 2,
          backgroundImage: 'radial-gradient(rgba(150,150,255,0.08) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse 60% 55% at 50% 42%, black 0%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 55% at 50% 42%, black 0%, transparent 75%)',
        }}
      />

      {/* ================================================================
          THE GLASS CARD
          Liquid Glass anatomy, back to front:
          1. Outer ambient shadow (soft, large, low opacity — "floating")
          2. backdrop-blur + saturate layer (the actual glass substrate)
          3. Inner top specular highlight (bright hairline, like light
             catching a lens edge)
          4. Pointer-reactive radial sheen (moves with cursor — the
             "liquid" part of Liquid Glass)
          5. Content, laid on top with its own micro-glass treatment
             on interactive elements
          ================================================================ */}
      <motion.div
        ref={cardRef}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        onMouseMove={handleCardPointerMove}
        className="w-full max-w-[440px] z-10 relative"
      >
          {/* ============================== CONTENT ============================== */}
          <div className="relative px-6 sm:px-8 py-8 sm:py-10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="relative mb-6 inline-block">
                <div
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%)',
                    filter: 'blur(28px)',
                    transform: 'scale(1.3)',
                  }}
                />
                <div
                  className="w-24 h-24 mx-auto rounded-[28px] flex items-center justify-center p-4 relative z-10 transition-transform duration-500 hover:scale-[1.04] hover:-rotate-1"
                  style={{
                    background: document.documentElement.classList.contains('dark')
                      ? 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))'
                      : 'linear-gradient(180deg, rgba(255,255,255,0.85), rgba(255,255,255,0.55))',
                    backdropFilter: 'blur(20px) saturate(160%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(160%)',
                    boxShadow: document.documentElement.classList.contains('dark')
                      ? 'inset 0 1px 1px rgba(255,255,255,0.1), inset 0 -1px 4px rgba(0,0,0,0.2), 0 16px 32px -8px rgba(99,102,241,0.35), 0 0 0 1px rgba(255,255,255,0.1)'
                      : 'inset 0 1px 1px rgba(255,255,255,0.95), inset 0 -1px 4px rgba(0,0,0,0.03), 0 16px 32px -8px rgba(99,102,241,0.28), 0 0 0 1px rgba(255,255,255,0.6)',
                  }}
                >
                  <img
                    src="/msfamilyinside.png"
                    alt="MS Family Logo"
                    className="w-full h-full object-contain drop-shadow-sm"
                    loading="eager"
                  />
                </div>
              </div>

              <h2 className="text-[28px] leading-tight font-bold tracking-tight text-slate-900 dark:text-white">
                MS{' '}
                <span
                  style={{
                    backgroundImage:
                      'linear-gradient(90deg, #6366f1, #a855f7 55%, #ec4899)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  {t('Family')}
                </span>
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2 text-[13.5px] font-medium tracking-wide">
                {isRecoveryMode ? t('Set a new password for your account') : t('Sign in to your family dashboard')}
              </p>
            </div>

            {/* Error Alert — glass, not flat */}
            <AnimatePresence mode="wait">
              {error && isLogin && (
                <motion.div
                  key="error"
                  variants={errorVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="mb-5 px-4 py-3 rounded-2xl flex items-center gap-2.5 text-[13px] text-red-500 dark:text-red-300"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(255,90,90,0.14), rgba(255,90,90,0.06))',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    boxShadow:
                      'inset 0 1px 1px rgba(255,255,255,0.4), 0 0 0 1px rgba(255,90,90,0.18)',
                  }}
                  role="alert"
                >
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span className="font-medium">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Google Sign In Button (Primary Login Option) */}
            <motion.button
              type="button"
              disabled={loading}
              onClick={handleGoogleLogin}
              whileHover={{ scale: loading ? 1 : 1.012 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className="w-full py-[14px] rounded-[18px] font-semibold text-slate-800 dark:text-slate-200 relative overflow-hidden group mb-5 flex items-center justify-center gap-3 transition-all border border-slate-200 dark:border-white/[0.08] text-[14.5px] tracking-wide cursor-pointer"
              style={{
                background: document.documentElement.classList.contains('dark')
                  ? 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6))',
                boxShadow: document.documentElement.classList.contains('dark')
                  ? 'inset 0 1px 1px rgba(255,255,255,0.08), 0 4px 12px rgba(0,0,0,0.15)'
                  : 'inset 0 1px 1px rgba(255,255,255,0.95), 0 4px 12px rgba(99,102,241,0.05)',
              }}
            >
              {/* Google Colored Icon */}
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              <span className="relative z-10 font-bold">{t('Continue with Google')}</span>
            </motion.button>

            {/* Separator */}
            <div className="flex items-center gap-3 mb-5 select-none">
              <div className="flex-1 h-px bg-slate-200/60 dark:bg-white/[0.08]" />
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                {t('or sign in with email')}
              </span>
              <div className="flex-1 h-px bg-slate-200/60 dark:bg-white/[0.08]" />
            </div>

            {isRecoveryMode ? (
              <form onSubmit={handleResetPassword} className="space-y-3.5" noValidate>
                {/* Reset Error Alert */}
                {resetError && (
                  <div
                    className="px-4 py-3 rounded-2xl flex items-center gap-2.5 text-[13px] text-red-500 dark:text-red-300"
                    style={{
                      background: 'linear-gradient(180deg, rgba(255,90,90,0.14), rgba(255,90,90,0.06))',
                      boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.4), 0 0 0 1px rgba(255,90,90,0.18)',
                    }}
                    role="alert"
                  >
                    <AlertCircle size={16} className="flex-shrink-0" />
                    <span className="font-medium">{resetError}</span>
                  </div>
                )}

                {/* Reset Success Alert */}
                {resetSuccess && (
                  <div
                    className="px-4 py-3 rounded-2xl flex items-center gap-2.5 text-[13px] text-emerald-500 dark:text-emerald-300"
                    style={{
                      background: 'linear-gradient(180deg, rgba(16,185,129,0.14), rgba(16,185,129,0.06))',
                      boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.4), 0 0 0 1px rgba(16,185,129,0.18)',
                    }}
                    role="alert"
                  >
                    <Check size={16} className="flex-shrink-0" />
                    <span className="font-medium">{resetSuccess}</span>
                  </div>
                )}

                {/* New Password */}
                <div>
                  <GlassFieldWrapper focused={focusedField === 'newPassword'}>
                    <div className="relative flex items-center">
                      <Lock
                        className="absolute left-4 text-slate-400 dark:text-slate-500 transition-colors z-10 pointer-events-none"
                        size={17}
                        style={{ color: focusedField === 'newPassword' ? '#6366f1' : undefined }}
                      />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        onFocus={() => setFocusedField('newPassword')}
                        onBlur={() => setFocusedField(null)}
                        placeholder={t('New password (min 6 characters)')}
                        className="w-full bg-transparent pl-11 pr-11 py-3.5 text-[14.5px] font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-normal focus:outline-none rounded-[18px] disabled:opacity-50"
                        required
                        aria-label="New password"
                        autoComplete="new-password"
                        disabled={resetLoading || !!resetSuccess}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        className="absolute right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors z-10 focus:outline-none"
                      >
                        {showNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </GlassFieldWrapper>
                  <PasswordStrengthMeter password={newPassword} />
                </div>

                {/* Confirm New Password */}
                <GlassFieldWrapper focused={focusedField === 'confirmNewPassword'}>
                  <div className="relative flex items-center">
                    <Shield
                      className="absolute left-4 text-slate-400 dark:text-slate-500 transition-colors z-10 pointer-events-none"
                      size={17}
                      style={{ color: focusedField === 'confirmNewPassword' ? '#6366f1' : undefined }}
                    />
                    <input
                      type={showConfirmNewPassword ? 'text' : 'password'}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      onFocus={() => setFocusedField('confirmNewPassword')}
                      onBlur={() => setFocusedField(null)}
                      placeholder={t('Confirm new password')}
                      className="w-full bg-transparent pl-11 pr-11 py-3.5 text-[14.5px] font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-normal focus:outline-none rounded-[18px] disabled:opacity-50"
                      required
                      aria-label="Confirm new password"
                      autoComplete="new-password"
                      disabled={resetLoading || !!resetSuccess}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmNewPassword((prev) => !prev)}
                      className="absolute right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors z-10 focus:outline-none"
                    >
                      {showConfirmNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </GlassFieldWrapper>

                {/* Submit Reset Button */}
                <motion.button
                  type="submit"
                  disabled={resetLoading || !!resetSuccess}
                  whileHover={{ scale: resetLoading || !!resetSuccess ? 1 : 1.012 }}
                  whileTap={{ scale: resetLoading || !!resetSuccess ? 1 : 0.98 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full py-[15px] rounded-[18px] font-semibold text-white relative overflow-hidden group mt-4 flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none text-[14.5px] tracking-wide"
                  style={{
                    background: 'linear-gradient(155deg, #818cf8 0%, #6366f1 45%, #a855f7 100%)',
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.5), inset 0 -2px 8px rgba(0,0,0,0.12), 0 12px 28px -6px rgba(99,102,241,0.5), 0 4px 12px -2px rgba(168,85,247,0.3)',
                  }}
                >
                  <span
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                      background: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.25) 48%, transparent 65%)',
                    }}
                  />
                  {resetLoading ? (
                    <span className="flex items-center justify-center gap-2 relative z-10">
                      <Loader2 size={17} className="animate-spin" />
                      {t('Updating password...')}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5 relative z-10">
                      {t('Update Password')}
                      <ArrowRight size={16} />
                    </span>
                  )}
                </motion.button>

                {/* Cancel / Back to Login */}
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={async () => {
                      await supabase.auth.signOut();
                      const nextParams = new URLSearchParams(searchParams);
                      nextParams.delete('type');
                      setSearchParams(nextParams);
                    }}
                    className="text-[13px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors font-medium focus:outline-none"
                  >
                    {t('Back to Sign In')}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
                {/* Email */}
                <GlassFieldWrapper focused={focusedField === 'email'}>
                  <div className="relative flex items-center">
                    <Mail
                      className="absolute left-4 text-slate-400 dark:text-slate-500 transition-colors z-10 pointer-events-none"
                      size={17}
                      style={{ color: focusedField === 'email' ? '#6366f1' : undefined }}
                      aria-hidden="true"
                    />
                    <input
                      ref={emailInputRef}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      placeholder={t('Email address')}
                      className="w-full bg-transparent pl-11 pr-11 py-3.5 text-[14.5px] font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-normal focus:outline-none rounded-[18px] disabled:opacity-50"
                      required
                      aria-label="Email address"
                      autoComplete="email"
                      disabled={loading}
                    />
                    {email && (
                      <button
                        type="button"
                        onClick={() => { setEmail(''); emailInputRef.current?.focus(); }}
                        className="absolute right-3.5 w-5 h-5 flex items-center justify-center rounded-full text-slate-500 dark:text-slate-400 transition-all z-10 hover:scale-110 active:scale-95"
                        style={{
                          background: document.documentElement.classList.contains('dark')
                            ? 'rgba(255,255,255,0.12)'
                            : 'rgba(120,120,140,0.14)',
                        }}
                        aria-label="Clear email"
                      >
                        <X size={11} strokeWidth={3} />
                      </button>
                    )}
                  </div>
                </GlassFieldWrapper>

                {/* Password */}
                <GlassFieldWrapper focused={focusedField === 'password'}>
                  <div className="relative flex items-center">
                    <Lock
                      className="absolute left-4 text-slate-400 dark:text-slate-500 transition-colors z-10 pointer-events-none"
                      size={17}
                      style={{ color: focusedField === 'password' ? '#6366f1' : undefined }}
                      aria-hidden="true"
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      placeholder={t('Password (min 6 characters)')}
                      className="w-full bg-transparent pl-11 pr-11 py-3.5 text-[14.5px] font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-normal focus:outline-none rounded-[18px] disabled:opacity-50"
                      required
                      aria-label="Password"
                      autoComplete="current-password"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors z-10 focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </GlassFieldWrapper>

                {/* Remember Me & Forgot Password (Login only) */}
                <div className="flex items-center justify-between pt-1 px-0.5">
                  <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer group select-none">
                    <span className="relative flex items-center justify-center w-[18px] h-[18px]">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="peer sr-only"
                      />
                      <span
                        className="w-[18px] h-[18px] rounded-[6px] transition-all duration-200 flex items-center justify-center peer-focus-visible:ring-2 peer-focus-visible:ring-primary-400"
                        style={{
                          background: rememberMe
                            ? 'linear-gradient(160deg, #818cf8, #6366f1)'
                            : document.documentElement.classList.contains('dark')
                              ? 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))'
                              : 'linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0.3))',
                          boxShadow: rememberMe
                            ? '0 2px 8px rgba(99,102,241,0.4), inset 0 1px 1px rgba(255,255,255,0.4)'
                            : document.documentElement.classList.contains('dark')
                              ? 'inset 0 1px 1px rgba(255,255,255,0.06), 0 0 0 1px rgba(255,255,255,0.12)'
                              : 'inset 0 1px 1px rgba(255,255,255,0.7), 0 0 0 1px rgba(120,120,140,0.22)',
                        }}
                      >
                        {rememberMe && <Check size={12} strokeWidth={3.5} className="text-white" />}
                      </span>
                    </span>
                    <span className="text-[12.5px] font-medium group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">
                      {t('Remember me')}
                    </span>
                  </label>
                  <button
                    type="button"
                    className="text-[12.5px] font-semibold transition-colors cursor-pointer"
                    style={{ color: '#6366f1' }}
                    onClick={() => setShowForgotModal(true)}
                  >
                    {t('Forgot password?')}
                  </button>
                </div>

                {/* Submit Button — Access Dashboard */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.012 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full py-[15px] rounded-[18px] font-semibold text-white relative overflow-hidden group mt-2 flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none text-[14.5px] tracking-wide"
                  style={{
                    background: 'linear-gradient(155deg, #818cf8 0%, #6366f1 45%, #a855f7 100%)',
                    boxShadow:
                      'inset 0 1px 1px rgba(255,255,255,0.5), inset 0 -2px 8px rgba(0,0,0,0.12), 0 12px 28px -6px rgba(99,102,241,0.5), 0 4px 12px -2px rgba(168,85,247,0.3)',
                  }}
                >
                  <span
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                      background:
                        'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.25) 48%, transparent 65%)',
                    }}
                  />
                  {loading ? (
                    <span className="flex items-center justify-center gap-2 relative z-10">
                      <Loader2 size={17} className="animate-spin" />
                      {t('Processing...')}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5 relative z-10">
                      {t('Access Dashboard')}
                      <ArrowRight
                        size={16}
                        className="transition-transform duration-300 group-hover:translate-x-0.5"
                      />
                    </span>
                  )}
                </motion.button>
              </form>
            )}

            {/* Toggle between Login and Signup */}
            <div className="mt-6 text-center">
              <button
                onClick={toggleMode}
                className="text-[13px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors font-medium focus:outline-none rounded-lg px-2 py-1"
                aria-label="Switch to sign up"
              >
                {t('No account yet? ')}
                <span className="font-semibold" style={{ color: '#6366f1' }}>
                  {t('Sign Up')}
                </span>
              </button>
            </div>

            {/* Info note */}
            <div
              className="mt-6 pt-4"
              style={{ borderTop: document.documentElement.classList.contains('dark')
                ? '1px solid rgba(255,255,255,0.06)'
                : '1px solid rgba(120,120,140,0.14)' }}
            >
              <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center leading-relaxed font-medium">
                {t('Sign up each family member with unique emails. All members share the same financial dashboard.')}
              </p>
            </div>
          </div>
      </motion.div>

      {/* ================================================================
          THE SIGN UP DIALOG BOX MODAL
          Rendered when isLogin is false, overlaying the blurred login card.
          ================================================================ */}
      <AnimatePresence>
        {!isLogin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ duration: 0.35, ease: APPLE_EASE }}
              className="relative w-full max-w-[440px] glass-thick rounded-[28px] overflow-hidden shadow-2xl my-auto"
            >
              {/* Close X Button */}
              <button
                type="button"
                onClick={toggleMode}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200 transition-colors z-20 rounded-full p-2 bg-slate-100/50 dark:bg-white/[0.08] hover:scale-105 active:scale-95 focus:outline-none"
                aria-label="Close registration"
              >
                <X size={17} />
              </button>

              <div className="relative px-6 sm:px-8 py-8 sm:py-10 max-h-[82vh] overflow-y-auto glass-scroll">
                {/* Header */}
                <div className="text-center mb-6">
                  <div className="relative mb-5 inline-block">
                    <div
                      className="w-16 h-16 mx-auto rounded-[20px] flex items-center justify-center p-3 relative z-10"
                      style={{
                        background: document.documentElement.classList.contains('dark')
                          ? 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))'
                          : 'linear-gradient(180deg, rgba(255,255,255,0.85), rgba(255,255,255,0.55))',
                        boxShadow: document.documentElement.classList.contains('dark')
                          ? 'inset 0 1px 1px rgba(255,255,255,0.1), 0 8px 20px rgba(0,0,0,0.3)'
                          : 'inset 0 1px 1px rgba(255,255,255,0.95), 0 8px 20px rgba(99,102,241,0.08)',
                      }}
                    >
                      <img
                        src="/msfamilyinside.png"
                        alt="MS Family Logo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>

                  <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {t('Create account')}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 mt-1 text-[13px] font-medium">
                    {t('Create your family account')}
                  </p>
                </div>

                {/* Error Alert — nested in modal */}
                {error && !isLogin && (
                  <div
                    className="mb-5 px-4 py-3 rounded-2xl flex items-center gap-2.5 text-[13px] text-red-500 dark:text-red-300"
                    style={{
                      background: 'linear-gradient(180deg, rgba(255,90,90,0.14), rgba(255,90,90,0.06))',
                      boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.4), 0 0 0 1px rgba(255,90,90,0.18)',
                    }}
                    role="alert"
                  >
                    <AlertCircle size={16} className="flex-shrink-0" />
                    <span className="font-medium">{error}</span>
                  </div>
                )}

                {/* Google OAuth (Inside Modal Option too) */}
                <motion.button
                  type="button"
                  disabled={loading}
                  onClick={handleGoogleLogin}
                  whileHover={{ scale: loading ? 1 : 1.012 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  className="w-full py-3 rounded-[16px] font-semibold text-slate-800 dark:text-slate-200 relative overflow-hidden group mb-5 flex items-center justify-center gap-3 transition-all border border-slate-200 dark:border-white/[0.08] text-[13.5px]"
                  style={{
                    background: document.documentElement.classList.contains('dark')
                      ? 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))'
                      : 'linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6))',
                  }}
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                  <span className="font-bold">{t('Continue with Google')}</span>
                </motion.button>

                {/* Separator */}
                <div className="flex items-center gap-3 mb-5 select-none">
                  <div className="flex-1 h-px bg-slate-200/60 dark:bg-white/[0.08]" />
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {t('or sign up with email')}
                  </span>
                  <div className="flex-1 h-px bg-slate-200/60 dark:bg-white/[0.08]" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
                  {/* Full Name */}
                  <GlassFieldWrapper focused={focusedField === 'fullName'}>
                    <div className="relative flex items-center">
                      <User
                        className="absolute left-4 text-slate-400 dark:text-slate-500 transition-colors z-10 pointer-events-none"
                        size={17}
                        style={{ color: focusedField === 'fullName' ? '#6366f1' : undefined }}
                      />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        onFocus={() => setFocusedField('fullName')}
                        onBlur={() => setFocusedField(null)}
                        placeholder={t('Full Name (e.g., Dad, Mom, Son)')}
                        className="w-full bg-transparent pl-11 pr-4 py-3 text-[14px] font-medium text-slate-800 dark:text-slate-100 focus:outline-none rounded-[18px]"
                        required
                        autoComplete="name"
                      />
                    </div>
                  </GlassFieldWrapper>

                  {/* Username */}
                  <GlassFieldWrapper focused={focusedField === 'username'}>
                    <div className="relative flex items-center">
                      <AtSign
                        className="absolute left-4 text-slate-400 dark:text-slate-500 transition-colors z-10 pointer-events-none"
                        size={17}
                        style={{ color: focusedField === 'username' ? '#6366f1' : undefined }}
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
                        onFocus={() => setFocusedField('username')}
                        onBlur={() => setFocusedField(null)}
                        placeholder={t('Username (optional, e.g. JOHI)')}
                        className="w-full bg-transparent pl-11 pr-11 py-3 text-[14px] font-medium text-slate-800 dark:text-slate-100 focus:outline-none rounded-[18px]"
                        maxLength={20}
                      />
                      {username.length >= 3 && (
                        <div className="absolute right-4 z-10 flex items-center justify-center">
                          {usernameChecking ? (
                            <Loader2 size={14} className="animate-spin text-slate-400" />
                          ) : usernameAvailable === true ? (
                            <div className="w-[18px] h-[18px] rounded-full flex items-center justify-center bg-emerald-500">
                              <Check size={11} strokeWidth={3} className="text-white" />
                            </div>
                          ) : usernameAvailable === false ? (
                            <div className="w-[18px] h-[18px] rounded-full flex items-center justify-center bg-rose-500">
                              <X size={11} strokeWidth={3} className="text-white" />
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </GlassFieldWrapper>

                  {/* Email */}
                  <GlassFieldWrapper focused={focusedField === 'email'}>
                    <div className="relative flex items-center">
                      <Mail
                        className="absolute left-4 text-slate-400 dark:text-slate-500 transition-colors z-10 pointer-events-none"
                        size={17}
                        style={{ color: focusedField === 'email' ? '#6366f1' : undefined }}
                      />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
                        placeholder={t('Email address')}
                        className="w-full bg-transparent pl-11 pr-4 py-3 text-[14px] font-medium text-slate-800 dark:text-slate-100 focus:outline-none rounded-[18px]"
                        required
                        autoComplete="email"
                      />
                    </div>
                  </GlassFieldWrapper>

                  {/* Password */}
                  <div>
                    <GlassFieldWrapper focused={focusedField === 'password'}>
                      <div className="relative flex items-center">
                        <Lock
                          className="absolute left-4 text-slate-400 dark:text-slate-500 transition-colors z-10 pointer-events-none"
                          size={17}
                          style={{ color: focusedField === 'password' ? '#6366f1' : undefined }}
                        />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onFocus={() => setFocusedField('password')}
                          onBlur={() => setFocusedField(null)}
                          placeholder={t('Password (min 6 characters)')}
                          className="w-full bg-transparent pl-11 pr-11 py-3 text-[14px] font-medium text-slate-800 dark:text-slate-100 focus:outline-none rounded-[18px]"
                          required
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none"
                        >
                          {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                    </GlassFieldWrapper>
                    <PasswordStrengthMeter password={password} />
                  </div>

                  {/* Confirm Password */}
                  <GlassFieldWrapper focused={focusedField === 'confirmPassword'}>
                    <div className="relative flex items-center">
                      <Shield
                        className="absolute left-4 text-slate-400 dark:text-slate-500 transition-colors z-10 pointer-events-none"
                        size={17}
                        style={{ color: focusedField === 'confirmPassword' ? '#6366f1' : undefined }}
                      />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onFocus={() => setFocusedField('confirmPassword')}
                        onBlur={() => setFocusedField(null)}
                        placeholder={t('Confirm password')}
                        className="w-full bg-transparent pl-11 pr-11 py-3 text-[14px] font-medium text-slate-800 dark:text-slate-100 focus:outline-none rounded-[18px]"
                        required
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none"
                      >
                        {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </GlassFieldWrapper>

                  {/* Terms & Conditions */}
                  <div className="flex items-start gap-2.5 text-sm pt-1">
                    <span className="relative flex items-center justify-center w-[18px] h-[18px] mt-0.5 flex-shrink-0">
                      <input
                        type="checkbox"
                        id="modal-terms"
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
                        className="peer sr-only"
                      />
                      <label
                        htmlFor="modal-terms"
                        className="w-[18px] h-[18px] rounded-[6px] transition-all duration-200 flex items-center justify-center cursor-pointer"
                        style={{
                          background: acceptTerms
                            ? 'linear-gradient(160deg, #818cf8, #6366f1)'
                            : document.documentElement.classList.contains('dark')
                              ? 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))'
                              : 'linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0.3))',
                          boxShadow: acceptTerms
                            ? '0 2px 8px rgba(99,102,241,0.4), inset 0 1px 1px rgba(255,255,255,0.4)'
                            : document.documentElement.classList.contains('dark')
                              ? 'inset 0 1px 1px rgba(255,255,255,0.06), 0 0 0 1px rgba(255,255,255,0.12)'
                              : 'inset 0 1px 1px rgba(255,255,255,0.7), 0 0 0 1px rgba(120,120,140,0.22)',
                        }}
                      >
                        {acceptTerms && <Check size={12} strokeWidth={3.5} className="text-white" />}
                      </label>
                    </span>
                    <label htmlFor="modal-terms" className="text-slate-600 dark:text-slate-400 text-[12.5px] leading-relaxed cursor-pointer">
                      {t('I agree to the')}{' '}
                      <button
                        type="button"
                        className="font-semibold hover:underline"
                        style={{ color: '#818cf8' }}
                        onClick={() => setActiveDocId('terms')}
                      >
                        {t('Terms of Service')}
                      </button>{' '}
                      {t('and')}{' '}
                      <button
                        type="button"
                        className="font-semibold hover:underline"
                        style={{ color: '#818cf8' }}
                        onClick={() => setActiveDocId('privacy')}
                      >
                        {t('Privacy Policy')}
                      </button>
                    </label>
                  </div>

                  {/* Create Account Button */}
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: loading ? 1 : 1.012 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                    className="w-full py-3.5 rounded-[18px] font-semibold text-white relative overflow-hidden flex items-center justify-center gap-2 mt-4"
                    style={{
                      background: 'linear-gradient(155deg, #818cf8 0%, #6366f1 45%, #a855f7 100%)',
                      boxShadow: '0 12px 28px -6px rgba(99,102,241,0.5)',
                    }}
                  >
                    {loading ? (
                      <Loader2 size={17} className="animate-spin" />
                    ) : (
                      <span className="flex items-center justify-center gap-1.5">
                        {t('Create Account')}
                        <ArrowRight size={16} />
                      </span>
                    )}
                  </motion.button>
                </form>

                {/* Back to Sign In button */}
                <div className="mt-6 text-center">
                  <button
                    onClick={toggleMode}
                    className="text-[13px] text-slate-500 dark:text-slate-400 hover:text-slate-900 transition-colors font-medium focus:outline-none px-2 py-1"
                  >
                    {t('Already a member? ')}
                    <span className="font-semibold" style={{ color: '#6366f1' }}>
                      {t('Sign In')}
                    </span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Terms & Privacy Doc Viewer Modal */}
      <AnimatePresence>
        {activeDocId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ duration: 0.35, ease: APPLE_EASE }}
              className="relative w-full max-w-[480px] glass-thick rounded-[28px] overflow-hidden shadow-2xl my-auto border border-white/10 dark:border-white/[0.08]"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setActiveDocId(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200 transition-colors z-20 rounded-full p-2 bg-slate-100/50 dark:bg-white/[0.08] hover:scale-105 active:scale-95 focus:outline-none"
                aria-label="Close document"
              >
                <X size={17} />
              </button>

              <div className="relative px-6 sm:px-8 py-8 sm:py-10 max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="mb-5 shrink-0 pr-8">
                  <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                    {t(APP_INFO_DOCS[activeDocId]?.title || '')}
                  </h3>
                  {APP_INFO_DOCS[activeDocId]?.subtitle && (
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold mt-1 uppercase tracking-wider">
                      {t(APP_INFO_DOCS[activeDocId]?.subtitle || '')}
                    </p>
                  )}
                  {APP_INFO_DOCS[activeDocId]?.lastUpdated && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-medium">
                      {t('Last Updated')}: {t(APP_INFO_DOCS[activeDocId]?.lastUpdated || '')}
                    </p>
                  )}
                </div>

                {/* Content Container */}
                <div className="flex-1 overflow-y-auto glass-scroll space-y-4 pr-1">
                  {APP_INFO_DOCS[activeDocId]?.sections.map((section, idx) => (
                    <div
                      key={idx}
                      className="p-4 sm:p-5 bg-white/[0.6] dark:bg-white/[0.03] backdrop-blur-md border border-white/60 dark:border-white/[0.05] rounded-[18px] shadow-[0_2px_12px_rgba(0,0,0,0.015)]"
                    >
                      <h4 className="text-[13.5px] font-bold text-slate-800 dark:text-slate-200 mb-2 leading-tight">
                        {t(section.title)}
                      </h4>
                      {Array.isArray(section.content) ? (
                        <div className="space-y-1.5">
                          {section.content.map((line, lIdx) => (
                            <p key={lIdx} className="text-[12px] leading-relaxed text-slate-600 dark:text-slate-400 font-medium">
                              {t(line)}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[12px] leading-relaxed text-slate-600 dark:text-slate-400 font-medium">
                          {t(section.content)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Footer Close Button */}
                <div className="mt-6 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveDocId(null)}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-[14px] shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all duration-100"
                  >
                    {t('Close')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ duration: 0.35, ease: APPLE_EASE }}
              className="relative w-full max-w-[420px] glass-thick rounded-[28px] overflow-hidden shadow-2xl my-auto border border-white/10 dark:border-white/[0.08]"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(false);
                  setForgotEmail('');
                  setForgotError('');
                  setForgotSuccess('');
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200 transition-colors z-20 rounded-full p-2 bg-slate-100/50 dark:bg-white/[0.08] hover:scale-105 active:scale-95 focus:outline-none"
                aria-label="Close"
              >
                <X size={17} />
              </button>

              <div className="relative px-6 sm:px-8 py-8 sm:py-10">
                {/* Header */}
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto rounded-[20px] flex items-center justify-center bg-indigo-500/10 mb-4">
                    <Mail size={28} className="text-indigo-500" />
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {t('Forgot Password?')}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-[13px] leading-relaxed">
                    {t("Enter your email and we'll send you a link to reset your password.")}
                  </p>
                </div>

                {/* Error Alert */}
                {forgotError && (
                  <div
                    className="mb-5 px-4 py-3 rounded-2xl flex items-center gap-2.5 text-[13px] text-red-500 dark:text-red-300"
                    style={{
                      background: 'linear-gradient(180deg, rgba(255,90,90,0.14), rgba(255,90,90,0.06))',
                      boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.4), 0 0 0 1px rgba(255,90,90,0.18)',
                    }}
                    role="alert"
                  >
                    <AlertCircle size={16} className="flex-shrink-0" />
                    <span className="font-medium">{forgotError}</span>
                  </div>
                )}

                {/* Success Alert */}
                {forgotSuccess && (
                  <div
                    className="mb-5 px-4 py-3 rounded-2xl flex items-center gap-2.5 text-[13px] text-emerald-500 dark:text-emerald-300"
                    style={{
                      background: 'linear-gradient(180deg, rgba(16,185,129,0.14), rgba(16,185,129,0.06))',
                      boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.4), 0 0 0 1px rgba(16,185,129,0.18)',
                    }}
                    role="alert"
                  >
                    <Check size={16} className="flex-shrink-0" />
                    <span className="font-medium">{forgotSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleForgotSubmit} className="space-y-4" noValidate>
                  {/* Email Input */}
                  <GlassFieldWrapper focused={focusedField === 'forgotEmail'}>
                    <div className="relative flex items-center">
                      <Mail
                        className="absolute left-4 text-slate-400 dark:text-slate-500 transition-colors z-10 pointer-events-none"
                        size={17}
                        style={{ color: focusedField === 'forgotEmail' ? '#6366f1' : undefined }}
                      />
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        onFocus={() => setFocusedField('forgotEmail')}
                        onBlur={() => setFocusedField(null)}
                        placeholder={t('Email address')}
                        className="w-full bg-transparent pl-11 pr-4 py-3 text-[14px] font-medium text-slate-800 dark:text-slate-100 focus:outline-none rounded-[18px]"
                        required
                        disabled={forgotLoading || !!forgotSuccess}
                      />
                    </div>
                  </GlassFieldWrapper>

                  {/* Submit Button */}
                  <motion.button
                    type="submit"
                    disabled={forgotLoading || !!forgotSuccess}
                    whileHover={{ scale: forgotLoading || !!forgotSuccess ? 1 : 1.012 }}
                    whileTap={{ scale: forgotLoading || !!forgotSuccess ? 1 : 0.98 }}
                    className="w-full py-3.5 rounded-[18px] font-semibold text-white relative overflow-hidden flex items-center justify-center gap-2 mt-4"
                    style={{
                      background: 'linear-gradient(155deg, #818cf8 0%, #6366f1 45%, #a855f7 100%)',
                      boxShadow: '0 12px 28px -6px rgba(99,102,241,0.5)',
                    }}
                  >
                    {forgotLoading ? (
                      <Loader2 size={17} className="animate-spin" />
                    ) : (
                      <span className="flex items-center justify-center gap-1.5">
                        {t('Send Reset Link')}
                        <ArrowRight size={16} />
                      </span>
                    )}
                  </motion.button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}