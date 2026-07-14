import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const CHANNEL_ID = 'ms_family_notifications';

export interface Slot {
  label: string;
  startHour: number;
  endHour: number;
  categories: string[];
  messages: string[];
}

export const DEFAULT_SLOTS: Record<string, Slot> = {
  morning: {
    label: 'Morning',
    startHour: 8,
    endHour: 10,
    categories: ['Breakfast', 'Tea', 'Milk', 'Travel'],
    messages: [
      "Record your breakfast or morning tea expense. ☕",
      "Start your day by noting down morning spends. 🌅",
      "Got any early morning expenses? Write them down! 🥛"
    ]
  },
  afternoon: {
    label: 'Afternoon',
    startHour: 13,
    endHour: 15,
    categories: ['Lunch', 'Snacks', 'Fuel', 'Shopping'],
    messages: [
      "Did you spend on lunch, snacks, or fuel? 🍛",
      "A quick reminder to record your mid-day spends. 🚗",
      "Mid-day check! Log your afternoon expenses. 🥤"
    ]
  },
  evening: {
    label: 'Evening',
    startHour: 18,
    endHour: 20,
    categories: ['Snacks', 'Tea', 'Bills', 'Travel'],
    messages: [
      "Log your evening tea, snacks, or travel fares. 🥟",
      "Keep your records updated. Spent on anything? 🌇",
      "Record any evening purchases or bill payments. 💳"
    ]
  },
  night: {
    label: 'Night',
    startHour: 21,
    endHour: 22,
    categories: ['Dinner', 'Daily Expense Entry', 'Pending Records'],
    messages: [
      "Review today's transactions and sleep peacefully. 🛌",
      "Log dinner and any other final spends for today. 🌙",
      "All set for today? Ensure all spends are noted. 🌌"
    ]
  }
};

const STORAGE_KEY_ENABLED = 'notif_enabled';
const STORAGE_KEY_SLOTS = 'notif_slots';
const STORAGE_KEY_CUSTOM_TIMES = 'notif_custom_times';
const STORAGE_KEY_LAST_SCHEDULED = 'notif_last_scheduled';
const STORAGE_KEY_LOW_PRIORITY_QUEUE = 'notif_low_priority_queue';
const STORAGE_KEY_DND = 'notif_dnd_settings';

export interface CustomTime {
  startHour?: number;
  endHour?: number;
}

export interface DndSettings {
  enabled: boolean;
  startHour: number; // e.g. 23 (11 PM)
  endHour: number;   // e.g. 7 (7 AM)
}

// ── GETTERS & SETTERS ────────────────────────────────────────────────────────

export const getNotifEnabled = (): boolean => {
  const val = localStorage.getItem(STORAGE_KEY_ENABLED);
  return val === null ? true : val === 'true';
};

export const setNotifEnabled = (enabled: boolean): void => {
  localStorage.setItem(STORAGE_KEY_ENABLED, String(enabled));
};

export const getSlotSettings = (): Record<string, boolean> => {
  try {
    const val = localStorage.getItem(STORAGE_KEY_SLOTS);
    return val ? JSON.parse(val) : { morning: true, afternoon: true, evening: true, night: true };
  } catch {
    return { morning: true, afternoon: true, evening: true, night: true };
  }
};

export const setSlotSettings = (slots: Record<string, boolean>): void => {
  localStorage.setItem(STORAGE_KEY_SLOTS, JSON.stringify(slots));
};

export const getCustomTimes = (): Record<string, CustomTime> => {
  try {
    const val = localStorage.getItem(STORAGE_KEY_CUSTOM_TIMES);
    return val ? JSON.parse(val) : {};
  } catch {
    return {};
  }
};

export const setCustomTimes = (times: Record<string, CustomTime>): void => {
  localStorage.setItem(STORAGE_KEY_CUSTOM_TIMES, JSON.stringify(times));
};

