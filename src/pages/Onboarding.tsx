import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  User,
  Baby,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const AURORA_CONFIG = [
  { x: 10, y: 15, size: 650, hue: 'a', dur: 20, delay: 0, anim: 'aurora-drift-1' },
  { x: 85, y: 10, size: 600, hue: 'b', dur: 25, delay: 2, anim: 'aurora-drift-2' },
  { x: 50, y: 85, size: 700, hue: 'a', dur: 22, delay: 4, anim: 'aurora-drift-3' },
  { x: 90, y: 80, size: 550, hue: 'c', dur: 26, delay: 1, anim: 'aurora-drift-1' },
];

const AuroraBackground = React.memo(() => {
  return (
    <>
      <style>{`
        @keyframes aurora-drift-1 {
          0%, 100% { transform: translate(-50%, -50%) translate(0px, 0px) scale(1); }
          33% { transform: translate(-50%, -50%) translate(60px, -45px) scale(1.15); }
          66% { transform: translate(-50%, -50%) translate(-40px, 40px) scale(0.92); }
        }
        @keyframes aurora-drift-2 {
          0%, 100% { transform: translate(-50%, -50%) translate(0px, 0px) scale(1); }
          50% { transform: translate(-50%, -50%) translate(-50px, 60px) scale(1.2); }
        }
        @keyframes aurora-drift-3 {
          0%, 100% { transform: translate(-50%, -50%) translate(0px, 0px) scale(1); }
          50% { transform: translate(-50%, -50%) translate(50px, 50px) scale(1.1); }
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
      `}</style>
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {AURORA_CONFIG.map((p, i) => {
          const hueMap: Record<string, string> = {
            a: 'rgba(139, 92, 246, 0.26)',   // violet
            b: 'rgba(255, 105, 180, 0.22)',  // pink
            c: 'rgba(6, 182, 212, 0.24)',    // cyan
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
                filter: 'blur(75px)',
                animationName: p.anim,
                animationDuration: `${p.dur}s`,
                animationDelay: `${p.delay}s`,
                animationIterationCount: 'infinite',
                animationTimingFunction: 'ease-in-out',
              }}
            />
          );
        })}
      </div>
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

export default function Onboarding() {
  const [currentPage, setCurrentPage] = useState(0);
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Redirect to Login if already completed onboarding
  useEffect(() => {
    const completed = localStorage.getItem('hasCompletedOnboarding') === 'true';
    if (completed) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  const handleNext = () => {
    if (currentPage < 2) {
      setCurrentPage(prev => prev + 1);
    } else {
      handleCompleteOnboarding();
    }
  };

  const handlePrev = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleCompleteOnboarding = () => {
    localStorage.setItem('hasCompletedOnboarding', 'true');
    navigate('/login', { replace: true });
  };

  // Touch Swipe Handlers for mobile swiping
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const swipeThreshold = 55; // min swipe distance in px
    if (diff > swipeThreshold) {
      // Swiped Left -> Next
      if (currentPage < 2) setCurrentPage(prev => prev + 1);
    } else if (diff < -swipeThreshold) {
      // Swiped Right -> Prev
      if (currentPage > 0) setCurrentPage(prev => prev - 1);
    }
  };

  // Helper to dynamically render highlighted title keywords
  const renderTitle = (titleText: string) => {
    if (titleText.includes("MS Family")) {
      const parts = titleText.split("MS Family");
      return (
        <>
          {parts[0]}
          <span className="bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
            MS Family
          </span>
          {parts[1]}
        </>
      );
    }
    if (titleText.includes("Finance")) {
      const parts = titleText.split("Finance");
      return (
        <>
          <span className="bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
            {parts[0]}Finance
          </span>
          {parts[1]}
        </>
      );
    }
    if (titleText.includes("Security")) {
      const parts = titleText.split("Security");
      return (
        <>
          <span className="bg-gradient-to-r from-violet-500 to-primary-500 bg-clip-text text-transparent">
            {parts[0]}Security
          </span>
          {parts[1]}
        </>
      );
    }
    return titleText;
  };

  // Page definitions
  const pages = [
    {
      title: 'Welcome to MS Family',
      subtitle: t("Connect, collaborate, and manage your family's finances together in one secure, unified digital space."),
      illustration: (
        <div className="relative w-60 h-60 mx-auto flex items-center justify-center">
          {/* Concentric rotating orbits */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute inset-2 border border-dashed border-primary-500/20 rounded-full pointer-events-none"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
            className="absolute inset-8 border border-dashed border-secondary-500/10 rounded-full pointer-events-none"
          />
          
          {/* Central Family Hub Node with MS Family logo */}
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-20 h-20 rounded-full bg-white/60 dark:bg-white/[0.04] flex items-center justify-center p-3.5 shadow-[0_8px_32px_rgba(139,92,246,0.22)] border border-white/20 z-10"
            style={{
              backdropFilter: 'blur(20px) saturate(160%)',
              WebkitBackdropFilter: 'blur(20px) saturate(160%)',
            }}
          >
            <img
              src="/msfamilyinside.png"
              alt="MS Family Logo"
              className="w-full h-full object-contain drop-shadow-sm"
              loading="eager"
            />
          </motion.div>
          
          {/* Floating Member Nodes along Orbit */}
          {[
            { angle: 0, grad: 'from-emerald-500 to-teal-500', name: 'Dad', icon: User },
            { angle: 120, grad: 'from-amber-500 to-orange-500', name: 'Mom', icon: User },
            { angle: 240, grad: 'from-violet-500 to-indigo-500', name: 'Son', icon: Baby }
          ].map((node, i) => {
            const rad = (node.angle * Math.PI) / 180;
            const x = Math.cos(rad) * 98;
            const y = Math.sin(rad) * 98;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  x: [x, x + (i === 0 ? 3 : i === 1 ? -3 : 2), x],
                  y: [y, y - 5, y]
                }}
                transition={{
                  scale: { delay: 0.35 + i * 0.12 },
                  opacity: { delay: 0.35 + i * 0.12 },
                  x: { duration: 3.5 + i * 0.5, repeat: Infinity, ease: "easeInOut" },
                  y: { duration: 3.5 + i * 0.5, repeat: Infinity, ease: "easeInOut" }
                }}
                style={{
                  position: 'absolute',
                  left: 'calc(50% - 28px)',
                  top: 'calc(50% - 28px)',
                }}
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${node.grad} flex flex-col items-center justify-center shadow-lg border-2 border-white dark:border-slate-800 z-20 gap-0.5`}
              >
                <node.icon size={18} className="text-white drop-shadow-sm" />
                <span className="text-[9px] font-black text-white uppercase tracking-wider">{t(node.name)}</span>
              </motion.div>
            );
          })}
        </div>
      )
    },
    {
      title: 'Finance Management',
      subtitle: t('Track daily expenses, categorize transactions, set budget limits, and monitor upcoming bills with real-time statistics.'),
      illustration: (
        <div className="relative w-60 h-60 mx-auto flex flex-col justify-end p-4 border border-slate-200/40 dark:border-white/5 bg-white/40 dark:bg-white/[0.01] rounded-3xl overflow-hidden shadow-glass">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-emerald-500/5 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/20 pointer-events-none" />
          
          {/* Budget Progress Ring */}
          <div className="absolute top-5 left-5 flex items-center gap-3">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="24" cy="24" r="19" stroke="rgba(148,163,184,0.12)" strokeWidth="3.5" fill="transparent" />
                <motion.circle
                  cx="24"
                  cy="24"
                  r="19"
                  stroke="#10b981"
                  strokeWidth="3.5"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 19}
                  initial={{ strokeDashoffset: 2 * Math.PI * 19 }}
                  animate={{ strokeDashoffset: (2 * Math.PI * 19) * 0.28 }}
                  transition={{ duration: 1.6, delay: 0.2 }}
                  strokeLinecap="round"
                  className="drop-shadow-[0_0_6px_rgba(16,185,129,0.4)]"
                />
              </svg>
              <span className="absolute text-[9px] font-black text-slate-800 dark:text-white">72%</span>
            </div>
            <div className="text-left">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{t('Monthly Budget')}</p>
              <p className="text-[11px] font-black text-slate-700 dark:text-white leading-none">₹36k / ₹50k</p>
            </div>
          </div>

          {/* Interactive Chart Bars */}
          <div className="flex items-end justify-around h-24 gap-2 px-2 z-10">
            {[
              { height: 48, color: 'from-primary-500 to-primary-400', label: t('Food'), value: '₹4.5k' },
              { height: 72, color: 'from-emerald-500 to-emerald-400', label: t('Bills'), value: '₹12k' },
              { height: 32, color: 'from-violet-500 to-violet-400', label: t('Travel'), value: '₹2.8k' },
              { height: 60, color: 'from-amber-500 to-amber-400', label: t('Rent'), value: '₹15k' }
            ].map((bar, i) => (
              <div key={i} className="flex flex-col items-center flex-1">
                <div className="flex flex-col items-center w-full relative">
                  <motion.span
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 + i * 0.1 }}
                    className="text-[8px] font-black text-slate-500 dark:text-slate-450 mb-1"
                  >
                    {bar.value}
                  </motion.span>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: bar.height }}
                    transition={{ duration: 1, delay: 0.3 + i * 0.1, type: "spring", stiffness: 100 }}
                    className={`w-full rounded-t-lg bg-gradient-to-t ${bar.color} shadow-md`}
                  />
                </div>
                <span className="text-[9px] text-slate-400 mt-1.5 font-bold tracking-wide">{bar.label}</span>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      title: 'Security & Collaboration',
      subtitle: t('Receive smart AI suggestions to cut costs, forecast budget longevity, and share securely with end-to-end encryption.'),
      illustration: (
        <div className="relative w-60 h-60 mx-auto flex items-center justify-center">
          {/* Sonar Protection Radar Rings */}
          {[1, 2, 3].map((ring) => (
            <motion.div
              key={ring}
              initial={{ scale: 0.8, opacity: 0.6 }}
              animate={{
                scale: [0.8, 1.5, 1.8],
                opacity: [0.6, 0.2, 0]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: ring * 0.45,
                ease: "easeOut"
              }}
              className="absolute w-24 h-24 rounded-full border border-violet-500/20 pointer-events-none"
            />
          ))}

          {/* Glowing Aura */}
          <div 
            className="absolute w-28 h-28 bg-violet-500/5 rounded-full filter blur-md pointer-events-none animate-pulse" 
            style={{ animationDuration: '1s' }}
          />

          {/* Central Shield */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
            className="w-18 h-18 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-[0_8px_24px_rgba(124,58,237,0.3)] z-10 border border-white/20"
          >
            <ShieldCheck size={36} className="text-white" />
          </motion.div>

          {/* AI Insights Floating Bubbles */}
          {[
            { text: t("Saved 12%"), x: -68, y: -58, icon: TrendingUp, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-[0_4px_12px_rgba(16,185,129,0.1)]' },
            { text: t("AI Insight"), x: 68, y: -38, icon: Sparkles, color: 'text-primary-500 bg-primary-500/10 border-primary-500/20 shadow-[0_4px_12px_rgba(139,92,246,0.1)]' }
          ].map((bubble, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, x: 0, y: 0 }}
              animate={{
                scale: 1,
                x: bubble.x,
                y: [bubble.y - 4, bubble.y + 4, bubble.y - 4]
              }}
              transition={{
                scale: { delay: 0.25 + i * 0.1, type: "spring", stiffness: 120 },
                y: { duration: 1.8 + i * 0.3, repeat: Infinity, ease: "easeInOut" }
              }}
              style={{
                position: 'absolute',
                left: 'calc(50% - 48px)', // centered based on ~96px width
                top: 'calc(50% - 15px)'
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border bg-white/70 dark:bg-slate-900/40 backdrop-blur-md z-20 ${bubble.color}`}
            >
              <Sparkles size={11} />
              <span className="text-[9.5px] font-black tracking-wide uppercase leading-none">{bubble.text}</span>
            </motion.div>
          ))}
        </div>
      )
    }
  ];

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 bg-[#eef0f6] dark:bg-[#07070d] flex flex-col justify-between overflow-hidden p-6 z-[9999] transition-colors duration-500"
    >
      {/* Background gradients */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          background: 'linear-gradient(165deg, #f3f0fb 0%, #eef0f6 38%, #e6ecf7 100%)',
          animation: 'hue-pulse 18s ease-in-out infinite',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none hidden dark:block"
        style={{
          zIndex: 0,
          background: 'linear-gradient(165deg, #0b0a17 0%, #07070d 45%, #0a0d16 100%)',
          animation: 'hue-pulse 18s ease-in-out infinite',
        }}
      />

      <style>{`
        @keyframes hue-pulse {
          0%, 100% { filter: hue-rotate(0deg); }
          50% { filter: hue-rotate(15deg); }
        }
      `}</style>

      <AuroraBackground />

      {/* Refraction dot-grid overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 2,
          backgroundImage: 'radial-gradient(rgba(99,102,241,0.08) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse 60% 55% at 50% 42%, black 0%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 55% at 50% 42%, black 0%, transparent 75%)',
        }}
      />

      {/* ── Top Bar (Skip Button) ── */}
      <div className="flex justify-end items-center h-12 relative z-10">
        {currentPage < 2 ? (
          <button
            onClick={handleCompleteOnboarding}
            className="px-3.5 py-1.5 text-xs font-black text-slate-500 dark:text-slate-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors rounded-[12px] border border-slate-200/40 dark:border-white/5 bg-white/30 dark:bg-white/[0.02] backdrop-blur-md shadow-glass cursor-pointer"
          >
            {t('Skip')}
          </button>
        ) : null}
      </div>

      {/* ── Main Sliding Content Pod (Apple Glass visionOS panel style) ── */}
      <div className="flex-1 flex items-center justify-center w-full max-w-md mx-auto relative z-10 px-2 sm:px-4">
        <div 
          className="w-full border rounded-[40px] p-6 sm:p-8 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300"
          style={{
            background: document.documentElement.classList.contains('dark')
              ? 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.005))'
              : 'linear-gradient(180deg, rgba(255,255,255,0.45), rgba(255,255,255,0.15))',
            borderColor: document.documentElement.classList.contains('dark')
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(255,255,255,0.5)',
            backdropFilter: 'blur(30px) saturate(160%)',
            WebkitBackdropFilter: 'blur(30px) saturate(160%)',
            boxShadow: document.documentElement.classList.contains('dark')
              ? '0 32px 64px -16px rgba(0,0,0,0.45), inset 0 1.5px 0 rgba(255,255,255,0.05)'
              : '0 32px 64px -16px rgba(99,102,241,0.05), inset 0 1.5px 0 rgba(255,255,255,0.7)',
          }}
        >
          {/* Specular glass edge highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
          
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, x: 60, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -60, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 120, damping: 14 }}
              className="w-full space-y-6 flex flex-col items-center"
            >
              {/* Illustration */}
              <div className="h-60 flex items-center justify-center relative w-full">
                {pages[currentPage].illustration}
              </div>

              {/* Typography Description */}
              <div className="space-y-2.5">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-800 dark:text-white leading-tight">
                  {renderTitle(t(pages[currentPage].title))}
                </h2>
                <p className="text-[11.5px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-[280px] mx-auto font-medium">
                  {pages[currentPage].subtitle}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Bottom Controls ── */}
      <div className="max-w-md w-full mx-auto flex flex-col gap-5 items-center pt-4 pb-4 relative z-10">
        {/* Dot Indicators */}
        <div className="flex items-center justify-center gap-2">
          {pages.map((_, i) => (
            <motion.div
              key={i}
              onClick={() => setCurrentPage(i)}
              animate={{
                width: currentPage === i ? 24 : 8,
                backgroundColor: currentPage === i ? '#8b5cf6' : 'rgba(148,163,184,0.3)',
                boxShadow: currentPage === i ? '0 0 10px rgba(139,92,246,0.5)' : 'none'
              }}
              transition={{ type: "spring", stiffness: 150, damping: 14 }}
              className="h-2 rounded-full cursor-pointer"
            />
          ))}
        </div>

        {/* Action Button Row */}
        <div className="flex justify-between items-center w-full px-4">
          {/* Previous Button */}
          <div className="w-20">
            {currentPage > 0 ? (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1.5 py-2 px-3 rounded-[12px] text-xs font-extrabold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-350 transition-colors border border-transparent hover:border-slate-200/40 dark:hover:border-white/5 bg-transparent hover:bg-white/30 dark:hover:bg-white/[0.02] cursor-pointer"
              >
                <ChevronLeft size={15} />
                {t('Prev')}
              </button>
            ) : null}
          </div>

          {/* Next / Get Started Button (Apple Glass UI style) ── */}
          <motion.button
            whileTap={{ scale: 0.965 }}
            onClick={handleNext}
            className="flex items-center justify-center gap-1.5 px-6 py-3 rounded-2xl text-slate-800 dark:text-white font-black text-xs uppercase tracking-wider cursor-pointer transition-all duration-300 border border-white/40 dark:border-white/15 relative overflow-hidden"
            style={{
              background: document.documentElement.classList.contains('dark')
                ? 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))'
                : 'linear-gradient(180deg, rgba(255,255,255,0.5), rgba(255,255,255,0.2))',
              backdropFilter: 'blur(24px) saturate(140%)',
              WebkitBackdropFilter: 'blur(24px) saturate(140%)',
              boxShadow: document.documentElement.classList.contains('dark')
                ? 'inset 0 1px 1px rgba(255,255,255,0.08), 0 8px 32px 0 rgba(0,0,0,0.18)'
                : 'inset 0 1px 1px rgba(255,255,255,0.65), 0 8px 32px 0 rgba(0,0,0,0.05)',
            }}
          >
            {/* Specular overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/25 pointer-events-none" />
            
            {currentPage === 2 ? (
              <>
                {t('Get Started')}
                <ArrowRight size={14} />
              </>
            ) : (
              <>
                {t('Next')}
                <ChevronRight size={14} />
              </>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
