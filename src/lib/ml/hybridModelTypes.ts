/**
 * Hybrid Learner Model Architecture - Type Definitions
 *
 * Phase 15.1: Dual-Pathway Neural Network for Mastery Prediction
 *
 * Architecture:
 * - Pathway A: Transformer (DKT2-style) - captures sequential patterns
 * - Pathway B: Bayesian Network (BKT) - captures prerequisite relationships
 * - Cross-attention layer fuses both pathways
 *
 * Research: Mai et al., 2025 - Transformer-Bayesian Hybrid Networks
 * Expected improvement: 8.7% AUC over single-pathway models
 */

import type { BKTParameters } from '../mastery/bkt';

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * BKT Prior Probabilities for Bayesian Pathway
 */
export interface BKTPriors {
  /** Prior probability of initial mastery (P(L0)) */
  initialMastery: number;
  /** Probability of learning per opportunity (P(T)) */
  learnRate: number;
  /** Probability of guessing correctly (P(G)) */
  guessRate: number;
  /** Probability of slipping (P(S)) */
  slipRate: number;
}

/**
 * Skill dependency for DAG structure in Bayesian pathway
 */
export interface SkillDependency {
  /** Source skill ID (prerequisite) */
  from: string;
  /** Target skill ID (dependent) */
  to: string;
  /** Dependency strength (0-1) */
  strength: number;
  /** Type of dependency */
  type: 'prerequisite' | 'related' | 'sequential';
}

/**
 * Complete Hybrid Model Configuration
 *
 * Configures both pathways and their fusion mechanism.
 */
export interface HybridModelConfig {
  // ==========================================
  // Transformer Pathway Configuration
  // ==========================================

  /** Number of transformer encoder layers (default: 4) */
  transformerLayers: number;

  /** Number of attention heads per layer (default: 8) */
  attentionHeads: number;

  /** Embedding dimension for skill/response vectors (default: 64) */
  embeddingDim: number;

  /** Maximum sequence length for attention (default: 100) */
  maxSequenceLength: number;

  /** Dropout rate for regularization (default: 0.1) */
  dropout: number;

  /** Feed-forward hidden dimension (default: 256) */
  feedForwardDim: number;

  // ==========================================
  // Bayesian Pathway Configuration
  // ==========================================

  /** BKT prior probabilities */
  bktPriors: BKTPriors;

  /** Skill dependency graph structure */
  dagStructure: SkillDependency[];

  /** Use content-type specific BKT parameters */
  useContentTypeBKT: boolean;

  // ==========================================
  // Cross-Attention Fusion Configuration
  // ==========================================

  /** Number of cross-attention layers (default: 2) */
  crossAttentionLayers: number;

  /** Method for fusing pathways */
  fusionMethod: 'concat' | 'gated' | 'attention';

  /** Weight for gated fusion (0 = pure BKT, 1 = pure transformer) */
  gateInitialBias: number;

  // ==========================================
  // Cold-Start & Blending Configuration
  // ==========================================

  /** Minimum interactions before using transformer (default: 20) */
  coldStartThreshold: number;

  /** Interactions for full hybrid mode (default: 50) */
  warmupEndThreshold: number;

  /** Blend curve type */
  blendCurve: 'linear' | 'sigmoid';

  // ==========================================
  // Training Configuration
  // ==========================================

  /** Learning rate for transformer pathway */
  learningRate: number;

  /** Batch size for training */
  batchSize: number;

  /** Weight decay for regularization */
  weightDecay: number;

  /** Use Rasch difficulty adjustment */
  useRaschAdjustment: boolean;

  /** Use temporal decay modeling */
  useTemporalDecay: boolean;

  /** Forgetting half-life in hours */
  forgettingHalfLife: number;
}

/**
 * Default configuration based on research best practices
 */
export const DEFAULT_HYBRID_MODEL_CONFIG: HybridModelConfig = {
  // Transformer pathway (SAKT-lite architecture)
  transformerLayers: 4,
  attentionHeads: 8,
  embeddingDim: 64,
  maxSequenceLength: 100,
  dropout: 0.1,
  feedForwardDim: 256,

  // Bayesian pathway
  bktPriors: {
    initialMastery: 0.1,
    learnRate: 0.3,
    guessRate: 0.25,
    slipRate: 0.1,
  },
  dagStructure: [],
  useContentTypeBKT: true,

  // Cross-attention fusion
  crossAttentionLayers: 2,
  fusionMethod: 'gated',
  gateInitialBias: 0.5,

  // Cold-start handling
  coldStartThreshold: 20,
  warmupEndThreshold: 50,
  blendCurve: 'sigmoid',

  // Training
  learningRate: 0.001,
  batchSize: 32,
  weightDecay: 0.01,
  useRaschAdjustment: true,
  useTemporalDecay: true,
  forgettingHalfLife: 168, // 1 week
};

