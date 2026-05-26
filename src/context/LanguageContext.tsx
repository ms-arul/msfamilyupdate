import React, { useState, useEffect, useCallback, useRef } from 'react';
import { translateToTamil, prefetchTranslations, getCachedTranslation, TAMIL_DICTIONARY } from '../utils/languageService';
import { createSafeContext } from './contextHelper';

export const LANGUAGES = {
  EN: 'en',
  TA: 'ta'
} as const;

export type LanguageType = typeof LANGUAGES[keyof typeof LANGUAGES];

export interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (text: string) => string;
  isTranslating: boolean;
  prefetch: (texts: string[]) => Promise<void>;
}

const [useLanguage, LanguageContextProvider] = createSafeContext<LanguageContextType>('Language');

export { useLanguage };

const LANG_STORAGE_KEY = 'msfamily_language';

interface LanguageProviderProps {
  children: React.ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<string>(() => {
    return localStorage.getItem(LANG_STORAGE_KEY) || LANGUAGES.EN;
  });

  const [isTranslating] = useState(false);

  // Use a ref for the cache to avoid re-render cascades.
  // Only the language change should trigger re-renders, not individual translations.
  const cacheRef = useRef<Record<string, string>>({});
  const [, forceUpdate] = useState(0);
  const pendingRef = useRef<Set<string>>(new Set()); // Track in-flight translations

  useEffect(() => {
    localStorage.setItem(LANG_STORAGE_KEY, language);
    // Reset pending when language changes
    pendingRef.current.clear();

    // When switching to Tamil, prefetch all dictionary keys to ensure instant rendering
    if (language === LANGUAGES.TA) {
      // Pre-populate cache with dictionary entries immediately
      Object.entries(TAMIL_DICTIONARY).forEach(([key, value]) => {
        cacheRef.current[key] = value;
      });
      forceUpdate(c => c + 1);
    } else {
      // Clear Tamil cache when switching to English
      cacheRef.current = {};
    }
  }, [language]);

  /**
   * Set language with optional prefetching
   */
  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang);
  }, []);

  /**
   * The core translation function.
   * Uses hardcoded dictionary + ref-based cache so translations are instant.
   */
  const t = useCallback((text: string) => {
    if (!text || typeof text !== 'string') return text;

    // English mode: instant return, zero overhead
    if (language === LANGUAGES.EN) {
      return text;
    }

    // Check hardcoded dictionary first (instant, zero latency)
    if (TAMIL_DICTIONARY[text]) {
      return TAMIL_DICTIONARY[text];
    }

    // Check in-memory ref cache (instant, no state update)
    if (cacheRef.current[text]) {
      return cacheRef.current[text];
    }

    // Check service-level localStorage cache (synchronous)
    const syncCached = getCachedTranslation(text);
    if (syncCached) {
      cacheRef.current[text] = syncCached;
      return syncCached;
    }

    // If we're already fetching this text, don't fire another request
    if (pendingRef.current.has(text)) {
      return text;
    }

    // Fire async translation ONCE, then batch-update
    pendingRef.current.add(text);
    translateToTamil(text).then(translated => {
      pendingRef.current.delete(text);
      if (translated && translated !== text) {
        cacheRef.current[text] = translated;
        // Single batched re-render after translation arrives
        forceUpdate(c => c + 1);
      }
    }).catch(() => {
      pendingRef.current.delete(text);
    });

    return text; // Return English immediately while translating
  }, [language]); // Only depends on language, NOT on cache state

  const value = {
    language,
    setLanguage,
    t,
    isTranslating,
    prefetch: prefetchTranslations
  };

  return (
    <LanguageContextProvider value={value}>
      {children}
    </LanguageContextProvider>
  );
};
