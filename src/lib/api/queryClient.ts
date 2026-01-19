/**
 * React Query Configuration
 * Phase 6.1: Query Optimization - Client-side caching
 */

import { QueryClient, DefaultOptions } from '@tanstack/react-query';

const queryConfig: DefaultOptions = {
  queries: {
    // Stale time: Data is fresh for 5 minutes
    staleTime: 5 * 60 * 1000,

    // Cache time: Keep data in cache for 30 minutes
    gcTime: 30 * 60 * 1000,

    // Retry failed requests
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

    // Refetch on window focus for user profile and progress
    refetchOnWindowFocus: true,

    // Refetch on reconnect
    refetchOnReconnect: true,

    // Don't refetch on mount if data is fresh
    refetchOnMount: false,
  },
  mutations: {
    // Retry mutations only for network errors
    retry: (failureCount, error: unknown) => {
      const err = error as { status?: number };
      if (err?.status && err.status >= 400 && err.status < 500) {
        return false; // Don't retry client errors
      }
      return failureCount < 2; // Retry network errors twice
    },
  },
};

export const queryClient = new QueryClient({
  defaultOptions: queryConfig,
});

// Query keys for consistent cache management
export const queryKeys = {
  // User data
  user: (uid: string) => ['user', uid] as const,
  userProgress: (uid: string) => ['userProgress', uid] as const,
  userAchievements: (uid: string) => ['userAchievements', uid] as const,

  // Courses
  courses: () => ['courses'] as const,
  course: (courseId: string) => ['courses', courseId] as const,
  courseProgress: (uid: string, courseId: string) => ['courseProgress', uid, courseId] as const,

  // Lessons
  lesson: (lessonId: string) => ['lessons', lessonId] as const,
  module: (courseId: string, moduleId: string) => ['modules', courseId, moduleId] as const,

  // Badges
  badges: () => ['badges'] as const,
  badgeProgress: (uid: string) => ['badgeProgress', uid] as const,

  // Coach conversations
  conversation: (conversationId: string) => ['conversation', conversationId] as const,
  conversations: (uid: string) => ['conversations', uid] as const,

  // Reviews (FSRS)
  reviewQueue: (uid: string) => ['reviewQueue', uid] as const,
  reviewsDue: (uid: string) => ['reviewsDue', uid] as const,

  // Mastery levels (for prerequisite checking)
  masteryLevels: (uid: string) => ['masteryLevels', uid] as const,
} as const;

// ============================================
// QUIZ RESULT EVENT BUS
// ============================================

type QuizResultListener = (uid: string) => void;
const quizResultListeners = new Set<QuizResultListener>();

/**
 * Event emitter for quiz result events.
 * Call this when a quiz is completed to trigger immediate cache invalidation
 * of mastery-related queries.
 */
export function emitQuizResult(uid: string): void {
  quizResultListeners.forEach((listener) => listener(uid));
}

/**
 * Subscribe to quiz result events.
 * Returns an unsubscribe function.
 */
export function onQuizResult(listener: QuizResultListener): () => void {
  quizResultListeners.add(listener);
  return () => {
    quizResultListeners.delete(listener);
  };
}

/**
 * Invalidate mastery levels cache immediately.
 * Called internally when quiz results are emitted.
 */
export function invalidateMasteryLevels(uid: string): void {
  queryClient.invalidateQueries({ queryKey: queryKeys.masteryLevels(uid) });
  queryClient.invalidateQueries({ queryKey: queryKeys.reviewQueue(uid) });
}

// Pre-configured query invalidation patterns
export const invalidateQueries = {
  /**
   * Invalidate all user-related queries after profile update
   */
  userProfile: (uid: string) => {
    return [queryKeys.user(uid), queryKeys.userProgress(uid), queryKeys.userAchievements(uid)];
  },

  /**
   * Invalidate progress queries after atom completion
   */
  progress: (uid: string, courseId?: string) => {
    const queries: readonly (readonly string[])[] = [queryKeys.userProgress(uid), queryKeys.reviewQueue(uid)];
    const result = [...queries];
    if (courseId) {
      result.push(queryKeys.courseProgress(uid, courseId));
    }
    return result;
  },

  /**
   * Invalidate badge queries after earning a badge
   */
  badges: (uid: string) => {
    return [queryKeys.badgeProgress(uid), queryKeys.userAchievements(uid)];
  },
};
