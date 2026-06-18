import { create } from 'zustand';

import type { BackendEvent } from '@/types/appointments';

// The appointment context shared from the popover to the three M3 amendment
// screens (Orders, Plan of Care, Schedule Future WhatsApp). Each screen reads
// the event when it mounts and clears it on close.
type ActiveAppointmentState = {
  event: BackendEvent | null;
  setEvent: (event: BackendEvent | null) => void;
  clear: () => void;
};

export const useActiveAppointmentStore = create<ActiveAppointmentState>((set) => ({
  event: null,
  setEvent: (event) => set({ event }),
  clear: () => set({ event: null }),
}));
