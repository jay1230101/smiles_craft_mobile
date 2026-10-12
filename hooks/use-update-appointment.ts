import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateAppointmentRequest } from '@/api/appointments';
import { DEMO_MODE } from '@/lib/mock-appointments';
import type {
  BackendEvent,
  UpdateAppointmentRequest,
  UpdateAppointmentResponse,
} from '@/types/appointments';

const EVENTS_KEY = ['appointments', 'all-events'] as const;

type MutationContext = { previous?: BackendEvent[] };

export function useUpdateAppointment() {
  const queryClient = useQueryClient();

  return useMutation<UpdateAppointmentResponse, Error, UpdateAppointmentRequest, MutationContext>({
    mutationFn: async (payload) => {
      if (DEMO_MODE) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return { status: 'success', message: 'Appointment updated (demo).' };
      }
      return updateAppointmentRequest(payload);
    },
    // Optimistically move the appointment to its new time/date in the cache so
    // it jumps to the new slot instantly. Without this the calendar only
    // updated after the onSuccess refetch of ALL events — a 1-2s network
    // round-trip — which looked like a lag when rescheduling. The onSuccess
    // refetch still runs afterwards to reconcile with server truth.
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: EVENTS_KEY });
      const previous = queryClient.getQueryData<BackendEvent[]>(EVENTS_KEY);
      if (previous) {
        queryClient.setQueryData<BackendEvent[]>(EVENTS_KEY, (old) =>
          (old ?? []).map((e) =>
            String(e.id) === String(payload.eventId)
              ? {
                  ...e,
                  start: payload.start_iso,
                  end: payload.end_iso,
                  visit_date: payload.date,
                }
              : e,
          ),
        );
      }
      return { previous };
    },
    onError: (_err, _payload, context) => {
      // Roll back the optimistic move if the update failed.
      if (context?.previous) {
        queryClient.setQueryData(EVENTS_KEY, context.previous);
      }
    },
    onSuccess: async (data) => {
      if (data.status === 'success') {
        // Reconcile with the server. refetchQueries (not invalidateQueries) —
        // by the time this fires the calendar is often behind a modal stack
        // and not actively observed, and invalidate only refetches *active*
        // queries, so force the refetch to keep the cache fresh.
        await queryClient.refetchQueries({ queryKey: EVENTS_KEY });
      }
    },
  });
}
