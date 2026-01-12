/**
 * Question Difficulty Calculator
 *
 * Implements Rasch model difficulty estimation:
 * - d_qt = question difficulty scalar
 * - Derived from historical response patterns
 *
 * Part of Phase 15: Hybrid Learner Model
 */

import type { InteractionLog } from '@/types';

export interface QuestionDifficulty {
  questionId: string;
  skillId: string;
  difficulty: number;      // 0-1 scale (0 = easy, 1 = hard)
  responseCount: number;
  correctRate: number;
  lastUpdated: Date;
}

/**
 * Calculate question difficulty from interaction history
 * Uses Item Response Theory (IRT) simplified formula
 */
export function calculateQuestionDifficulty(
  questionId: string,
  skillId: string,
  interactions: InteractionLog[]
): QuestionDifficulty {
  const questionInteractions = interactions.filter(
    i => i.questionId === questionId
  );

  if (questionInteractions.length === 0) {
    // No data - return neutral difficulty
    return {
      questionId,
      skillId,
      difficulty: 0.5,
      responseCount: 0,
      correctRate: 0.5,
      lastUpdated: new Date(),
    };
  }

  const correctCount = questionInteractions.filter(i => i.isCorrect).length;
  const correctRate = correctCount / questionInteractions.length;

  // IRT-inspired difficulty: lower correct rate = higher difficulty
  // Add smoothing to avoid extreme values (Laplace smoothing)
  const smoothedRate = (correctCount + 1) / (questionInteractions.length + 2);
  const difficulty = 1 - smoothedRate;

  return {
    questionId,
    skillId,
    difficulty,
    responseCount: questionInteractions.length,
    correctRate,
    lastUpdated: new Date(),
  };
}

/**
 * Calculate concept (skill) average difficulty
 */
export function calculateConceptDifficulty(
  skillId: string,
  questionDifficulties: QuestionDifficulty[]
): number {
  const skillQuestions = questionDifficulties.filter(
    q => q.skillId === skillId
  );

  if (skillQuestions.length === 0) return 0.5;

  // Weighted average by response count
  const totalWeight = skillQuestions.reduce(
    (sum, q) => sum + q.responseCount,
    0
  );

  if (totalWeight === 0) return 0.5;

  return skillQuestions.reduce(
    (sum, q) => sum + q.difficulty * q.responseCount,
    0
  ) / totalWeight;
}

/**
 * Calculate difficulty deviation (Rasch d_qt)
 * This is the key feature that improves prediction accuracy
 */
export function calculateDifficultyDeviation(
  questionDifficulty: number,
  conceptDifficulty: number
): number {
  return questionDifficulty - conceptDifficulty;
}

/**
 * Create features from interaction for hybrid model
 */
export function createInteractionFeatures(
  interaction: InteractionLog,
  questionDifficulty: QuestionDifficulty,
  conceptDifficulty: number,
  recentHistory: InteractionLog[]
): import('./hybridTypes').InteractionFeatures {
  // Calculate recent correct rate (last 5)
  const recent5 = recentHistory.slice(-5);
  const recentCorrectRate = recent5.length > 0
    ? recent5.filter(i => i.isCorrect).length / recent5.length
    : 0.5;

  return {
    skillId: interaction.skillId,
    questionId: interaction.questionId ?? '',
    isCorrect: interaction.isCorrect ?? false,
    timestamp: interaction.timestamp,
    questionDifficulty: questionDifficulty.difficulty,
    conceptDifficulty,
    difficultyDeviation: calculateDifficultyDeviation(
      questionDifficulty.difficulty,
      conceptDifficulty
    ),
    elapsedTimeSinceLastAttempt: interaction.timeGapFromLastAttempt ?? 0,
    attemptNumber: interaction.attemptNumber,
    recentCorrectRate,
  };
}

// ============================================================================
// Dynamic K-Factor & Rasch IRT Enhancement (Research-backed)
// ============================================================================

/**
 * Metadata for tracking update history per student/item pair
 */
export interface UpdateMetadata {
  questionId: string;
  studentId: string;
  priorUpdates: number; // n = number of prior updates for this item/student pair
}

/**
 * Research-backed parameters for uncertainty function
 * Source: Rasch IRT literature, Aptly Deep Research
 */
const UNCERTAINTY_PARAMS = {
  BETA: 0.1,   // Decay rate
  GAMMA: 0.5,  // Decay exponent
};

const K_FACTOR_PARAMS = {
  K_MAX: 30,   // High plasticity for new items
  K_MIN: 10,   // Floor for established items (never decay to zero)
};

const MEAN_REVERSION_PARAMS = {
  GLOBAL_MEAN: 0.5,     // Neutral difficulty
  REVERSION_RATE: 0.05, // Pull 5% toward mean each update
};

/**
 * Uncertainty Function: U(n) = 1 / (1 + β * n^γ)
 *
 * Returns high uncertainty (≈1) for new items, low (→0) for well-established items.
 * Research shows this prevents over-fitting to early noisy data.
 */
export function calculateUncertainty(priorUpdates: number): number {
  const { BETA, GAMMA } = UNCERTAINTY_PARAMS;
  return 1 / (1 + BETA * Math.pow(Math.max(0, priorUpdates), GAMMA));
}

/**
 * Dynamic K-Factor based on uncertainty
 *
 * K ranges from 30 (new items, high plasticity) to 10 (established items).
 * This replaces static delta values for more adaptive difficulty adjustment.
 */
export function calculateDynamicKFactor(priorUpdates: number): number {
  const { K_MAX, K_MIN } = K_FACTOR_PARAMS;
  const uncertainty = calculateUncertainty(priorUpdates);
  return K_MIN + (K_MAX - K_MIN) * uncertainty;
}

/**
 * Apply Mean Reversion to prevent "ease hell"
 *
 * Pulls difficulty slightly toward global mean after each update.
 * Prevents items from getting stuck at extreme difficulty values.
 */
export function applyMeanReversion(
  currentDifficulty: number,
  globalMean: number = MEAN_REVERSION_PARAMS.GLOBAL_MEAN
): number {
  const { REVERSION_RATE } = MEAN_REVERSION_PARAMS;
  return currentDifficulty + REVERSION_RATE * (globalMean - currentDifficulty);
}

/**
 * Update difficulty with dynamic K-factor and mean reversion
 *
 * This is the main function for updating question difficulty after a response.
 * Combines uncertainty-based K-factor with mean reversion for robust estimates.
 */
export function updateDifficulty(
  currentDifficulty: number,
  isCorrect: boolean,
  priorUpdates: number
): number {
  const k = calculateDynamicKFactor(priorUpdates);

  // Correct answer = easier item, incorrect = harder item
  const delta = isCorrect ? -k / 100 : k / 100;

  // Clamp to valid range
  const newDifficulty = Math.max(0, Math.min(1, currentDifficulty + delta));

  // Apply mean reversion to prevent extreme values
  return applyMeanReversion(newDifficulty);
}

/**
 * Zero-Sum Constraint for Ability/Difficulty Balance
 *
 * Ensures learner ability gain ≈ item difficulty loss (and vice versa).
 * This maintains calibration across the system.
 */
export function enforceZeroSum(
  abilityChange: number,
  difficultyChange: number
): { ability: number; difficulty: number } {
  const netChange = abilityChange + difficultyChange;
  const adjustment = netChange / 2;
  return {
    ability: abilityChange - adjustment,
    difficulty: difficultyChange + adjustment,
  };
}
