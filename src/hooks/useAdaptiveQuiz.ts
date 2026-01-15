'use client';

import { useState, useCallback, useMemo } from 'react';
import type { Question } from '@/types';

/**
 * Adaptive Quiz Difficulty System
 *
 * Dynamically adjusts quiz difficulty based on real-time performance:
 * - Correct streak → increase difficulty
 * - Wrong streak → decrease difficulty and trigger remediation
 */

// ============================================
// TYPES
// ============================================

export type AdaptiveState = {
  // Current performance
  correctStreak: number;
  wrongStreak: number;
  totalCorrect: number;
  totalWrong: number;

  // Difficulty targeting (0-1 normalized)
  currentDifficulty: number;
  targetDifficulty: number;

  // Question ordering
  answeredQuestions: string[];
  skippedQuestions: string[];

  // Struggle detection
  struggleDetected: boolean;
  struggleConcepts: string[];

  // Remediation
  needsRemediation: boolean;
  remediationTopic?: string;
};

export type AdaptiveConfig = {
  // Starting difficulty (0-1)
  initialDifficulty: number;

  // How many correct answers to increase difficulty
  streakToIncrease: number;

  // How many wrong answers to decrease difficulty
  streakToDecrease: number;

  // Difficulty change amount per adjustment
  difficultyStep: number;

  // Minimum and maximum difficulty bounds
  minDifficulty: number;
  maxDifficulty: number;

  // When to trigger remediation
  wrongStreakForRemediation: number;

  // When to trigger struggle callback
  wrongStreakForStruggle: number;
};

export type AnswerResult = {
  questionId: string;
  correct: boolean;
  questionDifficulty: number;
  skills?: string[];
};

// ============================================
// DEFAULT CONFIG
// ============================================

const DEFAULT_CONFIG: AdaptiveConfig = {
  initialDifficulty: 0.5,
  streakToIncrease: 2,
  streakToDecrease: 2,
  difficultyStep: 0.15,
  minDifficulty: 0.1,
  maxDifficulty: 0.95,
  wrongStreakForRemediation: 3,
  wrongStreakForStruggle: 2,
};

// ============================================
// HOOK
// ============================================

