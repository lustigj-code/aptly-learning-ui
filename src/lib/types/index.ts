/**
 * Centralized Type Exports for Aptly Learning
 *
 * This file re-exports all shared types from a single location
 * to simplify imports across the codebase.
 *
 * Usage:
 *   import type { Course, User, Badge } from '@/lib/types';
 */

// ============================================
// ERROR HANDLING TYPES
// ============================================
export type {
  ApiError,
} from '@/lib/errors/handlers';

export {
  ApiErrorCode,
  createApiError,
  wrapServiceError,
  withErrorHandling,
  validateRequired,
  validateString,
  validateNumber,
} from '@/lib/errors/handlers';

// ============================================
// AI PROVIDER TYPES
// ============================================
export type {
  AIMessage,
  AIProvider,
  AIConfig,
  GenerateResult,
  GenerateOptions,
} from '@/lib/ai/providers/interfaces';

// ============================================
// MASTERY & PREDICTION TYPES (Runtime)
// ============================================
export type {
  InteractionFeatures,
  HybridPrediction,
  RuntimeHybridConfig,
  HybridModelConfig,
  TrainingSequence,
  ModelMetrics,
  DualPathwayPrediction,
  PathwayWeights,
  RaschEmbedding,
  ColdStartBlendConfig,
  ModelRoutingDecision,
  ShadowExperiment,
  ShadowModeMetrics,
} from '@/lib/mastery/hybridTypes';

export {
  DEFAULT_HYBRID_CONFIG,
  DEFAULT_COLD_START_CONFIG,
  calculateBlendWeight,
  routePrediction,
  evaluateShadowMode,
  PROMOTION_CRITERIA,
} from '@/lib/mastery/hybridTypes';

// ============================================
// ML MODEL TYPES (Training & Architecture)
// ============================================
export type {
  HybridModelConfig as MLHybridModelConfig,
  BKTPriors,
  SkillDependency,
  HybridPrediction as MLHybridPrediction,
  PathwayContributions,
  PredictionMetadata,
  TransformerState,
  BayesianState,
  DualPathwayState,
  PathwayWeights as MLPathwayWeights,
  RaschEmbedding as MLRaschEmbedding,
  SkillEmbeddingEntry,
  EmbeddingTables,
  TrainingInteraction,
  TrainingSequence as MLTrainingSequence,
  TrainingData,
  DatasetMetadata,
  TrainingResult,
  EpochMetrics,
  EvaluationMetrics,
  SkillMetrics,
  ModelWeights,
  SerializedEmbeddings,
  TransformerLayerWeights,
  CrossAttentionLayerWeights,
  PredictionHeadWeights,
} from '@/lib/ml/hybridModelTypes';

export {
  DEFAULT_HYBRID_MODEL_CONFIG,
  bktPriorsToBKTParameters,
  bktParametersToBKTPriors,
  validateHybridConfig,
} from '@/lib/ml/hybridModelTypes';

// ============================================
// BKT TYPES
// ============================================
export type {
  BKTParameters,
  SkillState,
  ContentType,
} from '@/lib/mastery/bkt';

export {
  DEFAULT_BKT_PARAMS,
  updateMastery,
  predictCorrect,
  isMastered,
  createInitialState,
  getParamsForContentType,
} from '@/lib/mastery/bkt';

// ============================================
// COACH SERVICE TYPES
// ============================================
export type {
  ExplanationAttempt,
  ComprehensionLevel,
  ConceptComprehension,
  ComprehensionState,
} from '@/lib/services/coachService';
