import { useMutation, useQueryClient } from '@tanstack/react-query';

import { submitTreatmentPlanRequest } from '@/api/orders';
import { DEMO_MODE } from '@/lib/mock-appointments';
import type { TreatmentPlanRequest, TreatmentPlanResponse } from '@/types/orders';

export function useSubmitTreatmentPlan() {
  const queryClient = useQueryClient();
  return useMutation<TreatmentPlanResponse, Error, TreatmentPlanRequest>({
    mutationFn: async (payload) => {
      if (DEMO_MODE) {
        return { status: 'success', message: 'Saved (demo mode)' };
      }
      return submitTreatmentPlanRequest(payload);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['orders', 'pending', variables.patient_id],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: ['orders', 'visits', variables.patient_id],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: ['bills'], exact: false });
    },
  });
}
