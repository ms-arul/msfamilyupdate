import { Capacitor } from '@capacitor/core';
import { SmsReader } from '../plugins';
import { smartParse } from './smsParserService';
import { triggerInstantNotification } from './notificationService';
import { App } from '@capacitor/app';
import { SmsPermissionStatus } from '../types/native';
import { SmsParsedRecord } from './smsParserService';

let transactionCallback: ((parsed: SmsParsedRecord) => void | Promise<void>) | null = null;
let listenerActive = false;
let smsEventHandle: any = null;
let appStateListener: any = null;

// ─── SERVICE-LEVEL DEDUP ─────────────────────────────────────────────────────
// Prevents the same SMS from being processed by both the pending queue AND the
// real-time listener simultaneously.
const activeProcessingSet = new Set<string>();

function getHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString(36);
}

function getSmsFingerprint(sender: string, body: string): string {
  const cleanBody = (body || '').replace(/\s+/g, ' ').trim();
  return getHash(`${sender}_${cleanBody}`);
}

function isDuplicate(sender: string, body: string, timestamp?: number): boolean {
  const hash = getSmsFingerprint(sender, body);
  console.log(`[SMS] Checking duplicate — hash: ${hash}, sender: ${sender}`);
  
  // Check in-flight processing dedup
  if (activeProcessingSet.has(hash)) {
    console.log(`[SMS] ⏭ In-flight dedup hit (hash: ${hash})`);
    return true;
  }
  
  let stored: string[] = [];
  try {
    const raw = localStorage.getItem('sms_processed_hashes');
    if (raw) {
      stored = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('[SMS] Failed to parse processed hashes from localStorage:', e);
  }
  
  if (!Array.isArray(stored)) {
    stored = [];
  }
  
  if (stored.includes(hash)) {
    console.log(`[SMS] ⏭ localStorage dedup hit (hash: ${hash})`);
    return true;
  }
  
  stored.push(hash);
  if (stored.length > 300) {
    stored = stored.slice(-300); // Keep last 300
  }
  
  try {
    localStorage.setItem('sms_processed_hashes', JSON.stringify(stored));
  } catch (e) {
    console.warn('[SMS] Failed to save processed hashes to localStorage:', e);
  }
  
  console.log(`[SMS] ✅ Unique message (hash: ${hash})`);
  return false;
}

// ─── FAILED SMS QUEUE ────────────────────────────────────────────────────────
// SMS messages that failed to process are saved here for retry on next app open.

interface FailedSmsEntry {
  sender: string;
  body: string;
  timestamp: number;
  failReason: string;
  retryCount: number;
}

const FAILED_SMS_KEY = 'sms_failed_queue';
const MAX_FAILED_QUEUE = 20;
const MAX_RETRY_COUNT = 3;

function saveToFailedQueue(sender: string, body: string, timestamp: number, reason: string): void {
  try {
    const raw = localStorage.getItem(FAILED_SMS_KEY);
    let queue: FailedSmsEntry[] = raw ? JSON.parse(raw) : [];
    
    // Check if already in queue
    const hash = getSmsFingerprint(sender, body);
    if (queue.some(e => getSmsFingerprint(e.sender, e.body) === hash)) {
      return;
    }
    
    queue.push({ sender, body, timestamp, failReason: reason, retryCount: 0 });
    if (queue.length > MAX_FAILED_QUEUE) {
      queue = queue.slice(-MAX_FAILED_QUEUE);
    }
    
    localStorage.setItem(FAILED_SMS_KEY, JSON.stringify(queue));
    console.log(`[SMS] 📥 Saved to failed queue. Queue size: ${queue.length}. Reason: ${reason}`);
  } catch (e) {
    console.warn('[SMS] Failed to save to failed queue:', e);
  }
}

function getFailedQueue(): FailedSmsEntry[] {
  try {
    const raw = localStorage.getItem(FAILED_SMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function clearFailedQueue(): void {
  try {
    localStorage.removeItem(FAILED_SMS_KEY);
  } catch {}
}

function removeFromFailedQueue(sender: string, body: string): void {
  try {
    const hash = getSmsFingerprint(sender, body);
    const queue = getFailedQueue().filter(e => getSmsFingerprint(e.sender, e.body) !== hash);
    localStorage.setItem(FAILED_SMS_KEY, JSON.stringify(queue));
  } catch {}
}

// ─── CALLBACK INVOCATION WITH RETRY ──────────────────────────────────────────

async function invokeCallbackWithRetry(parsed: SmsParsedRecord, attempt = 1): Promise<void> {
  if (!transactionCallback) {
    console.warn('[SMS] ⚠️ No active transaction callback. SMS parsed but cannot insert.');
    saveToFailedQueue(parsed.sender, parsed.rawBody, Date.now(), 'No callback registered');
    return;
  }
  try {
    console.log(`[SMS] 📤 Invoking callback (attempt ${attempt}). Amount: ₹${parsed.amount} ${parsed.transactionType}`);
    await transactionCallback(parsed);
    console.log('[SMS] ✅ Transaction callback executed successfully');
  } catch (err) {
    console.error(`[SMS] ❌ Transaction callback failed (attempt ${attempt}/5):`, err);
    if (attempt < 5) {
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`[SMS] ⏳ Scheduling retry in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      await invokeCallbackWithRetry(parsed, attempt + 1);
    } else {
      console.error('[SMS] ❌ Transaction callback failed after 5 retries. Saving to failed queue.');
      saveToFailedQueue(parsed.sender, parsed.rawBody, Date.now(), `Callback failed: ${err}`);
    }
  }
}

// ─── SMS READER TOGGLE ───────────────────────────────────────────────────────

const SMS_ENABLED_KEY = 'sms_reader_enabled';

export const isSmsReaderEnabled = (): boolean => {
  return localStorage.getItem(SMS_ENABLED_KEY) !== 'false';
};

export const setSmsReaderEnabled = (enabled: boolean): void => {
  localStorage.setItem(SMS_ENABLED_KEY, String(enabled));
};

// ─── SMS PERMISSIONS ─────────────────────────────────────────────────────────

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

// ─── NATIVE CONFIG ───────────────────────────────────────────────────────────

export async function updateSmsConfig(url: string, key: string, token: string, userId: string, refreshToken?: string): Promise<void> {
  if (!Capacitor.isNativePlatform() || !SmsReader) return;
  try {
    await SmsReader.setConfig({ url, key, token, userId, refreshToken: refreshToken || '' });
    console.log('[SMS] 🔧 Native config updated for background sync');
  } catch (err) {
    console.warn('[SMS] Failed to set native config:', err);
  }
}

// ─── PROCESS PENDING SMS ─────────────────────────────────────────────────────

/**
 * Validates that a parsed SMS result has all required fields before
 * forwarding to the transaction callback.
 */
function validateParsedResult(parsed: SmsParsedRecord | null): parsed is SmsParsedRecord {
  if (!parsed) return false;
  if (typeof parsed.amount !== 'number' || parsed.amount <= 0) {
    console.log('[SMS] ⏭ Validation failed: invalid amount');
    return false;
  }
  if (!parsed.transactionType || !['credit', 'debit'].includes(parsed.transactionType)) {
    console.log('[SMS] ⏭ Validation failed: invalid transactionType');
    return false;
  }
  if (!parsed.sender || !parsed.rawBody) {
    console.log('[SMS] ⏭ Validation failed: missing sender or rawBody');
    return false;
  }
  return true;
}

async function processOneSms(
  sender: string,
  body: string,
  timestamp: number | undefined,
  source: string
): Promise<void> {
  const hash = getSmsFingerprint(sender, body);
  
  // Service-level in-flight dedup
  if (activeProcessingSet.has(hash)) {
    console.log(`[SMS] ⏭ Already processing this SMS (hash: ${hash})`);
    return;
  }
  activeProcessingSet.add(hash);
  
  try {
    const parsed = await smartParse(sender, body, timestamp);
    
    if (!validateParsedResult(parsed)) {
      console.log(`[SMS] ⏭ SMS from ${sender} failed validation. Skipping.`);
      return;
    }

    console.log(`[SMS] ✅ Parsed ${source} transaction: ₹${parsed.amount} ${parsed.transactionType} from ${parsed.bankName}`);
    
    // Show notification
    const sign = parsed.transactionType === 'credit' ? '+' : '-';
    const typeLabel = parsed.transactionType === 'credit' ? 'Received' : 'Spent';
    const notificationTitle = `💰 ${sign}₹${parsed.amount.toLocaleString()} · ${parsed.merchantName || parsed.bankName} · ${typeLabel}`;
    const notificationBody = `${parsed.bankName}${parsed.accountLast4 ? ` · ●●${parsed.accountLast4}` : ''} · ${new Date(parsed.smsDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    
    await triggerInstantNotification(notificationTitle, notificationBody, '/transactions');

    if (transactionCallback) {
      await invokeCallbackWithRetry(parsed);
    } else {
      console.warn(`[SMS] ⚠️ No callback registered for ${source} SMS. Saving to failed queue.`);
      saveToFailedQueue(sender, body, timestamp || Date.now(), 'No callback at process time');
    }
  } catch (err) {
    console.warn(`[SMS] ❌ Error processing ${source} SMS:`, err);
    saveToFailedQueue(sender, body, timestamp || Date.now(), `Processing error: ${err}`);
  } finally {
    // Remove from in-flight set after a delay to prevent immediate re-processing
    setTimeout(() => activeProcessingSet.delete(hash), 5000);
  }
}

export async function processPendingSms(onTransactionDetected?: (parsed: SmsParsedRecord) => void | Promise<void>): Promise<void> {
  if (!Capacitor.isNativePlatform() || !SmsReader) return;
  if (onTransactionDetected) {
    transactionCallback = onTransactionDetected;
  }

  try {
    console.log('[SMS] 🔍 Checking for pending SMS from background cache...');
    const result = await SmsReader.getAndClearPendingSms();
    const messages = result?.messages || [];

    if (messages.length > 0) {
      console.log(`[SMS] 📬 Found ${messages.length} pending SMS to process`);
      
      for (const msg of messages) {
        if (isDuplicate(msg.sender, msg.body, msg.timestamp)) {
          continue;
        }
        await processOneSms(msg.sender, msg.body, msg.timestamp, 'background');
      }
    } else {
      console.log('[SMS] 📭 No pending background SMS');
    }

    // Also retry failed queue
    await retryFailedQueue();
  } catch (err) {
    console.warn('[SMS] Failed to get pending SMS:', err);
  }
}

/**
 * Retry processing SMS messages that previously failed.
 */
async function retryFailedQueue(): Promise<void> {
  const queue = getFailedQueue();
  if (queue.length === 0) return;
  
  console.log(`[SMS] 🔄 Retrying ${queue.length} failed SMS...`);
  
  for (const entry of queue) {
    if (entry.retryCount >= MAX_RETRY_COUNT) {
      console.log(`[SMS] ⏭ Max retries reached for failed SMS. Removing.`);
      removeFromFailedQueue(entry.sender, entry.body);
      continue;
    }
    
    if (!transactionCallback) {
      console.log('[SMS] ⏭ No callback yet for failed queue retry. Will try later.');
      break;
    }
    
    try {
      const parsed = await smartParse(entry.sender, entry.body, entry.timestamp);
      if (validateParsedResult(parsed)) {
        await transactionCallback(parsed);
        removeFromFailedQueue(entry.sender, entry.body);
        console.log(`[SMS] ✅ Failed SMS retry succeeded: ₹${parsed.amount}`);
      } else {
        removeFromFailedQueue(entry.sender, entry.body);
      }
    } catch (err) {
      // Increment retry count
      const updatedQueue = getFailedQueue().map(e => {
        if (getSmsFingerprint(e.sender, e.body) === getSmsFingerprint(entry.sender, entry.body)) {
          return { ...e, retryCount: e.retryCount + 1 };
        }
        return e;
      });
      localStorage.setItem(FAILED_SMS_KEY, JSON.stringify(updatedQueue));
      console.warn(`[SMS] ❌ Failed SMS retry failed (attempt ${entry.retryCount + 1}):`, err);
    }
  }
}

// ─── START / STOP LISTENER ───────────────────────────────────────────────────

export async function startSmsListener(onTransactionDetected?: (parsed: SmsParsedRecord) => void | Promise<void>): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || !SmsReader) {
    console.log('[SMS] Not on native platform, skipping listener');
    return false;
  }

  if (onTransactionDetected) {
    transactionCallback = onTransactionDetected;
  }

  if (listenerActive) {
    console.log('[SMS] Listener already active, callback reference updated.');
    await processPendingSms(onTransactionDetected);
    return true;
  }

  if (!isSmsReaderEnabled()) {
    console.log('[SMS] SMS reader disabled by user settings');
    return false;
  }

  const perm = await checkSmsPermission();
  if (!perm.granted) {
    console.log('[SMS] Permission not granted, cannot start listener');
    return false;
  }

  try {
    console.log('[SMS] 🚀 Initializing SMS listener...');
    await processPendingSms(onTransactionDetected);

    if (!appStateListener) {
      appStateListener = await App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          console.log('[SMS] 📱 App resumed — scanning for missed SMS');
          processPendingSms(transactionCallback || undefined);
        }
      });
    }

    smsEventHandle = await SmsReader.addListener('smsReceived', async (data: { sender: string; body: string; timestamp?: number }) => {
      console.log('[SMS] 📩 Real-time SMS received:', data.sender);
      
      if (isDuplicate(data.sender, data.body, data.timestamp)) {
        return;
      }

      await processOneSms(data.sender, data.body, data.timestamp, 'real-time');
    });

    await SmsReader.startListening();
    listenerActive = true;
    console.log('[SMS] ✅ SMS listener started and active');
    return true;
  } catch (err) {
    console.warn('[SMS] ❌ Failed to start SMS listener:', err);
    // Auto-restart after 5s
    setTimeout(() => {
      console.log('[SMS] 🔄 Attempting to auto-restart crashed listener...');
      startSmsListener(transactionCallback || undefined);
    }, 5000);
    return false;
  }
}

export async function stopSmsListener(): Promise<void> {
  if (!Capacitor.isNativePlatform() || !SmsReader) return;

  try {
    console.log('[SMS] Stopping SMS listener...');
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
    console.log('[SMS] SMS listener stopped successfully');
  } catch (err) {
    console.warn('[SMS] Failed to stop SMS listener:', err);
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

export function resetSmsService(): void {
  activeProcessingSet.clear();
  transactionCallback = null;
  listenerActive = false;
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
  resetSmsService,
};
