import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteAppointmentRequest } from '@/api/appointments';
import { DEMO_MODE } from '@/lib/mock-appointments';
import type {
  DeleteAppointmentRequest,
  DeleteAppointmentResponse,
} from '@/types/appointments';

export function useDeleteAppointment() {
  const queryClient = useQueryClient();
  return useMutation<DeleteAppointmentResponse, Error, DeleteAppointmentRequest>({
    mutationFn: async (payload) => {
      if (DEMO_MODE) {
        return { status: 'deleted', message: 'Appointment deleted (demo mode)' };
      }
      return deleteAppointmentRequest(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['calendar'], exact: false });
    },
  });
}
