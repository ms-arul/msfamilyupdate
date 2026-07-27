import React, { useState, useEffect, useCallback } from 'react';
import { DICTIONARIES, LANGUAGE_LIST } from '../utils/translationDictionaries';
import { createSafeContext } from './contextHelper';

export interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (text: string, replacements?: Record<string, string | number>) => string;
  isTranslating: boolean;
  isChangingLanguage: boolean;
  prefetch: (texts: string[]) => Promise<void>;
}

const [useLanguage, LanguageContextProvider] = createSafeContext<LanguageContextType>('Language');

export { useLanguage };

const LANG_STORAGE_KEY = 'msfamily_language';
const LANG_TIMESTAMP_KEY = 'msfamily_language_timestamp';

interface LanguageProviderProps {
  children: React.ReactNode;
}

// Helper to auto-detect device language
const getDeviceLanguage = (): string => {
  try {
    const locale = navigator.language || (navigator.languages && navigator.languages[0]) || 'en';
    const shortCode = locale.split('-')[0];
    
    // Check for exact matches first (e.g., zh-CN, en-IN)
    const exactMatch = LANGUAGE_LIST.find(lang => lang.code.toLowerCase() === locale.toLowerCase());
    if (exactMatch) return exactMatch.code;
    
    // Check for short code matches (e.g., es, fr, hi)
    const shortMatch = LANGUAGE_LIST.find(lang => lang.code.toLowerCase() === shortCode.toLowerCase());
    if (shortMatch) return shortMatch.code;
  } catch (e) {
    console.error('Failed to get device language:', e);
  }
  return 'en'; // default fallback
};

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<string>(() => {
    return localStorage.getItem(LANG_STORAGE_KEY) || getDeviceLanguage();
  });

  // Set language instantly without loading transition screen
  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang);
    localStorage.setItem(LANG_STORAGE_KEY, lang);
    localStorage.setItem(LANG_TIMESTAMP_KEY, new Date().toISOString());
  }, []);

  // Update layout direction dynamically (RTL for Arabic, LTR otherwise)
  useEffect(() => {
    if (language === 'ar') {
      document.documentElement.dir = 'rtl';
    } else {
      document.documentElement.dir = 'ltr';
    }
  }, [language]);

  /**
   * Enterprise translation lookup function.
   * Looks up translated values in our O(1) dictionary and falls back to original text.
   */
  const t = useCallback((text: string, replacements?: Record<string, string | number>) => {
    if (!text || typeof text !== 'string') return text;

    let translated = text;
    if (language !== 'en') {
      const dict = DICTIONARIES[language];
      if (dict && dict[text]) {
        translated = dict[text];
      }
    }

    if (replacements) {
      Object.entries(replacements).forEach(([key, val]) => {
        translated = translated.replace(new RegExp(`{${key}}`, 'g'), String(val));
      });
    }

    return translated;
  }, [language]);

  // Prefetch no-op helper (kept for business logic compatibility)
  const prefetch = useCallback(async (texts: string[]): Promise<void> => {
    return;
  }, []);

  const value = {
    language,
    setLanguage,
    t,
    isTranslating: false,
    isChangingLanguage: false,
    prefetch
  };

  return (
    <LanguageContextProvider value={value}>
      {children}
    </LanguageContextProvider>
  );
};
