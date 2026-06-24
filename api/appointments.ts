import { apiClient } from './client';
import { endpoints } from './endpoints';
import type {
  BackendEvent,
  CreateAppointmentRequest,
  CreateAppointmentResponse,
  DeleteAppointmentRequest,
  DeleteAppointmentResponse,
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

export async function deleteAppointmentRequest(
  payload: DeleteAppointmentRequest,
): Promise<DeleteAppointmentResponse> {
  const { data } = await apiClient.post<DeleteAppointmentResponse>(
    endpoints.appointments.encounter,
    payload,
  );
  return data;
}

// New booking — same /encounter endpoint, no eventId so the backend takes
// the create path. Patient must already exist (backend looks up
// PatientRegistrationInfo by name+family+dob+phone, returns 'unavailable'
// if not found).
export async function createAppointmentRequest(
  payload: CreateAppointmentRequest,
): Promise<CreateAppointmentResponse> {
  const { data } = await apiClient.post<CreateAppointmentResponse>(
    endpoints.appointments.encounter,
    payload,
  );
  return data;
}
