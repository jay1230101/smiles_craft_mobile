import type { LoginRequest, LoginResponse } from '@/types/auth';
import { apiClient } from './client';
import { endpoints } from './endpoints';

export async function loginRequest(payload: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>(endpoints.auth.login, payload);
  return data;
}

export async function forgotPasswordRequest(email: string): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>(endpoints.auth.forgotPassword, { email });
  return data;
}
