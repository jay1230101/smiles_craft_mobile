import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { tokenStorage } from './storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'https://smilescraft.com';

type UnauthorizedHandler = () => void | Promise<void>;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await tokenStorage.get();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await tokenStorage.clear();
      if (unauthorizedHandler) {
        try {
          await unauthorizedHandler();
        } catch {}
      }
    }
    return Promise.reject(normalizeError(error));
  },
);

export type ApiError = {
  status: number;
  message: string;
  code?: string;
  details?: unknown;
};

function normalizeError(error: AxiosError): ApiError {
  const status = error.response?.status ?? 0;
  const data = error.response?.data as Record<string, unknown> | undefined;
  const serverMessage =
    (typeof data?.message === 'string' && data.message) ||
    (typeof data?.error === 'string' && data.error) ||
    null;

  return {
    status,
    code: typeof data?.code === 'string' ? data.code : undefined,
    message: serverMessage ?? error.message ?? 'Network error',
    details: data,
  };
}

export const API_BASE_URL = API_URL;
