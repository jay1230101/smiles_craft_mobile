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
    onSuccess: async (data) => {
      if (data.status === 'success') {
        // refetchQueries (not invalidateQueries) — by the time this success
        // handler fires, the calendar is usually behind a modal stack and
        // not actively observed. invalidate only refetches *active*
        // queries by default, so the cache stays stale until the user
        // returns to the tab; the new start/end time wouldn't appear
        // until the next focus refetch. Force the refetch so the cache
        // is fresh by the time the user pops the modal.
        await queryClient.refetchQueries({ queryKey: ['appointments', 'all-events'] });
      }
    },
  });
}
