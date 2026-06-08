import { apiClient } from './client';
import { endpoints } from './endpoints';
import type {
  CancelApptRequest,
  CancelApptResponse,
  CancellationReason,
} from '@/types/cancellations';

export async function getCancellationReasonsRequest(): Promise<CancellationReason[]> {
  const { data } = await apiClient.get<CancellationReason[]>(
    endpoints.appointments.cancellationReasons,
  );
  return Array.isArray(data) ? data : [];
}

export async function cancelAppointmentRequest(
  payload: CancelApptRequest,
): Promise<CancelApptResponse> {
  const { data } = await apiClient.post<CancelApptResponse>(
    endpoints.appointments.cancel,
    payload,
  );
  return data;
}