// ============================================================================
// PREDICTION TYPES
// ============================================================================

/**
 * Hybrid Model Prediction Output
 *
 * Contains mastery probability, confidence, pathway contributions,
 * and optional attention weights for interpretability.
 */
export interface HybridPrediction {
  /** Primary output: probability of skill mastery (0-1) */
  masteryProbability: number;

  /** Predicted probability of answering next question correctly */
  correctProbability: number;

  /** Model confidence in this prediction (0-1) */
  confidence: number;

  /** Which pathway dominated this prediction */
  pathway: 'bkt' | 'transformer' | 'hybrid';

  /** Attention weights for interpretability (optional) */
  attentionWeights?: number[];

  /** Pathway contribution breakdown */
  contributions: PathwayContributions;

  /** Prediction metadata */
  metadata: PredictionMetadata;
}

/**
 * Breakdown of how each pathway contributed to the prediction
 */
export interface PathwayContributions {
  /** BKT pathway contribution (0-1) */
  bkt: number;

  /** Transformer pathway contribution (0-1) */
  transformer: number;

  /** Rasch difficulty adjustment applied */
  difficultyAdjustment: number;

  /** Temporal decay factor applied */
  temporalDecay: number;

  /** Gate value if using gated fusion */
  gateValue?: number;
}

/**
 * Metadata about the prediction
 */
export interface PredictionMetadata {
  /** Model version that made this prediction */
  modelVersion: string;

  /** Number of interactions used */
  interactionCount: number;

  /** Time taken to compute prediction (ms) */
  computeTimeMs: number;

  /** Whether this was a cold-start prediction */
  isColdStart: boolean;

  /** Blend weight if in transition zone */
  blendWeight: number;

  /** Timestamp of prediction */
  timestamp: Date;
}

// ============================================================================
// DUAL-PATHWAY STATE TYPES
// ============================================================================

/**
 * Transformer Pathway Hidden State
 *
 * Represents the learned sequence encoding from the transformer pathway.
 */
export interface TransformerState {
  /** Sequence encoding vector (dimension: embeddingDim) */
  sequenceEncoding: number[];

  /** Per-skill hidden states for multi-skill tracking */
  skillStates: Record<string, number[]>;

  /** Attention pattern from last forward pass */
  lastAttentionPattern?: number[][];

  /** Position in sequence */
  sequencePosition: number;
}

/**
 * Bayesian Pathway State
 *
 * Represents the BKT state vectors for all skills.
 */
export interface BayesianState {
  /** Per-skill mastery probabilities */
  masteryProbabilities: Record<string, number>;

  /** Per-skill BKT parameters (may be personalized) */
  skillParams: Record<string, BKTParameters>;

  /** DAG-propagated mastery (considering prerequisites) */
  propagatedMastery: Record<string, number>;
}

/**
 * Combined Dual-Pathway State
 */
export interface DualPathwayState {
  /** Transformer pathway state */
  transformer: TransformerState;

  /** Bayesian pathway state */
  bayesian: BayesianState;

  /** Cross-attention fusion weights */
  fusionWeights: PathwayWeights;

  /** User ID this state belongs to */
  userId: string;

  /** Last updated timestamp */
  lastUpdated: Date;
}

/**
 * Learned pathway weights from cross-attention
 */
export interface PathwayWeights {
  /** Weight for transformer pathway (0-1) */
  transformer: number;

  /** Weight for Bayesian pathway (0-1) */
  bayesian: number;
}

// ============================================================================
// EMBEDDING TYPES (Rasch-Enhanced DKT2)
// ============================================================================

/**
 * Rasch-Enhanced Embedding for Transformer Input
 *
 * Following DKT2 architecture: each interaction is embedded with
 * skill, response, difficulty, and temporal features.
 */
export interface RaschEmbedding {
  /** Learnable skill embedding vector (dim: embeddingDim) */
  skillEmbedding: number[];

  /** Binary response embedding (0 or 1) */
  responseEmbedding: number;

