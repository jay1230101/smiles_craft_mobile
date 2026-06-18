export type UpdatePatientRequest = {
  id: number;
  name: string;
  family?: string;
  dob?: string;
  phone: string;
  gender?: string;
  email?: string;
  allergy?: string;
  doctor: number;
};

export type UpdatePatientResponse =
  | { status: 200 | 'success'; message?: string }
  | { status: 'error'; message: string };

export type DeletePatientRequest = { id: number };

export type DeletePatientResponse =
  | { status: 200 | 'success'; message?: string }
  | { status: 'error'; message: string };

export type PatientListItem = {
  id: number;
  name: string;
  family?: string;
  dob?: string;
  phone?: string;
  gender?: string;
  doctor_id?: number;
  doctor_name?: string;
  allergy?: string;
  email?: string;
};

export type RegisterPatientRequest = {
  name: string;
  family?: string;
  dob?: string;
  phone: string;
  gender?: string;
  email?: string;
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
