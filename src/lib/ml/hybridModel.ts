/**
 * Hybrid Learner Model - Main Interface
 *
 * Phase 15.1: Unified API for Dual-Pathway Mastery Prediction
 *
 * This is the primary interface for using the hybrid model.
 * It orchestrates:
 * - Transformer pathway (sequential patterns)
 * - BKT pathway (prerequisite relationships)
 * - Cross-attention fusion
 * - Cold-start blending
 *
 * Usage:
 * ```typescript
 * const model = new HybridLearnerModel();
 * await model.initialize(skills, questions);
 *
 * const prediction = await model.predict(userId, skillId);
 * console.log(prediction.masteryProbability);
 * ```
 */

import type { InteractionLog } from '@/types';
import type { SkillState, BKTParameters, Skill } from '../mastery/bkt';
import { updateMastery, createInitialState, DEFAULT_BKT_PARAMS } from '../mastery/bkt';

import type {
  HybridModelConfig,
  HybridPrediction,
  TransformerState,
  BayesianState,
  DualPathwayState,
  TrainingData,
  TrainingResult,
  EvaluationMetrics,
  PathwayWeights,
  ModelWeights,
  RaschEmbedding,
} from './hybridModelTypes';
import {
  DEFAULT_HYBRID_MODEL_CONFIG,
  bktPriorsToBKTParameters,
} from './hybridModelTypes';

import { prepareInferenceData, calculateSkillDifficulties, createPositionalEncoding } from './dataPreparation';
import {
  createTransformerPathway,
  ITransformerPathway,
} from './transformerPathway';
import {
  createCrossAttentionFusion,
  CrossAttentionFusion,
  calculateColdStartBlend,
  blendPredictions,
} from './crossAttention';

// ============================================================================
// MODEL STATE MANAGEMENT
// ============================================================================

/**
 * Cached user state for efficient predictions
 */
export interface UserModelState {
  userId: string;
  dualPathway: DualPathwayState;
  interactions: InteractionLog[];
  lastUpdated: Date;
}

/**
 * Model state store (in-memory for now)
 * Production would use Redis or similar
 */
const userStateCache = new Map<string, UserModelState>();

// ============================================================================
// HYBRID LEARNER MODEL CLASS
// ============================================================================

/**
 * Hybrid Learner Model
 *
 * Main class for mastery prediction using dual-pathway architecture.
 */
export class HybridLearnerModel {
  private config: HybridModelConfig;
  private transformerPathway: ITransformerPathway;
  private crossAttention: CrossAttentionFusion;
  private skillMap: Map<string, Skill> = new Map();
  private skillDifficulties: Map<string, number> = new Map();
  private modelVersion: string = '15.1.0';
  private initialized: boolean = false;

