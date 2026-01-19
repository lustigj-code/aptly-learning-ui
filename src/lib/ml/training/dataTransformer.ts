/**
 * Data Transformer for ML Training
 *
 * Converts external dataset formats (EdNet, ASSISTments) to internal
 * FSRS and BKT training formats. Handles feature derivation, skill ID
 * mapping, and cold-start considerations.
 */

import type { EdNetInteraction } from './ednetLoader';
import type { FSRSParameters, ReviewRating } from '../../mastery/fsrs';
import type { BKTParameters } from '../../mastery/bkt';
import type { TrainingInteraction, TrainingSequence } from '../hybridModelTypes';
import { DEFAULT_PARAMETERS as DEFAULT_FSRS_PARAMS } from '../../mastery/fsrs';
import { DEFAULT_BKT_PARAMS } from '../../mastery/bkt';

// ============================================================================
// TYPES
// ============================================================================

/**
 * FSRS training data format
 * Each record represents a review event with computed features
 */
export interface FSRSTrainingData {
  /** User identifier */
  userId: string;
  /** Skill/concept being reviewed */
  skillId: string;
  /** Question identifier */
  questionId: string;
  /** Review rating (1-4: Again, Hard, Good, Easy) */
  rating: ReviewRating;
  /** Days since last review of this skill */
  daysSinceLastReview: number;
  /** Current stability estimate (days) */
  stability: number;
  /** Current difficulty estimate (1-10) */
  difficulty: number;
  /** Review number for this skill (1-indexed) */
  reviewNumber: number;
  /** Lapse count for this skill */
  lapseCount: number;
  /** Unix timestamp */
  timestamp: number;
  /** Response time in seconds */
  responseTimeSeconds: number;
  /** Whether this was recalled successfully (rating >= 2) */
  recalled: boolean;
}

/**
 * BKT training data format
 * Each record represents an attempt with mastery features
 */
export interface BKTTrainingData {
  /** User identifier */
  userId: string;
  /** Skill identifier */
  skillId: string;
  /** Question identifier */
  questionId: string;
  /** Whether the response was correct */
  isCorrect: boolean;
  /** Attempt number for this skill (1-indexed) */
  attemptNumber: number;
  /** Prior P(mastery) before this attempt */
  priorMastery: number;
  /** Posterior P(mastery) after this attempt */
  posteriorMastery: number;
  /** Time since last attempt (seconds) */
  timeSinceLastAttempt: number;
  /** Unix timestamp */
  timestamp: number;
  /** Response time in milliseconds */
  responseTimeMs: number;
  /** Content type hint (if available) */
  contentType?: 'conceptual' | 'procedural' | 'factual';
}

/**
 * Skill mapping entry
 */
export interface SkillMapping {
  /** Original skill ID from external dataset */
  externalId: string;
  /** Internal skill ID */
  internalId: string;
  /** Skill name (if available) */
  name?: string;
  /** Content type */
  contentType?: 'conceptual' | 'procedural' | 'factual';
  /** Prerequisite skill IDs */
  prerequisites?: string[];
}

/**
 * Transformation options
 */
export interface TransformOptions {
  /** Skill ID mapping (external -> internal) */
  skillMapping?: Map<string, SkillMapping>;
  /** Default BKT parameters for cold-start */
  defaultBKTParams?: BKTParameters;
  /** Default FSRS parameters */
  defaultFSRSParams?: FSRSParameters;
  /** Minimum response time to consider valid (ms) */
  minResponseTimeMs?: number;
  /** Maximum response time to consider valid (ms) */
  maxResponseTimeMs?: number;
  /** Whether to infer content type from skill names */
  inferContentType?: boolean;
}

// ============================================================================
// FSRS TRANSFORMATION
// ============================================================================

/**
 * Convert external interactions to FSRS training format
 *
 * This function:
 * 1. Groups interactions by user and skill
 * 2. Computes inter-review intervals
 * 3. Maps correctness to FSRS ratings
 * 4. Tracks stability and difficulty estimates
 *
 * @param interactions - Raw interactions from external dataset
 * @param options - Transformation options
 * @returns Array of FSRS training records
 */
