// In-memory mutable patient store for demo mode. The QA tester needs the
// patient list to actually reflect registers / edits / deletes — without this,
// every successful demo mutation would be invisible because MOCK_PATIENTS is
// a const seed. Live mode bypasses this entirely (api/patients.ts calls the
// real endpoints).
//
// State only lives for the lifetime of the JS bundle (cleared on app restart).
// That's intentional for QA: each session starts from a clean seed.

import { MOCK_PATIENTS } from './mock-appointments';
import type { PatientListItem } from '@/types/patients';

let store: PatientListItem[] = MOCK_PATIENTS.map((p) => ({ ...p }));
let nextId = Math.max(...store.map((p) => p.id), 100) + 1;

export const demoPatientStore = {
  list(): PatientListItem[] {
    return store.map((p) => ({ ...p }));
  },

  add(input: Omit<PatientListItem, 'id'>): PatientListItem {
    const patient: PatientListItem = { ...input, id: nextId++ };
    store = [patient, ...store];
    return patient;
  },

  update(id: number, patch: Partial<PatientListItem>): PatientListItem | null {
    const idx = store.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    const updated = { ...store[idx], ...patch, id };
    store = [...store.slice(0, idx), updated, ...store.slice(idx + 1)];
    return updated;
  },

  remove(id: number): boolean {
    const before = store.length;
    store = store.filter((p) => p.id !== id);
    return store.length < before;
  },

  reset(): void {
    store = MOCK_PATIENTS.map((p) => ({ ...p }));
    nextId = Math.max(...store.map((p) => p.id), 100) + 1;
  },
};
