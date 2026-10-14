import { create } from 'zustand';

import { chatSeenStorage } from '@/api/storage';
import type { ChatThread } from '@/types/chats';

// Patient chat has no server-side read state, so "unread" means: threads whose
// newest message arrived after the last time the user opened the Patient Chats
// screen. That last-seen marker is persisted (SecureStore) so the badge
// survives app restarts — a message that lands while the app is closed still
// shows as unread on the next open. Live socket messages are written into the
// react-query cache (see use-socket-events), so the home screen recomputes the
// count against this same marker without needing a separate session counter.

type ChatUnreadState = {
  // Packed YYYYMMDDHHMM int of the newest message the user has seen. 0 until
  // hydrated from storage / baselined on first load.
  lastSeenTs: number;
  hydrated: boolean;
  // Load the persisted marker once on app start.
  hydrate: () => Promise<void>;
  // Mark everything currently loaded as seen (called from the chat screen).
  // Advances + persists the marker to the newest loaded message.
  markSeen: (threads: ChatThread[]) => void;
  // First load with no stored marker: baseline to the newest message so we
  // don't flash a badge for the entire existing 30-day history.
  baselineIfUnset: (threads: ChatThread[]) => void;
};

// Backend formats timestamps as "DD-MM-YYYY HH:MM" (Beirut local). Every
// timestamp shares that format + zone, so a packed YYYYMMDDHHMM int orders
// them correctly without any Date/timezone parsing. Unparseable -> 0.
export function chatTsToComparable(ts: string | undefined): number {
  const m = /^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})$/.exec((ts ?? '').trim());
  if (!m) return 0;
  const [, dd, mm, yyyy, hh, min] = m;
  return Number(`${yyyy}${mm}${dd}${hh}${min}`);
}

function newestTs(threads: ChatThread[]): number {
  return threads.reduce((max, t) => {
    const c = chatTsToComparable(t.messages?.[0]?.timestamp);
    return c > max ? c : max;
  }, 0);
}

// Number of threads whose newest message is newer than the last-seen marker.
// Counts conversations with new messages, which is what the badge shows.
export function countChatUnread(threads: ChatThread[], lastSeenTs: number): number {
  return threads.reduce((n, t) => {
    const c = chatTsToComparable(t.messages?.[0]?.timestamp);
    return c > lastSeenTs ? n + 1 : n;
  }, 0);
}

export const useChatUnreadStore = create<ChatUnreadState>((set, get) => ({
  lastSeenTs: 0,
  hydrated: false,
  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const raw = await chatSeenStorage.get();
      const parsed = raw ? Number(raw) : 0;
      set({ lastSeenTs: Number.isFinite(parsed) ? parsed : 0, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
  markSeen: (threads) => {
    const next = Math.max(get().lastSeenTs, newestTs(threads));
    set({ lastSeenTs: next, hydrated: true });
    chatSeenStorage.set(String(next)).catch(() => {});
  },
  baselineIfUnset: (threads) => {
    if (get().lastSeenTs > 0) return;
    const next = newestTs(threads);
    if (next <= 0) return;
    set({ lastSeenTs: next, hydrated: true });
    chatSeenStorage.set(String(next)).catch(() => {});
  },
}));
