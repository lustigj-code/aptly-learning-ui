/**
 * useReviewQueue Hook
 * Fetches and caches due review items with React Query
 * Enhanced with smart review scheduling (ML-based prioritization)
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/queryClient';
import { get, isSuccess } from '@/lib/api/client';

// ============================================
// TYPES
// ============================================

export type DueReviewItem = {
  conceptId: string;
  conceptName: string;
  conceptDescription: string;
  category: string;
  masteryLevel: number;
  lastReviewedAt: string | null;
  dueDate: string | null;
  reviewCount: number;
  fsrsState: Record<string, unknown> | null;
  keyTerms: string[];
  // Smart review enhancements
  priority?: number;
  retrievability?: number;
  reasoning?: string;
};

export type BatchInfo = {
  estimatedDurationMinutes: number;
  expectedRetentionGain: number;
  batchReasoning: string;
};

export type OptimalTime = {
  hour: number;
  confidence: number;
  reasoning: string;
};

export type ForecastDay = {
  date: string;
  dueCount: number;
  estimatedMinutes: number;
};

type DueReviewsResponse = {
  success: boolean;
  dueCount: number;
  items: DueReviewItem[];
  // Smart review enhancements
  batch?: BatchInfo;
  optimalTime?: OptimalTime;
  forecast?: ForecastDay[];
};

// ============================================
// HOOKS
// ============================================

/**
 * Fetch items due for spaced repetition review
 * @param uid - User ID
 * @param limit - Maximum items to fetch
 * @param includeForecast - Whether to include 7-day forecast
 * @param maxMinutes - Maximum session duration for batch optimization
 */
export function useReviewQueue(
  uid: string | null,
  limit: number = 10,
  includeForecast: boolean = false,
  maxMinutes: number = 20
) {
  const query = useQuery({
    queryKey: [...queryKeys.reviewsDue(uid || ''), limit, includeForecast, maxMinutes],
    queryFn: async () => {
      if (!uid) throw new Error('No user ID provided');

      const params = new URLSearchParams({
        limit: String(limit),
        maxMinutes: String(maxMinutes),
      });
      if (includeForecast) {
        params.set('forecast', 'true');
      }

      const response = await get<DueReviewsResponse>(
        `/api/review/due?${params.toString()}`
      );

      if (!isSuccess(response)) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    enabled: !!uid,
    staleTime: 2 * 60 * 1000, // 2 minutes (reviews can become due frequently)
    refetchOnWindowFocus: true,
  });

  return {
    // Core data
    dueItems: query.data?.items || [],
    dueCount: query.data?.dueCount || 0,
    // Smart review enhancements
    batch: query.data?.batch || null,
    optimalTime: query.data?.optimalTime || null,
    forecast: query.data?.forecast || null,
    // Query state
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Helper hook for forecast-only data
 */
export function useReviewForecast(uid: string | null) {
  return useReviewQueue(uid, 10, true);
}