  constructor(config: HybridModelConfig = DEFAULT_HYBRID_MODEL_CONFIG) {
    this.config = config;
    this.transformerPathway = createTransformerPathway(config);
    this.crossAttention = createCrossAttentionFusion(config);
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize the model with skill and question data
   */
  async initialize(
    skills: Skill[],
    questions: string[],
    pretrainedWeights?: ModelWeights
  ): Promise<void> {
    // Build skill map
    this.skillMap = new Map(skills.map((s) => [s.id, s]));

    // Initialize transformer embeddings
    const skillIds = skills.map((s) => s.id);
    if ('initializeEmbeddings' in this.transformerPathway) {
      (this.transformerPathway as any).initializeEmbeddings(skillIds, questions);
    }

    // Load pretrained weights if provided
    if (pretrainedWeights) {
      await this.loadWeights(pretrainedWeights);
    }

    this.initialized = true;
  }

  /**
   * Load pretrained model weights
   */
  async loadWeights(weights: ModelWeights): Promise<void> {
    this.modelVersion = weights.version;

    // Load transformer weights
    this.transformerPathway.loadWeights(weights.transformerLayers);

    // Load cross-attention weights
    this.crossAttention.loadWeights(
      weights.crossAttentionLayers,
      weights.fusionGate || [],
      0.5,
      {
        hidden: weights.predictionHead.hiddenWeights,
        hiddenBias: weights.predictionHead.hiddenBias,
        output: weights.predictionHead.outputWeights,
        outputBias: weights.predictionHead.outputBias,
      }
    );
  }

  // ==========================================================================
  // PREDICTION
  // ==========================================================================

  /**
   * Predict mastery for a user-skill pair
   *
   * This is the main prediction method. It:
   * 1. Loads/creates user state
   * 2. Runs both pathways
   * 3. Fuses predictions with cold-start blending
   * 4. Returns comprehensive prediction
   */
  async predict(
    userId: string,
    skillId: string,
    interactions?: InteractionLog[]
  ): Promise<HybridPrediction> {
    // Get or create user state
    let userState = userStateCache.get(userId);

    if (!userState || interactions) {
      userState = await this.createUserState(userId, interactions || []);
      userStateCache.set(userId, userState);
    }

    // Check cold-start status
    const interactionCount = userState.interactions.length;
    const blend = calculateColdStartBlend(interactionCount, this.config);

    // Always run BKT pathway
    const bktPrediction = this.runBKTPathway(userState.dualPathway.bayesian, skillId);

    // If pure cold-start, return BKT prediction
    if (blend.bktWeight === 1) {
      return this.createColdStartPrediction(bktPrediction, skillId, interactionCount);
    }

    // Run transformer pathway
    const transformerState = await this.runTransformerPathway(userState);

    // Fuse pathways
    const hybridPrediction = this.crossAttention.fuse(
      transformerState,
      userState.dualPathway.bayesian,
      skillId
    );

    // Blend if in transition zone
    if (blend.inTransition) {
      return blendPredictions(bktPrediction, hybridPrediction, blend);
    }

    return hybridPrediction;
  }

  /**
   * Create cold-start prediction (BKT only)
   */
  private createColdStartPrediction(
    bktMastery: number,
    skillId: string,
    interactionCount: number
  ): HybridPrediction {
    const skill = this.skillMap.get(skillId);
    const bktParams = skill?.bktParams || DEFAULT_BKT_PARAMS;

    // Calculate P(correct) using BKT formula
    const correctProbability =
      bktMastery * (1 - bktParams.pS) + (1 - bktMastery) * bktParams.pG;

    return {
      masteryProbability: bktMastery,
      correctProbability,
      confidence: Math.min(0.5 + interactionCount * 0.05, 0.8),
      pathway: 'bkt',
      contributions: {
        bkt: 1,
        transformer: 0,
        difficultyAdjustment: 0,
        temporalDecay: 0,
      },
      metadata: {
        modelVersion: this.modelVersion,
        interactionCount,
        computeTimeMs: 0,
        isColdStart: true,
        blendWeight: 0,
        timestamp: new Date(),
      },
    };
  }

  /**
   * Run BKT pathway to get mastery probability
   */
  private runBKTPathway(
    bayesianState: BayesianState,
    skillId: string
  ): number {
    // Get direct mastery
    const directMastery = bayesianState.masteryProbabilities[skillId] ?? 0.1;

    // Get propagated mastery (considering prerequisites)
    const propagatedMastery = bayesianState.propagatedMastery[skillId] ?? directMastery;

    // Use minimum of direct and propagated (can't truly master without prereqs)
    return Math.min(directMastery, propagatedMastery);
  }

  /**
   * Run transformer pathway
   */
  private async runTransformerPathway(
    userState: UserModelState
  ): Promise<TransformerState> {
    // Prepare embeddings from interactions
    const embeddings = this.createEmbeddings(userState.interactions);

    // Run forward pass
    return this.transformerPathway.forward(embeddings);
  }

  /**
   * Create Rasch embeddings from interactions
   */
  private createEmbeddings(interactions: InteractionLog[]): RaschEmbedding[] {
    const { embeddingDim, maxSequenceLength } = this.config;

    // Truncate to max sequence length
    const recentInteractions = interactions.slice(-maxSequenceLength);

    return recentInteractions.map((interaction, idx) => {
      // Get skill difficulty
      const conceptDifficulty =
        this.skillDifficulties.get(interaction.skillId) ?? 0.5;
      const questionDifficulty = interaction.questionDifficulty ?? 0.5;

      // Create embedding
      return {
        skillEmbedding: new Array(embeddingDim).fill(0).map(() => Math.random() * 0.1),
        responseEmbedding: interaction.isCorrect ? 1 : 0,
        difficultyScalar: questionDifficulty - conceptDifficulty,
        variationVector: new Array(embeddingDim / 4).fill(0),
        timeGapEmbedding:
          interaction.timeGapFromLastAttempt
            ? Math.log1p(interaction.timeGapFromLastAttempt / 3600) / 10
            : 0,
        positionalEncoding: createPositionalEncoding(idx, embeddingDim, maxSequenceLength),
      };
    });
  }

  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================

  /**
   * Create user state from interactions
   */
  private async createUserState(
    userId: string,
    interactions: InteractionLog[]
  ): Promise<UserModelState> {
    // Sort by timestamp
    const sortedInteractions = [...interactions].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Initialize BKT states
    const masteryProbabilities: Record<string, number> = {};
    const skillParams: Record<string, BKTParameters> = {};
    const skillStates: Record<string, SkillState> = {};

    // Process each interaction to update BKT states
    for (const interaction of sortedInteractions) {
      const skillId = interaction.skillId;

      // Get or create skill state
      if (!skillStates[skillId]) {
        const skill = this.skillMap.get(skillId);
        const params = skill?.bktParams || DEFAULT_BKT_PARAMS;
        skillStates[skillId] = createInitialState(skillId, params);
        skillParams[skillId] = params;
      }

      // Update with interaction
      if (interaction.isCorrect !== undefined) {
        skillStates[skillId] = updateMastery(
          skillStates[skillId],
          interaction.isCorrect,
          skillParams[skillId]
        );
      }

      masteryProbabilities[skillId] = skillStates[skillId].pMastery;
    }

    // Calculate propagated mastery (considering prerequisites)
    const propagatedMastery = this.calculatePropagatedMastery(masteryProbabilities);

    // Create bayesian state
    const bayesianState: BayesianState = {
      masteryProbabilities,
      skillParams,
      propagatedMastery,
    };

    // Create transformer state placeholder
    const transformerState: TransformerState = {
      sequenceEncoding: new Array(this.config.embeddingDim).fill(0),
      skillStates: {},
      sequencePosition: sortedInteractions.length,
    };

    // Create dual pathway state
    const dualPathway: DualPathwayState = {
      transformer: transformerState,
      bayesian: bayesianState,
      fusionWeights: this.crossAttention.getPathwayWeights(),
      userId,
      lastUpdated: new Date(),
    };

    return {
      userId,
      dualPathway,
      interactions: sortedInteractions,
      lastUpdated: new Date(),
    };
  }

  /**
   * Calculate propagated mastery considering prerequisites
   */
  private calculatePropagatedMastery(
    masteryProbabilities: Record<string, number>
  ): Record<string, number> {
    const propagated: Record<string, number> = { ...masteryProbabilities };

    // Process each skill
    for (const [skillId, skill] of this.skillMap) {
      if (skill.prerequisites.length === 0) {
        continue; // No prerequisites to consider
      }

      // Get minimum prerequisite mastery
      const prereqMasteries = skill.prerequisites.map(
        (prereqId) => masteryProbabilities[prereqId] ?? 0
      );
      const minPrereqMastery =
        prereqMasteries.length > 0 ? Math.min(...prereqMasteries) : 1;

      // Propagated mastery is limited by prerequisites
      propagated[skillId] = Math.min(
        masteryProbabilities[skillId] ?? 0,
        minPrereqMastery
      );
    }

    return propagated;
  }

  /**
   * Update user state with new interaction
   */
  async updateWithInteraction(
    userId: string,
    interaction: InteractionLog
  ): Promise<HybridPrediction> {
    // Get existing state
    let userState = userStateCache.get(userId);

    if (!userState) {
      // Create new state with single interaction
      userState = await this.createUserState(userId, [interaction]);
    } else {
      // Add new interaction
      userState.interactions.push(interaction);

      // Update BKT state
      const skillId = interaction.skillId;
      const skill = this.skillMap.get(skillId);
      const params = skill?.bktParams || DEFAULT_BKT_PARAMS;

      let skillState: SkillState = {
        skillId,
        pMastery: userState.dualPathway.bayesian.masteryProbabilities[skillId] ?? 0.1,
        attempts: 0,
        correctCount: 0,
        lastAttempt: new Date(),
        history: [],
      };

      if (interaction.isCorrect !== undefined) {
        skillState = updateMastery(skillState, interaction.isCorrect, params);
        userState.dualPathway.bayesian.masteryProbabilities[skillId] = skillState.pMastery;
      }

      userState.lastUpdated = new Date();
    }

    // Update cache
    userStateCache.set(userId, userState);

    // Return updated prediction
    return this.predict(userId, interaction.skillId);
  }

  // ==========================================================================
  // TRAINING (Interface only - actual training is server-side)
  // ==========================================================================

  /**
   * Train the model on prepared data
   *
   * Note: This is an interface definition. Actual training
   * happens server-side or in a separate ML pipeline.
   */
  async train(_data: TrainingData): Promise<TrainingResult> {
    // Training would be implemented server-side with TensorFlow/PyTorch
    return {
      success: false,
      modelVersion: this.modelVersion,
      epochMetrics: [],
      finalMetrics: {
        auc: 0,
        rmse: 0,
        brier: 0,
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1: 0,
        liftOverBKT: 0,
        sampleSize: 0,
      },
      config: this.config,
      trainingTimeSeconds: 0,
    };
  }

  /**
   * Evaluate model on test data
   */
  async evaluate(_testData: TrainingData['test']): Promise<EvaluationMetrics> {
    // Evaluation would be implemented server-side
    return {
      auc: 0,
      rmse: 0,
      brier: 0,
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1: 0,
      liftOverBKT: 0,
      sampleSize: 0,
    };
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Get current pathway weights
   */
  getPathwayWeights(): PathwayWeights {
    return this.crossAttention.getPathwayWeights();
  }

  /**
   * Get model configuration
   */
  getConfig(): HybridModelConfig {
    return { ...this.config };
  }

  /**
   * Get model version
   */
  getVersion(): string {
    return this.modelVersion;
  }

  /**
   * Check if model is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Clear user state cache
   */
  clearCache(userId?: string): void {
    if (userId) {
      userStateCache.delete(userId);
    } else {
      userStateCache.clear();
    }
  }

  /**
   * Update skill difficulties from data
   */
  updateSkillDifficulties(interactions: InteractionLog[]): void {
    const trainingInteractions = interactions.map((i) => ({
      userId: i.userId,
      skillId: i.skillId,
      questionId: i.questionId ?? '',
      isCorrect: i.isCorrect ?? false,
      timestamp: i.timestamp.getTime(),
      responseTimeMs: i.responseTimeMs,
      questionDifficulty: i.questionDifficulty ?? 0.5,
      attemptNumber: i.attemptNumber,
    }));

    this.skillDifficulties = calculateSkillDifficulties(trainingInteractions);
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create hybrid learner model instance
 */
export function createHybridLearnerModel(
  config: HybridModelConfig = DEFAULT_HYBRID_MODEL_CONFIG
): HybridLearnerModel {
  return new HybridLearnerModel(config);
}

// ============================================================================
// SINGLETON INSTANCE (for app-wide usage)
// ============================================================================

let modelInstance: HybridLearnerModel | null = null;

/**
 * Get or create the singleton model instance
 */
export function getHybridModel(
  config?: HybridModelConfig
): HybridLearnerModel {
  if (!modelInstance) {
    modelInstance = createHybridLearnerModel(config);
  }
  return modelInstance;
}

/**
 * Reset the singleton model instance
 */
export function resetHybridModel(): void {
  if (modelInstance) {
    modelInstance.clearCache();
  }
  modelInstance = null;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick prediction using singleton model
 */
export async function predictMastery(
  userId: string,
  skillId: string,
  interactions?: InteractionLog[]
): Promise<HybridPrediction> {
  const model = getHybridModel();
  return model.predict(userId, skillId, interactions);
}

/**
 * Update model with new interaction and get prediction
 */
export async function updateAndPredict(
  userId: string,
  interaction: InteractionLog
): Promise<HybridPrediction> {
  const model = getHybridModel();
  return model.updateWithInteraction(userId, interaction);
}
