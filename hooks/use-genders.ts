import { useQuery } from '@tanstack/react-query';

import { getGendersRequest } from '@/api/genders';
import { DEMO_MODE, MOCK_GENDERS } from '@/lib/mock-appointments';
import type { Gender } from '@/types/genders';

export function useGenders() {
  return useQuery<Gender[]>({
    queryKey: ['genders', 'list'],
    queryFn: async () => (DEMO_MODE ? MOCK_GENDERS : getGendersRequest()),
    staleTime: 60 * 60 * 1000,
  });
}
