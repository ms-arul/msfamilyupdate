import React, { forwardRef } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
} from 'lucide-react';

export const navItems = [
  { icon: LayoutDashboard, text: 'Dashboard', to: '/' },
  { icon: ListOrdered, text: 'Transactions', to: '/transactions' },
  { icon: PlusCircle, text: 'New Record', to: '/add' },
  { icon: HandCoins, text: 'Loans', to: '/loans' },
  { icon: PieChart, text: 'Analytics', to: '/analytics' },
  { icon: CalendarDays, text: 'Calendar', to: '/calendar' },
  { icon: FileBadge, text: 'My Proofs', to: '/proofs' },
  { icon: Users, text: 'Family Hub', to: '/family' },
];

export const SidebarItem = React.memo(({ icon: Icon, text, to, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      `group flex items-center gap-3.5 px-4 py-3 my-1 rounded-xl transition-all duration-300 relative overflow-hidden ${
        isActive
          ? 'bg-primary-500/15 text-slate-900 border border-primary-500/30 shadow-glow-primary'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
      }`
    }
  >
    {({ isActive }) => (
      <>
        {isActive && (
          <motion.div
            layoutId="activeTab"
            className="absolute inset-0 bg-primary-500/10 rounded-xl"
            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
          />
        )}
        <Icon size={20} className="relative z-10" />
        <span className="font-medium text-sm relative z-10">{text}</span>
        {isActive && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-500 rounded-l-full shadow-glow-primary" />
        )}
      </>
    )}
  </NavLink>
));
SidebarItem.displayName = 'SidebarItem';

export const DesktopSidebar = forwardRef(({ user, handleLogout }, ref) => (
  <motion.aside
    ref={ref}
    initial={{ x: -300, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    className="hidden md:flex w-[260px] glass-panel-static m-3 flex-col z-10 shrink-0"
  >
    <div className="p-5 flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl bg-slate-900/5 flex items-center justify-center shadow-glow-primary overflow-hidden border border-slate-900/10">
        <img src="/mslogo.png" alt="MS Logo" className="w-9 h-9 object-contain" />
      </div>
      <div>
        <h1 className="text-xl font-bold text-gradient">MS Family</h1>
        <p className="text-[10px] text-slate-600 font-medium tracking-widest uppercase">
          Finance Hub
        </p>
      </div>
    </div>

    <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mx-4 my-2" />

    <nav className="flex-1 px-3 mt-2 overflow-y-auto">
      {navItems.map((item) => (
        <SidebarItem key={item.to} {...item} />
      ))}
    </nav>

    {/* User Card */}
    <div className="p-3 mt-auto">
      <div className="p-3 rounded-xl bg-white border border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-10 h-10 rounded-xl border border-primary-500/40 object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold">
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success-500 rounded-full border-2 border-background" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{user?.name || 'Guest'}</p>
            <p className="text-[11px] text-slate-600 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-300 text-sm border border-transparent hover:border-red-500/20"
          aria-label="Sign out"
        >
          <LogOut size={16} />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  </motion.aside>
));
DesktopSidebar.displayName = 'DesktopSidebar';

export const MobileSidebar = ({ mobileOpen, setMobileOpen, handleLogout }) => (
  <AnimatePresence>
    {mobileOpen && (
      <motion.div
        initial={{ opacity: 0, pointerEvents: 'none' }}
        animate={{ opacity: 1, pointerEvents: 'auto' }}
        exit={{ opacity: 0, pointerEvents: 'none' }}
        transition={{ duration: 0.2 }}
        className="md:hidden fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex justify-start"
        onClick={() => setMobileOpen(false)}
      >
        <motion.div
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          exit={{ x: -300 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-[280px] h-full bg-white p-4 flex flex-col shadow-2xl border-r border-slate-200"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-label="Navigation menu"
        >
          <div className="flex items-center gap-3 mb-6 mt-2">
            <img src="/mslogo.png" alt="MS Logo" className="w-8 h-8 object-contain" />
            <h1 className="text-xl font-bold text-gradient">MS Family</h1>
          </div>
          <nav className="flex-1 overflow-y-auto">
            {navItems.map((item) => (
              <SidebarItem key={item.to} {...item} onClick={() => setMobileOpen(false)} />
            ))}
          </nav>
          <div className="mt-auto pt-4 border-t border-border">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
              aria-label="Sign out"
            >
              <LogOut size={18} /> <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
