import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Bell, CheckCircle2, Trash2, CheckCheck, Inbox, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();

    if (!user) return;
    // Set up Realtime Subscription
    const subscription = supabase
      .channel(`notifications-${user.id}-${Date.now()}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setNotifications(prev => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new : n));
        } else if (payload.eventType === 'DELETE') {
          setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user, fetchNotifications]);

  const markAsRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const removeNotification = async (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await supabase.from('notifications').delete().eq('id', id);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    try {
      await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const clearAll = async () => {
    if (window.confirm('Are you sure you want to clear all notifications?')) {
      setNotifications([]);
      try {
        await supabase.from('notifications').delete().eq('user_id', user.id);
      } catch (error) {
        console.error('Error clearing notifications:', error);
      }
    }
  };

  const unreadCount = useMemo(() => notifications.filter(n => !n.is_read).length, [notifications]);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
      {/* Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          {/* Internal subtitle removed for cleaner floating panel UX */}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-bold hover:bg-indigo-100 transition-colors"
            >
              <CheckCheck size={14} /> Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 text-xs font-bold hover:bg-rose-100 transition-colors"
            >
              <Trash2 size={14} /> Clear all
            </button>
          )}
        </div>
      </motion.div>

      {/* Main List Section */}
      <motion.div variants={item} className="glass-panel overflow-hidden">
        <div className="divide-y divide-slate-100">
          {isLoading ? (
            <div className="py-12 flex justify-center text-slate-400">Loading notifications...</div>
          ) : (
            <AnimatePresence initial={false}>
              {notifications.length === 0 ? (
                <div className="py-16 text-center text-slate-500 flex flex-col items-center">
                  <Inbox size={48} className="opacity-30 mb-4" />
                  <p className="text-sm font-medium">No notifications yet.</p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const isRead = notification.is_read;
                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      key={notification.id}
                      onClick={() => !isRead && markAsRead(notification.id)}
                      className={`p-4 sm:p-5 flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-start justify-between transition-colors cursor-pointer ${
                        isRead ? 'bg-slate-50/50 grayscale-[0.3] opacity-75' : 'hover:bg-slate-50 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3 sm:gap-4 flex-1">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm border ${
                          isRead
                            ? 'bg-slate-100 text-slate-400 border-slate-200'
                            : 'bg-indigo-50 text-indigo-500 border-indigo-100 shadow-indigo-500/10'
                        }`}>
                          <Bell size={20} className={!isRead ? "animate-pulse" : ""} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className={`text-sm sm:text-base font-bold mb-1 ${isRead ? 'text-slate-600' : 'text-slate-900'}`}>
                            {notification.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-600 mb-2">
                            {notification.body || notification.message}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-400 font-medium">
                            <Clock size={12} />
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 self-end sm:self-center mt-2 sm:mt-0">
                        {!isRead && (
                          <button
                            onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                            className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100 shadow-sm"
                            title="Mark as Read"
                          >
                            <CheckCircle2 size={18} />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); removeNotification(notification.id); }}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100 shadow-sm"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}