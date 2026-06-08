import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useFamily } from '../context/FamilyContext';
import { useLanguage } from '../context/LanguageContext';
import {
  ArrowLeft,
  Users,
  Type,
  FileText,
  Loader2,
  Sparkles,
  Share2,
  Check,
  Copy,
  ChevronRight,
} from 'lucide-react';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

export default function CreateFamily() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { createFamily } = useFamily();

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdCode, setCreatedCode] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);

  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      setError(t('Family name is required'));
      return;
    }
    if (name.trim().length < 2) {
      setError(t('Name must be at least 2 characters'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const family = await createFamily(name.trim(), description.trim());
      setCreatedCode(family.family_code);
      setStep(2);
    } catch (err: any) {
      setError(err.message || t('Failed to create family'));
    } finally {
      setLoading(false);
    }
  }, [name, description, createFamily, t]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(createdCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {}
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 p-4 sm:p-6 max-w-lg mx-auto">
      {/* Header */}
      <motion.div variants={item} className="flex items-center gap-3">
        <button
          onClick={() => step === 1 ? navigate('/settings/family-setup') : setStep(1)}
          className="w-10 h-10 rounded-xl glass-btn flex items-center justify-center text-slate-600 dark:text-slate-300"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('Create Family')}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">{step === 1 ? t('Step 1 of 2 — Details') : t('Step 2 of 2 — Share')}</p>
        </div>
      </motion.div>

      {step === 1 ? (
        /* ── Step 1: Name & Description ────────────────────────────────────── */
        <>
          {/* Icon */}
          <motion.div variants={item} className="text-center pt-4">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary-500/15 to-secondary-500/15 border border-primary-500/20 flex items-center justify-center mb-3">
              <Users size={36} className="text-primary-500" />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
              {t('Give your family a name and optional description')}
            </p>
          </motion.div>

          {/* Form */}
          <motion.div variants={item} className="space-y-4">
            {/* Family Name */}
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
                {t('Family Name')} *
              </label>
              <div className="relative">
                <Type className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(''); }}
                  placeholder={t('e.g., The Smiths, MS Family')}
                  className="input-field"
                  maxLength={50}
                  autoFocus
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
                {t('Description')} ({t('optional')})
              </label>
              <div className="relative">
                <FileText className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('A short description about your family...')}
                  className="input-field !h-24 resize-none"
                  maxLength={200}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1 text-right">{description.length}/200</p>
            </div>

            {/* Error */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2"
              >
                {error}
              </motion.p>
            )}

            {/* Create Button */}
            <button
              onClick={handleCreate}
              disabled={loading || !name.trim()}
              className="btn-primary w-full !mt-6 relative overflow-hidden"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={18} className="animate-spin" />
                  {t('Creating...')}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Sparkles size={18} />
                  {t('Create Family Group')}
                </span>
              )}
            </button>
          </motion.div>
        </>
      ) : (
        /* ── Step 2: Success & Share ────────────────────────────────────────── */
        <>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center pt-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.2 }}
              className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-success-500/20 to-emerald-500/20 border border-success-500/30 flex items-center justify-center mb-4"
            >
              <Check size={36} className="text-success-500" />
            </motion.div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">
              {t('Family Created!')} 🎉
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('Share this code with your family members')}
            </p>
          </motion.div>

          {/* Family Code Display */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-panel p-6 text-center"
          >
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">{t('Your Family Code')}</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl font-black tracking-[0.2em] text-primary-500 font-mono">
                {createdCode}
              </span>
              <button
                onClick={copyCode}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
                  codeCopied
                    ? 'bg-success-500/10 text-success-500 border border-success-500/20'
                    : 'glass-btn text-slate-600 dark:text-slate-300'
                }`}
              >
                {codeCopied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-3"
          >
            <button
              onClick={() => navigate('/family/invite')}
              className="w-full flex items-center justify-between px-5 py-4 rounded-xl glass-panel hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
                  <Share2 size={18} className="text-primary-500" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{t('Share Invite Link')}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('QR code, link, or share via apps')}</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => navigate('/settings/family-setup')}
              className="btn-primary w-full"
            >
              {t('Go to Family Dashboard')}
            </button>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
