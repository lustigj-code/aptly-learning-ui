import type { BadgeCriteria, AssessmentScore, StreakData } from '@/types';

/**
 * Context for badge evaluation - flexible interface that accepts
 * UserProgress or partial progress data for badge evaluation
 */
export type BadgeEvaluationContext = {
  coursesCompleted?: string[];
  modulesCompleted?: string[];
  lessonsCompleted?: string[];
  atomsCompleted?: string[];
  assessmentScores?: AssessmentScore[];
  totalTimeSpentMinutes?: number;
  streak?: StreakData;
  /** Legacy field name for streak data */
  stripe?: StreakData;
  /** Optional completion details for fallback score checking */
  completionDetails?: Record<string, { score?: number }>;
};

/**
 * Evaluate badge criteria for a user
 * Returns true if user meets the criteria for the badge
 */
export async function evaluateBadgeCriteria(
  userId: string,
  criteria: BadgeCriteria,
  userProgress: BadgeEvaluationContext
): Promise<boolean> {
  switch (criteria.type) {
    case 'completion':
      return evaluateCompletionCriteria(criteria, userProgress);
    case 'streak':
      return evaluateStreakCriteria(criteria, userProgress);
    case 'score':
      return evaluateScoreCriteria(criteria, userProgress);
    case 'time':
      return evaluateTimeCriteria(criteria, userProgress);
    case 'custom':
      return false; // Custom logic handled separately
    default:
      return false;
  }
}

/**
 * Completion badges: finish a course/module/lesson
 * Checks if user has completed the entity specified in relatedEntityId
 */
function evaluateCompletionCriteria(
  criteria: BadgeCriteria,
  userProgress: BadgeEvaluationContext
): boolean {
  if (!criteria.relatedEntityId) return false;

  const entityId = criteria.relatedEntityId;

  // Course completion (IDs starting with 'c')
  if (entityId.startsWith('c')) {
    return userProgress.coursesCompleted?.includes(entityId) || false;
  }

  // Module completion (IDs starting with 'm')
  if (entityId.startsWith('m')) {
    return userProgress.modulesCompleted?.includes(entityId) || false;
  }

  // Lesson completion (IDs starting with 'l')
  if (entityId.startsWith('l')) {
    return userProgress.lessonsCompleted?.includes(entityId) || false;
  }

  // Atom completion (IDs starting with 'a')
  if (entityId.startsWith('a')) {
    return userProgress.atomsCompleted?.includes(entityId) || false;
  }

  return false;
}

/**
 * Streak badges: maintain a streak for N days
 * Checks if user's current streak meets or exceeds the threshold
 */
function evaluateStreakCriteria(
  criteria: BadgeCriteria,
  userProgress: BadgeEvaluationContext
): boolean {
  const threshold = criteria.threshold || 7; // Default 7 days
  const streakData = userProgress.streak || userProgress.stripe;
  const currentStreak = streakData?.currentStreak || 0;
  return currentStreak >= threshold;
}

/**
 * Score badges: achieve high score on quizzes/assessments
 * Checks if user has any assessment score >= threshold
 */
function evaluateScoreCriteria(
  criteria: BadgeCriteria,
  userProgress: BadgeEvaluationContext
): boolean {
  const threshold = criteria.threshold || 90; // Default 90%

  // Check if user has any assessment with score >= threshold
  if (userProgress.assessmentScores && Array.isArray(userProgress.assessmentScores)) {
    return userProgress.assessmentScores.some(
      (assessment) => assessment.score >= threshold
    );
  }

  // Fallback: check completionDetails if assessmentScores not available
  if (userProgress.completionDetails && typeof userProgress.completionDetails === 'object') {
    return Object.values(userProgress.completionDetails).some((detail) => {
      return typeof detail?.score === 'number' && detail.score >= threshold;
    });
  }

  return false;
}

/**
 * Time badges: spend N hours learning
 * Checks if user's total time spent meets or exceeds the threshold (in hours)
 */
function evaluateTimeCriteria(
  criteria: BadgeCriteria,
  userProgress: BadgeEvaluationContext
): boolean {
  const thresholdHours = criteria.threshold || 1; // Default 1 hour
  const thresholdMinutes = thresholdHours * 60;
  return (userProgress.totalTimeSpentMinutes || 0) >= thresholdMinutes;
}

/**
 * Calculate progress toward a badge criteria
 * Returns { current, target, label } for display
 */
export function calculateBadgeProgress(
  criteria: BadgeCriteria,
  userProgress: BadgeEvaluationContext
): {
  current: number;
  target: number;
  label: string;
} | null {
  const threshold = criteria.threshold || 0;

  switch (criteria.type) {
    case 'streak': {
      const streakData = userProgress.streak || userProgress.stripe;
      const current = streakData?.currentStreak || 0;
      const target = threshold || 7;
      return {
        current,
        target,
        label: `${current}/${target} days`,
      };
    }

    case 'time': {
      const target = threshold || 1;
      const targetMinutes = target * 60;
      const current = userProgress.totalTimeSpentMinutes || 0;
      const hours = Math.floor(current / 60);
      const minutes = current % 60;
      const targetHours = Math.floor(targetMinutes / 60);
      const targetMins = targetMinutes % 60;
      return {
        current,
        target: targetMinutes,
        label: `${hours}h ${minutes}m / ${targetHours}h ${targetMins}m`,
      };
    }

    case 'score': {
      const target = threshold || 90;
      // Count assessments with score >= threshold
      let current = 0;
      if (userProgress.assessmentScores && Array.isArray(userProgress.assessmentScores)) {
        current = userProgress.assessmentScores.filter(
          (assessment) => assessment.score >= target
        ).length;
      }
      return {
        current,
        target: 1, // Just need one assessment at target score
        label: `${current >= target ? 'Achieved' : 'In Progress'}: ${target}%+`,
      };
    }

    case 'completion': {
      if (!criteria.relatedEntityId) return null;

      const entityId = criteria.relatedEntityId;
      let current = 0;
      const target = 1; // Default target

      if (entityId.startsWith('c')) {
        current = (userProgress.coursesCompleted?.includes(entityId) ? 1 : 0) || 0;
      } else if (entityId.startsWith('m')) {
        current = (userProgress.modulesCompleted?.includes(entityId) ? 1 : 0) || 0;
      } else if (entityId.startsWith('l')) {
        current = (userProgress.lessonsCompleted?.includes(entityId) ? 1 : 0) || 0;
      } else if (entityId.startsWith('a')) {
        current = (userProgress.atomsCompleted?.includes(entityId) ? 1 : 0) || 0;
      }

      return {
        current,
        target,
        label: current >= target ? 'Completed' : 'In Progress',
      };
    }

    default:
      return null;
  }
}
