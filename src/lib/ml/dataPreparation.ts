/**
 * Data Preparation Pipeline for Hybrid Learner Model
 *
 * Phase 15.1: Prepares interaction data for model training
 *
 * Responsibilities:
 * - Load interaction logs from Firestore
 * - Create sequence tensors for transformer input
 * - Extract BKT features (question difficulty, skill, time gaps)
 * - Train/validation/test split
 * - Batch generator for training
 */

import type { InteractionLog } from '@/types';
import type {
  TrainingData,
  TrainingSequence,
  TrainingInteraction,
  DatasetMetadata,
  HybridModelConfig,
  RaschEmbedding,
} from './hybridModelTypes';
import { DEFAULT_HYBRID_MODEL_CONFIG } from './hybridModelTypes';

// ============================================================================
// FIRESTORE DATA LOADING
// ============================================================================

/**
 * Query parameters for loading interaction logs
 */
export interface InteractionQueryParams {
  /** Filter by user IDs (optional) */
  userIds?: string[];

  /** Filter by skill IDs (optional) */
  skillIds?: string[];

  /** Date range filter */
  dateRange?: {
    start: Date;
    end: Date;
  };

  /** Minimum interactions per user (for quality) */
  minInteractionsPerUser: number;

  /** Maximum interactions to load (for memory) */
  maxInteractions?: number;
}

/**
 * Default query parameters
 */
export const DEFAULT_QUERY_PARAMS: InteractionQueryParams = {
  minInteractionsPerUser: 10,
  maxInteractions: 1000000,
};

/**
 * Load interaction logs from Firestore
 *
 * Note: This is a type definition - actual implementation would use
 * adminDb.collection('interactionLogs').where(...) queries
 */
export interface InteractionLoader {
  loadInteractions(params: InteractionQueryParams): Promise<InteractionLog[]>;
  loadUserInteractions(userId: string): Promise<InteractionLog[]>;
  loadSkillInteractions(skillId: string): Promise<InteractionLog[]>;
}

/**
 * Create an interaction loader (factory function)
 * This would be implemented with actual Firestore calls in production
 */
export function createInteractionLoader(): InteractionLoader {
  return {
    async loadInteractions(
      /* _params: InteractionQueryParams */
    ): Promise<InteractionLog[]> {
      // Implementation would query Firestore:
      // const snapshot = await adminDb.collection('interactionLogs')
      //   .where('timestamp', '>=', params.dateRange?.start)
      //   .where('timestamp', '<=', params.dateRange?.end)
      //   .orderBy('timestamp')
      //   .limit(params.maxInteractions)
      //   .get();
      // return snapshot.docs.map(doc => doc.data() as InteractionLog);

      // Placeholder - would be replaced with actual Firestore query
      return [];
    },

    async loadUserInteractions(/* _userId: string */): Promise<InteractionLog[]> {
      return [];
    },

    async loadSkillInteractions(/* _skillId: string */): Promise<InteractionLog[]> {
      return [];
    },
  };
}

// ============================================================================
// DATA TRANSFORMATION
// ============================================================================

/**
 * Convert raw interaction log to training interaction format
 */
export function interactionLogToTrainingInteraction(
  log: InteractionLog
): TrainingInteraction {
  return {
    userId: log.userId,
    skillId: log.skillId,
    questionId: log.questionId ?? `q_${log.atomId}`,
    isCorrect: log.isCorrect ?? false,
    timestamp: log.timestamp.getTime(),
    responseTimeMs: log.responseTimeMs,
    questionDifficulty: log.questionDifficulty ?? 0.5,
    attemptNumber: log.attemptNumber,
  };
}

/**
 * Group interactions by user ID
 */
