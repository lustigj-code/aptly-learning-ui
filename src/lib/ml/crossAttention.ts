/**
 * Cross-Attention Fusion Module for Hybrid Learner Model
 *
 * Phase 15.1: Fuses Transformer and BKT Pathways
 *
 * Architecture:
 * - Query: Transformer sequence encoding
 * - Key/Value: BKT state vectors
 * - Gated fusion combines both pathways
 * - Final prediction head outputs mastery probability
 *
 * Research: Mai et al., 2025 - Cross-Attention for Knowledge Tracing
 */

import type {
  HybridModelConfig,
  TransformerState,
  BayesianState,
  DualPathwayState,
  PathwayWeights,
  PathwayContributions,
  CrossAttentionLayerWeights,
  HybridPrediction,
  PredictionMetadata,
} from './hybridModelTypes';
import { DEFAULT_HYBRID_MODEL_CONFIG } from './hybridModelTypes';
import { softmax, addVectors, scaleVector, vecMatmul } from './transformerPathway';

// ============================================================================
// CROSS-ATTENTION TYPES
// ============================================================================

/**
 * Cross-attention configuration
 */
export interface CrossAttentionConfig {
  /** Query dimension (from transformer) */
  queryDim: number;
  /** Key/Value dimension (from BKT) */
  kvDim: number;
  /** Output dimension */
  outputDim: number;
  /** Number of attention heads */
  numHeads: number;
  /** Dropout rate */
  dropout: number;
}

/**
 * Cross-attention output
 */
export interface CrossAttentionOutput {
  /** Fused representation */
  fused: number[];
  /** Attention weights over BKT states */
  attentionWeights: number[];
  /** Per-skill attention weights */
  skillAttention: Record<string, number>;
}

/**
 * Gated fusion output
 */
export interface GatedFusionOutput {
  /** Final fused representation */
  fused: number[];
  /** Gate value (0 = pure BKT, 1 = pure transformer) */
  gateValue: number;
  /** Pathway contributions */
  contributions: PathwayContributions;
}

// ============================================================================
// CROSS-ATTENTION MECHANISM
// ============================================================================

/**
 * Compute cross-attention between transformer query and BKT key-values
 *
 * Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) * V
 *
 * Where:
 * - Q is transformer sequence encoding
 * - K, V are BKT skill state vectors
 */
export function computeCrossAttention(
  query: number[],
  keys: number[][],
  values: number[][],
  weights: CrossAttentionLayerWeights,
  config: CrossAttentionConfig
): CrossAttentionOutput {
  const { queryDim, numHeads } = config;
  const headDim = Math.floor(queryDim / numHeads);
  const numKeys = keys.length;

  if (numKeys === 0) {
    // No BKT states to attend to
    return {
      fused: query,
      attentionWeights: [],
      skillAttention: {},
    };
  }

  // Project query
  const projectedQuery = vecMatmul(query, weights.queryWeights);

  // Project keys and values
  const projectedKeys = keys.map((k) => vecMatmul(k, weights.keyWeights));
  const projectedValues = values.map((v) => vecMatmul(v, weights.valueWeights));

  // Compute attention scores
  const scale = 1 / Math.sqrt(headDim);
  const scores = projectedKeys.map((k) => {
    // Dot product of query and key
    const dotProduct = projectedQuery.reduce((sum, q, i) => sum + q * k[i], 0);
    return dotProduct * scale;
  });

  // Apply softmax
  const attentionWeights = softmax(scores);

  // Compute weighted sum of values
  const outputDim = projectedValues[0]?.length || queryDim;
  const attended = new Array(outputDim).fill(0);
  for (let i = 0; i < numKeys; i++) {
    for (let j = 0; j < outputDim; j++) {
      attended[j] += attentionWeights[i] * (projectedValues[i]?.[j] || 0);
    }
  }

  // Project output
  const fused = vecMatmul(attended, weights.outputWeights);

  return {
    fused,
    attentionWeights,
    skillAttention: {}, // Would map attention weights to skill IDs
  };
}

/**
 * Multi-head cross-attention
 *
 * Runs multiple attention heads and concatenates outputs.
 */
