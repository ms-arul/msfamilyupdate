import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Share2, QrCode } from 'lucide-react';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

interface FamilyCodeCardProps {
  familyCode: string;
  familyName: string;
  inviteToken: string;
  onShowQR?: () => void;
}

export const FamilyCodeCard: React.FC<FamilyCodeCardProps> = ({
  familyCode,
  familyName,
  inviteToken,
  onShowQR,
}) => {
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const inviteLink = `${window.location.origin}/family/join/${inviteToken}`;

  const copyToClipboard = useCallback(async (text: string, type: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'code') {
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 2000);
      } else {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      }
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
  }, []);

  const handleShare = useCallback(async () => {
    const shareData = {
      title: `Join ${familyName} on MS Family`,
      text: `Hey! Join our family "${familyName}" on MS Family.\n\nFamily Code: ${familyCode}\nOr use this link:`,
      url: inviteLink,
    };

    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share(shareData);
      } catch (err) {
        console.warn('Native share cancelled or failed:', err);
      }
    } else if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled
      }
    } else {
      copyToClipboard(inviteLink, 'link');
    }
  }, [familyCode, familyName, inviteLink, copyToClipboard]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-5 sm:p-6 relative overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute -top-20 -right-20 w-48 h-48 bg-gradient-to-bl from-primary-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">
          Family Code
        </h3>

        {/* Code display */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-primary-500/10 to-secondary-500/10 border border-primary-500/20 dark:border-primary-500/15">
            <span className="text-xl sm:text-2xl font-black tracking-[0.15em] text-primary-500 font-mono select-all">
              {familyCode}
            </span>
          </div>
          <button
            onClick={() => copyToClipboard(familyCode, 'code')}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
              codeCopied
                ? 'bg-success-500/10 text-success-500 border border-success-500/20'
                : 'glass-btn text-slate-600 dark:text-slate-300'
            }`}
          >
            {codeCopied ? <Check size={18} /> : <Copy size={18} />}
          </button>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2.5">
          <button
            onClick={() => copyToClipboard(inviteLink, 'link')}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all active:scale-95 ${
              linkCopied
                ? 'bg-success-500/10 text-success-500 border border-success-500/20'
                : 'glass-btn text-slate-600 dark:text-slate-300'
            }`}
          >
            {linkCopied ? <Check size={18} /> : <Copy size={18} />}
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {linkCopied ? 'Copied!' : 'Copy Link'}
            </span>
          </button>

          <button
            onClick={onShowQR}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl glass-btn text-slate-600 dark:text-slate-300 transition-all active:scale-95"
          >
            <QrCode size={18} />
            <span className="text-[10px] font-bold uppercase tracking-wider">QR Code</span>
          </button>

          <button
            onClick={handleShare}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-primary-500/10 text-primary-500 border border-primary-500/20 hover:bg-primary-500/15 transition-all active:scale-95"
          >
            <Share2 size={18} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Share</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default FamilyCodeCard;
