import { Capacitor } from '@capacitor/core';
import { BiometricAuth } from '../plugins';

const STORAGE_KEYS = {
  APP_LOCK_ENABLED: 'msfamily_app_lock_enabled',
  BIOMETRIC_ENABLED: 'msfamily_biometric_enabled',
};

let _lockSuppressedUntil = 0;
const FILE_PICKER_GRACE_MS = 120_000;

export function suppressLockForFilePicker(): void {
  _lockSuppressedUntil = Date.now() + FILE_PICKER_GRACE_MS;
}

export function shouldSuppressLock(): boolean {
  if (Date.now() < _lockSuppressedUntil) {
    return true;
  }
  _lockSuppressedUntil = 0;
  return false;
}

export function clearLockSuppression(): void {
  _lockSuppressedUntil = 0;
}

export function isAppLockEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEYS.APP_LOCK_ENABLED) === 'true';
}

export function isBiometricEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEYS.BIOMETRIC_ENABLED) === 'true';
}

function setAppLockEnabled(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEYS.APP_LOCK_ENABLED, String(enabled));
}

function setBiometricEnabled(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEYS.BIOMETRIC_ENABLED, String(enabled));
}

export interface SecurityCapabilities {
  isNative: boolean;
  hasDeviceLock: boolean;
  hasBiometric: boolean;
  biometricType: string;
  biometricNotEnrolled: boolean;
  biometricHardwarePresent: boolean;
  canAuthenticate: boolean;
  error?: string;
}

export async function checkSecurityCapabilities(): Promise<SecurityCapabilities> {
  if (!Capacitor.isNativePlatform() || !BiometricAuth) {
    return {
      isNative: false,
      hasDeviceLock: false,
      hasBiometric: false,
      biometricType: 'none',
      biometricNotEnrolled: false,
      biometricHardwarePresent: false,
      canAuthenticate: false,
    };
  }

  try {
    const result = await BiometricAuth.checkAvailability();
    return {
      isNative: true,
      hasDeviceLock: result.hasDeviceLock || false,
      hasBiometric: result.hasBiometric || false,
      biometricType: result.biometricType || 'none',
      biometricNotEnrolled: result.biometricNotEnrolled || false,
      biometricHardwarePresent: result.biometricHardwarePresent || false,
      canAuthenticate: result.canAuthenticate || false,
    };
  } catch (error: any) {
    console.error('Failed to check security capabilities:', error);
    return {
      isNative: true,
      hasDeviceLock: false,
      hasBiometric: false,
      biometricType: 'none',
      biometricNotEnrolled: false,
      biometricHardwarePresent: false,
      canAuthenticate: false,
      error: error.message,
    };
  }
}

export interface LockActionResponse {
  success: boolean;
  error?: string;
}

export async function toggleAppLock(enable: boolean): Promise<LockActionResponse> {
  if (!Capacitor.isNativePlatform() || !BiometricAuth) {
    return { success: false, error: 'Not supported on web' };
  }

  if (enable) {
    try {
      const result = await BiometricAuth.authenticateWithDeviceLock({
        title: 'Enable App Lock',
        subtitle: 'Verify your identity to enable app lock',
      });

      if (result.success) {
        setAppLockEnabled(true);
        return { success: true };
      }
      return { success: false, error: 'Authentication failed' };
    } catch (error: any) {
      if (error.code === 'USER_CANCELLED') {
        return { success: false, error: 'cancelled' };
      }
      if (error.code === 'NO_DEVICE_LOCK') {
        return { success: false, error: 'no_device_lock' };
      }
      return { success: false, error: error.message };
    }
  } else {
    try {
      const result = await BiometricAuth.authenticateWithDeviceLock({
        title: 'Disable App Lock',
        subtitle: 'Verify your identity to disable app lock',
      });

      if (result.success) {
        setAppLockEnabled(false);
        setBiometricEnabled(false);
        return { success: true };
      }
      return { success: false, error: 'Authentication failed' };
    } catch (error: any) {
      if (error.code === 'USER_CANCELLED') {
        return { success: false, error: 'cancelled' };
      }
      return { success: false, error: error.message };
    }
  }
}

export async function toggleBiometricUnlock(enable: boolean): Promise<LockActionResponse> {
  if (!Capacitor.isNativePlatform() || !BiometricAuth) {
    return { success: false, error: 'Not supported on web' };
  }

  if (enable) {
    if (!isAppLockEnabled()) {
      return { success: false, error: 'app_lock_required' };
    }

    try {
      const result = await BiometricAuth.authenticateWithBiometric({
        title: 'Enable Biometric Unlock',
        subtitle: 'Verify with fingerprint or face',
      });

      if (result.success) {
        setBiometricEnabled(true);
        return { success: true };
      }
      return { success: false, error: 'Authentication failed' };
    } catch (error: any) {
      if (error.code === 'USER_CANCELLED') {
        return { success: false, error: 'cancelled' };
      }
      if (error.code === 'NO_BIOMETRIC_ENROLLED') {
        return { success: false, error: 'no_biometric_enrolled' };
      }
      return { success: false, error: error.message };
    }
  } else {
    try {
      const result = await BiometricAuth.authenticateWithDeviceLock({
        title: 'Disable Biometric Unlock',
        subtitle: 'Verify your identity',
      });

      if (result.success) {
        setBiometricEnabled(false);
        return { success: true };
      }
      return { success: false, error: 'Authentication failed' };
    } catch (error: any) {
      if (error.code === 'USER_CANCELLED') {
        return { success: false, error: 'cancelled' };
      }
      return { success: false, error: error.message };
    }
  }
}

export interface VerifyLockResponse {
  success: boolean;
  method?: string;
  error?: string;
}

export async function verifyAppLock(): Promise<VerifyLockResponse> {
  if (!isAppLockEnabled()) {
    return { success: true, method: 'none' };
  }

  if (!Capacitor.isNativePlatform() || !BiometricAuth) {
    return { success: true, method: 'none' };
  }

  if (shouldSuppressLock()) {
    return { success: true, method: 'suppressed' };
  }

  try {
    let result;

    if (isBiometricEnabled()) {
      result = await BiometricAuth.authenticateWithBiometric({
        title: 'MS Family Locked',
        subtitle: 'Verify to unlock the app',
      });
    } else {
      result = await BiometricAuth.authenticateWithDeviceLock({
        title: 'MS Family Locked',
        subtitle: 'Enter your PIN, pattern, or password',
      });
    }

    if (result.success) {
      return { success: true, method: (result as any).method };
    }
    return { success: false, error: 'Authentication failed' };
  } catch (error: any) {
    if (error.code === 'USER_CANCELLED') {
      return { success: false, error: 'cancelled' };
    }
    return { success: false, error: error.message };
  }
}

export async function openSecuritySettings(): Promise<void> {
  if (!Capacitor.isNativePlatform() || !BiometricAuth) return;

  try {
    if ((BiometricAuth as any).openSecuritySettings) {
      await (BiometricAuth as any).openSecuritySettings();
    }
  } catch (error) {
    console.error('Failed to open security settings:', error);
  }
}
