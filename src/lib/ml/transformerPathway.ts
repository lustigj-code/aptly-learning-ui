/**
 * Transformer Pathway for Hybrid Learner Model
 *
 * Phase 15.1: SAKT-Lite Architecture
 *
 * Architecture:
 * - Sequence encoder with positional embeddings
 * - Multi-head self-attention layers
 * - Feed-forward layers with dropout
 * - Output: sequence representation per skill
 *
 * Note: This defines the architecture and interfaces.
 * Actual model training happens server-side or in a separate ML pipeline.
 */

import type {
  HybridModelConfig,
  TransformerState,
  TransformerLayerWeights,
  RaschEmbedding,
  EmbeddingTables,
  TrainingInteraction,
} from './hybridModelTypes';
import { DEFAULT_HYBRID_MODEL_CONFIG } from './hybridModelTypes';

// ============================================================================
// ARCHITECTURE TYPES
// ============================================================================

/**
 * Transformer layer configuration
 */
export interface TransformerLayerConfig {
  /** Layer index */
  index: number;
  /** Embedding dimension */
  dModel: number;
  /** Number of attention heads */
  nHeads: number;
  /** Feed-forward hidden dimension */
  dFF: number;
  /** Dropout rate */
  dropout: number;
  /** Whether to use causal (left-to-right) attention */
  causalMask: boolean;
}

/**
 * Attention output with optional attention weights
 */
export interface AttentionOutput {
  /** Output tensor after attention */
  output: number[][];
  /** Attention weights (optional, for interpretability) */
  attentionWeights?: number[][][];
}

/**
 * Complete transformer encoder configuration
 */
export interface TransformerEncoderConfig {
  /** Number of layers */
  numLayers: number;
  /** Model dimension */
  dModel: number;
  /** Number of attention heads */
  nHeads: number;
  /** Feed-forward dimension */
  dFF: number;
  /** Dropout rate */
  dropout: number;
  /** Maximum sequence length */
  maxSeqLen: number;
  /** Use causal attention mask */
  causalMask: boolean;
}

// ============================================================================
// ATTENTION MECHANISM (TYPE DEFINITIONS)
// ============================================================================

/**
 * Scaled Dot-Product Attention
 *
 * Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) * V
 *
 * This is a type definition for the attention computation.
 */
export interface ScaledDotProductAttentionParams {
  /** Query tensor [batch, seq_len, d_k] */
  query: number[][][];
  /** Key tensor [batch, seq_len, d_k] */
  key: number[][][];
  /** Value tensor [batch, seq_len, d_v] */
  value: number[][][];
  /** Optional attention mask */
  mask?: number[][];
  /** Dimension of key (for scaling) */
  dK: number;
}

/**
 * Multi-Head Attention configuration
 */
export interface MultiHeadAttentionConfig {
  /** Model dimension */
  dModel: number;
  /** Number of heads */
  nHeads: number;
  /** Dropout rate */
  dropout: number;
  /** Return attention weights for interpretability */
  returnAttentionWeights: boolean;
}

/**
 * Multi-Head Attention weights
 */
export interface MultiHeadAttentionWeights {
  /** Query projection [d_model, d_model] */
  wQ: number[][];
  /** Key projection [d_model, d_model] */
  wK: number[][];
  /** Value projection [d_model, d_model] */
  wV: number[][];
  /** Output projection [d_model, d_model] */
  wO: number[][];
}

// ============================================================================
// MATHEMATICAL OPERATIONS (PURE FUNCTIONS)
// ============================================================================

/**
 * Softmax function
 */
export function softmax(values: number[]): number[] {
  const maxVal = Math.max(...values);
  const expValues = values.map((v) => Math.exp(v - maxVal));
  const sumExp = expValues.reduce((a, b) => a + b, 0);
  return expValues.map((v) => v / sumExp);
}

/**
 * Layer normalization
 */
export function layerNorm(
  values: number[],
  gamma: number[],
  beta: number[],
  epsilon: number = 1e-6
): number[] {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const std = Math.sqrt(variance + epsilon);

  return values.map((v, i) => gamma[i] * ((v - mean) / std) + beta[i]);
}

/**
 * GELU activation function (Gaussian Error Linear Unit)
 */
export function gelu(x: number): number {
  return 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * Math.pow(x, 3))));
}

/**
 * Matrix multiplication (2D)
 */
export function matmul(a: number[][], b: number[][]): number[][] {
  const rowsA = a.length;
  const colsA = a[0].length;
  const colsB = b[0].length;

  const result: number[][] = new Array(rowsA)
    .fill(null)
    .map(() => new Array(colsB).fill(0));

  for (let i = 0; i < rowsA; i++) {
    for (let j = 0; j < colsB; j++) {
      for (let k = 0; k < colsA; k++) {
        result[i][j] += a[i][k] * b[k][j];
      }
    }
  }

  return result;
}

