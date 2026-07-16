import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deletePatientRequest } from '@/api/patients';
import { demoPatientStore } from '@/lib/demo-patient-store';
import { DEMO_MODE } from '@/lib/mock-appointments';
import type { DeletePatientRequest, DeletePatientResult } from '@/types/patients';

export function useDeletePatient() {
  const queryClient = useQueryClient();

  return useMutation<DeletePatientResult, Error, DeletePatientRequest>({
    mutationFn: async (payload) => {
      if (DEMO_MODE) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const removed = demoPatientStore.remove(payload.id);
        return removed
          ? { ok: true, message: 'Patient deleted.' }
          : { ok: false, message: 'Patient not found.' };
      }
      return deletePatientRequest(payload);
    },
    onSuccess: (result) => {
      // Only refresh the list when a row was actually removed. A blocked
      // delete (patient still has linked records) returns ok:false with the
      // data unchanged, so there's nothing to refetch.
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: ['patients'] });
      }
    },
  });
}