export function groupByUser(
  interactions: TrainingInteraction[]
): Map<string, TrainingInteraction[]> {
  const grouped = new Map<string, TrainingInteraction[]>();

  for (const interaction of interactions) {
    const existing = grouped.get(interaction.userId) || [];
    existing.push(interaction);
    grouped.set(interaction.userId, existing);
  }

  // Sort each user's interactions by timestamp
  for (const [userId, userInteractions] of grouped) {
    userInteractions.sort((a, b) => a.timestamp - b.timestamp);
    grouped.set(userId, userInteractions);
  }

  return grouped;
}

/**
 * Create training sequence from user interactions
 *
 * For DKT2/transformer training, we predict P(correct) for each response
 * based on the sequence of prior responses.
 */
export function createTrainingSequence(
  userId: string,
  interactions: TrainingInteraction[],
  maxSequenceLength: number
): TrainingSequence {
  // Truncate to max sequence length (keep most recent)
  const truncated =
    interactions.length > maxSequenceLength
      ? interactions.slice(-maxSequenceLength)
      : interactions;

  // Labels are the correctness of each response (shifted by 1 for prediction)
  // We predict whether the NEXT response will be correct given the sequence so far
  const labels = truncated.slice(1).map((i) => i.isCorrect);

  return {
    userId,
    interactions: truncated,
    labels,
    length: truncated.length,
  };
}

// ============================================================================
// TRAIN/VALIDATION/TEST SPLIT
// ============================================================================

/**
 * Split configuration
 */
export interface SplitConfig {
  /** Fraction for training (default: 0.8) */
  trainRatio: number;
  /** Fraction for validation (default: 0.1) */
  validationRatio: number;
  /** Fraction for test (default: 0.1) */
  testRatio: number;
  /** Random seed for reproducibility */
  randomSeed?: number;
  /** Split by user (recommended) or by interaction */
  splitBy: 'user' | 'interaction';
}

export const DEFAULT_SPLIT_CONFIG: SplitConfig = {
  trainRatio: 0.8,
  validationRatio: 0.1,
  testRatio: 0.1,
  randomSeed: 42,
  splitBy: 'user',
};

/**
 * Seeded random number generator for reproducibility
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/**
 * Shuffle array with seeded random
 */
function shuffleArray<T>(array: T[], random: () => number): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Split sequences into train/validation/test sets
 */
export function splitData(
  sequences: TrainingSequence[],
  config: SplitConfig = DEFAULT_SPLIT_CONFIG
): { train: TrainingSequence[]; validation: TrainingSequence[]; test: TrainingSequence[] } {
  const random = seededRandom(config.randomSeed ?? 42);
  const shuffled = shuffleArray(sequences, random);

  const totalSize = shuffled.length;
  const trainSize = Math.floor(totalSize * config.trainRatio);
  const validationSize = Math.floor(totalSize * config.validationRatio);

  return {
    train: shuffled.slice(0, trainSize),
    validation: shuffled.slice(trainSize, trainSize + validationSize),
    test: shuffled.slice(trainSize + validationSize),
  };
}

// ============================================================================
// FEATURE EXTRACTION
// ============================================================================

/**
 * Extract features for BKT pathway
 */
export interface BKTFeatures {
  /** Skill identifier */
  skillId: string;
  /** Prior mastery probability */
  priorMastery: number;
  /** Number of prior attempts on this skill */
  priorAttempts: number;
  /** Recent correct rate (last 5) */
  recentCorrectRate: number;
  /** Time since last attempt (seconds) */
  timeSinceLastAttempt: number;
  /** Question difficulty */
  questionDifficulty: number;
  /** Concept (skill) average difficulty */
  conceptDifficulty: number;
}

/**
 * Extract BKT features from interaction sequence
 */
