import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Users, Bell, ShieldAlert, Settings, CreditCard } from 'lucide-react';
import AdminDashboard from '../components/admin/AdminDashboard';
import UserManagement from '../components/admin/UserManagement';
import AdminNotifications from '../components/admin/AdminNotifications';
import SystemSettings from '../components/admin/SystemSettings';
import { AdminMonetizationPanel } from './AdminMonetization';
import { useLanguage } from '../context/LanguageContext';
import { useSearchParams } from 'react-router-dom';

const AdminPanel: React.FC = () => {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'dashboard';
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="h-full flex flex-col p-4 md:p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="text-red-500" size={24} />
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">{t('Admin Control Panel')}</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Secure management interface for system administrators.
          </p>
        </div>
      </div>

      {/* Custom Tabs */}
      <div className="grid grid-cols-2 sm:flex sm:overflow-x-auto custom-scrollbar gap-2 p-1.5 bg-white dark:bg-[#1a1a2e] rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm mb-6 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative w-full sm:flex-1 sm:min-w-[120px] flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 px-2 sm:px-4 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 ${
              activeTab === tab.id
                ? 'text-white'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="admin-active-tab"
                className="absolute inset-0 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl"
                initial={false}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <tab.icon size={16} className={activeTab === tab.id ? 'text-white' : ''} />
              {t(tab.label)}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="pb-20"
          >
            {activeTab === 'dashboard' && <AdminDashboard />}
            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'billing' && <AdminMonetizationPanel />}
            {activeTab === 'notifications' && <AdminNotifications />}
            {activeTab === 'settings' && <SystemSettings />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminPanel;
