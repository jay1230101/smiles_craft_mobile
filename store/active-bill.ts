import { create } from 'zustand';

import type { BillReceiptData } from '@/types/billing';

// Shared cashier-flow context: queue → bill detail → record payment →
// receipt. Each screen reads what it needs on mount and clears on close.
// Keeping this in a store (rather than route params) lets the receipt
// screen present a server-returned object that wouldn't serialize cleanly.
type ActiveBillState = {
  patientId: number | null;
  patientName: string | null;
  receipt: BillReceiptData | null;
  setPatient: (id: number, name: string) => void;
  setReceipt: (receipt: BillReceiptData | null) => void;
  clear: () => void;
};

export const useActiveBillStore = create<ActiveBillState>((set) => ({
  patientId: null,
  patientName: null,
  receipt: null,
  setPatient: (id, name) => set({ patientId: id, patientName: name }),
  setReceipt: (receipt) => set({ receipt }),
  clear: () => set({ patientId: null, patientName: null, receipt: null }),
}));
