// /getReports returns the list of available reports for a clinic; report
// names come from the backend Reports table and currently are:
//   - "Income Statement"          → keyed in /reports response as "income_statement"
//   - "Revenue by Clinician"      → "revenue_clinician"
//   - "Cancellation by Reason"    → "cancellation"
// The data endpoint /reports?report=<id>&periods=<csv> returns a payload
// whose shape branches on the report kind. We model each branch and
// discriminate on the top-level `report` string at the consumer.

export type ReportKind = 'income_statement' | 'revenue_clinician' | 'cancellation';

export type ReportListEntry = {
  id: number;
  name: string;
};

export type GetReportsListResponse = ReportListEntry[];

export type Period = string; // 'YYYY-MM'

export type GetPeriodsResponse = Period[];

export type IncomeStatementRow = {
  period: Period;
  gross_revenue: number;
  total_discount: number;
  net_revenue: number;
  cogs: number;
  gross_profit: number;
  depreciation: number;
  total_expenses: number;
  expenses: Record<string, number>;
  net_profit: number;
};

export type RevenueByClinicianRow = {
  period: Period;
  provider_id: number;
  provider_name: string;
  gross_revenue: number;
  total_discount: number;
  net_revenue: number;
  provider_share_amount: number;
  clinic_share_amount: number;
};

export type CancellationRow = {
  period: Period;
  doctor_id: number;
  doctor_name: string;
  cancel_reason: string;
  reason_id: number;
  Total_cancellations: number;
};

export type ReportDataResponse =
  | { report: 'income_statement'; data: IncomeStatementRow[] }
  | { report: 'revenue_clinician'; data: RevenueByClinicianRow[] }
  | { report: 'cancellation'; data: CancellationRow[] };

export function kindFromReportName(name: string): ReportKind | null {
  const n = name.toLowerCase();
  if (n.includes('income')) return 'income_statement';
  if (n.includes('revenue')) return 'revenue_clinician';
  if (n.includes('cancellation')) return 'cancellation';
  return null;
}

export function formatPeriodLabel(period: Period): string {
  // 'YYYY-MM' → 'Month YYYY' (e.g. 'June 2026')
  const [y, m] = period.split('-');
  const monthIndex = Math.max(0, Math.min(11, Number(m) - 1));
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${monthNames[monthIndex]} ${y}`;
}
