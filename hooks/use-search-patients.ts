import { useQuery } from '@tanstack/react-query';

import { searchPatientsRequest } from '@/api/patients';
import { demoPatientStore } from '@/lib/demo-patient-store';
import { DEMO_MODE } from '@/lib/mock-appointments';
import type { PatientListItem } from '@/types/patients';

// Used by Edit/Reschedule's "Search Patients" input. Debouncing is owned by
// the caller (the input passes a stable term once the user pauses typing);
// React Query handles caching for repeat searches.
export function useSearchPatients(term: string) {
  const trimmed = term.trim();
  return useQuery<PatientListItem[]>({
    queryKey: ['patients', 'search', trimmed.toLowerCase()],
    enabled: trimmed.length >= 2,
    queryFn: async () => {
      if (DEMO_MODE) {
        const lower = trimmed.toLowerCase();
        return demoPatientStore.list().filter((p) => {
          const name = (p.name ?? '').toLowerCase();
          const family = (p.family ?? '').toLowerCase();
          const phone = (p.phone ?? '').toLowerCase();
          return name.includes(lower) || family.includes(lower) || phone.includes(lower);
        });
      }
      return searchPatientsRequest(trimmed);
    },
    staleTime: 30 * 1000,
  });
}
