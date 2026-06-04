import { create } from 'zustand';
import { loginRequest } from '@/api/auth';
import { clearAuthStorage, tokenStorage, userStorage } from '@/api/storage';
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
    set({ status: 'unauthenticated', token: null, user: null, error: null });
  },

  clearError: () => set({ error: null }),
}));
