import { LogBox } from 'react-native';

import { isDevelopment } from './env';

// Silence diagnostic logging in preview/production builds so patient PII and
// request payloads (logged via console.log throughout the data layer) never
// reach on-device release logs. console.warn / console.error are preserved for
// real problems. Imported first at the app root (app/_layout.tsx); local
// console.log debugging keeps working in development.
if (!isDevelopment) {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.debug = noop;
}

// Expo Go (SDK 53+) dropped remote-push support, so `expo-notifications`
// prints these two messages the moment it initialises inside Expo Go. They're
// harmless — we already skip remote registration in Expo Go (see
// lib/push-notifications.ts `isExpoGo`) and real dev/production builds support
// push normally — but the LogBox error toast they raise sits on top of the tab
// bar and blocks navigation during on-device testing. Silence just those two
// strings; every other warning/error still surfaces. Imported before
// expo-notifications loads (this module is the app root's first import), so the
// filter is registered in time. No-op in release, where LogBox is disabled.
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  '`expo-notifications` functionality is not fully supported in Expo Go',
]);
