import { toNumber } from '@/lib/num';
import { apiClient } from './client';
import { endpoints } from './endpoints';
import type {
  GetPeriodsResponse,
  GetReportsListResponse,
  Period,
  ReportDataResponse,
} from '@/types/reports';

function normalizeReportData(payload: ReportDataResponse): ReportDataResponse {
  if (!payload || !Array.isArray(payload.data)) return payload;
  if (payload.report === 'income_statement') {
    return {
      report: 'income_statement',
      data: payload.data.map((row: any) => ({
        period: String(row.period),
        gross_revenue: toNumber(row.gross_revenue),
        total_discount: toNumber(row.total_discount),
        net_revenue: toNumber(row.net_revenue),
        cogs: toNumber(row.cogs),
        gross_profit: toNumber(row.gross_profit),
        depreciation: toNumber(row.depreciation),
        total_expenses: toNumber(row.total_expenses),
        expenses:
          row.expenses && typeof row.expenses === 'object'
            ? Object.fromEntries(
                Object.entries(row.expenses).map(([k, v]) => [k, toNumber(v)]),
              )
            : {},
        net_profit: toNumber(row.net_profit),
      })),
    };
  }
  if (payload.report === 'revenue_clinician') {
    return {
      report: 'revenue_clinician',
      data: payload.data.map((row: any) => ({
        period: String(row.period),
        provider_id: toNumber(row.provider_id),
        provider_name: row.provider_name ?? '',
        gross_revenue: toNumber(row.gross_revenue),
        clinic_share: toNumber(row.clinic_share),
        provider_share: toNumber(row.provider_share),
        total_appointments: toNumber(row.total_appointments),
        confirmed: toNumber(row.confirmed),
        cancelled: toNumber(row.cancelled),
        unconfirmed: toNumber(row.unconfirmed),
      })),
    };
  }
  if (payload.report === 'cancellation') {
    return {
      report: 'cancellation',
      data: payload.data.map((row: any) => ({
        period: String(row.period),
        doctor_id: toNumber(row.doctor_id),
        doctor_name: row.doctor_name ?? '',
        cancel_reason: row.cancel_reason ?? '',
        reason_id: toNumber(row.reason_id),
        Total_cancellations: toNumber(row.Total_cancellations),
      })),
    };
  }
  return payload;
}

export async function getReportsListRequest(): Promise<GetReportsListResponse> {
  console.log('[reports] GET', endpoints.reports.list);
  try {
    const { data } = await apiClient.get<GetReportsListResponse>(endpoints.reports.list);
    console.log('[reports] list response', Array.isArray(data) ? `array(${data.length})` : typeof data);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.log('[reports] list ERROR', err);
    throw err;
  }
}

export async function getPeriodsRequest(): Promise<GetPeriodsResponse> {
  console.log('[reports] GET', endpoints.reports.periods);
  try {
    const { data } = await apiClient.get<GetPeriodsResponse>(endpoints.reports.periods);
    console.log('[reports] periods response', Array.isArray(data) ? `array(${data.length})` : typeof data);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.log('[reports] periods ERROR', err);
    throw err;
  }
}

// reportId comes from the /getReports list endpoint; periods is a CSV of
// YYYY-MM strings (omit/empty = all periods).
export async function getReportDataRequest(
  reportId: number,
  periods: Period[] = [],
): Promise<ReportDataResponse> {
  const params: Record<string, string> = { report: String(reportId) };
  if (periods.length > 0) params.periods = periods.join(',');
  console.log('[reports] GET', endpoints.reports.data, params);
  try {
    const { data } = await apiClient.get<ReportDataResponse>(endpoints.reports.data, { params });
    console.log('[reports] data response', data?.report, `rows=${data?.data?.length ?? 0}`);
    return normalizeReportData(data);
  } catch (err) {
    console.log('[reports] data ERROR', err);
    throw err;
  }
}