export function multiHeadCrossAttention(
  query: number[],
  keys: number[][],
  values: number[][],
  numHeads: number
): { output: number[]; perHeadWeights: number[][] } {
  const queryDim = query.length;
  const headDim = Math.floor(queryDim / numHeads);
  const numKeys = keys.length;

  if (numKeys === 0) {
    return { output: query, perHeadWeights: [] };
  }

  const headOutputs: number[][] = [];
  const perHeadWeights: number[][] = [];

  for (let h = 0; h < numHeads; h++) {
    const startIdx = h * headDim;
    const endIdx = startIdx + headDim;

    // Split query into head
    const headQuery = query.slice(startIdx, endIdx);

    // Split keys into head
    const headKeys = keys.map((k) => k.slice(startIdx, Math.min(endIdx, k.length)));

    // Split values into head
    const headValues = values.map((v) => v.slice(startIdx, Math.min(endIdx, v.length)));

    // Compute attention for this head
    const scale = 1 / Math.sqrt(headDim);
    const scores = headKeys.map((k) =>
      headQuery.reduce((sum, q, i) => sum + q * (k[i] || 0), 0) * scale
    );
    const weights = softmax(scores);
    perHeadWeights.push(weights);

    // Weighted sum
    const headOutput = new Array(headDim).fill(0);
    for (let i = 0; i < numKeys; i++) {
      for (let j = 0; j < headDim; j++) {
        headOutput[j] += weights[i] * (headValues[i]?.[j] || 0);
      }
    }
    headOutputs.push(headOutput);
  }

  // Concatenate head outputs
  const output = headOutputs.flat();

  return { output, perHeadWeights };
}

// ============================================================================
// GATED FUSION
// ============================================================================

/**
 * Gated fusion of transformer and BKT pathways
 *
 * gate = sigmoid(W_g * [transformer; bkt] + b_g)
 * output = gate * transformer + (1 - gate) * bkt
 *
 * The gate learns to balance the two pathways based on context.
 */
export function gatedFusion(
  transformerOutput: number[],
  bktOutput: number[],
  gateWeights: number[],
  gateBias: number,
  config: HybridModelConfig = DEFAULT_HYBRID_MODEL_CONFIG
): GatedFusionOutput {
  // Ensure same dimensions
  const dim = transformerOutput.length;
  const bktPadded =
    bktOutput.length < dim
      ? [...bktOutput, ...new Array(dim - bktOutput.length).fill(0)]
      : bktOutput.slice(0, dim);

  // Concatenate for gate computation
  const concatenated = [...transformerOutput, ...bktPadded];

  // Compute gate value (scalar)
  let gateLogit = gateBias;
  for (let i = 0; i < Math.min(gateWeights.length, concatenated.length); i++) {
    gateLogit += gateWeights[i] * concatenated[i];
  }

  // Sigmoid activation
  const gateValue = 1 / (1 + Math.exp(-gateLogit));

  // Apply gate with initial bias
  const adjustedGate = gateValue * (1 - config.gateInitialBias) + config.gateInitialBias * 0.5;

  // Blend outputs
  const fused = new Array(dim);
  for (let i = 0; i < dim; i++) {
    fused[i] =
      adjustedGate * transformerOutput[i] + (1 - adjustedGate) * bktPadded[i];
  }

  // Calculate contributions
  const contributions: PathwayContributions = {
    bkt: 1 - adjustedGate,
    transformer: adjustedGate,
    difficultyAdjustment: 0, // Would be set by caller
    temporalDecay: 0, // Would be set by caller
    gateValue: adjustedGate,
  };

  return {
    fused,
    gateValue: adjustedGate,
    contributions,
  };
}

/**
 * Concatenation fusion (simple baseline)
 */
export function concatFusion(
  transformerOutput: number[],
  bktOutput: number[]
): { fused: number[]; contributions: PathwayContributions } {
  const fused = [...transformerOutput, ...bktOutput];

  return {
    fused,
    contributions: {
      bkt: 0.5,
      transformer: 0.5,
      difficultyAdjustment: 0,
      temporalDecay: 0,
    },
  };
}

/**
 * Attention-based fusion
 *
 * Uses transformer output as query to attend over BKT states.
 */
