import React from 'react';
import { motion } from 'framer-motion';
import { Check, X, Clock, Loader2 } from 'lucide-react';
import type { FamilyRequest } from '../../types/family';

interface RequestCardProps {
  request: FamilyRequest;
  onAccept: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  index: number;
}

export const RequestCard = React.forwardRef<HTMLDivElement, RequestCardProps>(({
  request,
  onAccept,
  onReject,
  index,
}, ref) => {
  const [loading, setLoading] = React.useState<'accept' | 'reject' | null>(null);
  const name = request.profile?.name || 'Unknown User';
  const username = request.profile?.username;
  const avatar = request.profile?.avatar;

  const handleAction = async (action: 'accept' | 'reject') => {
    setLoading(action);
    try {
      if (action === 'accept') {
        await onAccept(request.id);
      } else {
        await onReject(request.id);
      }
    } catch (err) {
      console.error(`Error ${action}ing request:`, err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="glass-panel p-4 flex items-center gap-3 group"
    >
      {/* Avatar */}
      <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0">
        {avatar ? (
          <img src={avatar} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold text-sm">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{name}</p>
        {username && (
          <p className="text-xs text-slate-500 dark:text-slate-400">@{username}</p>
        )}
        {request.message && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 italic">
            "{request.message}"
          </p>
        )}
        <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
          <Clock size={10} />
          {new Date(request.created_at).toLocaleDateString()}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => handleAction('accept')}
          disabled={loading !== null}
          className="w-9 h-9 rounded-xl bg-success-500/10 text-success-500 border border-success-500/20 flex items-center justify-center hover:bg-success-500/20 transition-all active:scale-95 disabled:opacity-50"
        >
          {loading === 'accept' ? <Loader2 size={15} className="animate-spin" /> : <Check size={16} strokeWidth={3} />}
        </button>
        <button
          onClick={() => handleAction('reject')}
          disabled={loading !== null}
          className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center hover:bg-red-500/20 transition-all active:scale-95 disabled:opacity-50"
        >
          {loading === 'reject' ? <Loader2 size={15} className="animate-spin" /> : <X size={16} strokeWidth={3} />}
        </button>
      </div>
    </motion.div>
  );
});

RequestCard.displayName = 'RequestCard';

export default RequestCard;
