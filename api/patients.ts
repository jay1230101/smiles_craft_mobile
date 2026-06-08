import { apiClient } from './client';
import { endpoints } from './endpoints';
import type {
  RegisterPatientRequest,
  RegisterPatientResponse,
} from '@/types/patients';

export async function registerPatientRequest(
  payload: RegisterPatientRequest,
): Promise<RegisterPatientResponse> {
  const { data } = await apiClient.post<RegisterPatientResponse>(
    endpoints.patients.register,
    payload,
  );
  return data;
}
