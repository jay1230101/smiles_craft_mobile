import { useQuery } from '@tanstack/react-query';

import { getMappedDoctorsRequest } from '@/api/doctors';
import { DEMO_MODE, MOCK_DOCTORS } from '@/lib/mock-appointments';
import type { MappedDoctor } from '@/types/doctors';

// Booking flows should call this — matches the web calendar's column source
// (`/getc_mapped`), not the role-based `/clinic_doctors` list used by
// patient registration.
export function useMappedDoctors() {
  return useQuery<MappedDoctor[]>({
    queryKey: ['doctors', 'mapped'],
    queryFn: async () => {
      if (DEMO_MODE) {
        return MOCK_DOCTORS.map((d) => ({
          id: d.id,
          name: `${d.name} ${d.family}`.trim(),
        }));
      }
      return getMappedDoctorsRequest();
    },
    staleTime: 5 * 60 * 1000,
  });
}
