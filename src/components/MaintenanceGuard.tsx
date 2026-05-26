import React, { useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  LogOut,
  Settings,
  ShieldAlert,
  RefreshCw,
  Database,
  Lock,
  Globe,
  CheckCircle2,
  Activity,
  Server,
  Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface MaintenanceGuardProps {
  children: ReactNode;
}

interface StatusMessage {
  text: string;
  isError: boolean;
}

export const MaintenanceGuard: React.FC<MaintenanceGuardProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const [maintenanceActive, setMaintenanceActive] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [realtimeStatus, setRealtimeStatus] = useState<string>('connecting');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const channelRef = useRef<any>(null);

  const isAdmin = user?.role?.toLowerCase() === 'admin' || user?.name === 'ArulPrakash';

  const showStatusMessage = (message: string, isError = false) => {
    setStatusMessage({ text: message, isError });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const fetchMaintenanceStatus = useCallback(async (showRefreshFeedback = false) => {
    if (showRefreshFeedback) setRefreshing(true);
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('phone')
        .eq('role', 'admin');

      if (profileError) throw profileError;

      let active = false;
      if (profileData) {
        for (const row of profileData) {
          if (row.phone) {
            try {
              const settings = JSON.parse(row.phone);
              if (settings && settings.maintenanceMode === true) {
                active = true;
                break;
              }
            } catch (e) { }
          }
        }
      }
      setMaintenanceActive(active);
      setLastUpdated(new Date());
      if (showRefreshFeedback) {
        showStatusMessage(active ? 'System still in maintenance mode' : 'Maintenance mode ended! Redirecting...');
      }
    } catch (err) {
      console.error('Error fetching maintenance status:', err);
      if (showRefreshFeedback) showStatusMessage('Failed to fetch status. Please try again.', true);
    } finally {
      if (showRefreshFeedback) setRefreshing(false);
      setLoading(false); // Fix: set loading to false so the application is not permanently stuck
    }
  }, []);

  useEffect(() => {
    fetchMaintenanceStatus();

    const channel = supabase
      .channel('maintenance_realtime_profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchMaintenanceStatus();
        showStatusMessage('Live update: Maintenance status changed');
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[MaintenanceGuard] Realtime connected');
          setRealtimeStatus('connected');
        } else if (status === 'CLOSED') {
          setRealtimeStatus('disconnected');
        }
      });

    channelRef.current = channel;
    const pollInterval = setInterval(() => fetchMaintenanceStatus(), 30000);

    return () => {
      clearInterval(pollInterval);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [fetchMaintenanceStatus]);

  // Premium loading screen
  if (loading) {
    return (
      <div className="relative h-full min-h-screen flex items-center justify-center bg-gradient-to-br from-[#05050d] via-[#0d0d1e] to-[#05050d] overflow-hidden">
        {/* Ambient grids */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #9ca3af 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }} />
        
        {/* Glow effects */}
        <div className="absolute w-[300px] h-[300px] rounded-full bg-violet-500/10 blur-[100px] animate-pulse" />
        
        <div className="relative z-10 text-center flex flex-col items-center">
          <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
            {/* Spinning gradient ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border-2 border-slate-800 border-t-violet-500 border-r-fuchsia-500"
            />
            {/* Outer soft glow ring */}
            <div className="absolute inset-[-4px] rounded-full border border-violet-500/10 animate-ping" />
            <ShieldAlert size={32} className="text-violet-400 animate-pulse" />
          </div>
          <h2 className="text-white text-sm font-bold tracking-widest uppercase mb-1">MS Family</h2>
          <p className="text-slate-500 text-[10px] font-bold tracking-wider uppercase animate-pulse">Establishing Secure Session...</p>
        </div>
      </div>
    );
  }

  const shouldBlock = maintenanceActive && user && !isAdmin;

  if (shouldBlock) {
    return (
      <AnimatePresence>
        <div className="relative h-full min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden bg-gradient-to-br from-[#06060e] via-[#0d0d1e] to-[#06060e]">
          {/* Glowing Ambient Light Orbs */}
          <motion.div
            animate={{ x: [0, 80, -40, 0], y: [0, -60, 30, 0], scale: [1, 1.15, 0.9, 1] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-violet-500/10 blur-[120px] pointer-events-none"
          />
          <motion.div
            animate={{ x: [0, -60, 50, 0], y: [0, 55, -70, 0], scale: [1, 0.85, 1.1, 1] }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full bg-fuchsia-500/10 blur-[120px] pointer-events-none"
          />
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #9ca3af 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }} />

          {/* Floating status toast */}
          <AnimatePresence>
            {statusMessage && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-[#0d0d1e]/90 backdrop-blur-md border border-white/10 shadow-xl"
              >
                <div className="flex items-center gap-2 text-xs font-semibold">
                  {statusMessage.isError ? (
                    <AlertTriangle size={14} className="text-rose-500" />
                  ) : (
                    <CheckCircle2 size={14} className="text-emerald-500" />
                  )}
                  <span className={statusMessage.isError ? 'text-rose-200' : 'text-emerald-200'}>
                    {statusMessage.text}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Maintenance Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg bg-[#0d0d1e]/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            {/* Ambient inner card glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header Icon & Branding */}
            <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              {/* Pulsing ring */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-violet-500 to-fuchsia-500 opacity-20 blur-lg animate-pulse" />
              
              <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 flex items-center justify-center shadow-lg">
                <Settings size={32} className="text-violet-400 animate-spin" style={{ animationDuration: '8s' }} />
              </div>
              <div className="absolute -top-1 -right-1 bg-amber-500/90 rounded-full p-1.5 border-2 border-[#06060e] shadow-md animate-bounce">
                <AlertTriangle size={12} className="text-white" />
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-center bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent mb-2">
              System Upgrades in Progress
            </h1>
            <p className="text-slate-400 text-center text-xs sm:text-sm leading-relaxed mb-6">
              We're optimizing database nodes and applying security updates. Thank you for your patience.
            </p>

            {/* Realtime Status Metrics */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <Activity size={12} className="text-violet-400" />
                  <span>Realtime Feed</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className={`w-2 h-2 rounded-full ${realtimeStatus === 'connected' ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]' : 'bg-amber-500 animate-pulse'}`} />
                  <span className="text-white text-xs font-mono font-bold">
                    {realtimeStatus === 'connected' ? 'SECURE_LIVE' : 'POLLING_MODE'}
                  </span>
                </div>
              </div>
              
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <Clock size={12} className="text-fuchsia-400" />
                  <span>Last Checked</span>
                </div>
                <span className="text-white text-xs font-mono font-bold mt-2">
                  {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Establishing...'}
                </span>
              </div>
            </div>

            {/* Maintenance Checklist / Progress Bars */}
            <div className="space-y-4 bg-white/[0.02] border border-white/5 rounded-2xl p-5 mb-8">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium flex items-center gap-2">
                    <Database size={14} className="text-violet-400" />
                    Database Performance Tuning
                  </span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 size={12} /> Done
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full" 
                    initial={{ width: 0 }} 
                    animate={{ width: '100%' }} 
                    transition={{ duration: 1.2, ease: "easeOut" }} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium flex items-center gap-2">
                    <Lock size={14} className="text-fuchsia-400" />
                    Security Framework Hardening
                  </span>
                  <span className="text-violet-400 font-bold flex items-center gap-1.5 animate-pulse">
                    <RefreshCw size={12} className="animate-spin" /> Active
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full" 
                    initial={{ width: 0 }} 
                    animate={{ width: '75%' }} 
                    transition={{ duration: 1.5, delay: 0.2, ease: "easeOut" }} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium flex items-center gap-2">
                    <Globe size={14} className="text-slate-400" />
                    Global Edge Cache Revalidation
                  </span>
                  <span className="text-slate-500 font-bold">Queued</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-slate-700 to-slate-600 rounded-full" 
                    initial={{ width: 0 }} 
                    animate={{ width: '25%' }} 
                    transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }} 
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => fetchMaintenanceStatus(true)}
                disabled={refreshing}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 border border-violet-500/20 text-white text-xs sm:text-sm font-bold shadow-lg shadow-violet-500/10 transition-all disabled:opacity-50"
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                {refreshing ? 'Verifying...' : 'Check Status'}
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={logout}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/5 text-slate-300 hover:text-white text-xs sm:text-sm font-bold transition-all"
              >
                <LogOut size={16} />
                Sign Out
              </motion.button>
            </div>
          </motion.div>

          {/* Footer Branding */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[9px] font-mono tracking-widest text-slate-600">
            <Server size={12} className="text-violet-500/50" />
            <span>MS FAMILY CLOUD NETWORK • ENCRYPTED SHA256</span>
          </div>
        </div>
      </AnimatePresence>
    );
  }

  return <>{children}</>;
};

export default MaintenanceGuard;
