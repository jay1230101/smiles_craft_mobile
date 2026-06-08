import { apiClient } from './client';
import { endpoints } from './endpoints';
import type { Gender, GetGendersResponse } from '@/types/genders';

export async function getGendersRequest(): Promise<Gender[]> {
  const { data } = await apiClient.get<GetGendersResponse>(endpoints.genders.list);
  return Array.isArray(data?.type) ? data.type : [];
}