  /** Question difficulty scalar (deviation from concept average) */
  difficultyScalar: number;

  /** Question variation vector for this concept */
  variationVector: number[];

  /** Time gap embedding for forgetting curve */
  timeGapEmbedding: number;

  /** Positional encoding for sequence position */
  positionalEncoding: number[];
}

/**
 * Skill Embedding Table Entry
 */
export interface SkillEmbeddingEntry {
  /** Skill identifier */
  skillId: string;

  /** Learned embedding vector */
  embedding: number[];

  /** Number of updates (for tracking stability) */
  updateCount: number;
}

/**
 * Complete Embedding Tables for the Model
 */
export interface EmbeddingTables {
  /** Skill embeddings (|S| x d) */
  skills: Map<string, number[]>;

  /** Question embeddings (|Q| x d) */
  questions: Map<string, number[]>;

  /** Response embeddings (2 x d) - correct/incorrect */
  responses: [number[], number[]];

  /** Positional encodings (maxSeqLen x d) */
  positions: number[][];
}

// ============================================================================
// TRAINING DATA TYPES
// ============================================================================

/**
 * Single interaction for training
 */
export interface TrainingInteraction {
  /** User identifier */
  userId: string;

  /** Skill being practiced */
  skillId: string;

  /** Question identifier */
  questionId: string;

  /** Whether response was correct */
  isCorrect: boolean;

  /** Unix timestamp */
  timestamp: number;

  /** Response time in milliseconds */
  responseTimeMs: number;

  /** Question difficulty (Rasch parameter) */
  questionDifficulty: number;

  /** Attempt number for this skill */
  attemptNumber: number;
}

/**
 * Sequence of interactions for one user (training input)
 */
export interface TrainingSequence {
  /** User identifier */
  userId: string;

  /** Ordered sequence of interactions */
  interactions: TrainingInteraction[];

  /** Target labels (next-response prediction) */
  labels: boolean[];

  /** Sequence length */
  length: number;
}

/**
 * Complete training dataset
 */
export interface TrainingData {
  /** Training sequences */
  train: TrainingSequence[];

  /** Validation sequences */
  validation: TrainingSequence[];

  /** Test sequences */
  test: TrainingSequence[];

  /** Dataset metadata */
  metadata: DatasetMetadata;
}

/**
 * Dataset metadata
 */
export interface DatasetMetadata {
  /** Dataset name/source */
  name: string;

  /** Total number of interactions */
  totalInteractions: number;

  /** Number of unique users */
  uniqueUsers: number;

  /** Number of unique skills */
  uniqueSkills: number;

  /** Number of unique questions */
  uniqueQuestions: number;

  /** Date range of data */
  dateRange: {
    start: Date;
    end: Date;
  };

  /** Split ratios used */
  splits: {
    train: number;
    validation: number;
    test: number;
  };
}

// ============================================================================
// TRAINING RESULT TYPES
// ============================================================================

/**
 * Training result from a training run
 */
export interface TrainingResult {
  /** Whether training succeeded */
  success: boolean;

  /** Final model version identifier */
  modelVersion: string;

  /** Training metrics per epoch */
  epochMetrics: EpochMetrics[];

  /** Final evaluation metrics */
  finalMetrics: EvaluationMetrics;

  /** Training configuration used */
  config: HybridModelConfig;

  /** Total training time in seconds */
  trainingTimeSeconds: number;

  /** Path to saved model weights (if applicable) */
  modelPath?: string;
}

/**
 * Metrics for a single training epoch
 */
export interface EpochMetrics {
  /** Epoch number (1-indexed) */
  epoch: number;

  /** Training loss */
  trainLoss: number;

  /** Validation loss */
  validationLoss: number;

  /** Training AUC */
  trainAUC: number;

  /** Validation AUC */
  validationAUC: number;

  /** Time for this epoch (seconds) */
  epochTimeSeconds: number;
}

/**
 * Complete evaluation metrics
 */
export interface EvaluationMetrics {
  /** Area Under ROC Curve (discrimination) */
  auc: number;

  /** Root Mean Square Error */
  rmse: number;

  /** Brier Score (calibration) - lower is better */
  brier: number;

  /** Accuracy at 0.5 threshold */
  accuracy: number;

  /** Precision at 0.5 threshold */
  precision: number;

  /** Recall at 0.5 threshold */
  recall: number;

  /** F1 Score */
  f1: number;

  /** Lift over BKT baseline */
  liftOverBKT: number;

