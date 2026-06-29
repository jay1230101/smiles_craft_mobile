import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'sc_jwt';
const USER_KEY = 'sc_user';
const REMEMBERED_EMAIL_KEY = 'sc_remembered_email';

const webMemory: Record<string, string | null> = {};

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    webMemory[key] = value;
    try {
      window.localStorage?.setItem(key, value);
    } catch {}
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (webMemory[key] !== undefined) return webMemory[key];
    try {
      return window.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

async function removeItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    delete webMemory[key];
    try {
      window.localStorage?.removeItem(key);
    } catch {}
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const tokenStorage = {
  get: () => getItem(TOKEN_KEY),
  set: (token: string) => setItem(TOKEN_KEY, token),
  clear: () => removeItem(TOKEN_KEY),
};

export const userStorage = {
  get: async () => {
    const raw = await getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  },
  set: (user: unknown) => setItem(USER_KEY, JSON.stringify(user)),
  clear: () => removeItem(USER_KEY),
};

// "Remember me" survives logout on purpose — the whole point is that the
// email is prefilled the next time the user opens the app, even after they
// signed out. Don't include it in clearAuthStorage.
export const rememberedEmailStorage = {
  get: () => getItem(REMEMBERED_EMAIL_KEY),
  set: (email: string) => setItem(REMEMBERED_EMAIL_KEY, email),
  clear: () => removeItem(REMEMBERED_EMAIL_KEY),
};

export async function clearAuthStorage(): Promise<void> {
  await Promise.all([tokenStorage.clear(), userStorage.clear()]);
}
