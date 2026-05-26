import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Activity } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../lib/supabase';

interface Stats {
  users: number;
  transactions: number;
  notifications: number;
}

interface LogEntry {
  id: string;
  type: string;
  amount: number;
  date: string;
  category: string;
  profiles: {
    name: string;
  } | null;
}

interface ConsistencyUser {
  name: string;
  activeDays: number;
}

const AdminDashboard: React.FC = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState<Stats>({
    users: 0,
    transactions: 0,
    notifications: 0,
  });
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([]);
  const [consistencyData, setConsistencyData] = useState<ConsistencyUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch total users
        const { count: userCount, error: userError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Fetch total transactions
        const { count: txCount, error: txError } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true });

        // Fetch total notifications sent
        const { count: notifCount, error: notifError } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true });

        // Fetch recent system logs (transactions)
        const { data: logsData } = await supabase
          .from('transactions')
          .select('*, profiles(name)')
          .order('date', { ascending: false })
          .limit(5);

        // Fetch transactions from the last 30 days for consistency calculation
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: recentAllTx } = await supabase
          .from('transactions')
          .select('member_id, date, profiles(name)')
          .gte('date', thirtyDaysAgo);

        if (!userError && !txError && !notifError) {
          setStats({
            users: userCount || 0,
            transactions: txCount || 0,
            notifications: notifCount || 0,
          });
        }
        if (logsData) {
          setRecentLogs(logsData as unknown as LogEntry[]);
        }
        
        if (recentAllTx) {
          const userActivityMap: Record<string, Set<string>> = {};
          recentAllTx.forEach(tx => {
            const userName = (tx.profiles as any)?.name || 'Unknown';
            if (!userActivityMap[userName]) {
              userActivityMap[userName] = new Set<string>();
            }
            // Add the transaction date (YYYY-MM-DD) to the Set to count unique active days
            const dateStr = new Date(tx.date).toISOString().split('T')[0];
            userActivityMap[userName].add(dateStr);
          });
          
          const consistencyArr = Object.entries(userActivityMap)
            .map(([name, daysSet]) => ({ name, activeDays: daysSet.size }))
            .sort((a, b) => b.activeDays - a.activeDays)
            .slice(0, 5); // Top 5 consistent users
            
          setConsistencyData(consistencyArr);
        }
      } catch (err) {
        console.error('Error fetching admin stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { label: 'Total Users', value: stats.users, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    { label: 'Total Transactions', value: stats.transactions, icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t('System Overview')}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="p-5 rounded-2xl bg-white dark:bg-[#1a1a2e] border border-slate-200 dark:border-slate-700/50 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t(stat.label)}</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</h3>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-white dark:bg-[#1a1a2e] border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 sm:p-6 shadow-sm mt-8"
      >
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
          {t('Recent System Activity')}
        </h3>
        <div className="space-y-4">
          {recentLogs.length > 0 ? recentLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-4 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 rounded-xl transition-colors">
              <div className={`w-2 h-2 mt-2 rounded-full ${log.type === 'income' ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <div className="flex-1">
                <p className="text-sm text-slate-900 dark:text-white font-medium">
                  {log.profiles?.name || 'A user'} logged an {log.type} of ₹{log.amount}
                </p>
                <p className="text-xs text-slate-500">{new Date(log.date).toLocaleString()} • {log.category}</p>
              </div>
            </div>
          )) : (
            <p className="text-sm text-slate-500">{t('No recent activity.')}</p>
          )}
        </div>
      </motion.div>

      {/* User Consistency Leaderboard */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="bg-white dark:bg-[#1a1a2e] border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 sm:p-6 shadow-sm mt-6"
      >
        <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">
            {t('User Consistency Leaderboard (Last 30 Days)')}
          </h3>
        </div>
        <div className="space-y-4">
          {consistencyData.length > 0 ? consistencyData.map((user, idx) => (
            <div key={user.name} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 rounded-2xl transition-all border border-slate-100 dark:border-slate-700/30 bg-white/50 dark:bg-transparent shadow-sm hover:shadow-md">
              <div className="flex items-center gap-3 mb-2 sm:mb-0">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-sm sm:text-base ${
                  idx === 0 ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 shadow-sm shadow-amber-500/20' :
                  idx === 1 ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300' :
                  idx === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400' :
                  'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                }`}>
                  {idx + 1}
                </div>
                <p className="text-sm sm:text-base text-slate-900 dark:text-white font-extrabold truncate max-w-[150px] sm:max-w-none">{user.name}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden min-w-[60px]">
                  <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: `${(user.activeDays / 30) * 100}%` }} 
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-primary-400 to-secondary-500 rounded-full"
                  />
                </div>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 w-12 text-right shrink-0">
                  {user.activeDays}/30
                </span>
              </div>
            </div>
          )) : (
            <p className="text-sm text-slate-500">{t('No consistency data available yet.')}</p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;
