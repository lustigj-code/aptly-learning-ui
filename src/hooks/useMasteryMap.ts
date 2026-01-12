'use client';

import { useState, useEffect, useCallback } from 'react';
import { get, isSuccess } from '@/lib/api/client';
import type { MasteryMapData } from '@/components/mastery/types';

interface MasteryMapResponse {
  success: boolean;
  data: MasteryMapData;
  stats: {
    totalSkills: number;
    mastered: number;
    available: number;
    locked: number;
    decaying: number;
  };
}

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
      // Use API client which automatically injects auth token
      const response = await get<MasteryMapResponse>(
        `/api/mastery/map?userId=${userId}&courseId=${courseId}`
      );

      if (isSuccess(response)) {
        setData(response.data.data);
        setStats(response.data.stats);
      } else {
        setError(response.error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [userId, courseId]);

  useEffect(() => {
    let mounted = true;

    const fetch = async () => {
      if (!userId) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await get<MasteryMapResponse>(
          `/api/mastery/map?userId=${userId}&courseId=${courseId}`
        );

        if (mounted) {
          if (isSuccess(response)) {
            setData(response.data.data);
            setStats(response.data.stats);
          } else {
            setError(response.error.message);
          }
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetch();

    return () => {
      mounted = false;
    };
  }, [userId, courseId]);

  return {
    data,
    stats,
    isLoading,
    error,
    refresh: fetchMapData,
  };
}

export default useMasteryMap;
