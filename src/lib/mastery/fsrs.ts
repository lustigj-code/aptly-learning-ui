/**
 * FSRS (Free Spaced Repetition Scheduler) Implementation
 *
 * Based on the FSRS algorithm by Jarrett Ye
 * https://github.com/open-spaced-repetition/fsrs4anki
 *
 * This is a simplified implementation adapted for concept mastery tracking
 *
 * SCALE CONVENTIONS:
 * - masteryLevel: 0-100 scale (percentage, e.g., 85 = 85% mastery)
 * - retrievability: 0-1 scale (probability, e.g., 0.9 = 90% recall probability)
 * - stability: days (positive number, minimum 0.1)
 * - difficulty: 1-10 scale (FSRS standard)
 * - score (input): 0-100 scale (quiz/practice score percentage)
 */

import type { FSRSState, ConceptMastery } from './knowledgeGraph';

// ============================================
// TYPES
// ============================================

export type ReviewRating = 1 | 2 | 3 | 4; // Again, Hard, Good, Easy

export type FSRSParameters = {
  requestRetention: number; // Target retention rate (e.g., 0.9 = 90%)
  maximumInterval: number; // Maximum days between reviews
  w: number[]; // Model weights (17 parameters)
};

// ============================================
// DEFAULT PARAMETERS
// ============================================

/**
 * Default FSRS parameters
 * These are optimized defaults from the FSRS research
 */
export const DEFAULT_PARAMETERS: FSRSParameters = {
  requestRetention: 0.9, // 90% retention target
  maximumInterval: 365, // Max 1 year between reviews
  // Default weights from FSRS-4.5
  w: [
    0.4072, // w0
    1.1829, // w1
    3.1262, // w2
    15.4722, // w3
    7.2102, // w4
    0.5316, // w5
    1.0651, // w6
    0.0234, // w7
    1.616, // w8
    0.1544, // w9
    1.0824, // w10
    1.9813, // w11
    0.0953, // w12
    0.2975, // w13
    2.2042, // w14
    0.2407, // w15
    2.9466, // w16
  ],
};

// ============================================
// CORE FSRS FUNCTIONS
// ============================================

/**
 * Create initial FSRS state for a new concept
 *
 * NOTE: stability must be > 0 to avoid division by zero in calculateRetrievability.
 * Using 0.1 as minimum safe value per FSRS research.
 */
export function createInitialFSRSState(): FSRSState {
  return {
    stability: 0.1, // Must be > 0 to avoid division by zero in retrievability calc
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    state: 'new',
  };
}

/**
 * Calculate the next review state based on a rating
 */
export function calculateNextState(
  currentState: FSRSState,
  rating: ReviewRating,
  params: FSRSParameters = DEFAULT_PARAMETERS
): { nextState: FSRSState; interval: number } {
  const { w } = params;

  if (currentState.state === 'new') {
    return handleNewCard(rating, w, params);
  } else if (currentState.state === 'learning' || currentState.state === 'relearning') {
    return handleLearningCard(currentState, rating, w, params);
  } else {
    return handleReviewCard(currentState, rating, w, params);
  }
}

/**
 * Handle first review of a new card
 */
function handleNewCard(
  rating: ReviewRating,
  w: number[],
  params: FSRSParameters
): { nextState: FSRSState; interval: number } {
  // Initial stability based on rating
  const initialStability = w[rating - 1]; // w0-w3

  // Initial difficulty (D0)
  const initialDifficulty = w[4] - Math.exp(w[5] * (rating - 1)) + 1;
  const clampedDifficulty = Math.max(1, Math.min(10, initialDifficulty));

  if (rating === 1) {
    // Again - stay in learning
    return {
      nextState: {
        stability: initialStability,
        difficulty: clampedDifficulty,
        elapsedDays: 0,
        scheduledDays: 0,
        reps: 1,
        lapses: 1,
        state: 'learning',
      },
      interval: 0, // Review same day
    };
  }

  // Calculate first interval
  const interval = calculateInterval(initialStability, params);

  return {
    nextState: {
      stability: initialStability,
      difficulty: clampedDifficulty,
      elapsedDays: 0,
      scheduledDays: interval,
      reps: 1,
      lapses: 0,
      state: rating === 2 ? 'learning' : 'review',
    },
    interval,
  };
}