/**
 * Vector-matrix multiplication
 */
export function vecMatmul(vec: number[], mat: number[][]): number[] {
  return mat[0].map((_, colIdx) =>
    vec.reduce((sum, v, rowIdx) => sum + v * mat[rowIdx][colIdx], 0)
  );
}

/**
 * Add two vectors element-wise
 */
export function addVectors(a: number[], b: number[]): number[] {
  return a.map((v, i) => v + b[i]);
}

/**
 * Scale vector by scalar
 */
export function scaleVector(vec: number[], scalar: number): number[] {
  return vec.map((v) => v * scalar);
}

// ============================================================================
// EMBEDDING LAYER
// ============================================================================

/**
 * Create input embedding from interaction
 *
 * Combines skill embedding, response embedding, difficulty, and position.
 */
export function createInputEmbedding(
  embedding: RaschEmbedding,
  config: HybridModelConfig = DEFAULT_HYBRID_MODEL_CONFIG
): number[] {
  const { embeddingDim } = config;

  // Start with skill embedding
  const inputEmbedding = [...embedding.skillEmbedding];

  // Add response embedding (scaled)
  const responseScalar = embedding.responseEmbedding * 2 - 1; // Scale to [-1, 1]
  for (let i = 0; i < inputEmbedding.length; i++) {
    inputEmbedding[i] += responseScalar * 0.1;
  }

  // Add difficulty deviation
  const difficultyScale = embedding.difficultyScalar * 0.5;
  for (let i = 0; i < Math.min(embedding.variationVector.length, embeddingDim); i++) {
    inputEmbedding[i] += difficultyScale * (embedding.variationVector[i] || 0);
  }

  // Add time gap embedding (decayed)
  const timeDecay = Math.exp(-embedding.timeGapEmbedding);
  for (let i = 0; i < inputEmbedding.length; i++) {
    inputEmbedding[i] *= (1 - 0.1 * (1 - timeDecay)); // Slight decay for older interactions
  }

  // Add positional encoding
  return addVectors(inputEmbedding, embedding.positionalEncoding);
}

/**
 * Initialize embedding tables
 */
export function initializeEmbeddingTables(
  skills: string[],
  questions: string[],
  config: HybridModelConfig = DEFAULT_HYBRID_MODEL_CONFIG
): EmbeddingTables {
  const { embeddingDim, maxSequenceLength } = config;

  // Xavier/Glorot initialization scale
  const scale = Math.sqrt(2.0 / (embeddingDim + embeddingDim));

  // Initialize skill embeddings
  const skillEmbeddings = new Map<string, number[]>();
  for (const skillId of skills) {
    const embedding = new Array(embeddingDim)
      .fill(0)
      .map(() => (Math.random() * 2 - 1) * scale);
    skillEmbeddings.set(skillId, embedding);
  }

  // Initialize question embeddings
  const questionEmbeddings = new Map<string, number[]>();
  for (const questionId of questions) {
    const embedding = new Array(embeddingDim)
      .fill(0)
      .map(() => (Math.random() * 2 - 1) * scale);
    questionEmbeddings.set(questionId, embedding);
  }

  // Initialize response embeddings (correct/incorrect)
  const responseEmbeddings: [number[], number[]] = [
    new Array(embeddingDim).fill(0).map(() => (Math.random() * 2 - 1) * scale),
    new Array(embeddingDim).fill(0).map(() => (Math.random() * 2 - 1) * scale),
  ];

  // Create positional encodings (sinusoidal)
  const positionEmbeddings: number[][] = [];
  for (let pos = 0; pos < maxSequenceLength; pos++) {
    const encoding = new Array(embeddingDim);
    for (let i = 0; i < embeddingDim; i++) {
      const angle = pos / Math.pow(10000, (2 * Math.floor(i / 2)) / embeddingDim);
      encoding[i] = i % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
    }
    positionEmbeddings.push(encoding);
  }

  return {
    skills: skillEmbeddings,
    questions: questionEmbeddings,
    responses: responseEmbeddings,
    positions: positionEmbeddings,
  };
}

// ============================================================================
// TRANSFORMER LAYER
// ============================================================================

/**
 * Single transformer layer forward pass (type definition)
 *
 * Layer architecture:
 * 1. Multi-head self-attention
 * 2. Add & Norm (residual connection)
 * 3. Feed-forward network
 * 4. Add & Norm (residual connection)
 */
