import { apiClient } from './client';
import { endpoints } from './endpoints';
import type {
  StoreReminderRequest,
  StoreReminderResponse,
  WhatsAppTemplate,
} from '@/types/orders';

// /getActiveTemplates response shape varies historically — handle both an
// array of strings and an array of objects.
type RawTemplate = string | { id?: number | string; name?: string; label?: string };

export async function getActiveTemplatesRequest(): Promise<WhatsAppTemplate[]> {
  const { data } = await apiClient.get<RawTemplate[] | { data: RawTemplate[] }>(
    endpoints.reminders.templates,
  );
  const items = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
  return items.map((t, i): WhatsAppTemplate => {
    if (typeof t === 'string') return { id: t, name: t, label: t };
    return {
      id: t.id ?? t.name ?? i,
      name: t.name ?? String(t.id ?? i),
      label: t.label ?? t.name ?? String(t.id ?? i),
    };
  });
}

export async function storeReminderRequest(
  payload: StoreReminderRequest,
): Promise<StoreReminderResponse> {
  const { data } = await apiClient.post<StoreReminderResponse>(
    endpoints.reminders.store,
    payload,
  );
  return data;
}