export const getDndSettings = (): DndSettings => {
  try {
    const val = localStorage.getItem(STORAGE_KEY_DND);
    return val ? JSON.parse(val) : { enabled: true, startHour: 23, endHour: 7 };
  } catch {
    return { enabled: true, startHour: 23, endHour: 7 };
  }
};

export const setDndSettings = (settings: DndSettings): void => {
  localStorage.setItem(STORAGE_KEY_DND, JSON.stringify(settings));
};

// ── helper: enforce title and body length limits ─────────────────────────────
const formatText = (text: string, limit: number): string => {
  if (text.length <= limit) return text;
  return text.substring(0, limit - 3) + '...';
};

// ── LOW PRIORITY QUEUE ───────────────────────────────────────────────────────

export interface LowPriorityEvent {
  message: string;
  timestamp: number;
}

export const getLowPriorityQueue = (): LowPriorityEvent[] => {
  try {
    const val = localStorage.getItem(STORAGE_KEY_LOW_PRIORITY_QUEUE);
    return val ? JSON.parse(val) : [];
  } catch {
    return [];
  }
};

export const clearLowPriorityQueue = (): void => {
  localStorage.removeItem(STORAGE_KEY_LOW_PRIORITY_QUEUE);
};

export const queueLowPriorityEvent = (message: string): void => {
  const queue = getLowPriorityQueue();
  queue.push({ message, timestamp: Date.now() });
  localStorage.setItem(STORAGE_KEY_LOW_PRIORITY_QUEUE, JSON.stringify(queue.slice(-100))); // keep last 100
  
  // Reschedule the Daily Summary since we have new events
  updateDailySummaryNotification();
};

// ── INITIALIZATION & PERMISSIONS ─────────────────────────────────────────────

export const requestPermissions = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    }
    return true;
  }
  try {
    const perm = await LocalNotifications.requestPermissions();
    return perm.display === 'granted';
  } catch (err) {
    console.warn('[Notif] Permission request failed:', err);
    return false;
  }
};

let channelInitialized = false;

export const initNotificationChannel = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform() || channelInitialized) return;
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'MS Family Alerts',
      description: 'Custom notification alerts for MS Family',
      sound: 'notification',
      importance: 4,
      vibration: true,
      lights: true,
      lightColor: '#6366f1',
    });
    await LocalNotifications.createChannel({
      id: 'ms_family_calls',
      name: 'MS Family Calls',
      description: 'Incoming voice call alerts',
      sound: 'call_receiving',
      importance: 5,
      vibration: true,
      lights: true,
      lightColor: '#10b981',
    });
    channelInitialized = true;
    console.log('[Notif] Channels created');
  } catch (err) {
    console.warn('[Notif] Channel creation failed:', err);
  }
};

export const cancelAllScheduled = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) });
    }
  } catch (err) {
    console.warn('[Notif] Cancel failed:', err);
  }
};

// ── SCHEDULING ───────────────────────────────────────────────────────────────

const getNotifId = (slotIndex: number, dayOffset: number): number => 1000 + (slotIndex * 10) + dayOffset;
const DAILY_SUMMARY_ID = 2000;

