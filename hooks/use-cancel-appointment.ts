import { useMutation, useQueryClient } from '@tanstack/react-query';

import { cancelAppointmentRequest } from '@/api/cancellations';
import { DEMO_MODE } from '@/lib/mock-appointments';
import type { CancelApptRequest, CancelApptResponse } from '@/types/cancellations';

export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation<CancelApptResponse, Error, CancelApptRequest>({
    mutationFn: async (payload) => {
      if (DEMO_MODE) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        return { status: 'success', message: 'Appointment cancelled (demo).' };
      }
      return cancelAppointmentRequest(payload);
    },
    onSuccess: (data) => {
      if (data.status === 'success') {
        queryClient.invalidateQueries({ queryKey: ['appointments', 'all-events'] });
      }
    },
  });
}
