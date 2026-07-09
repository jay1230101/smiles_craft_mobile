import type {
  CancellationRow,
  GetReportsListResponse,
  IncomeStatementRow,
  Period,
  ReportDataResponse,
  RevenueByClinicianRow,
} from '@/types/reports';

export const MOCK_REPORTS_LIST: GetReportsListResponse = [
  { id: 1, name: 'Income Statement' },
  { id: 2, name: 'Revenue by Clinician' },
  { id: 3, name: 'Cancellation by Reason' },
];

export const MOCK_PERIODS: Period[] = ['2026-06', '2026-05', '2026-04', '2026-03', '2026-02', '2026-01'];

const MOCK_INCOME_BY_PERIOD: Record<Period, IncomeStatementRow> = {
  '2026-06': {
    period: '2026-06',
    gross_revenue: 24500,
    total_discount: 1200,
    net_revenue: 23300,
    cogs: 4800,
    gross_profit: 18500,
    depreciation: 600,
    total_expenses: 5400,
    expenses: { Rent: 2400, Utilities: 800, Salaries: 2200 },
    net_profit: 12500,
  },
  '2026-05': {
    period: '2026-05',
    gross_revenue: 22100,
    total_discount: 900,
    net_revenue: 21200,
    cogs: 4200,
    gross_profit: 17000,
    depreciation: 600,
    total_expenses: 5300,
    expenses: { Rent: 2400, Utilities: 750, Salaries: 2150 },
    net_profit: 11100,
  },
  '2026-04': {
    period: '2026-04',
    gross_revenue: 19800,
    total_discount: 750,
    net_revenue: 19050,
    cogs: 3900,
    gross_profit: 15150,
    depreciation: 600,
    total_expenses: 5100,
    expenses: { Rent: 2400, Utilities: 700, Salaries: 2000 },
    net_profit: 9450,
  },
  '2026-03': {
    period: '2026-03',
    gross_revenue: 18200,
    total_discount: 600,
    net_revenue: 17600,
    cogs: 3700,
    gross_profit: 13900,
    depreciation: 600,
    total_expenses: 5000,
    expenses: { Rent: 2400, Utilities: 650, Salaries: 1950 },
    net_profit: 8300,
  },
  '2026-02': {
    period: '2026-02',
    gross_revenue: 17500,
    total_discount: 500,
    net_revenue: 17000,
    cogs: 3500,
    gross_profit: 13500,
    depreciation: 600,
    total_expenses: 4900,
    expenses: { Rent: 2400, Utilities: 600, Salaries: 1900 },
    net_profit: 8000,
  },
  '2026-01': {
    period: '2026-01',
    gross_revenue: 16800,
    total_discount: 400,
    net_revenue: 16400,
    cogs: 3300,
    gross_profit: 13100,
    depreciation: 600,
    total_expenses: 4800,
    expenses: { Rent: 2400, Utilities: 550, Salaries: 1850 },
    net_profit: 7700,
  },
};

// Shape matches views.py:get_revenue_clinician — gross_revenue, clinic_share,
// provider_share, plus per-provider booking counts. No net_revenue or
// discount on this report.
function revRow(
  period: Period,
  provider_id: number,
  provider_name: string,
  gross: number,
  providerPct: number,
  bookings: [total: number, confirmed: number, cancelled: number, unconfirmed: number],
): RevenueByClinicianRow {
  const provider_share = Math.round(gross * providerPct);
  return {
    period,
    provider_id,
    provider_name,
    gross_revenue: gross,
    clinic_share: gross - provider_share,
    provider_share,
    total_appointments: bookings[0],
    confirmed: bookings[1],
    cancelled: bookings[2],
    unconfirmed: bookings[3],
  };
}

const MOCK_REVENUE_PER_DOCTOR_PER_PERIOD: Record<Period, RevenueByClinicianRow[]> = {
  '2026-06': [
    revRow('2026-06', 1, 'Dr. Sarah Mitchell', 9200, 0.4, [24, 20, 2, 2]),
    revRow('2026-06', 2, 'Dr. Charbel Diab', 7800, 0.4, [18, 15, 2, 1]),
    revRow('2026-06', 3, 'Dr. James Parker', 5100, 0.4, [12, 10, 1, 1]),
    revRow('2026-06', 4, 'Dr. Eli Shamlos', 2400, 0.4, [6, 5, 0, 1]),
  ],
  '2026-05': [
    revRow('2026-05', 1, 'Dr. Sarah Mitchell', 8400, 0.4, [22, 19, 2, 1]),
    revRow('2026-05', 2, 'Dr. Charbel Diab', 7200, 0.4, [17, 14, 2, 1]),
    revRow('2026-05', 3, 'Dr. James Parker', 4600, 0.4, [11, 9, 1, 1]),
    revRow('2026-05', 4, 'Dr. Eli Shamlos', 1900, 0.4, [5, 4, 0, 1]),
  ],
  '2026-04': [
    revRow('2026-04', 1, 'Dr. Sarah Mitchell', 7800, 0.4, [21, 18, 2, 1]),
    revRow('2026-04', 2, 'Dr. Charbel Diab', 6400, 0.4, [15, 13, 1, 1]),
    revRow('2026-04', 3, 'Dr. James Parker', 4100, 0.4, [10, 8, 1, 1]),
    revRow('2026-04', 4, 'Dr. Eli Shamlos', 1500, 0.4, [4, 3, 0, 1]),
  ],
  '2026-03': [
    revRow('2026-03', 1, 'Dr. Sarah Mitchell', 7200, 0.4, [19, 17, 1, 1]),
    revRow('2026-03', 2, 'Dr. Charbel Diab', 5900, 0.4, [14, 12, 1, 1]),
    revRow('2026-03', 3, 'Dr. James Parker', 3700, 0.4, [9, 8, 0, 1]),
    revRow('2026-03', 4, 'Dr. Eli Shamlos', 1400, 0.4, [4, 3, 0, 1]),
  ],
  '2026-02': [
    revRow('2026-02', 1, 'Dr. Sarah Mitchell', 6900, 0.4, [18, 16, 1, 1]),
    revRow('2026-02', 2, 'Dr. Charbel Diab', 5800, 0.4, [14, 12, 1, 1]),
    revRow('2026-02', 3, 'Dr. James Parker', 3500, 0.4, [9, 7, 1, 1]),
    revRow('2026-02', 4, 'Dr. Eli Shamlos', 1300, 0.4, [4, 3, 0, 1]),
  ],
  '2026-01': [
    revRow('2026-01', 1, 'Dr. Sarah Mitchell', 6500, 0.4, [17, 15, 1, 1]),
    revRow('2026-01', 2, 'Dr. Charbel Diab', 5500, 0.4, [13, 11, 1, 1]),
    revRow('2026-01', 3, 'Dr. James Parker', 3500, 0.4, [9, 7, 1, 1]),
    revRow('2026-01', 4, 'Dr. Eli Shamlos', 1300, 0.4, [4, 3, 0, 1]),
  ],
};

