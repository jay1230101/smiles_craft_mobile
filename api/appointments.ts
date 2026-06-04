import { apiClient } from './client';
import { endpoints } from './endpoints';
import type { BackendEvent, GetAllEventsResponse } from '@/types/appointments';

export async function getAllEventsRequest(): Promise<BackendEvent[]> {
  const { data } = await apiClient.get<GetAllEventsResponse>(endpoints.calendar.list);
  return Array.isArray(data?.data) ? data.data : [];
}
