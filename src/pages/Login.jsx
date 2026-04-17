import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Lock,
  Mail,
  AlertCircle,
  Sparkles,
  Eye,
  EyeOff,
  CheckCircle,
  Shield,
  Smartphone,
  Github,
  Chrome,
} from 'lucide-react';

// ============================================================================
// Subcomponents
// ============================================================================
const PasswordStrengthMeter = ({ password }) => {
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
      case 1: return 'Weak';
      case 2: return 'Medium';
      case 3: return 'Strong';
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
        Password strength: <span className="font-medium">{getStrengthText()}</span>
      </p>
      {strength === 1 && (
        <p className="text-[10px] text-red-400 mt-0.5">
          Use 8+ chars with uppercase, number & symbol
        </p>
      )}
    </motion.div>
  );
};

// Social login button (placeholder)
const SocialButton = ({ icon: Icon, label, onClick, color }) => (
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
  const { login, signUp } = useAuth();
  const navigate = useNavigate();
  const emailInputRef = useRef(null);

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
    async (e) => {
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
        navigate('/');
      } catch (err) {
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
    [email, password, fullName, isLogin, login, signUp, navigate, rememberMe, validateForm]
  );

  // Demo credentials helper
  const fillDemoCredentials = () => {
    setEmail('demo@msfamily.com');
    setPassword('demo123456');
    setError('');
  };

  // Social login placeholder (mock)
  const handleSocialLogin = (provider) => {
    setError(`${provider} login not implemented in demo. Use email/password.`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      {/* Animated background particles (simplified) */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-300 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-secondary-300 rounded-full blur-[100px] animate-pulse delay-1000" />
      </div>

      {/* Grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
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
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center shadow-glow-primary mb-4 relative overflow-hidden border border-slate-200">
            <img
              src="/mslogo.png"
              alt="MS Family Logo"
              className="w-16 h-16 object-contain"
              loading="eager"
            />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight">
            <span className="text-gradient">MS Family</span>
          </h2>
          <p className="text-slate-500 mt-2 text-sm font-medium">
            {isLogin
              ? 'Sign in to your family dashboard'
              : 'Create your family account'}
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
                    placeholder="Full Name (e.g., Dad, Mom, Son)"
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
              placeholder="Email address"
              className="input-field"
              required
              aria-label="Email address"
              autoComplete="email"
              disabled={loading}
            />
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
              placeholder="Password (min 6 characters)"
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
                    placeholder="Confirm password"
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
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-primary-500 focus:ring-primary-500"
                />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                onClick={() => setError('Password reset not implemented in demo')}
              >
                Forgot password?
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
                  className="mt-0.5 rounded border-slate-300 text-primary-500 focus:ring-primary-500"
                />
                <label htmlFor="terms" className="text-slate-600 text-xs">
                  I agree to the{' '}
                  <button
                    type="button"
                    className="text-primary-400 hover:underline"
                    onClick={() => alert('Terms & Conditions would be shown here.')}
                  >
                    Terms of Service
                  </button>{' '}
                  and{' '}
                  <button
                    type="button"
                    className="text-primary-400 hover:underline"
                    onClick={() => alert('Privacy Policy would be shown here.')}
                  >
                    Privacy Policy
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
                Processing...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Sparkles size={18} />
                {isLogin ? 'Access Dashboard' : 'Create Account'}
              </span>
            )}
          </button>
        </form>

        {/* Toggle between Login and Signup */}
        <div className="mt-6 text-center">
          <button
            onClick={toggleMode}
            className="text-sm text-slate-500 hover:text-slate-900 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-2 py-1"
            aria-label={isLogin ? 'Switch to sign up' : 'Switch to sign in'}
          >
            {isLogin ? "No account yet? " : "Already a member? "}
            <span className="text-primary-400 hover:text-primary-300">
              {isLogin ? 'Sign Up' : 'Sign In'}
            </span>
          </button>
        </div>

        {/* Info note */}
        <div className="mt-5 pt-4 border-t border-border">
          <p className="text-[11px] text-gray-600 text-center leading-relaxed">
            Sign up each family member (Shanmugasundaram, Arulprakash, Malathi, Subiksha) with unique emails.
            All members share the same financial dashboard.
          </p>
        </div>
      </motion.div>
    </div>
  );
}