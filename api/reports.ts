import { apiClient } from './client';
import { endpoints } from './endpoints';
import type {
  GetPeriodsResponse,
  GetReportsListResponse,
  Period,
  ReportDataResponse,
} from '@/types/reports';

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
    return data;
  } catch (err) {
    console.log('[reports] data ERROR', err);
    throw err;
  }
}
