import { useMutation, useQueryClient } from '@tanstack/react-query';

import { recordPaymentRequest } from '@/api/billing';
import { DEMO_MODE } from '@/lib/mock-appointments';
import { applyMockPayment } from '@/lib/mock-billing';
import type { RecordPaymentInput, RecordPaymentResponse } from '@/types/billing';

// Cashier payment recording. Posts through to /treatment-plan with an
// empty inProcessStatus + procedures payload — same primitive the web
// app's BillDetails.jsx uses today, so no new backend route is required.
// Receipt is synthesized in the API layer from the bill detail context
// the screen already has on hand.
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
        // Clinic-wide All Unpaid Bills list — no bill socket event fires, so
        // without this the paid bill lingers as unpaid until staleTime lapses.
        queryClient.invalidateQueries({ queryKey: ['bills', 'pending'] });
      }
    },
  });
}
