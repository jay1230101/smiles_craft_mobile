import { apiClient } from './client';
import { endpoints } from './endpoints';
import type {
  BillEncounter,
  BillPatient,
  BillReceiptData,
  GetBillDetailResponse,
  GetCurrentBillsResponse,
  GetPatientBillingResponse,
  GetPendingBillsResponse,
  RecordPaymentInput,
  RecordPaymentResponse,
} from '@/types/billing';

export async function getPendingBillsRequest(): Promise<GetPendingBillsResponse> {
  console.log('[billing] GET', endpoints.bills.pending);
  try {
    const { data } = await apiClient.get<GetPendingBillsResponse>(endpoints.bills.pending);
    console.log('[billing] pending response', data?.status, `count=${data?.data?.length ?? 0}`);
    return {
      status: data?.status ?? 'error',
      message: data?.message ?? null,
      data: Array.isArray(data?.data) ? data.data : [],
    };
  } catch (err) {
    console.log('[billing] pending ERROR', err);
    throw err;
  }
}

export async function getCurrentBillsRequest(): Promise<GetCurrentBillsResponse> {
  console.log('[billing] GET', endpoints.bills.current);
  try {
    const { data } = await apiClient.get<GetCurrentBillsResponse>(endpoints.bills.current);
    console.log('[billing] current response', Array.isArray(data) ? `array(${data.length})` : typeof data);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.log('[billing] current ERROR', err);
    throw err;
  }
}

export async function getBillDetailRequest(patientId: number): Promise<GetBillDetailResponse> {
  const path = endpoints.bills.detail(patientId);
  console.log('[billing] GET', path);
  try {
    const { data } = await apiClient.get<GetBillDetailResponse>(path);
    console.log('[billing] detail response', data?.status, `encounters=${data?.encounters?.length ?? 0}`);
    return data;
  } catch (err) {
    console.log('[billing] detail ERROR', err);
    throw err;
  }
}

export async function getPatientBillingRequest(patientId: number): Promise<GetPatientBillingResponse> {
  const path = endpoints.bills.history(patientId);
  console.log('[billing] GET', path);
  try {
    const { data } = await apiClient.get<GetPatientBillingResponse>(path);
    console.log('[billing] history response', data?.status, `procedures=${data?.procedures?.length ?? 0}`);
    return data;
  } catch (err) {
    console.log('[billing] history ERROR', err);
    throw err;
  }
}

// Cashier payment recording. The web app (frontend/src/pages/BillDetails.jsx)
// POSTs the payment to /treatment-plan with empty `inProcessStatus` and
// `procedures` arrays — only the payment block in views.py:3684-3711 runs,
// no new encounter row is inserted. Mobile mirrors that exactly so we don't
// need a separate /record-payment route.
//
// /treatment-plan returns just { status, message } — no receipt object.
// We build the receipt locally from the bill detail context the cashier
// screen already has in memory, then return the synthesized response shape
// the receipt screen expects.
type TreatmentPlanPayload = {
  billID: number[];
  doctor: string;
  amountPaid: number;
  disposition: string[];
  patient_id: number;
  deliveryOptions: {
    email: boolean;
    whatsapp: boolean;
    save: boolean;
    print: boolean;
  };
  inProcessStatus: never[];
  procedures: never[];
};

type TreatmentPlanResponse = {
  status: 'success' | 'error';
  message?: string;
};

export async function recordPaymentRequest(
  input: RecordPaymentInput,
): Promise<RecordPaymentResponse> {
  const payload: TreatmentPlanPayload = {
    billID: input.billID,
    doctor: input.doctorName,
    amountPaid: input.amountPaid,
    // Web sends one DISCHARGED string per encounter; backend zips them
    // 1:1 to the bills being paid (views.py:3709-3711).
    disposition: input.billID.map(() => 'discharged'),
    patient_id: input.patient_id,
    deliveryOptions: { email: false, whatsapp: false, save: true, print: false },
    inProcessStatus: [],
    procedures: [],
  };

  console.log('[billing] POST', endpoints.orders.submit, '(payment-only)', {
    billID: payload.billID,
    amountPaid: payload.amountPaid,
  });

  try {
    const { data } = await apiClient.post<TreatmentPlanResponse>(
      endpoints.orders.submit,
      payload,
    );
    console.log('[billing] /treatment-plan response', data?.status);

    if (data?.status !== 'success') {
      return {
        status: 'error',
        message: data?.message || 'Payment could not be recorded.',
      };
    }

    return {
      status: 'success',
      message: data.message,
      remaining_balance: computeRemainingAfter(input),
      receipt: buildReceipt(input),
    };
  } catch (err) {
    console.log('[billing] /treatment-plan ERROR', err);
    throw err;
  }
}

// Walk the selected encounters in order and consume the paid amount,
// mirroring the backend's payment loop (views.py:3684-3711). What's left
// untouched is the new remaining balance for the patient. Anything paid in
// excess of the total remaining is silently discarded — same as the web.
function computeRemainingAfter(input: RecordPaymentInput): number {
  let remaining = input.amountPaid;
  let stillOwed = 0;
  for (const enc of input.paidEncounters) {
    const owed = enc.remainingBalance;
    if (remaining >= owed) {
      remaining -= owed; // bill paid off
    } else {
      stillOwed += owed - remaining;
      remaining = 0;
    }
  }
  return Math.max(0, Math.round(stillOwed * 100) / 100);
}

function buildReceipt(input: RecordPaymentInput): BillReceiptData {
  let amountLeft = input.amountPaid;
  const lineItems: BillReceiptData['lineItems'] = [];
  for (const enc of input.paidEncounters) {
    const applied = Math.min(enc.remainingBalance, Math.max(0, amountLeft));
    amountLeft -= applied;
    lineItems.push({
      procedure: enc.procedure,
      toothNumber: enc.toothNumber || undefined,
      amount: applied,
    });
  }

  return {
    // Receipt number convention matches what the web prints (the latest
    // billSequenceNumber of the bills being paid). Fall back to a synthetic
    // RCT-<timestamp> if no encounter carries a number.
    receiptNumber: pickReceiptNumber(input.paidEncounters),
    date: new Date().toISOString(),
    patient: input.patient,
    lineItems,
    amountPaid: input.amountPaid - Math.max(0, amountLeft),
    remainingBalance: computeRemainingAfter(input),
    currency: input.currency || 'USD',
  };
}

function pickReceiptNumber(encounters: BillEncounter[]): string {
  const numbers = encounters
    .map((e) => e.billNumber)
    .filter((n): n is string => !!n);
  if (numbers.length > 0) {
    // Pick the lexicographically largest — billSequenceNumber on the web
    // is a monotonic integer-as-string, so max() gives the latest.
    return numbers.reduce((a, b) => (a > b ? a : b));
  }
  return `RCT-${Date.now().toString().slice(-6)}`;
}

// Re-export for callers that need the receipt shape locally.
export type { BillReceiptData, BillPatient };
