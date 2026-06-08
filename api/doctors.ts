import { apiClient } from './client';
import { endpoints } from './endpoints';
import type { Doctor } from '@/types/doctors';

export async function getDoctorsRequest(): Promise<Doctor[]> {
  const { data } = await apiClient.get<Doctor[] | { message: string; status: number }>(
    endpoints.doctors.list,
  );
  return Array.isArray(data) ? data : [];
}
