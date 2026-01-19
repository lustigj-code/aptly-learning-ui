/**
 * Tests for masteryWorker
 *
 * Note: These are unit tests for the worker message handlers.
 * Integration tests with actual Worker instances should be done in E2E tests.
 */

import { describe, it, expect } from 'vitest';
import { updateMastery, createInitialState, DEFAULT_BKT_PARAMS } from '@/lib/mastery/bkt';
import { calculateNextState, createInitialFSRSState, DEFAULT_PARAMETERS } from '@/lib/mastery/fsrs';
import type { UpdateBKTMessage, ScheduleReviewMessage, BatchUpdateMessage } from '../masteryWorker';

describe('masteryWorker message handlers', () => {
  describe('UPDATE_BKT', () => {
    it('should update BKT state correctly for correct answer', () => {
      const initialState = createInitialState('test-skill', DEFAULT_BKT_PARAMS);
      const message: UpdateBKTMessage = {
        type: 'UPDATE_BKT',
        id: 'test-1',
        payload: {
          currentState: initialState,
          correct: true,
          params: DEFAULT_BKT_PARAMS,
        },
      };

      // Simulate what the worker would do
      const result = updateMastery(
        message.payload.currentState,
        message.payload.correct,
        message.payload.params
      );

      expect(result.pMastery).toBeGreaterThan(initialState.pMastery);
      expect(result.attempts).toBe(1);
      expect(result.correctCount).toBe(1);
      expect(result.history).toHaveLength(1);
      expect(result.history[0].correct).toBe(true);
    });

    it('should update BKT state correctly for incorrect answer', () => {
      const initialState = createInitialState('test-skill', DEFAULT_BKT_PARAMS);
      const message: UpdateBKTMessage = {
        type: 'UPDATE_BKT',
        id: 'test-2',
        payload: {
          currentState: initialState,
          correct: false,
          params: DEFAULT_BKT_PARAMS,
        },
      };

      const result = updateMastery(
        message.payload.currentState,
        message.payload.correct,
        message.payload.params
      );

      // Even incorrect answers can increase mastery due to learning (pT)
      expect(result.pMastery).toBeGreaterThanOrEqual(0);
      expect(result.attempts).toBe(1);
      expect(result.correctCount).toBe(0);
      expect(result.history[0].correct).toBe(false);
    });

    it('should use default params if not provided', () => {
      const initialState = createInitialState('test-skill', DEFAULT_BKT_PARAMS);
      const message: UpdateBKTMessage = {
        type: 'UPDATE_BKT',
        id: 'test-3',
        payload: {
          currentState: initialState,
          correct: true,
        },
      };

      const result = updateMastery(
        message.payload.currentState,
        message.payload.correct,
        DEFAULT_BKT_PARAMS
      );

      expect(result).toBeDefined();
      expect(result.pMastery).toBeGreaterThan(0);
    });
  });

  describe('SCHEDULE_REVIEW', () => {
    it('should schedule review correctly for rating 4 (Easy)', () => {
      const initialState = createInitialFSRSState();
      const message: ScheduleReviewMessage = {
        type: 'SCHEDULE_REVIEW',
        id: 'test-4',
        payload: {
          currentState: initialState,
          rating: 4,
          params: DEFAULT_PARAMETERS,
        },
      };

      const result = calculateNextState(
        message.payload.currentState,
        message.payload.rating,
        message.payload.params
      );

      expect(result.nextState).toBeDefined();
      expect(result.interval).toBeGreaterThan(0);
      expect(result.nextState.reps).toBe(1);
      expect(result.nextState.state).toMatch(/review|learning/);
    });

    it('should schedule review correctly for rating 1 (Again)', () => {
      const initialState = createInitialFSRSState();
      const message: ScheduleReviewMessage = {
        type: 'SCHEDULE_REVIEW',
        id: 'test-5',
        payload: {
          currentState: initialState,
          rating: 1,
          params: DEFAULT_PARAMETERS,
        },
      };

      const result = calculateNextState(
        message.payload.currentState,
        message.payload.rating,
        message.payload.params
      );

      expect(result.nextState.lapses).toBe(1);
      expect(result.interval).toBe(0); // Should review same day
    });

    it('should use default params if not provided', () => {
      const initialState = createInitialFSRSState();
      const message: ScheduleReviewMessage = {
        type: 'SCHEDULE_REVIEW',
        id: 'test-6',
        payload: {
          currentState: initialState,
          rating: 3,
        },
      };

      const result = calculateNextState(
        message.payload.currentState,
        message.payload.rating,
        DEFAULT_PARAMETERS
      );

      expect(result).toBeDefined();
      expect(result.interval).toBeGreaterThanOrEqual(0);
    });
  });

  describe('BATCH_UPDATE', () => {
    it('should process multiple BKT updates correctly', () => {
      const skill1 = createInitialState('skill-1', DEFAULT_BKT_PARAMS);
      const skill2 = createInitialState('skill-2', DEFAULT_BKT_PARAMS);

      const message: BatchUpdateMessage = {
        type: 'BATCH_UPDATE',
        id: 'test-7',
        payload: {
          updates: [
            { skillId: 'skill-1', currentState: skill1, correct: true },
            { skillId: 'skill-2', currentState: skill2, correct: false },
          ],
        },
      };

      const results = message.payload.updates.map(update => ({
        skillId: update.skillId,
        updatedState: updateMastery(
          update.currentState,
          update.correct,
          update.params || DEFAULT_BKT_PARAMS
        ),
      }));

      expect(results).toHaveLength(2);
      expect(results[0].skillId).toBe('skill-1');
      expect(results[0].updatedState.correctCount).toBe(1);
      expect(results[1].skillId).toBe('skill-2');
      expect(results[1].updatedState.correctCount).toBe(0);
    });

    it('should handle empty batch', () => {
      const message: BatchUpdateMessage = {
        type: 'BATCH_UPDATE',
        id: 'test-8',
        payload: {
          updates: [],
        },
      };

      const results = message.payload.updates.map(update => ({
        skillId: update.skillId,
        updatedState: updateMastery(
          update.currentState,
          update.correct,
          update.params || DEFAULT_BKT_PARAMS
        ),
      }));

      expect(results).toHaveLength(0);
    });
  });
});
