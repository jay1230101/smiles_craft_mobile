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

const MOCK_REVENUE_PER_DOCTOR_PER_PERIOD: Record<Period, RevenueByClinicianRow[]> = {
  '2026-06': [
    { period: '2026-06', provider_id: 1, provider_name: 'Dr. Sarah Mitchell', gross_revenue: 9200, total_discount: 400, net_revenue: 8800, provider_share_amount: 3520, clinic_share_amount: 5280 },
    { period: '2026-06', provider_id: 2, provider_name: 'Dr. Charbel Diab', gross_revenue: 7800, total_discount: 500, net_revenue: 7300, provider_share_amount: 2920, clinic_share_amount: 4380 },
    { period: '2026-06', provider_id: 3, provider_name: 'Dr. James Parker', gross_revenue: 5100, total_discount: 200, net_revenue: 4900, provider_share_amount: 1960, clinic_share_amount: 2940 },
    { period: '2026-06', provider_id: 4, provider_name: 'Dr. Eli Shamlos', gross_revenue: 2400, total_discount: 100, net_revenue: 2300, provider_share_amount: 920, clinic_share_amount: 1380 },
  ],
  '2026-05': [
    { period: '2026-05', provider_id: 1, provider_name: 'Dr. Sarah Mitchell', gross_revenue: 8400, total_discount: 300, net_revenue: 8100, provider_share_amount: 3240, clinic_share_amount: 4860 },
    { period: '2026-05', provider_id: 2, provider_name: 'Dr. Charbel Diab', gross_revenue: 7200, total_discount: 400, net_revenue: 6800, provider_share_amount: 2720, clinic_share_amount: 4080 },
    { period: '2026-05', provider_id: 3, provider_name: 'Dr. James Parker', gross_revenue: 4600, total_discount: 150, net_revenue: 4450, provider_share_amount: 1780, clinic_share_amount: 2670 },
    { period: '2026-05', provider_id: 4, provider_name: 'Dr. Eli Shamlos', gross_revenue: 1900, total_discount: 50, net_revenue: 1850, provider_share_amount: 740, clinic_share_amount: 1110 },
  ],
  '2026-04': [
    { period: '2026-04', provider_id: 1, provider_name: 'Dr. Sarah Mitchell', gross_revenue: 7800, total_discount: 250, net_revenue: 7550, provider_share_amount: 3020, clinic_share_amount: 4530 },
    { period: '2026-04', provider_id: 2, provider_name: 'Dr. Charbel Diab', gross_revenue: 6400, total_discount: 300, net_revenue: 6100, provider_share_amount: 2440, clinic_share_amount: 3660 },
    { period: '2026-04', provider_id: 3, provider_name: 'Dr. James Parker', gross_revenue: 4100, total_discount: 150, net_revenue: 3950, provider_share_amount: 1580, clinic_share_amount: 2370 },
    { period: '2026-04', provider_id: 4, provider_name: 'Dr. Eli Shamlos', gross_revenue: 1500, total_discount: 50, net_revenue: 1450, provider_share_amount: 580, clinic_share_amount: 870 },
  ],
  '2026-03': [
    { period: '2026-03', provider_id: 1, provider_name: 'Dr. Sarah Mitchell', gross_revenue: 7200, total_discount: 200, net_revenue: 7000, provider_share_amount: 2800, clinic_share_amount: 4200 },
    { period: '2026-03', provider_id: 2, provider_name: 'Dr. Charbel Diab', gross_revenue: 5900, total_discount: 250, net_revenue: 5650, provider_share_amount: 2260, clinic_share_amount: 3390 },
    { period: '2026-03', provider_id: 3, provider_name: 'Dr. James Parker', gross_revenue: 3700, total_discount: 100, net_revenue: 3600, provider_share_amount: 1440, clinic_share_amount: 2160 },
    { period: '2026-03', provider_id: 4, provider_name: 'Dr. Eli Shamlos', gross_revenue: 1400, total_discount: 50, net_revenue: 1350, provider_share_amount: 540, clinic_share_amount: 810 },
  ],
  '2026-02': [
    { period: '2026-02', provider_id: 1, provider_name: 'Dr. Sarah Mitchell', gross_revenue: 6900, total_discount: 150, net_revenue: 6750, provider_share_amount: 2700, clinic_share_amount: 4050 },
    { period: '2026-02', provider_id: 2, provider_name: 'Dr. Charbel Diab', gross_revenue: 5800, total_discount: 200, net_revenue: 5600, provider_share_amount: 2240, clinic_share_amount: 3360 },
    { period: '2026-02', provider_id: 3, provider_name: 'Dr. James Parker', gross_revenue: 3500, total_discount: 100, net_revenue: 3400, provider_share_amount: 1360, clinic_share_amount: 2040 },
    { period: '2026-02', provider_id: 4, provider_name: 'Dr. Eli Shamlos', gross_revenue: 1300, total_discount: 50, net_revenue: 1250, provider_share_amount: 500, clinic_share_amount: 750 },
  ],
  '2026-01': [
    { period: '2026-01', provider_id: 1, provider_name: 'Dr. Sarah Mitchell', gross_revenue: 6500, total_discount: 100, net_revenue: 6400, provider_share_amount: 2560, clinic_share_amount: 3840 },
    { period: '2026-01', provider_id: 2, provider_name: 'Dr. Charbel Diab', gross_revenue: 5500, total_discount: 150, net_revenue: 5350, provider_share_amount: 2140, clinic_share_amount: 3210 },
    { period: '2026-01', provider_id: 3, provider_name: 'Dr. James Parker', gross_revenue: 3500, total_discount: 100, net_revenue: 3400, provider_share_amount: 1360, clinic_share_amount: 2040 },
    { period: '2026-01', provider_id: 4, provider_name: 'Dr. Eli Shamlos', gross_revenue: 1300, total_discount: 50, net_revenue: 1250, provider_share_amount: 500, clinic_share_amount: 750 },
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
