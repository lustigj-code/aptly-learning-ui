/**
 * FSRS Algorithm Tests
 * Phase 7.1: Spaced Repetition Algorithm Testing
 */

import { describe, it, expect } from 'vitest';
import { createInitialFSRSState, calculateNextState, type ReviewRating } from '../fsrs';

describe('FSRS Algorithm', () => {
  describe('createInitialFSRSState', () => {
    it('creates a new state with correct initial values', () => {
      const state = createInitialFSRSState();

      expect(state).toEqual({
        stability: 0,
        difficulty: 0,
        elapsedDays: 0,
        scheduledDays: 0,
        reps: 0,
        lapses: 0,
        state: 'new',
      });
    });
  });

  describe('calculateNextState for new cards', () => {
    it('transitions from new to learning on first review', () => {
      const initialState = createInitialFSRSState();
      const { nextState, interval } = calculateNextState(initialState, 3 as ReviewRating); // Good

      expect(nextState.state).toBe('learning');
      expect(nextState.reps).toBe(1);
      expect(interval).toBeGreaterThan(0);
    });

    it('assigns shorter interval for Again rating', () => {
      const initialState = createInitialFSRSState();
      const { interval: againInterval } = calculateNextState(initialState, 1 as ReviewRating);
      const { interval: goodInterval } = calculateNextState(initialState, 3 as ReviewRating);

      expect(againInterval).toBeLessThan(goodInterval);
    });

    it('assigns longer interval for Easy rating', () => {
      const initialState = createInitialFSRSState();
      const { interval: goodInterval } = calculateNextState(initialState, 3 as ReviewRating);
      const { interval: easyInterval } = calculateNextState(initialState, 4 as ReviewRating);

      expect(easyInterval).toBeGreaterThan(goodInterval);
    });
  });

  describe('calculateNextState for learning cards', () => {
    const learningState = {
      stability: 1,
      difficulty: 5,
      elapsedDays: 0,
      scheduledDays: 1,
      reps: 1,
      lapses: 0,
      state: 'learning' as const,
    };

    it('increases interval on successful reviews', () => {
      const { interval: firstInterval } = calculateNextState(learningState, 3 as ReviewRating);
      const secondState = calculateNextState(learningState, 3 as ReviewRating).nextState;
      const { interval: secondInterval } = calculateNextState(secondState, 3 as ReviewRating);

      expect(secondInterval).toBeGreaterThan(firstInterval);
    });

    it('increases reps count', () => {
      const { nextState } = calculateNextState(learningState, 3 as ReviewRating);

      expect(nextState.reps).toBeGreaterThan(learningState.reps);
    });

    it('transitions to review state after sufficient reps', () => {
      let state = learningState;

      // Do several successful reviews
      for (let i = 0; i < 5; i++) {
        state = calculateNextState(state, 3 as ReviewRating).nextState;
      }

      expect(state.state).toBe('review');
    });
  });

  describe('calculateNextState for review cards', () => {
    const reviewState = {
      stability: 10,
      difficulty: 5,
      elapsedDays: 0,
      scheduledDays: 10,
      reps: 10,
      lapses: 0,
      state: 'review' as const,
    };

    it('maintains review state on successful reviews', () => {
      const { nextState } = calculateNextState(reviewState, 3 as ReviewRating);

      expect(nextState.state).toBe('review');
    });

    it('increases interval on Good rating', () => {
      const { interval } = calculateNextState(reviewState, 3 as ReviewRating);

      expect(interval).toBeGreaterThan(reviewState.scheduledDays);
    });

    it('transitions to relearning on Again rating', () => {
      const { nextState } = calculateNextState(reviewState, 1 as ReviewRating);

      expect(nextState.state).toBe('relearning');
      expect(nextState.lapses).toBe(reviewState.lapses + 1);
    });

    it('increases stability with correct answers', () => {
      const { nextState } = calculateNextState(reviewState, 4 as ReviewRating); // Easy

      expect(nextState.stability).toBeGreaterThan(reviewState.stability);
    });

    it('caps interval at maximum allowed', () => {
      const params = {
        requestRetention: 0.9,
        maximumInterval: 30, // 30 days max
        w: Array(17).fill(1), // Dummy weights
      };

      const { interval } = calculateNextState(reviewState, 4 as ReviewRating, params);

      expect(interval).toBeLessThanOrEqual(30);
    });
  });

  describe('Rating impact on difficulty', () => {
    const state = createInitialFSRSState();

    it('increases difficulty on Again rating', () => {
      const { nextState } = calculateNextState(state, 1 as ReviewRating);

      expect(nextState.difficulty).toBeGreaterThan(state.difficulty);
    });

    it('decreases difficulty on Easy rating', () => {
      const learningState = {
        ...state,
        state: 'learning' as const,
        difficulty: 8,
        reps: 2,
      };

      const { nextState } = calculateNextState(learningState, 4 as ReviewRating);

      expect(nextState.difficulty).toBeLessThan(learningState.difficulty);
    });

    it('maintains difficulty on Good rating', () => {
      const learningState = {
        ...state,
        state: 'learning' as const,
        difficulty: 5,
        reps: 2,
      };

      const { nextState } = calculateNextState(learningState, 3 as ReviewRating);

      // Should stay relatively stable
      expect(Math.abs(nextState.difficulty - learningState.difficulty)).toBeLessThan(2);
    });
  });

  describe('Edge cases', () => {
    it('handles very high stability', () => {
      const highStability = {
        stability: 1000,
        difficulty: 5,
        elapsedDays: 0,
        scheduledDays: 365,
        reps: 100,
        lapses: 0,
        state: 'review' as const,
      };

      const { interval } = calculateNextState(highStability, 3 as ReviewRating);

      expect(interval).toBeGreaterThan(0);
      expect(interval).toBeLessThanOrEqual(365); // Capped at max
    });

    it('handles many lapses without crashing', () => {
      const manyLapses = {
        stability: 5,
        difficulty: 8,
        elapsedDays: 0,
        scheduledDays: 5,
        reps: 20,
        lapses: 10,
        state: 'review' as const,
      };

      const { nextState } = calculateNextState(manyLapses, 1 as ReviewRating);

      expect(nextState.lapses).toBe(11);
      expect(nextState.state).toBe('relearning');
    });
  });
});
