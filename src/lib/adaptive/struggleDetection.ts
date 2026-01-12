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

// ============================================================================
// ZPD-BASED ROUTING & BEHAVIORAL SIGNALS (Research-backed Enhancement)
// ============================================================================

/**
 * Zone of Proximal Development Classification
 *
 * Research-backed accuracy ranges:
 * - Frustration Zone: < 35% accuracy - too hard, needs direct help
 * - ZPD (Productive Struggle): 36-69% accuracy - optimal for learning
 * - Mastery Zone: > 70% accuracy - ready for new material
 *
 * Source: NWEA, Third Space Learning, LearnLM research
 */
export type InterventionZone = 'frustration' | 'zpd' | 'mastery';

/**
 * Behavioral signals for fast-track intervention
 *
 * These signals bypass normal tier progression and trigger immediate help.
 * Research shows these patterns indicate counterproductive struggle.
 */
export interface BehavioralSignals {
  rapidGuessing: boolean;     // < 3 seconds response time
  wheelSpinning: boolean;     // > 20 attempts on same skill without progress
  hintExhaustion: boolean;    // > 3 failed hints in a row
  videoSkipping: boolean;     // > 20% of video duration skipped
  frustrationDetected: boolean; // Linguistic frustration signals
}

/**
 * Recent interaction for behavioral analysis
 */
export interface RecentInteraction {
  skillId: string;
  responseTimeMs: number;
  isCorrect: boolean;
  usedHint: boolean;
  hintWasHelpful: boolean;
  timestamp: Date;
}

/**
 * Research-backed thresholds for behavioral signals
 */
const BEHAVIORAL_THRESHOLDS = {
  RAPID_GUESS_MS: 3000,       // < 3 seconds = guessing
  WHEEL_SPIN_ATTEMPTS: 20,    // > 20 attempts on same skill
  HINT_FAIL_CONSECUTIVE: 3,   // > 3 failed hints in a row
  VIDEO_SKIP_RATIO: 0.20,     // > 20% of video skipped
  ZPD_LOWER_BOUND: 0.36,      // 36% accuracy
  ZPD_UPPER_BOUND: 0.69,      // 69% accuracy
  MASTERY_THRESHOLD: 0.70,    // 70% accuracy
};

/**
 * Classify learner's zone based on recent accuracy
 *
 * @param recentAccuracy - Accuracy over recent attempts (0-1)
 * @returns The intervention zone classification
 */
export function classifyZone(recentAccuracy: number): InterventionZone {
  if (recentAccuracy < BEHAVIORAL_THRESHOLDS.ZPD_LOWER_BOUND) {
    return 'frustration';
  }
  if (recentAccuracy > BEHAVIORAL_THRESHOLDS.MASTERY_THRESHOLD) {
    return 'mastery';
  }
  return 'zpd'; // 36-70% = Zone of Proximal Development
}

/**
 * Calculate recent accuracy from interactions
 */
export function calculateRecentAccuracy(
  interactions: RecentInteraction[],
  windowSize: number = 10
): number {
  const recent = interactions.slice(-windowSize);
  if (recent.length === 0) return 0.5; // Neutral if no data

  const correctCount = recent.filter(i => i.isCorrect).length;
  return correctCount / recent.length;
}

/**
 * Detect behavioral signals that warrant fast-track intervention
 *
 * These signals indicate counterproductive struggle and should bypass
 * normal Socratic progression to provide immediate help.
 */
export function detectBehavioralSignals(
  interactions: RecentInteraction[]
): BehavioralSignals {
  const recent = interactions.slice(-10);

  return {
    rapidGuessing: detectRapidGuessing(recent),
    wheelSpinning: detectWheelSpinning(interactions),
    hintExhaustion: detectHintExhaustion(interactions),
    videoSkipping: false, // Requires video analytics integration
    frustrationDetected: false, // Set by linguistic detection separately
  };
}

/**
 * Detect rapid guessing (< 3 seconds per response)
 */
function detectRapidGuessing(interactions: RecentInteraction[]): boolean {
  if (interactions.length < 3) return false;

  // Check if majority of recent responses are too fast
  const rapidCount = interactions.filter(
    i => i.responseTimeMs < BEHAVIORAL_THRESHOLDS.RAPID_GUESS_MS
  ).length;

  return rapidCount >= Math.ceil(interactions.length * 0.5); // 50%+ rapid
}

/**
 * Detect wheel spinning (> 20 attempts on same skill without progress)
 */
function detectWheelSpinning(interactions: RecentInteraction[]): boolean {
  if (interactions.length < BEHAVIORAL_THRESHOLDS.WHEEL_SPIN_ATTEMPTS) {
    return false;
  }

  // Get the most common skill in recent interactions
  const skillCounts = new Map<string, number>();
  for (const i of interactions) {
    skillCounts.set(i.skillId, (skillCounts.get(i.skillId) || 0) + 1);
  }

  // Find skill with most attempts
  let maxSkill = '';
  let maxCount = 0;
  for (const [skillId, count] of skillCounts) {
    if (count > maxCount) {
      maxCount = count;
      maxSkill = skillId;
    }
  }

  // Check if stuck on one skill with poor performance
  if (maxCount >= BEHAVIORAL_THRESHOLDS.WHEEL_SPIN_ATTEMPTS) {
    const skillInteractions = interactions.filter(i => i.skillId === maxSkill);
    const accuracy = skillInteractions.filter(i => i.isCorrect).length / skillInteractions.length;
    return accuracy < 0.5; // Still struggling after many attempts
  }

  return false;
}

