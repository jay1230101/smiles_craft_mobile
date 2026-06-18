import { useQuery } from '@tanstack/react-query';

import { getPatientsRequest } from '@/api/patients';
import { demoPatientStore } from '@/lib/demo-patient-store';
import { DEMO_MODE } from '@/lib/mock-appointments';
import type { PatientListItem } from '@/types/patients';

export function usePatients() {
  return useQuery<PatientListItem[]>({
    queryKey: ['patients', 'list'],
    queryFn: async () => (DEMO_MODE ? demoPatientStore.list() : getPatientsRequest()),
    staleTime: 60 * 1000,
  });
}
