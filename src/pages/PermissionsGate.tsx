import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  MapPin,
  MessageSquare,
  Camera,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useLanguage } from '../context/LanguageContext';
import { checkSmsPermission, requestSmsPermission } from '../utils/smsService';

const CameraPermission = registerPlugin<any>('CameraPermission');

interface PermissionItem {
  id: string;
  name: string;
  desc: string;
  icon: any;
  status: 'granted' | 'denied' | 'prompt' | 'checking';
  action: () => Promise<boolean>;
}

const AURORA_CONFIG = [
  { x: 10, y: 15, size: 480, hue: 'a', dur: 20, delay: 0 },
  { x: 85, y: 20, size: 440, hue: 'b', dur: 24, delay: 1 },
  { x: 50, y: 80, size: 500, hue: 'a', dur: 22, delay: 3 },
  { x: 90, y: 75, size: 380, hue: 'c', dur: 26, delay: 2 },
];

const AuroraBackground = React.memo(() => {
  return (
    <>
      <style>{`
        @keyframes aurora-drift-1 {
          0%, 100% { transform: translate(-50%, -50%) translate(0px, 0px) scale(1); }
          33% { transform: translate(-50%, -50%) translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-50%, -50%) translate(-20px, 20px) scale(0.96); }
        }
        @keyframes aurora-drift-2 {
          0%, 100% { transform: translate(-50%, -50%) translate(0px, 0px) scale(1); }
          50% { transform: translate(-50%, -50%) translate(-35px, 25px) scale(1.08); }
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
            a: 'rgba(139, 92, 246, 0.16)',   // violet
            b: 'rgba(255, 105, 180, 0.12)',  // pink
            c: 'rgba(6, 182, 212, 0.14)',    // cyan
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
                filter: 'blur(50px)',
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
        className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-[0.03] dark:opacity-[0.045]"
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

export default function PermissionsGate() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0); // 1 = forward, -1 = backward
  const [hasInitializedIndex, setHasInitializedIndex] = useState(false);

  const checkAllPermissions = async () => {
    setLoading(true);
    try {
      // 1. Notifications check
      let notifStatus: 'granted' | 'denied' | 'prompt' = 'prompt';
      try {
        const notif = await LocalNotifications.checkPermissions();
        notifStatus = notif.display === 'granted' ? 'granted' : (notif.display === 'denied' ? 'denied' : 'prompt');
      } catch (e) {
        console.warn('Failed checking notifications permission:', e);
      }

      // 2. Location check
      let locationStatus: 'granted' | 'denied' | 'prompt' = 'prompt';
      try {
        const { Geolocation } = await import('@capacitor/geolocation');
        const loc = await Geolocation.checkPermissions();
        locationStatus = loc.location === 'granted' ? 'granted' : (loc.location === 'denied' ? 'denied' : 'prompt');
      } catch (e) {
        console.warn('Failed checking location permission:', e);
      }

      // 3. SMS check
      let smsStatus: 'granted' | 'denied' | 'prompt' = 'prompt';
      try {
        const sms = await checkSmsPermission();
        smsStatus = sms.granted ? 'granted' : 'prompt';
      } catch (e) {
        console.warn('Failed checking SMS permission:', e);
      }

      // 4. Camera check
      let cameraStatus: 'granted' | 'denied' | 'prompt' = 'prompt';
      try {
        if (Capacitor.isNativePlatform()) {
          const res = await CameraPermission.checkPermissions();
          cameraStatus = res.camera === 'granted' ? 'granted' : (res.camera === 'denied' ? 'denied' : 'prompt');
        } else {
          cameraStatus = 'granted'; // Browsers handle on demand
        }
      } catch (e) {
        console.warn('Failed checking camera permission:', e);
      }

      const list: PermissionItem[] = [
        {
          id: 'notifications',
          name: t('Notifications'),
          desc: t('Required to send you instant transaction alerts, budget limit warnings, and upcoming bill reminders.'),
          icon: Bell,
          status: notifStatus,
          action: async () => {
            try {
              const req = await LocalNotifications.requestPermissions();
              return req.display === 'granted';
            } catch {
              return false;
            }
          }
        },
        {
          id: 'sms',
          name: t('Smart SMS Reader'),
          desc: t('Automatically imports and categorizes financial transactions from bank/credit card alerts. No manual typing needed.'),
          icon: MessageSquare,
          status: smsStatus,
          action: async () => {
            try {
              const req = await requestSmsPermission();
              return req.granted;
            } catch {
              return false;
            }
          }
        },
        {
          id: 'location',
          name: t('Family Location Sharing'),
          desc: t('Provides real-time location sharing and geofence safety alerts to keep your family connected and secure.'),
          icon: MapPin,
          status: locationStatus,
          action: async () => {
            try {
              const { Geolocation } = await import('@capacitor/geolocation');
              const req = await Geolocation.requestPermissions({ permissions: ['location'] });
              return req.location === 'granted';
            } catch {
              return false;
            }
          }
        },
        {
          id: 'camera',
          name: t('Camera Access'),
          desc: t('Required to scan family invitation QR codes and capture receipt images for expense proof.'),
          icon: Camera,
          status: cameraStatus,
          action: async () => {
            try {
              if (Capacitor.isNativePlatform()) {
                await CameraPermission.checkPermission(); // requests if not granted
                const res = await CameraPermission.checkPermissions();
                return res.camera === 'granted';
              }
              return true;
            } catch {
              return false;
            }
          }
        }
      ];
      setPermissions(list);
    } catch (err) {
      console.error('Error checking permissions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAllPermissions();
  }, []);

  useEffect(() => {
    if (permissions.length > 0 && !hasInitializedIndex) {
      const firstUngrantedIndex = permissions.findIndex(p => p.status !== 'granted');
      if (firstUngrantedIndex !== -1) {
        setCurrentIndex(firstUngrantedIndex);
      }
      setHasInitializedIndex(true);
    }
  }, [permissions, hasInitializedIndex]);

  const handleRequest = async (item: PermissionItem) => {
    const success = await item.action();
    await checkAllPermissions();
    if (success) {
      setTimeout(() => {
        setDirection(1);
        setCurrentIndex(prev => {
          if (prev < permissions.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 600);
    }
  };

  const handleContinue = () => {
    localStorage.setItem('hasSeenPermissionsGate', 'true');
    navigate('/', { replace: true });
  };

  const grantedCount = permissions.filter(p => p.status === 'granted').length;
  const totalCount = permissions.length;
  const allGranted = permissions.length > 0 && grantedCount === totalCount;

  const currentItem = permissions[currentIndex];

  const handleNext = () => {
    if (currentIndex < permissions.length - 1) {
      setDirection(1);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleDragEnd = (event: any, info: any) => {
    const swipeThreshold = 50;
    if (info.offset.x < -swipeThreshold) {
      handleNext();
    } else if (info.offset.x > swipeThreshold) {
      handlePrev();
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 }
      }
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 100 : -100,
      opacity: 0,
      transition: {
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 }
      }
    })
  };

  return (
    <div className="h-[100dvh] w-full relative flex flex-col justify-between p-4 pb-6 overflow-hidden bg-[#eef0f6] dark:bg-[#07070d] transition-colors duration-500">
      {/* Background gradients */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          background: 'linear-gradient(165deg, #f3f0fb 0%, #eef0f6 38%, #e6ecf7 100%)',
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

      {/* Refraction dot-grid */}
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

      {/* Header Area */}
      <div className="max-w-md w-full mx-auto text-center pt-2 pb-1 space-y-2 relative z-10">
        <div className="relative mb-1 inline-block">
          {/* Pulsing ring behind the shield logo */}
          <div className="absolute -inset-4 bg-gradient-to-tr from-primary-500/20 to-secondary-500/20 rounded-full filter blur-sm animate-pulse pointer-events-none" />
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{
              repeat: Infinity,
              duration: 4,
              ease: "easeInOut"
            }}
            className="w-14 h-14 mx-auto rounded-[20px] bg-white/60 dark:bg-white/[0.04] border border-slate-200/40 dark:border-white/5 shadow-glass flex items-center justify-center p-3.5 relative z-10"
          >
            <div className="text-primary-500 dark:text-primary-400">
              <ShieldCheck size={28} className="drop-shadow-[0_0_12px_rgba(139,92,246,0.3)]" />
            </div>
          </motion.div>
        </div>

        <div className="space-y-1">
          <h2 className="text-[20px] font-black tracking-tight text-slate-800 dark:text-white">
            {t('App Permissions')}
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[310px] mx-auto leading-relaxed font-medium">
            {t('MS Family needs the following permissions to automate tracking, alerts, and family security features.')}
          </p>
        </div>

        {/* Dynamic Progress Tracker */}
        {!loading && permissions.length > 0 && (
          <div className="max-w-xs mx-auto pt-2 pb-1">
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 px-0.5">
              <span>{t('Access Setup')}</span>
              <span className="text-primary-500 dark:text-primary-400 font-extrabold">
                {grantedCount} {t('of')} {totalCount} {t('Allowed')}
              </span>
            </div>
            <div className="w-full bg-slate-200/60 dark:bg-white/[0.06] h-[5px] rounded-full overflow-hidden p-[1px] border border-slate-300/20 dark:border-white/5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
              <motion.div
                className="bg-gradient-to-r from-primary-500 to-secondary-500 h-full rounded-full shadow-[0_0_8px_rgba(139,92,246,0.4)]"
                initial={{ width: 0 }}
                animate={{ width: `${(grantedCount / totalCount) * 100}%` }}
                transition={{ type: "spring", stiffness: 85, damping: 15 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Permissions Card Slider */}
      <div className="flex-1 max-w-sm w-full mx-auto flex flex-col justify-center px-4 py-2 relative z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500">
            <svg 
              className="w-7 h-7 text-primary-500 animate-spin" 
              viewBox="0 0 100 100"
            >
              <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="7" fill="none" strokeDasharray="160 100" strokeLinecap="round" />
            </svg>
            <p className="text-[10px] font-bold uppercase tracking-widest">{t('Scanning permissions...')}</p>
          </div>
        ) : currentItem ? (
          <div className="relative w-full overflow-visible py-2 flex flex-col items-center justify-center">
            <div className="relative w-full overflow-hidden min-h-[290px] flex items-center justify-center">
              <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.div
                  key={currentItem.id}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.6}
                  onDragEnd={handleDragEnd}
                  className={`w-full flex flex-col items-center text-center p-6 rounded-[28px] border transition-all duration-300 relative overflow-hidden touch-none select-none backdrop-blur-md ${
                    currentItem.status === 'granted'
                      ? 'bg-emerald-500/[0.03] dark:bg-emerald-500/[0.015] border-emerald-500/30 dark:border-emerald-500/15 shadow-[0_8px_32px_rgba(16,185,129,0.1)]'
                      : 'bg-white/55 dark:bg-[#0f0f18]/60 border-slate-200/60 dark:border-white/5 shadow-glass'
                  }`}
                >
                  {/* Specular edge sheen overlay */}
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

                  {/* Glowing backlight */}
                  {currentItem.status === 'granted' ? (
                    <div className="absolute -right-12 -top-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                  ) : (
                    <div className="absolute -right-12 -top-12 w-32 h-32 bg-primary-500/10 rounded-full blur-2xl pointer-events-none" />
                  )}

                  {/* Icon Container */}
                  <div className={`p-4 rounded-[22px] transition-all duration-500 mb-4 ${
                    currentItem.status === 'granted'
                      ? 'bg-emerald-500/10 text-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.2)] border border-emerald-500/20'
                      : 'bg-gradient-to-tr from-primary-500/10 to-secondary-500/10 text-primary-500 dark:text-primary-400 border border-primary-500/20 shadow-[0_0_16px_rgba(139,92,246,0.1)]'
                  }`}>
                    <currentItem.icon size={30} />
                  </div>

                  {/* Title & Badge */}
                  <div className="flex flex-col items-center gap-1.5 mb-2">
                    <h4 className="font-black text-[17px] text-slate-800 dark:text-slate-100 tracking-tight">
                      {currentItem.name}
                    </h4>
                    {currentItem.id === 'notifications' && (
                      <span className="text-[9px] bg-primary-500/10 text-primary-600 dark:text-primary-400 font-extrabold px-2.5 py-0.5 rounded-[8px] uppercase tracking-wider border border-primary-500/10">
                        {t('Alerts')}
                      </span>
                    )}
                    {currentItem.id === 'sms' && (
                      <span className="text-[9px] bg-secondary-500/10 text-secondary-600 dark:text-secondary-400 font-extrabold px-2.5 py-0.5 rounded-[8px] uppercase tracking-wider border border-secondary-500/10">
                        {t('Automation')}
                      </span>
                    )}
                    {currentItem.id === 'location' && (
                      <span className="text-[9px] bg-accent-500/10 text-accent-600 dark:text-accent-400 font-extrabold px-2.5 py-0.5 rounded-[8px] uppercase tracking-wider border border-accent-500/10">
                        {t('Safety')}
                      </span>
                    )}
                    {currentItem.id === 'camera' && (
                      <span className="text-[9px] bg-slate-500/10 text-slate-600 dark:text-slate-400 font-extrabold px-2.5 py-0.5 rounded-[8px] uppercase tracking-wider border border-slate-500/10">
                        {t('Optional')}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-[12.5px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium max-w-[280px] mb-5">
                    {currentItem.desc}
                  </p>

                  {/* Action Button */}
                  <div>
                    {currentItem.status === 'granted' ? (
                      <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 220, damping: 12 }}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-[14px] bg-emerald-500/10 text-emerald-500 font-extrabold text-[12.5px] border border-emerald-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
                      >
                        <CheckCircle2 size={16} />
                        <span>{t('Granted')}</span>
                      </motion.div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRequest(currentItem);
                        }}
                        className="px-6 py-2.5 rounded-[14px] bg-gradient-to-r from-primary-500 to-primary-600 text-white font-extrabold text-[12px] shadow-[0_4px_12px_rgba(139,92,246,0.18)] hover:shadow-[0_4px_16px_rgba(139,92,246,0.25)] transition-all cursor-pointer border border-primary-400/20 active:scale-95"
                      >
                        {t('Grant Permission')}
                      </button>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Pagination dots & Arrow buttons */}
            <div className="flex items-center justify-between w-full mt-6 px-1">
              <button
                onClick={handlePrev}
                className="p-2 rounded-xl hover:bg-slate-200/50 dark:hover:bg-white/[0.04] text-slate-500 dark:text-slate-400 disabled:opacity-20 disabled:pointer-events-none transition-all border border-transparent hover:border-slate-200/20 dark:hover:border-white/5 bg-slate-200/10 dark:bg-white/[0.02] shadow-[0_2px_8px_rgba(0,0,0,0.05)]"
                disabled={currentIndex === 0}
              >
                <ArrowRight size={18} className="rotate-180" />
              </button>

              <div className="flex items-center gap-2 bg-slate-200/40 dark:bg-white/[0.03] px-3.5 py-2 rounded-full border border-slate-300/10 dark:border-white/5 shadow-[inset_0_1px_1px_rgba(0,0,0,0.05)]">
                {permissions.map((p, idx) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setDirection(idx > currentIndex ? 1 : -1);
                      setCurrentIndex(idx);
                    }}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      idx === currentIndex
                        ? 'w-5 bg-primary-500 dark:bg-primary-400'
                        : p.status === 'granted'
                        ? 'w-2 bg-emerald-500/60'
                        : 'w-2 bg-slate-350 dark:bg-white/10'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={handleNext}
                className="p-2 rounded-xl hover:bg-slate-200/50 dark:hover:bg-white/[0.04] text-slate-500 dark:text-slate-400 disabled:opacity-20 disabled:pointer-events-none transition-all border border-transparent hover:border-slate-200/20 dark:hover:border-white/5 bg-slate-200/10 dark:bg-white/[0.02] shadow-[0_2px_8px_rgba(0,0,0,0.05)]"
                disabled={currentIndex === permissions.length - 1}
              >
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Footer / Continue Button */}
      <div className="max-w-xs w-full mx-auto pb-8 pt-2 relative z-10">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleContinue}
          className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-[20px] text-white font-black text-[13px] tracking-wider uppercase transition-all duration-300 cursor-pointer border ${
            allGranted
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 border-emerald-400/20 shadow-[0_8px_24px_rgba(16,185,129,0.3)] hover:shadow-[0_12px_28px_rgba(16,185,129,0.4)]'
              : 'bg-gradient-to-r from-primary-500 to-secondary-500 border-primary-400/20 shadow-[0_8px_24px_rgba(139,92,246,0.22)] hover:shadow-[0_12px_28px_rgba(139,92,246,0.3)]'
          }`}
        >
          <span>{t('Continue to App')}</span>
          <ArrowRight size={15} />
        </motion.button>
      </div>
    </div>
  );
}
