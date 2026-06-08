export type RegisterPatientRequest = {
  name: string;
  family: string;
  father?: string;
  dob: string;
  phone: string;
  gender: string;
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
