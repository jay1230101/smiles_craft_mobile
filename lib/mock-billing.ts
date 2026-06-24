import type {
  BillEncounter,
  BillReceiptData,
  CurrentBillEntry,
  GetBillDetailResponse,
  GetPatientBillingResponse,
  RecordPaymentInput,
  RecordPaymentResponse,
} from '@/types/billing';

export const MOCK_CURRENT_BILLS: CurrentBillEntry[] = [
  { patientId: 101, name: 'Johny', father: 'Pierre', family: 'Achkar' },
  { patientId: 102, name: 'Mark', father: 'Antoine', family: 'Eli' },
  { patientId: 103, name: 'Marina', father: 'Joseph', family: 'Elon' },
  { patientId: 104, name: 'Yara', father: 'Naji', family: 'Khoury' },
  { patientId: 105, name: 'Rami', father: 'Elias', family: 'Saliba' },
];

// In-memory store so demo payments persist across re-fetches in the same
// session — keeps the demo flow feeling real (record payment, see balance
// drop, see receipt). Resets on app reload.
const mockBillEncountersByPatient: Record<number, BillEncounter[]> = {
  101: [
    {
      id: 9001,
      billNumber: 'BL-1042',
      procedure: 'Composite Filling',
      toothNumber: '#26',
      fees: 180,
      discount: 0,
      netPrice: 180,
      previousPayment: 0,
      remainingBalance: 180,
      doctor: 'Dr. Sarah Mitchell',
      status: 'completed',
      date: '24 JUNE,2026',
    },
    {
      id: 9002,
      billNumber: 'BL-1042',
      procedure: 'X-Ray (Periapical)',
      toothNumber: '#26',
      fees: 45,
      discount: 0,
      netPrice: 45,
      previousPayment: 0,
      remainingBalance: 45,
      doctor: 'Dr. Sarah Mitchell',
      status: 'completed',
      date: '24 JUNE,2026',
    },
  ],
  102: [
    {
      id: 9101,
      billNumber: 'BL-1043',
      procedure: 'Root Canal Treatment',
      toothNumber: '#36',
      fees: 650,
      discount: 50,
      netPrice: 600,
      previousPayment: 200,
      remainingBalance: 400,
      doctor: 'Dr. Charbel Diab',
      status: 'in_progress',
      date: '23 JUNE,2026',
    },
  ],
  103: [
    {
      id: 9201,
      billNumber: 'BL-1044',
      procedure: 'Dental Cleaning',
      toothNumber: 'full mouth',
      fees: 120,
      discount: 0,
      netPrice: 120,
      previousPayment: 0,
      remainingBalance: 120,
      doctor: 'Dr. Sarah Mitchell',
      status: 'completed',
      date: '24 JUNE,2026',
    },
    {
      id: 9202,
      billNumber: 'BL-1044',
      procedure: 'Fluoride Application',
      toothNumber: 'full mouth',
      fees: 35,
      discount: 0,
      netPrice: 35,
      previousPayment: 0,
      remainingBalance: 35,
      doctor: 'Dr. Sarah Mitchell',
      status: 'completed',
      date: '24 JUNE,2026',
    },
  ],
  104: [
    {
      id: 9301,
      billNumber: 'BL-1045',
      procedure: 'Crown Placement',
      toothNumber: '#14',
      fees: 850,
      discount: 100,
      netPrice: 750,
      previousPayment: 350,
      remainingBalance: 400,
      doctor: 'Dr. James Parker',
      status: 'completed',
      date: '22 JUNE,2026',
    },
  ],
  105: [
    {
      id: 9401,
      billNumber: 'BL-1046',
      procedure: 'Wisdom Tooth Extraction',
      toothNumber: '#48',
      fees: 320,
      discount: 0,
      netPrice: 320,
      previousPayment: 0,
      remainingBalance: 320,
      doctor: 'Dr. Eli Shamlos',
      status: 'completed',
      date: '24 JUNE,2026',
    },
  ],
};

