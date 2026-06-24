import { useQuery } from '@tanstack/react-query';

import { getCurrentBillsRequest } from '@/api/billing';
import { DEMO_MODE } from '@/lib/mock-appointments';
import { MOCK_CURRENT_BILLS } from '@/lib/mock-billing';
import type { GetCurrentBillsResponse } from '@/types/billing';

export function useCurrentBills() {
  return useQuery<GetCurrentBillsResponse>({
    queryKey: ['bills', 'current'],
    queryFn: async () => {
      if (DEMO_MODE) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return MOCK_CURRENT_BILLS;
      }
      return getCurrentBillsRequest();
    },
    staleTime: 60 * 1000,
  });
}
