/**
 * Skills Ready Hook
 *
 * Fetches skills in the Zone of Proximal Development (ZPD) -
 * skills the user is optimally ready to learn based on hybrid ML model.
 *
 * Research: Skills with 0.4-0.7 mastery probability are optimal for learning
 */

import { useState, useEffect, useCallback } from 'react';

export interface SkillRecommendation {
  id: string;
  name: string;
  pMastery: number;
  attempts: number;
  confidence: number;
  modelUsed: 'hybrid' | 'bkt';
  zpdScore: number;
  inZPD: boolean;
  correctProbability: number;
  pathway?: string;
}

export interface SkillsReadyData {
  almostMastered: SkillRecommendation[];
  readyToLearn: SkillRecommendation[];
  locked: SkillRecommendation[];
  mastered: SkillRecommendation[];
  counts: {
    almostMastered: number;
    readyToLearn: number;
    locked: number;
    mastered: number;
    total: number;
  };
  modelInfo: {
    currentModel: string;
    usingHybrid: boolean;
    interactionCount: number;
    hybridThreshold: number;
    interactionsToHybrid: number;
  };
}

export interface UseSkillsReadyResult {
  data: SkillsReadyData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  // Convenience getters
  topRecommendations: SkillRecommendation[];
  almostMasteredSkills: SkillRecommendation[];
}

export function useSkillsReady(): UseSkillsReadyResult {
  const [data, setData] = useState<SkillsReadyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSkills = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/skills/ready');

      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated - not an error state for UI
          setData(null);
          return;
        }
        throw new Error(`Failed to fetch skills: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        setData(result.data);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      console.error('Error fetching ready skills:', err);
      setError(err instanceof Error ? err.message : 'Failed to load skill recommendations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  // Top 3-4 recommendations (mix of almost mastered and ready to learn)
  const topRecommendations = data
    ? [
        ...data.almostMastered.slice(0, 2),
        ...data.readyToLearn.slice(0, 2),
      ].slice(0, 4)
    : [];

  // Almost mastered (high priority to complete)
  const almostMasteredSkills = data?.almostMastered || [];

  return {
    data,
    isLoading,
    error,
    refetch: fetchSkills,
    topRecommendations,
    almostMasteredSkills,
  };
}

export default useSkillsReady;
