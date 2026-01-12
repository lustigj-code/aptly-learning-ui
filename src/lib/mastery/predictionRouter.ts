/**
 * Prediction Router
 *
 * Routes mastery predictions to appropriate model:
 * - BKT for cold-start (< 20 interactions)
 * - Hybrid for established users (20+ interactions)
 *
 * Research: 10-50 interactions needed for DKT stability
 *
 * Part of Phase 15: Hybrid Learner Model
 */

import type { SkillState, BKTParameters } from './bkt';
import type {
  HybridPrediction,
  HybridModelConfig,
  InteractionFeatures,
} from './hybridTypes';
import { updateMastery, predictCorrect, DEFAULT_BKT_PARAMS } from './bkt';
import { DEFAULT_HYBRID_CONFIG } from './hybridTypes';

/**
 * Get prediction using appropriate model based on interaction count
 */
export function getPrediction(
  skillState: SkillState,
  features: InteractionFeatures,
  config: HybridModelConfig = DEFAULT_HYBRID_CONFIG,
  bktParams: BKTParameters = DEFAULT_BKT_PARAMS
): HybridPrediction {
  const interactionCount = skillState.attempts;

  // Cold-start: use BKT only
  if (interactionCount < config.minInteractionsForHybrid) {
    return getBKTPrediction(skillState, bktParams);
  }

  // Established user: use hybrid (BKT + Rasch adjustment)
  return getHybridPrediction(skillState, features, config, bktParams);
}

/**
 * Pure BKT prediction (for cold-start)
 */
function getBKTPrediction(
  skillState: SkillState,
  bktParams: BKTParameters
): HybridPrediction {
  const pCorrectNext = predictCorrect(skillState.pMastery, bktParams);

  return {
    pMastery: skillState.pMastery,
    pCorrectNext,
    confidence: Math.min(0.5 + skillState.attempts * 0.05, 0.9), // Grows with attempts
    modelUsed: 'bkt',
    features: {
      bktContribution: 1.0,
      temporalContribution: 0,
      difficultyAdjustment: 0,
    },
  };
}

/**
 * Hybrid prediction (BKT + Rasch + Temporal)
 */
function getHybridPrediction(
  skillState: SkillState,
  features: InteractionFeatures,
  config: HybridModelConfig,
  bktParams: BKTParameters
): HybridPrediction {
  // Start with BKT baseline
  let pMastery = skillState.pMastery;
  let bktContribution = 1.0;
  let temporalContribution = 0;
  let difficultyAdjustment = 0;

  // Apply Rasch difficulty adjustment
  if (config.useRaschAdjustment && features.difficultyDeviation !== 0) {
    // Harder questions (positive deviation) reduce effective mastery display
    // Easier questions (negative deviation) increase it
    difficultyAdjustment = -features.difficultyDeviation * config.difficultyWeight;
    bktContribution = 1 - Math.abs(difficultyAdjustment);
  }

  // Apply temporal decay
  if (config.useTemporalDecay && features.elapsedTimeSinceLastAttempt > 0) {
    const hoursElapsed = features.elapsedTimeSinceLastAttempt / 3600;
    const decayFactor = Math.pow(0.5, hoursElapsed / config.forgettingHalfLife);
    temporalContribution = (1 - decayFactor) * 0.1; // Max 10% decay effect
    pMastery = pMastery * (1 - temporalContribution * 0.5);
    bktContribution -= temporalContribution;
  }

  // Calculate adjusted prediction
  const adjustedPMastery = Math.max(0, Math.min(1,
    pMastery + difficultyAdjustment
  ));

  const pCorrectNext = predictCorrect(adjustedPMastery, bktParams);

  // Confidence grows with interactions, maxes at 0.95
  const confidence = Math.min(
    0.7 + (skillState.attempts - config.minInteractionsForHybrid) * 0.01,
    0.95
  );

  return {
    pMastery: adjustedPMastery,
    pCorrectNext,
    confidence,
    modelUsed: 'hybrid',
    features: {
      bktContribution: Math.max(0, bktContribution),
      temporalContribution,
      difficultyAdjustment,
    },
  };
}

/**
 * Update mastery and return hybrid prediction
 */
export function updateAndPredict(
  currentState: SkillState,
  isCorrect: boolean,
  features: InteractionFeatures,
  config: HybridModelConfig = DEFAULT_HYBRID_CONFIG,
  bktParams: BKTParameters = DEFAULT_BKT_PARAMS
): { newState: SkillState; prediction: HybridPrediction } {
  // Update using BKT (core model)
  const newState = updateMastery(currentState, isCorrect, bktParams);

  // Get hybrid prediction for new state
  const prediction = getPrediction(newState, features, config, bktParams);

  return { newState, prediction };
}

/**
 * Check if user has enough data for hybrid model
 */
export function canUseHybrid(
  interactionCount: number,
  config: HybridModelConfig = DEFAULT_HYBRID_CONFIG
): boolean {
  return interactionCount >= config.minInteractionsForHybrid;
}

/**
 * Get default features for when detailed data is not available
 */
export function getDefaultFeatures(skillId: string): InteractionFeatures {
  return {
    skillId,
    questionId: '',
    isCorrect: false,
    timestamp: new Date(),
    questionDifficulty: 0.5,
    conceptDifficulty: 0.5,
    difficultyDeviation: 0,
    elapsedTimeSinceLastAttempt: 0,
    attemptNumber: 0,
    recentCorrectRate: 0.5,
  };
}