export function transformToFSRSFormat(
  interactions: EdNetInteraction[],
  options: TransformOptions = {}
): FSRSTrainingData[] {
  const {
    skillMapping,
    defaultFSRSParams = DEFAULT_FSRS_PARAMS,
    minResponseTimeMs = 100,
    maxResponseTimeMs = 300000, // 5 minutes
  } = options;

  // Group by user, then by skill, sorted by timestamp
  const byUserSkill = groupByUserSkill(interactions);
  const result: FSRSTrainingData[] = [];

  for (const [key, userSkillInteractions] of byUserSkill.entries()) {
    const [userId, externalSkillId] = key.split('::');

    // Map skill ID
    const skillId = skillMapping?.get(externalSkillId)?.internalId || externalSkillId;

    // Initialize FSRS state
    let stability = defaultFSRSParams.w[0]; // Initial stability
    let difficulty = defaultFSRSParams.w[4]; // Initial difficulty
    let lapseCount = 0;
    let lastTimestamp = 0;

    for (let i = 0; i < userSkillInteractions.length; i++) {
      const interaction = userSkillInteractions[i];

      // Skip if response time is out of bounds
      if (
        interaction.responseTimeMs < minResponseTimeMs ||
        interaction.responseTimeMs > maxResponseTimeMs
      ) {
        continue;
      }

      // Calculate days since last review
      let daysSinceLastReview = 0;
      if (lastTimestamp > 0) {
        daysSinceLastReview = (interaction.timestamp - lastTimestamp) / (24 * 60 * 60 * 1000);
      }

      // Convert correctness and response time to FSRS rating
      const rating = computeFSRSRating(
        interaction.isCorrect,
        interaction.responseTimeMs,
        daysSinceLastReview
      );

      // Track lapse
      if (rating === 1) {
        lapseCount++;
      }

      result.push({
        userId,
        skillId,
        questionId: interaction.questionId,
        rating,
        daysSinceLastReview,
        stability,
        difficulty,
        reviewNumber: i + 1,
        lapseCount,
        timestamp: interaction.timestamp,
        responseTimeSeconds: interaction.responseTimeMs / 1000,
        recalled: rating >= 2,
      });

      // Update stability and difficulty for next iteration
      const updated = updateFSRSState(stability, difficulty, rating, daysSinceLastReview, defaultFSRSParams);
      stability = updated.stability;
      difficulty = updated.difficulty;
      lastTimestamp = interaction.timestamp;
    }
  }

  // Sort by timestamp
  result.sort((a, b) => a.timestamp - b.timestamp);
  return result;
}

/**
 * Compute FSRS rating from correctness and response time
 *
 * Rating mapping:
 * - 1 (Again): Incorrect
 * - 2 (Hard): Correct but slow/hesitant
 * - 3 (Good): Correct with normal response time
 * - 4 (Easy): Correct very quickly
 */
function computeFSRSRating(
  isCorrect: boolean,
  responseTimeMs: number,
  daysSinceLastReview: number
): ReviewRating {
  if (!isCorrect) {
    return 1; // Again
  }

  // Compute expected response time based on interval
  // Longer intervals should have longer acceptable response times
  const baseResponseTime = 5000; // 5 seconds baseline
  const intervalFactor = Math.min(daysSinceLastReview * 0.5, 10);
  const expectedResponseTime = baseResponseTime + intervalFactor * 1000;

  const responseRatio = responseTimeMs / expectedResponseTime;

  if (responseRatio < 0.5) {
    return 4; // Easy - very fast
  } else if (responseRatio < 1.2) {
    return 3; // Good - normal
  } else {
    return 2; // Hard - slow
  }
}

/**
 * Update FSRS state after a review (simplified)
 */
function updateFSRSState(
  stability: number,
  difficulty: number,
  rating: ReviewRating,
  daysSinceLastReview: number,
  params: FSRSParameters
): { stability: number; difficulty: number } {
  const w = params.w;

  if (rating === 1) {
    // Lapse - reduce stability
    const newStability = w[11] * Math.pow(difficulty, -w[12]) * (Math.pow(stability + 1, w[13]) - 1);
    return {
      stability: Math.max(0.1, newStability),
      difficulty: Math.min(10, difficulty + 0.5),
    };
  }

  // Successful review - increase stability
  const retrievability = Math.pow(1 + daysSinceLastReview / (9 * stability), -1);
  const hardPenalty = rating === 2 ? w[15] : 1;
  const easyBonus = rating === 4 ? w[16] : 1;

  const newStability =
    stability *
    (1 +
      Math.exp(w[8]) *
        (11 - difficulty) *
        Math.pow(stability, -w[9]) *
        (Math.exp((1 - retrievability) * w[10]) - 1) *
        hardPenalty *
        easyBonus);

  // Update difficulty with mean reversion
  const D0 = w[4];
  const delta = -(rating - 3);
  const newDifficulty = difficulty + w[7] * (D0 - difficulty) + w[6] * delta;

  return {
    stability: Math.max(0.1, newStability),
    difficulty: Math.max(1, Math.min(10, newDifficulty)),
  };
}

