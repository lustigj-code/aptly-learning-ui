/**
 * usePrefetchQueue Hook
 *
 * React hook for atom-level prefetching with swipe prediction.
 * Integrates the PrefetchQueue service with the learning UI to provide
 * zero-latency card transitions.
 *
 * Features:
 * - Predicts next atom based on swipe velocity and direction
 * - Starts prefetch 200ms before swipe completes
 * - Automatically cancels stale prefetches on navigation
 * - Manages 3-atom memory budget
 *
 * Usage:
 * ```tsx
 * const { predictAndPrefetch, prefetchNextAtoms } = usePrefetchQueue(currentLesson);
 *
 * // On swipe start
 * predictAndPrefetch(swipeVelocity, swipeDirection);
 *
 * // Or manually prefetch next 3 atoms
 * prefetchNextAtoms(currentAtomIndex);
 * ```
 */

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getPrefetchQueue, initPrefetchQueue } from '@/lib/prefetch/PrefetchQueue';
import type { Lesson, Atom } from '@/types';

// ============================================
// CONFIGURATION
// ============================================

const PREFETCH_DELAY_MS = 200; // Start prefetch 200ms before swipe completes
const SWIPE_VELOCITY_THRESHOLD = 0.5; // Minimum velocity to trigger prediction
const PREFETCH_LOOKAHEAD = 3; // Number of atoms to prefetch ahead

// ============================================
// SWIPE PREDICTION
// ============================================

type SwipeDirection = 'left' | 'right' | 'up' | 'down';

/**
 * Predict the next atom index based on swipe velocity and direction.
 *
 * @param currentIndex - Current atom index in the lesson
 * @param velocity - Swipe velocity (0-1 scale)
 * @param direction - Swipe direction
 * @param totalAtoms - Total number of atoms in lesson
 * @returns Predicted next atom index, or null if no prediction
 */
function predictNextAtomIndex(
  currentIndex: number,
  velocity: number,
  direction: SwipeDirection,
  totalAtoms: number
): number | null {
  // Only predict on forward swipes (left or down in typical UIs)
  if (direction !== 'left' && direction !== 'down') {
    return null;
  }

  // Velocity too low - no confident prediction
  if (velocity < SWIPE_VELOCITY_THRESHOLD) {
    return null;
  }

  const nextIndex = currentIndex + 1;

  // Bounds check
  if (nextIndex >= totalAtoms) {
    return null;
  }

  return nextIndex;
}

/**
 * Get the next N atom IDs starting from a given index
 */
function getNextAtomIds(
  atoms: Atom[],
  startIndex: number,
  count: number = PREFETCH_LOOKAHEAD
): string[] {
  const nextAtoms: string[] = [];

  for (let i = startIndex; i < Math.min(startIndex + count, atoms.length); i++) {
    if (atoms[i]) {
      nextAtoms.push(atoms[i].id);
    }
  }

  return nextAtoms;
}

// ============================================
// HOOK
// ============================================

interface UsePrefetchQueueOptions {
  /**
   * Whether to enable automatic prefetching.
   * Default: true
   */
  enabled?: boolean;

  /**
   * Number of atoms to prefetch ahead.
   * Default: 3
   */
  lookahead?: number;

  /**
   * Delay in ms before starting prefetch after prediction.
   * Default: 200ms
   */
  prefetchDelay?: number;
}

interface UsePrefetchQueueResult {
  /**
   * Predict and prefetch based on swipe gesture.
   * Call this when user starts swiping to next card.
   */
  predictAndPrefetch: (
    velocity: number,
    direction: SwipeDirection,
    currentAtomIndex: number
  ) => void;

  /**
   * Manually prefetch the next N atoms from current position.
   * Useful for prefetching on lesson load or when prediction is uncertain.
   */
  prefetchNextAtoms: (currentAtomIndex: number) => void;

  /**
   * Cancel all pending prefetches.
   * Call when user navigates away from lesson.
   */
  cancelPrefetches: () => void;

  /**
   * Get current prefetch queue status (for debugging).
   */
  getStatus: () => {
    queueLength: number;
    activePrefetches: number;
    prefetchedCount: number;
    availableSlots: number;
  };
}

/**
 * Hook for atom-level prefetching with swipe prediction.
 *
 * @param currentLesson - The current lesson being viewed
 * @param options - Configuration options
 * @returns Prefetch control functions
 *
 * @example
 * ```tsx
 * function LearningCard({ lesson, currentAtomIndex }) {
 *   const { predictAndPrefetch, prefetchNextAtoms } = usePrefetchQueue(lesson);
 *
 *   // Prefetch on lesson load
 *   useEffect(() => {
 *     prefetchNextAtoms(currentAtomIndex);
 *   }, [currentAtomIndex]);
 *
 *   // Predict on swipe
 *   const handleSwipeStart = (velocity, direction) => {
 *     predictAndPrefetch(velocity, direction, currentAtomIndex);
 *   };
 *
 *   return <SwipeableCard onSwipeStart={handleSwipeStart} />;
 * }
 * ```
 */
