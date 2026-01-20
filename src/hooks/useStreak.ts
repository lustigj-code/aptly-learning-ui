'use client';

/**
 * useStreak Hook
 *
 * Provides streak data and management with integrated notification triggers.
 * Automatically checks for streak-at-risk conditions and triggers notifications.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/store/authStore';
import { useProgress, useUnifiedStore } from '@/store/unifiedStore';

// ============================================
// TYPES
// ============================================

export type StreakData = {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string;
  freezesAvailable: number;
  freezesUsed: string[];
  streakHistory: Array<{
    date: string;
    completed: boolean;
    usedFreeze?: boolean;
  }>;
};

type UseStreakReturn = {
  streak: StreakData | null;
  isLoading: boolean;
  hasActivityToday: boolean;
  isAtRisk: boolean;
  hoursUntilMidnight: number;
  checkAndUpdateStreak: () => Promise<void>;
  useFreeze: () => Promise<boolean>;
};

// ============================================
// HOOK
// ============================================

export function useStreak(): UseStreakReturn {
  const { authUser: user } = useAuth();
  const { streak, isLoading, checkAndUpdateStreak } = useProgress();
  const streakFreezeAction = useUnifiedStore((state) => state.useStreakFreeze);

  // Track if we've already triggered a notification this session
  const hasTriggeredNotification = useRef(false);

  // Calculate derived values
  const today = new Date().toISOString().split('T')[0];
  const hasActivityToday = streak?.lastCompletedDate === today;

  // Calculate hours until midnight
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const hoursUntilMidnight = Math.floor(
    (midnight.getTime() - now.getTime()) / (1000 * 60 * 60)
  );

  // Determine if streak is at risk
  const isAtRisk =
    !!streak &&
    streak.currentStreak > 0 &&
    !hasActivityToday &&
    hoursUntilMidnight <= 2;

  // Trigger streak-at-risk notification check
  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return;

    // Skip if no user, no streak, or already triggered this session
    if (!user?.uid || !streak || isLoading || hasTriggeredNotification.current) {
      return;
    }

    // Skip if already completed today or no streak to protect
    if (hasActivityToday || streak.currentStreak < 1) {
      return;
    }

    // Check if streak is at risk (within 2 hours of midnight)
    if (isAtRisk) {
      hasTriggeredNotification.current = true;

      // Fire and forget - call the API endpoint to trigger notification
      fetch('/api/notifications/trigger-streak-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          currentStreak: streak.currentStreak,
          hoursRemaining: hoursUntilMidnight,
        }),
      }).catch((err) => {
        console.error('Failed to trigger streak notification check:', err);
      });
    }
  }, [user?.uid, streak, isLoading, hasActivityToday, isAtRisk, hoursUntilMidnight]);

  // Wrapper for the store's streak freeze function
  const freezeCallback = useCallback(async () => {
    return streakFreezeAction();
  }, [streakFreezeAction]);

  return {
    streak: streak as StreakData | null,
    isLoading,
    hasActivityToday,
    isAtRisk,
    hoursUntilMidnight,
    checkAndUpdateStreak,
    useFreeze: freezeCallback,
  };
}

// ============================================
// STREAK STATUS HOOK
// ============================================

/**
 * Lightweight hook for just checking streak status
 * Useful for displaying streak indicators in UI
 */
export function useStreakStatus() {
  const { streak, isLoading, hasActivityToday, isAtRisk, hoursUntilMidnight } =
    useStreak();

  return {
    currentStreak: streak?.currentStreak ?? 0,
    longestStreak: streak?.longestStreak ?? 0,
    freezesAvailable: streak?.freezesAvailable ?? 0,
    hasActivityToday,
    isAtRisk,
    hoursUntilMidnight,
    isLoading,
  };
}

// ============================================
// STREAK MILESTONE UTILS
// ============================================

const STREAK_MILESTONES = [7, 14, 30, 60, 100, 180, 365];

/**
 * Check if a streak count is a milestone
 */
export function isStreakMilestone(streakDays: number): boolean {
  return STREAK_MILESTONES.includes(streakDays);
}

/**
 * Get the next milestone for a given streak
 */
export function getNextMilestone(currentStreak: number): number | null {
  for (const milestone of STREAK_MILESTONES) {
    if (milestone > currentStreak) {
      return milestone;
    }
  }
  return null;
}

/**
 * Get days until next milestone
 */
export function getDaysToNextMilestone(currentStreak: number): number | null {
  const nextMilestone = getNextMilestone(currentStreak);
  if (!nextMilestone) return null;
  return nextMilestone - currentStreak;
}

export default useStreak;