export function attentionFusion(
  transformerOutput: number[],
  bktStates: Record<string, number[]>,
  targetSkillId: string
): GatedFusionOutput {
  const skillIds = Object.keys(bktStates);
  const numSkills = skillIds.length;

  if (numSkills === 0) {
    // No BKT states - use transformer only
    return {
      fused: transformerOutput,
      gateValue: 1,
      contributions: {
        bkt: 0,
        transformer: 1,
        difficultyAdjustment: 0,
        temporalDecay: 0,
        gateValue: 1,
      },
    };
  }

  // Get BKT states as arrays
  const bktVectors = skillIds.map((id) => bktStates[id]);

  // Compute attention scores
  const scores = bktVectors.map((bktVec) => {
    // Dot product similarity
    const minLen = Math.min(transformerOutput.length, bktVec.length);
    let score = 0;
    for (let i = 0; i < minLen; i++) {
      score += transformerOutput[i] * bktVec[i];
    }
    return score / Math.sqrt(minLen);
  });

  // Boost attention for target skill
  const targetIdx = skillIds.indexOf(targetSkillId);
  if (targetIdx >= 0) {
    scores[targetIdx] += 1.0; // Bias toward target skill
  }

  // Softmax attention
  const attention = softmax(scores);

  // Weighted sum of BKT states
  const dim = transformerOutput.length;
  const attendedBKT = new Array(dim).fill(0);
  for (let i = 0; i < numSkills; i++) {
    for (let j = 0; j < Math.min(dim, bktVectors[i].length); j++) {
      attendedBKT[j] += attention[i] * bktVectors[i][j];
    }
  }

  // Blend with transformer output (50/50 default)
  const fused = transformerOutput.map((t, i) => 0.5 * t + 0.5 * attendedBKT[i]);

  // Calculate effective gate based on attention entropy
  const entropy = -attention.reduce(
    (sum, p) => (p > 0 ? sum + p * Math.log(p) : sum),
    0
  );
  const maxEntropy = Math.log(numSkills);
  const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 0;

  // High entropy = uncertain = lean toward transformer
  const gateValue = 0.5 + normalizedEntropy * 0.3;

  return {
    fused,
    gateValue,
    contributions: {
      bkt: 1 - gateValue,
      transformer: gateValue,
      difficultyAdjustment: 0,
      temporalDecay: 0,
      gateValue,
    },
  };
}

// ============================================================================
// PREDICTION HEAD
// ============================================================================

/**
 * Prediction head configuration
 */
export interface PredictionHeadConfig {
  /** Input dimension */
  inputDim: number;
  /** Hidden dimension */
  hiddenDim: number;
  /** Output dimension (1 for binary classification) */
  outputDim: number;
  /** Dropout rate */
  dropout: number;
}

/**
 * MLP prediction head
 *
 * Transforms fused representation to mastery probability.
 */
export function predictionHead(
  fused: number[],
  hiddenWeights: number[][],
  hiddenBias: number[],
  outputWeights: number[],
  outputBias: number
): number {
  // Hidden layer with ReLU
  const hidden = addVectors(vecMatmul(fused, hiddenWeights), hiddenBias).map(
    (v) => Math.max(0, v) // ReLU
  );

  // Output layer
  const logit = hidden.reduce((sum, h, i) => sum + h * outputWeights[i], outputBias);

  // Sigmoid activation
  return 1 / (1 + Math.exp(-logit));
}

/**
 * Simple prediction head (for cold-start)
 *
 * Uses single linear layer when data is limited.
 */
export function simplePredictionHead(
  features: number[],
  weights: number[],
  bias: number
): number {
  const logit = features.reduce(
    (sum, f, i) => sum + f * (weights[i] || 0),
    bias
  );
  return 1 / (1 + Math.exp(-logit));
}

// ============================================================================
// FUSION ORCHESTRATOR
// ============================================================================

/**
 * Fuse pathways based on configuration
 */
export function fusePathways(
  transformerState: TransformerState,
  bayesianState: BayesianState,
  targetSkillId: string,
  config: HybridModelConfig = DEFAULT_HYBRID_MODEL_CONFIG
): GatedFusionOutput {
  const transformerOutput = transformerState.sequenceEncoding;

  // Get BKT state for target skill
  const targetMastery = bayesianState.masteryProbabilities[targetSkillId] ?? 0.1;
  const propagatedMastery = bayesianState.propagatedMastery[targetSkillId] ?? targetMastery;

  // Create BKT feature vector
  const bktVector = [
    targetMastery,
    propagatedMastery,
    Math.log1p(transformerState.sequencePosition), // Log sequence length
    targetMastery > 0.9 ? 1 : 0, // Mastered flag
    targetMastery < 0.3 ? 1 : 0, // Struggling flag
  ];

  // Pad BKT vector to match transformer dimension
  const dim = transformerOutput.length;
  const bktPadded = [
    ...bktVector,
    ...new Array(Math.max(0, dim - bktVector.length)).fill(0),
  ].slice(0, dim);

  switch (config.fusionMethod) {
    case 'concat': {
      const result = concatFusion(transformerOutput, bktPadded);
      return {
        fused: result.fused,
        gateValue: 0.5,
        contributions: result.contributions,
      };
    }

    case 'attention':
      return attentionFusion(
        transformerOutput,
        bayesianState.masteryProbabilities as unknown as Record<string, number[]>,
        targetSkillId
      );

    case 'gated':
    default: {
      // Default gate weights (would be learned)
      const gateWeights = new Array(dim * 2).fill(0.01);
      const gateBias = config.gateInitialBias;

      return gatedFusion(transformerOutput, bktPadded, gateWeights, gateBias, config);
    }
  }
}

