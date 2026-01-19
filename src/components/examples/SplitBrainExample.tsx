'use client';

/**
 * Split-Brain Example Component
 *
 * Demonstrates how to use the split-brain architecture with useSplitBrain hook.
 * This component shows:
 * - BKT mastery updates (async)
 * - FSRS review scheduling (async)
 * - Worker status monitoring
 * - Optimistic UI updates
 *
 * This is a reference implementation - copy patterns to your learning components.
 */

import { useState } from 'react';
import { useSplitBrain } from '@/hooks/useSplitBrain';
import { createInitialState, DEFAULT_BKT_PARAMS, formatMasteryPercent } from '@/lib/mastery/bkt';
import { createInitialFSRSState } from '@/lib/mastery/fsrs';
import type { SkillState } from '@/lib/mastery/bkt';
import type { FSRSState } from '@/lib/mastery/knowledgeGraph';
import type { ReviewRating } from '@/lib/mastery/fsrs';

export function SplitBrainExample() {
  const {
    updateMasteryAsync,
    scheduleReviewAsync,
    isWorkerSupported,
    isWorkerReady,
    isUsingWorker,
  } = useSplitBrain();

  // BKT State
  const [skillState, setSkillState] = useState<SkillState>(
    createInitialState('example-skill', DEFAULT_BKT_PARAMS)
  );
  const [isUpdating, setIsUpdating] = useState(false);

  // FSRS State
  const [fsrsState, setFsrsState] = useState<FSRSState>(createInitialFSRSState());
  const [nextInterval, setNextInterval] = useState<number | null>(null);

  // ============================================
  // BKT HANDLERS
  // ============================================

  const handleAnswer = async (correct: boolean) => {
    setIsUpdating(true);

    // Optimistic update - increment attempts immediately for responsive UI
    setSkillState(prev => ({
      ...prev,
      attempts: prev.attempts + 1,
    }));

    try {
      // Calculate accurate mastery in worker (or main thread fallback)
      const updatedState = await updateMasteryAsync(
        skillState,
        correct,
        DEFAULT_BKT_PARAMS
      );

      // Update with accurate result
      setSkillState(updatedState);
    } catch (error) {
      console.error('Failed to update mastery:', error);
      // Rollback optimistic update on error
      setSkillState(prev => ({
        ...prev,
        attempts: prev.attempts - 1,
      }));
    } finally {
      setIsUpdating(false);
    }
  };

  // ============================================
  // FSRS HANDLERS
  // ============================================

  const handleReview = async (rating: ReviewRating) => {
    try {
      const result = await scheduleReviewAsync(fsrsState, rating);
      setFsrsState(result.nextState);
      setNextInterval(result.interval);
    } catch (error) {
      console.error('Failed to schedule review:', error);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Split-Brain Architecture Demo</h1>
        <p className="mt-2 text-gray-600">
          Demonstrates async mastery calculations using Web Workers
        </p>
      </div>

      {/* Worker Status */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <h2 className="font-semibold text-gray-900">Worker Status</h2>
        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Browser Support:</span>
            <span className={isWorkerSupported ? 'text-green-600' : 'text-red-600'}>
              {isWorkerSupported ? '✓ Supported' : '✗ Not Supported'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Worker Ready:</span>
            <span className={isWorkerReady ? 'text-green-600' : 'text-yellow-600'}>
              {isWorkerReady ? '✓ Ready' : '⏳ Initializing...'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Running On:</span>
            <span className="font-mono text-teal-600">
              {isUsingWorker ? 'Web Worker (SLOW BRAIN)' : 'Main Thread (FAST BRAIN fallback)'}
            </span>
          </div>
        </div>
      </div>

      {/* BKT Demo */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">
          BKT Mastery Tracking
        </h2>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600">Mastery</div>
              <div className="text-2xl font-bold text-teal-600">
                {formatMasteryPercent(skillState.pMastery)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Attempts</div>
              <div className="text-2xl font-bold text-gray-900">
                {skillState.attempts}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Accuracy</div>
              <div className="text-2xl font-bold text-gray-900">
                {skillState.attempts > 0
                  ? Math.round((skillState.correctCount / skillState.attempts) * 100)
                  : 0}%
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleAnswer(true)}
              disabled={isUpdating}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isUpdating ? 'Calculating...' : 'Correct Answer'}
            </button>
            <button
              onClick={() => handleAnswer(false)}
              disabled={isUpdating}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isUpdating ? 'Calculating...' : 'Incorrect Answer'}
            </button>
          </div>

          <div className="text-xs text-gray-500">
            P(L0)={DEFAULT_BKT_PARAMS.pL0}, P(T)={DEFAULT_BKT_PARAMS.pT}, P(G)={DEFAULT_BKT_PARAMS.pG}, P(S)={DEFAULT_BKT_PARAMS.pS}
          </div>
        </div>
      </div>

      {/* FSRS Demo */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">
          FSRS Spaced Repetition
        </h2>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600">State</div>
              <div className="text-lg font-semibold text-gray-900 capitalize">
                {fsrsState.state}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Stability</div>
              <div className="text-lg font-semibold text-gray-900">
                {fsrsState.stability.toFixed(1)} days
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Difficulty</div>
              <div className="text-lg font-semibold text-gray-900">
                {fsrsState.difficulty.toFixed(1)} / 10
              </div>
            </div>
          </div>

          {nextInterval !== null && (
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
              <div className="text-sm text-teal-900">
                <strong>Next review in:</strong> {nextInterval} day{nextInterval !== 1 ? 's' : ''}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleReview(1)}
              className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors"
            >
              Again (1)
            </button>
            <button
              onClick={() => handleReview(2)}
              className="px-4 py-2 bg-orange-100 text-orange-800 rounded-lg hover:bg-orange-200 transition-colors"
            >
              Hard (2)
            </button>
            <button
              onClick={() => handleReview(3)}
              className="px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors"
            >
              Good (3)
            </button>
            <button
              onClick={() => handleReview(4)}
              className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors"
            >
              Easy (4)
            </button>
          </div>

          <div className="text-xs text-gray-500">
            Reps: {fsrsState.reps}, Lapses: {fsrsState.lapses}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
        <strong>How it works:</strong> Calculations run asynchronously in a Web Worker
        (SLOW BRAIN) to keep the UI responsive. If Workers aren&apos;t supported, calculations
        fall back to the main thread. The UI updates optimistically for instant feedback.
      </div>
    </div>
  );
}
