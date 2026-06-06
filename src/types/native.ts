import { Transaction } from './finance';
import { SmsMessage } from './sms';

export interface TransactionCachePlugin {
  getCachedTransactions(): Promise<{ transactions: Transaction[] }>;
  cacheTransactions(options: { transactions: Transaction[] }): Promise<void>;
  clearCache(): Promise<void>;
}

export interface SmsPermissionStatus {
  granted: boolean;
  receiveSms: boolean;
  readSms: boolean;
}

export interface SmsReaderPlugin {
  checkPermission(): Promise<SmsPermissionStatus>;
  requestPermission(): Promise<{ granted: boolean; openedSettings?: boolean }>;
  setConfig(options: { url: string; key: string; token: string; userId: string; refreshToken?: string }): Promise<void>;
  getAndClearPendingSms(): Promise<{ messages: SmsMessage[] }>;
  startListening(): Promise<void>;
  stopListening(): Promise<void>;
  isListening(): Promise<{ listening: boolean }>;
  addListener(eventName: string, callback: (data: any) => void): Promise<{ remove: () => Promise<void> }>;
}

export interface BackgroundGeolocationPlugin {
  // Add background geolocation specific signatures if needed
}

export interface LocationServicePlugin {
  startTracking(options: { userId: string }): Promise<void>;
  stopTracking(): Promise<void>;
}

export interface BiometricAvailability {
  available: boolean;
  hasDeviceLock: boolean;
  hasBiometric: boolean;
  biometricType: string;
  biometricNotEnrolled: boolean;
  biometricHardwarePresent: boolean;
  canAuthenticate: boolean;
}

export interface BiometricAuthPlugin {
  checkAvailability(): Promise<BiometricAvailability>;
  authenticateWithDeviceLock(options: { title: string; subtitle: string }): Promise<{ success: boolean }>;
  authenticateWithBiometric(options: { title: string; subtitle: string }): Promise<{ success: boolean }>;
}

export interface MicPermissionPlugin {
  checkPermission(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<{ granted: boolean }>;
}

declare global {
  interface Window {
    __capacitorPlugins?: {
      TransactionCache?: TransactionCachePlugin;
      BackgroundGeolocation?: BackgroundGeolocationPlugin;
      LocationService?: LocationServicePlugin;
      SmsReader?: SmsReaderPlugin;
      BiometricAuth?: BiometricAuthPlugin;
      MicPermission?: MicPermissionPlugin;
      [key: string]: any;
    };
    sharedFileBuffer?: File;
  }
}
