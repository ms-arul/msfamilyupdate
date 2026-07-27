import { supabase } from '../lib/supabase';
import { applyTheme, ThemeMode } from './themeService';
import { TransactionCache } from '../plugins';
import { Capacitor } from '@capacitor/core';

export interface UserPreferences {
  theme: ThemeMode;
  language: string;
  notif_enabled: boolean;
  notif_sound: boolean;
  reminder_freq: string;
  budget_limit: number;
  savings_target: number;
}

const LOCAL_KEYS = {
  theme: 'msfamily_theme_preference',
  language: 'msfamily_language',
  notifEnabled: 'msfamily_notif_enabled',
  notifSound: 'msfamily_notif_sound',
  reminderFreq: 'msfamily_reminder_freq',
  budgetLimit: 'msfamily_budget_limit',
  savingsTarget: 'msfamily_savings_target',
};

const DEFAULTS: UserPreferences = {
  theme: 'light',
  language: 'en',
  notif_enabled: true,
  notif_sound: true,
  reminder_freq: 'daily',
  budget_limit: 3000,
  savings_target: 10000,
};

export const loadPreferences = async (userId: string): Promise<UserPreferences> => {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      const defaults = { user_id: userId, ...DEFAULTS };
      await supabase.from('user_preferences').insert(defaults);
      applyToLocal(DEFAULTS);
      return DEFAULTS;
    }

    if (error) {
      console.warn('Failed to load preferences from backend, using localStorage:', error.message);
      return loadFromLocal();
    }

    const prefs: UserPreferences = {
      theme: (data.theme || DEFAULTS.theme) as ThemeMode,
      language: data.language || DEFAULTS.language,
      notif_enabled: data.notif_enabled ?? DEFAULTS.notif_enabled,
      notif_sound: data.notif_sound ?? DEFAULTS.notif_sound,
      reminder_freq: data.reminder_freq || DEFAULTS.reminder_freq,
      budget_limit: data.budget_limit !== undefined && data.budget_limit !== null ? data.budget_limit : DEFAULTS.budget_limit,
      savings_target: data.savings_target !== undefined && data.savings_target !== null ? data.savings_target : DEFAULTS.savings_target,
    };

    applyToLocal(prefs);
    syncPreferencesToNative(prefs.budget_limit, prefs.savings_target);
    return prefs;
  } catch (err) {
    console.error('Unexpected error loading preferences:', err);
    return loadFromLocal();
  }
};

export const savePreferences = async (userId: string, prefs: UserPreferences): Promise<boolean> => {
  applyToLocal(prefs);
  syncPreferencesToNative(prefs.budget_limit, prefs.savings_target);

  try {
    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        theme: prefs.theme,
        language: prefs.language,
        notif_enabled: prefs.notif_enabled,
        notif_sound: prefs.notif_sound,
        reminder_freq: prefs.reminder_freq,
        budget_limit: prefs.budget_limit,
        savings_target: prefs.savings_target,
      }, { onConflict: 'user_id' });

    if (error) {
      console.warn('Failed to save preferences to backend:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Unexpected error saving preferences:', err);
    return false;
  }
};

export const saveSinglePreference = async (userId: string, key: keyof UserPreferences, value: any): Promise<boolean> => {
  const localKey = LOCAL_KEYS[
    key === 'notif_enabled' ? 'notifEnabled' : 
    key === 'notif_sound' ? 'notifSound' : 
    key === 'reminder_freq' ? 'reminderFreq' : 
    key === 'budget_limit' ? 'budgetLimit' : 
    key === 'savings_target' ? 'savingsTarget' : key
  ];

  if (localKey) {
    localStorage.setItem(localKey, String(value));
  }

  if (key === 'budget_limit') {
    const target = Number(localStorage.getItem(LOCAL_KEYS.savingsTarget)) || 10000;
    syncPreferencesToNative(Number(value), target);
  } else if (key === 'savings_target') {
    const budget = Number(localStorage.getItem(LOCAL_KEYS.budgetLimit)) || 3000;
    syncPreferencesToNative(budget, Number(value));
  }

  try {
    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        [key]: value,
      }, { onConflict: 'user_id' });

    if (error) {
      console.warn(`Failed to save ${key} to backend:`, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`Unexpected error saving ${key}:`, err);
    return false;
  }
};

const applyToLocal = (prefs: UserPreferences): void => {
  if (prefs.theme) localStorage.setItem(LOCAL_KEYS.theme, prefs.theme);
  if (prefs.language) localStorage.setItem(LOCAL_KEYS.language, prefs.language);
  if (prefs.notif_enabled !== undefined) localStorage.setItem(LOCAL_KEYS.notifEnabled, String(prefs.notif_enabled));
  if (prefs.notif_sound !== undefined) localStorage.setItem(LOCAL_KEYS.notifSound, String(prefs.notif_sound));
  if (prefs.reminder_freq) localStorage.setItem(LOCAL_KEYS.reminderFreq, prefs.reminder_freq);
  if (prefs.budget_limit !== undefined) localStorage.setItem(LOCAL_KEYS.budgetLimit, String(prefs.budget_limit));
  if (prefs.savings_target !== undefined) localStorage.setItem(LOCAL_KEYS.savingsTarget, String(prefs.savings_target));
};

const loadFromLocal = (): UserPreferences => ({
  theme: (localStorage.getItem(LOCAL_KEYS.theme) as ThemeMode | null) || DEFAULTS.theme,
  language: localStorage.getItem(LOCAL_KEYS.language) || DEFAULTS.language,
  notif_enabled: localStorage.getItem(LOCAL_KEYS.notifEnabled) !== 'false',
  notif_sound: localStorage.getItem(LOCAL_KEYS.notifSound) !== 'false',
  reminder_freq: localStorage.getItem(LOCAL_KEYS.reminderFreq) || DEFAULTS.reminder_freq,
  budget_limit: localStorage.getItem(LOCAL_KEYS.budgetLimit) ? Number(localStorage.getItem(LOCAL_KEYS.budgetLimit)) : DEFAULTS.budget_limit,
  savings_target: localStorage.getItem(LOCAL_KEYS.savingsTarget) ? Number(localStorage.getItem(LOCAL_KEYS.savingsTarget)) : DEFAULTS.savings_target,
});

const syncPreferencesToNative = async (budgetLimit: number, savingsTarget: number) => {
  if (Capacitor.isNativePlatform() && TransactionCache && typeof (TransactionCache as any).cachePreferences === 'function') {
    try {
      await (TransactionCache as any).cachePreferences({
        budget_limit: budgetLimit,
        savings_target: savingsTarget
      });
    } catch (err) {
      console.warn('[Cache] Failed to sync preferences to native:', err);
    }
  }
};