  /** Sample size used for evaluation */
  sampleSize: number;

  /** Per-skill breakdown (optional) */
  perSkillMetrics?: Record<string, SkillMetrics>;
}

/**
 * Per-skill evaluation metrics
 */
export interface SkillMetrics {
  skillId: string;
  auc: number;
  rmse: number;
  sampleSize: number;
}

// ============================================================================
// MODEL WEIGHTS TYPES (for serialization)
// ============================================================================

/**
 * Serializable model weights
 */
export interface ModelWeights {
  /** Model version */
  version: string;

  /** Embedding tables */
  embeddings: SerializedEmbeddings;

  /** Transformer layer weights */
  transformerLayers: TransformerLayerWeights[];

  /** Cross-attention layer weights */
  crossAttentionLayers: CrossAttentionLayerWeights[];

  /** Final prediction head weights */
  predictionHead: PredictionHeadWeights;

  /** Pathway fusion gate weights (if gated) */
  fusionGate?: number[];
}

/**
 * Serialized embedding tables
 */
export interface SerializedEmbeddings {
  skills: Array<{ skillId: string; embedding: number[] }>;
  questions: Array<{ questionId: string; embedding: number[] }>;
  responses: [number[], number[]];
  positions: number[][];
}

/**
 * Transformer layer weights
 */
export interface TransformerLayerWeights {
  layerIndex: number;
  queryWeights: number[][];
  keyWeights: number[][];
  valueWeights: number[][];
  outputWeights: number[][];
  feedForward1: number[][];
  feedForward2: number[][];
  layerNorm1: { gamma: number[]; beta: number[] };
  layerNorm2: { gamma: number[]; beta: number[] };
}

/**
 * Cross-attention layer weights
 */
export interface CrossAttentionLayerWeights {
  layerIndex: number;
  queryWeights: number[][];
  keyWeights: number[][];
  valueWeights: number[][];
  outputWeights: number[][];
}

/**
 * Prediction head weights
 */
export interface PredictionHeadWeights {
  hiddenWeights: number[][];
  hiddenBias: number[];
  outputWeights: number[];
  outputBias: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Convert BKTPriors to BKTParameters format
 */
export function bktPriorsToBKTParameters(priors: BKTPriors): BKTParameters {
  return {
    pL0: priors.initialMastery,
    pT: priors.learnRate,
    pG: priors.guessRate,
    pS: priors.slipRate,
  };
}

/**
 * Convert BKTParameters to BKTPriors format
 */
export function bktParametersToBKTPriors(params: BKTParameters): BKTPriors {
  return {
    initialMastery: params.pL0,
    learnRate: params.pT,
    guessRate: params.pG,
    slipRate: params.pS,
  };
}

/**
 * Validate hybrid model configuration
 */
export function validateHybridConfig(config: HybridModelConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Transformer validation
  if (config.transformerLayers < 1 || config.transformerLayers > 12) {
    errors.push('transformerLayers must be between 1 and 12');
  }
  if (config.attentionHeads < 1 || config.attentionHeads > 16) {
    errors.push('attentionHeads must be between 1 and 16');
  }
  if (config.embeddingDim % config.attentionHeads !== 0) {
    errors.push('embeddingDim must be divisible by attentionHeads');
  }
  if (config.maxSequenceLength < 10 || config.maxSequenceLength > 500) {
    errors.push('maxSequenceLength must be between 10 and 500');
  }
  if (config.dropout < 0 || config.dropout > 0.5) {
    errors.push('dropout must be between 0 and 0.5');
  }

  // BKT validation
  const { bktPriors } = config;
  if (bktPriors.initialMastery < 0 || bktPriors.initialMastery > 0.5) {
    errors.push('initialMastery must be between 0 and 0.5');
  }
  if (bktPriors.learnRate < 0.05 || bktPriors.learnRate > 0.5) {
    errors.push('learnRate must be between 0.05 and 0.5');
  }
  if (bktPriors.guessRate + bktPriors.slipRate >= 0.5) {
    errors.push('guessRate + slipRate must be < 0.5 for model identifiability');
  }

  // Cold-start validation
  if (config.coldStartThreshold < 5 || config.coldStartThreshold > 50) {
    errors.push('coldStartThreshold must be between 5 and 50');
  }
  if (config.warmupEndThreshold <= config.coldStartThreshold) {
    errors.push('warmupEndThreshold must be greater than coldStartThreshold');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
