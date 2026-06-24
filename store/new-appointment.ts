import { create } from 'zustand';

export type NewAppointmentPrefill = {
  date: string; // DD-MM-YYYY
  startTime: string; // HH:MM (24h)
  endTime: string; // HH:MM (24h)
  doctorId: number | null;
  doctorName: string | null;
};

type State = {
  prefill: NewAppointmentPrefill | null;
};

type Actions = {
  setPrefill: (p: NewAppointmentPrefill) => void;
  clear: () => void;
};

export const useNewAppointmentStore = create<State & Actions>((set) => ({
  prefill: null,
  setPrefill: (p) => set({ prefill: p }),
  clear: () => set({ prefill: null }),
}));