export const scheduleNotifications = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  const enabled = getNotifEnabled();
  if (!enabled) {
    await cancelAllScheduled();
    return;
  }

  const hasPermission = await requestPermissions();
  if (!hasPermission) return;

  const lastScheduled = localStorage.getItem(STORAGE_KEY_LAST_SCHEDULED);
  const today = new Date().toDateString();
  if (lastScheduled === today) return;

  await cancelAllScheduled();
  await initNotificationChannel();

  const slotSettings = getSlotSettings();
  const customTimes = getCustomTimes();
  const slotKeys = Object.keys(DEFAULT_SLOTS);
  const notifications: any[] = [];

  for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
    slotKeys.forEach((key, slotIndex) => {
      if (!slotSettings[key]) return;
      const slot = DEFAULT_SLOTS[key];
      const custom = customTimes[key];
      const startHour = custom?.startHour ?? slot.startHour;

      const msgIndex = Math.floor(Math.random() * slot.messages.length);
      const message = slot.messages[msgIndex];

      const scheduleDate = new Date();
      scheduleDate.setDate(scheduleDate.getDate() + dayOffset);
      scheduleDate.setHours(startHour, 0, 0, 0);
      if (scheduleDate.getTime() <= Date.now()) return;

      const title = formatText(`${slot.label} Spends`, 35);
      const body = formatText(message, 70);

      notifications.push({
        id: getNotifId(slotIndex, dayOffset),
        title,
        body,
        schedule: { at: scheduleDate },
        channelId: CHANNEL_ID,
        sound: 'notification',
        actionTypeId: 'OPEN_ADD_RECORD',
        extra: { route: '/add' },
      });
    });
  }

  // Also schedule the Daily Summary
  const summaryHour = 19; // 7 PM
  const summaryDate = new Date();
  summaryDate.setHours(summaryHour, 0, 0, 0);
  if (summaryDate.getTime() > Date.now()) {
    const queue = getLowPriorityQueue();
    const bodyText = queue.length > 0 
      ? `You have ${queue.length} updates today. Tap to review.`
      : "Daily financial overview is ready.";

    notifications.push({
      id: DAILY_SUMMARY_ID,
      title: formatText("Daily Summary 📊", 35),
      body: formatText(bodyText, 70),
      schedule: { at: summaryDate },
      channelId: CHANNEL_ID,
      sound: 'notification',
      extra: { route: '/notifications' },
    });
  }

  if (notifications.length > 0) {
    try {
      await LocalNotifications.schedule({ notifications });
      localStorage.setItem(STORAGE_KEY_LAST_SCHEDULED, today);
      console.log(`[Notif] Scheduled ${notifications.length} notifications`);
    } catch (err) {
      console.warn('[Notif] Schedule failed:', err);
    }
  }
};

/**
 * Dynamically updates the daily summary notification based on the queue contents.
 */
export const updateDailySummaryNotification = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  const enabled = getNotifEnabled();
  if (!enabled) return;

  try {
    // Cancel any existing daily summary
    await LocalNotifications.cancel({ notifications: [{ id: DAILY_SUMMARY_ID }] });

    const summaryHour = 19; // 7 PM
    const summaryDate = new Date();
    summaryDate.setHours(summaryHour, 0, 0, 0);
    if (summaryDate.getTime() <= Date.now()) {
      // If 7 PM has already passed, schedule for tomorrow
      summaryDate.setDate(summaryDate.getDate() + 1);
    }

    const queue = getLowPriorityQueue();
    const bodyText = queue.length > 0 
      ? `Today: ${queue.length} updates. Tap to review.`
      : "Daily financial overview is ready.";

    await LocalNotifications.schedule({
      notifications: [{
        id: DAILY_SUMMARY_ID,
        title: formatText("Daily Summary 📊", 35),
        body: formatText(bodyText, 70),
        schedule: { at: summaryDate },
        channelId: CHANNEL_ID,
        sound: 'notification',
        extra: { route: '/notifications' },
      }]
    });
  } catch (err) {
    console.warn('[Notif] Daily summary update failed:', err);
  }
};

export const rescheduleNotifications = async (): Promise<void> => {
  localStorage.removeItem(STORAGE_KEY_LAST_SCHEDULED);
  await scheduleNotifications();
};

// ── INSTANT NOTIFICATIONS & DND ──────────────────────────────────────────────

export const isQuietHour = (currentHour: number, dnd: DndSettings): boolean => {
  if (!dnd.enabled) return false;
  if (dnd.startHour > dnd.endHour) {
    // e.g. 11 PM to 7 AM (crosses midnight)
    return currentHour >= dnd.startHour || currentHour < dnd.endHour;
  } else {
    // e.g. 9 AM to 5 PM
    return currentHour >= dnd.startHour && currentHour < dnd.endHour;
  }
};

