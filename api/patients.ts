import { apiClient } from './client';
import { endpoints } from './endpoints';
import type {
  DeletePatientRequest,
  DeletePatientResponse,
  PatientListItem,
  RegisterPatientRequest,
  RegisterPatientResponse,
  SearchPatientsResponse,
  UpdatePatientRequest,
  UpdatePatientResponse,
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

export async function getPatientsRequest(): Promise<PatientListItem[]> {
   
  console.log('[patients] GET', endpoints.patients.list);
  try {
    const { data } = await apiClient.get<PatientListItem[]>(endpoints.patients.list);
     
    console.log(
      '[patients] response',
      Array.isArray(data) ? `array(${data.length})` : typeof data,
      data,
    );
    return Array.isArray(data) ? data : [];
  } catch (err) {
     
    console.log('[patients] ERROR', err);
    throw err;
  }
}

export async function updatePatientRequest(
  payload: UpdatePatientRequest,
): Promise<UpdatePatientResponse> {
  const { data } = await apiClient.post<UpdatePatientResponse>(
    endpoints.patients.update,
    payload,
  );
  return data;
}

export async function deletePatientRequest(
  payload: DeletePatientRequest,
): Promise<DeletePatientResponse> {
  const { data } = await apiClient.post<DeletePatientResponse>(
    endpoints.patients.delete,
    payload,
  );
  return data;
}

// /search-patient does a fuzzy match across name, family, phone for the
// current clinic. Returns `{ status: 'success', data: [...] }` on hits or
// `{ status: 'error', message }` when nothing matches.
export async function searchPatientsRequest(term: string): Promise<PatientListItem[]> {
  const { data } = await apiClient.post<SearchPatientsResponse>(
    endpoints.patients.search,
    { search: term },
  );
  if (data?.status === 'success' && Array.isArray(data.data)) return data.data;
  return [];
}
