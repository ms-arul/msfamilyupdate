import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bell, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Import extracted slide bar components
import { DesktopSidebar, MobileSidebar, navItems } from './ui/Sidebar';

// ============================================================================
// Main Layout Component
// ============================================================================
export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
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

  // Close mobile sidebar when route changes
  useEffect(() => {
    setMobileOpen(false);
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
      document.addEventListener('touchstart', handleTouchStart);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
      // Prevent body scroll when sidebar is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.body.style.overflow = '';
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

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 glass-panel-static mx-3 mt-3 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/mslogo.png" alt="MS Logo" className="w-6 h-6 object-contain" />
          <span className="font-bold text-gradient">MS Family</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
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
        <header className="h-16 flex items-center justify-between px-2 md:px-4 mb-4 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold tracking-tight">{pageTitle}</h2>
            <p className="text-xs text-slate-600">
              Welcome back, <span className="text-primary-400">{user?.name?.split(' ')[0] || 'User'}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="relative p-2.5 rounded-xl hover:bg-slate-100 transition-all duration-300 group focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label="Notifications"
            >
              <Bell size={18} className="text-slate-500 group-hover:text-slate-900 transition-colors" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-accent-500 rounded-full" aria-hidden="true" />
            </button>
            <div className="md:hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt="avatar" className="w-9 h-9 rounded-xl border border-primary-500/30" />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white text-sm font-bold">
                  {user?.name?.charAt(0) || 'U'}
                </div>
              )}
            </div>
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
    </div>
  );
}