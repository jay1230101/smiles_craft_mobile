export type UpdatePatientRequest = {
  id: number;
  name: string;
  family: string;
  // Preserved from the loaded record — the mobile form doesn't expose these,
  // but the backend edit path overwrites them, so we pass them through
  // unchanged to avoid blanking a patient's father name / email.
  father?: string;
  email?: string;
  dob?: string;
  phone: string;
  gender?: string;
  allergy?: string;
  doctor: number;
};

export type UpdatePatientResponse =
  | { status: 200 | 'success'; message?: string }
  | { status: 'error'; message: string };

export type DeletePatientRequest = { id: number };

// The backend /delete_patient reports a `success` flag (a boolean — or the
// string "False" on the non-owner-doctor "unauthorized" branch), not a
// `status`. It also now BLOCKS deletion (success:false, HTTP 200) when the
// patient still has bookings, treatments, reminders, or documents. We
// normalize all of that to a single { ok, message } result at the API boundary
// (see api/patients.ts) so callers only branch on `ok`.
export type DeletePatientResult = { ok: boolean; message?: string };

export type PatientListItem = {
  id: number;
  name: string;
  family?: string;
  father?: string;
  dob?: string;
  phone?: string;
  gender?: string;
  email?: string;
  doctor_id?: number;
  doctor_name?: string;
  allergy?: string;
};

export type RegisterPatientRequest = {
  name: string;
  family: string;
  dob?: string;
  phone: string;
  gender?: string;
  allergy?: string;
  doctor: number;
  force_create?: boolean;
};

export type RegisterPatientSuccess = {
  status: 200;
  message: string;
};

export type RegisterPatientDuplicate = {
  status: 'duplicate';
  message: string;
  existing_patient: {
    name: string;
    family: string;
  };
};

export type RegisterPatientError = {
  status: 'error';
  message: string;
};

export type RegisterPatientResponse =
  | RegisterPatientSuccess
  | RegisterPatientDuplicate
  | RegisterPatientError;

export type SearchPatientsResponse =
  | { status: 'success'; data: PatientListItem[] }
  | { status: 'error'; message: string };