export function useAdaptiveQuiz(
  config: Partial<AdaptiveConfig> = {}
) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  const [state, setState] = useState<AdaptiveState>({
    correctStreak: 0,
    wrongStreak: 0,
    totalCorrect: 0,
    totalWrong: 0,
    currentDifficulty: mergedConfig.initialDifficulty,
    targetDifficulty: mergedConfig.initialDifficulty,
    answeredQuestions: [],
    skippedQuestions: [],
    struggleDetected: false,
    struggleConcepts: [],
    needsRemediation: false,
  });

  /**
   * Record an answer and adjust difficulty
   */
  const recordAnswer = useCallback((result: AnswerResult) => {
    setState((prev) => {
      const newCorrectStreak = result.correct ? prev.correctStreak + 1 : 0;
      const newWrongStreak = result.correct ? 0 : prev.wrongStreak + 1;

      let newTargetDifficulty = prev.targetDifficulty;

      // Increase difficulty after streak of correct answers
      if (newCorrectStreak >= mergedConfig.streakToIncrease) {
        newTargetDifficulty = Math.min(
          prev.targetDifficulty + mergedConfig.difficultyStep,
          mergedConfig.maxDifficulty
        );
      }

      // Decrease difficulty after streak of wrong answers
      if (newWrongStreak >= mergedConfig.streakToDecrease) {
        newTargetDifficulty = Math.max(
          prev.targetDifficulty - mergedConfig.difficultyStep,
          mergedConfig.minDifficulty
        );
      }

      // Track struggling concepts
      const newStruggleConcepts = [...prev.struggleConcepts];
      if (!result.correct && result.skills) {
        for (const skill of result.skills) {
          if (!newStruggleConcepts.includes(skill)) {
            newStruggleConcepts.push(skill);
          }
        }
      }

      // Check for remediation need
      const needsRemediation = newWrongStreak >= mergedConfig.wrongStreakForRemediation;

      return {
        ...prev,
        correctStreak: newCorrectStreak,
        wrongStreak: newWrongStreak,
        totalCorrect: prev.totalCorrect + (result.correct ? 1 : 0),
        totalWrong: prev.totalWrong + (result.correct ? 0 : 1),
        currentDifficulty: result.questionDifficulty,
        targetDifficulty: newTargetDifficulty,
        answeredQuestions: [...prev.answeredQuestions, result.questionId],
        struggleDetected: newWrongStreak >= mergedConfig.wrongStreakForStruggle,
        struggleConcepts: newStruggleConcepts,
        needsRemediation,
        remediationTopic: needsRemediation && result.skills?.[0]
          ? result.skills[0]
          : prev.remediationTopic,
      };
    });
  }, [mergedConfig]);

  /**
   * Select the next question based on target difficulty
   */
  const selectNextQuestion = useCallback((
    availableQuestions: Question[],
  ): Question | null => {
    // Filter out already answered questions
    const unanswered = availableQuestions.filter(
      (q) => !state.answeredQuestions.includes(q.id)
    );

    if (unanswered.length === 0) return null;

    // Normalize question difficulties to 0-1 scale (assuming 1-5 scale)
    const questionsWithNormalizedDifficulty = unanswered.map((q) => ({
      question: q,
      normalizedDifficulty: ((q.difficulty || 3) - 1) / 4, // Convert 1-5 to 0-1
    }));

    // Find question closest to target difficulty
    const target = state.targetDifficulty;
    let bestMatch = questionsWithNormalizedDifficulty[0];
    let bestDistance = Math.abs(bestMatch.normalizedDifficulty - target);

    for (const item of questionsWithNormalizedDifficulty) {
      const distance = Math.abs(item.normalizedDifficulty - target);
      if (distance < bestDistance) {
        bestMatch = item;
        bestDistance = distance;
      }
    }

    return bestMatch.question;
  }, [state.answeredQuestions, state.targetDifficulty]);

  /**
   * Get ordered questions for adaptive delivery
   */
  const getAdaptiveQuestionOrder = useCallback((
    questions: Question[]
  ): Question[] => {
    const ordered: Question[] = [];
    const remaining = [...questions];

    // Start with a question at initial difficulty
    const initialQuestion = selectNextQuestion(remaining);
    if (initialQuestion) {
      ordered.push(initialQuestion);
      const idx = remaining.findIndex((q) => q.id === initialQuestion.id);
      if (idx >= 0) remaining.splice(idx, 1);
    }

    // For the rest, we'll use the adaptive selection during quiz
    // Just return remaining in difficulty order as fallback
    const sortedRemaining = remaining.sort((a, b) =>
      (a.difficulty || 3) - (b.difficulty || 3)
    );

    return [...ordered, ...sortedRemaining];
  }, [selectNextQuestion]);

  /**
   * Clear remediation flag after it's been addressed
   */
  const clearRemediation = useCallback(() => {
    setState((prev) => ({
      ...prev,
      needsRemediation: false,
      remediationTopic: undefined,
      // Give a small difficulty boost back after remediation
      targetDifficulty: Math.min(
        prev.targetDifficulty + mergedConfig.difficultyStep * 0.5,
        mergedConfig.maxDifficulty
      ),
    }));
  }, [mergedConfig]);

  /**
   * Reset the adaptive state for a new quiz attempt
   */
  const reset = useCallback(() => {
    setState({
      correctStreak: 0,
      wrongStreak: 0,
      totalCorrect: 0,
      totalWrong: 0,
      currentDifficulty: mergedConfig.initialDifficulty,
      targetDifficulty: mergedConfig.initialDifficulty,
      answeredQuestions: [],
      skippedQuestions: [],
      struggleDetected: false,
      struggleConcepts: [],
      needsRemediation: false,
    });
  }, [mergedConfig.initialDifficulty]);

  /**
   * Computed values
   */
  const accuracy = useMemo(() => {
    const total = state.totalCorrect + state.totalWrong;
    return total > 0 ? state.totalCorrect / total : 0;
  }, [state.totalCorrect, state.totalWrong]);

  const performanceLevel = useMemo(() => {
    if (accuracy >= 0.8) return 'excellent';
    if (accuracy >= 0.6) return 'good';
    if (accuracy >= 0.4) return 'struggling';
    return 'needs-help';
  }, [accuracy]);

  return {
    // State
    state,
    accuracy,
    performanceLevel,

    // Actions
    recordAnswer,
    selectNextQuestion,
    getAdaptiveQuestionOrder,
    clearRemediation,
    reset,

    // Computed helpers
    isStruggling: state.struggleDetected,
    needsRemediation: state.needsRemediation,
    remediationTopic: state.remediationTopic,
    targetDifficulty: state.targetDifficulty,
    struggleConcepts: state.struggleConcepts,
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Convert difficulty levels between scales
 */
export function normalizeDifficulty(
  difficulty: number,
  fromScale: '1-5' | '0-1' = '1-5'
): number {
  if (fromScale === '1-5') {
    return (difficulty - 1) / 4;
  }
  return difficulty;
}

/**
 * Convert normalized difficulty back to 1-5 scale
 */
export function denormalizeDifficulty(
  normalized: number
): 1 | 2 | 3 | 4 | 5 {
  const value = Math.round(normalized * 4 + 1);
  return Math.max(1, Math.min(5, value)) as 1 | 2 | 3 | 4 | 5;
}

/**
 * Get a human-readable difficulty label
 */
export function getDifficultyLabel(
  difficulty: number,
  scale: '1-5' | '0-1' = '0-1'
): string {
  const normalized = scale === '1-5' ? normalizeDifficulty(difficulty) : difficulty;

  if (normalized < 0.2) return 'Very Easy';
  if (normalized < 0.4) return 'Easy';
  if (normalized < 0.6) return 'Medium';
  if (normalized < 0.8) return 'Hard';
  return 'Very Hard';
}
