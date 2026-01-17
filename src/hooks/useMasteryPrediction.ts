/**
 * Mastery Prediction Hook
 *
 * Fetches ML-powered mastery predictions for adaptive quiz difficulty.
 *
 * Uses hybrid model (BKT + neural) when available.
 * Returns prediction probability, confidence, and difficulty recommendation.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';

export interface MasteryPrediction {
  pMastery: number;
  pCorrectNext: number;
  confidence: number;
  modelUsed: string;
}

export interface PredictionPathway {
  type: string;
  bktWeight: number;
  hybridWeight: number;
  reason: string;
}

export interface ColdStartInfo {
  phase: string;
  interactionCount: number;
  interactionsToWarm: number;
}

export interface MasteryPredictionData {
  prediction: MasteryPrediction;
  pathway: PredictionPathway;
  coldStart: ColdStartInfo;
  experimentVariant?: string;
}

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'challenge';

export interface UseMasteryPredictionResult {
  data: MasteryPredictionData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  // Derived values
  recommendedDifficulty: DifficultyLevel;
  masteryPercent: number;
  isHighConfidence: boolean;
  isUsingHybridModel: boolean;
}

/**
 * Map mastery probability to recommended difficulty level
 *
 * Research-backed difficulty zones:
 * - < 0.3: Easy questions to build confidence
 * - 0.3-0.5: Medium questions in learning zone
 * - 0.5-0.7: Hard questions for optimal challenge
 * - > 0.7: Challenge questions to confirm mastery
 */
function getDifficultyRecommendation(pMastery: number, pCorrectNext: number): DifficultyLevel {
  // Use predicted correct probability as primary signal
  const effectiveProb = pCorrectNext || pMastery;

  if (effectiveProb < 0.3) return 'easy';
  if (effectiveProb < 0.5) return 'medium';
  if (effectiveProb < 0.7) return 'hard';
  return 'challenge';
}

export function useMasteryPrediction(skillId: string | null | undefined): UseMasteryPredictionResult {
  const [data, setData] = useState<MasteryPredictionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firebaseUser = useAuthStore((state) => state.firebaseUser);

  const fetchPrediction = useCallback(async () => {
    if (!skillId || !firebaseUser) {
      setData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch(`/api/mastery/predict?skillId=${encodeURIComponent(skillId)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          setData(null);
          return;
        }
        throw new Error(`Failed to fetch prediction: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setData({
          prediction: result.prediction,
          pathway: result.pathway,
          coldStart: result.coldStart,
          experimentVariant: result.experimentVariant,
        });
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      console.error('Error fetching mastery prediction:', err);
      setError(err instanceof Error ? err.message : 'Failed to load prediction');
      // Set default values on error
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [skillId, firebaseUser]);

  useEffect(() => {
    if (skillId) {
      fetchPrediction();
    }
  }, [fetchPrediction, skillId]);

  // Derived values
  const prediction = data?.prediction;
  const recommendedDifficulty = prediction
    ? getDifficultyRecommendation(prediction.pMastery, prediction.pCorrectNext)
    : 'medium';

  const masteryPercent = prediction ? Math.round(prediction.pMastery * 100) : 0;
  const isHighConfidence = (prediction?.confidence || 0) > 0.7;
  const isUsingHybridModel = prediction?.modelUsed === 'hybrid';

  return {
    data,
    isLoading,
    error,
    refetch: fetchPrediction,
    recommendedDifficulty,
    masteryPercent,
    isHighConfidence,
    isUsingHybridModel,
  };
}

/**
 * Filter questions by difficulty based on mastery prediction
 *
 * @param questions - Array of questions with difficulty property
 * @param recommendedDifficulty - The difficulty level to prefer
 * @param count - Number of questions to return
 */
export function filterQuestionsByDifficulty<T extends { difficulty?: string | number }>(
  questions: T[],
  recommendedDifficulty: DifficultyLevel,
  count: number = 5
): T[] {
  // Map difficulty levels to numeric ranges
  const difficultyToRange: Record<DifficultyLevel, [number, number]> = {
    easy: [0, 0.3],
    medium: [0.3, 0.5],
    hard: [0.5, 0.7],
    challenge: [0.7, 1.0],
  };

  const [minDiff, maxDiff] = difficultyToRange[recommendedDifficulty];

  // Score questions by how well they match the recommended difficulty
  const scoredQuestions = questions.map((q) => {
    const qDiff = typeof q.difficulty === 'number'
      ? q.difficulty
      : q.difficulty === 'easy' ? 0.2
      : q.difficulty === 'medium' ? 0.4
      : q.difficulty === 'hard' ? 0.6
      : 0.5; // default

    // Score is higher when closer to recommended range
    const inRange = qDiff >= minDiff && qDiff <= maxDiff;
    const distance = inRange ? 0 : Math.min(Math.abs(qDiff - minDiff), Math.abs(qDiff - maxDiff));
    const score = 1 - distance;

    return { question: q, score };
  });

  // Sort by score (descending) and take top N
  return scoredQuestions
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((sq) => sq.question);
}

export default useMasteryPrediction;
