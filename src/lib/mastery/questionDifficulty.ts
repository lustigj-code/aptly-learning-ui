/**
 * Question Difficulty Calculator
 *
 * Implements Rasch model difficulty estimation:
 * - d_qt = question difficulty scalar
 * - Derived from historical response patterns
 *
 * Part of Phase 15: Hybrid Learner Model
 */

import type { InteractionLog } from '@/types';

export interface QuestionDifficulty {
  questionId: string;
  skillId: string;
  difficulty: number;      // 0-1 scale (0 = easy, 1 = hard)
  responseCount: number;
  correctRate: number;
  lastUpdated: Date;
}

/**
 * Calculate question difficulty from interaction history
 * Uses Item Response Theory (IRT) simplified formula
 */
export function calculateQuestionDifficulty(
  questionId: string,
  skillId: string,
  interactions: InteractionLog[]
): QuestionDifficulty {
  const questionInteractions = interactions.filter(
    i => i.questionId === questionId
  );

  if (questionInteractions.length === 0) {
    // No data - return neutral difficulty
    return {
      questionId,
      skillId,
      difficulty: 0.5,
      responseCount: 0,
      correctRate: 0.5,
      lastUpdated: new Date(),
    };
  }

  const correctCount = questionInteractions.filter(i => i.isCorrect).length;
  const correctRate = correctCount / questionInteractions.length;

  // IRT-inspired difficulty: lower correct rate = higher difficulty
  // Add smoothing to avoid extreme values (Laplace smoothing)
  const smoothedRate = (correctCount + 1) / (questionInteractions.length + 2);
  const difficulty = 1 - smoothedRate;

  return {
    questionId,
    skillId,
    difficulty,
    responseCount: questionInteractions.length,
    correctRate,
    lastUpdated: new Date(),
  };
}

/**
 * Calculate concept (skill) average difficulty
 */
export function calculateConceptDifficulty(
  skillId: string,
  questionDifficulties: QuestionDifficulty[]
): number {
  const skillQuestions = questionDifficulties.filter(
    q => q.skillId === skillId
  );

  if (skillQuestions.length === 0) return 0.5;

  // Weighted average by response count
  const totalWeight = skillQuestions.reduce(
    (sum, q) => sum + q.responseCount,
    0
  );

  if (totalWeight === 0) return 0.5;

  return skillQuestions.reduce(
    (sum, q) => sum + q.difficulty * q.responseCount,
    0
  ) / totalWeight;
}

/**
 * Calculate difficulty deviation (Rasch d_qt)
 * This is the key feature that improves prediction accuracy
 */
export function calculateDifficultyDeviation(
  questionDifficulty: number,
  conceptDifficulty: number
): number {
  return questionDifficulty - conceptDifficulty;
}

/**
 * Create features from interaction for hybrid model
 */
export function createInteractionFeatures(
  interaction: InteractionLog,
  questionDifficulty: QuestionDifficulty,
  conceptDifficulty: number,
  recentHistory: InteractionLog[]
): import('./hybridTypes').InteractionFeatures {
  // Calculate recent correct rate (last 5)
  const recent5 = recentHistory.slice(-5);
  const recentCorrectRate = recent5.length > 0
    ? recent5.filter(i => i.isCorrect).length / recent5.length
    : 0.5;

  return {
    skillId: interaction.skillId,
    questionId: interaction.questionId ?? '',
    isCorrect: interaction.isCorrect ?? false,
    timestamp: interaction.timestamp,
    questionDifficulty: questionDifficulty.difficulty,
    conceptDifficulty,
    difficultyDeviation: calculateDifficultyDeviation(
      questionDifficulty.difficulty,
      conceptDifficulty
    ),
    elapsedTimeSinceLastAttempt: interaction.timeGapFromLastAttempt ?? 0,
    attemptNumber: interaction.attemptNumber,
    recentCorrectRate,
  };
}
