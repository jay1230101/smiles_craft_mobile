import { useQuery } from '@tanstack/react-query';

import { getChatsRequest } from '@/api/chats';
import { DEMO_MODE } from '@/lib/mock-appointments';

export const CHATS_KEY = ['chats'] as const;

export function usePatientChats() {
  return useQuery({
    queryKey: [...CHATS_KEY],
    queryFn: getChatsRequest,
    enabled: !DEMO_MODE,
    staleTime: 30 * 1000,
  });
}
