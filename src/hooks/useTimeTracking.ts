'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUnifiedStore } from '@/store/unifiedStore';

type TimeTrackingOptions = {
  atomId: string;
  lessonId?: string;
  onTimeUpdate?: (seconds: number) => void;
  syncIntervalSeconds?: number;
  maxIdleSeconds?: number;
};

type TimeTrackingReturn = {
  elapsedSeconds: number;
  isActive: boolean;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  getTimeSpent: () => number;
};

/**
 * Hook for tracking time spent on learning content
 * Handles:
 * - Accurate time tracking
 * - Idle detection (pauses when user is inactive)
 * - Periodic syncing to store
 * - Tab visibility changes
 */
export function useTimeTracking({
  atomId,
  lessonId,
  onTimeUpdate,
  syncIntervalSeconds = 30,
  maxIdleSeconds = 120,
}: TimeTrackingOptions): TimeTrackingReturn {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isActive, setIsActive] = useState(true);

  const startTimeRef = useRef<number>(Date.now());
  const lastActivityRef = useRef<number>(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const totalPausedTimeRef = useRef<number>(0);
  const pauseStartRef = useRef<number | null>(null);

  const updateProgress = useUnifiedStore((state) => state.updateProgress);
  const user = useUnifiedStore((state) => state.user);

  // Calculate actual elapsed time
  const calculateElapsed = useCallback(() => {
    const now = Date.now();
    const totalTime = now - startTimeRef.current;
    const activeTime = totalTime - totalPausedTimeRef.current;

    // If currently paused, subtract the current pause duration
    if (pauseStartRef.current !== null) {
      return Math.floor((activeTime - (now - pauseStartRef.current)) / 1000);
    }

    return Math.floor(activeTime / 1000);
  }, []);

  // Get time spent (for external use)
  const getTimeSpent = useCallback(() => {
    return calculateElapsed();
  }, [calculateElapsed]);

  // Pause tracking
  const pause = useCallback(() => {
    if (!isActive) return;
    setIsActive(false);
    pauseStartRef.current = Date.now();
  }, [isActive]);

  // Resume tracking
  const resume = useCallback(() => {
    if (isActive) return;

    if (pauseStartRef.current !== null) {
      totalPausedTimeRef.current += Date.now() - pauseStartRef.current;
      pauseStartRef.current = null;
    }

    setIsActive(true);
    lastActivityRef.current = Date.now();
  }, [isActive]);

  // Reset tracking
  const reset = useCallback(() => {
    startTimeRef.current = Date.now();
    lastActivityRef.current = Date.now();
    totalPausedTimeRef.current = 0;
    pauseStartRef.current = null;
    setElapsedSeconds(0);
    setIsActive(true);
  }, []);

  // Handle user activity
  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();

    // Resume if was paused due to inactivity
    if (!isActive && pauseStartRef.current !== null) {
      resume();
    }
  }, [isActive, resume]);

  // Check for idle
  const checkIdle = useCallback(() => {
    const idleTime = (Date.now() - lastActivityRef.current) / 1000;

    if (idleTime > maxIdleSeconds && isActive) {
      pause();
    }
  }, [maxIdleSeconds, isActive, pause]);

  // Sync to store
  const syncToStore = useCallback(async () => {
    if (!user?.progress) return;

    const currentTotal = user.progress.totalTimeSpentMinutes || 0;
    const sessionMinutes = Math.floor(calculateElapsed() / 60);

    // Only update if we have at least 1 minute
    if (sessionMinutes > 0) {
      await updateProgress({
        totalTimeSpentMinutes: currentTotal + sessionMinutes,
        lastActiveAt: new Date(),
      });
    }
  }, [user?.progress, calculateElapsed, updateProgress]);

  // Main timer effect
  useEffect(() => {
    // Update elapsed seconds every second
    intervalRef.current = setInterval(() => {
      if (isActive) {
        const elapsed = calculateElapsed();
        setElapsedSeconds(elapsed);
        onTimeUpdate?.(elapsed);
        checkIdle();
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, calculateElapsed, onTimeUpdate, checkIdle]);

  // Sync interval effect
  useEffect(() => {
    syncIntervalRef.current = setInterval(syncToStore, syncIntervalSeconds * 1000);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      // Final sync on unmount
      syncToStore();
    };
  }, [syncIntervalSeconds, syncToStore]);

  // Activity listeners
  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll'];

    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [handleActivity]);

  // Visibility change handler
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        pause();
      } else {
        resume();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pause, resume]);

  // Reset on atom change
  useEffect(() => {
    reset();
  }, [atomId, reset]);

  return {
    elapsedSeconds,
    isActive,
    pause,
    resume,
    reset,
    getTimeSpent,
  };
}

/**
 * Format seconds into a readable string
 */
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Format seconds into MM:SS format
 */
export function formatTimeMMSS(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Calculate reading time based on word count
 */
export function estimateReadingTime(wordCount: number, wordsPerMinute: number = 200): number {
  return Math.ceil(wordCount / wordsPerMinute);
}
