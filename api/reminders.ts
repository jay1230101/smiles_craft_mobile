import { apiClient } from './client';
import { endpoints } from './endpoints';
import type {
  StoreReminderRequest,
  StoreReminderResponse,
  WhatsAppTemplate,
} from '@/types/orders';

// /getActiveTemplates response shape varies historically — handle both an
// array of strings and an array of objects. The Flask backend wraps the
// real payload under `message` (not `data`), so we also have to look there:
//   { "message": [{ "id": "...", "name": "..." }, ...], "status": 200 }
// Previously we only checked `data` / `data.data` and the dropdown was always
// empty against the live backend.
type RawTemplate = string | { id?: number | string; name?: string; label?: string };
type RawResponse =
  | RawTemplate[]
  | { data?: RawTemplate[]; message?: RawTemplate[] | string };

export async function getActiveTemplatesRequest(): Promise<WhatsAppTemplate[]> {
  const { data } = await apiClient.get<RawResponse>(endpoints.reminders.templates);
  let items: RawTemplate[] = [];
  if (Array.isArray(data)) {
    items = data;
  } else if (data && Array.isArray(data.data)) {
    items = data.data;
  } else if (data && Array.isArray(data.message)) {
    items = data.message;
  }
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
