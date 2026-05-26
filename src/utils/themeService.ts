import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

export type ThemeMode = 'light' | 'dark' | 'auto';

export const THEME_MODES: Record<string, ThemeMode> = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto',
};

const THEME_STORAGE_KEY = 'msfamily_theme_preference';

const STATUS_BAR_COLORS = {
  dark: {
    background: '#0A0A14',
    style: 'Dark',
    navBar: '#0F0F1E',
  },
  light: {
    background: '#FFFFFF',
    style: 'Light',
    navBar: '#FFFFFF',
  },
};

const syncStatusBar = async (isDark: boolean): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const colors = isDark ? STATUS_BAR_COLORS.dark : STATUS_BAR_COLORS.light;

    try {
      await StatusBar.setBackgroundColor({ color: colors.background });
    } catch (bgError) {
      console.warn('StatusBar.setBackgroundColor failed:', bgError);
    }

    try {
      await StatusBar.setStyle({
        style: isDark ? Style.Dark : Style.Light,
      });
    } catch (styleError) {
      console.warn('StatusBar.setStyle failed:', styleError);
    }

    try {
      await StatusBar.show();
    } catch (showError) { }

    updateNavBarMeta(colors.navBar);
  } catch (e: any) {
    console.debug('StatusBar sync skipped:', e.message);
  }
};

const updateNavBarMeta = (color: string): void => {
  let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = color;
};

export const initTheme = (): ThemeMode => {
  const savedTheme = (localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null) || THEME_MODES.LIGHT;
  applyTheme(savedTheme);
  return savedTheme;
};

export const applyTheme = (mode: ThemeMode): void => {
  const root = document.documentElement;
  const isDarkOS = window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Enable smooth transition for theme change
  root.classList.add('theme-transitioning');

  root.classList.remove('dark', 'light');

  const isDark = mode === THEME_MODES.DARK || (mode === THEME_MODES.AUTO && isDarkOS);

  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.add('light');
  }

  localStorage.setItem(THEME_STORAGE_KEY, mode);

  syncStatusBar(isDark);
  updateNavBarMeta(isDark ? STATUS_BAR_COLORS.dark.background : STATUS_BAR_COLORS.light.background);

  // Remove transition class after animation completes
  setTimeout(() => {
    root.classList.remove('theme-transitioning');
  }, 500);
};

export const getStoredTheme = (): ThemeMode => {
  return (localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null) || THEME_MODES.LIGHT;
};

export const listenForSystemThemeChanges = (currentMode: ThemeMode): (() => void) => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const listener = (): void => {
    if (localStorage.getItem(THEME_STORAGE_KEY) === THEME_MODES.AUTO) {
      applyTheme(THEME_MODES.AUTO);
    }
  };

  mediaQuery.addEventListener('change', listener);
  return () => mediaQuery.removeEventListener('change', listener);
};
