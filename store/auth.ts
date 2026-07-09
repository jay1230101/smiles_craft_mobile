import { create } from 'zustand';
import { loginRequest } from '@/api/auth';
import { clearAuthStorage, tokenStorage, userStorage } from '@/api/storage';
import { queryClient } from '@/lib/query-client';
import {
  registerForPushNotifications,
  unregisterForPushNotifications,
} from '@/lib/push-notifications';
import { useActiveAppointmentStore } from '@/store/active-appointment';
import { useActiveBillStore } from '@/store/active-bill';
import { useDoctorFilterStore } from '@/store/doctor-filter';
import { useEditEventStore } from '@/store/edit-event';
import { useEditPatientStore } from '@/store/edit-patient';
import { useNewAppointmentStore } from '@/store/new-appointment';
import { useNotificationsStore } from '@/store/notifications';
import type { User } from '@/types/auth';

const DEV_BYPASS_LOGIN = false;

type AuthStatus = 'unknown' | 'authenticated' | 'unauthenticated';

type AuthState = {
  status: AuthStatus;
  token: string | null;
  user: User | null;
  error: string | null;
  isSubmitting: boolean;
};

type AuthActions = {
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
};

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  status: 'unknown',
  token: null,
  user: null,
  error: null,
  isSubmitting: false,

  hydrate: async () => {
    if (DEV_BYPASS_LOGIN) {
      set({ status: 'authenticated', token: 'dev-bypass-token', user: null });
      return;
    }
    const [token, user] = await Promise.all([tokenStorage.get(), userStorage.get()]);
    // Only hydrate as authenticated when BOTH pieces are present. A dangling
    // user record without a token (or vice versa) means a half-completed
    // logout on a previous session — clear the leftover and land on the
    // login screen instead of resurfacing stale profile data.
    if (token && user) {
      set({
        status: 'authenticated',
        token,
        user: user as User,
      });
    } else {
      await clearAuthStorage();
      set({ status: 'unauthenticated', token: null, user: null });
    }
  },

  login: async (email, password) => {
    set({ isSubmitting: true, error: null });
    try {
      const res = await loginRequest({ email, password });
      // Defensive wipe: if the app ended up here without a preceding logout()
      // (e.g. an expired-session bounce, or a very old build that logged in
      // over an existing session), any zustand store or query-cache entry
      // from the previous user would still be live. Clear everything before
      // seeding the new session so the new clinic's data is what the UI
      // shows immediately after login.
      queryClient.clear();
      useNewAppointmentStore.getState().clear();
      useActiveAppointmentStore.getState().clear();
      useActiveBillStore.getState().clear();
      useEditEventStore.getState().clear();
      useEditPatientStore.getState().clear();
      useDoctorFilterStore.getState().reset();
      useNotificationsStore.getState().clear();
      await Promise.all([tokenStorage.set(res.token), userStorage.set(res.user)]);
      set({
        status: 'authenticated',
        token: res.token,
        user: res.user,
        isSubmitting: false,
        error: null,
      });
      // Fire-and-forget: register this device with the backend so the
      // clinic-wide push emits (rescheduled / cancelled / patient WA
      // confirm|cancel) reach this phone. Failures are logged only —
      // they must not surface as a login error.
      registerForPushNotifications();
    } catch (err) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Login failed';
      set({ isSubmitting: false, error: message });
      throw err;
    }
  },

  logout: async () => {
    // Unregister the push token BEFORE clearing the JWT — the backend route
    // is @token_required so it needs the header the api client is about to
    // strip. Await so we don't race the storage clear, but treat any failure
    // as non-fatal (the token will be dropped from the DB anyway the next
    // time Expo returns DeviceNotRegistered for it).
    await unregisterForPushNotifications();
    await clearAuthStorage();
    // Wipe every cross-user surface so logging in as a different clinic's user
    // doesn't see the previous user's clinician, doctor filter, draft prefill,
    // notifications, cashier context, or any cached query data. Without this
    // the next login can show the wrong clinician name in the booking prefill
    // (reproduced when switching between users from different clinics) or
    // the wrong patient's bill / receipt in the cashier flow.
    queryClient.clear();
    useNewAppointmentStore.getState().clear();
    useActiveAppointmentStore.getState().clear();
    useActiveBillStore.getState().clear();
    useEditEventStore.getState().clear();
    useEditPatientStore.getState().clear();
    useDoctorFilterStore.getState().reset();
    useNotificationsStore.getState().clear();
    set({ status: 'unauthenticated', token: null, user: null, error: null });
  },

  clearError: () => set({ error: null }),
}));
