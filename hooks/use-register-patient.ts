import { useMutation, useQueryClient } from '@tanstack/react-query';

import { registerPatientRequest } from '@/api/patients';
import { DEMO_MODE } from '@/lib/mock-appointments';
import type { RegisterPatientRequest, RegisterPatientResponse } from '@/types/patients';

export function useRegisterPatient() {
  const queryClient = useQueryClient();

  return useMutation<RegisterPatientResponse, Error, RegisterPatientRequest>({
    mutationFn: async (payload) => {
      if (DEMO_MODE) {
        // Simulate a brief network hop and always return success in demo mode.
        await new Promise((resolve) => setTimeout(resolve, 400));
        return { status: 200, message: 'Patient registered (demo).' };
      }
      return registerPatientRequest(payload);
    },
    onSuccess: (data) => {
      if (data.status === 200) {
        queryClient.invalidateQueries({ queryKey: ['patients'] });
      }
    },
  });
}
