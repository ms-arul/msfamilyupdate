import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Copy,
  Share2,
  Printer,
  Search,
  X,
  ExternalLink,
  Globe,
  Mail,
  CheckCircle2,
  Info
} from 'lucide-react';
import { APP_INFO_DOCS, AppInfoDoc } from '../data/appInfoDocs';
import { useLanguage } from '../context/LanguageContext';

interface AppInfoDocViewerProps {
  docId: string;
}

const SPRING_SOFT = { type: 'spring', stiffness: 380, damping: 30 } as const;

export function AppInfoDocViewer({ docId }: AppInfoDocViewerProps) {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const doc = useMemo<AppInfoDoc | null>(() => APP_INFO_DOCS[docId] || null, [docId]);

  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as any });
  }, [docId]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // ── Action Handlers ──
  const getDocText = (): string => {
    if (!doc) return '';
    let text = `${doc.title}\n`;
    if (doc.subtitle) text += `${doc.subtitle}\n`;
    if (doc.lastUpdated) text += `${t('Last Updated')}: ${doc.lastUpdated}\n\n`;

    doc.sections.forEach(s => {
      text += `\n${s.title}\n`;
      if (Array.isArray(s.content)) {
        text += s.content.join('\n');
      } else {
        text += s.content;
      }
      text += '\n';
    });
    return text;
  };

  const handleCopy = () => {
    const text = getDocText();
    navigator.clipboard.writeText(text);
    showToast(t('Copied to clipboard!'));
  };

  const handleShare = async () => {
    const text = getDocText();
    if (navigator.share) {
      try {
        await navigator.share({
          title: doc?.title || 'MS Family Document',
          text: text,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled or share failed
        console.warn('Web Share failed:', err);
      }
    } else {
      navigator.clipboard.writeText(text);
      showToast(t('Copied sharing content to clipboard!'));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // ── Highlight Search Query utility ──
  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${highlight.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark key={i} className="bg-yellow-500/30 text-yellow-900 dark:text-yellow-100 rounded-sm px-0.5 font-bold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  // ── Filtered Sections ──
  const filteredSections = useMemo(() => {
    if (!doc) return [];
    if (!searchQuery.trim()) return doc.sections;

    return doc.sections.filter(
      section =>
        section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (Array.isArray(section.content)
          ? section.content.some(line => line.toLowerCase().includes(searchQuery.toLowerCase()))
          : section.content.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [doc, searchQuery]);

  if (!doc) {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-screen text-center">
        <Info size={48} className="text-red-500 mb-4 animate-bounce" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{t('Document Not Found')}</h2>
        <button
          onClick={() => navigate('/settings')}
          className="px-6 py-2.5 bg-primary-500 text-white rounded-xl font-bold transition-all hover:bg-primary-600"
        >
          {t('Back to Settings')}
        </button>
      </div>
    );
  }

  const isAbout = doc.id === 'about';
  const isVersion = doc.id === 'version';
  const isContact = doc.id === 'contact';

  return (
    <div className="relative min-h-full text-slate-900 dark:text-slate-100 overflow-y-auto custom-scrollbar px-4 pt-4 pb-28 animate-[fadeIn_0.2s_ease-out] print:p-0 print:pb-0">
      
      {/* Print-only CSS block */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="max-w-[420px] mx-auto print:max-w-none print:w-full print-content">
        
        {/* ── AppBar (Header Row) ── */}
        <div className="flex items-center justify-between mb-5 no-print">
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => navigate('/settings/app-info')}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/60 dark:bg-white/[0.05] border border-slate-200/50 dark:border-white/[0.08] shadow-sm backdrop-blur-md text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.1] transition-all"
            aria-label="Back"
          >
            <ArrowLeft size={20} className={language === 'ar' ? 'rotate-180' : ''} />
          </motion.button>
          
          <div className="flex items-center gap-1.5">
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={handleCopy}
              className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-white/60 dark:bg-white/[0.05] border border-slate-200/50 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.1] transition-colors"
              title={t('Copy text')}
            >
              <Copy size={16} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={handleShare}
              className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-white/60 dark:bg-white/[0.05] border border-slate-200/50 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.1] transition-colors"
              title={t('Share')}
            >
              <Share2 size={16} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={handlePrint}
              className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-white/60 dark:bg-white/[0.05] border border-slate-200/50 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.1] transition-colors"
              title={t('Print')}
            >
              <Printer size={16} />
            </motion.button>
          </div>
        </div>

        {/* ── Document Header ── */}
        <div className="mb-6">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            {t(doc.title)}
          </h1>
          {doc.subtitle && (
            <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold mt-1 uppercase tracking-wider">
              {t(doc.subtitle)}
            </p>
          )}
          {doc.lastUpdated && (
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-medium">
              {t('Last Updated')}: {t(doc.lastUpdated)}
            </p>
          )}
        </div>

        {/* ── Search Input (no-print) ── */}
        <div className="relative mb-5 no-print">
          <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500 z-10">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder={`${t('Search document')}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 rounded-2xl bg-white/[0.6] dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06] backdrop-blur-md text-[14px] font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary-500/40 focus:ring-1 focus:ring-primary-500/20 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* ── Document Body Content ── */}
        <div className="space-y-4">
          
          {/* Specific layout additions for "About" and "Version" pages */}
          {isAbout && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-primary-500/10 via-transparent to-secondary-500/10 border border-white/60 dark:border-white/[0.06] rounded-[24px] p-5 mb-5 flex flex-col items-center text-center shadow-[0_12px_24px_rgba(0,0,0,0.02)]"
            >
              <img
                src="/msfamily.png"
                alt="MS Family Logo"
                className="w-16 h-16 rounded-2xl object-cover shadow-lg shadow-primary-500/10 mb-3"
              />
              <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                MS Family
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-1">
                Your Family. Organized. Connected. Secure.
              </p>
            </motion.div>
          )}

          {isContact && !searchQuery.trim() && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-primary-500/5 via-transparent to-secondary-500/5 border border-white/60 dark:border-white/[0.06] rounded-[24px] p-4 mb-4 flex flex-col gap-3 shadow-[0_4px_16px_rgba(0,0,0,0.015)]"
            >
              <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {t('Quick Actions')}
              </h4>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => window.open('https://msarul.xo.je', '_system')}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/40 dark:bg-white/[0.03] hover:bg-white/60 dark:hover:bg-white/[0.06] border border-slate-200/40 dark:border-white/[0.04] text-[13px] text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  <span className="font-semibold">{t('Visit Official Website')}</span>
                  <ExternalLink size={14} className="text-primary-500" />
                </button>
                <button
                  onClick={() => window.open('mailto:velgo7686@gmail.com', '_system')}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/40 dark:bg-white/[0.03] hover:bg-white/60 dark:hover:bg-white/[0.06] border border-slate-200/40 dark:border-white/[0.04] text-[13px] text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  <span className="font-semibold">{t('Email Customer Care')}</span>
                  <Mail size={14} className="text-primary-500" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Render Sections */}
          <div className="space-y-4">
            {filteredSections.length > 0 ? (
              filteredSections.map((section, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="p-4 sm:p-5 bg-white/[0.72] dark:bg-white/[0.045] backdrop-blur-2xl border border-white/80 dark:border-white/[0.06] rounded-[18px] shadow-[0_2px_12px_rgba(0,0,0,0.015)] dark:shadow-none"
                >
                  <h3 className="text-[14px] sm:text-[15px] font-bold text-slate-800 dark:text-slate-200 mb-2 leading-tight">
                    {highlightText(t(section.title), searchQuery)}
                  </h3>
                  {Array.isArray(section.content) ? (
                    <div className="space-y-1.5">
                      {section.content.map((line, lIdx) => (
                        <p key={lIdx} className="text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-400 font-medium">
                          {highlightText(t(line), searchQuery)}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-400 font-medium">
                      {highlightText(t(section.content), searchQuery)}
                    </p>
                  )}
                </motion.div>
              ))
            ) : (
              <div className="text-center py-10 bg-white/[0.4] dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/[0.04] rounded-2xl p-6">
                <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mb-1">
                  {t('No matches found')}
                </p>
                <p className="text-[11px] text-slate-400">
                  {t('Try searching for a different keyword')}
                </p>
              </div>
            )}
          </div>

          {/* About Metadata Section */}
          {isAbout && doc.meta && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/[0.72] dark:bg-white/[0.045] backdrop-blur-2xl border border-white/80 dark:border-white/[0.06] rounded-[18px] p-4 space-y-3.5"
            >
              <div className="flex justify-between items-center text-[13px] border-b border-black/[0.04] dark:border-white/[0.04] pb-2">
                <span className="text-slate-400 font-semibold">{t('Developer')}</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">{doc.meta.developer as string}</span>
              </div>
              <div className="flex justify-between items-center text-[13px] border-b border-black/[0.04] dark:border-white/[0.04] pb-2">
                <span className="text-slate-400 font-semibold">{t('Website')}</span>
                <a
                  href={doc.meta.website as string}
                  onClick={(e) => {
                    e.preventDefault();
                    window.open(doc.meta?.website as string, '_system');
                  }}
                  className="font-bold text-primary-500 hover:text-primary-600 flex items-center gap-1 cursor-pointer"
                >
                  {t('Visit Site')} <ExternalLink size={12} />
                </a>
              </div>
              <div className="flex justify-between items-center text-[13px] border-b border-black/[0.04] dark:border-white/[0.04] pb-2">
                <span className="text-slate-400 font-semibold">{t('Support Email')}</span>
                <a
                  href={`mailto:${doc.meta.supportEmail}`}
                  onClick={(e) => {
                    e.preventDefault();
                    window.open(`mailto:${doc.meta?.supportEmail}`, '_system');
                  }}
                  className="font-bold text-primary-500 hover:text-primary-600 flex items-center gap-1 cursor-pointer"
                >
                  {doc.meta.supportEmail as string} <Mail size={12} />
                </a>
              </div>
              <div className="flex justify-between items-center text-[13px] border-b border-black/[0.04] dark:border-white/[0.04] pb-2">
                <span className="text-slate-400 font-semibold">{t('Version')}</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">{doc.meta.version as string} ({doc.meta.buildNumber as string})</span>
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 text-center pt-2">
                {t(doc.meta.copyright as string)}
              </div>
            </motion.div>
          )}



        </div>

      </div>

      {/* ── Toast Overlay (no-print) ── */}
      <AnimatePresence>
        {toastMessage && (
          <div className="fixed inset-x-0 bottom-8 z-[200] flex justify-center pointer-events-none no-print">
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 15 }}
              transition={SPRING_SOFT}
              className="bg-slate-900/85 dark:bg-white/90 backdrop-blur-xl border border-white/[0.06] dark:border-black/[0.06] rounded-2xl shadow-lg flex items-center gap-2 px-5 py-3"
            >
              <CheckCircle2 size={16} className="text-emerald-500 dark:text-emerald-600 shrink-0" />
              <span className="text-[12.5px] font-bold text-white dark:text-slate-900">
                {toastMessage}
              </span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
