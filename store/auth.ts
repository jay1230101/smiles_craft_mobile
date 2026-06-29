import { create } from 'zustand';
import { loginRequest } from '@/api/auth';
import { clearAuthStorage, tokenStorage, userStorage } from '@/api/storage';
import { queryClient } from '@/lib/query-client';
import { useActiveAppointmentStore } from '@/store/active-appointment';
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
    if (token) {
      set({
        status: 'authenticated',
        token,
        user: (user as User | null) ?? null,
      });
    } else {
      set({ status: 'unauthenticated', token: null, user: null });
    }
  },

  login: async (email, password) => {
    set({ isSubmitting: true, error: null });
    try {
      const res = await loginRequest({ email, password });
      await Promise.all([tokenStorage.set(res.token), userStorage.set(res.user)]);
      set({
        status: 'authenticated',
        token: res.token,
        user: res.user,
        isSubmitting: false,
        error: null,
      });
    } catch (err) {
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Login failed';
      set({ isSubmitting: false, error: message });
      throw err;
    }
  },

  logout: async () => {
    await clearAuthStorage();
    // Wipe every cross-user surface so logging in as a different clinic's user
    // doesn't see the previous user's clinician, doctor filter, draft prefill,
    // notifications, or any cached query data. Without this the next login
    // can show the wrong clinician name in the booking prefill — reproduced
    // when switching between users from different clinics.
    queryClient.clear();
    useNewAppointmentStore.getState().clear();
    useActiveAppointmentStore.getState().clear();
    useEditEventStore.getState().clear();
    useEditPatientStore.getState().clear();
    useDoctorFilterStore.getState().reset();
    useNotificationsStore.getState().clear();
    set({ status: 'unauthenticated', token: null, user: null, error: null });
  },

  clearError: () => set({ error: null }),
}));
