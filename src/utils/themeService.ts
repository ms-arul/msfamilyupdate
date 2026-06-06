import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

export type ThemeMode = 'light' | 'dark' | 'auto' | 'schedule';

export const THEME_MODES: Record<string, ThemeMode> = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto',
  SCHEDULE: 'schedule',
};

const THEME_STORAGE_KEY = 'msfamily_theme_preference';

const STATUS_BAR_COLORS = {
  dark: {
    background: '#000000',
    style: 'Dark',
    navBar: '#000000',
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

let themeInterval: any = null;

export const initTheme = (): ThemeMode => {
  const savedTheme = (localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null) || THEME_MODES.LIGHT;
  applyTheme(savedTheme, true);

  if (typeof window !== 'undefined') {
    // Listen to OS theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const osThemeListener = (): void => {
      const currentMode = getStoredTheme();
      if (currentMode === THEME_MODES.AUTO) {
        applyTheme(THEME_MODES.AUTO);
      }
    };
    mediaQuery.removeEventListener('change', osThemeListener);
    mediaQuery.addEventListener('change', osThemeListener);

    // Set up periodic check for schedule mode (every 30s)
    if (!themeInterval) {
      themeInterval = setInterval(() => {
        const currentMode = getStoredTheme();
        if (currentMode === THEME_MODES.SCHEDULE) {
          applyTheme(THEME_MODES.SCHEDULE);
        }
      }, 30000);
    }
  }

  return savedTheme;
};

export const applyTheme = (mode: ThemeMode, force = false): void => {
  const root = document.documentElement;
  const isDarkOS = window.matchMedia('(prefers-color-scheme: dark)').matches;

  const hour = new Date().getHours();
  // Morning (6:00 AM to 6:00 PM) is light, Evening/Night/Early Morning (6:00 PM to 6:00 AM) is dark
  const isDarkSchedule = hour < 6 || hour >= 18;

  const isDark = mode === THEME_MODES.DARK ||
                 (mode === THEME_MODES.AUTO && isDarkOS) ||
                 (mode === THEME_MODES.SCHEDULE && isDarkSchedule);

  const currentlyDark = root.classList.contains('dark');
  const currentlyLight = root.classList.contains('light');
  const hasThemeClass = currentlyDark || currentlyLight;

  localStorage.setItem(THEME_STORAGE_KEY, mode);

  if (isDark !== currentlyDark || !hasThemeClass || force) {
    root.classList.add('theme-transitioning');
    root.classList.remove('dark', 'light');
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.add('light');
    }
    syncStatusBar(isDark);
    updateNavBarMeta(isDark ? STATUS_BAR_COLORS.dark.background : STATUS_BAR_COLORS.light.background);

    setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 500);
  }
};

export const getStoredTheme = (): ThemeMode => {
  return (localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null) || THEME_MODES.LIGHT;
};

export const listenForSystemThemeChanges = (currentMode: ThemeMode): (() => void) => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const listener = (): void => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === THEME_MODES.AUTO) {
      applyTheme(THEME_MODES.AUTO);
    }
  };

  mediaQuery.addEventListener('change', listener);
  return () => mediaQuery.removeEventListener('change', listener);
};