// ============================================================================
// CROSS-ATTENTION FUSION CLASS
// ============================================================================

/**
 * Cross-Attention Fusion Module
 *
 * Combines transformer and BKT pathways using learned attention.
 */
export class CrossAttentionFusion {
  private config: HybridModelConfig;
  private layerWeights: CrossAttentionLayerWeights[] = [];
  private gateWeights: number[] = [];
  private gateBias: number = 0;
  private predictionWeights: {
    hidden: number[][];
    hiddenBias: number[];
    output: number[];
    outputBias: number;
  } | null = null;

  constructor(config: HybridModelConfig = DEFAULT_HYBRID_MODEL_CONFIG) {
    this.config = config;
    this.initializeWeights();
  }

  /**
   * Initialize fusion weights
   */
  private initializeWeights(): void {
    const { embeddingDim, crossAttentionLayers, feedForwardDim } = this.config;

    // Initialize cross-attention layer weights
    const scale = Math.sqrt(2.0 / embeddingDim);
    for (let i = 0; i < crossAttentionLayers; i++) {
      this.layerWeights.push({
        layerIndex: i,
        queryWeights: this.randomMatrix(embeddingDim, embeddingDim, scale),
        keyWeights: this.randomMatrix(embeddingDim, embeddingDim, scale),
        valueWeights: this.randomMatrix(embeddingDim, embeddingDim, scale),
        outputWeights: this.randomMatrix(embeddingDim, embeddingDim, scale),
      });
    }

    // Initialize gate weights
    this.gateWeights = new Array(embeddingDim * 2)
      .fill(0)
      .map(() => (Math.random() - 0.5) * scale);
    this.gateBias = this.config.gateInitialBias;

    // Initialize prediction head
    const predScale = Math.sqrt(2.0 / feedForwardDim);
    this.predictionWeights = {
      hidden: this.randomMatrix(embeddingDim, feedForwardDim, predScale),
      hiddenBias: new Array(feedForwardDim).fill(0),
      output: new Array(feedForwardDim)
        .fill(0)
        .map(() => (Math.random() - 0.5) * predScale),
      outputBias: 0,
    };
  }

  /**
   * Create random matrix for weight initialization
   */
  private randomMatrix(rows: number, cols: number, scale: number): number[][] {
    return new Array(rows)
      .fill(null)
      .map(() =>
        new Array(cols).fill(0).map(() => (Math.random() - 0.5) * 2 * scale)
      );
  }

  /**
   * Fuse pathways and generate prediction
   */
  fuse(
    transformerState: TransformerState,
    bayesianState: BayesianState,
    targetSkillId: string
  ): HybridPrediction {
    const startTime = Date.now();

    // Get fusion output
    const fusionOutput = fusePathways(
      transformerState,
      bayesianState,
      targetSkillId,
      this.config
    );

    // Apply prediction head
    let masteryProbability: number;
    if (this.predictionWeights) {
      masteryProbability = predictionHead(
        fusionOutput.fused,
        this.predictionWeights.hidden,
        this.predictionWeights.hiddenBias,
        this.predictionWeights.output,
        this.predictionWeights.outputBias
      );
    } else {
      // Fallback to simple average of BKT mastery
      masteryProbability = bayesianState.masteryProbabilities[targetSkillId] ?? 0.5;
    }

    // Calculate correct probability (slightly different from mastery)
    const bktMastery = bayesianState.masteryProbabilities[targetSkillId] ?? 0.1;
    const correctProbability =
      masteryProbability * 0.9 + // If mastered, high P(correct)
      (1 - masteryProbability) * 0.25; // If not, guess rate

    // Calculate confidence
    const interactionCount = transformerState.sequencePosition;
    const baseConfidence = Math.min(0.5 + interactionCount * 0.02, 0.95);
    const confidence = baseConfidence * (1 - Math.abs(masteryProbability - 0.5));

    // Determine dominant pathway
    const pathway: 'bkt' | 'transformer' | 'hybrid' =
      fusionOutput.contributions.bkt > 0.7
        ? 'bkt'
        : fusionOutput.contributions.transformer > 0.7
          ? 'transformer'
          : 'hybrid';

    // Build metadata
    const metadata: PredictionMetadata = {
      modelVersion: '15.1.0',
      interactionCount,
      computeTimeMs: Date.now() - startTime,
      isColdStart: interactionCount < this.config.coldStartThreshold,
      blendWeight: fusionOutput.gateValue,
      timestamp: new Date(),
    };

    return {
      masteryProbability,
      correctProbability,
      confidence,
      pathway,
      contributions: fusionOutput.contributions,
      metadata,
    };
  }