// ============================================================================
// BKT TRANSFORMATION
// ============================================================================

/**
 * Convert external interactions to BKT training format
 *
 * This function:
 * 1. Groups interactions by user and skill
 * 2. Applies BKT updates to track mastery probabilities
 * 3. Computes time gaps between attempts
 *
 * @param interactions - Raw interactions from external dataset
 * @param options - Transformation options
 * @returns Array of BKT training records
 */
export function transformToBKTFormat(
  interactions: EdNetInteraction[],
  options: TransformOptions = {}
): BKTTrainingData[] {
  const {
    skillMapping,
    defaultBKTParams = DEFAULT_BKT_PARAMS,
    minResponseTimeMs = 100,
    maxResponseTimeMs = 300000,
    inferContentType = true,
  } = options;

  // Group by user, then by skill, sorted by timestamp
  const byUserSkill = groupByUserSkill(interactions);
  const result: BKTTrainingData[] = [];

  for (const [key, userSkillInteractions] of byUserSkill.entries()) {
    const [userId, externalSkillId] = key.split('::');

    // Get skill info
    const skillInfo = skillMapping?.get(externalSkillId);
    const skillId = skillInfo?.internalId || externalSkillId;

    // Determine content type
    let contentType = skillInfo?.contentType;
    if (!contentType && inferContentType && skillInfo?.name) {
      contentType = inferContentTypeFromName(skillInfo.name);
    }

    // Get BKT parameters (may vary by content type)
    const params = getParamsForSkill(skillInfo, defaultBKTParams);

    // Initialize mastery probability
    let pMastery = params.pL0;
    let lastTimestamp = 0;

    for (let i = 0; i < userSkillInteractions.length; i++) {
      const interaction = userSkillInteractions[i];

      // Skip if response time is out of bounds
      if (
        interaction.responseTimeMs < minResponseTimeMs ||
        interaction.responseTimeMs > maxResponseTimeMs
      ) {
        continue;
      }

      // Calculate time since last attempt
      let timeSinceLastAttempt = 0;
      if (lastTimestamp > 0) {
        timeSinceLastAttempt = (interaction.timestamp - lastTimestamp) / 1000;
      }

      // Record prior mastery
      const priorMastery = pMastery;

      // Update mastery using BKT
      pMastery = updateBKTMastery(pMastery, interaction.isCorrect, params);

      result.push({
        userId,
        skillId,
        questionId: interaction.questionId,
        isCorrect: interaction.isCorrect,
        attemptNumber: i + 1,
        priorMastery,
        posteriorMastery: pMastery,
        timeSinceLastAttempt,
        timestamp: interaction.timestamp,
        responseTimeMs: interaction.responseTimeMs,
        contentType,
      });

      lastTimestamp = interaction.timestamp;
    }
  }

  // Sort by timestamp
  result.sort((a, b) => a.timestamp - b.timestamp);
  return result;
}

/**
 * Update BKT mastery probability after an attempt
 */
function updateBKTMastery(
  pMastery: number,
  isCorrect: boolean,
  params: BKTParameters
): number {
  const { pT, pG, pS } = params;

  // Bayesian update
  let pLGivenObs: number;

  if (isCorrect) {
    const pCorrect = pMastery * (1 - pS) + (1 - pMastery) * pG;
    pLGivenObs = pCorrect > 0 ? (pMastery * (1 - pS)) / pCorrect : pMastery;
  } else {
    const pIncorrect = pMastery * pS + (1 - pMastery) * (1 - pG);
    pLGivenObs = pIncorrect > 0 ? (pMastery * pS) / pIncorrect : pMastery;
  }

  // Apply learning
  const pLNew = pLGivenObs + (1 - pLGivenObs) * pT;

  return Math.max(0, Math.min(1, pLNew));
}

