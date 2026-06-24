import { apiClient } from './client';
import { endpoints } from './endpoints';
import type {
  GetBillDetailResponse,
  GetCurrentBillsResponse,
  GetPatientBillingResponse,
  RecordPaymentInput,
  RecordPaymentResponse,
} from '@/types/billing';

export async function getCurrentBillsRequest(): Promise<GetCurrentBillsResponse> {
  console.log('[billing] GET', endpoints.bills.current);
  try {
    const { data } = await apiClient.get<GetCurrentBillsResponse>(endpoints.bills.current);
    console.log('[billing] current response', Array.isArray(data) ? `array(${data.length})` : typeof data);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.log('[billing] current ERROR', err);
    throw err;
  }
}

export async function getBillDetailRequest(patientId: number): Promise<GetBillDetailResponse> {
  const path = endpoints.bills.detail(patientId);
  console.log('[billing] GET', path);
  try {
    const { data } = await apiClient.get<GetBillDetailResponse>(path);
    console.log('[billing] detail response', data?.status, `encounters=${data?.encounters?.length ?? 0}`);
    return data;
  } catch (err) {
    console.log('[billing] detail ERROR', err);
    throw err;
  }
}

export async function getPatientBillingRequest(patientId: number): Promise<GetPatientBillingResponse> {
  const path = endpoints.bills.history(patientId);
  console.log('[billing] GET', path);
  try {
    const { data } = await apiClient.get<GetPatientBillingResponse>(path);
    console.log('[billing] history response', data?.status, `procedures=${data?.procedures?.length ?? 0}`);
    return data;
  } catch (err) {
    console.log('[billing] history ERROR', err);
    throw err;
  }
}

// Stubbed against the future POST /record-payment route. Until the backend
// ships it, the live call will 404 — UI must guard the action behind a
// "backend update required" message and only enable it in DEMO_MODE or
// once the route lands.
export async function recordPaymentRequest(
  input: RecordPaymentInput,
): Promise<RecordPaymentResponse> {
  console.log('[billing] POST', endpoints.bills.recordPayment, input);
  try {
    const { data } = await apiClient.post<RecordPaymentResponse>(
      endpoints.bills.recordPayment,
      input,
    );
    console.log('[billing] payment response', data?.status);
    return data;
  } catch (err) {
    console.log('[billing] payment ERROR', err);
    throw err;
  }
}
