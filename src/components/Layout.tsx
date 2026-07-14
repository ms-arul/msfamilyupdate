import React, { useState, useCallback, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Bell, Menu, X, RefreshCw, LogOut, LayoutDashboard, ListOrdered, Plus, PieChart, FileBadge } from 'lucide-react';
import { motion, AnimatePresence, usePresence } from 'framer-motion';
import { DesktopSidebar, MobileSidebar, navItems } from './ui/Sidebar';
import { useFinance } from '../context/FinanceContext';
import PageLoader from './ui/PageLoader';
import { supabase } from '../lib/supabase';
import { pageVariants, pageTransition, pageMobileVariants, pageMobileTransition, SPRINGS } from '../utils/animations';

// Lazy load notifications panel
const Notifications = lazy(() => import('../pages/Notifications'));

const LoadingSpinner = () => (
  <div className="flex justify-center py-8">
    <RefreshCw size={20} className="animate-spin text-white/40" />
  </div>
);

const usePrefersReducedMotion = () => {
  const [prefersReduced, setPrefersReduced] = useState<boolean>(false);
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  return prefersReduced;
};

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
};

// Glass styles are now in index.css — no inline <style> needed
// (Removed GlassStyles component for better performance — styles parsed once, not re-injected on every render)

// Placeholder marker so line numbers stay meaningful
const _GLASS_STYLES_MOVED_TO_CSS = true;

// Start of actual remaining code (MobileBottomNav etc.)
// The following comments replace the removed inline style block
/* Glass styles moved to src/index.css — see:
   .glass, .glass-thick, .glass-specular, .glass-pill,
   .glass-btn, .glass-shimmer, .glass-grain, .glass-overlay,
   .nav-active-pill, .glass-add-btn, .glass-danger-btn,
   .badge-pulse, .glass-scroll
*/


// ─── Mobile Bottom Nav ────────────────────────────────────────────────────────
interface MobileBottomNavProps {
  currentPath: string;
  setMobileOpen: (open: boolean) => void;
  mobileOpen: boolean;
}

