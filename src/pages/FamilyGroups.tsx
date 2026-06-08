import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { useLanguage } from '../context/LanguageContext';
import { staggerContainer, staggerItem } from '../utils/animations';
import {
  Users,
  Plus,
  LogIn,
  Crown,
  Shield,
  Settings,
  UserPlus,
  Share2,
  QrCode,
  ChevronRight,
  Loader2,
  Mail,
  DoorOpen,
  AlertTriangle,
  Sparkles,
  Hash,
  Copy,
  Check,
  ArrowLeft,
} from 'lucide-react';
import FamilyMemberCard from '../components/family/MemberCard';
import FamilyCodeCard from '../components/family/FamilyCodeCard';
import RequestCard from '../components/family/RequestCard';
import UserSearchModal from '../components/family/UserSearchModal';
import QRCodeDisplay from '../components/family/QRCodeDisplay';

const container = staggerContainer(0.06, 0.1);
const item = staggerItem;

// ============================================================================
// Main Component
// ============================================================================
export default function FamilyGroups() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const {
    family,
    members,
    pendingRequests,
    myInvitations,
    isAdmin,
    loading,
    acceptRequest,
    rejectRequest,
    removeMember,
    promoteMember,
    acceptInvitation,
    rejectInvitation,
    leaveFamily,
  } = useFamily();

  const [showQR, setShowQR] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Stats
  const memberCount = members.length;
  const adminCount = members.filter(m => m.role === 'admin').length;

  const inviteLink = useMemo(() => {
    if (!family) return '';
    return `${window.location.origin}/family/join/${family.invite_token}`;
  }, [family]);

  const handleLeaveFamily = async () => {
    setLeaveLoading(true);
    try {
      await leaveFamily();
    } catch (err) {
      console.error('Leave family error:', err);
    } finally {
      setLeaveLoading(false);
      setShowLeaveConfirm(false);
    }
  };

  const copyCode = async () => {
    if (!family) return;
    try {
      await navigator.clipboard.writeText(family.family_code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {}
  };

  // ── Loading State ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="glass-panel p-12 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full mx-auto mb-4" />
          <p className="text-slate-500 font-medium">{t('Loading family data...')}</p>
        </div>
      </div>
    );
  }

  // ── No Family State: Show Create/Join Options ─────────────────────────────
  if (!family) {
    return (
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 p-4 sm:p-6 pb-24 text-slate-900 dark:text-slate-100">
        {/* Header with back button */}
        <motion.div variants={item} className="flex items-center gap-3">
          <button
            onClick={() => navigate('/settings')}
            className="w-10 h-10 rounded-xl glass-btn flex items-center justify-center text-slate-600 dark:text-slate-300"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('Family Setup')}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('Create or join a family')}</p>
          </div>
        </motion.div>
        <motion.div variants={item} className="glass-panel p-6 sm:p-8 relative overflow-hidden text-center">
          <div className="absolute -top-24 -right-24 w-56 h-56 bg-gradient-to-bl from-primary-500/15 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-56 h-56 bg-gradient-to-tr from-secondary-500/15 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary-500/15 to-secondary-500/15 border border-primary-500/20 flex items-center justify-center mb-5">
              <Users size={36} className="text-primary-500" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {t('Family Groups')}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm max-w-sm mx-auto">
              {t('Create a family group or join an existing one to share finances, track expenses, and manage your household together.')}
            </p>
          </div>
        </motion.div>

        {/* Pending Invitations */}
        {myInvitations.length > 0 && (
          <motion.div variants={item} className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Mail size={16} className="text-primary-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('Pending Invitations')}</h3>
              <span className="text-[10px] font-bold text-white bg-primary-500 px-2 py-0.5 rounded-full">
                {myInvitations.length}
              </span>
            </div>
            {myInvitations.map((inv, idx) => (
              <motion.div
                key={inv.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="glass-panel p-4 flex items-center gap-3"
              >
                <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0">
                  {inv.family?.avatar_url ? (
                    <img src={inv.family.avatar_url} alt={inv.family?.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold text-sm">
                      {inv.family?.name?.charAt(0)?.toUpperCase() || 'F'}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {inv.family?.name || 'Family'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Invited by {inv.inviter?.name || 'Unknown'}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => acceptInvitation(inv.id)}
                    className="px-3 py-1.5 rounded-lg bg-success-500/10 text-success-500 text-xs font-bold border border-success-500/20 hover:bg-success-500/20 transition-all active:scale-95"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => rejectInvitation(inv.id)}
                    className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 text-xs font-bold border border-red-500/20 hover:bg-red-500/20 transition-all active:scale-95"
                  >
                    Decline
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <motion.button
            variants={item}
            onClick={() => navigate('/family/create')}
            className="glass-panel p-5 sm:p-6 text-left group hover:shadow-lg transition-all relative overflow-hidden"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-bl from-primary-500/10 to-transparent rounded-full blur-2xl pointer-events-none group-hover:from-primary-500/20 transition-all" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/25 mb-4">
                <Plus size={22} className="text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{t('Create Family')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('Start a new family group and invite your members')}
              </p>
              <ChevronRight size={18} className="text-primary-500 mt-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.button>

          <motion.button
            variants={item}
            onClick={() => navigate('/family/join')}
            className="glass-panel p-5 sm:p-6 text-left group hover:shadow-lg transition-all relative overflow-hidden"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-bl from-secondary-500/10 to-transparent rounded-full blur-2xl pointer-events-none group-hover:from-secondary-500/20 transition-all" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary-500 to-cyan-700 flex items-center justify-center shadow-lg shadow-secondary-500/25 mb-4">
                <LogIn size={22} className="text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{t('Join Family')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('Enter a family code or scan QR to join')}
              </p>
              <ChevronRight size={18} className="text-secondary-500 mt-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // ── Has Family: Show Family Dashboard ─────────────────────────────────────
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 p-4 sm:p-6 pb-24 text-slate-900 dark:text-slate-100">
      {/* Header with back button */}
      <motion.div variants={item} className="flex items-center gap-3">
        <button
          onClick={() => navigate('/settings')}
          className="w-10 h-10 rounded-xl glass-btn flex items-center justify-center text-slate-600 dark:text-slate-300"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('Family Settings')}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('Manage your family group')}</p>
        </div>
      </motion.div>

      {/* Family Hero Banner */}
      <motion.div variants={item} className="glass-panel p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-gradient-to-bl from-primary-500/15 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-gradient-to-tr from-secondary-500/15 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              {/* Family Avatar */}
              <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 shadow-lg border-2 border-white/50 dark:border-white/10">
                {family.avatar_url ? (
                  <img src={family.avatar_url} alt={family.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold text-2xl">
                    {family.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {family.name}
                </h2>
                {family.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                    {family.description}
                  </p>
                )}
              </div>
            </div>

            {isAdmin && (
              <button
                onClick={() => navigate('/family/members')}
                className="w-10 h-10 rounded-xl glass-btn flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0"
              >
                <Settings size={18} />
              </button>
            )}
          </div>

          {/* Stats Row */}
          <div className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-sm border border-white/50 dark:border-white/[0.06] text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t('Members')}</p>
                <p className="text-xl font-extrabold font-sans text-primary-500 mt-0.5">{memberCount}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-sm border border-white/50 dark:border-white/[0.06] text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t('Admins')}</p>
                <p className="text-xl font-extrabold font-sans text-yellow-500 mt-0.5">{adminCount}</p>
              </div>
            </div>
            
            <button
              onClick={copyCode}
              className="w-full p-3.5 rounded-xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-sm border border-white/50 dark:border-white/[0.06] flex items-center justify-between hover:bg-primary-500/5 transition-colors px-4"
            >
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t('Family Code')}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold font-mono text-primary-500 tracking-wider">{family.family_code}</span>
                {codeCopied ? <Check size={14} className="text-success-500" /> : <Copy size={13} className="text-slate-400" />}
              </div>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      {isAdmin && (
        <motion.div variants={item} className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500/10 text-primary-500 text-xs font-bold border border-primary-500/20 hover:bg-primary-500/15 transition-all active:scale-95 whitespace-nowrap"
          >
            <UserPlus size={15} />
            {t('Invite Members')}
          </button>
          <button
            onClick={() => setShowQR(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-btn text-slate-700 dark:text-slate-200 text-xs font-bold whitespace-nowrap transition-all active:scale-95"
          >
            <QrCode size={15} />
            {t('QR Code')}
          </button>
          <button
            onClick={() => navigate('/family/invite')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-btn text-slate-700 dark:text-slate-200 text-xs font-bold whitespace-nowrap transition-all active:scale-95"
          >
            <Share2 size={15} />
            {t('Share Link')}
          </button>
        </motion.div>
      )}

      {/* Pending Requests (Admin only) */}
      {isAdmin && pendingRequests.length > 0 && (
        <motion.div variants={item} className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Sparkles size={16} className="text-yellow-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('Join Requests')}</h3>
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

      {/* Share & Invite Card */}
      <motion.div variants={item}>
        <FamilyCodeCard
          familyCode={family.family_code}
          familyName={family.name}
          inviteToken={family.invite_token}
          onShowQR={() => setShowQR(true)}
        />
      </motion.div>

      {/* Members List */}
      <motion.div variants={item} className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-primary-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('Family Members')}</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">{memberCount} {t('members')}</span>
        </div>
        <div className="space-y-2.5">
          {members.map((member, idx) => (
            <FamilyMemberCard
              key={member.id}
              member={member}
              isCurrentUser={member.user_id === user?.id}
              isAdmin={isAdmin}
              onRemove={isAdmin ? removeMember : undefined}
              onPromote={isAdmin ? promoteMember : undefined}
              index={idx}
            />
          ))}
        </div>
      </motion.div>

      {/* Leave Family */}
      <motion.div variants={item} className="pt-2 pb-4">
        <button
          onClick={() => setShowLeaveConfirm(true)}
          className="w-full py-3 rounded-xl bg-red-500/8 text-red-500 text-sm font-bold border border-red-500/15 hover:bg-red-500/12 transition-all active:scale-[0.98]"
        >
          <DoorOpen size={16} className="inline-block mr-2 -mt-0.5" />
          {t('Leave Family')}
        </button>
      </motion.div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      {/* QR Code Modal */}
      <QRCodeDisplay
        isOpen={showQR}
        onClose={() => setShowQR(false)}
        value={family.family_code}
        title={t('Scan to Join')}
        subtitle={family.name}
      />

      {/* User Search Modal */}
      <UserSearchModal
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
      />

      {/* Leave Confirmation */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
              onClick={() => setShowLeaveConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-[110] flex items-center justify-center p-6"
            >
              <div className="bg-white dark:bg-[#111118] rounded-[24px] p-6 w-full max-w-[340px] shadow-2xl border border-slate-200/60 dark:border-white/[0.08] text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-200/50 dark:border-red-500/20">
                  <AlertTriangle size={28} className="text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('Leave Family?')}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  {t('You will lose access to all shared financial data. This action cannot be undone.')}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowLeaveConfirm(false)}
                    className="flex-1 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] transition-colors"
                  >
                    {t('Cancel')}
                  </button>
                  <button
                    onClick={handleLeaveFamily}
                    disabled={leaveLoading}
                    className="flex-1 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {leaveLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                    {t('Leave')}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
