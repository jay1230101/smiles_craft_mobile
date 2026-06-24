import { useQuery } from '@tanstack/react-query';

import { getReportsListRequest } from '@/api/reports';
import { DEMO_MODE } from '@/lib/mock-appointments';
import { MOCK_REPORTS_LIST } from '@/lib/mock-reports';
import type { GetReportsListResponse } from '@/types/reports';

export function useReportsList() {
  return useQuery<GetReportsListResponse>({
    queryKey: ['reports', 'list'],
    queryFn: async () => {
      if (DEMO_MODE) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        return MOCK_REPORTS_LIST;
      }
      return getReportsListRequest();
    },
    staleTime: 60 * 60 * 1000,
  });
}
