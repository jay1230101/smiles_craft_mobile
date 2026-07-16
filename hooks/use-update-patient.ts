import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updatePatientRequest } from '@/api/patients';
import { demoPatientStore } from '@/lib/demo-patient-store';
import { DEMO_MODE } from '@/lib/mock-appointments';
import type { UpdatePatientRequest, UpdatePatientResponse } from '@/types/patients';

export function useUpdatePatient() {
  const queryClient = useQueryClient();

  return useMutation<UpdatePatientResponse, Error, UpdatePatientRequest>({
    mutationFn: async (payload) => {
      if (DEMO_MODE) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const updated = demoPatientStore.update(payload.id, {
          name: payload.name,
          family: payload.family,
          dob: payload.dob,
          phone: payload.phone,
          gender: payload.gender,
          allergy: payload.allergy,
          doctor_id: payload.doctor,
        });
        if (!updated) {
          return { status: 'error', message: 'Patient not found.' };
        }
        return { status: 'success', message: 'Patient updated.' };
      }
      return updatePatientRequest(payload);
    },
    onSuccess: () => {
      // Broad key so the registered list AND any active search results refresh
      // (mirrors register/delete). The backend also emits `patientEdited`, which
      // invalidates the same key on every other logged-in device.
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}
