import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createAppointmentRequest } from '@/api/appointments';
import { DEMO_MODE } from '@/lib/mock-appointments';
import type {
  CreateAppointmentRequest,
  CreateAppointmentResponse,
} from '@/types/appointments';

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation<CreateAppointmentResponse, Error, CreateAppointmentRequest>({
    mutationFn: async (payload) => {
      if (DEMO_MODE) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        return { status: 'success', message: 'Appointment booked (demo).' };
      }
      return createAppointmentRequest(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false });
    },
  });
}
