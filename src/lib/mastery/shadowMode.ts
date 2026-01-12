/**
 * Shadow Mode for Hybrid Model Comparison
 *
 * Runs hybrid predictions alongside BKT without affecting user experience.
 * Logs both predictions for A/B comparison and model validation.
 *
 * Part of Phase 15: Hybrid Learner Model
 */

import type { SkillState } from './bkt';
import type { HybridPrediction, InteractionFeatures } from './hybridTypes';
import { getPrediction } from './predictionRouter';
import { DEFAULT_HYBRID_CONFIG } from './hybridTypes';

export interface ShadowComparison {
  userId: string;
  skillId: string;
  timestamp: Date;
  actualOutcome: boolean | null; // null if not yet known
  bktPrediction: HybridPrediction;
  hybridPrediction: HybridPrediction;
  // Metrics
  bktError: number | null;
  hybridError: number | null;
}

/**
 * Generate shadow comparison for logging
 */
export function generateShadowComparison(
  userId: string,
  skillState: SkillState,
  features: InteractionFeatures,
  actualOutcome?: boolean
): ShadowComparison {
  // Force BKT prediction (pretend cold-start)
  const coldStartState = { ...skillState, attempts: 0 };
  const bktPrediction = getPrediction(
    coldStartState,
    features,
    { ...DEFAULT_HYBRID_CONFIG, minInteractionsForHybrid: 999 } // Force BKT
  );

  // Get hybrid prediction (if eligible)
  const hybridPrediction = getPrediction(skillState, features);

  return {
    userId,
    skillId: skillState.skillId,
    timestamp: new Date(),
    actualOutcome: actualOutcome ?? null,
    bktPrediction,
    hybridPrediction,
    bktError: actualOutcome !== undefined
      ? Math.abs((actualOutcome ? 1 : 0) - bktPrediction.pCorrectNext)
      : null,
    hybridError: actualOutcome !== undefined
      ? Math.abs((actualOutcome ? 1 : 0) - hybridPrediction.pCorrectNext)
      : null,
  };
}

/**
 * Calculate model lift (improvement over BKT)
 */
export function calculateLift(comparisons: ShadowComparison[]): number {
  const validComparisons = comparisons.filter(
    c => c.bktError !== null && c.hybridError !== null
  );

  if (validComparisons.length < 100) {
    return 0; // Not enough data for reliable lift calculation
  }

  const avgBktError = validComparisons.reduce(
    (sum, c) => sum + (c.bktError ?? 0),
    0
  ) / validComparisons.length;

  const avgHybridError = validComparisons.reduce(
    (sum, c) => sum + (c.hybridError ?? 0),
    0
  ) / validComparisons.length;

  // Lift = (BKT error - Hybrid error) / BKT error
  if (avgBktError === 0) return 0;
  return (avgBktError - avgHybridError) / avgBktError;
}

/**
 * Check if hybrid model is ready for production
 * Requires 5-10% lift over BKT with sufficient sample size
 */
export function isHybridProductionReady(
  comparisons: ShadowComparison[],
  minLift: number = 0.05,
  minSampleSize: number = 1000
): { ready: boolean; lift: number; sampleSize: number; reason: string } {
  const sampleSize = comparisons.filter(
    c => c.bktError !== null && c.hybridError !== null
  ).length;

  if (sampleSize < minSampleSize) {
    return {
      ready: false,
      lift: 0,
      sampleSize,
      reason: `Insufficient data: ${sampleSize}/${minSampleSize} comparisons`,
    };
  }

  const lift = calculateLift(comparisons);

  if (lift < minLift) {
    return {
      ready: false,
      lift,
      sampleSize,
      reason: `Lift too low: ${(lift * 100).toFixed(1)}% < ${(minLift * 100).toFixed(1)}%`,
    };
  }

  return {
    ready: true,
    lift,
    sampleSize,
    reason: `Ready: ${(lift * 100).toFixed(1)}% lift with ${sampleSize} samples`,
  };
}

/**
 * Calculate RMSE for a set of comparisons
 */
export function calculateRMSE(
  comparisons: ShadowComparison[],
  modelType: 'bkt' | 'hybrid'
): number {
  const validComparisons = comparisons.filter(
    c => c.actualOutcome !== null
  );

  if (validComparisons.length === 0) return 0;

  const sumSquaredError = validComparisons.reduce((sum, c) => {
    const error = modelType === 'bkt' ? c.bktError : c.hybridError;
    return sum + (error ?? 0) ** 2;
  }, 0);

  return Math.sqrt(sumSquaredError / validComparisons.length);
}
