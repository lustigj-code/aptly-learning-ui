'use client';

/**
 * Split-Brain Hook - Coordinates FAST BRAIN (UI) with SLOW BRAIN (Worker)
 *
 * This hook manages the Web Worker lifecycle and provides async APIs
 * for offloading expensive mastery calculations.
 *
 * FAST BRAIN (UI Thread):       SLOW BRAIN (Web Worker):
 * - CardRenderer                - MasteryCalculator (BKT)
 * - AnimationController         - SpacingScheduler (FSRS)
 * - GestureDetector             - StruggleAnalyzer
 * - OptimisticState             - SyncController
 *
 * Fallback: If Web Workers are unsupported, calculations run on main thread.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import type { SkillState, BKTParameters } from '@/lib/mastery/bkt';
import type { FSRSState } from '@/lib/mastery/knowledgeGraph';
import type { ReviewRating, FSRSParameters } from '@/lib/mastery/fsrs';
import type {
  WorkerMessage,
  WorkerResponse,
  UpdateBKTMessage,
  ScheduleReviewMessage,
  BatchUpdateMessage,
} from '@/workers/masteryWorker';

// Fallback imports for non-worker environments
import { updateMastery, DEFAULT_BKT_PARAMS } from '@/lib/mastery/bkt';
import { calculateNextState, DEFAULT_PARAMETERS } from '@/lib/mastery/fsrs';

// ============================================
// TYPES
// ============================================

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

export type SplitBrainConfig = {
  enableWorker?: boolean; // Set to false to force main thread fallback
  workerTimeout?: number; // Timeout in ms for worker responses
};

// ============================================
// HOOK
// ============================================

/**
 * Hook for split-brain mastery calculations
 *
 * @param config - Configuration options
 * @returns API for async mastery calculations
 */
