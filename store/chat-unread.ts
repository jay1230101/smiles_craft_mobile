import { create } from 'zustand';

// The chat backend has no read/unread state, so we track "new since you last
// looked" on the client: bump on each inbound `displayPatientWhatsApp` socket
// event, clear when the Patient Chats screen is focused. Drives the badge on
// the home Chat button.
type ChatUnreadState = {
  unread: number;
  bump: () => void;
  clear: () => void;
};

export const useChatUnreadStore = create<ChatUnreadState>((set) => ({
  unread: 0,
  bump: () => set((s) => ({ unread: s.unread + 1 })),
  clear: () => set({ unread: 0 }),
}));
