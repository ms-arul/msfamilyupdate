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
    label: 'Morning', startHour: 6, endHour: 10,
    categories: ['Tea', 'Breakfast', 'Milk', 'Travel'],
    messages: [
      "காலை வணக்கம்! உங்க {category} செலவை நோட் பண்ண மறக்காதீங்க. ☕",
      "இனிய காலை பொழுது! இன்னைய {category} செலவை இப்போவே கணக்குல எழுதிக்கோங்க. ✨",
      "குட் மார்னிங்! இன்னைக்கு காலைல {category} செலவு ஏதாச்சும் செஞ்சீங்களா? 🌅",
      "ஹலோ! இன்னைய நாளின் {category} செலவை உடனே பதிவு செய்ய ஒரு குட்டி நினைவூட்டல்! 🌾",
      "இனிய காலை வணக்கம்! உங்க {category} செலவுகளை உடனே பதிவு பண்ணுங்க. ✍️"
    ],
  },
  afternoon: {
    label: 'Afternoon', startHour: 12, endHour: 15,
    categories: ['Lunch', 'Snacks', 'Fuel', 'Shopping'],
    messages: [
      "மதிய உணவு அல்லது {category} செலவுகள் ஏதும் உண்டா? மறக்காம எழுதிடுங்க. 🍛",
      "மதிய நேர நினைவூட்டல்! ஒரு நிமிடம் ஒதுக்கி உங்க {category} செலவை பதிவு செய்யுங்க. ⏳",
      "ஹலோ! இன்னைக்கு மதிய நேர {category} செலவை இப்போவே கணக்குல ஏத்திட்டீங்களா? 📝",
      "விறுவிறுப்பான மதிய வேளையில், உங்க {category} செலவை ஒரு தரம் சரிபார்த்துக்கொள்ளுங்கள்! ☀️",
      "மதிய இடைவேளையில் ஒரு நிமிடம்! உங்க {category} செலவுகளை இப்போவே பதிவு செய்யுங்க. 🥤"
    ],
  },
  evening: {
    label: 'Evening', startHour: 17, endHour: 20,
    categories: ['Tea', 'Snacks', 'Travel', 'Bills'],
    messages: [
      "மாலை நேர நினைவூட்டல்! உங்க டீ/காபி அல்லது {category} செலவுகளை எழுதிடுங்க. ☕",
      "இனிய மாலை பொழுது! இன்னைக்கு ஈவினிங் {category} செலவு ஏதாச்சும் செஞ்சீங்களா? 🥟",
      "ஹலோ! மாலை நேர {category} கணக்கை இப்போவே உடனே பதிவு பண்ணுங்க. 🚗",
      "இன்றைய மாலை நேர {category} செலவுகளை மறக்காம குறித்துக்கொள்ளுங்கள்! 🌇",
      "சாயங்கால நேர காபி குடித்தாச்சா? {category} செலவை மறக்காம பதிவு பண்ணுங்க! 🚲"
    ],
  },
  night: {
    label: 'Night', startHour: 20, endHour: 23,
    categories: ['Dinner', 'Daily Expense Entry', 'Pending Records'],
    messages: [
      "இன்றைய நாள் முடியப்போகுது! {category} செலவுகளை எழுதிட்டு நிம்மதியா தூங்குங்க. 🛌",
      "குட் நைட்! இன்னைக்கு செஞ்ச {category} செலவெல்லாம் கணக்குல எழுதிட்டீங்களானு செக் பண்ணிக்கோங்க. 🌙",
      "தூங்குவதற்கு முன்னாடி... இன்றைய {category} செலவுகளை பதிவு செய்ய ஒரு குட்டி நினைவூட்டல்! 🌌",
      "இன்றைய நாளின் {category} கணக்கை முடித்துவிட்டு இனிதே ஓய்வெடுங்கள்! 😴",
      "இன்றைய எல்லா {category} செலவுகளையும் சரியா பதிவு பண்ணியாச்சா? ஒரு தரம் செக் பண்ணிக்கோங்க! 🔍"
    ],
  },
};

export const translateCategoryToTamil = (cat: string): string => {
  const mapping: Record<string, string> = {
    'Tea': 'டீ/காபி',
    'Breakfast': 'காலை உணவு',
    'Milk': 'பால்',
    'Travel': 'பயணம்',
    'Lunch': 'மதிய உணவு',
    'Snacks': 'ஸ்நாக்ஸ்',
    'Fuel': 'பெட்ரோல்/டீசல்',
    'Shopping': 'ஷாப்பிங்',
    'Bills': 'பில் கட்டணங்கள்',
    'Dinner': 'இரவு உணவு',
    'Daily Expense Entry': 'தினசரி செலவுகள்',
    'Pending Records': 'மீதமுள்ள கணக்குகள்',
    // Assets & Savings categories
    'Daily Savings': 'தினசரி சேமிப்பு',
    'Gold': 'தங்கம்',
    'Silver': 'வெள்ளி',
    'Other': 'இதர முதலீடுகள்',
    'Standard': 'சாதாரண கடன்',
    '24K (99.9%)': '24K தங்கம் (99.9%)',
    '22K (91.6%)': '22K தங்கம் (91.6%)',
    'KDM': 'தங்கம் (KDM)',
    '18K': '18K தங்கம்',
    'Gold Coins': 'தங்க நாணயங்கள்',
    'Gold Bars': 'தங்கக் கட்டிகள்',
    'Silver Bars': 'வெள்ளிக் கட்டிகள்',
    'Silver Coins': 'வெள்ளி நாணயங்கள்',
    'Silver Jewelry': 'வெள்ளி ஆபரணங்கள்',
    'Sterling Silver': 'ஸ்டெர்லிங் வெள்ளி',
    'Stocks': 'பங்குகள்',
    'Mutual Funds': 'பரஸ்பர நிதிகள் (Mutual Funds)',
    'Crypto': 'கிரிப்டோ',
    'Real Estate': 'ரியல் எஸ்டேட்',
    'Bonds': 'பத்திரங்கள்',
    'FD': 'நிலையான வைப்பு (FD)'
  };
  return mapping[cat] || cat;
};

