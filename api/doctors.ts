import { apiClient } from './client';
import { endpoints } from './endpoints';
import type { Doctor, GetMappedDoctorsResponse, MappedDoctor } from '@/types/doctors';

type ClinicDoctorsResponse = Doctor[] | { message?: string; status?: number };

export async function getDoctorsRequest(): Promise<Doctor[]> {
  console.log('[doctors] GET', endpoints.doctors.list);
  try {
    const { data } = await apiClient.get<ClinicDoctorsResponse>(endpoints.doctors.list);
    console.log(
      '[doctors] response',
      Array.isArray(data) ? `array(${data.length})` : typeof data,
      data,
    );
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.log('[doctors] ERROR', err);
    throw err;
  }
}

// Pulls the doctors the clinic owner mapped to clinic rooms in Admin. The
// web calendar uses this list for both column resources and the booking
// dialog's doctor field — matching it keeps booking 1:1 with web behavior.
// Deduplicated by doctor_id since one doctor can be mapped to multiple
// clinic rooms.
export async function getMappedDoctorsRequest(): Promise<MappedDoctor[]> {
  console.log('[doctors] GET', endpoints.doctors.mapped);
  try {
    const { data } = await apiClient.get<GetMappedDoctorsResponse>(endpoints.doctors.mapped);
    console.log(
      '[doctors] mapped response',
      data?.status,
      Array.isArray(data?.data) ? `array(${data.data.length})` : typeof data?.data,
    );
    if (data?.status !== 'success' || !Array.isArray(data.data)) return [];
    const seen = new Set<number>();
    const result: MappedDoctor[] = [];
    for (const row of data.data) {
      if (typeof row.doctor_id !== 'number' || seen.has(row.doctor_id)) continue;
      seen.add(row.doctor_id);
      result.push({ id: row.doctor_id, name: row.doctor_name ?? '' });
    }
    return result;
  } catch (err) {
    console.log('[doctors] mapped ERROR', err);
    throw err;
  }
}
