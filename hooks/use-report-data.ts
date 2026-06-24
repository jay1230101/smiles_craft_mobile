import { useQuery } from '@tanstack/react-query';

import { getReportDataRequest } from '@/api/reports';
import { DEMO_MODE } from '@/lib/mock-appointments';
import { getMockReportData } from '@/lib/mock-reports';
import type { Period, ReportDataResponse } from '@/types/reports';

export function useReportData(reportId: number | null, periods: Period[]) {
  return useQuery<ReportDataResponse>({
    queryKey: ['reports', 'data', reportId, periods.join(',')],
    enabled: reportId !== null && reportId !== undefined,
    queryFn: async () => {
      if (DEMO_MODE) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        return getMockReportData(reportId as number, periods);
      }
      return getReportDataRequest(reportId as number, periods);
    },
    staleTime: 60 * 1000,
  });
}
