import { toNumber } from '@/lib/num';

import { apiClient } from './client';
import { endpoints } from './endpoints';
import type {
  DeletePatientRequest,
  DeletePatientResult,
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
    const { data } = await apiClient.get<PatientListItemWire[]>(endpoints.patients.list);
     
    console.log(
      '[patients] response',
      Array.isArray(data) ? `array(${data.length})` : typeof data,
      data,
    );
    return Array.isArray(data) ? data.map(normalizePatient) : [];
  } catch (err) {

    console.log('[patients] ERROR', err);
    throw err;
  }
}

// PatientRegistrationInfo.doctor_id is a String column (models.py:255), so
// /registeredPatients returns it as "64" rather than 64 even though our type
// declares a number. The edit form matches that value against the clinician
// options, whose values are the numeric User ids — a string never matches, so
// the Clinician field rendered blank on every patient. Coerce here (same
// boundary fix as resourceId in api/appointments.ts) and leave it absent when
// the patient genuinely has no clinician, so the form keeps its own 0 default.
type PatientListItemWire = Omit<PatientListItem, 'doctor_id'> & {
  doctor_id?: number | string | null;
};

function normalizePatient(p: PatientListItemWire): PatientListItem {
  const raw = p.doctor_id;
  const hasDoctor = raw !== null && raw !== undefined && String(raw).trim() !== '';
  return { ...p, doctor_id: hasDoctor ? toNumber(raw) : undefined };
}

export async function updatePatientRequest(
  payload: UpdatePatientRequest,
): Promise<UpdatePatientResponse> {
  // The backend has no dedicated update route: /register-patient doubles as the
  // edit endpoint when a `registrationId` is present (views.py:2429) — it
  // updates the existing PatientRegistrationInfo row and emits `patientEdited`.
  // `force_create` is required because the duplicate-phone guard runs before the
  // edit branch and would otherwise flag the patient's own unchanged number as a
  // duplicate. `father`/`email` are passed through unchanged (the mobile form
  // doesn't expose them) so the edit doesn't blank those fields.
  const body = {
    registrationId: payload.id,
    name: payload.name,
    family: payload.family,
    father: payload.father ?? '',
    dob: payload.dob ?? '',
    phone: payload.phone,
    gender: payload.gender ?? '',
    email: payload.email ?? '',
    allergy: payload.allergy ?? '',
    doctor: payload.doctor,
    force_create: true,
  };
  const { data } = await apiClient.post<UpdatePatientResponse>(
    endpoints.patients.register,
    body,
  );
  return data;
}

export async function deletePatientRequest(
  payload: DeletePatientRequest,
): Promise<DeletePatientResult> {
  // The backend reports { success, message }. `success` is normally a boolean,
  // but the non-owner-doctor "unauthorized" branch sends the string "False" —
  // coerce both to a real boolean. The backend also returns HTTP 200 with
  // success:false when the patient still has linked records (bookings,
  // treatments, reminders, documents), so a non-throwing response is NOT proof
  // of deletion — the caller must check `ok`.
  const { data } = await apiClient.post<{ success?: boolean | string; message?: string }>(
    endpoints.patients.delete,
    payload,
  );
  const ok = data?.success === true || data?.success === 'True';
  return { ok, message: data?.message };
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
