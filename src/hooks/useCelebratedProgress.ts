'use client';

import { useCallback } from 'react';
import { useCelebration } from '@/components/celebration/CelebrationSystem';
import { useUnifiedStore, useUser } from '@/store/unifiedStore';
import type { Badge } from '@/types';

/**
 * Hook that wraps progress actions with celebration effects
 * Use this instead of directly calling store actions when you want
 * celebrations to trigger automatically
 */
export function useCelebratedProgress() {
  const { celebrate, celebrateBadge, celebrateStreak, celebrateXP } = useCelebration();
  const { user, addXP, earnBadge: baseEarnBadge, checkAndUpdateStreak } = useUser();

  // Store methods
  const completeAtom = useUnifiedStore((state) => state.completeAtom);
  const completeLesson = useUnifiedStore((state) => state.completeLesson);
  const completeModule = useUnifiedStore((state) => state.completeModule);
  const completeCourse = useUnifiedStore((state) => state.completeCourse);

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
    },
    [completeAtom, addXP, celebrate]
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
    },
    [completeLesson, addXP, celebrate, checkAndUpdateStreak]
  );

  /**
   * Complete a module with celebration
   */
  const completeModuleWithCelebration = useCallback(
    async (moduleId: string, xpReward: number = 250) => {
      await completeModule(moduleId);
      await addXP(xpReward);
      celebrate(4, 'Module Complete!');
    },
    [completeModule, addXP, celebrate]
  );

  /**
   * Complete a course with celebration
   */
  const completeCourseWithCelebration = useCallback(
    async (courseId: string, xpReward: number = 500) => {
      await completeCourse(courseId);
      await addXP(xpReward);
      celebrate(5, 'Course Complete!', `course-${courseId}-badge`);
    },
    [completeCourse, addXP, celebrate]
  );

  /**
   * Check and update streak with celebration
   */
  const updateStreakWithCelebration = useCallback(async () => {
    const currentStreak = user?.streak?.currentStreak || 0;
    await checkAndUpdateStreak();

    const newStreak = currentStreak + 1;

    // Celebrate milestones
    if (newStreak === 7 || newStreak === 30 || newStreak === 100 || newStreak === 365) {
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
 * Hook specifically for quiz celebrations
 */
export function useQuizCelebration() {
  const { celebrate, celebrateXP } = useCelebration();
  const { addXP } = useUser();

  const onQuizComplete = useCallback(
    async (score: number, passed: boolean) => {
      if (passed) {
        const xp = score >= 90 ? 100 : score >= 70 ? 75 : 50;
        await addXP(xp);
        celebrate(2, score === 100 ? 'Perfect Score!' : 'Quiz Passed!');
      }
    },
    [addXP, celebrate]
  );

  const onCorrectAnswer = useCallback(() => {
    celebrateXP(10);
  }, [celebrateXP]);

  const onIncorrectAnswer = useCallback(() => {
    // Could add a subtle feedback here
  }, []);

  return {
    onQuizComplete,
    onCorrectAnswer,
    onIncorrectAnswer,
  };
}
