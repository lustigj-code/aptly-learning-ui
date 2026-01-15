'use client';

import { useCallback } from 'react';
import { useCelebration } from '@/components/celebration/CelebrationSystem';
import { useUser, useUserProfileStore } from '@/store/userProfileStore';
import { useAuthStore } from '@/store';
import { emitQuizResult } from '@/lib/api/queryClient';
import type { Badge } from '@/types';
import { SCORE_THRESHOLDS, XP, STREAK } from '@/config/constants';
import { useBadgeCheck } from './useBadgeCheck';

/**
 * Hook that wraps progress actions with celebration effects
 * Use this instead of directly calling store actions when you want
 * celebrations to trigger automatically
 */
export function useCelebratedProgress() {
  const { celebrate, celebrateBadge, celebrateStreak, celebrateXP } = useCelebration();
  const { user, addXP, earnBadge: baseEarnBadge, checkAndUpdateStreak } = useUser();
  const { checkBadgesAfterProgress } = useBadgeCheck();

  // Store methods
  const completeAtom = useUserProfileStore((state) => state.completeAtom);
  const completeLesson = useUserProfileStore((state) => state.completeLesson);
  const completeModule = useUserProfileStore((state) => state.completeModule);
  const completeCourse = useUserProfileStore((state) => state.completeCourse);

  /**
   * Add XP with celebration effect
   */
  const addXPWithCelebration = useCallback(
    async (amount: number) => {
      await addXP(amount);
      celebrateXP(amount);
    },
    [addXP, celebrateXP]
  );

  /**
   * Earn a badge with celebration
   */
  const earnBadgeWithCelebration = useCallback(
    async (badgeId: string) => {
      // Find the badge definition
      const badge = user?.badges?.find((b) => b.id === badgeId);

      await baseEarnBadge(badgeId);

      // Trigger celebration if we have badge info
      if (badge) {
        celebrateBadge(badge, 75);
      } else {
        // Fallback celebration if badge not found in user's badge list
        celebrate(3, 'New Badge Earned!', badgeId);
      }
    },
    [baseEarnBadge, user?.badges, celebrateBadge, celebrate]
  );

  /**
   * Complete an atom with celebration
   */
  const completeAtomWithCelebration = useCallback(
    async (atomId: string, xpReward: number = 25) => {
      await completeAtom(atomId);
      await addXP(xpReward);
      celebrate(1, 'Content Complete!');

      // Check for any badges earned (non-blocking)
      if (user?.id) {
        checkBadgesAfterProgress(user.id);
      }
    },
    [completeAtom, addXP, celebrate, user?.id, checkBadgesAfterProgress]
  );

  /**
   * Complete a lesson with celebration
   */
  const completeLessonWithCelebration = useCallback(
    async (lessonId: string, xpReward: number = 100) => {
      await completeLesson(lessonId);
      await addXP(xpReward);
      celebrate(3, 'Lesson Complete!');

      // Update streak on lesson completion
      await checkAndUpdateStreak();

      // Check for any badges earned (non-blocking)
      if (user?.id) {
        checkBadgesAfterProgress(user.id);
      }
    },
    [completeLesson, addXP, celebrate, checkAndUpdateStreak, user?.id, checkBadgesAfterProgress]
  );

  /**
   * Complete a module with celebration
   */
  const completeModuleWithCelebration = useCallback(
    async (moduleId: string, xpReward: number = 250) => {
      await completeModule(moduleId);
      await addXP(xpReward);
      celebrate(4, 'Module Complete!');

      // Check for any badges earned (non-blocking)
      if (user?.id) {
        checkBadgesAfterProgress(user.id);
      }
    },
    [completeModule, addXP, celebrate, user?.id, checkBadgesAfterProgress]
  );

  /**
   * Complete a course with celebration
   */
  const completeCourseWithCelebration = useCallback(
    async (courseId: string, xpReward: number = 500) => {
      await completeCourse(courseId);
      await addXP(xpReward);
      celebrate(5, 'Course Complete!', `course-${courseId}-badge`);

      // Check for any badges earned (non-blocking)
      if (user?.id) {
        checkBadgesAfterProgress(user.id);
      }
    },
    [completeCourse, addXP, celebrate, user?.id, checkBadgesAfterProgress]
  );

  /**
   * Check and update streak with celebration
   */
  const updateStreakWithCelebration = useCallback(async () => {
    const currentStreak = user?.streak?.currentStreak || 0;
    await checkAndUpdateStreak();

    const newStreak = currentStreak + 1;

    // Celebrate milestones
    if (STREAK.MILESTONE_DAYS.includes(newStreak)) {
      celebrateStreak(newStreak);
    }
  }, [user?.streak?.currentStreak, checkAndUpdateStreak, celebrateStreak]);

  /**
   * Quiz passed celebration
   */
  const celebrateQuizPassed = useCallback(
    (score: number) => {
      const xp = score === 100 ? 100 : 50;
      addXP(xp);
      celebrate(2, `Quiz Passed! ${score}%`);
    },
    [addXP, celebrate]
  );

  /**
   * Correct answer celebration (quick feedback)
   */
  const celebrateCorrectAnswer = useCallback(() => {
    celebrateXP(10);
  }, [celebrateXP]);

  return {
    // Wrapped methods with celebrations
    addXP: addXPWithCelebration,
    earnBadge: earnBadgeWithCelebration,
    completeAtom: completeAtomWithCelebration,
    completeLesson: completeLessonWithCelebration,
    completeModule: completeModuleWithCelebration,
    completeCourse: completeCourseWithCelebration,
    updateStreak: updateStreakWithCelebration,
    celebrateQuizPassed,
    celebrateCorrectAnswer,

    // Direct celebration triggers
    celebrate,
    celebrateBadge,
    celebrateStreak,
    celebrateXP,
  };
}

/**
 * Hook specifically for quiz celebrations.
 * Also handles cache invalidation for mastery levels.
 */
export function useQuizCelebration() {
  const { celebrate, celebrateXP } = useCelebration();
  const { addXP } = useUser();
  const authUser = useAuthStore((state) => state.authUser);

  const onQuizComplete = useCallback(
    async (score: number, passed: boolean) => {
      // Emit quiz result event to trigger mastery levels cache invalidation
      // This ensures the UI immediately reflects updated progress
      if (authUser?.uid) {
        emitQuizResult(authUser.uid);
      }

      if (passed) {
        const xp = score >= SCORE_THRESHOLDS.EXCELLENT ? SCORE_THRESHOLDS.EXCELLENT_XP : score >= SCORE_THRESHOLDS.GOOD ? SCORE_THRESHOLDS.GOOD_XP : SCORE_THRESHOLDS.FAIR_XP;
        await addXP(xp);
        celebrate(2, score === 100 ? 'Perfect Score!' : 'Quiz Passed!');
      }
    },
    [addXP, celebrate, authUser?.uid]
  );

  const onCorrectAnswer = useCallback(() => {
    celebrateXP(XP.ATOM_COMPLETION);

    // Also emit quiz result for individual correct answers to update mastery
    if (authUser?.uid) {
      emitQuizResult(authUser.uid);
    }
  }, [celebrateXP, authUser?.uid]);

  const onIncorrectAnswer = useCallback(() => {
    // Emit on incorrect as well - mastery may decrease
    if (authUser?.uid) {
      emitQuizResult(authUser.uid);
    }
  }, [authUser?.uid]);

  return {
    onQuizComplete,
    onCorrectAnswer,
    onIncorrectAnswer,
  };
}
