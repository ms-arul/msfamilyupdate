import { registerPlugin, Capacitor } from '@capacitor/core';

/**
 * Registers or returns a cached singleton instance of a Capacitor plugin.
 * This prevents duplicate registration warnings, especially during Vite HMR (Hot Module Replacement).
 */
function safeRegisterPlugin<T>(pluginName: string): T {
  if (typeof window !== 'undefined') {
    if (!window.__capacitorPlugins) {
      window.__capacitorPlugins = {};
    }
    if (window.__capacitorPlugins[pluginName]) {
      return window.__capacitorPlugins[pluginName] as T;
    }
  }

  const isNative = Capacitor.isNativePlatform();
  const nativeOnlyPlugins = ['TransactionCache', 'SmsReader'];

  if (nativeOnlyPlugins.includes(pluginName) && !isNative) {
    // Return a dummy fallback object for non-native platforms
    const fallback = new Proxy({} as any, {
      get(_, prop) {
        return async () => {
          if (import.meta.env.DEV) {
            console.warn(`[CapacitorPlugins] Native-only plugin method called: '${pluginName}.${String(prop)}' on non-native platform`);
          }
          if (prop === 'getCachedTransactions') return { transactions: [] };
          if (prop === 'checkPermission') return { granted: false, receiveSms: false, readSms: false };
          if (prop === 'requestPermission') return { granted: false };
          if (prop === 'getAndClearPendingSms') return { messages: [] };
          return {};
        };
      }
    });
    if (typeof window !== 'undefined') {
      window.__capacitorPlugins![pluginName] = fallback;
    }
    return fallback as T;
  }

  try {
    const plugin = registerPlugin<any>(pluginName);
    if (typeof window !== 'undefined') {
      window.__capacitorPlugins![pluginName] = plugin;
    }
    if (import.meta.env.DEV) {
      console.log(`[CapacitorPlugins] Registered plugin: ${pluginName}`);
    }
    return plugin as T;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn(`[CapacitorPlugins] Error registering plugin '${pluginName}':`, err);
    }
    const fallback = new Proxy({} as any, {
      get(_, prop) {
        return async () => {
          if (import.meta.env.DEV) {
            console.warn(`[CapacitorPlugins] Fallback method called: '${pluginName}.${String(prop)}'`);
          }
          return {};
        };
      }
    });
    if (typeof window !== 'undefined') {
      window.__capacitorPlugins![pluginName] = fallback;
    }
    return fallback as T;
  }
}

import {
  TransactionCachePlugin,
  BackgroundGeolocationPlugin,
  LocationServicePlugin,
  SmsReaderPlugin,
  BiometricAuthPlugin,
  MicPermissionPlugin
} from '../types/native';

// Export singleton plugin instances
export const TransactionCache = safeRegisterPlugin<TransactionCachePlugin>('TransactionCache');
export const BackgroundGeolocation = safeRegisterPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');
export const LocationService = safeRegisterPlugin<LocationServicePlugin>('LocationService');
export const SmsReader = safeRegisterPlugin<SmsReaderPlugin>('SmsReader');
export const BiometricAuth = safeRegisterPlugin<BiometricAuthPlugin>('BiometricAuth');
export const MicPermission = safeRegisterPlugin<MicPermissionPlugin>('MicPermission');

