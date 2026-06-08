import { useQuery } from '@tanstack/react-query';

import { getDoctorsRequest } from '@/api/doctors';
import { DEMO_MODE, MOCK_DOCTORS } from '@/lib/mock-appointments';
import type { Doctor } from '@/types/doctors';

export function useDoctors() {
  return useQuery<Doctor[]>({
    queryKey: ['doctors', 'list'],
    queryFn: async () => (DEMO_MODE ? MOCK_DOCTORS : getDoctorsRequest()),
    staleTime: 5 * 60 * 1000,
  });
}
