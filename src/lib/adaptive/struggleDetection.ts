/**
 * Struggle Detection System
 *
 * Detects when a learner is struggling and recommends interventions:
 * - Consecutive wrong answers
 * - Mastery stalling (P(mastery) not improving)
 * - Time increasing per question
 * - Hint dependency
 * - Frequent coach requests
 */

import { type SkillState, type SkillMap, type BKTParameters } from '@/lib/mastery/bkt';
import { AI_AT_WORK_SKILL_MAP, getSkillName, getPrerequisites } from '@/data/skillMap';
import type { CoachContextData } from '@/lib/utils/coachContext';

// ============================================
// TYPES
// ============================================

export interface StruggleSignals {
  skillId: string;
  severity: 'mild' | 'moderate' | 'severe';
  signals: {
    consecutiveWrong: number;
    masteryStalling: boolean;
    timeIncreasing: boolean;
    hintDependency: boolean;
    coachRequests: number;
    retryCount: number;
  };
  confidence: number; // 0-1, how sure are we they're struggling?
}

export interface AttemptHistory {
  skillId: string;
  timestamp: Date;
  correct: boolean;
  timeSpentSeconds: number;
  usedHint: boolean;
  askedCoach: boolean;
}

export type InterventionType =
  | 'alternative_explanation'
  | 'prerequisite_review'
  | 'simpler_practice'
  | 'coach_session'
  | 'break_suggestion'
  | 'skip_for_now';

export interface Intervention {
  type: InterventionType;
  reason: string;
  action: InterventionAction;
  priority: number; // 1 = highest
  estimatedMinutes: number;
}

export interface InterventionAction {
  actionType: 'insert_content' | 'replace_content' | 'show_coach' | 'navigate' | 'pause';
  targetId?: string;
  targetSkillId?: string;
  message?: string;
  data?: Record<string, unknown>;
}

// ============================================
// STRUGGLE DETECTION THRESHOLDS
// ============================================

const THRESHOLDS = {
  // Consecutive wrong answers
  CONSECUTIVE_WRONG_MILD: 2,
  CONSECUTIVE_WRONG_MODERATE: 3,
  CONSECUTIVE_WRONG_SEVERE: 5,

  // Mastery improvement
  MASTERY_STALL_ATTEMPTS: 5,
  MASTERY_STALL_MIN_DELTA: 0.05, // Must improve by 5% or more

  // Time patterns
  TIME_INCREASE_RATIO: 1.5, // 50% longer than baseline

  // Hint usage
  HINT_DEPENDENCY_RATIO: 0.8, // Uses hints 80%+ of the time

  // Coach requests
  COACH_REQUESTS_THRESHOLD: 2,

  // Overall confidence thresholds
  CONFIDENCE_TRIGGER: 0.6, // Need 60%+ confidence to trigger intervention
};

// ============================================
// MAIN DETECTION FUNCTIONS
// ============================================

/**
 * Detect if user is struggling with a skill
 */
export function detectStruggle(
  userId: string,
  skillId: string,
  recentAttempts: AttemptHistory[]
): StruggleSignals {
  // Filter attempts for this skill
  const skillAttempts = recentAttempts.filter(a => a.skillId === skillId);

  if (skillAttempts.length === 0) {
    return createNoStruggleSignal(skillId);
  }

  // Calculate each signal
  const consecutiveWrong = countConsecutiveWrong(skillAttempts);
  const masteryStalling = isMasteryStalling(skillAttempts);
  const timeIncreasing = isTimeIncreasing(skillAttempts);
  const hintDependency = checkHintDependency(skillAttempts);
  const coachRequests = countCoachRequests(skillAttempts);
  const retryCount = skillAttempts.length;

  // Calculate severity
  const severity = calculateSeverity({
    consecutiveWrong,
    masteryStalling,
    timeIncreasing,
    hintDependency,
    coachRequests,
    retryCount,
  });

  // Calculate confidence
  const confidence = calculateConfidence({
    consecutiveWrong,
    masteryStalling,
    timeIncreasing,
    hintDependency,
    coachRequests,
    retryCount,
    totalAttempts: skillAttempts.length,
  });

  return {
    skillId,
    severity,
    signals: {
      consecutiveWrong,
      masteryStalling,
      timeIncreasing,
      hintDependency,
      coachRequests,
      retryCount,
    },
    confidence,
  };
}

/**
 * Recommend intervention based on struggle type
 */
