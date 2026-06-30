// Shapes returned by the Flask cashier endpoints. Field naming is mixed
// between camelCase (/bill/<id>) and snake_case (/patient/<id>/billing)
// because the two views were written at different times — we model both
// faithfully and normalize at the UI layer.

export type CurrentBillEntry = {
  patientId: number;
  name: string;
  father: string;
  family: string;
};

export type GetCurrentBillsResponse = CurrentBillEntry[];

// /getPendingBills — clinic-wide outstanding list (not just today). Schema
// comes from views.py:2860; field names are snake_case because the backend
// already serialized them that way and we don't want to drift from the web
// payload shape that consumes the same endpoint.
export type PendingBillEntry = {
  encounter_date: string | null;
  patient_name: string;
  phone_number: string;
  outstanding_balance: string;
  encounter_id: number;
  provider: string;
  medical_status: string;
};

export type GetPendingBillsResponse = {
  status: 'success' | 'error';
  message: string | null;
  data: PendingBillEntry[];
};

export type BillPatient = {
  id: number;
  name: string;
  family: string;
  phone: string;
};

export type BillEncounter = {
  id: number;
  billNumber: string;
  procedure: string;
  toothNumber: string;
  fees: number;
  discount: number;
  netPrice: number;
  previousPayment: number;
  remainingBalance: number;
  doctor: string;
  status: string;
  date: string;
};

export type BillTotals = {
  totalBill: number;
  totalPreviousPayment: number;
  totalRemainingBalance: number;
  latestBillNumber: string | null;
  latestBillDate: string | null;
};

export type GetBillDetailResponse = {
  patient: BillPatient;
  encounters: BillEncounter[];
  totals: BillTotals;
  status: 'success' | 'idle';
  message: string | null;
};

export type PatientBillingProcedure = {
  id: number;
  procedure: string;
  status: string;
  status_date: string;
  fees: number;
  net_price: number;
  discount: number;
  amount_paid: number;
  remaining_balance: number;
  provider: string;
  currency: string;
  bill_number: string;
};

export type GetPatientBillingResponse = {
  status: 'success' | 'error';
  message: string | null;
  total_balance: number;
  procedures: PatientBillingProcedure[];
};

export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'other';

export type RecordPaymentInput = {
  patient_id: number;
  billID: number[];
  amountPaid: number;
  method?: PaymentMethod;
  // Receipt-building context. Mobile POSTs to /treatment-plan (matching
  // what the web's BillDetails.jsx already does), and that endpoint only
  // returns { status, message } — it does NOT echo a receipt object. So
  // the mobile receipt has to be assembled locally from the bill detail
  // the screen already has in memory. These fields supply that context.
  doctorName: string;
  patient: BillPatient;
  paidEncounters: BillEncounter[];
  currency?: string;
};

export type RecordPaymentResponse = {
  status: 'success' | 'error';
  message?: string;
  remaining_balance?: number;
  receipt?: BillReceiptData;
};

export type BillReceiptData = {
  receiptNumber: string;
  date: string;
  patient: BillPatient;
  lineItems: Array<{
    procedure: string;
    toothNumber?: string;
    amount: number;
  }>;
  amountPaid: number;
  remainingBalance: number;
  currency: string;
};

export function fullPatientName(entry: CurrentBillEntry): string {
  return [entry.name, entry.father, entry.family].filter(Boolean).join(' ').trim();
}

export function patientInitials(entry: { name?: string; family?: string }): string {
  const first = entry.name?.trim()?.[0] ?? '';
  const last = entry.family?.trim()?.[0] ?? '';
  const initials = `${first}${last}`.toUpperCase();
  return initials || '?';
}
