import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Bell } from 'lucide-react';
import { sendPushToAllFamily } from '../../utils/pushService';
import { useAuth } from '../../context/AuthContext';

interface StatusState {
  type: 'success' | 'error';
  text: string;
}

const AdminNotifications: React.FC = () => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<StatusState | null>(null);

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim() || !user) return;

    setIsSending(true);
    setStatus(null);

    try {
      await sendPushToAllFamily(user.id, title, message);
      setStatus({ type: 'success', text: 'Broadcast notification sent successfully!' });
      setTitle('');
      setMessage('');
    } catch (err) {
      console.error('Broadcast failed:', err);
      setStatus({ type: 'error', text: 'Failed to send broadcast notification.' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Global Notifications</h2>

      <div className="bg-white dark:bg-[#1a1a2e] border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/20 text-purple-500 flex items-center justify-center">
            <Bell size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Broadcast Message</h3>
            <p className="text-sm text-slate-500">Send a push notification to all registered users.</p>
          </div>
        </div>

        <form onSubmit={handleSendBroadcast} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Notification Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., System Update"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0e0e1a] border border-slate-200 dark:border-slate-700/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Message Body
            </label>
            <textarea
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message here..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#0e0e1a] border border-slate-200 dark:border-slate-700/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none resize-none"
            />
          </div>

          {status && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3 rounded-xl text-sm font-semibold ${
                status.type === 'success' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-red-50 text-red-600 dark:bg-red-500/10'
              }`}
            >
              {status.text}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={isSending || !title.trim() || !message.trim()}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 text-white font-bold shadow-lg shadow-primary-500/25 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {isSending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Send size={18} />
                Send Broadcast
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminNotifications;
