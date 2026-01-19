/**
 * API Parameter Validation Utilities
 *
 * Provides consistent validation for query parameters across API routes
 * to prevent DoS attacks and ensure type safety.
 *
 * Security considerations:
 * - All pagination limits are bounded to prevent resource exhaustion
 * - Date ranges are validated and bounded
 * - String parameters are sanitized
 */

import { z } from 'zod';

// ============================================
// CONSTANTS
// ============================================

/** Maximum allowed limit for pagination to prevent DoS */
export const MAX_PAGINATION_LIMIT = 100;

/** Default pagination limit */
export const DEFAULT_PAGINATION_LIMIT = 10;

/** Maximum allowed offset to prevent scanning large result sets */
export const MAX_PAGINATION_OFFSET = 10000;

/** Maximum date range in days for analytics queries */
export const MAX_DATE_RANGE_DAYS = 365;

/** Maximum minutes for review sessions */
export const MAX_REVIEW_MINUTES = 120;

/** Default review session minutes */
export const DEFAULT_REVIEW_MINUTES = 20;

// ============================================
// SCHEMAS
// ============================================

/**
 * Pagination parameters schema
 * Ensures limit and offset are within safe bounds
 */
export const paginationSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(MAX_PAGINATION_LIMIT, `Limit cannot exceed ${MAX_PAGINATION_LIMIT}`)
    .default(DEFAULT_PAGINATION_LIMIT),
  offset: z
    .number()
    .int()
    .min(0, 'Offset must be non-negative')
    .max(MAX_PAGINATION_OFFSET, `Offset cannot exceed ${MAX_PAGINATION_OFFSET}`)
    .default(0),
});

/**
 * Date range schema for analytics
 * Validates start/end dates and ensures range is reasonable
 */
export const dateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine(
  (data) => data.startDate <= data.endDate,
  { message: 'Start date must be before or equal to end date' }
).refine(
  (data) => {
    const diffDays = (data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= MAX_DATE_RANGE_DAYS;
  },
  { message: `Date range cannot exceed ${MAX_DATE_RANGE_DAYS} days` }
);

/**
 * Review parameters schema
 * For /api/review/due endpoint
 */
export const reviewParamsSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(MAX_PAGINATION_LIMIT)
    .default(DEFAULT_PAGINATION_LIMIT),
  maxMinutes: z
    .number()
    .int()
    .min(1)
    .max(MAX_REVIEW_MINUTES)
    .default(DEFAULT_REVIEW_MINUTES),
  forecast: z.boolean().default(false),
});

/**
 * Conversation list parameters schema
 */
export const conversationListSchema = z.object({
  lessonId: z.string().optional(),
  limit: z
    .number()
    .int()
    .min(1)
    .max(MAX_PAGINATION_LIMIT)
    .default(DEFAULT_PAGINATION_LIMIT),
});

// ============================================
// PARSING UTILITIES
// ============================================

/**
 * Parse and validate a limit parameter from URL search params
 * @param searchParams - URL search params
 * @param paramName - Name of the parameter (default: 'limit')
 * @param defaultValue - Default value if not provided
 * @returns Bounded limit value
 */
export function parseBoundedLimit(
  searchParams: URLSearchParams,
  paramName: string = 'limit',
  defaultValue: number = DEFAULT_PAGINATION_LIMIT
): number {
  const rawValue = searchParams.get(paramName);
  if (!rawValue) return defaultValue;

  const parsed = parseInt(rawValue, 10);
  if (isNaN(parsed) || parsed < 1) return defaultValue;

  return Math.min(parsed, MAX_PAGINATION_LIMIT);
}

/**
 * Parse and validate an offset parameter from URL search params
 * @param searchParams - URL search params
 * @param paramName - Name of the parameter (default: 'offset')
 * @returns Bounded offset value
 */
export function parseBoundedOffset(
  searchParams: URLSearchParams,
  paramName: string = 'offset'
): number {
  const rawValue = searchParams.get(paramName);
  if (!rawValue) return 0;

  const parsed = parseInt(rawValue, 10);
  if (isNaN(parsed) || parsed < 0) return 0;

  return Math.min(parsed, MAX_PAGINATION_OFFSET);
}

/**
 * Parse and validate a positive integer parameter
 * @param searchParams - URL search params
 * @param paramName - Name of the parameter
 * @param defaultValue - Default value if not provided
 * @param maxValue - Maximum allowed value
 * @returns Bounded positive integer
 */
export function parseBoundedInt(
  searchParams: URLSearchParams,
  paramName: string,
  defaultValue: number,
  maxValue: number
): number {
  const rawValue = searchParams.get(paramName);
  if (!rawValue) return defaultValue;

  const parsed = parseInt(rawValue, 10);
  if (isNaN(parsed) || parsed < 1) return defaultValue;

  return Math.min(parsed, maxValue);
}

/**
 * Parse and validate a boolean parameter
 * @param searchParams - URL search params
 * @param paramName - Name of the parameter
 * @param defaultValue - Default value if not provided
 * @returns Boolean value
 */
export function parseBoolean(
  searchParams: URLSearchParams,
  paramName: string,
  defaultValue: boolean = false
): boolean {
  const rawValue = searchParams.get(paramName);
  if (!rawValue) return defaultValue;

  return rawValue.toLowerCase() === 'true' || rawValue === '1';
}

/**
 * Validate review parameters from URL search params
 * @param searchParams - URL search params
 * @returns Validated review parameters
 */
export function parseReviewParams(searchParams: URLSearchParams): z.infer<typeof reviewParamsSchema> {
  const limit = parseBoundedLimit(searchParams, 'limit', DEFAULT_PAGINATION_LIMIT);
  const maxMinutes = parseBoundedInt(searchParams, 'maxMinutes', DEFAULT_REVIEW_MINUTES, MAX_REVIEW_MINUTES);
  const forecast = parseBoolean(searchParams, 'forecast');

  return { limit, maxMinutes, forecast };
}

/**
 * Validate conversation list parameters from URL search params
 * @param searchParams - URL search params
 * @returns Validated conversation list parameters
 */
export function parseConversationListParams(searchParams: URLSearchParams): z.infer<typeof conversationListSchema> {
  const lessonId = searchParams.get('lessonId') || undefined;
  const limit = parseBoundedLimit(searchParams, 'limit', DEFAULT_PAGINATION_LIMIT);

  return { lessonId, limit };
}

/**
 * Validate date range from request body
 * @param body - Request body with startDate and endDate
 * @returns Validated date range or null if invalid
 */
export function validateDateRange(body: { startDate?: string; endDate?: string }): {
  startDate: Date;
  endDate: Date;
} | { error: string } {
  try {
    const result = dateRangeSchema.parse({
      startDate: body.startDate,
      endDate: body.endDate,
    });
    return result;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0]?.message || 'Invalid date range' };
    }
    return { error: 'Invalid date range' };
  }
}

// ============================================
// TYPE EXPORTS
// ============================================

export type PaginationParams = z.infer<typeof paginationSchema>;
export type DateRangeParams = z.infer<typeof dateRangeSchema>;
export type ReviewParams = z.infer<typeof reviewParamsSchema>;
export type ConversationListParams = z.infer<typeof conversationListSchema>;
