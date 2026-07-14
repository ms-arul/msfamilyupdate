import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, Check, X, ChevronLeft } from 'lucide-react';
import { LANGUAGE_LIST } from '../utils/translationDictionaries';

interface LanguageSelectionPageProps {
  onBack: () => void;
  language: string;
  onLanguageSelect: (code: string) => void;
  t: (key: string) => string;
}

const SPRING_SOFT = { type: 'spring', stiffness: 380, damping: 30 } as const;
const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 35 } as const;

export const LanguageSelectionPage: React.FC<LanguageSelectionPageProps> = ({
  onBack,
  language,
  onLanguageSelect,
  t,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Get current language details
  const currentLang = LANGUAGE_LIST.find(l => l.code === language) || LANGUAGE_LIST[1]; // default English

  // Filter languages based on search query (by English name or native name)
  const filteredLanguages = LANGUAGE_LIST.filter(
    lang =>
      lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={SPRING_SOFT}
      className="relative z-10 space-y-6 max-w-md mx-auto pb-12 w-full"
    >
      {/* Header with Back button */}
      <div className="flex items-center gap-4">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-white/50 dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-sm"
        >
          {/* Back Icon (Left arrow, or right arrow if Arabic RTL) */}
          <ChevronLeft size={20} className="rtl:rotate-180 text-slate-600 dark:text-slate-300" strokeWidth={2.5} />
        </motion.button>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
            {t('Language & Region')}
          </h2>
          <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
            {t('Select your preferred display language')}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        <input
          type="text"
          placeholder={t('Search languages...')}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-white/70 dark:bg-white/[0.03] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-[14px] font-medium pl-10 pr-4 py-3 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 transition-all shadow-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Current Language Indicator */}
      {!searchQuery && (
        <div className="space-y-2.5">
          <div className="px-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400/80 select-none">
              {t('Current Language')}
            </span>
          </div>
          <div className="bg-primary-500/[0.07] dark:bg-primary-500/[0.12] border border-primary-500/20 rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500">
                <Globe size={18} />
              </div>
              <div className="text-left rtl:text-right">
                <p className="text-[14.5px] font-bold text-slate-900 dark:text-white leading-none">
                  {currentLang.nativeName}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-none">
                  {currentLang.name}
                </p>
              </div>
            </div>
            <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center shadow-md shadow-primary-500/20">
              <Check size={13} color="white" strokeWidth={3} />
            </div>
          </div>
        </div>
      )}

      {/* Language List */}
      <div className="space-y-2.5">
        <div className="px-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400/80 select-none">
            {searchQuery ? t('Search Results') : t('All Languages')}
          </span>
        </div>
        {filteredLanguages.length > 0 ? (
          <div className="bg-white/[0.72] dark:bg-white/[0.045] backdrop-blur-2xl border border-white/80 dark:border-white/[0.08] rounded-2xl overflow-hidden shadow-md divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            {filteredLanguages.map(lang => {
              const isSelected = language === lang.code;
              return (
                <motion.button
                  key={lang.code}
                  whileTap={{ scale: 0.995 }}
                  onClick={() => onLanguageSelect(lang.code)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors duration-200 ${
                    isSelected
                      ? 'bg-primary-500/[0.04] dark:bg-primary-500/[0.08]'
                      : 'hover:bg-black/[0.015] dark:hover:bg-white/[0.015]'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    {/* Checkbox / Radio button styling */}
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-slate-300 dark:border-slate-700 bg-transparent'
                    }`}>
                      {isSelected && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <div className="text-left rtl:text-right">
                      <span className={`text-[14.5px] font-semibold block leading-snug ${
                        isSelected ? 'text-primary-600 dark:text-primary-400 font-bold' : 'text-slate-800 dark:text-slate-200'
                      }`}>
                        {lang.nativeName}
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        {lang.name}
                      </span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400 bg-white/[0.1] dark:bg-white/[0.02] border border-dashed border-black/[0.08] dark:border-white/[0.08] rounded-2xl">
            <p className="text-[14px] font-medium">{t('No languages match your search')}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