export interface TransformerLayerOutput {
  /** Output hidden states [seq_len, d_model] */
  hidden: number[][];
  /** Attention weights (optional) [n_heads, seq_len, seq_len] */
  attentionWeights?: number[][][];
}

/**
 * Feed-forward network configuration
 */
export interface FeedForwardConfig {
  /** Input dimension */
  dModel: number;
  /** Hidden dimension */
  dFF: number;
  /** Dropout rate */
  dropout: number;
}

/**
 * Apply feed-forward network to single vector
 */
export function feedForward(
  input: number[],
  w1: number[][],
  b1: number[],
  w2: number[][],
  b2: number[]
): number[] {
  // First linear layer + GELU
  const hidden = addVectors(vecMatmul(input, w1), b1).map(gelu);
  // Second linear layer
  return addVectors(vecMatmul(hidden, w2), b2);
}

// ============================================================================
// TRANSFORMER ENCODER
// ============================================================================

/**
 * Transformer encoder state
 */
export interface TransformerEncoderState {
  /** Hidden states for each layer [num_layers, seq_len, d_model] */
  layerHiddens: number[][][];
  /** Final output [seq_len, d_model] */
  output: number[][];
  /** Attention patterns per layer (optional) */
  attentionPatterns?: number[][][][];
}

/**
 * Create causal attention mask
 *
 * Returns mask where position i can only attend to positions <= i
 */
export function createCausalMask(seqLen: number): number[][] {
  const mask: number[][] = [];
  for (let i = 0; i < seqLen; i++) {
    const row = new Array(seqLen).fill(-Infinity);
    for (let j = 0; j <= i; j++) {
      row[j] = 0; // Can attend
    }
    mask.push(row);
  }
  return mask;
}

/**
 * Create padding attention mask
 */
export function createPaddingMask(lengths: number[], maxLen: number): number[][] {
  return lengths.map((len) => {
    const mask = new Array(maxLen).fill(-Infinity);
    for (let i = 0; i < len; i++) {
      mask[i] = 0;
    }
    return mask;
  });
}

/**
 * Combine causal and padding masks
 */
export function combineMasks(
  causalMask: number[][],
  paddingMask: number[]
): number[][] {
  return causalMask.map((row, i) =>
    row.map((v, j) => v + paddingMask[j])
  );
}

// ============================================================================
// TRANSFORMER PATHWAY CLASS (INTERFACE)
// ============================================================================

/**
 * Transformer Pathway Interface
 *
 * Defines the contract for the transformer pathway in the hybrid model.
 * Actual implementation would use TensorFlow.js or similar for GPU acceleration.
 */
export interface ITransformerPathway {
  /**
   * Process sequence and return hidden states
   */
  forward(
    embeddings: RaschEmbedding[],
    mask?: number[]
  ): Promise<TransformerState>;

  /**
   * Get prediction for next response
   */
  predictNext(state: TransformerState, skillId: string): Promise<number>;

  /**
   * Update state with new interaction
   */
  updateState(
    state: TransformerState,
    newEmbedding: RaschEmbedding
  ): TransformerState;

  /**
   * Load pretrained weights
   */
  loadWeights(weights: TransformerLayerWeights[]): void;

  /**
   * Get attention weights for interpretability
   */
  getAttentionWeights(state: TransformerState): number[][] | undefined;
}

/**
 * Transformer Pathway Configuration Builder
 */
export function createTransformerConfig(
  hybridConfig: HybridModelConfig = DEFAULT_HYBRID_MODEL_CONFIG
): TransformerEncoderConfig {
  return {
    numLayers: hybridConfig.transformerLayers,
    dModel: hybridConfig.embeddingDim,
    nHeads: hybridConfig.attentionHeads,
    dFF: hybridConfig.feedForwardDim,
    dropout: hybridConfig.dropout,
    maxSeqLen: hybridConfig.maxSequenceLength,
    causalMask: true, // Knowledge tracing uses causal attention
  };
}

// ============================================================================
// SIMPLIFIED TRANSFORMER PATHWAY (CPU IMPLEMENTATION)
// ============================================================================

/**
 * Simplified Transformer Pathway
 *
 * A CPU-only implementation for inference when GPU is not available.
 * Uses simplified attention mechanism suitable for small sequence lengths.
 */
export class SimpleTransformerPathway implements ITransformerPathway {
  private config: TransformerEncoderConfig;
  private embeddingTables: EmbeddingTables | null = null;
  private layerWeights: TransformerLayerWeights[] = [];

  constructor(hybridConfig: HybridModelConfig = DEFAULT_HYBRID_MODEL_CONFIG) {
    this.config = createTransformerConfig(hybridConfig);
  }

