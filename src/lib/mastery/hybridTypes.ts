/**
 * Hybrid Learner Model Types
 *
 * Architecture: SAKT-Lite + Rasch Embedding + BKT Fallback
 * Research: Mai et al., 2025 (Transformer-Bayesian Hybrid)
 *
 * Part of Phase 15: Hybrid Learner Model
 */

// Input features for prediction (DKT2 architecture)
export interface InteractionFeatures {
  skillId: string;
  questionId: string;
  isCorrect: boolean;
  timestamp: Date;
  // Rasch model features
  questionDifficulty: number;  // d_qt: question difficulty scalar
  conceptDifficulty: number;   // average difficulty for this skill
  difficultyDeviation: number; // d_qt - concept average
  // Temporal features
  elapsedTimeSinceLastAttempt: number; // seconds
  attemptNumber: number;
  // Sequence context
  recentCorrectRate: number; // last 5 attempts
}

// Hybrid prediction output
export interface HybridPrediction {
  pMastery: number;           // Primary output: P(mastery)
  pCorrectNext: number;       // Predicted P(correct) on next question
  confidence: number;         // Model confidence (0-1)
  modelUsed: 'bkt' | 'hybrid' | 'sakt';
  features: {
    bktContribution: number;  // How much BKT influenced
    temporalContribution: number; // How much time decay influenced
    difficultyAdjustment: number; // Rasch adjustment
  };
}

// Configuration for hybrid model
export interface HybridModelConfig {
  // Cold-start threshold
  minInteractionsForHybrid: number; // Default: 20
  // Rasch parameters
  useRaschAdjustment: boolean;
  difficultyWeight: number; // How much difficulty affects prediction
  // Temporal parameters
  useTemporalDecay: boolean;
  forgettingHalfLife: number; // Hours until 50% decay
  // Model selection
  preferredModel: 'bkt' | 'hybrid' | 'auto';
  // A/B testing
  shadowMode: boolean; // Run hybrid alongside BKT for comparison
}

// Training data format for future ML integration
export interface TrainingSequence {
  userId: string;
  interactions: InteractionFeatures[];
  labels: boolean[]; // Correct/incorrect for each
}

// Model performance metrics
export interface ModelMetrics {
  auc: number;      // Area under ROC curve
  rmse: number;     // Root mean square error
  specificity: number; // True negative rate
  lift: number;     // Improvement over BKT baseline
  sampleSize: number;
}

// Default configuration
export const DEFAULT_HYBRID_CONFIG: HybridModelConfig = {
  minInteractionsForHybrid: 20,
  useRaschAdjustment: true,
  difficultyWeight: 0.3,
  useTemporalDecay: true,
  forgettingHalfLife: 168, // 1 week
  preferredModel: 'auto',
  shadowMode: true,
};

// ============================================================================
// DUAL-PATHWAY ARCHITECTURE (Research Enhancement)
// Based on: Mai et al., 2025 - Transformer-Bayesian Hybrid Networks
// ============================================================================

/**
 * Dual-Pathway Hybrid Prediction
 *
 * Architecture:
 * - Pathway A: Temporal (Transformer-based) - captures sequential patterns
 * - Pathway B: Causal (Bayesian Network) - captures prerequisite relationships
 * - Cross-attention combines both pathways
 *
 * Research shows 8.7% AUC improvement over single-pathway models.
 */
export interface DualPathwayPrediction {
  // Pathway A: Temporal (Transformer-based)
  temporalMastery: number;
  temporalConfidence: number;

  // Pathway B: Causal (Bayesian Network)
  causalMastery: number;
  causalConfidence: number;

  // Combined via cross-attention
  finalMastery: number;
  finalConfidence: number;

  // Metadata
  modelVersion: string;
  interactionCount: number;
  pathwayWeights: PathwayWeights;
}

/**
 * Pathway contribution weights
 *
 * Weights are learned during training but have reasonable defaults.
 */
export interface PathwayWeights {
  temporal: number;  // Weight for transformer pathway
  causal: number;    // Weight for Bayesian pathway
}

/**
 * Rasch-Enhanced Embedding
 *
 * Input features for the transformer pathway, following DKT2 architecture.
 * Each interaction is embedded with these features.
 */
export interface RaschEmbedding {
  conceptEmbedding: number[];      // e_c: Learnable vector (dim: 64-128)
  responseEmbedding: number;       // e_r: 0 or 1 for correct/incorrect
  questionDifficultyScalar: number; // d_qt: Deviation from concept average
  variationVector: number[];       // μ_ct: Question variation for concept
  timeGapEmbedding: number;        // Elapsed time for forgetting curve
}

/**
 * Cold-Start Blend Configuration
 *
 * Gradual transition from BKT to hybrid:
 * - 0-20 interactions: Pure BKT (hybrid too noisy)
 * - 20-50 interactions: Blend (gradual transition)
 * - 50+ interactions: Full hybrid
 */
