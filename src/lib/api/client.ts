/**
 * API Client
 * Base fetch wrapper with auth token injection, error handling, and retry logic
 */

import { getIdToken } from '@/lib/firebase/auth';

// ============================================
// TYPES
// ============================================

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNKNOWN';

export type ApiError = {
  code: ApiErrorCode;
  message: string;
  status: number;
  details?: unknown;
};

export type ApiResponse<T> = {
  data: T;
  success: true;
} | {
  data: null;
  success: false;
  error: ApiError;
};

export type RequestConfig = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  skipAuth?: boolean;
};

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000; // 1 second
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

// ============================================
// ERROR HANDLING
// ============================================

/**
 * Map HTTP status code to ApiErrorCode
 */
function statusToErrorCode(status: number): ApiErrorCode {
  switch (status) {
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 400:
    case 422:
      return 'VALIDATION_ERROR';
    case 408:
      return 'TIMEOUT';
    default:
      if (status >= 500) {
        return 'SERVER_ERROR';
      }
      return 'UNKNOWN';
  }
}

/**
 * Create a standardized ApiError from various error types
 */
function createApiError(
  status: number,
  message: string,
  details?: unknown
): ApiError {
  return {
    code: statusToErrorCode(status),
    message,
    status,
    details,
  };
}

/**
 * Check if an error is retryable based on status code
 */
function isRetryable(status: number): boolean {
  return RETRYABLE_STATUS_CODES.includes(status);
}

// ============================================
// UTILITIES
// ============================================

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================
// API CLIENT
// ============================================

/**
 * Make an API request with automatic auth token injection, error handling, and retry logic
 * @param endpoint - API endpoint (e.g., '/api/progress/complete-atom')
 * @param config - Request configuration
 * @returns Type-safe response with success/error handling
 */
export async function apiRequest<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<ApiResponse<T>> {
  const {
    method = 'GET',
    body,
    headers = {},
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
    skipAuth = false,
  } = config;

  // Build headers
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Add auth token if not skipping auth
  if (!skipAuth) {
    try {
      const token = await getIdToken();
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Failed to get auth token:', error);
    }
  }

  // Build request options
  const requestOptions: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body && method !== 'GET') {
    requestOptions.body = JSON.stringify(body);
  }

  // Build full URL
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const url = `${baseUrl}${endpoint}`;

  // Retry loop
  let lastError: ApiError | null = null;
  let attempt = 0;

  while (attempt <= retries) {
    try {
      const response = await fetchWithTimeout(url, requestOptions, timeout);

      // Parse response body
      let responseData: unknown;
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      // Handle successful response
      if (response.ok) {
        return {
          data: responseData as T,
          success: true,
        };
      }

      // Handle error response
      const errorMessage =
        typeof responseData === 'object' &&
        responseData !== null &&
        'error' in responseData
          ? String((responseData as Record<string, unknown>).error)
          : `Request failed with status ${response.status}`;

      const errorDetails =
        typeof responseData === 'object' &&
        responseData !== null &&
        'details' in responseData
          ? (responseData as Record<string, unknown>).details
          : undefined;

      const apiError = createApiError(response.status, errorMessage, errorDetails);

      // Check if we should retry
      if (isRetryable(response.status) && attempt < retries) {
        lastError = apiError;
        attempt++;
        await sleep(retryDelay * attempt); // Exponential backoff
        continue;
      }

      return {
        data: null,
        success: false,
        error: apiError,
      };
    } catch (error) {
      // Handle network errors and timeouts
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          lastError = createApiError(408, 'Request timeout');
        } else {
          lastError = {
            code: 'NETWORK_ERROR',
            message: error.message || 'Network error occurred',
            status: 0,
          };
        }
      } else {
        lastError = {
          code: 'UNKNOWN',
          message: 'An unknown error occurred',
          status: 0,
        };
      }

      // Retry on network errors
      if (attempt < retries) {
        attempt++;
        await sleep(retryDelay * attempt);
        continue;
      }

      return {
        data: null,
        success: false,
        error: lastError,
      };
    }
  }

  // Should not reach here, but return last error just in case
  return {
    data: null,
    success: false,
    error: lastError || createApiError(500, 'Max retries exceeded'),
  };
}

// ============================================
// CONVENIENCE METHODS
// ============================================

/**
 * Make a GET request
 */
export function get<T>(
  endpoint: string,
  config?: Omit<RequestConfig, 'method' | 'body'>
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { ...config, method: 'GET' });
}

/**
 * Make a POST request
 */
export function post<T>(
  endpoint: string,
  body?: unknown,
  config?: Omit<RequestConfig, 'method' | 'body'>
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { ...config, method: 'POST', body });
}

/**
 * Make a PUT request
 */
export function put<T>(
  endpoint: string,
  body?: unknown,
  config?: Omit<RequestConfig, 'method' | 'body'>
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { ...config, method: 'PUT', body });
}

/**
 * Make a PATCH request
 */
export function patch<T>(
  endpoint: string,
  body?: unknown,
  config?: Omit<RequestConfig, 'method' | 'body'>
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { ...config, method: 'PATCH', body });
}

/**
 * Make a DELETE request
 */
export function del<T>(
  endpoint: string,
  config?: Omit<RequestConfig, 'method'>
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { ...config, method: 'DELETE' });
}

// ============================================
// HELPER UTILITIES
// ============================================

/**
 * Type guard to check if response is successful
 */
export function isSuccess<T>(
  response: ApiResponse<T>
): response is { data: T; success: true } {
  return response.success === true;
}

/**
 * Type guard to check if response is an error
 */
export function isError<T>(
  response: ApiResponse<T>
): response is { data: null; success: false; error: ApiError } {
  return response.success === false;
}

/**
 * Unwrap response data or throw error
 * Useful for cases where you want to use try/catch instead of checking success
 */
export function unwrapResponse<T>(response: ApiResponse<T>): T {
  if (isSuccess(response)) {
    return response.data;
  }
  throw new Error(response.error.message);
}

/**
 * Build query string from params object
 */
export function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const filteredParams = Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);

  return filteredParams.length > 0 ? `?${filteredParams.join('&')}` : '';
}
