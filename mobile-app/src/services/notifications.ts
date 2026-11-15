import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { cancelAllScheduledNotificationsAsync } from 'expo-notifications/build/cancelAllScheduledNotificationsAsync';
import { getExpoPushTokenAsync } from 'expo-notifications/build/getExpoPushTokenAsync';
import { AndroidImportance } from 'expo-notifications/build/NotificationChannelManager.types';
import {
  getPermissionsAsync,
  requestPermissionsAsync,
} from 'expo-notifications/build/NotificationPermissions';
import { SchedulableTriggerInputTypes } from 'expo-notifications/build/Notifications.types';
import { addNotificationResponseReceivedListener } from 'expo-notifications/build/NotificationsEmitter';
import { setNotificationHandler } from 'expo-notifications/build/NotificationsHandler';
import { scheduleNotificationAsync } from 'expo-notifications/build/scheduleNotificationAsync';
import { setNotificationChannelAsync } from 'expo-notifications/build/setNotificationChannelAsync';
import { Platform } from 'react-native';

import { Brand } from '@/constants/brand';
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

export function getDeviceName(): string {
  return Device.modelName || Device.deviceName || `${Platform.OS} device`;
}

let handlerInitialized = false;

export function configureNotificationsHandler() {
  if (handlerInitialized || Platform.OS === 'web') return;
  handlerInitialized = true;
  try {
    setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch {
    // Ignore on unsupported environments
  }
}

export async function ensureAndroidNotificationChannel() {
  if (Platform.OS !== 'android') return;
  try {
    await setNotificationChannelAsync(ANDROID_REMINDER_CHANNEL_ID, {
      name: 'Study & Streak Reminders',
      description: 'Daily study reminders and learning streak nudges from Kindling',
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 150, 200],
      lightColor: Brand.pine,
    });
  } catch {
    // Ignore channel setup errors on non-Android environments
  }
}

export async function getNotificationPermissionStatus(): Promise<
  'granted' | 'denied' | 'undetermined' | 'unsupported'
> {
  if (Platform.OS === 'web') return 'unsupported';
  try {
    const settings = await getPermissionsAsync();
    return settings.status;
  } catch {
    return 'undetermined';
  }
}

