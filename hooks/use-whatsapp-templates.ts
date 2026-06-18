import { useMutation, useQuery } from '@tanstack/react-query';

import { getActiveTemplatesRequest, storeReminderRequest } from '@/api/reminders';
import { DEMO_MODE } from '@/lib/mock-appointments';
import { MOCK_WHATSAPP_TEMPLATES } from '@/lib/mock-orders';
import type {
  StoreReminderRequest,
  StoreReminderResponse,
  WhatsAppTemplate,
} from '@/types/orders';

export function useWhatsAppTemplates() {
  return useQuery<WhatsAppTemplate[]>({
    queryKey: ['reminders', 'templates'],
    queryFn: async () => {
      if (DEMO_MODE) return MOCK_WHATSAPP_TEMPLATES;
      return getActiveTemplatesRequest();
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useStoreReminder() {
  return useMutation<StoreReminderResponse, Error, StoreReminderRequest>({
    mutationFn: async (payload) => {
      if (DEMO_MODE) {
        return { status: 'success', message: 'Scheduled (demo mode)' };
      }
      return storeReminderRequest(payload);
    },
  });
}
