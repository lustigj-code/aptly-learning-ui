/**
 * Progress API Client
 * Handles all progress-related API endpoints
 */

import { post, get, buildQueryString, type ApiResponse } from './client';

// ============================================
// REQUEST TYPES
// ============================================

export type CompleteAtomRequest = {
  atomId: string;
  lessonId: string;
  moduleId: string;
  courseId: string;
  score?: number;
  timeSpentSeconds?: number;
};

export type CompleteLessonRequest = {
  lessonId: string;
  moduleId: string;
  courseId: string;
};

export type UpdateStreakRequest = {
  userId?: string;
};

// ============================================
// RESPONSE TYPES
// ============================================

export type CelebrationData = {
  xpEarned: number;
  newLevel?: number;
  badge?: { id: string; title: string };
  streakMilestone?: number;
  message: string;
  type?: 'lesson-complete' | 'module-complete' | 'course-complete';
};

export type CompleteAtomResponse = {
  success: boolean;
  xpEarned: number;
  newLevel: number;
  leveledUp: boolean;
  celebration: CelebrationData;
  message?: string;
};

export type CompleteLessonResponse = {
  success: boolean;
  lessonComplete: boolean;
  moduleComplete: boolean;
  courseComplete: boolean;
  nextModuleId?: string | null;
  message: string;
  celebration: CelebrationData;
  completedCount?: number;
  totalRequired?: number;
};

export type UpdateStreakResponse = {
  success: boolean;
  currentStreak: number;
  longestStreak?: number;
  frozeApplied: boolean;
  freezesRemaining?: number;
  message: string;
};

export type UseFreezeResponse = {
  success: boolean;
  message: string;
  freezesRemaining: number;
  frozeDate?: string;
};

export type CourseProgressData = {
  courseId: string;
  completedAtoms: number;
  totalAtoms: number;
  percentage: number;
  currentLesson?: string;
  currentAtom?: string;
  lessonsCompleted: number;
  lessonsTotal: number;
};

export type GetProgressByCourseResponse = {
  progress: CourseProgressData;
};

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Mark an atom as complete and award XP
 * Server-side calculation ensures no client-side cheating
 *
 * @param data - Atom completion data
 * @returns XP earned, level info, and celebration data
 */
export async function completeAtom(
  data: CompleteAtomRequest
): Promise<ApiResponse<CompleteAtomResponse>> {
  return post<CompleteAtomResponse>('/api/progress/complete-atom', data);
}

/**
 * Mark a lesson as complete when all required atoms are done
 * Automatically checks for module and course completion
 *
 * @param data - Lesson completion data
 * @returns Completion status and celebration data
 */
export async function completeLesson(
  data: CompleteLessonRequest
): Promise<ApiResponse<CompleteLessonResponse>> {
  return post<CompleteLessonResponse>('/api/progress/complete-lesson', data);
}

/**
 * Update daily streak based on activity
 * Handles streak continuation, freeze application, and reset logic
 *
 * @param data - Optional user ID (defaults to authenticated user)
 * @returns Current streak status
 */
export async function updateStreak(
  data: UpdateStreakRequest = {}
): Promise<ApiResponse<UpdateStreakResponse>> {
  return post<UpdateStreakResponse>('/api/progress/update-streak', data);
}

/**
 * Manually apply a streak freeze to prevent streak loss
 * Sets lastCompletedDate to yesterday to "freeze" the streak
 *
 * @returns Freeze application result
 */
export async function useFreeze(): Promise<ApiResponse<UseFreezeResponse>> {
  return post<UseFreezeResponse>('/api/progress/use-freeze', {});
}

/**
 * Get user's progress for a specific course
 *
 * @param userId - User ID
 * @param courseId - Course ID
 * @returns Course progress data
 */
export async function getProgressByCourse(
  userId: string,
  courseId: string
): Promise<ApiResponse<GetProgressByCourseResponse>> {
  const queryString = buildQueryString({ userId, courseId });
  return get<GetProgressByCourseResponse>(`/api/progress/by-course${queryString}`);
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Complete an atom and get just the XP earned
 * Simplified version for common use cases
 */
export async function completeAtomSimple(
  atomId: string,
  lessonId: string,
  moduleId: string,
  courseId: string
): Promise<{ xpEarned: number; success: boolean }> {
  const response = await completeAtom({
    atomId,
    lessonId,
    moduleId,
    courseId,
  });

  if (response.success) {
    return {
      xpEarned: response.data.xpEarned,
      success: true,
    };
  }

  return {
    xpEarned: 0,
    success: false,
  };
}

/**
 * Check if a course is complete
 */
export async function isCourseComplete(
  userId: string,
  courseId: string
): Promise<boolean> {
  const response = await getProgressByCourse(userId, courseId);

  if (response.success) {
    return response.data.progress.percentage === 100;
  }

  return false;
}

/**
 * Get progress percentage for a course
 */
export async function getCourseProgressPercentage(
  userId: string,
  courseId: string
): Promise<number> {
  const response = await getProgressByCourse(userId, courseId);

  if (response.success) {
    return response.data.progress.percentage;
  }

  return 0;
}
