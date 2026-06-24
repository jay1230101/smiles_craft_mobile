import { useQuery } from '@tanstack/react-query';

import { getPatientBillingRequest } from '@/api/billing';
import { DEMO_MODE } from '@/lib/mock-appointments';
import { getMockPatientBilling } from '@/lib/mock-billing';
import type { GetPatientBillingResponse } from '@/types/billing';

export function usePatientBilling(patientId: number | null) {
  return useQuery<GetPatientBillingResponse>({
    queryKey: ['bills', 'history', patientId],
    enabled: patientId !== null && patientId !== undefined,
    queryFn: async () => {
      if (DEMO_MODE) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return getMockPatientBilling(patientId as number);
      }
      return getPatientBillingRequest(patientId as number);
    },
    staleTime: 30 * 1000,
  });
}