/**
 * Get BKT parameters for a skill based on its properties
 */
function getParamsForSkill(
  skillInfo: SkillMapping | undefined,
  defaultParams: BKTParameters
): BKTParameters {
  if (!skillInfo?.contentType) {
    return defaultParams;
  }

  // Content-type specific parameters
  switch (skillInfo.contentType) {
    case 'conceptual':
      return {
        pL0: 0.05,
        pT: 0.20,
        pG: 0.15,
        pS: 0.10,
      };
    case 'factual':
      return {
        pL0: 0.15,
        pT: 0.35,
        pG: 0.25,
        pS: 0.05,
      };
    case 'procedural':
    default:
      return defaultParams;
  }
}

/**
 * Infer content type from skill name
 */
function inferContentTypeFromName(
  name: string
): 'conceptual' | 'procedural' | 'factual' | undefined {
  const lower = name.toLowerCase();

  if (
    lower.includes('understand') ||
    lower.includes('concept') ||
    lower.includes('theory') ||
    lower.includes('principle')
  ) {
    return 'conceptual';
  }

  if (
    lower.includes('apply') ||
    lower.includes('calculate') ||
    lower.includes('perform') ||
    lower.includes('procedure')
  ) {
    return 'procedural';
  }

  if (
    lower.includes('define') ||
    lower.includes('identify') ||
    lower.includes('name') ||
    lower.includes('recall')
  ) {
    return 'factual';
  }

  return undefined;
}

// ============================================================================
// HYBRID MODEL TRANSFORMATION
// ============================================================================

/**
 * Convert to TrainingSequence format for hybrid model
 *
 * Creates user sequences with proper ordering and labels
 * for next-response prediction training.
 *
 * @param interactions - Raw interactions
 * @param options - Transformation options
 * @returns Array of training sequences
 */
export function transformToTrainingSequences(
  interactions: EdNetInteraction[],
  options: TransformOptions = {}
): TrainingSequence[] {
  const { skillMapping, defaultBKTParams = DEFAULT_BKT_PARAMS } = options;

  // Group by user
  const byUser = groupByUser(interactions);
  const sequences: TrainingSequence[] = [];

  for (const [userId, userInteractions] of byUser.entries()) {
    // Sort by timestamp
    const sorted = [...userInteractions].sort((a, b) => a.timestamp - b.timestamp);

    // Track mastery per skill
    const skillMastery = new Map<string, number>();
    const skillAttempts = new Map<string, number>();

    const trainingInteractions: TrainingInteraction[] = [];
    const labels: boolean[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const interaction = sorted[i];

      // Map skill ID
      const skillId = skillMapping?.get(interaction.skillId)?.internalId || interaction.skillId;

      // Get current mastery and attempt count
      const currentMastery = skillMastery.get(skillId) ?? defaultBKTParams.pL0;
      const attemptNumber = (skillAttempts.get(skillId) ?? 0) + 1;

      // Calculate question difficulty (use provided or estimate from data)
      const questionDifficulty = interaction.questionDifficulty ?? 0.5;

      // Calculate time gap from previous interaction
      // Note: timeGapFromLastAttempt reserved for future use
      // if (i > 0) {
      //   const timeGapFromLastAttempt = (interaction.timestamp - sorted[i - 1].timestamp) / 1000;
      // }

      trainingInteractions.push({
        userId,
        skillId,
        questionId: interaction.questionId,
        isCorrect: interaction.isCorrect,
        timestamp: interaction.timestamp,
        responseTimeMs: interaction.responseTimeMs,
        questionDifficulty,
        attemptNumber,
      });

      // Label is current correctness (for sequence, we predict each response)
      labels.push(interaction.isCorrect);

      // Update mastery for next iteration
      const params = defaultBKTParams;
      const updatedMastery = updateBKTMastery(currentMastery, interaction.isCorrect, params);
      skillMastery.set(skillId, updatedMastery);
      skillAttempts.set(skillId, attemptNumber);
    }

    if (trainingInteractions.length > 0) {
      sequences.push({
        userId,
        interactions: trainingInteractions,
        labels,
        length: trainingInteractions.length,
      });
    }
  }

  return sequences;
}

