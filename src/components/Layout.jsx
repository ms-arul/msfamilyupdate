import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bell, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { DesktopSidebar, MobileSidebar, navItems } from './ui/Sidebar';
import Notifications from '../pages/Notifications';

// ============================================================================
// Main Layout Component
// ============================================================================
export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isNotificationsOpen, setNotificationsOpen] = useState(false);
  const sidebarRef = useRef(null);
  const touchStartX = useRef(null);

  const pageTitle = useMemo(
    () => navItems.find((n) => n.to === location.pathname)?.text || 'Dashboard',
    [location.pathname]
  );

  const handleLogout = useCallback(async () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      try {
        await logout();
      } catch (err) {
        console.error('Logout error:', err);
      } finally {
        navigate('/login', { replace: true });
        window.location.reload(); // Hard reset to clear all state
      }
    }
  }, [logout, navigate]);

  // Close mobile sidebar and notifications when route changes
  useEffect(() => {
    setMobileOpen(false);
    setNotificationsOpen(false);
  }, [location.pathname]);

  // Handle swipe to close sidebar on mobile
  useEffect(() => {
    const handleTouchStart = (e) => {
      if (!mobileOpen) return;
      touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e) => {
      if (!mobileOpen || touchStartX.current === null) return;
      const deltaX = e.touches[0].clientX - touchStartX.current;
      if (deltaX > 50) {
        setMobileOpen(false);
        touchStartX.current = null;
      }
    };

    const handleTouchEnd = () => {
      touchStartX.current = null;
    };

    if (mobileOpen) {
      document.addEventListener('touchstart', handleTouchStart, { passive: true });
      document.addEventListener('touchmove', handleTouchMove, { passive: true });
      document.addEventListener('touchend', handleTouchEnd, { passive: true });
      // Prevent body scroll when sidebar is open
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [mobileOpen]);

  // Keyboard shortcut: 'm' to toggle mobile menu (optional)
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'm' && !e.ctrlKey && !e.altKey) {
        setMobileOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden text-slate-900 relative bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Desktop Sidebar */}
      <DesktopSidebar ref={sidebarRef} user={user} handleLogout={handleLogout} />

      {/* Mobile Header — Floating Hamburger + Brand Pill */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 pointer-events-none">
        <div className="flex items-center justify-between px-3.5 pt-3.5">
          {/* Floating Hamburger Button */}
          <motion.button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="pointer-events-auto w-11 h-11 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-[0_2px_16px_-2px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.06)] flex items-center justify-center text-slate-700 active:scale-90 transition-all duration-200"
            whileTap={{ scale: 0.88 }}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            <AnimatePresence mode="wait" initial={false}>
              {mobileOpen ? (
                <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <X size={20} strokeWidth={2.5} />
                </motion.div>
              ) : (
                <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <Menu size={20} strokeWidth={2.5} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Floating Brand Pill */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="pointer-events-auto flex items-center gap-2.5 h-11 px-4 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-[0_2px_16px_-2px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.06)]"
          >
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-primary-500/10 to-secondary-500/10 border border-primary-500/20 flex items-center justify-center shadow-sm">
              <img src="/mslogo.png" alt="MS Logo" className="w-5 h-5 object-contain" />
            </div>
            <div className="flex flex-col -space-y-0.5">
              <span className="text-sm font-extrabold text-gradient leading-tight tracking-tight">MS Family</span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-tight">Finance Hub</span>
            </div>
          </motion.div>

          {/* Floating Notification + Avatar */}
          <div className="pointer-events-auto flex items-center gap-1.5">
            <motion.button
              onClick={() => setNotificationsOpen(prev => !prev)}
              whileTap={{ scale: 0.88 }}
              className="relative w-11 h-11 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-[0_2px_16px_-2px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.06)] flex items-center justify-center text-slate-500 active:scale-90 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              aria-label={isNotificationsOpen ? 'Close Notifications' : 'Open Notifications'}
            >
              <AnimatePresence mode="wait" initial={false}>
                {isNotificationsOpen ? (
                  <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <X size={20} strokeWidth={2.5} />
                  </motion.div>
                ) : (
                  <motion.div key="bell" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <Bell size={20} strokeWidth={2.5} />
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-accent-500 rounded-full ring-2 ring-white" aria-hidden="true" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <MobileSidebar
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        handleLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col m-3 ml-0 md:ml-0 z-10 h-[calc(100vh-1.5rem)] mt-[4.5rem] md:mt-3 pb-16 md:pb-0">
        {/* Top Bar */}
        <header className="h-14 md:h-16 flex items-center justify-between px-3 md:px-4 mb-2 md:mb-4 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold tracking-tight">{pageTitle}</h2>
            <p className="text-[11px] md:text-xs text-slate-500">
              Welcome back, <span className="text-primary-500 font-semibold">{user?.name?.split(' ')[0] || 'User'}</span>
            </p>
          </div>
          {/* Desktop-only notification bell */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => setNotificationsOpen(prev => !prev)}
              className="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-all duration-300 group focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label={isNotificationsOpen ? 'Close Notifications' : 'Open Notifications'}
            >
              <AnimatePresence mode="wait" initial={false}>
                {isNotificationsOpen ? (
                  <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <X size={20} strokeWidth={2.5} className="text-slate-500 group-hover:text-slate-900 transition-colors" />
                  </motion.div>
                ) : (
                  <motion.div key="bell" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <Bell size={20} className="text-slate-500 group-hover:text-slate-900 transition-colors" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-accent-500 rounded-full" aria-hidden="true" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className={`flex-1 overflow-x-hidden rounded-2xl pb-4 pr-1 custom-scrollbar ${location.pathname === '/add' ? 'overflow-y-hidden' : 'overflow-y-auto'}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Navigation (Optional - uncomment if desired) */}
      {/* <MobileBottomNav onNavigate={handleMobileNav} /> */}

      {/* Floating Notifications Panel */}
      <AnimatePresence>
        {isNotificationsOpen && (
          <>
            {/* Backdrop to close panel when clicking outside */}
            <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }}
               className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[60]"
               onClick={() => setNotificationsOpen(false)}
            />
            {/* Panel */}
            <motion.div
               initial={{ opacity: 0, scale: 0.95, y: -20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: -20 }}
               transition={{ type: "spring", stiffness: 300, damping: 25 }}
               className="fixed top-20 md:top-[4.5rem] right-4 left-4 md:left-auto md:w-[420px] max-h-[calc(100vh-6rem)] bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-[70] overflow-hidden flex flex-col"
            >
               <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                 <h2 className="font-bold text-slate-800 text-lg">Notifications</h2>
                 <button 
                   onClick={() => setNotificationsOpen(false)}
                   className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                   aria-label="Close notifications panel"
                 >
                   <X size={20} strokeWidth={2.5} />
                 </button>
               </div>
               <div className="overflow-y-auto custom-scrollbar p-5 pt-3 flex-1">
                 <Notifications />
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}