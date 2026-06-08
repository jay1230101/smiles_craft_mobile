import { create } from 'zustand';

import type { NotificationItem } from '@/types/notifications';

const MAX_ITEMS = 100;

type NotificationsState = {
  items: NotificationItem[];
  push: (item: Omit<NotificationItem, 'read'>) => void;
  markAllRead: () => void;
  clear: () => void;
  unreadCount: () => number;
  hydrate: (items: NotificationItem[]) => void;
};

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  items: [],
  push: (item) =>
    set((state) => {
      // Drop duplicates triggered by re-emits from the server (same id arriving
      // twice in quick succession).
      if (state.items.some((existing) => existing.id === item.id)) return state;
      const next: NotificationItem = { ...item, read: false };
      const items = [next, ...state.items].slice(0, MAX_ITEMS);
      return { items };
    }),
  markAllRead: () =>
    set((state) => ({ items: state.items.map((it) => ({ ...it, read: true })) })),
  clear: () => set({ items: [] }),
  unreadCount: () => get().items.filter((it) => !it.read).length,
  hydrate: (items) => set({ items: items.slice(0, MAX_ITEMS) }),
}));