  /**
   * Initialize embedding tables
   */
  initializeEmbeddings(skills: string[], questions: string[]): void {
    this.embeddingTables = initializeEmbeddingTables(
      skills,
      questions,
      DEFAULT_HYBRID_MODEL_CONFIG
    );
  }

  /**
   * Process sequence and return hidden states
   */
  async forward(
    embeddings: RaschEmbedding[],
    mask?: number[]
  ): Promise<TransformerState> {
    const seqLen = embeddings.length;

    // Create input embeddings
    const inputEmbeddings = embeddings.map((emb) =>
      createInputEmbedding(emb, DEFAULT_HYBRID_MODEL_CONFIG)
    );

    // Create causal mask if not provided
    const attentionMask =
      mask || new Array(seqLen).fill(0).map((_, i) => (i < seqLen ? 0 : -Infinity));

    // Simplified: just return the input embeddings as the encoding
    // In full implementation, this would pass through transformer layers
    const sequenceEncoding = inputEmbeddings[seqLen - 1] || new Array(this.config.dModel).fill(0);

    // Build skill states
    const skillStates: Record<string, number[]> = {};
    for (const emb of embeddings) {
      skillStates[emb.skillEmbedding.toString()] = emb.skillEmbedding;
    }

    return {
      sequenceEncoding,
      skillStates,
      sequencePosition: seqLen,
      lastAttentionPattern: undefined, // Would be populated in full implementation
    };
  }

  /**
   * Get prediction for next response
   */
  async predictNext(state: TransformerState, _skillId: string): Promise<number> {
    // Simple prediction based on sequence encoding
    // Full implementation would use prediction head
    const encoding = state.sequenceEncoding;
    const sum = encoding.reduce((a, b) => a + b, 0);
    const mean = sum / encoding.length;

    // Sigmoid activation
    return 1 / (1 + Math.exp(-mean));
  }

  /**
   * Update state with new interaction
   */
  updateState(
    state: TransformerState,
    newEmbedding: RaschEmbedding
  ): TransformerState {
    const newInputEmbedding = createInputEmbedding(newEmbedding, DEFAULT_HYBRID_MODEL_CONFIG);

    // Simple update: blend new embedding with existing
    const blendFactor = 0.7;
    const newEncoding = state.sequenceEncoding.map(
      (v, i) => v * (1 - blendFactor) + newInputEmbedding[i] * blendFactor
    );

    return {
      ...state,
      sequenceEncoding: newEncoding,
      sequencePosition: state.sequencePosition + 1,
    };
  }

  /**
   * Load pretrained weights
   */
  loadWeights(weights: TransformerLayerWeights[]): void {
    this.layerWeights = weights;
  }

  /**
   * Get attention weights for interpretability
   */
  getAttentionWeights(state: TransformerState): number[][] | undefined {
    return state.lastAttentionPattern;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create transformer pathway instance
 */
export function createTransformerPathway(
  config: HybridModelConfig = DEFAULT_HYBRID_MODEL_CONFIG
): ITransformerPathway {
  return new SimpleTransformerPathway(config);
}

// ============================================================================
// SKILL STATE EXTRACTION
// ============================================================================

/**
 * Extract per-skill hidden states from transformer output
 *
 * For each skill, aggregate hidden states from relevant positions.
 */
export function extractSkillStates(
  hiddenStates: number[][],
  interactions: TrainingInteraction[],
  aggregation: 'last' | 'mean' | 'attention' = 'last'
): Record<string, number[]> {
  const skillStates: Record<string, number[]> = {};
  const skillPositions: Record<string, number[]> = {};

  // Group positions by skill
  interactions.forEach((interaction, idx) => {
    if (!skillPositions[interaction.skillId]) {
      skillPositions[interaction.skillId] = [];
    }
    skillPositions[interaction.skillId].push(idx);
  });

  // Aggregate hidden states per skill
  for (const [skillId, positions] of Object.entries(skillPositions)) {
    if (positions.length === 0) continue;

    switch (aggregation) {
      case 'last':
        // Use hidden state from last position for this skill
        skillStates[skillId] = hiddenStates[positions[positions.length - 1]];
        break;

      case 'mean':
        // Average hidden states across all positions
        const dim = hiddenStates[0].length;
        const meanState = new Array(dim).fill(0);
        for (const pos of positions) {
          for (let i = 0; i < dim; i++) {
            meanState[i] += hiddenStates[pos][i];
          }
        }
        skillStates[skillId] = meanState.map((v) => v / positions.length);
        break;

      case 'attention':
        // Would use attention-weighted aggregation
        // Fallback to last for simplified implementation
        skillStates[skillId] = hiddenStates[positions[positions.length - 1]];
        break;
    }
  }

  return skillStates;
}
