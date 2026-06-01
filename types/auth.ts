export type Role = 'ADMIN' | 'ASSISTANT' | 'DOCTOR' | 'NURSE' | 'SYSTEMADMIN';

export type User = {
  user_id: number;
  user_name: string;
  role: Role;
  clinic_id: number;
  is_owner: boolean;
  specialty?: string;
  email?: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  user: User;
};
