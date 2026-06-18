import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getPlanOfCareRequest, savePlanOfCareRequest } from '@/api/plan-of-care';
import { DEMO_MODE } from '@/lib/mock-appointments';
import { MOCK_PLAN_OF_CARE } from '@/lib/mock-orders';
import type {
  PlanOfCareItem,
  SavePlanOfCareRequest,
  SavePlanOfCareResponse,
} from '@/types/orders';

export function usePlanOfCareHistory(patientId: number | null) {
  return useQuery<PlanOfCareItem[]>({
    queryKey: ['plan-of-care', patientId],
    enabled: !!patientId,
    queryFn: async () => {
      if (DEMO_MODE) return MOCK_PLAN_OF_CARE;
      return getPlanOfCareRequest(patientId as number);
    },
    staleTime: 60 * 1000,
  });
}

export function useSavePlanOfCare() {
  const queryClient = useQueryClient();
  return useMutation<SavePlanOfCareResponse, Error, SavePlanOfCareRequest>({
    mutationFn: async (payload) => {
      if (DEMO_MODE) {
        return { status: 'success', message: 'Saved (demo mode)' };
      }
      return savePlanOfCareRequest(payload);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plan-of-care', variables.patientId] });
    },
  });
}