export function useSplitBrain(config: SplitBrainConfig = {}) {
  const {
    enableWorker = true,
    workerTimeout = 5000,
  } = config;

  const workerRef = useRef<Worker | null>(null);
  const pendingRequests = useRef<Map<string, PendingRequest>>(new Map());
  const requestIdCounter = useRef(0);

  // Initialize worker support check - avoid setState in effect by checking upfront
  const [isWorkerSupported, setIsWorkerSupported] = useState(() => {
    if (typeof window === 'undefined') return false; // SSR check
    return typeof Worker !== 'undefined';
  });
  // Track worker ready state in proper state (not ref) to trigger re-renders
  const [isWorkerReady, setIsWorkerReady] = useState(false);

  // ============================================
  // WORKER INITIALIZATION
  // ============================================

  useEffect(() => {
    // Early exit if workers not supported or disabled
    if (!isWorkerSupported || !enableWorker) {
      return;
    }

    // Copy ref to local variable for cleanup
    const requests = pendingRequests.current;
    let worker: Worker | null = null;

    try {
      // Create the worker using Next.js compatible syntax
      worker = new Worker(new URL('../workers/masteryWorker.ts', import.meta.url));

      // Set up message handler
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const response = event.data;
        const pending = requests.get(response.id);

        if (!pending) {
          console.warn(`[SplitBrain] No pending request for id: ${response.id}`);
          return;
        }

        // Remove from pending
        requests.delete(response.id);

        // Handle response
        if (response.type === 'SUCCESS') {
          pending.resolve(response.payload);
        } else {
          pending.reject(new Error(response.error));
        }
      };

      // Set up error handler
      worker.onerror = (error) => {
        console.error('[SplitBrain] Worker error:', error);
        setIsWorkerSupported(false);
      };

      workerRef.current = worker;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Valid: Worker initialization is async external system setup
      setIsWorkerReady(true);

      console.log('[SplitBrain] Worker initialized successfully');
    } catch (error) {
      console.error('[SplitBrain] Failed to initialize worker:', error);
      setIsWorkerSupported(false);
    }

    // Cleanup on unmount
    return () => {
      if (worker) {
        console.log('[SplitBrain] Terminating worker');
        worker.terminate();
        workerRef.current = null;
        setIsWorkerReady(false);
      }

      // Reject all pending requests
      requests.forEach(({ reject }) => {
        reject(new Error('Worker terminated'));
      });
      requests.clear();
    };
  }, [enableWorker, isWorkerSupported]);

  // ============================================
  // MAIN THREAD FALLBACK (defined first for reference in sendToWorker)
  // ============================================

  const executeOnMainThread = useCallback((message: WorkerMessage): unknown => {
    switch (message.type) {
      case 'UPDATE_BKT': {
        const { currentState, correct, params } = message.payload;
        return updateMastery(
          currentState,
          correct,
          params || DEFAULT_BKT_PARAMS
        );
      }

      case 'SCHEDULE_REVIEW': {
        const { currentState, rating, params } = message.payload;
        return calculateNextState(
          currentState,
          rating,
          params || DEFAULT_PARAMETERS
        );
      }

      case 'BATCH_UPDATE': {
        const { updates } = message.payload;
        return updates.map(update => ({
          skillId: update.skillId,
          updatedState: updateMastery(
            update.currentState,
            update.correct,
            update.params || DEFAULT_BKT_PARAMS
          ),
        }));
      }

      default:
        throw new Error(`Unknown message type: ${(message as { type: string }).type}`);
    }
  }, []);

  // ============================================
  // HELPER: SEND MESSAGE TO WORKER
  // ============================================

  const sendToWorker = useCallback(
    <T>(message: WorkerMessage): Promise<T> => {
      return new Promise((resolve, reject) => {
        // Fallback to main thread if worker not available
        if (!isWorkerSupported || !isWorkerReady || !workerRef.current) {
          // Execute on main thread
          try {
            const result = executeOnMainThread(message);
            resolve(result as T);
          } catch (error) {
            reject(error);
          }
          return;
        }

        // Store pending request
        pendingRequests.current.set(message.id, {
          resolve: resolve as (value: unknown) => void,
          reject,
        });

        // Set timeout
        const timeoutId = setTimeout(() => {
          const pending = pendingRequests.current.get(message.id);
          if (pending) {
            pendingRequests.current.delete(message.id);
            pending.reject(new Error('Worker timeout'));
          }
        }, workerTimeout);

        // Send message to worker
        try {
          workerRef.current.postMessage(message);
        } catch (error) {
          clearTimeout(timeoutId);
          pendingRequests.current.delete(message.id);
          reject(error);
        }
      });
    },
    [isWorkerSupported, isWorkerReady, workerTimeout, executeOnMainThread]
  );

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Update mastery using BKT algorithm (async)
   */
  const updateMasteryAsync = useCallback(
    async (
      currentState: SkillState,
      correct: boolean,
      params?: BKTParameters
    ): Promise<SkillState> => {
      const id = `bkt-${requestIdCounter.current++}`;
      const message: UpdateBKTMessage = {
        type: 'UPDATE_BKT',
        id,
        payload: { currentState, correct, params },
      };
      return sendToWorker<SkillState>(message);
    },
    [sendToWorker]
  );

  /**
   * Schedule next review using FSRS algorithm (async)
   */
  const scheduleReviewAsync = useCallback(
    async (
      currentState: FSRSState,
      rating: ReviewRating,
      params?: FSRSParameters
    ): Promise<{ nextState: FSRSState; interval: number }> => {
      const id = `fsrs-${requestIdCounter.current++}`;
      const message: ScheduleReviewMessage = {
        type: 'SCHEDULE_REVIEW',
        id,
        payload: { currentState, rating, params },
      };
      return sendToWorker<{ nextState: FSRSState; interval: number }>(message);
    },
    [sendToWorker]
  );

  /**
   * Batch update multiple skills (async)
   */
  const batchUpdateAsync = useCallback(
    async (
      updates: Array<{
        skillId: string;
        currentState: SkillState;
        correct: boolean;
        params?: BKTParameters;
      }>
    ): Promise<Array<{ skillId: string; updatedState: SkillState }>> => {
      const id = `batch-${requestIdCounter.current++}`;
      const message: BatchUpdateMessage = {
        type: 'BATCH_UPDATE',
        id,
        payload: { updates },
      };
      return sendToWorker<Array<{ skillId: string; updatedState: SkillState }>>(message);
    },
    [sendToWorker]
  );

  return {
    // Core APIs
    updateMasteryAsync,
    scheduleReviewAsync,
    batchUpdateAsync,

    // Status
    isWorkerSupported,
    isWorkerReady,
    isUsingWorker: isWorkerSupported && isWorkerReady,
  };
}

// ============================================
// EXPORTS
// ============================================

export type UseSplitBrainReturn = ReturnType<typeof useSplitBrain>;
