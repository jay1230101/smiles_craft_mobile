import { create } from 'zustand';

import type { PatientListItem } from '@/types/patients';

// Holds the patient currently being edited. Set by the patient card's Edit
// action before navigating to the edit screen; cleared on save or cancel.
type EditPatientState = {
  patient: PatientListItem | null;
  setPatient: (p: PatientListItem | null) => void;
  clear: () => void;
};

export const useEditPatientStore = create<EditPatientState>((set) => ({
  patient: null,
  setPatient: (patient) => set({ patient }),
  clear: () => set({ patient: null }),
}));
