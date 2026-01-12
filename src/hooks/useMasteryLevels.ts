/**
 * useMasteryLevels Hook
 * Fetches user's concept mastery levels for prerequisite checking
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/queryClient';
import { get, isSuccess } from '@/lib/api/client';
import type { ConceptId } from '@/lib/mastery/knowledgeGraph';

// ============================================
// TYPES
// ============================================

type MasteryLevelsResponse = {
  success: boolean;
  items: Array<{
    conceptId: string;
    masteryLevel: number;
  }>;
};

// ============================================
// HOOK
// ============================================

/**
 * Fetch user's mastery levels for all concepts
 * Returns a Record<ConceptId, number> for easy prerequisite checking
 */
export function useMasteryLevels(uid: string | null) {
  const query = useQuery({
    queryKey: queryKeys.reviewQueue(uid || ''),
    queryFn: async () => {
      if (!uid) throw new Error('No user ID provided');

      // Fetch all review items (which contain mastery levels)
      // Using a high limit to get all concepts
      const response = await get<MasteryLevelsResponse>(
        '/api/review/due?limit=100'
      );

      if (!isSuccess(response)) {
        throw new Error(response.error.message);
      }

      // Convert array to Record for easy lookup
      const levels: Record<ConceptId, number> = {};
      response.data.items.forEach(item => {
        levels[item.conceptId as ConceptId] = item.masteryLevel;
      });

      return levels;
    },
    enabled: !!uid,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    masteryLevels: query.data || {},
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

/**
 * Check if prerequisites are met for a specific lesson
 */
export function checkPrerequisites(
  lessonId: string,
  masteryLevels: Record<ConceptId, number>,
  threshold: number = 70
): { met: boolean; missing: ConceptId[] } {
  // Import dynamically to avoid circular dependency
  const { getPrerequisitesForLesson } = require('@/data/courseToConceptMap');

  const prerequisites = getPrerequisitesForLesson(lessonId);

  if (prerequisites.length === 0) {
    return { met: true, missing: [] };
  }

  const missing = prerequisites.filter((conceptId: ConceptId) => {
    const mastery = masteryLevels[conceptId] || 0;
    return mastery < threshold;
  });

  return {
    met: missing.length === 0,
    missing,
  };
}
