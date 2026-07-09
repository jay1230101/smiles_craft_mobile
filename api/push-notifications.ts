import { apiClient } from './client';
import { endpoints } from './endpoints';

// Contract mirrors backend/views.py:4844 / 4874 exactly. The backend rejects
// any platform other than 'ios' | 'android' and requires a non-empty token.
export type RegisterDeviceTokenRequest = {
  token: string;
  platform: 'ios' | 'android';
  deviceId?: string | null;
};

export type RegisterDeviceTokenResponse = {
  status: 'success' | 'error';
  message?: string;
};

export type UnregisterDeviceTokenRequest = {
  token: string;
};

export type UnregisterDeviceTokenResponse = {
  status: 'success' | 'error';
  message?: string;
};

export async function registerDeviceTokenRequest(
  payload: RegisterDeviceTokenRequest,
): Promise<RegisterDeviceTokenResponse> {
  console.log('[push] POST', endpoints.push.register, {
    platform: payload.platform,
    hasDeviceId: !!payload.deviceId,
  });
  try {
    const { data } = await apiClient.post<RegisterDeviceTokenResponse>(
      endpoints.push.register,
      payload,
    );
    console.log('[push] register response', data?.status);
    return data;
  } catch (err) {
    console.log('[push] register ERROR', err);
    throw err;
  }
}

export async function unregisterDeviceTokenRequest(
  payload: UnregisterDeviceTokenRequest,
): Promise<UnregisterDeviceTokenResponse> {
  console.log('[push] POST', endpoints.push.unregister);
  try {
    const { data } = await apiClient.post<UnregisterDeviceTokenResponse>(
      endpoints.push.unregister,
      payload,
    );
    console.log('[push] unregister response', data?.status);
    return data;
  } catch (err) {
    console.log('[push] unregister ERROR', err);
    throw err;
  }
}
