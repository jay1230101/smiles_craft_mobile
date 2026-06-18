import { useQuery } from '@tanstack/react-query';

import { getPendingProceduresRequest } from '@/api/orders';
import { DEMO_MODE } from '@/lib/mock-appointments';
import { MOCK_PENDING_PROCEDURES } from '@/lib/mock-orders';
import type { PendingProceduresResponse } from '@/types/orders';

export function usePendingProcedures(patientId: number | null, doctorId: number | null) {
  return useQuery<PendingProceduresResponse>({
    queryKey: ['orders', 'pending', patientId, doctorId],
    enabled: !!patientId && !!doctorId,
    queryFn: async () => {
      if (DEMO_MODE) {
        const matched = MOCK_PENDING_PROCEDURES.filter((p) => p.patientId === patientId);
        const totalNetAmount = matched.reduce((sum, p) => sum + Number(p.netPrice ?? 0), 0);
        const totalAmountPaid = matched.reduce((sum, p) => sum + Number(p.amountPaid ?? 0), 0);
        const totalRemainingBalance = matched.reduce(
          (sum, p) => sum + Number(p.remainingBalance ?? 0),
          0,
        );
        return {
          procedures: matched,
          totals: { totalNetAmount, totalAmountPaid, totalRemainingBalance },
        };
      }
      return getPendingProceduresRequest(patientId as number, doctorId as number);
    },
    staleTime: 30 * 1000,
  });
}
