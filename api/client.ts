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

// Flask's `token_required` decorator returns these bodies on auth failure.
// "Token has expired!" arrives as HTTP 401, but "Token is missing or invalid"
// is returned without an explicit status — Flask defaults to 200. We treat
// either body as an unauthorized response so the user is bumped to login
// instead of seeing silently empty screens.
const TOKEN_ERROR_MESSAGES = new Set([
  'Token is missing or invalid',
  'Token has expired!',
  'Invalid token!',
  'User not authorized',
]);

function isTokenErrorBody(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const message = (data as { message?: unknown }).message;
  return typeof message === 'string' && TOKEN_ERROR_MESSAGES.has(message);
}

async function handleUnauthorized() {
  await tokenStorage.clear();
  if (unauthorizedHandler) {
    try {
      await unauthorizedHandler();
    } catch {}
  }
}

apiClient.interceptors.response.use(
  async (response) => {
    if (isTokenErrorBody(response.data)) {
      await handleUnauthorized();
      return Promise.reject(
        new ApiError({
          status: 401,
          code: 'TOKEN_INVALID',
          message: (response.data as { message: string }).message,
          details: response.data,
        }),
      );
    }
    return response;
  },
  async (error: AxiosError) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      await handleUnauthorized();
    }
    return Promise.reject(normalizeError(error));
  },
);

// A real Error subclass (not a plain object) so every `catch (err)` site's
// `err instanceof Error ? err.message : …` check passes and surfaces the
// friendly/server message instead of falling through to a generic fallback.
export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(params: { status: number; message: string; code?: string; details?: unknown }) {
    super(params.message);
    this.name = 'ApiError';
    this.status = params.status;
    this.code = params.code;
    this.details = params.details;
  }
}

function normalizeError(error: AxiosError): ApiError {
  const status = error.response?.status ?? 0;
  const data = error.response?.data as Record<string, unknown> | undefined;
  const serverMessage =
    (typeof data?.message === 'string' && data.message) ||
    (typeof data?.error === 'string' && data.error) ||
    null;

  return new ApiError({
    status,
    code: typeof data?.code === 'string' ? data.code : undefined,
    message: serverMessage ?? friendlyStatusMessage(status, error.message),
    details: data,
  });
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
