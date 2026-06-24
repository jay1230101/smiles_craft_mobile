import { useMutation, useQueryClient } from '@tanstack/react-query';

import { recordPaymentRequest } from '@/api/billing';
import { DEMO_MODE } from '@/lib/mock-appointments';
import { applyMockPayment } from '@/lib/mock-billing';
import type { RecordPaymentInput, RecordPaymentResponse } from '@/types/billing';

// Backend route is not implemented yet — live calls will 404 until the
// clinic team ships POST /record-payment. The UI keeps the action disabled
// in non-demo builds and surfaces a "next backend update" notice; this
// hook still exists so the wiring is in place and the build is one route
// away from working end-to-end.
export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation<RecordPaymentResponse, Error, RecordPaymentInput>({
    mutationFn: async (payload) => {
      if (DEMO_MODE) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        return applyMockPayment(payload);
      }
      return recordPaymentRequest(payload);
    },
    onSuccess: (data, variables) => {
      if (data?.status === 'success') {
        queryClient.invalidateQueries({ queryKey: ['bills', 'current'] });
        queryClient.invalidateQueries({ queryKey: ['bills', 'detail', variables.patient_id] });
        queryClient.invalidateQueries({ queryKey: ['bills', 'history', variables.patient_id] });
      }
    },
  });
}
