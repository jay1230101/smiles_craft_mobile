import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

import { useAuthStore } from '@/store/auth';

// Mount once at the app root. Wires two Expo notification listeners:
//
//  - addNotificationReceivedListener: fires while the app is foregrounded.
//    We rely on the notification handler in lib/push-notifications.ts to
//    still show the banner; nothing else to do here for now (the socket
//    layer already invalidates the relevant react-query cache).
//
//  - addNotificationResponseReceivedListener: fires when the user TAPS a
//    push (from the lock screen, notification tray, or foregrounded banner).
//    Route them to the Calendar tab so they land next to the appointment
//    that changed. All four push types the backend emits are calendar
//    events (rescheduled / cancelled / patient WA confirm|cancel).
export function PushBridge() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    // No point listening when the user isn't logged in — a tap that lands
    // on the login screen shouldn't try to route into the tabbed app.
    if (status !== 'authenticated') return;

    const received = Notifications.addNotificationReceivedListener(() => {
      // Intentionally empty. Left as a hook for future in-app toasts if
      // we ever want to show something more contextual than the OS banner.
    });

    const responded = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as
          | { type?: string; bookingId?: number | string }
          | undefined;
        // All four backend push types map to the calendar — either a
        // reschedule, a cancellation, or a WhatsApp response on an
        // existing appointment. Landing on the Calendar tab surfaces the
        // change without needing per-appointment deep-link routing that
        // we haven't built yet.
        try {
          router.push('/(tabs)/calendar' as never);
        } catch (err) {
          console.log('[push] tap navigation failed', { data, err });
        }
      },
    );

    return () => {
      received.remove();
      responded.remove();
    };
  }, [router, status]);

  return null;
}
