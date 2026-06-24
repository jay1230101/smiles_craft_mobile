import { useQuery } from '@tanstack/react-query';

import { getBillDetailRequest } from '@/api/billing';
import { DEMO_MODE } from '@/lib/mock-appointments';
import { getMockBillDetail } from '@/lib/mock-billing';
import type { GetBillDetailResponse } from '@/types/billing';

export function useBillDetail(patientId: number | null) {
  return useQuery<GetBillDetailResponse>({
    queryKey: ['bills', 'detail', patientId],
    enabled: patientId !== null && patientId !== undefined,
    queryFn: async () => {
      if (DEMO_MODE) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return getMockBillDetail(patientId as number);
      }
      return getBillDetailRequest(patientId as number);
    },
    staleTime: 30 * 1000,
  });
}
