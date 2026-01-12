/**
 * ML Module - Hybrid Learner Model
 *
 * Phase 15.1: Dual-Pathway Neural Network Architecture
 * Phase 15.2: Hybrid Model Integration
 *
 * This module provides:
 * - Hybrid model combining Transformer (DKT2) and BKT pathways
 * - Cross-attention fusion for superior mastery prediction
 * - Cold-start handling with gradual blend
 * - Model switching and A/B testing infrastructure
 *
 * Usage:
 * ```typescript
 * import { HybridLearnerModel, predictMastery } from '@/lib/ml';
 *
 * // Quick prediction
 * const prediction = await predictMastery(userId, skillId, interactions);
 *
 * // Full model usage
 * const model = new HybridLearnerModel(config);
 * await model.initialize(skills, questions);
 * const result = await model.predict(userId, skillId);
 * ```
 */

// ============================================================================
// PHASE 15.2: Cold-Start and Model Switching
// ============================================================================

export * from './coldStart';
export * from './modelSwitching';

// ============================================================================
// PHASE 15.1: Hybrid Model Architecture Types
// ============================================================================

export type {
  // Configuration
  HybridModelConfig,
  BKTPriors,
  SkillDependency,

  // Prediction
  HybridPrediction,
  PathwayContributions,
  PredictionMetadata,
  PathwayWeights,

  // State
  TransformerState,
  BayesianState,
  DualPathwayState,
  RaschEmbedding,
  EmbeddingTables,

  // Training
  TrainingData,
  TrainingSequence,
  TrainingInteraction,
  TrainingResult,
  EpochMetrics,
  EvaluationMetrics,
  SkillMetrics,
  DatasetMetadata,

  // Weights (for serialization)
  ModelWeights,
  SerializedEmbeddings,
  TransformerLayerWeights,
  CrossAttentionLayerWeights,
  PredictionHeadWeights,
} from './hybridModelTypes';

export {
  DEFAULT_HYBRID_MODEL_CONFIG,
  validateHybridConfig,
  bktPriorsToBKTParameters,
  bktParametersToBKTPriors,
} from './hybridModelTypes';

// ============================================================================
// PHASE 15.1: Hybrid Learner Model
// ============================================================================

export {
  HybridLearnerModel,
  createHybridLearnerModel,
  getHybridModel,
  resetHybridModel,
  predictMastery,
  updateAndPredict,
} from './hybridModel';

export type { UserModelState } from './hybridModel';

// ============================================================================
// PHASE 15.1: Data Preparation Pipeline
// ============================================================================

export {
  // Query & Loading
  createInteractionLoader,
  DEFAULT_QUERY_PARAMS,

  // Transformation
  interactionLogToTrainingInteraction,
  groupByUser,
  createTrainingSequence,

  // Splitting
  splitData,
  DEFAULT_SPLIT_CONFIG,

  // Feature Extraction
  extractBKTFeatures,
  calculateSkillDifficulties,

  // Embedding
  createRaschEmbedding,

  // Batching
  createBatch,
  batchGenerator,

  // Main Pipeline
  prepareTrainingData,
  prepareInferenceData,
} from './dataPreparation';

export type {
  InteractionQueryParams,
  InteractionLoader,
  SplitConfig,
  BKTFeatures,
  TrainingBatch,
} from './dataPreparation';

// ============================================================================
// PHASE 15.1: Transformer Pathway
// ============================================================================

export {
  // Math operations
  softmax,
  layerNorm,
  gelu,
  matmul,
  vecMatmul,
  addVectors,
  scaleVector,

  // Embedding
  createInputEmbedding,
  initializeEmbeddingTables,

  // Attention
  createCausalMask,
  createPaddingMask,
  combineMasks,
  feedForward,

  // Pathway
  createTransformerPathway,
  createTransformerConfig,
  SimpleTransformerPathway,
  extractSkillStates,
} from './transformerPathway';

// Re-export createPositionalEncoding from dataPreparation
export { createPositionalEncoding } from './dataPreparation';

export type {
  ITransformerPathway,
  TransformerLayerConfig,
  TransformerEncoderConfig,
  AttentionOutput,
  TransformerLayerOutput,
  TransformerEncoderState,
  ScaledDotProductAttentionParams,
  MultiHeadAttentionConfig,
  MultiHeadAttentionWeights,
  FeedForwardConfig,
} from './transformerPathway';

// ============================================================================
// PHASE 15.1: Cross-Attention Fusion
// ============================================================================

export {
  // Attention
  computeCrossAttention,
  multiHeadCrossAttention,

  // Fusion methods
  gatedFusion,
  concatFusion,
  attentionFusion,
  fusePathways,

  // Prediction head
  predictionHead,
  simplePredictionHead,

  // Fusion class
  CrossAttentionFusion,
  createCrossAttentionFusion,

  // Cold-start blending (15.1 version)
  calculateColdStartBlend,
  blendPredictions as blendHybridPredictions,
} from './crossAttention';

export type {
  CrossAttentionConfig,
  CrossAttentionOutput,
  GatedFusionOutput,
  PredictionHeadConfig,
} from './crossAttention';
