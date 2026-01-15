/**
 * useMasteryLevels Hook
 * Fetches user's concept mastery levels for prerequisite checking
 *
 * Cold-start handling: Returns 0% mastery for all concepts when user
 * has no review history (new users). This ensures prerequisite checks
 * work correctly and lessons without prerequisites are accessible.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/queryClient';
import { get, isSuccess } from '@/lib/api/client';
import type { ConceptId } from '@/lib/mastery/knowledgeGraph';
import { SOCIAL_MEDIA_MARKETING_GRAPH } from '@/lib/mastery/knowledgeGraph';

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
// COLD-START DEFAULT MASTERY
// ============================================

/**
 * Default mastery levels for new users (cold-start)
 * All concepts start at 0% mastery
 */
function getDefaultMasteryLevels(): Record<ConceptId, number> {
  const defaults: Record<ConceptId, number> = {};
  for (const conceptId of Object.keys(SOCIAL_MEDIA_MARKETING_GRAPH.concepts)) {
    defaults[conceptId as ConceptId] = 0;
  }
  return defaults;
}

// ============================================
// HOOK
// ============================================

/**
 * Fetch user's mastery levels for all concepts
 * Returns a Record<ConceptId, number> for easy prerequisite checking
 *
 * Cold-start behavior:
 * - New users get 0% mastery for all concepts
 * - This ensures lessons without prerequisites are accessible
 * - Prerequisite checks work correctly from day one
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

      // Start with default mastery levels (cold-start handling)
      const levels: Record<ConceptId, number> = getDefaultMasteryLevels();

      // Override with actual mastery data from API
      response.data.items.forEach(item => {
        levels[item.conceptId as ConceptId] = item.masteryLevel;
      });

      return levels;
    },
    enabled: !!uid,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Return defaults when loading or error to prevent empty object issues
  const defaultLevels = getDefaultMasteryLevels();

  return {
    masteryLevels: query.data || defaultLevels,
    isLoading: query.isLoading,
    isError: query.isError,
    isColdStart: query.data ? Object.keys(query.data).every(k => query.data![k as ConceptId] === 0) : true,
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
