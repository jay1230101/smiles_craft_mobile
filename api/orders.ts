import { toNumber } from '@/lib/num';
import { apiClient } from './client';
import { endpoints } from './endpoints';
import type {
  PendingProceduresResponse,
  ProcedureInitResponse,
  TreatmentPlanRequest,
  TreatmentPlanResponse,
  VisitsHistoryResponse,
} from '@/types/orders';

// Same DECIMAL-as-string hazard as the cashier endpoints (see lib/num.ts): the
// Orders screen sums netPrice/price client-side, so coerce every money field at
// the boundary before it reaches arithmetic.
function normalizeProcedureInit(data: ProcedureInitResponse): ProcedureInitResponse {
  return {
    ...data,
    data: {
      ...data?.data,
      procedures: Array.isArray(data?.data?.procedures)
        ? data.data.procedures.map((p) => ({ ...p, price: toNumber(p.price) }))
        : [],
    },
  };
}

function normalizePendingProcedures(
  data: PendingProceduresResponse,
): PendingProceduresResponse {
  return {
    procedures: Array.isArray(data?.procedures)
      ? data.procedures.map((p) => ({
          ...p,
          fees: toNumber(p.fees),
          discount: toNumber(p.discount),
          netPrice: toNumber(p.netPrice),
          amountPaid: toNumber(p.amountPaid),
          remainingBalance: toNumber(p.remainingBalance),
        }))
      : [],
    totals: {
      totalAmountPaid: toNumber(data?.totals?.totalAmountPaid),
      totalNetAmount: toNumber(data?.totals?.totalNetAmount),
      totalRemainingBalance: toNumber(data?.totals?.totalRemainingBalance),
    },
  };
}

function normalizeVisits(data: VisitsHistoryResponse): VisitsHistoryResponse {
  return {
    ...data,
    data: Array.isArray(data?.data)
      ? data.data.map((v) => ({
          ...v,
          fees: toNumber(v.fees),
          discount: toNumber(v.discount),
          netPrice: toNumber(v.netPrice),
          amountPaid: toNumber(v.amountPaid),
          remainingBalance: toNumber(v.remainingBalance),
        }))
      : [],
  };
}

export async function getProcedureInitRequest(): Promise<ProcedureInitResponse> {
  const { data } = await apiClient.get<ProcedureInitResponse>(endpoints.orders.init);
  return normalizeProcedureInit(data);
}

export async function getPendingProceduresRequest(
  patientId: number,
  doctorId: number,
): Promise<PendingProceduresResponse> {
  const { data } = await apiClient.post<PendingProceduresResponse>(endpoints.orders.pending, {
    patientId,
    doctorId,
  });
  return normalizePendingProcedures(data);
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
  return normalizeVisits(data);
}
