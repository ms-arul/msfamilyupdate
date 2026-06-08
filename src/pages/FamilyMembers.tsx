import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { useLanguage } from '../context/LanguageContext';
import {
  ArrowLeft,
  Users,
  UserPlus,
  Crown,
  Shield,
  Sparkles,
  Search,
} from 'lucide-react';
import FamilyMemberCard from '../components/family/MemberCard';
import RequestCard from '../components/family/RequestCard';
import UserSearchModal from '../components/family/UserSearchModal';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

export default function FamilyMembers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const {
    family,
    members,
    pendingRequests,
    isAdmin,
    acceptRequest,
    rejectRequest,
    removeMember,
    promoteMember,
  } = useFamily();

  const [showSearch, setShowSearch] = useState(false);
  const [filter, setFilter] = useState<'all' | 'admin' | 'member'>('all');

  const filteredMembers = useMemo(() => {
    if (filter === 'all') return members;
    return members.filter(m => m.role === filter);
  }, [members, filter]);

  if (!family) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">{t('No family found')}</p>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 p-4 sm:p-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/settings/family-setup')}
            className="w-10 h-10 rounded-xl glass-btn flex items-center justify-center text-slate-600 dark:text-slate-300"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('Members')}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{family.name}</p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500/10 text-primary-500 text-xs font-bold border border-primary-500/20 hover:bg-primary-500/15 transition-all active:scale-95"
          >
            <UserPlus size={15} />
            {t('Invite')}
          </button>
        )}
      </motion.div>

      {/* Filter Tabs */}
      <motion.div variants={item} className="flex gap-2">
        {(['all', 'admin', 'member'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === f
                ? 'bg-primary-500/10 text-primary-500 border border-primary-500/20'
                : 'glass-btn text-slate-500 dark:text-slate-400'
            }`}
          >
            {f === 'all' && <Users size={12} className="inline-block mr-1 -mt-0.5" />}
            {f === 'admin' && <Crown size={12} className="inline-block mr-1 -mt-0.5" />}
            {f === 'member' && <Shield size={12} className="inline-block mr-1 -mt-0.5" />}
            {f === 'all' ? t('All') : f === 'admin' ? t('Admins') : t('Members')}
            <span className="ml-1 text-[10px] opacity-60">
              ({f === 'all' ? members.length : members.filter(m => m.role === f).length})
            </span>
          </button>
        ))}
      </motion.div>

      {/* Pending Requests */}
      {isAdmin && pendingRequests.length > 0 && (
        <motion.div variants={item} className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Sparkles size={16} className="text-yellow-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('Pending Requests')}</h3>
            <span className="text-[10px] font-bold text-white bg-yellow-500 px-2 py-0.5 rounded-full">
              {pendingRequests.length}
            </span>
          </div>
          <AnimatePresence mode="popLayout">
            {pendingRequests.map((req, idx) => (
              <RequestCard
                key={req.id}
                request={req}
                onAccept={acceptRequest}
                onReject={rejectRequest}
                index={idx}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Members Grid */}
      <motion.div variants={item} className="space-y-2.5">
        {filteredMembers.length === 0 ? (
          <div className="glass-panel p-8 text-center">
            <Search size={32} className="mx-auto text-slate-400 mb-3 opacity-40" />
            <p className="text-sm text-slate-500">{t('No members match this filter')}</p>
          </div>
        ) : (
          filteredMembers.map((member, idx) => (
            <FamilyMemberCard
              key={member.id}
              member={member}
              isCurrentUser={member.user_id === user?.id}
              isAdmin={isAdmin}
              onRemove={isAdmin ? removeMember : undefined}
              onPromote={isAdmin ? promoteMember : undefined}
              index={idx}
            />
          ))
        )}
      </motion.div>

      {/* User Search Modal */}
      <UserSearchModal
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
      />
    </motion.div>
  );
}
