import { apiClient } from './client';
import { endpoints } from './endpoints';
import type { Gender, GetGendersResponse } from '@/types/genders';

export async function getGendersRequest(): Promise<Gender[]> {
  console.log('[genders] GET', endpoints.genders.list);
  try {
    const { data } = await apiClient.get<GetGendersResponse>(endpoints.genders.list);
    const typeField = data?.type;
    console.log(
      '[genders] response',
      Array.isArray(typeField) ? `type=array(${typeField.length})` : `type=${typeof typeField}`,
      data,
    );
    return Array.isArray(typeField) ? typeField : [];
  } catch (err) {
    console.log('[genders] ERROR', err);
    throw err;
  }
}
