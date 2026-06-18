import { apiClient } from './client';
import { endpoints } from './endpoints';
import type {
  PlanOfCareItem,
  SavePlanOfCareRequest,
  SavePlanOfCareResponse,
} from '@/types/orders';

export async function savePlanOfCareRequest(
  payload: SavePlanOfCareRequest,
): Promise<SavePlanOfCareResponse> {
  const { data } = await apiClient.post<SavePlanOfCareResponse>(
    endpoints.planOfCare.save,
    payload,
  );
  return data;
}

// /get-plan-care returns the array directly (not wrapped in jsonify), so we
// defend against both shapes just in case the backend is normalized later.
export async function getPlanOfCareRequest(patientId: number): Promise<PlanOfCareItem[]> {
  const { data } = await apiClient.post<PlanOfCareItem[] | { data: PlanOfCareItem[] }>(
    endpoints.planOfCare.list,
    { patient_id: patientId },
  );
  if (Array.isArray(data)) return data;
  if (data && Array.isArray((data as { data?: PlanOfCareItem[] }).data)) {
    return (data as { data: PlanOfCareItem[] }).data;
  }
  return [];
}
