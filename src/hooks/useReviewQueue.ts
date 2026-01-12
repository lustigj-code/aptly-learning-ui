/**
 * useReviewQueue Hook
 * Fetches and caches due review items with React Query
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
};

type DueReviewsResponse = {
  success: boolean;
  dueCount: number;
  items: DueReviewItem[];
};

// ============================================
// HOOK
// ============================================

/**
 * Fetch items due for spaced repetition review
 */
export function useReviewQueue(uid: string | null, limit: number = 10) {
  const query = useQuery({
    queryKey: queryKeys.reviewsDue(uid || ''),
    queryFn: async () => {
      if (!uid) throw new Error('No user ID provided');

      const response = await get<DueReviewsResponse>(
        `/api/review/due?limit=${limit}`
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
    dueItems: query.data?.items || [],
    dueCount: query.data?.dueCount || 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
