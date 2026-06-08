import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useFamily } from '../context/FamilyContext';
import { useLanguage } from '../context/LanguageContext';
import {
  ArrowLeft,
  Hash,
  Link2,
  Mail,
  Loader2,
  Check,
  AlertCircle,
  ChevronRight,
  QrCode,
} from 'lucide-react';
import QRScanner from '../components/family/QRScanner';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

type Tab = 'code' | 'invitations';

export default function JoinFamily() {
  const navigate = useNavigate();
  const { code: urlCode } = useParams<{ code?: string }>();
  const { t } = useLanguage();
  const {
    joinFamilyByCode,
    joinFamilyByInviteToken,
    myInvitations,
    acceptInvitation,
    rejectInvitation,
    family,
  } = useFamily();

  const [activeTab, setActiveTab] = useState<Tab>('code');
  const [familyCode, setFamilyCode] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);

  // Auto-join if URL contains invite token
  useEffect(() => {
    if (urlCode && !family) {
      handleJoinByToken(urlCode);
    }
  }, [urlCode]);

  // Redirect if user already in a family
  useEffect(() => {
    if (family) {
      navigate('/settings/family-setup', { replace: true });
    }
  }, [family, navigate]);

  const handleJoinByCode = useCallback(async () => {
    const code = familyCode.trim().toUpperCase();
    if (!code) {
      setError(t('Please enter a family code'));
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await joinFamilyByCode(code, message.trim());
      setSuccess(t('Join request sent! The family admin will review your request.'));
      setFamilyCode('');
      setMessage('');
    } catch (err: any) {
      setError(err.message || t('Failed to join family'));
    } finally {
      setLoading(false);
    }
  }, [familyCode, message, joinFamilyByCode, t]);

  const handleJoinByToken = useCallback(async (token: string) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await joinFamilyByInviteToken(token);
      setSuccess(t('You have successfully joined the family!'));
      setTimeout(() => navigate('/settings/family-setup', { replace: true }), 1500);
    } catch (err: any) {
      setError(err.message || t('Invalid invite link'));
    } finally {
      setLoading(false);
    }
  }, [joinFamilyByInviteToken, navigate, t]);

  const handleScanSuccess = useCallback((scannedText: string) => {
    try {
      if (scannedText.includes('/family/join/')) {
        const parts = scannedText.split('/family/join/');
        const token = parts[parts.length - 1]?.split('?')[0]?.trim();
        if (token) {
          handleJoinByToken(token);
        } else {
          setError(t('Invalid QR code format'));
        }
      } else if (scannedText.startsWith('msfamily://join/')) {
        const parts = scannedText.split('msfamily://join/');
        const token = parts[1]?.trim();
        if (token) {
          handleJoinByToken(token);
        } else {
          setError(t('Invalid QR code format'));
        }
      } else {
        // Assume direct family code
        const code = scannedText.trim().toUpperCase();
        if (code.startsWith('MSF-') || code.length >= 6) {
          setFamilyCode(code);
          setSuccess(t('Family code imported from QR! Send join request to continue.'));
        } else {
          setError(t('Invalid QR code content'));
        }
      }
    } catch (err) {
      setError(t('Failed to process QR code'));
    }
  }, [handleJoinByToken, t]);

  const handleAcceptInvitation = async (invId: string) => {
    try {
      await acceptInvitation(invId);
    } catch (err: any) {
      setError(err.message || t('Failed to accept invitation'));
    }
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'code', label: t('Family Code'), icon: <Hash size={15} /> },
    { key: 'invitations', label: t('Invitations'), icon: <Mail size={15} />, count: myInvitations.length },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 p-4 sm:p-6 max-w-lg mx-auto">
      {/* Header */}
      <motion.div variants={item} className="flex items-center gap-3">
        <button
          onClick={() => navigate('/settings/family-setup')}
          className="w-10 h-10 rounded-xl glass-btn flex items-center justify-center text-slate-600 dark:text-slate-300"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('Join Family')}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('Enter a code or accept an invitation')}</p>
        </div>
      </motion.div>

      {/* Tab Switcher */}
      <motion.div variants={item} className="flex gap-1.5 bg-slate-100/80 dark:bg-white/[0.04] p-1 rounded-xl border border-slate-200/60 dark:border-white/[0.06]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setError(''); setSuccess(''); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === tab.key
                ? 'bg-white dark:bg-white/[0.08] text-primary-500 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="text-[9px] font-bold text-white bg-primary-500 px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </motion.div>

      {/* Status Messages */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2.5 text-xs text-red-400"
          >
            <AlertCircle size={14} className="shrink-0" />
            {error}
          </motion.div>
        )}
        {success && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3 rounded-xl bg-success-500/10 border border-success-500/20 flex items-center gap-2.5 text-xs text-success-500"
          >
            <Check size={14} className="shrink-0" />
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tab Content ────────────────────────────────────────────────────── */}
      {activeTab === 'code' && (
        <motion.div variants={item} className="space-y-4">
          <div className="glass-panel p-5 sm:p-6">
            <div className="text-center mb-5">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary-500/15 to-secondary-500/15 border border-primary-500/20 flex items-center justify-center mb-3">
                <Hash size={28} className="text-primary-500" />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('Ask your family admin for the family code')}
              </p>
            </div>

            {/* QR Scan Button */}
            <div className="mb-6 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setSuccess('');
                  setScannerOpen(true);
                }}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary-500/10 text-primary-500 text-sm font-bold border border-primary-500/20 hover:bg-primary-500/15 hover:border-primary-500/30 transition-all active:scale-95 shadow-sm"
              >
                <QrCode size={18} />
                {t('Scan QR Code')}
              </button>
            </div>

            {/* Code Input */}
            <div className="mb-4">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
                {t('Family Code')}
              </label>
              <input
                type="text"
                value={familyCode}
                onChange={(e) => {
                  setFamilyCode(e.target.value.toUpperCase());
                  setError('');
                  setSuccess('');
                }}
                placeholder="MSF-XXXXXX"
                className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200/60 dark:border-white/[0.08] text-center text-lg font-mono font-bold tracking-[0.15em] text-primary-500 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500/40 transition-all"
                maxLength={10}
                autoFocus
              />
            </div>

            {/* Optional Message */}
            <div className="mb-4">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
                {t('Message')} ({t('optional')})
              </label>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('Hi! I would like to join your family...')}
                className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200/60 dark:border-white/[0.08] text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 transition-all"
                maxLength={200}
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleJoinByCode}
              disabled={loading || !familyCode.trim()}
              className="btn-primary w-full"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={18} className="animate-spin" />
                  {t('Sending request...')}
                </span>
              ) : (
                t('Send Join Request')
              )}
            </button>
          </div>
        </motion.div>
      )}

      {activeTab === 'invitations' && (
        <motion.div variants={item} className="space-y-3">
          {myInvitations.length === 0 ? (
            <div className="glass-panel p-8 text-center">
              <Mail size={40} className="mx-auto text-slate-400 mb-3 opacity-40" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {t('No pending invitations')}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {t('Ask a family admin to send you an invitation')}
              </p>
            </div>
          ) : (
            myInvitations.map((inv, idx) => (
              <motion.div
                key={inv.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="glass-panel p-4 flex items-center gap-3"
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-md">
                  {inv.family?.avatar_url ? (
                    <img src={inv.family.avatar_url} alt={inv.family?.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold text-lg">
                      {inv.family?.name?.charAt(0)?.toUpperCase() || 'F'}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {inv.family?.name || 'Family'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('Invited by')} {inv.inviter?.name || 'Unknown'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                    {inv.family?.family_code}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => handleAcceptInvitation(inv.id)}
                    className="px-3 py-2 rounded-lg bg-success-500/10 text-success-500 text-xs font-bold border border-success-500/20 hover:bg-success-500/20 transition-all active:scale-95"
                  >
                    {t('Accept')}
                  </button>
                  <button
                    onClick={() => rejectInvitation(inv.id)}
                    className="px-3 py-2 rounded-lg bg-red-500/10 text-red-500 text-xs font-bold border border-red-500/20 hover:bg-red-500/20 transition-all active:scale-95"
                  >
                    {t('Decline')}
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      )}
      <QRScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </motion.div>
  );
}
