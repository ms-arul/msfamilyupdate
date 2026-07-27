import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const SplashScreen: React.FC = () => {
  const [splashTilt, setSplashTilt] = useState({ x: 0, y: 0 });
  const [isSplashPressed, setIsSplashPressed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // 1. Initial state: MS Family static (0ms - 800ms)
    // 2. At 800ms: Expand to "Management Service for Family"
    const t1 = setTimeout(() => setIsExpanded(true), 800);
    // 3. At 2400ms: Collapse back to MS Family
    const t2 = setTimeout(() => setIsExpanded(false), 2400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const handleSplashMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const deltaX = x / (rect.width / 2);
    const deltaY = y / (rect.height / 2);
    setSplashTilt({ x: -deltaY * 20, y: deltaX * 20 });
  };

  const handleSplashTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left - rect.width / 2;
    const y = touch.clientY - rect.top - rect.height / 2;
    const deltaX = x / (rect.width / 2);
    const deltaY = y / (rect.height / 2);
    setSplashTilt({ x: -deltaY * 20, y: deltaX * 20 });
  };

  const resetSplashTilt = () => {
    setSplashTilt({ x: 0, y: 0 });
    setIsSplashPressed(false);
  };

  return (
    <div 
      onMouseMove={handleSplashMouseMove}
      onTouchMove={handleSplashTouchMove}
      onMouseLeave={resetSplashTilt}
      onTouchEnd={resetSplashTilt}
      onMouseDown={() => setIsSplashPressed(true)}
      onMouseUp={() => setIsSplashPressed(false)}
      onTouchStart={() => setIsSplashPressed(true)}
      className="absolute inset-0 z-50 bg-white dark:bg-black flex flex-col items-center justify-center overflow-hidden"
    >
      <style>{`
        @keyframes progress-slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>

      {/* Main content */}
      <div className="flex flex-col items-center justify-center gap-7 select-none relative z-10">
        
        {/* Logo with Apple-style glass container */}
        <motion.div 
          style={{ perspective: 1200 }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            animate={{ 
              rotateX: splashTilt.x, 
              rotateY: splashTilt.y,
              scale: isSplashPressed ? 0.93 : 1 
            }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="relative flex items-center justify-center cursor-pointer"
          >
            {/* Apple-style glass container */}
            <div 
              className="w-20 h-20 rounded-[22px] flex items-center justify-center relative overflow-hidden bg-gray-100/80 dark:bg-[#1c1c1e] border border-gray-200/60 dark:border-white/[0.06]"
              style={{
                boxShadow: 'var(--glass-shadow, 0 4px 24px rgba(0,0,0,0.06))',
              }}
            >
              {/* Top shine — light mode only */}
              <div 
                className="absolute top-0 left-0 right-0 h-1/2 rounded-t-[22px] pointer-events-none bg-gradient-to-b from-white/40 to-transparent dark:from-white/[0.04] dark:to-transparent"
              />

              {/* Logo image */}
              <img
                src="/msfamilyinside.png"
                alt="MS Family"
                className="w-14 h-14 object-contain relative z-10"
                loading="eager"
              />
            </div>
          </motion.div>
        </motion.div>

        {/* Text: "M[anagement] S[ervice] [for ]Family" */}
        <motion.div 
          className="flex flex-col items-center gap-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center justify-center select-none relative px-4">
            <div className="flex items-baseline relative z-10" style={{ fontFamily: "'Inter', 'SF Pro Display', -apple-system, system-ui, sans-serif" }}>
              {/* 'M' + 'anagement' */}
              <div className="flex items-baseline">
                <span 
                  className="text-black dark:text-white font-black text-2xl sm:text-3xl"
                  style={{ letterSpacing: '-0.02em' }}
                >
                  M
                </span>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.span
                      initial={{ opacity: 0, maxWidth: 0, x: 12, scaleX: 0.8, filter: 'blur(10px)' }}
                      animate={{ opacity: 1, maxWidth: '280px', x: 0, scaleX: 1, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, maxWidth: 0, x: -12, scaleX: 0.8, filter: 'blur(10px)' }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      style={{ transformOrigin: 'left center' }}
                      className="inline-block overflow-hidden whitespace-nowrap text-black dark:text-white font-semibold tracking-tight pr-1 text-xl sm:text-2xl"
                    >
                      anagement
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {/* Spacer */}
              <span className="w-1.5" />

              {/* 'S' + 'ervice' */}
              <div className="flex items-baseline">
                <span 
                  className="text-black dark:text-white font-black text-2xl sm:text-3xl"
                  style={{ letterSpacing: '-0.02em' }}
                >
                  S
                </span>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.span
                      initial={{ opacity: 0, maxWidth: 0, x: 12, scaleX: 0.8, filter: 'blur(10px)' }}
                      animate={{ opacity: 1, maxWidth: '200px', x: 0, scaleX: 1, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, maxWidth: 0, x: -12, scaleX: 0.8, filter: 'blur(10px)' }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      style={{ transformOrigin: 'left center' }}
                      className="inline-block overflow-hidden whitespace-nowrap text-black dark:text-white font-semibold tracking-tight pr-1 text-xl sm:text-2xl"
                    >
                      ervice
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {/* Spacer before 'for' */}
              <span className="w-1.5" />

              {/* 'for' — only visible during expansion */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.span
                    initial={{ opacity: 0, maxWidth: 0, filter: 'blur(8px)' }}
                    animate={{ opacity: 0.5, maxWidth: '60px', filter: 'blur(0px)' }}
                    exit={{ opacity: 0, maxWidth: 0, filter: 'blur(8px)' }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
                    className="inline-block overflow-hidden whitespace-nowrap font-medium text-base sm:text-lg text-gray-400 dark:text-gray-500 pr-1.5"
                    style={{ transformOrigin: 'left center' }}
                  >
                    for
                  </motion.span>
                )}
              </AnimatePresence>

              {/* 'Family' — always visible */}
              <span 
                className="text-black dark:text-white font-black text-2xl sm:text-3xl"
                style={{ letterSpacing: '-0.02em' }}
              >
                Family
              </span>
            </div>
          </div>
        </motion.div>

        {/* Apple-style progress bar */}
        <motion.div 
          className="mt-6 w-28"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <div className="h-[3px] w-full rounded-full bg-gray-200 dark:bg-white/[0.08] overflow-hidden">
            <div 
              className="h-full w-[40%] rounded-full bg-gray-400 dark:bg-white/30"
              style={{ animation: 'progress-slide 1.5s ease-in-out infinite' }}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SplashScreen;
