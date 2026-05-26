import { Capacitor } from '@capacitor/core';
import { SmsReader } from '../plugins';
import { smartParse } from './smsParserService';
import { triggerInstantNotification } from './notificationService';
import { App } from '@capacitor/app';
import { SmsPermissionStatus } from '../types/native';
import { SmsParsedRecord } from './smsParserService';

const processedMessageIds = new Set<string>();
const MAX_PROCESSED_IDS = 100;

function isDuplicate(sender: string, timestamp?: number): boolean {
  if (!timestamp) return false;
  const id = `${sender}-${timestamp}`;
  if (processedMessageIds.has(id)) {
    return true;
  }
  processedMessageIds.add(id);
  
  if (processedMessageIds.size > MAX_PROCESSED_IDS) {
    const iterator = processedMessageIds.values();
    const firstVal = iterator.next().value;
    if (firstVal !== undefined) {
      processedMessageIds.delete(firstVal);
    }
  }
  return false;
}

const SMS_ENABLED_KEY = 'sms_reader_enabled';

export const isSmsReaderEnabled = (): boolean => {
  return localStorage.getItem(SMS_ENABLED_KEY) !== 'false';
};

export const setSmsReaderEnabled = (enabled: boolean): void => {
  localStorage.setItem(SMS_ENABLED_KEY, String(enabled));
};

export async function checkSmsPermission(): Promise<SmsPermissionStatus> {
  if (!Capacitor.isNativePlatform() || !SmsReader) {
    return { granted: false, receiveSms: false, readSms: false };
  }
  try {
    return await SmsReader.checkPermission();
  } catch (err) {
    console.warn('[SMS] Permission check failed:', err);
    return { granted: false, receiveSms: false, readSms: false };
  }
}

export async function requestSmsPermission(): Promise<{ granted: boolean; openedSettings?: boolean }> {
  if (!Capacitor.isNativePlatform() || !SmsReader) {
    return { granted: false };
  }
  try {
    const result = await SmsReader.requestPermission();
    if (result.openedSettings) {
      console.log('[SMS] Opened notification access settings for user');
    }
    return result;
  } catch (err) {
    console.warn('[SMS] Permission request failed:', err);
    return { granted: false };
  }
}

export async function updateSmsConfig(url: string, key: string, token: string, userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform() || !SmsReader) return;
  try {
    await SmsReader.setConfig({ url, key, token, userId });
    console.log('[SMS] Native config updated for background sync');
  } catch (err) {
    console.warn('[SMS] Failed to set native config:', err);
  }
}

let listenerActive = false;
let smsEventHandle: any = null;
let appStateListener: any = null;

export async function processPendingSms(onTransactionDetected?: (parsed: SmsParsedRecord) => void): Promise<void> {
  if (!Capacitor.isNativePlatform() || !SmsReader) return;

  try {
    const result = await SmsReader.getAndClearPendingSms();
    const messages = result?.messages || [];

    if (messages.length > 0) {
      console.log(`[SMS] Processing ${messages.length} pending SMS from background`);
      
      for (const msg of messages) {
        if (isDuplicate(msg.sender, msg.timestamp)) {
          console.log('[SMS] Skipping duplicate pending SMS');
          continue;
        }

        try {
          const parsed = await smartParse(msg.sender, msg.body, msg.timestamp);
          if (parsed && parsed.amount > 0) {
            console.log('[SMS] Parsed background transaction:', parsed.amount, parsed.transactionType);
            
            const typeLabel = parsed.transactionType === 'credit' ? 'Received' : 'Spent';
            const icon = parsed.transactionType === 'credit' ? '💰' : '💸';
            await triggerInstantNotification(
              `${icon} ${typeLabel} ₹${parsed.amount.toLocaleString()}`,
              `${parsed.bankName}${parsed.merchantName ? ` • ${parsed.merchantName}` : ''} — Auto-recorded`,
              '/transactions'
            );

            if (onTransactionDetected) {
              onTransactionDetected(parsed);
            }
          }
        } catch (err) {
          console.warn('[SMS] Error parsing background SMS:', err);
        }
      }
    }
  } catch (err) {
    console.warn('[SMS] Failed to get pending SMS:', err);
  }
}

export async function startSmsListener(onTransactionDetected?: (parsed: SmsParsedRecord) => void): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || !SmsReader) {
    console.log('[SMS] Not on native platform, skipping listener');
    return false;
  }

  if (listenerActive) {
    console.log('[SMS] Listener already active');
    return true;
  }

  if (!isSmsReaderEnabled()) {
    console.log('[SMS] SMS reader disabled by user');
    return false;
  }

  const perm = await checkSmsPermission();
  if (!perm.granted) {
    console.log('[SMS] Permission not granted, cannot start listener');
    return false;
  }

  try {
    await processPendingSms(onTransactionDetected);

    if (!appStateListener) {
      appStateListener = await App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          processPendingSms(onTransactionDetected);
        }
      });
    }

    smsEventHandle = await SmsReader.addListener('smsReceived', async (data: { sender: string; body: string; timestamp?: number }) => {
      console.log('[SMS] Bank SMS detected locally:', data.sender);
      
      if (isDuplicate(data.sender, data.timestamp)) {
        console.log('[SMS] Skipping duplicate local SMS');
        return;
      }

      try {
        const parsed = await smartParse(data.sender, data.body, data.timestamp);
        
        if (parsed && parsed.amount > 0) {
          console.log('[SMS] Parsed local transaction:', parsed.amount, parsed.transactionType);
          
          const typeLabel = parsed.transactionType === 'credit' ? 'Received' : 'Spent';
          const icon = parsed.transactionType === 'credit' ? '💰' : '💸';
          await triggerInstantNotification(
            `${icon} ${typeLabel} ₹${parsed.amount.toLocaleString()}`,
            `${parsed.bankName}${parsed.merchantName ? ` • ${parsed.merchantName}` : ''} — Auto-recorded`,
            '/transactions'
          );

          if (onTransactionDetected) {
            onTransactionDetected(parsed);
          }
        }
      } catch (parseErr) {
        console.warn('[SMS] Parse error:', parseErr);
      }
    });

    await SmsReader.startListening();
    listenerActive = true;
    console.log('[SMS] Listener started successfully');
    return true;
  } catch (err) {
    console.warn('[SMS] Failed to start listener:', err);
    return false;
  }
}

export async function stopSmsListener(): Promise<void> {
  if (!Capacitor.isNativePlatform() || !SmsReader) return;

  try {
    if (smsEventHandle) {
      await smsEventHandle.remove();
      smsEventHandle = null;
    }
    if (appStateListener) {
      await appStateListener.remove();
      appStateListener = null;
    }
    await SmsReader.stopListening();
    listenerActive = false;
    console.log('[SMS] Listener stopped');
  } catch (err) {
    console.warn('[SMS] Failed to stop listener:', err);
  }
}

export async function isListenerActive(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || !SmsReader) return false;
  try {
    const result = await SmsReader.isListening();
    return result.listening;
  } catch {
    return listenerActive;
  }
}

export default {
  checkSmsPermission,
  requestSmsPermission,
  startSmsListener,
  stopSmsListener,
  isListenerActive,
  isSmsReaderEnabled,
  setSmsReaderEnabled,
  processPendingSms,
  updateSmsConfig,
};