export function recommendIntervention(
  signals: StruggleSignals,
  userContext?: CoachContextData
): Intervention {
  const { skillId, severity, signals: s } = signals;

  // Severe: Suggest taking a break or skipping
  if (severity === 'severe' && s.consecutiveWrong >= THRESHOLDS.CONSECUTIVE_WRONG_SEVERE) {
    return {
      type: 'break_suggestion',
      reason: `You've been working hard on "${getSkillName(skillId)}". Sometimes a break helps concepts click.`,
      action: {
        actionType: 'pause',
        message: 'Take a 5-minute break, then try a different topic.',
      },
      priority: 1,
      estimatedMinutes: 5,
    };
  }

  // Mastery stalling: Review prerequisite
  if (s.masteryStalling) {
    const weakPrereq = findRootCause(skillId, {}, AI_AT_WORK_SKILL_MAP);
    if (weakPrereq) {
      return {
        type: 'prerequisite_review',
        reason: `Let's strengthen your foundation. "${getSkillName(weakPrereq)}" will help this make more sense.`,
        action: {
          actionType: 'insert_content',
          targetSkillId: weakPrereq,
          targetId: `review-${weakPrereq}`,
        },
        priority: 2,
        estimatedMinutes: 5,
      };
    }
  }

  // Consecutive wrong answers: Alternative explanation
  if (s.consecutiveWrong >= THRESHOLDS.CONSECUTIVE_WRONG_MODERATE) {
    return {
      type: 'alternative_explanation',
      reason: `Let me try explaining "${getSkillName(skillId)}" differently.`,
      action: {
        actionType: 'replace_content',
        targetSkillId: skillId,
        data: { variant: 'simpler' },
      },
      priority: 2,
      estimatedMinutes: 3,
    };
  }

  // Time increasing + hint dependency: Simpler practice
  if (s.timeIncreasing || s.hintDependency) {
    return {
      type: 'simpler_practice',
      reason: `Let's try some simpler practice questions to build confidence.`,
      action: {
        actionType: 'insert_content',
        targetSkillId: skillId,
        targetId: `practice-easy-${skillId}`,
        data: { difficulty: 'easy' },
      },
      priority: 3,
      estimatedMinutes: 5,
    };
  }

  // Multiple coach requests: Coach session
  if (s.coachRequests >= THRESHOLDS.COACH_REQUESTS_THRESHOLD) {
    return {
      type: 'coach_session',
      reason: `I see you have questions. Let's work through "${getSkillName(skillId)}" together.`,
      action: {
        actionType: 'show_coach',
        targetSkillId: skillId,
        message: 'Starting focused coaching session',
      },
      priority: 2,
      estimatedMinutes: 10,
    };
  }

  // Default: Alternative explanation
  return {
    type: 'alternative_explanation',
    reason: `Let me help you understand "${getSkillName(skillId)}" better.`,
    action: {
      actionType: 'show_coach',
      targetSkillId: skillId,
    },
    priority: 3,
    estimatedMinutes: 3,
  };
}

/**
 * Find the weakest prerequisite (root cause of struggle)
 */
export function findRootCause(
  skillId: string,
  skillStates: Record<string, SkillState>,
  skillMap: SkillMap
): string | null {
  const prereqs = getPrerequisites(skillId);

  if (prereqs.length === 0) return null;

  // Find prerequisite with lowest mastery
  let weakestPrereq: string | null = null;
  let lowestMastery = 1.0;

  for (const prereqId of prereqs) {
    const state = skillStates[prereqId];
    const mastery = state?.pMastery ?? 0;

    if (mastery < lowestMastery) {
      lowestMastery = mastery;
      weakestPrereq = prereqId;
    }
  }

  // Only return if prerequisite isn't fully mastered
  if (lowestMastery < 0.95) {
    return weakestPrereq;
  }

  return null;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Count consecutive wrong answers from most recent
 */
function countConsecutiveWrong(attempts: AttemptHistory[]): number {
  // Sort by timestamp descending (most recent first)
  const sorted = [...attempts].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );

  let count = 0;
  for (const attempt of sorted) {
    if (!attempt.correct) {
      count++;
    } else {
      break;
    }
  }

  return count;
}

/**
 * Check if mastery is stalling (not improving after many attempts)
 */
function isMasteryStalling(attempts: AttemptHistory[]): boolean {
  if (attempts.length < THRESHOLDS.MASTERY_STALL_ATTEMPTS) return false;

  // Check last N attempts for improvement pattern
  const recent = attempts.slice(-THRESHOLDS.MASTERY_STALL_ATTEMPTS);
  const correctCount = recent.filter(a => a.correct).length;
  const correctRatio = correctCount / recent.length;

  // Stalling if correct ratio is below 50% over many attempts
  return correctRatio < 0.5;
}

