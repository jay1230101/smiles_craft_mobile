import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  registerDeviceTokenRequest,
  unregisterDeviceTokenRequest,
} from '@/api/push-notifications';

// Push notification lifecycle for the Smiles Craft mobile app.
//
// Backend contract (dental_clinic_26_02_2028/backend/views.py:4844-4883):
//   - POST /register-device-token   { token, platform, deviceId? }
//   - POST /unregister-device-token { token }
//   - Notifications are sent via Expo's push service; the backend batches
//     up to 100 messages per HTTP call and drops "DeviceNotRegistered"
//     tokens automatically, so we don't have to do server-side cleanup
//     ourselves.
//
// The four events that actually push (per docs/backend-guide-push-notifications.md
// and the corresponding views.py sites):
//   1. Appointment rescheduled  (views.py:2813)
//   2. Appointment cancelled by staff (views.py:3758)
//   3. Patient confirmed via WhatsApp (views.py:1472)
//   4. Patient cancelled via WhatsApp (views.py:1502)
//
// Everything else (new bookings, patient registrations, etc.) intentionally
// stays on the socket layer only — the client team explicitly asked for
// pushes to be reserved for changes to existing appointments so doctors
// aren't buried in notifications from every routine action.

// Notification behavior when the app is foregrounded. Show the banner even
// if the user is already in-app so a rescheduled or cancelled appointment
// doesn't get missed while they're staring at the calendar.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Cache the last token we shipped so /unregister can find it on logout even
// if the OS-level permission was revoked between register and logout.
let lastRegisteredToken: string | null = null;

function isRealDevice(): boolean {
  // Expo Push doesn't work in the iOS Simulator or Android Emulator — the OS
  // itself refuses to hand out a push token there. Bail early so we don't
  // spam the backend with a permission prompt users can't grant.
  return Device.isDevice;
}

function isExpoGo(): boolean {
  // Remote push was removed from Expo Go in SDK 53 — calling
  // getExpoPushTokenAsync() there throws AND prints a red error overlay that
  // can never succeed until the app runs as a development/production build.
  // Detect Expo Go so we skip remote registration entirely (local
  // notifications still work; only the remote token fetch is unavailable).
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  // A dedicated channel lets us tune importance + vibration without
  // clobbering system-level defaults. All Smiles Craft pushes flow through
  // this one channel — the type is discriminated in the payload's `data`
  // field, not the channel.
  await Notifications.setNotificationChannelAsync('appointments', {
    name: 'Appointment updates',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#014CA9',
    sound: 'default',
  });
}

async function requestPermissionIfNeeded(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status: next } = await Notifications.requestPermissionsAsync();
  return next === 'granted';
}

function getProjectId(): string | undefined {
  // In managed Expo builds the project id lives in expoConfig.extra.eas.
  // Fallback to easConfig for older SDKs. Both null → local dev without
  // an EAS build; Expo will still hand out a token in Expo Go but only for
  // Expo Go's own push receiver.
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId
  );
}

async function fetchExpoPushToken(): Promise<string | null> {
  const projectId = getProjectId();
  const tokenResponse = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );
  return tokenResponse?.data ?? null;
}

// Call after a successful login. Returns silently on failure — push
// registration is best-effort and must never block the user from using the
// app. All failure paths log through the [push] prefix for later triage.
export async function registerForPushNotifications(): Promise<void> {
  try {
    if (!isRealDevice()) {
      console.log('[push] skipping register — simulator/emulator');
      return;
    }

    if (isExpoGo()) {
      // Expo Go can't obtain a remote push token (removed in SDK 53). Set up
      // the Android channel so local notifications still behave, but skip the
      // token fetch + backend registration that would otherwise throw.
      await ensureAndroidChannel();
      console.log('[push] skipping remote register — Expo Go');
      return;
    }

    await ensureAndroidChannel();

    const granted = await requestPermissionIfNeeded();
    if (!granted) {
      console.log('[push] permission not granted');
      return;
    }

    const token = await fetchExpoPushToken();
    if (!token) {
      console.log('[push] no token returned');
      return;
    }

    const platform: 'ios' | 'android' =
      Platform.OS === 'ios' ? 'ios' : 'android';

    await registerDeviceTokenRequest({
      token,
      platform,
      deviceId: Device.modelId ?? Device.modelName ?? null,
    });

    lastRegisteredToken = token;
    console.log('[push] registered', { platform });
  } catch (err) {
    console.log('[push] register failed', err);
  }
}

// Call before logout. Also best-effort — if the unregister fails we still
// clear the local token so we don't try to unregister it twice.
export async function unregisterForPushNotifications(): Promise<void> {
  const token = lastRegisteredToken;
  if (!token) {
    return;
  }
  lastRegisteredToken = null;
  try {
    await unregisterDeviceTokenRequest({ token });
    console.log('[push] unregistered');
  } catch (err) {
    console.log('[push] unregister failed', err);
  }
}