/**
 * Detect hint exhaustion (> 3 failed hints in a row)
 */
function detectHintExhaustion(interactions: RecentInteraction[]): boolean {
  let consecutiveFailedHints = 0;

  // Count from most recent backward
  for (let i = interactions.length - 1; i >= 0; i--) {
    const interaction = interactions[i];
    if (interaction.usedHint && !interaction.hintWasHelpful) {
      consecutiveFailedHints++;
    } else if (interaction.usedHint && interaction.hintWasHelpful) {
      break; // Reset on successful hint
    }
  }

  return consecutiveFailedHints >= BEHAVIORAL_THRESHOLDS.HINT_FAIL_CONSECUTIVE;
}

// ============================================================================
// LINGUISTIC FRUSTRATION DETECTION
// ============================================================================

/**
 * Frustration patterns detected in user messages
 *
 * Source: ACL Anthology frustration detection research, LearnLM
 */
const FRUSTRATION_PATTERNS = [
  /i don'?t (know|understand|get it)/i,
  /that doesn'?t (help|make sense)/i,
  /i am (drowning|lost|confused|stuck)/i,
  /this is (impossible|too hard|frustrating)/i,
  /^(idk|no|nope|what\??)$/i,
  /i give up/i,
  /just tell me (the answer|what to do)/i,
  /this makes no sense/i,
  /i('m| am) (so )?confused/i,
  /nothing (works|is working)/i,
];

/**
 * Detect linguistic frustration in user message
 *
 * @param message - User's message text
 * @returns Detection result with confidence and matched pattern
 */
export function detectLinguisticFrustration(message: string): {
  isFrustrated: boolean;
  confidence: number;
  matchedPattern?: string;
} {
  const normalized = message.toLowerCase().trim();

  // Check for frustration patterns
  for (const pattern of FRUSTRATION_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        isFrustrated: true,
        confidence: 0.8,
        matchedPattern: pattern.source,
      };
    }
  }

  // Check for very short, dismissive responses
  if (normalized.length < 5 && ['no', 'idk', 'what', '?', '??', 'huh'].includes(normalized)) {
    return {
      isFrustrated: true,
      confidence: 0.6,
      matchedPattern: 'short_dismissive',
    };
  }

  return {
    isFrustrated: false,
    confidence: 0.2,
  };
}

/**
 * Intervention strategy based on zone and signals
 */
export interface InterventionStrategy {
  tier: 1 | 2 | 3;
  type: 'socratic' | 'hint' | 'worked_example' | 'direct_explanation' | 'practice';
  immediate: boolean;
  reason: string;
}

/**
 * Select intervention strategy based on ZPD zone and behavioral signals
 *
 * This is the main decision function for the 3-tier intervention hierarchy.
 * Combines ZPD classification with behavioral signal detection.
 */
export function selectInterventionStrategy(
  zone: InterventionZone,
  currentTier: 1 | 2 | 3,
  behavioralSignals: BehavioralSignals,
  recentAccuracy: number
): InterventionStrategy {
  // Fast-track to Tier 3 on critical behavioral signals
  if (behavioralSignals.rapidGuessing) {
    return {
      tier: 3,
      type: 'worked_example',
      immediate: true,
      reason: 'Rapid guessing detected - providing worked example',
    };
  }

  if (behavioralSignals.wheelSpinning) {
    return {
      tier: 3,
      type: 'worked_example',
      immediate: true,
      reason: 'Wheel spinning detected - breaking the cycle with worked example',
    };
  }

  if (behavioralSignals.hintExhaustion) {
    return {
      tier: 3,
      type: 'worked_example',
      immediate: true,
      reason: 'Hints not helping - showing complete worked example',
    };
  }

  if (behavioralSignals.frustrationDetected) {
    return {
      tier: 3,
      type: 'direct_explanation',
      immediate: true,
      reason: 'Frustration detected - providing clear explanation',
    };
  }

  // Zone-based routing
  switch (zone) {
    case 'frustration':
      // Below 35% accuracy - too hard, skip Socratic approach
      return {
        tier: 3,
        type: 'direct_explanation',
        immediate: true,
        reason: 'Accuracy too low for productive struggle',
      };

    case 'zpd':
      // 36-69% accuracy - optimal for Socratic method
      return {
        tier: currentTier,
        type: currentTier === 1 ? 'socratic' : currentTier === 2 ? 'hint' : 'worked_example',
        immediate: false,
        reason: 'In Zone of Proximal Development - using Socratic approach',
      };

    case 'mastery':
      // Above 70% accuracy - ready for more challenge
      return {
        tier: 1,
        type: 'practice',
        immediate: false,
        reason: 'High accuracy - ready for new material or harder practice',
      };
  }
}

/**
 * Semi-Socratic questioning decision
 *
 * Research shows 34% questioning ratio is optimal (not 100% Socratic).
 * Source: LearnLM/Google DeepMind tutoring research
 */
export function shouldAskQuestion(interactionCount: number): boolean {
  // 34% of the time, ask a question; 66% give direct guidance
  return Math.random() < 0.34;
}

export { BEHAVIORAL_THRESHOLDS };
