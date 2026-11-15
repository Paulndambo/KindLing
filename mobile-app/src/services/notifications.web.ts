import {
  getPushSettings,
  savePushSettings,
  sendTestPushNotification,
  type PushNotificationSettings,
} from '@/services/api';
import { getSecret, setSecret } from '@/services/storage';

const PUSH_TOKEN_STORAGE_KEY = 'kindling.push.token.v1';
const LOCAL_PREFS_STORAGE_KEY = 'kindling.push.prefs.v1';
export const ANDROID_REMINDER_CHANNEL_ID = 'kindling-reminders';

export type ReminderTimePreset = {
  id: string;
  label: string;
  sublabel: string;
  hour: number;
  minute: number;
};

export const REMINDER_TIME_PRESETS: ReminderTimePreset[] = [
  { id: 'morning', label: '8:00 AM', sublabel: 'Morning focus', hour: 8, minute: 0 },
  { id: 'afternoon', label: '4:00 PM', sublabel: 'After school', hour: 16, minute: 0 },
  { id: 'early_evening', label: '5:30 PM', sublabel: 'Early evening', hour: 17, minute: 30 },
  { id: 'evening', label: '7:30 PM', sublabel: 'Evening review', hour: 19, minute: 30 },
];

export function formatReminderTime(hour = 17, minute = 0): string {
  const safeHour = Math.max(0, Math.min(23, Number(hour) || 0));
  const safeMin = Math.max(0, Math.min(59, Number(minute) || 0));
  const period = safeHour >= 12 ? 'PM' : 'AM';
  const hour12 = safeHour % 12 === 0 ? 12 : safeHour % 12;
  const minPadded = String(safeMin).padStart(2, '0');
  return `${hour12}:${minPadded} ${period}`;
}

export function configureNotificationsHandler() {
  // No-op on web
}

export async function ensureAndroidNotificationChannel() {
  // No-op on web
}

export async function getNotificationPermissionStatus(): Promise<
  'granted' | 'denied' | 'undetermined' | 'unsupported'
> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'granted';
  }
  const perm = window.Notification.permission;
  if (perm === 'granted') return 'granted';
  if (perm === 'denied') return 'denied';
  return 'undetermined';
}

export async function requestNotificationPermissions(): Promise<{
  granted: boolean;
  status: 'granted' | 'denied' | 'undetermined' | 'unsupported';
  expoPushToken: string | null;
}> {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const result = await window.Notification.requestPermission();
      const status =
        result === 'granted'
          ? 'granted'
          : result === 'denied'
            ? 'denied'
            : 'undetermined';
      return {
        granted: status === 'granted',
        status,
        expoPushToken: null,
      };
    } catch {
      return { granted: true, status: 'granted', expoPushToken: null };
    }
  }
  return { granted: true, status: 'granted', expoPushToken: null };
}

export function getDeviceName(): string {
  return 'Web browser';
}

export async function getStoredPushToken(): Promise<string | null> {
  try {
    return await getSecret(PUSH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function syncLocalReminderSchedule(
  settings: Pick<
    PushNotificationSettings,
    | 'pushEnabled'
    | 'dailyReminderEnabled'
    | 'streakReminderEnabled'
    | 'reminderHour'
    | 'reminderMinute'
  >,
): Promise<number> {
  try {
    await setSecret(LOCAL_PREFS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage error
  }
  return (settings.dailyReminderEnabled ? 1 : 0) + (settings.streakReminderEnabled ? 1 : 0);
}

export async function initializeAndSyncPushNotifications(): Promise<PushNotificationSettings | null> {
  try {
    return await getPushSettings();
  } catch {
    return null;
  }
}

export function subscribeToNotificationResponses(
  _onNavigate: (payload: { route?: string; subject?: string; topic?: string }) => void,
): () => void {
  return () => {};
}

export async function triggerTestReminderNotification(
  learnerName?: string,
  goal?: string,
): Promise<{ deliveredVia: 'remote_and_local' | 'local'; message: string }> {
  const firstName = (learnerName || 'there').trim().split(' ')[0] || 'there';
  let title = `Ready for a quick lesson, ${firstName}? 🔥`;
  let body = goal?.trim()
    ? `Keep your learning streak going! Spend 10 minutes with Kindling on ${goal.trim().toLowerCase()}.`
    : 'Keep your learning streak going! Open Kindling for a 10-minute adaptive lesson.';
  let remoteSent = false;

  try {
    const res = await sendTestPushNotification();
    if (res?.title) title = res.title;
    if (res?.body) body = res.body;
    if ((res?.delivery?.sent || 0) > 0) {
      remoteSent = true;
    }
  } catch {
    // Fallback to browser notification preview
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      if (window.Notification.permission !== 'granted') {
        await window.Notification.requestPermission();
      }
      if (window.Notification.permission === 'granted') {
        new window.Notification(title, { body });
      }
    } catch {
      // Ignore browser notification errors
    }
  }

  try {
    await savePushSettings({ pushEnabled: true });
  } catch {
    // Ignore
  }

  return {
    deliveredVia: remoteSent ? 'remote_and_local' : 'local',
    message: remoteSent
      ? 'Test push sent via Expo Push Service!'
      : 'Test study reminder sent!',
  };
}