/**
 * Check if time per question is increasing
 */
function isTimeIncreasing(attempts: AttemptHistory[]): boolean {
  if (attempts.length < 3) return false;

  // Compare average time of first half vs second half
  const midpoint = Math.floor(attempts.length / 2);
  const firstHalf = attempts.slice(0, midpoint);
  const secondHalf = attempts.slice(midpoint);

  const avgFirst = average(firstHalf.map(a => a.timeSpentSeconds));
  const avgSecond = average(secondHalf.map(a => a.timeSpentSeconds));

  return avgSecond > avgFirst * THRESHOLDS.TIME_INCREASE_RATIO;
}

/**
 * Check if user is dependent on hints
 */
function checkHintDependency(attempts: AttemptHistory[]): boolean {
  if (attempts.length < 3) return false;

  const hintUsage = attempts.filter(a => a.usedHint).length;
  const hintRatio = hintUsage / attempts.length;

  return hintRatio >= THRESHOLDS.HINT_DEPENDENCY_RATIO;
}

/**
 * Count coach requests for this skill
 */
function countCoachRequests(attempts: AttemptHistory[]): number {
  return attempts.filter(a => a.askedCoach).length;
}

/**
 * Calculate struggle severity
 */
function calculateSeverity(signals: StruggleSignals['signals']): 'mild' | 'moderate' | 'severe' {
  const { consecutiveWrong, masteryStalling, timeIncreasing, hintDependency, coachRequests } = signals;

  // Severe conditions
  if (
    consecutiveWrong >= THRESHOLDS.CONSECUTIVE_WRONG_SEVERE ||
    (masteryStalling && consecutiveWrong >= 3)
  ) {
    return 'severe';
  }

  // Moderate conditions
  if (
    consecutiveWrong >= THRESHOLDS.CONSECUTIVE_WRONG_MODERATE ||
    masteryStalling ||
    (timeIncreasing && hintDependency)
  ) {
    return 'moderate';
  }

  // Mild conditions
  if (
    consecutiveWrong >= THRESHOLDS.CONSECUTIVE_WRONG_MILD ||
    timeIncreasing ||
    hintDependency ||
    coachRequests >= THRESHOLDS.COACH_REQUESTS_THRESHOLD
  ) {
    return 'mild';
  }

  return 'mild';
}

/**
 * Calculate confidence in struggle detection
 */
function calculateConfidence(signals: StruggleSignals['signals'] & { totalAttempts: number }): number {
  let confidence = 0;

  // More attempts = higher confidence
  if (signals.totalAttempts >= 5) confidence += 0.2;
  else if (signals.totalAttempts >= 3) confidence += 0.1;

  // Consecutive wrong is strong signal
  if (signals.consecutiveWrong >= 3) confidence += 0.3;
  else if (signals.consecutiveWrong >= 2) confidence += 0.15;

  // Mastery stalling is strong signal
  if (signals.masteryStalling) confidence += 0.25;

  // Time increasing indicates cognitive load
  if (signals.timeIncreasing) confidence += 0.1;

  // Hint dependency indicates lack of understanding
  if (signals.hintDependency) confidence += 0.1;

  // Coach requests show explicit need for help
  if (signals.coachRequests >= 2) confidence += 0.15;

  return Math.min(1, confidence);
}

/**
 * Create signal for no struggle detected
 */
function createNoStruggleSignal(skillId: string): StruggleSignals {
  return {
    skillId,
    severity: 'mild',
    signals: {
      consecutiveWrong: 0,
      masteryStalling: false,
      timeIncreasing: false,
      hintDependency: false,
      coachRequests: 0,
      retryCount: 0,
    },
    confidence: 0,
  };
}

/**
 * Calculate average of numbers
 */
function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// ============================================
// STRUGGLE TRACKING
// ============================================

/**
 * Track an attempt for struggle detection
 */
export function trackAttempt(
  userId: string,
  skillId: string,
  correct: boolean,
  timeSpentSeconds: number,
  usedHint: boolean = false,
  askedCoach: boolean = false
): AttemptHistory {
  return {
    skillId,
    timestamp: new Date(),
    correct,
    timeSpentSeconds,
    usedHint,
    askedCoach,
  };
}

/**
 * Check if intervention should be triggered
 */
export function shouldTriggerIntervention(signals: StruggleSignals): boolean {
  return (
    signals.confidence >= THRESHOLDS.CONFIDENCE_TRIGGER &&
    (signals.severity === 'moderate' || signals.severity === 'severe')
  );
}

// ============================================
// EXPORTS
// ============================================

export { THRESHOLDS };
