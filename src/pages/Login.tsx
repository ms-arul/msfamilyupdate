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
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

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

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  // Load saved email if "remember me" was checked
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
    emailInputRef.current?.focus();
  }, []);

  // Clear error & confirm password when toggling mode
  const toggleMode = useCallback(() => {
    setIsLogin((prev) => !prev);
    setError('');
    setPassword('');
    setConfirmPassword('');
    if (!isLogin) setFullName('');
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
      if (password.length < 6)
        return 'Password must be at least 6 characters';
      if (password !== confirmPassword)
        return 'Passwords do not match';
      if (!acceptTerms)
        return 'You must accept the terms to continue';
    }
    return null;
  }, [email, password, confirmPassword, fullName, isLogin, acceptTerms]);

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
          await signUp(email, password, fullName.trim());
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
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 flex items-center justify-center shadow-glow-primary dark:shadow-none mb-4 relative overflow-hidden border border-slate-200 dark:border-slate-800/50">
            <img
              src="/mslogo.png"
              alt="MS Family Logo"
              className="w-full h-full object-contain scale-90 dark:hidden"
              loading="eager"
            />
            <img
              src="/mslogodark.png"
              alt="MS Family Logo"
              className="w-full h-full object-contain scale-90 hidden dark:block"
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
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-700 transition-colors z-10 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
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
        </form>

        {/* Toggle between Login and Signup */}
        <div className="mt-6 text-center">
          <button
            onClick={toggleMode}
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-2 py-1"
            aria-label={isLogin ? 'Switch to sign up' : 'Switch to sign in'}
          >
            {isLogin ? t("No account yet? ") : t("Already a member? ")}
            <span className="text-primary-400 hover:text-primary-300">
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
      </motion.div>
    </div>
  );
}
