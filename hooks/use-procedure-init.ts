import { useQuery } from '@tanstack/react-query';

import { getProcedureInitRequest } from '@/api/orders';
import { DEMO_MODE } from '@/lib/mock-appointments';
import {
  MOCK_PROCEDURES,
  MOCK_SHOW_TOOTH,
  MOCK_STATUS_LIST,
  MOCK_TOOTH_LIST,
} from '@/lib/mock-orders';
import type { ProcedureInitResponse } from '@/types/orders';

export function useProcedureInit() {
  return useQuery<ProcedureInitResponse['data']>({
    queryKey: ['orders', 'init'],
    queryFn: async () => {
      if (DEMO_MODE) {
        return {
          procedures: MOCK_PROCEDURES,
          toothlist: MOCK_TOOTH_LIST,
          status_list: MOCK_STATUS_LIST,
          show_tooth: MOCK_SHOW_TOOTH,
        };
      }
      const res = await getProcedureInitRequest();
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