// ============================================================================
// TRAIN/TEST SPLIT
// ============================================================================

/**
 * Split data into train and test sets
 *
 * Supports multiple splitting strategies:
 * - 'random': Random split of interactions
 * - 'temporal': Split by timestamp (earlier data for train)
 * - 'user': Split by user (some users only in train, others only in test)
 * - 'last_k': For each user, use last k interactions for test
 *
 * @param data - Array of data items
 * @param ratio - Train ratio (0-1)
 * @param strategy - Splitting strategy
 * @param seed - Random seed for reproducibility
 * @returns Train and test splits
 */
export function splitTrainTest<T extends { userId?: string; timestamp?: number }>(
  data: T[],
  ratio: number,
  strategy: 'random' | 'temporal' | 'user' | 'last_k' = 'temporal',
  seed?: number
): { train: T[]; test: T[] } {
  if (ratio < 0 || ratio > 1) {
    throw new Error('Split ratio must be between 0 and 1');
  }

  switch (strategy) {
    case 'random':
      return splitRandom(data, ratio, seed);
    case 'temporal':
      return splitTemporal(data, ratio);
    case 'user':
      return splitByUser(data, ratio, seed);
    case 'last_k':
      return splitLastK(data, ratio);
    default:
      return splitTemporal(data, ratio);
  }
}

/**
 * Random split
 */
function splitRandom<T>(data: T[], ratio: number, seed?: number): { train: T[]; test: T[] } {
  const shuffled = shuffleWithSeed([...data], seed);
  const splitIndex = Math.floor(shuffled.length * ratio);

  return {
    train: shuffled.slice(0, splitIndex),
    test: shuffled.slice(splitIndex),
  };
}

/**
 * Temporal split (earlier data for training)
 */
function splitTemporal<T extends { timestamp?: number }>(
  data: T[],
  ratio: number
): { train: T[]; test: T[] } {
  const sorted = [...data].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
  const splitIndex = Math.floor(sorted.length * ratio);

  return {
    train: sorted.slice(0, splitIndex),
    test: sorted.slice(splitIndex),
  };
}

/**
 * User-based split (some users only in train)
 */
function splitByUser<T extends { userId?: string }>(
  data: T[],
  ratio: number,
  seed?: number
): { train: T[]; test: T[] } {
  // Get unique users
  const users = Array.from(new Set(data.map((d) => d.userId).filter(Boolean))) as string[];
  const shuffledUsers = shuffleWithSeed(users, seed);
  const splitIndex = Math.floor(shuffledUsers.length * ratio);

  const trainUsers = new Set(shuffledUsers.slice(0, splitIndex));

  return {
    train: data.filter((d) => d.userId && trainUsers.has(d.userId)),
    test: data.filter((d) => d.userId && !trainUsers.has(d.userId)),
  };
}

/**
 * Last-k split (use last k interactions per user for test)
 */
