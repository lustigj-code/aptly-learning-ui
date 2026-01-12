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

// ============================================================================
// ENHANCED METRICS (Research Enhancement)
// ============================================================================

/**
 * Calculate Brier Score (calibration metric)
 *
 * Brier = (1/N) * Σ(prediction - actual)²
 * Lower is better. Range: 0-1
 */
export function calculateBrierScore(
  comparisons: ShadowComparison[],
  modelType: 'bkt' | 'hybrid'
): number {
  const validComparisons = comparisons.filter(c => c.actualOutcome !== null);
  if (validComparisons.length === 0) return 1;

  const sumSquaredError = validComparisons.reduce((sum, c) => {
    const prediction = modelType === 'bkt'
      ? c.bktPrediction.pCorrectNext
      : c.hybridPrediction.pCorrectNext;
    const actual = c.actualOutcome ? 1 : 0;
    return sum + Math.pow(prediction - actual, 2);
  }, 0);

  return sumSquaredError / validComparisons.length;
}

/**
 * Calculate AUC-ROC (discrimination metric)
 *
 * Uses trapezoidal rule approximation.
 * AUC = 0.5 is random, 1.0 is perfect
 */
export function calculateAUC(
  comparisons: ShadowComparison[],
  modelType: 'bkt' | 'hybrid'
): number {
  const validComparisons = comparisons.filter(c => c.actualOutcome !== null);
  if (validComparisons.length < 10) return 0.5;

  // Extract predictions and outcomes
  const data = validComparisons.map(c => ({
    prediction: modelType === 'bkt'
      ? c.bktPrediction.pCorrectNext
      : c.hybridPrediction.pCorrectNext,
    actual: c.actualOutcome ? 1 : 0,
  }));

  // Sort by prediction descending
  data.sort((a, b) => b.prediction - a.prediction);

  // Calculate AUC using Mann-Whitney U statistic
  const positives = data.filter(d => d.actual === 1);
  const negatives = data.filter(d => d.actual === 0);

  if (positives.length === 0 || negatives.length === 0) return 0.5;

  let concordant = 0;
  let tied = 0;

  for (const pos of positives) {
    for (const neg of negatives) {
      if (pos.prediction > neg.prediction) concordant++;
      else if (pos.prediction === neg.prediction) tied++;
    }
  }

  const totalPairs = positives.length * negatives.length;
  return (concordant + 0.5 * tied) / totalPairs;
}

/**
 * Comprehensive shadow mode metrics
 */
export interface ShadowMetrics {
  sampleSize: number;
  bktAUC: number;
  hybridAUC: number;
  bktBrier: number;
  hybridBrier: number;
  bktRMSE: number;
  hybridRMSE: number;
  lift: number;
  aucImprovement: number;
  brierImprovement: number;
}

/**
 * Calculate comprehensive metrics for shadow mode
 */
export function calculateShadowMetrics(comparisons: ShadowComparison[]): ShadowMetrics {
  const validComparisons = comparisons.filter(c => c.actualOutcome !== null);

  const bktAUC = calculateAUC(validComparisons, 'bkt');
  const hybridAUC = calculateAUC(validComparisons, 'hybrid');
  const bktBrier = calculateBrierScore(validComparisons, 'bkt');
  const hybridBrier = calculateBrierScore(validComparisons, 'hybrid');
  const bktRMSE = calculateRMSE(validComparisons, 'bkt');
  const hybridRMSE = calculateRMSE(validComparisons, 'hybrid');
  const lift = calculateLift(validComparisons);

  return {
    sampleSize: validComparisons.length,
    bktAUC,
    hybridAUC,
    bktBrier,
    hybridBrier,
    bktRMSE,
    hybridRMSE,
    lift,
    aucImprovement: hybridAUC - bktAUC,
    brierImprovement: bktBrier - hybridBrier, // Lower Brier is better
  };
}

/**
 * Promotion criteria (from hybridTypes.ts)
 */
const PROMOTION_CRITERIA = {
  minAUCImprovement: 0.02,      // 2% AUC improvement required
  maxBrierIncrease: 0.01,       // Calibration can't get worse
  minSampleSize: 1000,          // Minimum samples for significance
  minLift: 0.05,                // 5% error reduction
};

/**
 * Enhanced promotion check with all metrics
 */
