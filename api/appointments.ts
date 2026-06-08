import { apiClient } from './client';
import { endpoints } from './endpoints';
import type {
  BackendEvent,
  GetAllEventsResponse,
  UpdateAppointmentRequest,
  UpdateAppointmentResponse,
} from '@/types/appointments';

export async function getAllEventsRequest(): Promise<BackendEvent[]> {
  const { data } = await apiClient.get<GetAllEventsResponse>(endpoints.calendar.list);
  return Array.isArray(data?.data) ? data.data : [];
}

export async function updateAppointmentRequest(
  payload: UpdateAppointmentRequest,
): Promise<UpdateAppointmentResponse> {
  const { data } = await apiClient.post<UpdateAppointmentResponse>(
    endpoints.appointments.encounter,
    payload,
  );
  return data;
}