const mockPatients: Record<number, { id: number; name: string; family: string; phone: string }> = {
  101: { id: 101, name: 'Johny', family: 'Achkar', phone: '+961 71 555 263' },
  102: { id: 102, name: 'Mark', family: 'Eli', phone: '+961 70 675 765' },
  103: { id: 103, name: 'Marina', family: 'Elon', phone: '+961 81 876 263' },
  104: { id: 104, name: 'Yara', family: 'Khoury', phone: '+961 76 123 456' },
  105: { id: 105, name: 'Rami', family: 'Saliba', phone: '+961 79 987 654' },
};

function computeTotals(encounters: BillEncounter[]) {
  const totalBill = encounters.reduce((s, e) => s + e.netPrice, 0);
  const totalPreviousPayment = encounters.reduce((s, e) => s + e.previousPayment, 0);
  const totalRemainingBalance = encounters.reduce((s, e) => s + e.remainingBalance, 0);
  const latest = encounters[0];
  return {
    totalBill,
    totalPreviousPayment,
    totalRemainingBalance,
    latestBillNumber: latest?.billNumber ?? null,
    latestBillDate: latest?.date ?? null,
  };
}

export function getMockBillDetail(patientId: number): GetBillDetailResponse {
  const encounters = mockBillEncountersByPatient[patientId] ?? [];
  const patient = mockPatients[patientId] ?? {
    id: patientId,
    name: 'Unknown',
    family: '',
    phone: '',
  };
  return {
    patient,
    encounters,
    totals: computeTotals(encounters),
    status: encounters.length > 0 ? 'success' : 'idle',
    message: encounters.length > 0 ? null : 'Patient has no outstanding balance!',
  };
}

export function getMockPatientBilling(patientId: number): GetPatientBillingResponse {
  const encounters = mockBillEncountersByPatient[patientId] ?? [];
  return {
    status: 'success',
    message: encounters.length > 0 ? null : 'Patient has no outstanding balance!',
    total_balance: encounters.reduce((s, e) => s + e.remainingBalance, 0),
    procedures: encounters.map((e) => ({
      id: e.id,
      procedure: e.procedure,
      status: e.status,
      status_date: e.date,
      fees: e.fees,
      net_price: e.netPrice,
      discount: e.discount,
      amount_paid: e.previousPayment,
      remaining_balance: e.remainingBalance,
      provider: e.doctor,
      currency: 'USD',
      bill_number: e.billNumber,
    })),
  };
}

// Apply payment to the in-memory mock store so the demo behaves like a
// real recording — balance drops, receipt reflects the new state.
export function applyMockPayment(input: RecordPaymentInput): RecordPaymentResponse {
  const encounters = mockBillEncountersByPatient[input.patient_id];
  if (!encounters || encounters.length === 0) {
    return { status: 'error', message: 'No outstanding bills for this patient.' };
  }
  let remaining = input.amountPaid;
  const lineItems: BillReceiptData['lineItems'] = [];
  for (const enc of encounters) {
    if (remaining <= 0) break;
    if (!input.billID.includes(enc.id)) continue;
    const applied = Math.min(enc.remainingBalance, remaining);
    enc.previousPayment += applied;
    enc.remainingBalance -= applied;
    remaining -= applied;
    lineItems.push({
      procedure: enc.procedure,
      toothNumber: enc.toothNumber,
      amount: applied,
    });
  }
  const patient = mockPatients[input.patient_id];
  const newRemaining = encounters.reduce((s, e) => s + e.remainingBalance, 0);
  return {
    status: 'success',
    remaining_balance: newRemaining,
    receipt: {
      receiptNumber: `RCT-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString(),
      patient: patient ?? { id: input.patient_id, name: '', family: '', phone: '' },
      lineItems,
      amountPaid: input.amountPaid - remaining,
      remainingBalance: newRemaining,
      currency: 'USD',
    },
  };
}
