import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deletePatientRequest } from '@/api/patients';
import { demoPatientStore } from '@/lib/demo-patient-store';
import { DEMO_MODE } from '@/lib/mock-appointments';
import type { DeletePatientRequest, DeletePatientResponse } from '@/types/patients';

export function useDeletePatient() {
  const queryClient = useQueryClient();

  return useMutation<DeletePatientResponse, Error, DeletePatientRequest>({
    mutationFn: async (payload) => {
      if (DEMO_MODE) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const removed = demoPatientStore.remove(payload.id);
        if (!removed) {
          return { status: 'error', message: 'Patient not found.' };
        }
        return { status: 'success', message: 'Patient deleted.' };
      }
      return deletePatientRequest(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients', 'list'] });
    },
  });
}