/**
 * Handle cards in learning/relearning state
 */
function handleLearningCard(
  state: FSRSState,
  rating: ReviewRating,
  w: number[],
  params: FSRSParameters
): { nextState: FSRSState; interval: number } {
  if (rating === 1) {
    // Again - reset to relearning
    const newStability = w[0]; // Reset stability
    return {
      nextState: {
        ...state,
        stability: newStability,
        elapsedDays: 0,
        scheduledDays: 0,
        reps: state.reps + 1,
        lapses: state.lapses + 1,
        state: 'relearning',
      },
      interval: 0,
    };
  }

  // Graduate to review
  const newStability = calculateNextStability(state.stability, state.difficulty, rating, w);
  const interval = calculateInterval(newStability, params);

  return {
    nextState: {
      ...state,
      stability: newStability,
      elapsedDays: 0,
      scheduledDays: interval,
      reps: state.reps + 1,
      state: 'review',
    },
    interval,
  };
}

/**
 * Handle cards in review state
 */
function handleReviewCard(
  state: FSRSState,
  rating: ReviewRating,
  w: number[],
  params: FSRSParameters
): { nextState: FSRSState; interval: number } {
  // Update difficulty
  const newDifficulty = updateDifficulty(state.difficulty, rating, w);

  if (rating === 1) {
    // Lapse - reset to relearning with reduced stability
    const newStability = calculateForgetStability(state.stability, state.difficulty, w);
    return {
      nextState: {
        ...state,
        stability: newStability,
        difficulty: newDifficulty,
        elapsedDays: 0,
        scheduledDays: 0,
        reps: state.reps + 1,
        lapses: state.lapses + 1,
        state: 'relearning',
      },
      interval: 0,
    };
  }

  // Successful review
  const newStability = calculateNextStability(state.stability, state.difficulty, rating, w);
  const interval = calculateInterval(newStability, params);

  return {
    nextState: {
      ...state,
      stability: newStability,
      difficulty: newDifficulty,
      elapsedDays: 0,
      scheduledDays: interval,
      reps: state.reps + 1,
      state: 'review',
    },
    interval,
  };
}

// ============================================
// STABILITY CALCULATIONS
// ============================================

/**
 * Calculate next stability after successful review
 */
function calculateNextStability(
  stability: number,
  difficulty: number,
  rating: ReviewRating,
  w: number[]
): number {
  // Note: Rating factor (w[14]/w[15]) is applied via hardPenalty/easyBonus below

  // Calculate retrievability at this point
  const elapsedDays = stability; // Assume reviewing at optimal time
  const retrievability = calculateRetrievability(stability, elapsedDays);

  // Stability increase formula (simplified from FSRS-4.5)
  const hardPenalty = rating === 2 ? w[15] : 1;
  const easyBonus = rating === 4 ? w[16] : 1;

  const newStability = stability * (
    1 +
    Math.exp(w[8]) *
    (11 - difficulty) *
    Math.pow(stability, -w[9]) *
    (Math.exp((1 - retrievability) * w[10]) - 1) *
    hardPenalty *
    easyBonus
  );

  return Math.max(0.1, newStability);
}

/**
 * Calculate stability after forgetting (lapse)
 */
function calculateForgetStability(
  stability: number,
  difficulty: number,
  w: number[]
): number {
  return w[11] * Math.pow(difficulty, -w[12]) * (Math.pow(stability + 1, w[13]) - 1);
}

/**
 * Calculate retrievability (probability of recall)
 *
 * Based on FSRS formula: R(t) = (1 + t/(9*S))^(-1)
 * where t = elapsed days, S = stability
 *
 * Exported for use by interleaving algorithm (Phase 13)
 *
 * @param stability - Memory stability in days (must be > 0)
 * @param elapsedDays - Days since last review
 * @returns Retrievability as a value between 0 and 1 (0-100% scale)
 */
