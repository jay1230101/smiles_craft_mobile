import { apiClient } from './client';
import { endpoints } from './endpoints';
import type {
  PendingProceduresResponse,
  ProcedureInitResponse,
  TreatmentPlanRequest,
  TreatmentPlanResponse,
  VisitsHistoryResponse,
} from '@/types/orders';

export async function getProcedureInitRequest(): Promise<ProcedureInitResponse> {
  const { data } = await apiClient.get<ProcedureInitResponse>(endpoints.orders.init);
  return data;
}

export async function getPendingProceduresRequest(
  patientId: number,
  doctorId: number,
): Promise<PendingProceduresResponse> {
  const { data } = await apiClient.post<PendingProceduresResponse>(endpoints.orders.pending, {
    patientId,
    doctorId,
  });
  return data;
}

export async function submitTreatmentPlanRequest(
  payload: TreatmentPlanRequest,
): Promise<TreatmentPlanResponse> {
  const { data } = await apiClient.post<TreatmentPlanResponse>(
    endpoints.orders.submit,
    payload,
  );
  return data;
}

export async function getVisitsHistoryRequest(
  patientId: number,
): Promise<VisitsHistoryResponse> {
  const { data } = await apiClient.post<VisitsHistoryResponse>(endpoints.orders.visits, {
    patientId,
  });
  return data;
}