export function shouldPromoteHybrid(metrics: ShadowMetrics): {
  shouldPromote: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  let shouldPromote = true;

  // Check sample size
  if (metrics.sampleSize < PROMOTION_CRITERIA.minSampleSize) {
    shouldPromote = false;
    reasons.push(`Insufficient samples: ${metrics.sampleSize} < ${PROMOTION_CRITERIA.minSampleSize}`);
  }

  // Check AUC improvement
  if (metrics.aucImprovement < PROMOTION_CRITERIA.minAUCImprovement) {
    shouldPromote = false;
    reasons.push(`AUC improvement too low: ${(metrics.aucImprovement * 100).toFixed(2)}% < ${PROMOTION_CRITERIA.minAUCImprovement * 100}%`);
  } else {
    reasons.push(`AUC improved by ${(metrics.aucImprovement * 100).toFixed(2)}%`);
  }

  // Check Brier score (calibration)
  if (metrics.brierImprovement < -PROMOTION_CRITERIA.maxBrierIncrease) {
    shouldPromote = false;
    reasons.push(`Calibration degraded: Brier increased by ${(-metrics.brierImprovement).toFixed(4)}`);
  } else {
    reasons.push(`Calibration maintained/improved: Brier changed by ${metrics.brierImprovement.toFixed(4)}`);
  }

  // Check lift
  if (metrics.lift < PROMOTION_CRITERIA.minLift) {
    // This is a warning, not blocking
    reasons.push(`Warning: Lift below target: ${(metrics.lift * 100).toFixed(1)}% < ${PROMOTION_CRITERIA.minLift * 100}%`);
  }

  return { shouldPromote, reasons };
}

/**
 * Format metrics for logging/display
 */
export function formatShadowReport(metrics: ShadowMetrics): string {
  const { shouldPromote, reasons } = shouldPromoteHybrid(metrics);

  return `
Shadow Mode Report
==================
Sample Size: ${metrics.sampleSize}

BKT Model:
  - AUC: ${metrics.bktAUC.toFixed(4)}
  - Brier: ${metrics.bktBrier.toFixed(4)}
  - RMSE: ${metrics.bktRMSE.toFixed(4)}

Hybrid Model:
  - AUC: ${metrics.hybridAUC.toFixed(4)}
  - Brier: ${metrics.hybridBrier.toFixed(4)}
  - RMSE: ${metrics.hybridRMSE.toFixed(4)}

Improvements:
  - AUC: ${metrics.aucImprovement >= 0 ? '+' : ''}${(metrics.aucImprovement * 100).toFixed(2)}%
  - Brier: ${metrics.brierImprovement >= 0 ? '+' : ''}${metrics.brierImprovement.toFixed(4)} (lower is better)
  - Lift: ${(metrics.lift * 100).toFixed(1)}%

Decision: ${shouldPromote ? 'PROMOTE' : 'WAIT'}
Reasons:
${reasons.map(r => `  - ${r}`).join('\n')}
`.trim();
}

// ============================================================================
// PRE-TRAINING DATA TYPES (for EdNet/ASSISTments integration)
// ============================================================================

/**
 * Standard interaction format for pre-training data
 */
export interface PretrainingInteraction {
  studentId: string;
  questionId: string;
  skillId: string;
  correct: boolean;
  timestamp: number; // Unix timestamp
  responseTimeMs?: number;
}

/**
 * Pre-training dataset metadata
 */
export interface DatasetMetadata {
  name: string;
  source: 'ednet' | 'assistments' | 'custom';
  interactionCount: number;
  studentCount: number;
  questionCount: number;
  skillCount: number;
  dateRange: {
    start: Date;
    end: Date;
  };
}

/**
 * Pre-training configuration
 */
export interface PretrainingConfig {
  dataset: DatasetMetadata;
  trainTestSplit: number; // 0-1, portion for training
  validationSplit: number; // 0-1, portion for validation
  sequenceLength: number; // Max sequence length for transformer
  batchSize: number;
  epochs: number;
}

export const DEFAULT_PRETRAINING_CONFIG: PretrainingConfig = {
  dataset: {
    name: 'ednet',
    source: 'ednet',
    interactionCount: 0,
    studentCount: 0,
    questionCount: 0,
    skillCount: 0,
    dateRange: { start: new Date(), end: new Date() },
  },
  trainTestSplit: 0.8,
  validationSplit: 0.1,
  sequenceLength: 200,
  batchSize: 32,
  epochs: 10,
};
