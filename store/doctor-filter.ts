import { create } from 'zustand';

// Shared doctor filter used by both the Calendar and the Dashboard so the
// selection stays in sync as the user moves between tabs. `null` = "All Doctors".
type DoctorFilterState = {
  selectedDoctorId: number | null;
  setSelectedDoctorId: (id: number | null) => void;
};

export const useDoctorFilterStore = create<DoctorFilterState>((set) => ({
  selectedDoctorId: null,
  setSelectedDoctorId: (id) => set({ selectedDoctorId: id }),
}));
