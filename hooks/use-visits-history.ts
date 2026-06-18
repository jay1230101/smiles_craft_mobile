import { useQuery } from '@tanstack/react-query';

import { getVisitsHistoryRequest } from '@/api/orders';
import { DEMO_MODE } from '@/lib/mock-appointments';
import { MOCK_VISITS_HISTORY } from '@/lib/mock-orders';
import type { VisitsHistoryItem } from '@/types/orders';

export function useVisitsHistory(patientId: number | null) {
  return useQuery<VisitsHistoryItem[]>({
    queryKey: ['orders', 'visits', patientId],
    enabled: !!patientId,
    queryFn: async () => {
      if (DEMO_MODE) {
        return MOCK_VISITS_HISTORY;
      }
      const res = await getVisitsHistoryRequest(patientId as number);
      return Array.isArray(res?.data) ? res.data : [];
    },
    staleTime: 60 * 1000,
  });
}