export function extractBKTFeatures(
  sequence: TrainingInteraction[],
  index: number,
  skillDifficulties: Map<string, number>
): BKTFeatures {
  const current = sequence[index];
  const skillId = current.skillId;

  // Get prior attempts for this skill
  const priorSkillAttempts = sequence
    .slice(0, index)
    .filter((i) => i.skillId === skillId);

  // Calculate prior mastery using simple BKT approximation
  const correctCount = priorSkillAttempts.filter((i) => i.isCorrect).length;
  const totalAttempts = priorSkillAttempts.length;
  const priorMastery =
    totalAttempts > 0 ? (correctCount + 1) / (totalAttempts + 2) : 0.1;

  // Recent correct rate (last 5 on this skill)
  const recent5 = priorSkillAttempts.slice(-5);
  const recentCorrectRate =
    recent5.length > 0
      ? recent5.filter((i) => i.isCorrect).length / recent5.length
      : 0.5;

  // Time since last attempt
  const lastAttempt = priorSkillAttempts[priorSkillAttempts.length - 1];
  const timeSinceLastAttempt = lastAttempt
    ? (current.timestamp - lastAttempt.timestamp) / 1000
    : 0;

  // Concept difficulty from pre-computed map
  const conceptDifficulty = skillDifficulties.get(skillId) ?? 0.5;

  return {
    skillId,
    priorMastery,
    priorAttempts: totalAttempts,
    recentCorrectRate,
    timeSinceLastAttempt,
    questionDifficulty: current.questionDifficulty,
    conceptDifficulty,
  };
}

/**
 * Calculate skill difficulties from interaction data
 */
export function calculateSkillDifficulties(
  interactions: TrainingInteraction[]
): Map<string, number> {
  const skillStats = new Map<string, { correct: number; total: number }>();

  for (const interaction of interactions) {
    const stats = skillStats.get(interaction.skillId) || {
      correct: 0,
      total: 0,
    };
    if (interaction.isCorrect) stats.correct++;
    stats.total++;
    skillStats.set(interaction.skillId, stats);
  }

  const difficulties = new Map<string, number>();
  for (const [skillId, stats] of skillStats) {
    // Laplace smoothing
    const correctRate = (stats.correct + 1) / (stats.total + 2);
    difficulties.set(skillId, 1 - correctRate); // Higher difficulty = lower correct rate
  }

  return difficulties;
}

// ============================================================================
// EMBEDDING CREATION
// ============================================================================

/**
 * Create Rasch embedding for a single interaction
 */
export function createRaschEmbedding(
  interaction: TrainingInteraction,
  bktFeatures: BKTFeatures,
  config: HybridModelConfig = DEFAULT_HYBRID_MODEL_CONFIG,
  skillEmbeddings: Map<string, number[]>,
  positionIndex: number
): RaschEmbedding {
  const { embeddingDim, maxSequenceLength } = config;

  // Skill embedding (learned, placeholder here)
  const skillEmbedding = skillEmbeddings.get(interaction.skillId) ||
    new Array(embeddingDim).fill(0).map(() => Math.random() * 0.1);

  // Response embedding (0 for incorrect, 1 for correct)
  const responseEmbedding = interaction.isCorrect ? 1 : 0;

  // Difficulty deviation (Rasch model key feature)
  const difficultyScalar =
    interaction.questionDifficulty - bktFeatures.conceptDifficulty;

  // Variation vector (simplified - would be learned in full implementation)
  const variationVector = new Array(embeddingDim / 4)
    .fill(0)
    .map(() => difficultyScalar * 0.1);

  // Time gap embedding (log-scaled)
  const timeGapEmbedding =
    bktFeatures.timeSinceLastAttempt > 0
      ? Math.log1p(bktFeatures.timeSinceLastAttempt / 3600) / 10 // Normalized hours
      : 0;

  // Sinusoidal positional encoding
  const positionalEncoding = createPositionalEncoding(
    positionIndex,
    embeddingDim,
    maxSequenceLength
  );

  return {
    skillEmbedding,
    responseEmbedding,
    difficultyScalar,
    variationVector,
    timeGapEmbedding,
    positionalEncoding,
  };
}

/**
 * Create sinusoidal positional encoding
 */
