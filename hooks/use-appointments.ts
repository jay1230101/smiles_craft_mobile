import { useQuery } from '@tanstack/react-query';

import { getAllEventsRequest } from '@/api/appointments';
import { DEMO_MODE } from '@/lib/mock-appointments';

export function useAllEvents() {
  return useQuery({
    queryKey: ['appointments', 'all-events'],
    queryFn: getAllEventsRequest,
    enabled: !DEMO_MODE,
  });
}