export function calculateRetrievability(stability: number, elapsedDays: number): number {
  // Guard against division by zero from legacy data or invalid state
  if (stability <= 0) {
    return 0;
  }
  return Math.pow(1 + elapsedDays / (9 * stability), -1);
}

/**
 * Update difficulty based on rating
 */
function updateDifficulty(
  currentDifficulty: number,
  rating: ReviewRating,
  w: number[]
): number {
  // Mean reversion towards initial difficulty estimate
  const D0 = w[4];
  const meanReversion = w[7] * (D0 - currentDifficulty);

  // Difficulty delta based on rating
  const delta = -(rating - 3);
  const newDifficulty = currentDifficulty + meanReversion + w[6] * delta;

  return Math.max(1, Math.min(10, newDifficulty));
}

/**
 * Calculate interval from stability
 */
function calculateInterval(
  stability: number,
  params: FSRSParameters
): number {
  const { requestRetention, maximumInterval } = params;

  // Solve for t where R(t) = requestRetention
  // R(t) = (1 + t/(9*S))^(-1) = requestRetention
  // t = 9 * S * (R^(-1) - 1)
  const interval = 9 * stability * (Math.pow(requestRetention, -1) - 1);

  return Math.min(Math.max(1, Math.round(interval)), maximumInterval);
}

// ============================================
// MASTERY INTEGRATION
// ============================================

/**
 * Convert quiz score to review rating
 */
export function scoreToRating(score: number): ReviewRating {
  if (score < 50) return 1; // Again
  if (score < 70) return 2; // Hard
  if (score < 90) return 3; // Good
  return 4; // Easy
}

/**
 * Update concept mastery with new review result
 */
export function updateConceptMastery(
  mastery: ConceptMastery,
  score: number,
  timeSpentSeconds: number,
  eventType: 'quiz' | 'review' | 'practice' | 'lesson_complete' = 'review'
): ConceptMastery {
  const rating = scoreToRating(score);
  const { nextState, interval } = calculateNextState(mastery.fsrsState, rating);

  const now = new Date();
  const nextReviewAt = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

  // Calculate new mastery level (blend of recent performance and historical)
  const weightedScore = score * 0.6 + mastery.masteryLevel * 0.4;
  const newMasteryLevel = Math.max(0, Math.min(100, weightedScore));

  // Update streaks
  const correct = score >= 70;
  const newCorrectStreak = correct ? mastery.correctStreak + 1 : 0;
  const newIncorrectStreak = correct ? 0 : mastery.incorrectStreak + 1;

  // Add to history
  const newEvent = {
    timestamp: now,
    eventType,
    score,
    timeSpentSeconds,
    correct,
  };

  return {
    ...mastery,
    masteryLevel: newMasteryLevel,
    lastReviewedAt: now,
    lastQuizScore: score,
    reviewCount: mastery.reviewCount + 1,
    correctStreak: newCorrectStreak,
    incorrectStreak: newIncorrectStreak,
    fsrsState: nextState,
    nextReviewAt,
    history: [...mastery.history.slice(-50), newEvent], // Keep last 50 events
  };
}

/**
 * Create initial concept mastery
 */
export function createInitialConceptMastery(
  conceptId: string,
  userId: string
): ConceptMastery {
  const now = new Date();
  return {
    conceptId,
    userId,
    masteryLevel: 0,
    lastReviewedAt: now,
    lastQuizScore: 0,
    reviewCount: 0,
    correctStreak: 0,
    incorrectStreak: 0,
    fsrsState: createInitialFSRSState(),
    nextReviewAt: now, // Due immediately
    history: [],
  };
}

/**
 * Get concepts due for review today
 */
export function getDueForReview(
  masteryRecords: ConceptMastery[],
  maxItems: number = 10
): ConceptMastery[] {
  const now = new Date();

  return masteryRecords
    .filter(m => m.nextReviewAt <= now)
    .sort((a, b) => {
      // Prioritize: most overdue, then by mastery level (lower first)
      const aOverdue = now.getTime() - a.nextReviewAt.getTime();
      const bOverdue = now.getTime() - b.nextReviewAt.getTime();

      // If both are significantly overdue, prioritize lower mastery
      if (aOverdue > 24 * 60 * 60 * 1000 && bOverdue > 24 * 60 * 60 * 1000) {
        return a.masteryLevel - b.masteryLevel;
      }

      return bOverdue - aOverdue;
    })
    .slice(0, maxItems);
}

