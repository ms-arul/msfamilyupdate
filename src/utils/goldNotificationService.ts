import { getLiveRates } from './rateService';
import { triggerInstantNotification } from './notificationService';
import { registerPlugin, Capacitor } from '@capacitor/core';

const SmsReader = registerPlugin<any>('SmsReader');

// ── Storage Keys ────────────────────────────────────────────────────────────
const LAST_GOLD_PRICE_KEY = 'ms_gold_last_price';
const GOLD_ALERT_THRESHOLD_KEY = 'ms_gold_alert_threshold';
const GOLD_ALERT_LAST_FIRED_KEY = 'ms_gold_alert_last_fired';

// Minimum price change (₹/gram) to trigger a notification
const MIN_CHANGE_THRESHOLD = 50;

// Cooldown between notifications (30 minutes)
const ALERT_COOLDOWN_MS = 30 * 60 * 1000;

// ── Threshold getters/setters ───────────────────────────────────────────────

/**
 * Set a user-defined gold price threshold (₹/gram).
 * When the price crosses this value, a notification is fired.
 */
export const setGoldAlertThreshold = (price: number | null): void => {
  if (price && price > 0) {
    localStorage.setItem(GOLD_ALERT_THRESHOLD_KEY, String(price));
    if (Capacitor.isNativePlatform()) {
      try {
        SmsReader.setGoldAlertThreshold({ price });
      } catch (e) {
        console.warn("Failed to sync gold threshold to native preferences", e);
      }
    }
  } else {
    localStorage.removeItem(GOLD_ALERT_THRESHOLD_KEY);
    if (Capacitor.isNativePlatform()) {
      try {
        SmsReader.setGoldAlertThreshold({ price: null });
      } catch (e) {
        console.warn("Failed to clear gold threshold in native preferences", e);
      }
    }
  }
};

/**
 * Get the user-defined gold price threshold.
 * Returns null if not set.
 */
export const getGoldAlertThreshold = (): number | null => {
  const val = localStorage.getItem(GOLD_ALERT_THRESHOLD_KEY);
  return val ? Number(val) : null;
};

interface GoldPriceInfo {
  gold24: number;
  gold22: number;
  timestamp: number;
}

// ── Internal helpers ────────────────────────────────────────────────────────

function getLastKnownPrice(): GoldPriceInfo | null {
  try {
    const str = localStorage.getItem(LAST_GOLD_PRICE_KEY);
    return str ? JSON.parse(str) : null;
  } catch {
    return null;
  }
}

function saveCurrentPrice(gold24: number, gold22: number): void {
  localStorage.setItem(LAST_GOLD_PRICE_KEY, JSON.stringify({
    gold24,
    gold22,
    timestamp: Date.now(),
  }));
}

function canFireAlert(): boolean {
  const lastFired = localStorage.getItem(GOLD_ALERT_LAST_FIRED_KEY);
  if (!lastFired) return true;
  return (Date.now() - Number(lastFired)) > ALERT_COOLDOWN_MS;
}

function markAlertFired(): void {
  localStorage.setItem(GOLD_ALERT_LAST_FIRED_KEY, String(Date.now()));
}

// ── Main check function ─────────────────────────────────────────────────────

/**
 * Fetches the latest gold price and compares with the last known price.
 * Fires a local notification if:
 *   1. Price changed by ≥ ₹50/gram (significant movement)
 *   2. Price crossed the user-defined threshold
 * 
 * Call this periodically (e.g., every 15 minutes).
 */
export async function checkGoldPriceAlert(): Promise<void> {
  try {
    // Proactively sync threshold to native side on check
    if (Capacitor.isNativePlatform()) {
      try {
        const threshold = getGoldAlertThreshold();
        SmsReader.setGoldAlertThreshold({ price: threshold });
      } catch (e) {
        console.warn("Failed to auto-sync threshold to native prefs", e);
      }
    }

    const rates = await getLiveRates();
    if (!rates || !rates.gold24) return;

    const currentGold24 = rates.gold24;
    const currentGold22 = rates.gold22;
    const lastKnown = getLastKnownPrice();

    // Always update the stored price
    saveCurrentPrice(currentGold24, currentGold22);

    // First run — no previous data to compare
    if (!lastKnown) return;

    // Check cooldown
    if (!canFireAlert()) return;

    const priceDiff = currentGold24 - lastKnown.gold24;
    const absDiff = Math.abs(priceDiff);

    // ── Check 1: Significant price movement ──────────────────────────
    if (absDiff >= MIN_CHANGE_THRESHOLD) {
      const direction = priceDiff > 0 ? '📈 Increased' : '📉 Decreased';
      const emoji = priceDiff > 0 ? '🔺' : '🔻';
      
      await triggerInstantNotification(
        `${emoji} Gold Price ${priceDiff > 0 ? 'Up' : 'Down'}!`,
        `Gold 24K: ₹${currentGold24.toLocaleString()}/g (${direction} by ₹${absDiff}/g)`,
        '/savings'
      );
      markAlertFired();
      return; // Don't fire threshold alert in same cycle
    }

    // ── Check 2: User-defined threshold crossing ─────────────────────
    const threshold = getGoldAlertThreshold();
    if (threshold) {
      const wasBelowThreshold = lastKnown.gold24 < threshold;
      const isAboveThreshold = currentGold24 >= threshold;
      const wasAboveThreshold = lastKnown.gold24 >= threshold;
      const isBelowThreshold = currentGold24 < threshold;

      if (wasBelowThreshold && isAboveThreshold) {
        await triggerInstantNotification(
          '🎯 Gold Crossed Your Target!',
          `Gold 24K hit ₹${currentGold24.toLocaleString()}/g — above your ₹${threshold.toLocaleString()} alert.`,
          '/savings'
        );
        markAlertFired();
      } else if (wasAboveThreshold && isBelowThreshold) {
        await triggerInstantNotification(
          '⚠️ Gold Dropped Below Target!',
          `Gold 24K dropped to ₹${currentGold24.toLocaleString()}/g — below your ₹${threshold.toLocaleString()} alert.`,
          '/savings'
        );
        markAlertFired();
      }
    }
  } catch (err) {
    console.warn('[GoldAlert] Check failed:', err);
  }
}