export function createPositionalEncoding(
  position: number,
  dimension: number,
  maxLength: number
): number[] {
  const encoding = new Array(dimension);

  for (let i = 0; i < dimension; i++) {
    const angle = position / Math.pow(maxLength, (2 * Math.floor(i / 2)) / dimension);
    encoding[i] = i % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
  }

  return encoding;
}

// ============================================================================
// BATCH GENERATION
// ============================================================================

/**
 * Batch of training data
 */
export interface TrainingBatch {
  /** Batch of sequences (padded to same length) */
  sequences: TrainingInteraction[][];

  /** Labels for each sequence */
  labels: boolean[][];

  /** Attention masks (1 for real tokens, 0 for padding) */
  attentionMasks: number[][];

  /** BKT features for each position */
  bktFeatures: BKTFeatures[][];

  /** Actual lengths before padding */
  lengths: number[];

  /** Batch size */
  batchSize: number;
}

/**
 * Pad sequences to uniform length
 */
function padSequence<T>(
  sequence: T[],
  targetLength: number,
  paddingValue: T
): T[] {
  if (sequence.length >= targetLength) {
    return sequence.slice(0, targetLength);
  }
  return [...sequence, ...new Array(targetLength - sequence.length).fill(paddingValue)];
}

/**
 * Create a training batch from sequences
 */
export function createBatch(
  sequences: TrainingSequence[],
  skillDifficulties: Map<string, number>,
  config: HybridModelConfig = DEFAULT_HYBRID_MODEL_CONFIG
): TrainingBatch {
  const maxLen = Math.max(...sequences.map((s) => s.length));
  const paddedMaxLen = Math.min(maxLen, config.maxSequenceLength);

  // Create padding interaction
  const paddingInteraction: TrainingInteraction = {
    userId: '',
    skillId: '',
    questionId: '',
    isCorrect: false,
    timestamp: 0,
    responseTimeMs: 0,
    questionDifficulty: 0.5,
    attemptNumber: 0,
  };

  // Create padding BKT features
  const paddingBKTFeatures: BKTFeatures = {
    skillId: '',
    priorMastery: 0,
    priorAttempts: 0,
    recentCorrectRate: 0.5,
    timeSinceLastAttempt: 0,
    questionDifficulty: 0.5,
    conceptDifficulty: 0.5,
  };

  const paddedSequences: TrainingInteraction[][] = [];
  const paddedLabels: boolean[][] = [];
  const attentionMasks: number[][] = [];
  const bktFeaturesList: BKTFeatures[][] = [];
  const lengths: number[] = [];

  for (const seq of sequences) {
    const actualLen = Math.min(seq.length, paddedMaxLen);
    lengths.push(actualLen);

    // Pad interactions
    paddedSequences.push(
      padSequence(seq.interactions.slice(0, paddedMaxLen), paddedMaxLen, paddingInteraction)
    );

    // Pad labels
    paddedLabels.push(
      padSequence(seq.labels.slice(0, paddedMaxLen - 1), paddedMaxLen - 1, false)
    );

    // Create attention mask
    const mask = new Array(paddedMaxLen).fill(0);
    for (let i = 0; i < actualLen; i++) mask[i] = 1;
    attentionMasks.push(mask);

    // Extract BKT features for each position
    const seqBKTFeatures: BKTFeatures[] = [];
    for (let i = 0; i < paddedMaxLen; i++) {
      if (i < actualLen) {
        seqBKTFeatures.push(
          extractBKTFeatures(seq.interactions, i, skillDifficulties)
        );
      } else {
        seqBKTFeatures.push(paddingBKTFeatures);
      }
    }
    bktFeaturesList.push(seqBKTFeatures);
  }

  return {
    sequences: paddedSequences,
    labels: paddedLabels,
    attentionMasks,
    bktFeatures: bktFeaturesList,
    lengths,
    batchSize: sequences.length,
  };
}

/**
 * Batch generator (yields batches for training loop)
 */