/**
 * Calculate overall retention based on mastery records
 */
export function calculateOverallRetention(masteryRecords: ConceptMastery[]): number {
  if (masteryRecords.length === 0) return 0;

  const now = new Date();
  let totalRetrievability = 0;

  for (const record of masteryRecords) {
    const { stability } = record.fsrsState;
    const elapsedDays = (now.getTime() - record.lastReviewedAt.getTime()) / (24 * 60 * 60 * 1000);

    if (stability > 0) {
      totalRetrievability += calculateRetrievability(stability, elapsedDays);
    }
  }

  return (totalRetrievability / masteryRecords.length) * 100;
}

/**
 * Predict when a concept will drop below threshold
 */
export function predictMasteryDecay(
  mastery: ConceptMastery,
  threshold: number = 70
): Date | null {
  const { stability } = mastery.fsrsState;

  if (stability <= 0) return null;

  // Solve for t where R(t) = threshold/100
  const targetRetrievability = threshold / 100;
  const daysUntilDecay = 9 * stability * (Math.pow(targetRetrievability, -1) - 1);

  const decayDate = new Date(mastery.lastReviewedAt.getTime() + daysUntilDecay * 24 * 60 * 60 * 1000);
  return decayDate;
}

// ============================================
// INTERLEAVING SUPPORT (Phase 13)
// ============================================

/**
 * Concept mastery with calculated retrievability
 */
export type ConceptMasteryWithRetrievability = ConceptMastery & {
  retrievability: number;
};

/**
 * Get concepts below retrievability threshold
 *
 * Used by adaptive interleaving (Phase 13) for review injection.
 * Returns items sorted by urgency (lowest retrievability first).
 *
 * @param masteryRecords - User's concept mastery records
 * @param threshold - Retrievability threshold (default 0.90 = 90%)
 * @param maxItems - Maximum items to return
 */
export function getItemsBelowRetrievability(
  masteryRecords: ConceptMastery[],
  threshold: number = 0.90,
  maxItems: number = 10
): ConceptMasteryWithRetrievability[] {
  const now = new Date();

  return masteryRecords
    .map(m => {
      const { stability } = m.fsrsState;
      const elapsedDays = (now.getTime() - m.lastReviewedAt.getTime()) / (24 * 60 * 60 * 1000);
      const retrievability = stability > 0 ? calculateRetrievability(stability, elapsedDays) : 0;
      return { ...m, retrievability };
    })
    .filter(m => m.retrievability < threshold && m.retrievability > 0)
    .sort((a, b) => a.retrievability - b.retrievability) // Most urgent first (lowest R)
    .slice(0, maxItems);
}

/**
 * Get count of items below retrievability threshold
 *
 * Used to determine interleaving ratio (larger backlog = more reviews)
 */
export function getReviewBacklogSize(
  masteryRecords: ConceptMastery[],
  threshold: number = 0.90
): number {
  const now = new Date();

  return masteryRecords.filter(m => {
    const { stability } = m.fsrsState;
    if (stability <= 0) return false;

    const elapsedDays = (now.getTime() - m.lastReviewedAt.getTime()) / (24 * 60 * 60 * 1000);
    const retrievability = calculateRetrievability(stability, elapsedDays);
    return retrievability < threshold;
  }).length;
}

// ============================================================================
// EXAM MODE & WORKLOAD FLATTENING (Research-backed Enhancements)
// ============================================================================

/**
 * Exam Mode Configuration
 * Optimizes review scheduling for a fixed deadline (certification exam)
 */
export interface ExamModeConfig {
  examDate: Date;
  targetRetention: number; // Usually 0.95 for exams
  enabled: boolean;
}

/**
 * Workload Flattening Configuration
 * Prevents overwhelm when returning after absence
 */
export interface WorkloadConfig {
  maxDailyReviews: number;
  reducedRetention: number; // Lower retention temporarily
  gapDaysThreshold: number; // Days of absence to trigger flattening
}

