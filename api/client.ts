import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { tokenStorage } from './storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'https://www.smilescraft.com';

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
    message: serverMessage ?? friendlyStatusMessage(status, error.message),
    details: data,
  };
}

function friendlyStatusMessage(status: number, fallback?: string): string {
  switch (status) {
    case 0:
      return 'Network error. Please check your connection and try again.';
    case 400:
      return 'Invalid request. Please review your input and try again.';
    case 401:
      return 'Your session has expired. Please log in again.';
    case 403:
      return 'You don’t have permission to perform this action.';
    case 404:
      return 'We couldn’t find what you were looking for.';
    case 405:
      return 'This feature isn’t available yet. Please contact support.';
    case 408:
      return 'The request took too long. Please try again.';
    case 409:
      return 'That action conflicts with current data. Please refresh and retry.';
    case 422:
      return 'Some information is invalid. Please check and try again.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'Server is having trouble right now. Please try again shortly.';
    default:
      return fallback && !/^Request failed/.test(fallback)
        ? fallback
        : 'Something went wrong. Please try again.';
  }
}

export const API_BASE_URL = API_URL;
