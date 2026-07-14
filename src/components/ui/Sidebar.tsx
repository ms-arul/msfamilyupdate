import React, { forwardRef } from 'react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { slideFromLeft, staggerContainer, staggerItem } from '../../utils/animations';
import {
  LayoutDashboard,
  PlusCircle,
  PieChart,
  CalendarDays,
  Users,
  LogOut,
  ListOrdered,
  HandCoins,
  FileBadge,
  ChevronRight,
  MapPin,
  Settings,
  Wallet,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

export const navItems = [
  { icon: LayoutDashboard, text: 'Dashboard', to: '/' },
  { icon: ListOrdered, text: 'Transactions', to: '/transactions' },
  { icon: PlusCircle, text: 'New Record', to: '/add' },
  { icon: Sparkles, text: 'Subscription', to: '/subscription' },
  { icon: Wallet, text: 'Savings', to: '/savings' },
  { icon: HandCoins, text: 'Loans', to: '/loans' },
  { icon: PieChart, text: 'Analytics', to: '/analytics' },
  { icon: CalendarDays, text: 'Calendar', to: '/calendar' },
  { icon: FileBadge, text: 'My Proofs', to: '/proofs' },
  { icon: Users, text: 'Family Hub', to: '/family' },
  { icon: MapPin, text: 'Live Tracking', to: '/tracking' },
  { icon: Settings, text: 'Settings', to: '/settings' },
];

interface SidebarItemProps {
  icon: React.ComponentType<any>;
  text: string;
  to: string;
  onClick?: () => void;
  layoutId?: string;
}

export const SidebarItem: React.FC<SidebarItemProps> = React.memo(({ icon: Icon, text, to, onClick, layoutId }) => {
  const { t } = useLanguage();
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `group relative flex items-center gap-3.5 px-3.5 py-2.5 my-0.5 rounded-xl transition-all duration-200 ${isActive
          ? 'text-slate-900 dark:text-white bg-gradient-to-r from-primary-500/15 via-primary-500/5 to-transparent shadow-sm'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50/80 dark:hover:bg-white/5'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {/* Left accent bar */}
          {isActive && (
            <motion.div
              layoutId={layoutId || "sidebar-active-accent"}
              className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-gradient-to-b from-primary-500 to-primary-400 rounded-r-full"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}

          {/* Icon */}
          <Icon
            size={20}
            className={`shrink-0 transition-colors duration-200 ${isActive ? 'text-primary-600 drop-shadow-sm' : 'group-hover:text-primary-500'}`}
          />

          {/* Text */}
          <span
            className={`min-w-0 flex-1 truncate text-[15px] transition-all duration-200 ${isActive ? 'font-semibold tracking-wide' : 'font-medium'}`}
            title={t(text)}
          >
            {t(text)}
          </span>

          {/* Chevron for inactive */}
          {!isActive && (
            <ChevronRight size={14} className="absolute right-3 text-primary-400 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
          )}
        </>
      )}
    </NavLink>
  );
});
SidebarItem.displayName = 'SidebarItem';

interface DesktopSidebarProps {
  user: any;
  handleLogout: () => void;
}

export const DesktopSidebar = forwardRef<HTMLElement, DesktopSidebarProps>(({ user, handleLogout }, ref) => {
  const { t } = useLanguage();
  return (
    <aside
      ref={ref as any}
      className="hidden md:flex md:w-[220px] lg:w-[260px] xl:w-[280px] transition-all duration-300 relative flex-col shrink-0 z-10"
    >
      {/* Glass panel with depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-white/90 to-white/95 dark:from-[#050505]/95 dark:via-[#0a0a0a]/90 dark:to-[#050505]/95 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-slate-800/20 shadow-2xl shadow-slate-200/50 dark:shadow-black/50 m-3" />

      {/* Floating gradient orb decoration */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-primary-500/20 to-secondary-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-gradient-to-tr from-primary-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full p-3">
        {/* Logo section */}
        <div className="p-3 flex items-center gap-2 mb-1 mt-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden"
          >
            <img src="/msfamilyinside.png" alt="MS Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col items-center justify-center pt-1">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent leading-tight pb-[2px] mb-0">
              MS {t('Family')}
            </h1>
            <p className="text-[11px] text-primary-600 font-bold tracking-[0.15em] uppercase leading-tight text-center">
              {t('Finance Hub')}
            </p>
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent mx-2 my-1" />

        {/* Navigation */}
        <nav className="flex-1 px-2 mt-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <SidebarItem key={item.to} {...item} layoutId="desktop-sidebar-active-accent" />
          ))}
          {(user?.role?.toLowerCase() === 'admin' || user?.name === 'ArulPrakash') && (
            <SidebarItem icon={ShieldAlert} text="Admin Panel" to="/admin" layoutId="desktop-sidebar-active-accent" />
          )}
        </nav>

        {/* Enhanced User Card with hover effects */}
        <div className="px-2 pb-4">
          <motion.div
            whileHover={{ y: -2, scale: 1.02 }}
            transition={{ duration: 0.2 }}
            className="relative p-3 rounded-xl bg-gradient-to-br from-slate-50 to-white dark:from-[#0a0a0a] dark:to-[#111111] border border-slate-200/80 dark:border-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-black/30 overflow-hidden group"
          >
            {/* Animated gradient overlay on hover */}
            <motion.div
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              className="absolute inset-0 bg-gradient-to-r from-primary-500/5 via-transparent to-transparent"
            />

            <div className="relative z-10 flex items-center gap-2 mb-3">
              <div className="relative">
                {user?.avatar ? (
                  <motion.img
                    whileHover={{ scale: 1.05 }}
                    src={user.avatar}
                    alt={user.name}
                    className="w-10 h-10 rounded-xl border-2 border-primary-500/40 object-cover shadow-md"
                  />
                ) : (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold text-base shadow-md"
                  >
                    {user?.name?.charAt(0) || 'U'}
                  </motion.div>
                )}
                {/* Online status indicator with pulse */}
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-md"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{t(user?.name || 'Guest User')}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email || 'guest@msfamily.com'}</p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all duration-300 border border-red-200/50 dark:border-red-500/20"
            >
              <LogOut size={14} />
              <span className="text-[13px] font-semibold">{t('Sign Out')}</span>
            </button>
          </motion.div>
        </div>
      </div>
    </aside>
  );
});
DesktopSidebar.displayName = 'DesktopSidebar';

interface MobileSidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  handleLogout: () => void;
  user: any;
}

export const MobileSidebar: React.FC<MobileSidebarProps> = ({ mobileOpen, setMobileOpen, handleLogout, user }) => {
  const { t } = useLanguage();
  return (
    <AnimatePresence>
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="md:hidden fixed inset-0 z-[60] bg-black/60 flex justify-start"
          onClick={() => setMobileOpen(false)}
        >
          <motion.div
            variants={slideFromLeft}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-[280px] h-full bg-gradient-to-b from-slate-50 to-white dark:from-[#050505] dark:to-[#0a0a0a] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Navigation menu"
          >
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 right-0 h-36 bg-gradient-to-br from-primary-500/10 to-secondary-500/10 dark:from-primary-500/15 dark:to-secondary-500/15 rounded-b-3xl" />

            <div className="relative z-10 flex flex-col h-full">
              {/* Logo */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 px-4 pt-10 pb-4 mt-2"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden"
                >
                  <img src="/msfamilyinside.png" alt="MS Logo" className="w-full h-full object-contain" />
                </div>
                <div className="flex flex-col items-center justify-center pt-1">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent leading-tight pb-[2px] mb-0">
                    MS {t('Family')}
                  </h1>
                  <p className="text-[11px] text-primary-600 font-bold tracking-[0.15em] uppercase leading-tight text-center">{t('Finance Hub')}</p>
                </div>
              </motion.div>

              {/* User Profile Card for Mobile */}
              {user && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="mx-3 mb-2 p-2.5 rounded-xl bg-gradient-to-r from-white to-slate-50 dark:from-[#0a0a0a] dark:to-[#111111] border border-slate-200 dark:border-slate-800/30 shadow-md dark:shadow-black/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {user?.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-xl border border-primary-500/40 object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold">
                          {user?.name?.charAt(0) || 'U'}
                        </div>
                      )}
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{t(user?.name || 'Guest')}</p>
                      <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent mx-4" />

              <motion.nav
                variants={staggerContainer(0.03, 0.05)}
                initial="hidden"
                animate="show"
                className="flex-1 overflow-y-auto px-2 py-2 custom-scrollbar"
              >
                {navItems.map((item) => (
                  <motion.div key={item.to} variants={staggerItem}>
                    <SidebarItem {...item} layoutId="mobile-sidebar-active-accent" onClick={() => setMobileOpen(false)} />
                  </motion.div>
                ))}
                {(user?.role?.toLowerCase() === 'admin' || user?.name === 'ArulPrakash') && (
                  <motion.div key="/admin" variants={staggerItem}>
                    <SidebarItem icon={ShieldAlert} text="Admin Panel" to="/admin" layoutId="mobile-sidebar-active-accent" onClick={() => setMobileOpen(false)} />
                  </motion.div>
                )}
              </motion.nav>

              {/* Bottom action */}
              <div className="px-3 pb-8 pt-1 border-t border-slate-200 dark:border-slate-700/30">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all duration-300 border border-red-200/50 dark:border-red-500/20"
                >
                  <LogOut size={16} />
                  <span className="font-semibold text-sm">{t('Sign Out')}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
