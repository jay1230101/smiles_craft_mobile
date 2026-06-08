import { useQuery } from '@tanstack/react-query';

import { getCancellationReasonsRequest } from '@/api/cancellations';
import { DEMO_MODE, MOCK_CANCELLATION_REASONS } from '@/lib/mock-appointments';
import type { CancellationReason } from '@/types/cancellations';

export function useCancellationReasons() {
  return useQuery<CancellationReason[]>({
    queryKey: ['appointments', 'cancellation-reasons'],
    queryFn: async () =>
      DEMO_MODE ? MOCK_CANCELLATION_REASONS : getCancellationReasonsRequest(),
    staleTime: 60 * 60 * 1000,
  });
}
