'use client';

import { useState, useEffect, useCallback } from 'react';
import type { MasteryMapData } from '@/components/mastery/types';

/**
 * Hook to fetch mastery map data
 *
 * Part of Phase 14: Mastery Map UX
 */
export function useMasteryMap(userId: string | null, courseId: string = 'ai-at-work') {
  const [data, setData] = useState<MasteryMapData | null>(null);
  const [stats, setStats] = useState<{
    totalSkills: number;
    mastered: number;
    available: number;
    locked: number;
    decaying: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMapData = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/mastery/map?userId=${userId}&courseId=${courseId}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch mastery map');
      }

      const result = await response.json();
      setData(result.data);
      setStats(result.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [userId, courseId]);

  useEffect(() => {
    fetchMapData();
  }, [fetchMapData]);

  return {
    data,
    stats,
    isLoading,
    error,
    refresh: fetchMapData,
  };
}

export default useMasteryMap;