export function usePrefetchQueue(
  currentLesson: Lesson | null | undefined,
  options: UsePrefetchQueueOptions = {}
): UsePrefetchQueueResult {
  const {
    enabled = true,
    lookahead = PREFETCH_LOOKAHEAD,
    prefetchDelay = PREFETCH_DELAY_MS,
  } = options;

  const queryClient = useQueryClient();
  const prefetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prefetchQueueRef = useRef<ReturnType<typeof getPrefetchQueue> | null>(null);

  // Initialize prefetch queue on mount
  useEffect(() => {
    try {
      prefetchQueueRef.current = getPrefetchQueue();
    } catch {
      // Not initialized yet, initialize it
      prefetchQueueRef.current = initPrefetchQueue(queryClient);
    }
  }, [queryClient]);

  // Cleanup on unmount or lesson change
  useEffect(() => {
    return () => {
      // Clear any pending timeout
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
      }

      // Cancel pending prefetches when lesson changes
      if (prefetchQueueRef.current) {
        prefetchQueueRef.current.cancelStalePrefeches();
      }
    };
  }, [currentLesson?.id]);

  /**
   * Predict and prefetch based on swipe gesture
   */
  const predictAndPrefetch = useCallback(
    (velocity: number, direction: SwipeDirection, currentAtomIndex: number) => {
      if (!enabled || !currentLesson?.atoms || !prefetchQueueRef.current) {
        return;
      }

      const predictedIndex = predictNextAtomIndex(
        currentAtomIndex,
        velocity,
        direction,
        currentLesson.atoms.length
      );

      if (predictedIndex === null) {
        return;
      }

      // Clear any existing timeout
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
      }

      // Schedule prefetch with delay (200ms before swipe completes)
      prefetchTimeoutRef.current = setTimeout(() => {
        const atomIds = getNextAtomIds(currentLesson.atoms, predictedIndex, lookahead);

        if (atomIds.length > 0) {
          // Priority 3 for predicted atoms (highest)
          prefetchQueueRef.current!.addToPrefetchQueue(
            atomIds,
            3,
            currentLesson.id
          );
        }
      }, prefetchDelay);
    },
    [enabled, currentLesson, lookahead, prefetchDelay]
  );

  /**
   * Manually prefetch next atoms from current position
   */
  const prefetchNextAtoms = useCallback(
    (currentAtomIndex: number) => {
      if (!enabled || !currentLesson?.atoms || !prefetchQueueRef.current) {
        return;
      }

      const nextIndex = currentAtomIndex + 1;
      const atomIds = getNextAtomIds(currentLesson.atoms, nextIndex, lookahead);

      if (atomIds.length > 0) {
        // Priority 2 for manual prefetch (medium)
        prefetchQueueRef.current.addToPrefetchQueue(
          atomIds,
          2,
          currentLesson.id
        );
      }
    },
    [enabled, currentLesson, lookahead]
  );

  /**
   * Cancel all pending prefetches
   */
  const cancelPrefetches = useCallback(() => {
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
    }

    if (prefetchQueueRef.current) {
      prefetchQueueRef.current.cancelStalePrefeches();
    }
  }, []);

  /**
   * Get current prefetch queue status
   */
  const getStatus = useCallback(() => {
    if (!prefetchQueueRef.current) {
      return {
        queueLength: 0,
        activePrefetches: 0,
        prefetchedCount: 0,
        availableSlots: PREFETCH_LOOKAHEAD,
      };
    }

    return prefetchQueueRef.current.getQueueStatus();
  }, []);

  return {
    predictAndPrefetch,
    prefetchNextAtoms,
    cancelPrefetches,
    getStatus,
  };
}

// ============================================
// UTILITY HOOKS
// ============================================

/**
 * Hook to automatically prefetch next atoms when current atom changes.
 * Simpler version for basic use cases without swipe prediction.
 *
 * @param currentLesson - Current lesson
 * @param currentAtomIndex - Current atom index
 *
 * @example
 * ```tsx
 * function LearningView({ lesson, atomIndex }) {
 *   useAutoPrefetch(lesson, atomIndex);
 *   // Atoms are now automatically prefetched in background
 * }
 * ```
 */
export function useAutoPrefetch(
  currentLesson: Lesson | null | undefined,
  currentAtomIndex: number
): void {
  const { prefetchNextAtoms } = usePrefetchQueue(currentLesson);

  useEffect(() => {
    // Prefetch next atoms whenever current atom changes
    prefetchNextAtoms(currentAtomIndex);
  }, [currentAtomIndex, prefetchNextAtoms]);
}

// ============================================
// EXPORTS
// ============================================

export type { SwipeDirection, UsePrefetchQueueOptions, UsePrefetchQueueResult };
