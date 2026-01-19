'use client';

import { useCallback } from 'react';
import { useCelebration } from '@/components/celebration/CelebrationSystem';
import { checkAndGetNewBadges, type EarnedBadge } from '@/lib/api/badgeApi';
import type { Badge } from '@/types';

/**
 * Hook that checks for new badges and triggers celebrations
 *
 * Use this after any progress update (atom completion, lesson completion, etc.)
 * to check if the user earned any new badges and show celebration toasts.
 */
export function useBadgeCheck() {
  const { celebrateBadge } = useCelebration();

  /**
   * Check badge criteria for user and trigger celebrations for new badges
   *
   * @param userId - User to check badges for
   * @returns Array of newly earned badges (for further processing if needed)
   */
  const checkAndCelebrateBadges = useCallback(
    async (userId: string): Promise<EarnedBadge[]> => {
      try {
        const newBadges = await checkAndGetNewBadges(userId);

        // Trigger celebration for each new badge
        for (const badge of newBadges) {
          // Create a minimal badge object for celebration
          const badgeForCelebration: Badge = {
            id: badge.id,
            title: badge.title,
            description: `You earned the "${badge.title}" badge!`,
            type: 'milestone',
            icon: 'trophy',
            rarity: 'uncommon',
            criteria: { type: 'custom' },
            earnedAt: new Date(badge.earnedAt),
          };

          celebrateBadge(badgeForCelebration, 75);
        }

        return newBadges;
      } catch (error) {
        console.error('[useBadgeCheck] Failed to check badges:', error);
        return [];
      }
    },
    [celebrateBadge]
  );

  /**
   * Convenience wrapper to check badges after a progress action
   * Non-blocking - doesn't throw errors, just logs them
   */
  const checkBadgesAfterProgress = useCallback(
    (userId: string) => {
      // Run async but don't await - fire and forget
      checkAndCelebrateBadges(userId).catch(() => {
        // Silently fail - badge check is not critical
      });
    },
    [checkAndCelebrateBadges]
  );

  return {
    checkAndCelebrateBadges,
    checkBadgesAfterProgress,
  };
}
