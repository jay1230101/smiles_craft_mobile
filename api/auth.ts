import type { LoginRequest, LoginResponse, Role } from '@/types/auth';
import { apiClient, type ApiError } from './client';
import { endpoints } from './endpoints';

type ServerLoginResponse = {
  status: 'success' | 'invalid' | 'error';
  message?: string;
  token?: string;
  userid?: number;
  role?: Role;
  role_id?: number;
  user?: string;
  clinic_id?: number;
  is_owner?: boolean;
  specialty?: string;
};

export async function loginRequest(payload: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<ServerLoginResponse>(endpoints.auth.login, payload);

  if (data.status !== 'success' || !data.token || typeof data.userid !== 'number') {
    const err: ApiError = {
      status: 200,
      message: data.message ?? 'Login failed. Please try again.',
    };
    throw err;
  }

  return {
    token: data.token,
    user: {
      user_id: data.userid,
      user_name: data.user ?? '',
      role: (data.role ?? 'ASSISTANT') as Role,
      clinic_id: data.clinic_id ?? 0,
      is_owner: data.is_owner ?? false,
      specialty: data.specialty,
      email: payload.email,
    },
  };
}

type ServerPassTokenResponse = {
  status: 'success' | 'error';
  message?: string;
  email?: string;
};

export async function forgotPasswordRequest(email: string): Promise<{ message: string }> {
  const { data } = await apiClient.post<ServerPassTokenResponse>(
    endpoints.auth.forgotPassword,
    { email },
  );
  if (data?.status !== 'success') {
    const err: ApiError = {
      status: 200,
      message: data?.message ?? 'Could not send reset email. Please try again.',
    };
    throw err;
  }
  return { message: data.message ?? 'Reset email sent. Check your inbox.' };
}
