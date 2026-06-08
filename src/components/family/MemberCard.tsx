import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Shield, UserMinus, ArrowUpCircle, MoreVertical } from 'lucide-react';
import type { FamilyMember } from '../../types/family';

interface FamilyMemberCardProps {
  member: FamilyMember;
  isCurrentUser: boolean;
  isAdmin: boolean; // Is the current user an admin?
  onRemove?: (memberId: string) => void;
  onPromote?: (memberId: string) => void;
  index: number;
}

const memberGradients = [
  'from-primary-500 to-primary-700',
  'from-secondary-500 to-cyan-700',
  'from-accent-500 to-rose-700',
  'from-success-500 to-emerald-700',
  'from-warning-500 to-amber-700',
  'from-indigo-500 to-violet-700',
];

export const FamilyMemberCard: React.FC<FamilyMemberCardProps> = ({
  member,
  isCurrentUser,
  isAdmin,
  onRemove,
  onPromote,
  index,
}) => {
  const [showActions, setShowActions] = React.useState(false);
  const gradient = memberGradients[index % memberGradients.length];
  const name = member.profile?.name || 'Unknown';
  const username = member.profile?.username;
  const avatar = member.profile?.avatar;
  const isOwner = member.role === 'admin';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="glass-panel p-4 relative overflow-hidden group"
    >
      {/* Hover gradient */}
      <div className={`absolute inset-0 bg-gradient-to-t ${gradient} opacity-0 group-hover:opacity-[0.06] transition-opacity duration-500 pointer-events-none`} />

      <div className="relative z-10 flex items-center gap-3">
        {/* Avatar */}
        <div className={`w-12 h-12 rounded-xl overflow-hidden shadow-md shrink-0 ${!avatar ? `bg-gradient-to-br ${gradient}` : ''}`}>
          {avatar ? (
            <img src={avatar} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{name}</p>
            {isCurrentUser && (
              <span className="text-[9px] font-bold text-primary-500 bg-primary-500/10 px-1.5 py-0.5 rounded-full border border-primary-500/20">
                You
              </span>
            )}
          </div>
          {username && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">@{username}</p>
          )}
          <div className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border mt-1 ${
            isOwner
              ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
              : 'text-slate-500 bg-slate-500/10 border-slate-500/15 dark:text-slate-400'
          }`}>
            {isOwner ? <Crown size={10} /> : <Shield size={10} />}
            {isOwner ? 'Admin' : 'Member'}
          </div>
        </div>

        {/* Admin actions */}
        {isAdmin && !isCurrentUser && (
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all"
            >
              <MoreVertical size={16} />
            </button>

            {showActions && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowActions(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="absolute right-0 top-10 z-40 w-44 bg-white dark:bg-[#1a1a24] rounded-xl shadow-xl border border-slate-200/60 dark:border-white/[0.08] overflow-hidden"
                >
                  {!isOwner && onPromote && (
                    <button
                      onClick={() => { onPromote(member.id); setShowActions(false); }}
                      className="w-full px-4 py-2.5 flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors"
                    >
                      <ArrowUpCircle size={15} className="text-primary-500" />
                      Promote to Admin
                    </button>
                  )}
                  {onRemove && (
                    <button
                      onClick={() => { onRemove(member.id); setShowActions(false); }}
                      className="w-full px-4 py-2.5 flex items-center gap-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/[0.06] transition-colors"
                    >
                      <UserMinus size={15} />
                      Remove Member
                    </button>
                  )}
                </motion.div>
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default FamilyMemberCard;
