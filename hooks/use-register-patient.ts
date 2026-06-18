import { useMutation, useQueryClient } from '@tanstack/react-query';

import { registerPatientRequest } from '@/api/patients';
import { demoPatientStore } from '@/lib/demo-patient-store';
import { DEMO_MODE } from '@/lib/mock-appointments';
import type { RegisterPatientRequest, RegisterPatientResponse } from '@/types/patients';

export function useRegisterPatient() {
  const queryClient = useQueryClient();

  return useMutation<RegisterPatientResponse, Error, RegisterPatientRequest>({
    mutationFn: async (payload) => {
      if (DEMO_MODE) {
        // Simulate a brief network hop and persist the patient in the demo
        // store so the list view reflects the new entry.
        await new Promise((resolve) => setTimeout(resolve, 400));
        demoPatientStore.add({
          name: payload.name,
          family: payload.family,
          dob: payload.dob,
          phone: payload.phone,
          gender: payload.gender,
          allergy: payload.allergy,
          doctor_id: payload.doctor,
          doctor_name: 'Dr Emily Chen',
        });
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