const MOCK_CANCELLATIONS_PER_PERIOD: Record<Period, CancellationRow[]> = {
  '2026-06': [
    { period: '2026-06', doctor_id: 1, doctor_name: 'Dr. Sarah Mitchell', cancel_reason: 'Patient feeling unwell', reason_id: 1, Total_cancellations: 4 },
    { period: '2026-06', doctor_id: 1, doctor_name: 'Dr. Sarah Mitchell', cancel_reason: 'Patient no-show', reason_id: 2, Total_cancellations: 3 },
    { period: '2026-06', doctor_id: 2, doctor_name: 'Dr. Charbel Diab', cancel_reason: 'Schedule conflict', reason_id: 3, Total_cancellations: 5 },
    { period: '2026-06', doctor_id: 3, doctor_name: 'Dr. James Parker', cancel_reason: 'Patient feeling unwell', reason_id: 1, Total_cancellations: 2 },
  ],
  '2026-05': [
    { period: '2026-05', doctor_id: 1, doctor_name: 'Dr. Sarah Mitchell', cancel_reason: 'Patient feeling unwell', reason_id: 1, Total_cancellations: 3 },
    { period: '2026-05', doctor_id: 2, doctor_name: 'Dr. Charbel Diab', cancel_reason: 'Schedule conflict', reason_id: 3, Total_cancellations: 4 },
    { period: '2026-05', doctor_id: 4, doctor_name: 'Dr. Eli Shamlos', cancel_reason: 'Patient no-show', reason_id: 2, Total_cancellations: 2 },
  ],
  '2026-04': [
    { period: '2026-04', doctor_id: 1, doctor_name: 'Dr. Sarah Mitchell', cancel_reason: 'Patient feeling unwell', reason_id: 1, Total_cancellations: 2 },
    { period: '2026-04', doctor_id: 2, doctor_name: 'Dr. Charbel Diab', cancel_reason: 'Patient no-show', reason_id: 2, Total_cancellations: 3 },
  ],
  '2026-03': [
    { period: '2026-03', doctor_id: 1, doctor_name: 'Dr. Sarah Mitchell', cancel_reason: 'Schedule conflict', reason_id: 3, Total_cancellations: 3 },
    { period: '2026-03', doctor_id: 3, doctor_name: 'Dr. James Parker', cancel_reason: 'Patient no-show', reason_id: 2, Total_cancellations: 2 },
  ],
  '2026-02': [
    { period: '2026-02', doctor_id: 2, doctor_name: 'Dr. Charbel Diab', cancel_reason: 'Patient feeling unwell', reason_id: 1, Total_cancellations: 2 },
    { period: '2026-02', doctor_id: 4, doctor_name: 'Dr. Eli Shamlos', cancel_reason: 'Schedule conflict', reason_id: 3, Total_cancellations: 1 },
  ],
  '2026-01': [
    { period: '2026-01', doctor_id: 1, doctor_name: 'Dr. Sarah Mitchell', cancel_reason: 'Patient no-show', reason_id: 2, Total_cancellations: 2 },
  ],
};

function applyPeriodFilter<T extends { period: Period }>(rows: T[], periods: Period[]): T[] {
  if (periods.length === 0) return rows;
  const set = new Set(periods);
  return rows.filter((r) => set.has(r.period));
}

export function getMockReportData(reportId: number, periods: Period[]): ReportDataResponse {
  if (reportId === 1) {
    const rows = Object.values(MOCK_INCOME_BY_PERIOD);
    return { report: 'income_statement', data: applyPeriodFilter(rows, periods) };
  }
  if (reportId === 2) {
    const rows = Object.values(MOCK_REVENUE_PER_DOCTOR_PER_PERIOD).flat();
    return { report: 'revenue_clinician', data: applyPeriodFilter(rows, periods) };
  }
  if (reportId === 3) {
    const rows = Object.values(MOCK_CANCELLATIONS_PER_PERIOD).flat();
    return { report: 'cancellation', data: applyPeriodFilter(rows, periods) };
  }
  return { report: 'income_statement', data: [] };
}