const STORAGE_KEY_ENABLED = 'notif_enabled';
const STORAGE_KEY_SLOTS = 'notif_slots';
const STORAGE_KEY_CUSTOM_TIMES = 'notif_custom_times';
const STORAGE_KEY_LAST_SCHEDULED = 'notif_last_scheduled';

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
  } catch { return { morning: true, afternoon: true, evening: true, night: true }; }
};
export const setSlotSettings = (slots: Record<string, boolean>): void => {
  localStorage.setItem(STORAGE_KEY_SLOTS, JSON.stringify(slots));
};

export interface CustomTime {
  startHour?: number;
  endHour?: number;
}

export const getCustomTimes = (): Record<string, CustomTime> => {
  try {
    const val = localStorage.getItem(STORAGE_KEY_CUSTOM_TIMES);
    return val ? JSON.parse(val) : {};
  } catch { return {}; }
};
export const setCustomTimes = (times: Record<string, CustomTime>): void => {
  localStorage.setItem(STORAGE_KEY_CUSTOM_TIMES, JSON.stringify(times));
};

const getNotifId = (slotIndex: number, dayOffset: number): number => 1000 + (slotIndex * 10) + dayOffset;

export const requestPermissions = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) return true;
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
  } catch (err) { console.warn('[Notif] Cancel failed:', err); }
};

export const scheduleNotifications = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  const enabled = getNotifEnabled();
  if (!enabled) { await cancelAllScheduled(); return; }

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

  const slotTitlesTamil: Record<string, string> = {
    morning: 'காலை நேர நினைவூட்டல் 🌅',
    afternoon: 'மதிய நேர நினைவூட்டல் 🍛',
    evening: 'மாலை நேர நினைவூட்டல் 🌇',
    night: 'இரவு நேர நினைவூட்டல் 🌙'
  };

  for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
    slotKeys.forEach((key, slotIndex) => {
      if (!slotSettings[key]) return;
      const slot = DEFAULT_SLOTS[key];
      const custom = customTimes[key];
      const startHour = custom?.startHour ?? slot.startHour;

      const catIndex = Math.floor(Math.random() * slot.categories.length);
      const msgIndex = Math.floor(Math.random() * slot.messages.length);
      const category = slot.categories[catIndex];
      const translatedCategory = translateCategoryToTamil(category);
      const message = slot.messages[msgIndex].replace('{category}', translatedCategory);

      const scheduleDate = new Date();
      scheduleDate.setDate(scheduleDate.getDate() + dayOffset);
      scheduleDate.setHours(startHour, 0, 0, 0);
      if (scheduleDate.getTime() <= Date.now()) return;

      notifications.push({
        id: getNotifId(slotIndex, dayOffset),
        title: `${slotTitlesTamil[key] || slot.label} — ${translatedCategory}`,
        body: message,
        schedule: { at: scheduleDate },
        channelId: CHANNEL_ID,
        sound: 'notification',
        actionTypeId: 'OPEN_ADD_RECORD',
        extra: { route: '/add', category },
      });
    });
  }

  if (notifications.length > 0) {
    try {
      await LocalNotifications.schedule({ notifications });
      localStorage.setItem(STORAGE_KEY_LAST_SCHEDULED, today);
      console.log(`[Notif] Scheduled ${notifications.length} notifications`);
    } catch (err) { console.warn('[Notif] Schedule failed:', err); }
  }
};

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
  } catch (err) { console.warn('[Notif] Listener init failed:', err); }
};

export const rescheduleNotifications = async (): Promise<void> => {
  localStorage.removeItem(STORAGE_KEY_LAST_SCHEDULED);
  await scheduleNotifications();
};

export const triggerInstantNotification = async (
  title: string,
  body: string,
  route: string = '/notifications',
  isFile: boolean = false
): Promise<void> => {
  const enabled = getNotifEnabled();
  if (!enabled) return;

  if (!Capacitor.isNativePlatform()) {
    try {
      const audio = new Audio('/tones/notification.mp3');
      audio.play().catch(() => {});
    } catch (e) {}

    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body });
      } else if (Notification.permission !== 'denied') {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          new Notification(title, { body });
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
        title,
        body,
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