function splitLastK<T extends { userId?: string; timestamp?: number }>(
  data: T[],
  ratio: number
): { train: T[]; test: T[] } {
  // Group by user
  const byUser = new Map<string, T[]>();
  for (const item of data) {
    if (!item.userId) continue;
    const existing = byUser.get(item.userId) || [];
    existing.push(item);
    byUser.set(item.userId, existing);
  }

  const train: T[] = [];
  const test: T[] = [];

  for (const [, userItems] of byUser.entries()) {
    // Sort by timestamp
    const sorted = [...userItems].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
    const splitIndex = Math.floor(sorted.length * ratio);

    train.push(...sorted.slice(0, splitIndex));
    test.push(...sorted.slice(splitIndex));
  }

  return { train, test };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Group interactions by user and skill
 */
function groupByUserSkill(
  interactions: EdNetInteraction[]
): Map<string, EdNetInteraction[]> {
  const grouped = new Map<string, EdNetInteraction[]>();

  for (const interaction of interactions) {
    const key = `${interaction.userId}::${interaction.skillId}`;
    const existing = grouped.get(key) || [];
    existing.push(interaction);
    grouped.set(key, existing);
  }

  // Sort each group by timestamp
  for (const [key, items] of grouped.entries()) {
    items.sort((a, b) => a.timestamp - b.timestamp);
    grouped.set(key, items);
  }

  return grouped;
}

/**
 * Group interactions by user
 */
function groupByUser(interactions: EdNetInteraction[]): Map<string, EdNetInteraction[]> {
  const grouped = new Map<string, EdNetInteraction[]>();

  for (const interaction of interactions) {
    const existing = grouped.get(interaction.userId) || [];
    existing.push(interaction);
    grouped.set(interaction.userId, existing);
  }

  return grouped;
}

/**
 * Shuffle array with optional seed for reproducibility
 */
function shuffleWithSeed<T>(array: T[], seed?: number): T[] {
  const result = [...array];
  let random: () => number;

  if (seed !== undefined) {
    let state = seed;
    random = () => {
      state |= 0;
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  } else {
    random = Math.random;
  }

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

/**
 * Calculate derived features for a dataset
 *
 * Computes aggregate statistics useful for training:
 * - Skill difficulties (from correct rates)
 * - Question difficulties
 * - User abilities
 */
export function calculateDerivedFeatures(
  interactions: EdNetInteraction[]
): {
  skillDifficulties: Map<string, number>;
  questionDifficulties: Map<string, number>;
  userAbilities: Map<string, number>;
} {
  // Calculate correct rates per skill
  const skillStats = new Map<string, { correct: number; total: number }>();
  const questionStats = new Map<string, { correct: number; total: number }>();
  const userStats = new Map<string, { correct: number; total: number }>();

  for (const interaction of interactions) {
    // Skill stats
    const skillStat = skillStats.get(interaction.skillId) || { correct: 0, total: 0 };
    skillStat.total++;
    if (interaction.isCorrect) skillStat.correct++;
    skillStats.set(interaction.skillId, skillStat);

    // Question stats
    const questionStat = questionStats.get(interaction.questionId) || { correct: 0, total: 0 };
    questionStat.total++;
    if (interaction.isCorrect) questionStat.correct++;
    questionStats.set(interaction.questionId, questionStat);

    // User stats
    const userStat = userStats.get(interaction.userId) || { correct: 0, total: 0 };
    userStat.total++;
    if (interaction.isCorrect) userStat.correct++;
    userStats.set(interaction.userId, userStat);
  }

  // Convert to difficulties/abilities
  // Difficulty = 1 - correctRate (harder items have lower correct rate)
  // Ability = correctRate (higher ability = higher correct rate)
  const globalCorrectRate =
    interactions.filter((i) => i.isCorrect).length / interactions.length || 0.5;

  const skillDifficulties = new Map<string, number>();
  for (const [skillId, stat] of skillStats.entries()) {
    const correctRate = stat.total > 0 ? stat.correct / stat.total : globalCorrectRate;
    skillDifficulties.set(skillId, 1 - correctRate);
  }

  const questionDifficulties = new Map<string, number>();
  for (const [questionId, stat] of questionStats.entries()) {
    const correctRate = stat.total > 0 ? stat.correct / stat.total : globalCorrectRate;
    questionDifficulties.set(questionId, 1 - correctRate);
  }

  const userAbilities = new Map<string, number>();
  for (const [userId, stat] of userStats.entries()) {
    const correctRate = stat.total > 0 ? stat.correct / stat.total : globalCorrectRate;
    userAbilities.set(userId, correctRate);
  }

  return { skillDifficulties, questionDifficulties, userAbilities };
}

/**
 * Filter cold-start users/skills
 *
 * Removes users or skills with fewer than minimum interactions.
 * This helps training by ensuring sufficient data per entity.
 */
export function filterColdStart(
  interactions: EdNetInteraction[],
  minUserInteractions: number = 5,
  minSkillInteractions: number = 10
): EdNetInteraction[] {
  // Count interactions per user and skill
  const userCounts = new Map<string, number>();
  const skillCounts = new Map<string, number>();

  for (const interaction of interactions) {
    userCounts.set(interaction.userId, (userCounts.get(interaction.userId) || 0) + 1);
    skillCounts.set(interaction.skillId, (skillCounts.get(interaction.skillId) || 0) + 1);
  }

  // Filter
  return interactions.filter(
    (i) =>
      (userCounts.get(i.userId) || 0) >= minUserInteractions &&
      (skillCounts.get(i.skillId) || 0) >= minSkillInteractions
  );
}
