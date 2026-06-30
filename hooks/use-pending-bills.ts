import { useQuery } from '@tanstack/react-query';

import { getPendingBillsRequest } from '@/api/billing';
import { DEMO_MODE } from '@/lib/mock-appointments';
import { getMockPendingBills } from '@/lib/mock-billing';
import type { GetPendingBillsResponse } from '@/types/billing';

// /getPendingBills returns every clinic-wide encounter with an outstanding
// balance, regardless of date. Used by the All Unpaid Bills screen — the
// today-only view is /getCurrentBills via useCurrentBills().
export function usePendingBills() {
  return useQuery<GetPendingBillsResponse>({
    queryKey: ['bills', 'pending'],
    queryFn: async () => {
      if (DEMO_MODE) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return getMockPendingBills();
      }
      return getPendingBillsRequest();
    },
    staleTime: 60 * 1000,
  });
}
