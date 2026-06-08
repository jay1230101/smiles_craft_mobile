import { create } from 'zustand';

import type { BackendEvent } from '@/types/appointments';

// Holds the appointment currently being edited. Set by the Calendar popover
// before navigating to the edit screen; cleared on save or cancel.
type EditEventState = {
  event: BackendEvent | null;
  setEvent: (event: BackendEvent | null) => void;
  clear: () => void;
};

export const useEditEventStore = create<EditEventState>((set) => ({
  event: null,
  setEvent: (event) => set({ event }),
  clear: () => set({ event: null }),
}));