export const triggerInstantNotification = async (
  title: string,
  body: string,
  route = '/notifications',
  isFile = false,
  priority: 'high' | 'low' = 'high'
): Promise<void> => {
  const enabled = getNotifEnabled();
  if (!enabled) return;

  const dnd = getDndSettings();
  const now = new Date();
  const currentHour = now.getHours();

  // Enforce DND and Quiet hours for Low Priority, but bypass for High Priority
  if (priority === 'low') {
    // Queue low priority event for Daily Summary instead of triggering now
    queueLowPriorityEvent(`${title}: ${body}`);
    console.log('[Notif] Low priority event queued (Quiet Hours / Batched):', title);
    return;
  }

  // If in quiet hours (DND) and it's high priority, we can still deliver,
  // but if DND is strict, we can check. The requirement says:
  // "respect scheduling/quiet hours." We should respect it, but voice calls
  // or critical system alerts bypass it. Let's respect it for non-call high-priority.
  const isCall = route.includes('call') || title.toLowerCase().includes('call') || title.toLowerCase().includes('sos');
  if (isQuietHour(currentHour, dnd) && !isCall) {
    queueLowPriorityEvent(`[DND Batched] ${title}: ${body}`);
    console.log('[Notif] DND active — high priority non-call notification batched:', title);
    return;
  }

  // Format to limits
  const formattedTitle = formatText(title, 35);
  const formattedBody = formatText(body, 70);

  if (!Capacitor.isNativePlatform()) {
    try {
      const audio = new Audio('/tones/notification.mp3');
      audio.play().catch(() => {});
    } catch (e) {}

    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(formattedTitle, { body: formattedBody });
      } else if (Notification.permission !== 'denied') {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          new Notification(formattedTitle, { body: formattedBody });
        }
      }
    }
    return;
  }

  await initNotificationChannel();
  const hasPermission = await requestPermissions();
  if (!hasPermission) return;

  try {
    await LocalNotifications.schedule({
      notifications: [{
        id: Math.floor(Math.random() * 2147483647),
        title: formattedTitle,
        body: formattedBody,
        channelId: CHANNEL_ID,
        sound: 'notification',
        extra: { route, isFile },
      }],
    });
  } catch (err) {
    console.warn('[Notif] Instant schedule failed:', err);
  }
};

export const playForegroundTone = (): void => {
  try {
    const audio = new Audio('/tones/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch (e) {}
};

// ── ACTIONS ──────────────────────────────────────────────────────────────────

export const initNotificationListener = async (navigateFn: (route: string) => void): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.addListener('localNotificationActionPerformed', async (action) => {
      const extra = action.notification?.extra;
      if (!extra) return;

      if (extra.isFile && extra.route) {
        try {
          const { FileOpener } = await import('@capawesome-team/capacitor-file-opener');
          await FileOpener.openFile({ path: extra.route });
        } catch (err) {
          console.warn('[Notif] Failed to open file:', err);
        }
      } else if (extra.route && navigateFn) {
        navigateFn(extra.route);
      }
    });
  } catch (err) {
    console.warn('[Notif] Listener init failed:', err);
  }
};

export const initCallActionTypes = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: 'CALL_RINGING',
          actions: [
            { id: 'accept', title: 'Accept Call', foreground: true },
            { id: 'decline', title: 'Decline', destructive: true, foreground: true }
          ]
        },
        {
          id: 'CALL_ONGOING',
          actions: [
            { id: 'end', title: 'End Call', destructive: true, foreground: true }
          ]
        }
      ]
    });
  } catch (err) {
    console.warn('[Notif] Failed to register call actions:', err);
  }
};

/**
 * Translates a savings category to Tamil.
 */
export const translateCategoryToTamil = (category: string): string => {
  const dict: Record<string, string> = {
    'Gold': 'தங்கம்',
    'Silver': 'வெள்ளி',
    'Other': 'மற்றவை',
    'Land': 'நிலம்',
    'Gold 24K': 'தங்கம் 24K',
    'Gold 22K': 'தங்கம் 22K',
    'KDM': 'KDM'
  };
  return dict[category] || category;
};
