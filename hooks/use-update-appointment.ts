import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateAppointmentRequest } from '@/api/appointments';
import { DEMO_MODE } from '@/lib/mock-appointments';
import type {
  UpdateAppointmentRequest,
  UpdateAppointmentResponse,
} from '@/types/appointments';

export function useUpdateAppointment() {
  const queryClient = useQueryClient();

  return useMutation<UpdateAppointmentResponse, Error, UpdateAppointmentRequest>({
    mutationFn: async (payload) => {
      if (DEMO_MODE) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return { status: 'success', message: 'Appointment updated (demo).' };
      }
      return updateAppointmentRequest(payload);
    },
    onSuccess: (data) => {
      if (data.status === 'success') {
        queryClient.invalidateQueries({ queryKey: ['appointments', 'all-events'] });
      }
    },
  });
}
