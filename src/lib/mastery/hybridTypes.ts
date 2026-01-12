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