const DEFAULT_WORKLOAD_CONFIG: WorkloadConfig = {
  maxDailyReviews: 50,
  reducedRetention: 0.82, // 82% retention instead of 90%
  gapDaysThreshold: 7,    // 7+ days triggers flattening
};

/**
 * Calculate days until exam
 */
function differenceInDays(later: Date, earlier: Date): number {
  return Math.floor((later.getTime() - earlier.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Calculate optimized interval for exam mode
 *
 * Distributes reviews evenly before exam, front-loaded for harder items.
 * Research shows this maximizes retention at exam time.
 */
export function calculateExamModeInterval(
  card: FSRSState,
  examDate: Date,
  now: Date = new Date()
): number {
  const daysUntilExam = Math.max(1, differenceInDays(examDate, now));

  // Estimate reviews needed to maintain high retention
  // Based on stability: lower stability = more reviews needed
  const stability = Math.max(0.1, card.stability);
  const reviewsNeeded = Math.max(1, Math.ceil(Math.log(0.05) / Math.log(0.9) * (1 / stability)));

  // Distribute reviews evenly, front-loaded for safety margin
  const optimalInterval = Math.floor(daysUntilExam / (reviewsNeeded + 1));

  // Never exceed original scheduled interval (safety)
  return Math.max(1, Math.min(optimalInterval, card.scheduledDays || daysUntilExam));
}

/**
 * Get items for exam mode review
 *
 * Prioritizes items by urgency for exam preparation:
 * 1. Items with lowest retrievability at exam date
 * 2. Items with lowest stability (most at-risk)
 * 3. Items with highest difficulty (hardest content)
 */
export function getExamModeReviews(
  masteryRecords: ConceptMastery[],
  examDate: Date,
  maxItems: number = 20
): ConceptMasteryWithRetrievability[] {
  const daysUntilExam = differenceInDays(examDate, new Date());

  return masteryRecords
    .map(m => {
      const { stability } = m.fsrsState;
      // Predict retrievability at exam date
      const retrievabilityAtExam = stability > 0
        ? calculateRetrievability(stability, daysUntilExam)
        : 0;
      return { ...m, retrievability: retrievabilityAtExam };
    })
    .filter(m => m.retrievability < 0.95) // Below 95% target at exam
    .sort((a, b) => {
      // Primary: lowest predicted retrievability at exam
      const rDiff = a.retrievability - b.retrievability;
      if (Math.abs(rDiff) > 0.05) return rDiff;

      // Secondary: lowest stability (most fragile)
      return a.fsrsState.stability - b.fsrsState.stability;
    })
    .slice(0, maxItems);
}

/**
 * Flatten workload after a gap
 *
 * When a user returns after absence, this prevents the overwhelming backlog
 * by temporarily lowering retention target and limiting daily reviews.
 *
 * Research shows 80-85% retention:
 * - Reduces daily reviews by ~30%
 * - Only reduces memorized items by ~3%
 */
export function flattenWorkloadAfterGap(
  overdueCards: ConceptMastery[],
  config: WorkloadConfig = DEFAULT_WORKLOAD_CONFIG
): ConceptMastery[] {
  const { maxDailyReviews, reducedRetention } = config;

  // Sort by priority: highest difficulty first (hardest to relearn)
  return overdueCards
    .sort((a, b) => b.fsrsState.difficulty - a.fsrsState.difficulty)
    .slice(0, maxDailyReviews)
    .map(card => ({
      ...card,
      // Store reduced retention target in fsrsState for this session
      _tempRetention: reducedRetention,
    } as ConceptMastery));
}

/**
 * Detect if workload flattening should be applied
 */
export function shouldFlattenWorkload(
  lastLoginAt: Date,
  now: Date = new Date(),
  gapThreshold: number = DEFAULT_WORKLOAD_CONFIG.gapDaysThreshold
): boolean {
  const daysSinceLogin = differenceInDays(now, lastLoginAt);
  return daysSinceLogin >= gapThreshold;
}

/**
 * Get reduced retention parameters for gap recovery
 *
 * Gradually ramps retention back up over sessions.
 */
export function getGapRecoveryParams(
  daysSinceLogin: number,
  sessionsSinceReturn: number
): FSRSParameters {
  const baseParams = { ...DEFAULT_PARAMETERS };

  // Start at 82% retention, gradually return to 90%
  const minRetention = 0.82;
  const maxRetention = 0.90;
  const recoveryRate = 0.02; // +2% per session

  const targetRetention = Math.min(
    maxRetention,
    minRetention + sessionsSinceReturn * recoveryRate
  );

  return {
    ...baseParams,
    requestRetention: targetRetention,
  };
}

// ============================================================================
// ENHANCED MEAN REVERSION FOR DIFFICULTY
// ============================================================================

/**
 * FSRS Mean Difficulty Parameters
 */
const FSRS_MEAN_REVERSION_PARAMS = {
  MEAN_DIFFICULTY: 5.0,   // FSRS scale 1-10, center point
  REVERSION_RATE: 0.03,   // 3% pull toward mean per update
};

/**
 * Update difficulty with enhanced mean reversion
 *
 * Prevents difficulty from getting stuck at extremes (1 or 10).
 * Research shows this improves long-term calibration.
 */
export function updateDifficultyWithMeanReversion(
  currentD: number,
  rating: ReviewRating,
  w: number[]
): number {
  const { MEAN_DIFFICULTY, REVERSION_RATE } = FSRS_MEAN_REVERSION_PARAMS;

  // Standard FSRS difficulty update
  const D0 = w[4];
  const standardMeanReversion = w[7] * (D0 - currentD);
  const delta = -(rating - 3);
  const newD = Math.max(1, Math.min(10, currentD + standardMeanReversion + w[6] * delta));

  // Additional mean reversion toward center (research enhancement)
  return newD + REVERSION_RATE * (MEAN_DIFFICULTY - newD);
}

/**
 * Predict intervals for all 4 FSRS ratings
 *
 * Returns human-readable intervals for UI display (e.g., "1d", "3d", "1w", "2w")
 * Used by ReviewQueue to show predicted intervals on rating buttons.
 */
export function predictIntervalsForRatings(
  currentState: FSRSState,
  params: FSRSParameters = DEFAULT_PARAMETERS
): { again: string; hard: string; good: string; easy: string } {
  const formatInterval = (days: number): string => {
    if (days === 0) return '<1d';
    if (days === 1) return '1d';
    if (days < 7) return `${days}d`;
    if (days < 14) return '1w';
    if (days < 21) return '2w';
    if (days < 30) return '3w';
    if (days < 60) return '1mo';
    if (days < 90) return '2mo';
    if (days < 180) return '3mo';
    if (days < 365) return '6mo';
    return '1y+';
  };

  const { interval: againInterval } = calculateNextState(currentState, 1, params);
  const { interval: hardInterval } = calculateNextState(currentState, 2, params);
  const { interval: goodInterval } = calculateNextState(currentState, 3, params);
  const { interval: easyInterval } = calculateNextState(currentState, 4, params);

  return {
    again: formatInterval(againInterval),
    hard: formatInterval(hardInterval),
    good: formatInterval(goodInterval),
    easy: formatInterval(easyInterval),
  };
}

/**
 * Calculate optimal review order for a mixed queue (new + review)
 *
 * Interleaves new items and reviews to prevent fatigue.
 * Research shows 3:1 ratio (3 reviews : 1 new) is optimal for retention.
 */
export function calculateOptimalReviewOrder(
  newItems: ConceptMastery[],
  reviewItems: ConceptMastery[]
): ConceptMastery[] {
  const result: ConceptMastery[] = [];
  const REVIEW_TO_NEW_RATIO = 3; // 3 reviews per 1 new item

  let reviewIdx = 0;
  let newIdx = 0;

  while (reviewIdx < reviewItems.length || newIdx < newItems.length) {
    // Add reviews (up to ratio count)
    for (let i = 0; i < REVIEW_TO_NEW_RATIO && reviewIdx < reviewItems.length; i++) {
      result.push(reviewItems[reviewIdx++]);
    }

    // Add one new item
    if (newIdx < newItems.length) {
      result.push(newItems[newIdx++]);
    }
  }

  return result;
}