function MobileBottomNav({ currentPath }: MobileBottomNavProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const tabs = [
    { text: 'Dashboard', icon: LayoutDashboard, to: '/' },
    { text: 'History', icon: ListOrdered, to: '/transactions' },
    { text: 'Add', icon: Plus, to: '/add', isCenter: true },
    { text: 'Analytics', icon: PieChart, to: '/analytics' },
    { text: 'Proofs', icon: FileBadge, to: '/proofs' },
  ];

  return (
    <div className="md:hidden fixed bottom-[calc(env(safe-area-inset-bottom,0px)+14px)] left-4 right-4 max-w-lg mx-auto z-40">
      {/* Outer glow ring */}
      <div className="absolute -inset-[1px] rounded-[28px] bg-gradient-to-r from-white/20 via-white/5 to-white/20 dark:from-white/8 dark:via-transparent dark:to-white/8 pointer-events-none" />

      <div className="relative glass-pill glass-grain rounded-[26px] px-3 py-2">
        <div className="flex items-center justify-between relative px-1">
          {tabs.map((tab, idx) => {
            const isCenter = tab.isCenter;
            const isActive = currentPath === tab.to;
            const Icon = tab.icon;

            if (isCenter) {
              return (
                <div key={idx} className="relative flex flex-col items-center justify-center w-16 h-12 -mt-5">
                  <button
                    onClick={() => navigate(tab.to)}
                    className="relative glass-add-btn w-12 h-12 rounded-[16px] text-white flex items-center justify-center transition-transform duration-200 active:scale-92 z-10"
                    aria-label={t(tab.text)}
                    style={{ transition: 'transform 0.15s cubic-bezier(0.34,1.56,0.64,1)' }}
                  >
                    {/* Specular highlight */}
                    <span className="absolute inset-0 rounded-[16px] bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                    <Plus size={22} strokeWidth={2.5} />
                  </button>
                  <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider">
                    {t(tab.text)}
                  </span>
                </div>
              );
            }

            return (
              <button
                key={idx}
                onClick={() => navigate(tab.to)}
                className="flex flex-col items-center justify-center flex-1 py-1 text-center transition-all duration-200 relative"
              >
                <div className="relative flex items-center justify-center">
                  {isActive && (
                    <motion.span
                      layoutId="mobile-nav-active-bg"
                      className="absolute -inset-1.5 nav-active-pill rounded-xl"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon
                    size={19}
                    className={`relative z-10 transition-all duration-200 ${isActive
                      ? 'text-primary-500 drop-shadow-[0_1px_6px_rgba(124,58,237,0.4)]'
                      : 'text-slate-400 dark:text-slate-500'
                      }`}
                    strokeWidth={isActive ? 2.4 : 1.9}
                  />
                </div>
                <span
                  className={`text-[9px] mt-1 tracking-tight transition-all duration-200 ${isActive
                    ? 'font-bold text-primary-500'
                    : 'font-medium text-slate-400 dark:text-slate-500'
                    }`}
                >
                  {t(tab.text)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Glass Icon Button ────────────────────────────────────────────────────────
function GlassIconButton({
  onClick,
  disabled = false,
  label,
  children,
  className = '',
}: {
  onClick?: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`glass-btn relative w-10 h-10 rounded-[12px] flex items-center justify-center text-slate-600 dark:text-slate-300 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-primary-500/40 ${className}`}
    >
      {/* Top specular streak */}
      <span className="absolute top-0 left-2 right-2 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent pointer-events-none" />
      {children}
    </button>
  );
}

// ─── Main Layout ─────────────────────────────────────────────────────────────
export default function Layout() {
  const { user, logout } = useAuth();
  const { refetch } = useFinance();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const prefersReducedMotion = usePrefersReducedMotion();
  const isMobile = useIsMobile();

  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setNotificationsOpen] = useState<boolean>(false);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [hasUnread, setHasUnread] = useState<boolean>(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);
  const notificationChannelRef = useRef<any>(null);

  const pageTitle = useMemo(() => {
    const title = navItems.find((n) => n.to === location.pathname)?.text || 'Dashboard';
    return t(title);
  }, [location.pathname, t]);

  const hasPageActions = useMemo(() => {
    return ['/transactions', '/proofs', '/loans', '/analytics'].includes(location.pathname);
  }, [location.pathname]);

  const handleLogout = useCallback(() => setShowLogoutConfirm(true), []);

  const confirmLogout = useCallback(async () => {
    setShowLogoutConfirm(false);
    try { await logout(); } catch (err) { console.error('Logout error:', err); }
    finally { navigate('/login', { replace: true }); }
  }, [logout, navigate]);

  useEffect(() => {
    setMobileOpen(false);
    setNotificationsOpen(false);
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  useEffect(() => {
    if (!user?.id) return;
    const fetchInitialUnread = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications').select('created_at')
          .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1);
        if (!error && data?.length) {
          setHasUnread(new Date(data[0].created_at) > new Date(Date.now() - 86400000));
        } else { setHasUnread(false); }
      } catch { setHasUnread(false); }
    };
    fetchInitialUnread();
    if (notificationChannelRef.current) supabase.removeChannel(notificationChannelRef.current);
    const channel = supabase.channel(`public:notifications:user_id=eq.${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => setHasUnread(true)).subscribe();
    notificationChannelRef.current = channel;
    return () => {
      if (notificationChannelRef.current) { supabase.removeChannel(notificationChannelRef.current); notificationChannelRef.current = null; }
    };
  }, [user?.id]);

  useEffect(() => { if (isNotificationsOpen && hasUnread) setHasUnread(false); }, [isNotificationsOpen, hasUnread]);

  useEffect(() => {
    if (!isMobile) return;
    let touchStartTime = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (!mobileOpen) return;
      touchStartX.current = e.touches[0].clientX;
      touchStartTime = Date.now();
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!mobileOpen || touchStartX.current === null) return;
      const deltaX = e.touches[0].clientX - touchStartX.current;
      const deltaTime = Date.now() - touchStartTime;
      const velocity = deltaTime > 0 ? deltaX / deltaTime : 0;

      // Trigger swipe close if swiped far enough (80px) or flicked fast (30px with velocity > 0.3)
      if (deltaX > 80 || (velocity > 0.3 && deltaX > 30)) {
        setMobileOpen(false);
        touchStartX.current = null;
      }
    };

    const onTouchEnd = () => {
      touchStartX.current = null;
    };

    if (mobileOpen) {
      document.addEventListener('touchstart', onTouchStart, { passive: true });
      document.addEventListener('touchmove', onTouchMove, { passive: true });
      document.addEventListener('touchend', onTouchEnd);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.body.style.overflow = '';
    };
  }, [mobileOpen, isMobile]);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try { await refetch(); window.dispatchEvent(new Event('app:refresh')); }
    catch (e) { console.warn('Refetch error:', e); }
    finally { setIsRefreshing(false); }
  }, [refetch, isRefreshing]);

  const activeVariants = prefersReducedMotion
    ? { initial: {}, animate: {}, exit: {} }
    : isMobile
      ? pageMobileVariants
      : pageVariants;

  const activeTransition = prefersReducedMotion
    ? { duration: 0 }
    : isMobile
      ? pageMobileTransition
      : pageTransition;

  const floatingMotion = prefersReducedMotion
    ? {}
    : { initial: { opacity: 0, y: -8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 } };

  // Notification button icon toggle content
  const NotificationIcon = () => (
    <AnimatePresence mode="wait" initial={false}>
      {isNotificationsOpen ? (
        <motion.div key="close"
          initial={{ rotate: -90, opacity: 0, scale: 0.7 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.7 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.18, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <X size={18} strokeWidth={2.5} />
        </motion.div>
      ) : (
        <motion.div key="bell" className="relative"
          initial={{ rotate: 90, opacity: 0, scale: 0.7 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: -90, opacity: 0, scale: 0.7 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.18, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <Bell size={18} strokeWidth={2} />
          {hasUnread && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-400 rounded-full ring-1 ring-white dark:ring-[#0a0a0a] badge-pulse" />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  const MenuIcon = () => (
    <AnimatePresence mode="wait" initial={false}>
      {mobileOpen ? (
        <motion.div key="close"
          initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
        >
          <X size={19} strokeWidth={2.5} />
        </motion.div>
      ) : (
        <motion.div key="menu"
          initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
        >
          <Menu size={19} strokeWidth={2.5} />
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="flex h-screen overflow-hidden text-slate-900 dark:text-slate-100 relative bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 dark:from-[#000000] dark:via-[#050505] dark:to-[#000000] transition-colors duration-300">

      {/* Ambient background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden>
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-primary-400/10 dark:bg-primary-500/6 blur-[100px] dark:hidden" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-indigo-400/8 dark:bg-indigo-500/5 blur-[80px] dark:hidden" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-sky-300/5 dark:bg-sky-400/3 blur-[120px] dark:hidden" />
      </div>

      {/* Desktop Sidebar */}
      <DesktopSidebar ref={sidebarRef as any} user={user} handleLogout={handleLogout} />

      {/* Top status bar gradient fade overlay */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-[49] pointer-events-none h-[calc(env(safe-area-inset-top,0px)+3.8rem)] bg-gradient-to-b from-slate-100 via-slate-100/98 via-slate-100/75 to-transparent dark:from-[#000000] dark:via-[#000000]/98 dark:via-[#000000]/75 to-transparent" />

      {/* ── Mobile Header ───────────────────────────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 pointer-events-none pt-[calc(env(safe-area-inset-top,0px)+8px)]">
        <div className="flex items-center justify-between px-3 pt-1 gap-2">

          {/* Menu button */}
          <motion.div
            {...floatingMotion}
            className="pointer-events-auto"
          >
            <GlassIconButton onClick={() => setMobileOpen(!mobileOpen)} label={mobileOpen ? 'Close menu' : 'Open menu'}>
              <MenuIcon />
            </GlassIconButton>
          </motion.div>

          {/* Center title pill */}
          <motion.div
            {...floatingMotion}
            className="pointer-events-auto flex-1 flex justify-center"
          >
            <div className="glass-btn h-10 px-3 rounded-[12px] flex items-center gap-2.5">
              {/* Specular highlights */}
              <span className="absolute top-0 left-2 right-2 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent pointer-events-none" />
              <div className="w-[30px] h-[30px] shrink-0 flex items-center justify-center">
                <img src="/msfamilyinside.png" alt="MS Logo" className="w-full h-full object-contain" loading="lazy" />
              </div>
              <div className="flex flex-col items-start justify-center overflow-hidden">
                <span className="text-[14.5px] font-black text-slate-900 dark:text-white leading-tight tracking-tight truncate w-full pb-[2.5px]">
                  {location.pathname === '/' ? `MS ${t('Family')}` : pageTitle}
                </span>
                {(!isMobile || !hasPageActions) && (
                  <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.11em] leading-none truncate w-full mt-[-1.5px] pb-[0.5px]">
                    {location.pathname === '/' ? t('Finance Hub') : `MS ${t('Family')}`}
                  </span>
                )}
              </div>
            </div>
          </motion.div>

          {/* Right actions */}
          <motion.div {...floatingMotion} className="pointer-events-auto flex items-center gap-1.5">
            {isMobile && <div id="header-actions-portal" className="flex items-center gap-1.5" />}

            {(!isMobile || !hasPageActions) && (
              <>
                <GlassIconButton onClick={handleRefresh} disabled={isRefreshing} label="Refresh data">
                  <RefreshCw size={17} strokeWidth={2.3} className={isRefreshing ? 'animate-spin' : ''} />
                </GlassIconButton>

                <GlassIconButton onClick={() => setNotificationsOpen(p => !p)} label={isNotificationsOpen ? 'Close notifications' : 'Open notifications'}>
                  <NotificationIcon />
                </GlassIconButton>
              </>
            )}
          </motion.div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <MobileSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} handleLogout={handleLogout} user={user} />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav currentPath={location.pathname} setMobileOpen={setMobileOpen} mobileOpen={mobileOpen} />

      {/* Mobile Bottom Navigation Blur Fade Overlay */}
      <div className="md:hidden nav-blur-fade" />

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 mx-2 md:mx-0 z-10 pt-0 md:pt-3 pb-0 md:pb-4">

        {/* Desktop Top Bar */}
        <header className="hidden md:flex h-16 items-center justify-between px-5 mb-4 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="min-w-0 w-full">
              <h2 className="text-xl font-bold tracking-tight truncate">{pageTitle}</h2>
              <p className="text-xs text-slate-500 truncate">
                {t('Welcome back')},{' '}
                <span className="text-primary-500 font-semibold">{user?.name || 'User'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Refresh */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label="Refresh data"
              className="glass-btn relative w-10 h-10 rounded-[12px] flex items-center justify-center text-slate-500 dark:text-slate-400 disabled:opacity-40"
            >
              <span className="absolute top-0 left-2 right-2 h-px bg-gradient-to-r from-transparent via-white/60 dark:via-white/15 to-transparent" />
              <RefreshCw size={15} strokeWidth={2.3} className={isRefreshing ? 'animate-spin' : ''} />
            </button>

            {!isMobile && <div id="header-actions-portal" className="flex items-center gap-2" />}

            {/* Notification bell – desktop */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(p => !p)}
                aria-label={isNotificationsOpen ? 'Close notifications' : 'Open notifications'}
                className="glass-btn relative w-10 h-10 rounded-[12px] flex items-center justify-center text-slate-500 dark:text-slate-400"
              >
                <span className="absolute top-0 left-2 right-2 h-px bg-gradient-to-r from-transparent via-white/60 dark:via-white/15 to-transparent" />
                <NotificationIcon />
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div
          ref={scrollContainerRef}
          className={`relative flex-1 overflow-x-hidden rounded-none md:rounded-2xl glass-scroll ${location.pathname === '/add' || location.pathname === '/tracking'
            ? 'overflow-y-hidden'
            : 'overflow-y-auto'
            }`}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <Suspense fallback={<PageLoader />}>
            <div
              className={
                location.pathname === '/add' || location.pathname === '/tracking'
                  ? 'h-full flex flex-col pt-[4.1rem] md:pt-0 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:pb-0'
                  : 'min-h-full flex flex-col w-full pt-[4.1rem] md:pt-0 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:pb-0'
              }
            >
              <Outlet />
            </div>
          </Suspense>
        </div>
      </main>

      {/* ── Notifications Panel ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {isNotificationsOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 glass-overlay z-[60]"
              onClick={() => setNotificationsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.96, y: -12, filter: 'blur(4px)' }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -12, filter: 'blur(4px)' }}
              transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 340, damping: 28 }}
              className="fixed top-20 md:top-[4.5rem] right-4 left-4 md:left-auto md:w-[420px] max-h-[calc(100vh-6rem)] z-[70] overflow-hidden flex flex-col glass-thick glass-grain rounded-[22px]"
              style={{ transformOrigin: 'top right' }}
            >
              {/* Panel header */}
              <div className="relative flex items-center justify-between px-5 py-4 border-b border-slate-200/40 dark:border-white/[0.06]">
                {/* Specular top edge */}
                <span className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/15 to-transparent" />
                <h2 className="font-bold text-slate-800 dark:text-white/90 text-[17px] tracking-tight">
                  {t('Notifications')}
                </h2>
                <button
                  onClick={() => setNotificationsOpen(false)}
                  aria-label="Close notifications panel"
                  className="glass-btn w-8 h-8 rounded-[10px] flex items-center justify-center text-slate-500 dark:text-slate-400"
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>

              {/* Panel body */}
              <div className="overflow-y-auto glass-scroll p-5 pt-3 flex-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                <Suspense fallback={<LoadingSpinner />}>
                  <Notifications />
                </Suspense>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Logout Confirmation Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-[10px] z-[100]"
              onClick={() => setShowLogoutConfirm(false)}
            />

            {/* Modal */}
            <motion.div
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.88, y: 24, filter: 'blur(6px)' }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 12, filter: 'blur(4px)' }}
              transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 32 }}
              className="fixed inset-0 z-[110] flex items-center justify-center px-6 pointer-events-none"
            >
              <div className="pointer-events-auto relative w-full max-w-[340px] glass-thick glass-grain rounded-[26px] overflow-hidden">
                {/* Top specular edge */}
                <span className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/90 dark:via-white/18 to-transparent" />

                {/* Content */}
                <div className="px-6 pt-7 pb-5 text-center">
                  {/* Icon container */}
                  <div className="relative w-[60px] h-[60px] mx-auto mb-5">
                    <div className="absolute inset-0 rounded-[18px] bg-red-400/15 dark:bg-red-500/12 blur-[12px]" />
                    <div className="relative glass rounded-[18px] w-full h-full flex items-center justify-center border-red-200/40 dark:border-red-500/20">
                      <span className="absolute top-0 left-2 right-2 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                      <LogOut size={22} className="text-red-400 dark:text-red-400" />
                    </div>
                  </div>

                  <h3 className="text-[18px] font-bold text-slate-900 dark:text-white/92 tracking-tight">
                    {t('Sign Out')}
                  </h3>
                  <p className="text-[13.5px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                    {t('Are you sure you want to sign out of your account?')}
                  </p>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-slate-200/60 dark:via-white/[0.07] to-transparent mx-4" />

                {/* Actions */}
                <div className="px-6 py-5 flex gap-3">
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="relative flex-1 py-2.5 rounded-[14px] glass-btn text-slate-700 dark:text-slate-300 text-[14px] font-semibold"
                  >
                    <span className="absolute top-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-white/70 dark:via-white/15 to-transparent" />
                    {t('Cancel')}
                  </button>
                  <button
                    onClick={confirmLogout}
                    className="relative flex-1 py-2.5 rounded-[14px] glass-danger-btn text-white text-[14px] font-semibold transition-transform active:scale-95"
                    style={{ transition: 'transform 0.14s cubic-bezier(0.34,1.56,0.64,1)' }}
                  >
                    <span className="absolute top-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                    {t('Sign Out')}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}