  /**
   * Load pretrained weights
   */
  loadWeights(
    crossAttentionWeights: CrossAttentionLayerWeights[],
    gateWeights: number[],
    gateBias: number,
    predictionWeights: typeof this.predictionWeights
  ): void {
    this.layerWeights = crossAttentionWeights;
    this.gateWeights = gateWeights;
    this.gateBias = gateBias;
    this.predictionWeights = predictionWeights;
  }

  /**
   * Get current pathway weights
   */
  getPathwayWeights(): PathwayWeights {
    return {
      transformer: this.config.gateInitialBias,
      bayesian: 1 - this.config.gateInitialBias,
    };
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create cross-attention fusion module
 */
export function createCrossAttentionFusion(
  config: HybridModelConfig = DEFAULT_HYBRID_MODEL_CONFIG
): CrossAttentionFusion {
  return new CrossAttentionFusion(config);
}

// ============================================================================
// COLD-START BLENDING
// ============================================================================

/**
 * Calculate cold-start blend weight
 *
 * Gradually transitions from BKT to hybrid as data accumulates.
 */
export function calculateColdStartBlend(
  interactionCount: number,
  config: HybridModelConfig = DEFAULT_HYBRID_MODEL_CONFIG
): { bktWeight: number; hybridWeight: number; inTransition: boolean } {
  const { coldStartThreshold, warmupEndThreshold, blendCurve } = config;

  // Below threshold: pure BKT
  if (interactionCount < coldStartThreshold) {
    return {
      bktWeight: 1,
      hybridWeight: 0,
      inTransition: false,
    };
  }

  // Above warmup: pure hybrid
  if (interactionCount >= warmupEndThreshold) {
    return {
      bktWeight: 0,
      hybridWeight: 1,
      inTransition: false,
    };
  }

  // In transition zone
  const progress =
    (interactionCount - coldStartThreshold) /
    (warmupEndThreshold - coldStartThreshold);

  let hybridWeight: number;
  if (blendCurve === 'sigmoid') {
    hybridWeight = 1 / (1 + Math.exp(-10 * (progress - 0.5)));
  } else {
    hybridWeight = progress;
  }

  return {
    bktWeight: 1 - hybridWeight,
    hybridWeight,
    inTransition: true,
  };
}

/**
 * Blend BKT and hybrid predictions during cold-start transition
 */
export function blendPredictions(
  bktPrediction: number,
  hybridPrediction: HybridPrediction,
  blend: { bktWeight: number; hybridWeight: number }
): HybridPrediction {
  const blendedMastery =
    blend.bktWeight * bktPrediction +
    blend.hybridWeight * hybridPrediction.masteryProbability;

  const blendedCorrect =
    blend.bktWeight * (bktPrediction * 0.9 + (1 - bktPrediction) * 0.25) +
    blend.hybridWeight * hybridPrediction.correctProbability;

  return {
    ...hybridPrediction,
    masteryProbability: blendedMastery,
    correctProbability: blendedCorrect,
    pathway: blend.bktWeight > 0.5 ? 'bkt' : 'hybrid',
    contributions: {
      ...hybridPrediction.contributions,
      bkt: blend.bktWeight + hybridPrediction.contributions.bkt * blend.hybridWeight,
      transformer: hybridPrediction.contributions.transformer * blend.hybridWeight,
    },
    metadata: {
      ...hybridPrediction.metadata,
      blendWeight: blend.hybridWeight,
    },
  };
}
