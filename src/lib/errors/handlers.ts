/**
 * Unified error handling utilities for Aptly Learning
 * Eliminates duplicate try-catch patterns across services
 */

export enum ApiErrorCode {
  AUTH_FAILED = 'AUTH_001',
  VALIDATION_FAILED = 'VAL_001',
  DATA_NOT_FOUND = 'DATA_001',
  QUOTA_EXCEEDED = 'QUOTA_001',
  FIREBASE_ERROR = 'FB_001',
  UNKNOWN = 'ERR_999',
}

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  stack?: string;
}

/**
 * Create a structured API error
 * @param code - Error code from ApiErrorCode enum
 * @param message - Human-readable error message
 * @param details - Optional additional context
 * @returns Structured ApiError object
 */
export function createApiError(
  code: ApiErrorCode,
  message: string,
  details?: Record<string, unknown>
): ApiError {
  return {
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Check if an object is a structured ApiError
 */
function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof (error as ApiError).message === 'string'
  );
}

/**
 * Wrap an unknown error into a structured ApiError
 * @param operation - Description of the operation that failed
 * @param error - The caught error (can be any type)
 * @returns Structured ApiError object
 */
export function wrapServiceError(
  operation: string,
  error: unknown
): ApiError {
  // Handle ApiError objects (from createApiError/validateString/etc)
  if (isApiError(error)) {
    return {
      ...error,
      message: `Failed to ${operation}: ${error.message}`,
    };
  }

  const message = error instanceof Error ? error.message : 'Unknown error';
  const stack = error instanceof Error ? error.stack : undefined;

  return {
    code: ApiErrorCode.UNKNOWN,
    message: `Failed to ${operation}: ${message}`,
    timestamp: new Date().toISOString(),
    stack,
  };
}

/**
 * Execute an async operation with unified error handling
 * Logs errors and wraps them in a consistent format
 *
 * @param operation - Description of the operation (used in error messages and logging)
 * @param fn - Async function to execute
 * @returns Promise resolving to the function's return value
 * @throws Error with consistent format if the operation fails
 *
 * @example
 * // Replace this pattern:
 * try {
 *   const result = await someOperation();
 *   return result;
 * } catch (error) {
 *   console.error('Error:', error);
 *   throw new Error(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
 * }
 *
 * // With this:
 * return withErrorHandling('get user data', async () => {
 *   const result = await someOperation();
 *   return result;
 * });
 */
export async function withErrorHandling<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error(`[${operation}] Error:`, error);
    throw wrapServiceError(operation, error);
  }
}

/**
 * Validate required fields and throw a consistent error if validation fails
 * @param fields - Object mapping field names to their values
 * @throws Error if any field is missing/invalid
 */
export function validateRequired(fields: Record<string, unknown>): void {
  const missing = Object.entries(fields)
    .filter(([, value]) => value === undefined || value === null || value === '')
    .map(([key]) => key);

  if (missing.length > 0) {
    throw createApiError(
      ApiErrorCode.VALIDATION_FAILED,
      `Missing required fields: ${missing.join(', ')}`
    );
  }
}

/**
 * Validate a string parameter
 * @param name - Parameter name for error messages
 * @param value - The value to validate
 * @throws Error if value is not a non-empty string
 */
export function validateString(name: string, value: unknown): asserts value is string {
  if (!value || typeof value !== 'string') {
    throw createApiError(
      ApiErrorCode.VALIDATION_FAILED,
      `Invalid ${name} provided`
    );
  }
}

/**
 * Validate a numeric parameter within a range
 * @param name - Parameter name for error messages
 * @param value - The value to validate
 * @param min - Minimum allowed value (inclusive)
 * @param max - Maximum allowed value (inclusive)
 * @throws Error if value is not a number within range
 */
export function validateNumber(
  name: string,
  value: unknown,
  min?: number,
  max?: number
): asserts value is number {
  if (typeof value !== 'number' || isNaN(value)) {
    throw createApiError(
      ApiErrorCode.VALIDATION_FAILED,
      `${name} must be a number`
    );
  }
  if (min !== undefined && value < min) {
    throw createApiError(
      ApiErrorCode.VALIDATION_FAILED,
      `${name} must be at least ${min}`
    );
  }
  if (max !== undefined && value > max) {
    throw createApiError(
      ApiErrorCode.VALIDATION_FAILED,
      `${name} must be at most ${max}`
    );
  }
}
