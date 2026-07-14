import React, { useState } from 'react';
import { motion } from 'framer-motion';

export const SplashScreen: React.FC = () => {
  const [splashTilt, setSplashTilt] = useState({ x: 0, y: 0 });
  const [isSplashPressed, setIsSplashPressed] = useState(false);

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
      className="absolute inset-0 z-50 bg-white dark:bg-[#07070d] flex flex-col items-center justify-center overflow-hidden transition-colors duration-500 animate-[fadeIn_0.2s_ease-out]"
    >
      {/* Interactive splash logo container */}
      <div className="flex flex-col items-center justify-center gap-10">
        <motion.div
          style={{
            perspective: 1000,
          }}
        >
          <motion.div
            animate={{ 
              rotateX: splashTilt.x, 
              rotateY: splashTilt.y,
              scale: isSplashPressed ? 0.94 : 1.04,
              y: [0, -4, 0]
            }}
            transition={{
              y: {
                repeat: Infinity,
                duration: 3.5,
                ease: "easeInOut"
              },
              default: { type: "spring", stiffness: 200, damping: 20 }
            }}
            className="w-28 h-28 rounded-[28px] overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.35)] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center p-3 relative cursor-pointer"
          >
            {/* Specular light sheen overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-white/25 pointer-events-none" />
            
            {/* Glowing aura background */}
            <div className="absolute -inset-4 bg-primary-500/10 dark:bg-primary-500/25 rounded-full filter blur-md pointer-events-none animate-pulse" />

            <svg viewBox="0 0 100 100" className="w-full h-full relative z-10 overflow-visible">
              <defs>
                <linearGradient id="roofGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ec4899" />
                  <stop offset="50%" stopColor="#d946ef" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
                <linearGradient id="leftWallGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
                <linearGradient id="rightWallGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#84cc16" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
                <linearGradient id="leftAdultGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
                <linearGradient id="rightAdultGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#a3e635" />
                  <stop offset="100%" stopColor="#047857" />
                </linearGradient>
                <linearGradient id="childGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
              </defs>

              {/* Roof Chimney Block */}
              <motion.path
                d="M 72 20 L 72 34"
                stroke="url(#roofGrad)"
                strokeWidth="7.5"
                strokeLinecap="round"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, delay: 0.6, ease: "easeInOut" }}
              />

              {/* Roof Ribbon */}
              <motion.path
                d="M 16 44 L 50 18 L 84 44"
                stroke="url(#roofGrad)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.0, ease: "easeInOut" }}
              />

              {/* Left Wall Ribbon */}
              <motion.path
                d="M 21.5 45 L 21.5 65 C 21.5 80 35 86 50 86"
                stroke="url(#leftWallGrad)"
                strokeWidth="7.5"
                strokeLinecap="round"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.0, delay: 0.4, ease: "easeInOut" }}
              />

              {/* Right Wall Ribbon */}
              <motion.path
                d="M 78.5 45 L 78.5 65 C 78.5 80 65 86 50 86"
                stroke="url(#rightWallGrad)"
                strokeWidth="7.5"
                strokeLinecap="round"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.0, delay: 0.4, ease: "easeInOut" }}
              />

              {/* Left Adult Figure Torso */}
              <motion.path
                d="M 29 73 C 29 57 47 57 47 73 Z"
                stroke="url(#leftAdultGrad)"
                strokeWidth="1.2"
                fill="url(#leftAdultGrad)"
                initial={{ pathLength: 0, fillOpacity: 0 }}
                animate={{ pathLength: 1, fillOpacity: 1 }}
                transition={{ 
                  pathLength: { duration: 0.8, delay: 1.0, ease: "easeOut" },
                  fillOpacity: { duration: 0.6, delay: 1.8 } 
                }}
              />

              {/* Left Adult Figure Head */}
              <motion.circle
                cx="38"
                cy="48"
                r="5.5"
                stroke="url(#leftAdultGrad)"
                strokeWidth="1.2"
                fill="url(#leftAdultGrad)"
                initial={{ pathLength: 0, fillOpacity: 0 }}
                animate={{ pathLength: 1, fillOpacity: 1 }}
                transition={{ 
                  pathLength: { duration: 0.8, delay: 1.0, ease: "easeOut" },
                  fillOpacity: { duration: 0.6, delay: 1.8 } 
                }}
              />

              {/* Right Adult Figure Torso */}
              <motion.path
                d="M 53 73 C 53 57 71 57 71 73 Z"
                stroke="url(#rightAdultGrad)"
                strokeWidth="1.2"
                fill="url(#rightAdultGrad)"
                initial={{ pathLength: 0, fillOpacity: 0 }}
                animate={{ pathLength: 1, fillOpacity: 1 }}
                transition={{ 
                  pathLength: { duration: 0.8, delay: 1.0, ease: "easeOut" },
                  fillOpacity: { duration: 0.6, delay: 1.8 } 
                }}
              />

              {/* Right Adult Figure Head */}
              <motion.circle
                cx="62"
                cy="48"
                r="5.5"
                stroke="url(#rightAdultGrad)"
                strokeWidth="1.2"
                fill="url(#rightAdultGrad)"
                initial={{ pathLength: 0, fillOpacity: 0 }}
                animate={{ pathLength: 1, fillOpacity: 1 }}
                transition={{ 
                  pathLength: { duration: 0.8, delay: 1.0, ease: "easeOut" },
                  fillOpacity: { duration: 0.6, delay: 1.8 } 
                }}
              />

              {/* Center Child Figure Torso */}
              <motion.path
                d="M 43 83 C 43 71 57 71 57 83 Z"
                stroke="url(#childGrad)"
                strokeWidth="1.2"
                fill="url(#childGrad)"
                initial={{ pathLength: 0, fillOpacity: 0 }}
                animate={{ pathLength: 1, fillOpacity: 1 }}
                transition={{ 
                  pathLength: { duration: 0.6, delay: 1.4, ease: "easeOut" },
                  fillOpacity: { duration: 0.6, delay: 2.0 } 
                }}
              />

              {/* Center Child Figure Head */}
              <motion.circle
                cx="50"
                cy="63"
                r="4"
                stroke="url(#childGrad)"
                strokeWidth="1.2"
                fill="url(#childGrad)"
                initial={{ pathLength: 0, fillOpacity: 0 }}
                animate={{ pathLength: 1, fillOpacity: 1 }}
                transition={{ 
                  pathLength: { duration: 0.6, delay: 1.4, ease: "easeOut" },
                  fillOpacity: { duration: 0.6, delay: 2.0 } 
                }}
              />
            </svg>
          </motion.div>
        </motion.div>

        {/* iOS Ticks Spinner loading indicator */}
        <svg 
          className="w-8 h-8 text-slate-500 dark:text-slate-300 animate-[fadeIn_0.5s_ease-out_2.2s_both]" 
          viewBox="0 0 100 100"
        >
          <style>{`
            .ios-line {
              animation: ios-fade-react 1.2s linear infinite;
              stroke: currentColor;
              stroke-width: 7px;
              stroke-linecap: round;
            }
            @keyframes ios-fade-react {
              from { opacity: 1; }
              to { opacity: 0.15; }
            }
          `}</style>
          {/* 0 deg */}
          <line className="ios-line" x1="50" y1="32" x2="50" y2="16" style={{ animationDelay: '-1.2s' }} />
          {/* 30 deg */}
          <line className="ios-line" x1="59" y1="34.4" x2="67" y2="20.5" style={{ animationDelay: '-1.1s' }} />
          {/* 60 deg */}
          <line className="ios-line" x1="65.6" y1="41" x2="77.5" y2="34.1" style={{ animationDelay: '-1.0s' }} />
          {/* 90 deg */}
          <line className="ios-line" x1="68" y1="50" x2="84" y2="50" style={{ animationDelay: '-0.9s' }} />
          {/* 120 deg */}
          <line className="ios-line" x1="65.6" y1="59" x2="77.5" y2="65.9" style={{ animationDelay: '-0.8s' }} />
          {/* 150 deg */}
          <line className="ios-line" x1="59" y1="65.6" x2="67" y2="79.5" style={{ animationDelay: '-0.7s' }} />
          {/* 180 deg */}
          <line className="ios-line" x1="50" y1="68" x2="50" y2="84" style={{ animationDelay: '-0.6s' }} />
          {/* 210 deg */}
          <line className="ios-line" x1="41" y1="65.6" x2="33" y2="79.5" style={{ animationDelay: '-0.5s' }} />
          {/* 240 deg */}
          <line className="ios-line" x1="34.4" y1="59" x2="22.5" y2="65.9" style={{ animationDelay: '-0.4s' }} />
          {/* 270 deg */}
          <line className="ios-line" x1="32" y1="50" x2="16" y2="50" style={{ animationDelay: '-0.3s' }} />
          {/* 300 deg */}
          <line className="ios-line" x1="34.4" y1="41" x2="22.5" y2="34.1" style={{ animationDelay: '-0.2s' }} />
          {/* 330 deg */}
          <line className="ios-line" x1="41" y1="34.4" x2="33" y2="20.5" style={{ animationDelay: '-0.1s' }} />
        </svg>
      </div>
    </div>
  );
};

export default SplashScreen;
