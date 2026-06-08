import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useFamily } from '../context/FamilyContext';
import { useLanguage } from '../context/LanguageContext';
import { ArrowLeft, Share2, Copy, Check, QrCode, Link2, MessageCircle } from 'lucide-react';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import QRCodeDisplay from '../components/family/QRCodeDisplay';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

export default function FamilyInvite() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { family } = useFamily();

  const [showQR, setShowQR] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const inviteLink = useMemo(() => {
    if (!family) return '';
    const baseUrl = import.meta.env.VITE_APP_URL || 
      (window.location.origin.includes('localhost') ? 'https://msfamilyupdate.vercel.app' : window.location.origin);
    return `${baseUrl}/family/join/${family.invite_token}`;
  }, [family]);

  if (!family) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">{t('No family found')}</p>
      </div>
    );
  }

  const copyText = async (text: string, type: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'code') {
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 2000);
      } else {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      }
    } catch {}
  };

  const handleShare = async () => {
    const shareText = `Hey! Join our family "${family.name}" on MS Family 👨‍👩‍👧‍👦\n\n` +
      `🔑 Family Code: ${family.family_code}\n` +
      `📲 App Deep Link: msfamily://family/join/${family.invite_token}\n` +
      `🔗 Web Join Link: ${inviteLink}`;

    const shareData = {
      title: `Join ${family.name} on MS Family`,
      text: shareText,
      url: inviteLink,
    };

    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share({
          title: shareData.title,
          text: shareText,
        });
      } catch {}
    } else if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {}
    } else {
      copyText(inviteLink, 'link');
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `Hey! Join our family "${family.name}" on MS Family 👨‍👩‍👧‍👦\n\n` +
      `🔑 Family Code: *${family.family_code}*\n` +
      `📲 App Deep Link: msfamily://family/join/${family.invite_token}\n` +
      `🔗 Web Join Link: ${inviteLink}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

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
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('Invite Members')}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">{family.name}</p>
        </div>
      </motion.div>

      {/* QR Code Section */}
      <motion.div variants={item} className="glass-panel p-6 text-center">
        <div className="mb-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{t('Scan to Join')}</p>
          <p className="text-sm text-slate-400">{t('Share this QR code with family members')}</p>
        </div>

        <button
          onClick={() => setShowQR(true)}
          className="mx-auto w-48 h-48 rounded-2xl bg-white border-2 border-dashed border-primary-500/30 flex flex-col items-center justify-center gap-3 hover:border-primary-500/50 hover:bg-primary-500/5 transition-all group"
        >
          <QrCode size={48} className="text-primary-500/60 group-hover:text-primary-500 transition-colors" />
          <span className="text-xs font-bold text-primary-500">{t('Tap to view QR')}</span>
        </button>
      </motion.div>

      {/* Family Code */}
      <motion.div variants={item} className="glass-panel p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{t('Family Code')}</p>
            <p className="text-2xl font-black tracking-[0.15em] text-primary-500 font-mono">{family.family_code}</p>
          </div>
          <button
            onClick={() => copyText(family.family_code, 'code')}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
              codeCopied
                ? 'bg-success-500/10 text-success-500 border border-success-500/20'
                : 'glass-btn text-slate-600 dark:text-slate-300'
            }`}
          >
            {codeCopied ? <Check size={18} /> : <Copy size={18} />}
          </button>
        </div>
      </motion.div>

      {/* Invite Link */}
      <motion.div variants={item} className="glass-panel p-5">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{t('Invite Link')}</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06] overflow-hidden">
            <p className="text-xs text-slate-600 dark:text-slate-300 font-mono truncate">{inviteLink}</p>
          </div>
          <button
            onClick={() => copyText(inviteLink, 'link')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 shrink-0 ${
              linkCopied
                ? 'bg-success-500/10 text-success-500 border border-success-500/20'
                : 'glass-btn text-slate-600 dark:text-slate-300'
            }`}
          >
            {linkCopied ? <Check size={16} /> : <Link2 size={16} />}
          </button>
        </div>
      </motion.div>

      {/* Share Buttons */}
      <motion.div variants={item} className="grid grid-cols-2 gap-3">
        <button
          onClick={handleWhatsAppShare}
          className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 text-sm font-bold border border-green-500/20 hover:bg-green-500/15 transition-all active:scale-95"
        >
          <MessageCircle size={18} />
          WhatsApp
        </button>
        <button
          onClick={handleShare}
          className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-primary-500/10 text-primary-500 text-sm font-bold border border-primary-500/20 hover:bg-primary-500/15 transition-all active:scale-95"
        >
          <Share2 size={18} />
          {t('Share')}
        </button>
      </motion.div>

      {/* QR Modal */}
      <QRCodeDisplay
        isOpen={showQR}
        onClose={() => setShowQR(false)}
        value={family.family_code}
        title={t('Scan to Join')}
        subtitle={family.name}
      />
    </motion.div>
  );
}