export async function requestNotificationPermissions(): Promise<{
  granted: boolean;
  status: 'granted' | 'denied' | 'undetermined' | 'unsupported';
  expoPushToken: string | null;
}> {
  if (Platform.OS === 'web') {
    return { granted: false, status: 'unsupported', expoPushToken: null };
  }

  configureNotificationsHandler();
  await ensureAndroidNotificationChannel();

  let finalStatus: 'granted' | 'denied' | 'undetermined' = 'undetermined';
  try {
    const existing = await getPermissionsAsync();
    finalStatus = existing.status;
    if (existing.status !== 'granted') {
      const requested = await requestPermissionsAsync();
      finalStatus = requested.status;
    }
  } catch {
    return { granted: false, status: 'denied', expoPushToken: null };
  }

  if (finalStatus !== 'granted') {
    return { granted: false, status: finalStatus, expoPushToken: null };
  }

  let expoPushToken: string | null = null;
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId ??
      '5e3bbe52-59de-4739-a52f-450ff49945f5';
    const tokenResponse = await getExpoPushTokenAsync({ projectId });
    expoPushToken = tokenResponse.data || null;
    if (expoPushToken) {
      await setSecret(PUSH_TOKEN_STORAGE_KEY, expoPushToken);
    }
  } catch {
    // On simulators or Expo Go without push credentials, local notifications still work
    expoPushToken = await getSecret(PUSH_TOKEN_STORAGE_KEY);
  }

  return {
    granted: true,
    status: 'granted',
    expoPushToken,
  };
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
  learnerName?: string,
  goal?: string,
): Promise<number> {
  if (Platform.OS === 'web') return 0;

  try {
    await cancelAllScheduledNotificationsAsync();
  } catch {
    return 0;
  }

  if (!settings.pushEnabled) return 0;

  const permStatus = await getNotificationPermissionStatus();
  if (permStatus !== 'granted') return 0;

  await ensureAndroidNotificationChannel();

  const firstName = (learnerName || 'there').trim().split(' ')[0] || 'there';
  const hour = Math.max(0, Math.min(23, Number(settings.reminderHour ?? 17)));
  const minute = Math.max(0, Math.min(59, Number(settings.reminderMinute ?? 0)));
  let scheduledCount = 0;

  try {
    if (settings.dailyReminderEnabled) {
      await scheduleNotificationAsync({
        content: {
          title: `Time to learn with Kindling, ${firstName}! ✦`,
          body: goal?.trim()
            ? `Spend 10 focused minutes working toward your goal: ${goal.trim()}.`
            : 'Open Kindling for a quick 10-minute adaptive lesson or practice check.',
          sound: 'default',
          data: { kind: 'daily_study_reminder', route: '/(tabs)/learn' },
        },
        trigger: {
          type: SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: Platform.OS === 'android' ? ANDROID_REMINDER_CHANNEL_ID : undefined,
        },
      });
      scheduledCount += 1;
    }

    if (settings.streakReminderEnabled) {
      const streakHour = (hour + 2) % 24;
      await scheduleNotificationAsync({
        content: {
          title: 'Keep your learning streak alive 🔥',
          body: 'Even one worked example or quick quiz question keeps your momentum strong today.',
          sound: 'default',
          data: { kind: 'streak_reminder', route: '/(tabs)/learn' },
        },
        trigger: {
          type: SchedulableTriggerInputTypes.DAILY,
          hour: streakHour,
          minute,
          channelId: Platform.OS === 'android' ? ANDROID_REMINDER_CHANNEL_ID : undefined,
        },
      });
      scheduledCount += 1;
    }
  } catch {
    // Ignore scheduling errors on unsupported runtimes
  }

  try {
    await setSecret(LOCAL_PREFS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage error
  }

  return scheduledCount;
}

export async function initializeAndSyncPushNotifications(
  learnerName?: string,
  goal?: string,
): Promise<PushNotificationSettings | null> {
  configureNotificationsHandler();
  let remote: PushNotificationSettings | null = null;
  try {
    remote = await getPushSettings();
  } catch {
    return null;
  }

  if (Platform.OS === 'web') return remote;

  if (remote.pushEnabled) {
    const perm = await getNotificationPermissionStatus();
    if (perm === 'granted') {
      const { expoPushToken } = await requestNotificationPermissions();
      if (expoPushToken) {
        const alreadyRegistered = remote.devices.some(
          (d) => d.expoPushToken === expoPushToken && d.isActive,
        );
        if (!alreadyRegistered) {
          try {
            remote = await savePushSettings({
              expoPushToken,
              platform: Platform.OS,
              deviceName: getDeviceName(),
            });
          } catch {
            // Keep existing remote state
          }
        }
      }
      await syncLocalReminderSchedule(remote, learnerName, goal);
    }
  } else {
    try {
      await cancelAllScheduledNotificationsAsync();
    } catch {
      // Ignore
    }
  }

  return remote;
}

export function subscribeToNotificationResponses(
  onNavigate: (payload: { route?: string; subject?: string; topic?: string }) => void,
): () => void {
  if (Platform.OS === 'web') return () => {};
  try {
    const subscription = addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | { route?: string; subject?: string; topic?: string }
        | undefined;
      if (data) onNavigate(data);
    });
    return () => subscription.remove();
  } catch {
    return () => {};
  }
}

export async function triggerTestReminderNotification(
  learnerName?: string,
  goal?: string,
): Promise<{ deliveredVia: 'remote_and_local' | 'local'; message: string }> {
  configureNotificationsHandler();
  await ensureAndroidNotificationChannel();

  const perm = await requestNotificationPermissions();
  if (!perm.granted && Platform.OS !== 'web') {
    throw new Error(
      'Notification permissions are turned off on this device. Enable notifications in your device settings first.',
    );
  }

  if (perm.expoPushToken) {
    try {
      await savePushSettings({
        expoPushToken: perm.expoPushToken,
        platform: Platform.OS,
        deviceName: getDeviceName(),
        pushEnabled: true,
      });
    } catch {
      // Continue
    }
  }

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
    // Fallback to local notification preview
  }

  if (Platform.OS !== 'web' && !remoteSent) {
    await scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        data: { kind: 'study_reminder', route: '/(tabs)/learn' },
      },
      trigger: null,
    });
  }

  return {
    deliveredVia: remoteSent ? 'remote_and_local' : 'local',
    message: remoteSent
      ? 'Test push sent via Expo Push Service!'
      : 'Test study reminder delivered to your device!',
  };
}