export function* batchGenerator(
  sequences: TrainingSequence[],
  skillDifficulties: Map<string, number>,
  config: HybridModelConfig = DEFAULT_HYBRID_MODEL_CONFIG,
  shuffle: boolean = true,
  randomSeed?: number
): Generator<TrainingBatch> {
  const { batchSize } = config;

  // Optionally shuffle sequences
  let orderedSequences = sequences;
  if (shuffle) {
    const random = seededRandom(randomSeed ?? Date.now());
    orderedSequences = shuffleArray(sequences, random);
  }

  // Generate batches
  for (let i = 0; i < orderedSequences.length; i += batchSize) {
    const batchSequences = orderedSequences.slice(i, i + batchSize);
    yield createBatch(batchSequences, skillDifficulties, config);
  }
}

// ============================================================================
// MAIN PIPELINE
// ============================================================================

/**
 * Complete data preparation pipeline
 */
export async function prepareTrainingData(
  interactions: InteractionLog[],
  config: HybridModelConfig = DEFAULT_HYBRID_MODEL_CONFIG,
  splitConfig: SplitConfig = DEFAULT_SPLIT_CONFIG
): Promise<TrainingData> {
  // Step 1: Convert to training format
  const trainingInteractions = interactions.map(interactionLogToTrainingInteraction);

  // Step 2: Group by user
  const userGroups = groupByUser(trainingInteractions);

  // Step 3: Create sequences
  const sequences: TrainingSequence[] = [];
  for (const [userId, userInteractions] of userGroups) {
    if (userInteractions.length >= 5) {
      // Minimum sequence length
      sequences.push(
        createTrainingSequence(userId, userInteractions, config.maxSequenceLength)
      );
    }
  }

  // Step 4: Split data
  const { train, validation, test } = splitData(sequences, splitConfig);

  // Step 5: Calculate metadata
  const allInteractions = trainingInteractions;
  const uniqueSkills = new Set(allInteractions.map((i) => i.skillId));
  const uniqueQuestions = new Set(allInteractions.map((i) => i.questionId));
  const timestamps = allInteractions.map((i) => i.timestamp);

  const metadata: DatasetMetadata = {
    name: 'aptly-interactions',
    totalInteractions: allInteractions.length,
    uniqueUsers: userGroups.size,
    uniqueSkills: uniqueSkills.size,
    uniqueQuestions: uniqueQuestions.size,
    dateRange: {
      start: new Date(Math.min(...timestamps)),
      end: new Date(Math.max(...timestamps)),
    },
    splits: {
      train: train.length / sequences.length,
      validation: validation.length / sequences.length,
      test: test.length / sequences.length,
    },
  };

  return {
    train,
    validation,
    test,
    metadata,
  };
}

/**
 * Prepare data for inference (single user)
 */
export function prepareInferenceData(
  interactions: InteractionLog[],
  config: HybridModelConfig = DEFAULT_HYBRID_MODEL_CONFIG
): {
  sequence: TrainingSequence;
  bktFeatures: BKTFeatures[];
  skillDifficulties: Map<string, number>;
} {
  // Convert to training format
  const trainingInteractions = interactions.map(interactionLogToTrainingInteraction);

  // Sort by timestamp
  trainingInteractions.sort((a, b) => a.timestamp - b.timestamp);

  // Create sequence
  const userId = trainingInteractions[0]?.userId || 'unknown';
  const sequence = createTrainingSequence(
    userId,
    trainingInteractions,
    config.maxSequenceLength
  );

  // Calculate skill difficulties from this user's data
  // (In production, would use global precomputed values)
  const skillDifficulties = calculateSkillDifficulties(trainingInteractions);

  // Extract BKT features
  const bktFeatures = trainingInteractions.map((_, index) =>
    extractBKTFeatures(trainingInteractions, index, skillDifficulties)
  );

  return {
    sequence,
    bktFeatures,
    skillDifficulties,
  };
}
