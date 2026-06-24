import { useQuery } from '@tanstack/react-query';

import { getPeriodsRequest } from '@/api/reports';
import { DEMO_MODE } from '@/lib/mock-appointments';
import { MOCK_PERIODS } from '@/lib/mock-reports';
import type { GetPeriodsResponse } from '@/types/reports';

export function usePeriods() {
  return useQuery<GetPeriodsResponse>({
    queryKey: ['reports', 'periods'],
    queryFn: async () => {
      if (DEMO_MODE) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        return MOCK_PERIODS;
      }
      return getPeriodsRequest();
    },
    staleTime: 5 * 60 * 1000,
  });
}