export interface ColdStartBlendConfig {
  coldStartThreshold: number;    // Default: 20
  warmUpEndThreshold: number;    // Default: 50
  blendCurve: 'linear' | 'sigmoid'; // How to blend
}

export const DEFAULT_COLD_START_CONFIG: ColdStartBlendConfig = {
  coldStartThreshold: 20,
  warmUpEndThreshold: 50,
  blendCurve: 'linear',
};

/**
 * Calculate blend weight for cold-start transition
 *
 * @param interactionCount - Number of interactions for this student/skill
 * @param config - Cold-start configuration
 * @returns Weight for hybrid model (0 = pure BKT, 1 = pure hybrid)
 */
export function calculateBlendWeight(
  interactionCount: number,
  config: ColdStartBlendConfig = DEFAULT_COLD_START_CONFIG
): number {
  const { coldStartThreshold, warmUpEndThreshold, blendCurve } = config;

  // Below threshold: pure BKT
  if (interactionCount < coldStartThreshold) {
    return 0;
  }

  // Above warm-up: pure hybrid
  if (interactionCount >= warmUpEndThreshold) {
    return 1;
  }

  // In transition zone: blend
  const progress = (interactionCount - coldStartThreshold) /
                   (warmUpEndThreshold - coldStartThreshold);

  if (blendCurve === 'sigmoid') {
    // Sigmoid curve for smoother transition
    return 1 / (1 + Math.exp(-10 * (progress - 0.5)));
  }

  // Linear blend
  return progress;
}

/**
 * Model routing decision
 */
export interface ModelRoutingDecision {
  model: 'bkt' | 'hybrid' | 'blend';
  bktWeight: number;    // 0-1
  hybridWeight: number; // 0-1
  reason: string;
}

/**
 * Route prediction to appropriate model
 */
export function routePrediction(
  interactionCount: number,
  config: ColdStartBlendConfig = DEFAULT_COLD_START_CONFIG
): ModelRoutingDecision {
  const blendWeight = calculateBlendWeight(interactionCount, config);

  if (blendWeight === 0) {
    return {
      model: 'bkt',
      bktWeight: 1,
      hybridWeight: 0,
      reason: `Cold start (${interactionCount} < ${config.coldStartThreshold} interactions)`,
    };
  }

  if (blendWeight === 1) {
    return {
      model: 'hybrid',
      bktWeight: 0,
      hybridWeight: 1,
      reason: `Full hybrid (${interactionCount} >= ${config.warmUpEndThreshold} interactions)`,
    };
  }

  return {
    model: 'blend',
    bktWeight: 1 - blendWeight,
    hybridWeight: blendWeight,
    reason: `Blending (${Math.round(blendWeight * 100)}% hybrid at ${interactionCount} interactions)`,
  };
}

/**
 * Shadow Mode Experiment Configuration
 */
export interface ShadowExperiment {
  id: string;
  startDate: Date;
  endDate: Date;
  sampleSize: number;
  status: 'running' | 'completed' | 'promoted' | 'rejected';
}

/**
 * Shadow Mode Metrics for A/B comparison
 */
export interface ShadowModeMetrics {
  bktPredictions: number[];
  hybridPredictions: number[];
  actualOutcomes: boolean[];

  // Calculated metrics
  bktAUC: number;
  hybridAUC: number;
  bktBrier: number;   // Brier score (calibration)
  hybridBrier: number;

  // Decision
  shouldPromoteHybrid: boolean;
}

/**
 * Promotion criteria for shadow mode
 */
export const PROMOTION_CRITERIA = {
  minAUCImprovement: 0.02,      // 2% AUC improvement required
  maxBrierIncrease: 0.01,       // Calibration can't get worse
  minSampleSize: 1000,          // Minimum samples for significance
  minDurationDays: 7,           // Minimum experiment duration
  pValueThreshold: 0.05,        // Statistical significance
};

/**
 * Evaluate if hybrid should be promoted based on shadow mode metrics
 */
export function evaluateShadowMode(metrics: ShadowModeMetrics): boolean {
  // Need minimum sample size
  if (metrics.actualOutcomes.length < PROMOTION_CRITERIA.minSampleSize) {
    return false;
  }

  // AUC must improve by threshold
  const aucImprovement = metrics.hybridAUC - metrics.bktAUC;
  if (aucImprovement < PROMOTION_CRITERIA.minAUCImprovement) {
    return false;
  }

  // Calibration can't get significantly worse
  const brierIncrease = metrics.hybridBrier - metrics.bktBrier;
  if (brierIncrease > PROMOTION_CRITERIA.maxBrierIncrease) {
    return false;
  }

  return true;
}
