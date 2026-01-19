/**
 * Prediction Router Unit Tests
 * Phase 7: Testing Foundation
 *
 * Tests for hybrid prediction routing logic:
 * - Cold-start routing to BKT
 * - Established user routing to hybrid
 * - Feature contribution calculations
 */

import { describe, it, expect } from 'vitest';
import {
  getPrediction,
  updateAndPredict,
  canUseHybrid,
  getDefaultFeatures,
} from '../predictionRouter';
import { type SkillState } from '../bkt';
import { DEFAULT_HYBRID_CONFIG, type InteractionFeatures } from '../hybridTypes';

// ============================================
// TEST HELPERS
// ============================================

function createTestState(
  skillId: string = 'test-skill',
  pMastery: number = 0.5,
  attempts: number = 5
): SkillState {
  return {
    skillId,
    pMastery,
    attempts,
    correctCount: Math.floor(attempts * 0.6),
    lastAttempt: new Date(),
    history: [],
  };
}

function createTestFeatures(
  skillId: string = 'test-skill',
  overrides: Partial<InteractionFeatures> = {}
): InteractionFeatures {
  return {
    skillId,
    questionId: 'q-1',
    isCorrect: true,
    timestamp: new Date(),
    questionDifficulty: 0.5,
    conceptDifficulty: 0.5,
    difficultyDeviation: 0,
    elapsedTimeSinceLastAttempt: 0,
    attemptNumber: 1,
    recentCorrectRate: 0.5,
    ...overrides,
  };
}

// ============================================
// getPrediction TESTS
// ============================================

describe('getPrediction', () => {
  describe('Cold-start routing (< 20 interactions)', () => {
    it('should use BKT model for users with few interactions', () => {
      const state = createTestState('skill-1', 0.5, 5);
      const features = createTestFeatures('skill-1');

      const prediction = getPrediction(state, features);

      expect(prediction.modelUsed).toBe('bkt');
      expect(prediction.features.bktContribution).toBe(1.0);
      expect(prediction.features.temporalContribution).toBe(0);
      expect(prediction.features.difficultyAdjustment).toBe(0);
    });

    it('should use BKT for zero interactions', () => {
      const state = createTestState('skill-1', 0.1, 0);
      const features = createTestFeatures('skill-1');

      const prediction = getPrediction(state, features);

      expect(prediction.modelUsed).toBe('bkt');
      expect(prediction.confidence).toBe(0.5); // Base confidence
    });

    it('should grow confidence with more attempts (BKT mode)', () => {
      const features = createTestFeatures('skill-1');

      const prediction0 = getPrediction(
        createTestState('skill-1', 0.5, 0),
        features
      );
      const prediction5 = getPrediction(
        createTestState('skill-1', 0.5, 5),
        features
      );
      const prediction8 = getPrediction(
        createTestState('skill-1', 0.5, 8),
        features
      );

      // Confidence grows: 0.5 + attempts * 0.05, capped at 0.9
      expect(prediction0.confidence).toBe(0.5);
      expect(prediction5.confidence).toBeGreaterThan(prediction0.confidence);
      expect(prediction8.confidence).toBe(0.9); // Capped at 0.9 (0.5 + 8*0.05 = 0.9)
    });

    it('should return valid pMastery and pCorrectNext', () => {
      const state = createTestState('skill-1', 0.7, 10);
      const features = createTestFeatures('skill-1');

      const prediction = getPrediction(state, features);

      expect(prediction.pMastery).toBeGreaterThanOrEqual(0);
      expect(prediction.pMastery).toBeLessThanOrEqual(1);
      expect(prediction.pCorrectNext).toBeGreaterThanOrEqual(0);
      expect(prediction.pCorrectNext).toBeLessThanOrEqual(1);
    });
  });

  describe('Hybrid routing (>= 20 interactions)', () => {
    it('should use hybrid model for established users', () => {
      const state = createTestState('skill-1', 0.6, 25);
      const features = createTestFeatures('skill-1');

      const prediction = getPrediction(state, features);

      expect(prediction.modelUsed).toBe('hybrid');
    });

    it('should apply difficulty adjustment when enabled', () => {
      const state = createTestState('skill-1', 0.6, 30);
      const hardFeatures = createTestFeatures('skill-1', {
        difficultyDeviation: 0.3, // Harder than average
      });

      const prediction = getPrediction(state, hardFeatures);

      expect(prediction.modelUsed).toBe('hybrid');
      expect(prediction.features.difficultyAdjustment).not.toBe(0);
    });

    it('should apply temporal decay when enabled', () => {
      const state = createTestState('skill-1', 0.7, 30);
      const features = createTestFeatures('skill-1', {
        elapsedTimeSinceLastAttempt: 3600 * 24, // 24 hours
      });

      const prediction = getPrediction(state, features);

      expect(prediction.modelUsed).toBe('hybrid');
      expect(prediction.features.temporalContribution).toBeGreaterThan(0);
    });

    it('should have correct confidence progression', () => {
      const features = createTestFeatures('skill-1');

      // BKT at 10 attempts: 0.5 + 10*0.05 = 1.0, capped at 0.9
      const bktPrediction = getPrediction(
        createTestState('skill-1', 0.5, 10),
        features
      );
      // Hybrid at 30 attempts: 0.7 + (30-20)*0.01 = 0.8
      const hybridPrediction = getPrediction(
        createTestState('skill-1', 0.5, 30),
        features
      );

      expect(bktPrediction.confidence).toBe(0.9); // BKT caps at 0.9
      expect(hybridPrediction.modelUsed).toBe('hybrid');
      expect(hybridPrediction.confidence).toBeCloseTo(0.8, 5); // 0.7 + 10*0.01
    });

    it('should cap confidence at 0.95', () => {
      const state = createTestState('skill-1', 0.9, 100);
      const features = createTestFeatures('skill-1');

      const prediction = getPrediction(state, features);

      expect(prediction.confidence).toBeLessThanOrEqual(0.95);
    });
  });

  describe('Edge cases', () => {
    it('should handle 0% mastery', () => {
      const state = createTestState('skill-1', 0, 25);
      const features = createTestFeatures('skill-1');

      const prediction = getPrediction(state, features);

      expect(prediction.pMastery).toBeGreaterThanOrEqual(0);
      expect(prediction.pCorrectNext).toBeGreaterThan(0); // Guessing probability
    });

    it('should handle 100% mastery', () => {
      const state = createTestState('skill-1', 1, 50);
      const features = createTestFeatures('skill-1');

      const prediction = getPrediction(state, features);

      expect(prediction.pMastery).toBeLessThanOrEqual(1);
      expect(prediction.pCorrectNext).toBeLessThan(1); // Slip probability
    });

    it('should handle extreme difficulty deviation', () => {
      const state = createTestState('skill-1', 0.5, 30);
      const features = createTestFeatures('skill-1', {
        difficultyDeviation: 1.0, // Extremely hard
      });

      const prediction = getPrediction(state, features);

      expect(prediction.pMastery).toBeGreaterThanOrEqual(0);
      expect(prediction.pMastery).toBeLessThanOrEqual(1);
    });

    it('should handle very long time since last attempt', () => {
      const state = createTestState('skill-1', 0.8, 40);
      const features = createTestFeatures('skill-1', {
        elapsedTimeSinceLastAttempt: 3600 * 24 * 30, // 30 days
      });

      const prediction = getPrediction(state, features);

      expect(prediction.pMastery).toBeGreaterThanOrEqual(0);
      expect(prediction.pMastery).toBeLessThanOrEqual(1);
    });

    it('should use exact threshold for routing', () => {
      const features = createTestFeatures('skill-1');

      const at19 = getPrediction(createTestState('skill-1', 0.5, 19), features);
      const at20 = getPrediction(createTestState('skill-1', 0.5, 20), features);

      expect(at19.modelUsed).toBe('bkt');
      expect(at20.modelUsed).toBe('hybrid');
    });
  });

  describe('Custom configuration', () => {
    it('should respect custom minInteractionsForHybrid', () => {
      const state = createTestState('skill-1', 0.5, 15);
      const features = createTestFeatures('skill-1');
      const customConfig = {
        ...DEFAULT_HYBRID_CONFIG,
        minInteractionsForHybrid: 10,
      };

      const prediction = getPrediction(state, features, customConfig);

      expect(prediction.modelUsed).toBe('hybrid');
    });

    it('should respect disabled Rasch adjustment', () => {
      const state = createTestState('skill-1', 0.6, 30);
      const features = createTestFeatures('skill-1', {
        difficultyDeviation: 0.5,
      });
      const configNoRasch = {
        ...DEFAULT_HYBRID_CONFIG,
        useRaschAdjustment: false,
      };

      const prediction = getPrediction(state, features, configNoRasch);

      expect(prediction.features.difficultyAdjustment).toBe(0);
    });

    it('should respect disabled temporal decay', () => {
      const state = createTestState('skill-1', 0.7, 30);
      const features = createTestFeatures('skill-1', {
        elapsedTimeSinceLastAttempt: 3600 * 48,
      });
      const configNoDecay = {
        ...DEFAULT_HYBRID_CONFIG,
        useTemporalDecay: false,
      };

      const prediction = getPrediction(state, features, configNoDecay);

      expect(prediction.features.temporalContribution).toBe(0);
    });
  });
});

// ============================================
// updateAndPredict TESTS
// ============================================

describe('updateAndPredict', () => {
  it('should update state and return prediction', () => {
    const state = createTestState('skill-1', 0.5, 10);
    const features = createTestFeatures('skill-1');

    const { newState, prediction } = updateAndPredict(state, true, features);

    expect(newState.attempts).toBe(state.attempts + 1);
    expect(newState.pMastery).toBeGreaterThan(state.pMastery);
    expect(prediction).toBeDefined();
    expect(prediction.pMastery).toBeDefined();
  });

  it('should increase mastery on correct answer', () => {
    const state = createTestState('skill-1', 0.5, 25);
    const features = createTestFeatures('skill-1');

    const { newState } = updateAndPredict(state, true, features);

    expect(newState.pMastery).toBeGreaterThan(state.pMastery);
    expect(newState.correctCount).toBe(state.correctCount + 1);
  });

  it('should handle incorrect answer', () => {
    const state = createTestState('skill-1', 0.7, 25);
    const features = createTestFeatures('skill-1');

    const { newState } = updateAndPredict(state, false, features);

    expect(newState.attempts).toBe(state.attempts + 1);
    expect(newState.correctCount).toBe(state.correctCount);
  });

  it('should transition from BKT to hybrid after threshold', () => {
    const state = createTestState('skill-1', 0.5, 19);
    const features = createTestFeatures('skill-1');

    const { prediction: before } = updateAndPredict(state, true, features);
    expect(before.modelUsed).toBe('hybrid'); // Now has 20 attempts
  });
});

// ============================================
// canUseHybrid TESTS
// ============================================

describe('canUseHybrid', () => {
  it('should return false for cold-start users', () => {
    expect(canUseHybrid(0)).toBe(false);
    expect(canUseHybrid(10)).toBe(false);
    expect(canUseHybrid(19)).toBe(false);
  });

  it('should return true for established users', () => {
    expect(canUseHybrid(20)).toBe(true);
    expect(canUseHybrid(50)).toBe(true);
    expect(canUseHybrid(100)).toBe(true);
  });

  it('should respect custom configuration', () => {
    const customConfig = {
      ...DEFAULT_HYBRID_CONFIG,
      minInteractionsForHybrid: 30,
    };

    expect(canUseHybrid(25, customConfig)).toBe(false);
    expect(canUseHybrid(30, customConfig)).toBe(true);
  });
});

// ============================================
// getDefaultFeatures TESTS
// ============================================

describe('getDefaultFeatures', () => {
  it('should create features with correct skillId', () => {
    const features = getDefaultFeatures('my-skill');

    expect(features.skillId).toBe('my-skill');
  });

  it('should have sensible defaults', () => {
    const features = getDefaultFeatures('test');

    expect(features.questionDifficulty).toBe(0.5);
    expect(features.conceptDifficulty).toBe(0.5);
    expect(features.difficultyDeviation).toBe(0);
    expect(features.elapsedTimeSinceLastAttempt).toBe(0);
    expect(features.recentCorrectRate).toBe(0.5);
  });

  it('should have empty questionId', () => {
    const features = getDefaultFeatures('test');

    expect(features.questionId).toBe('');
  });

  it('should have a valid timestamp', () => {
    const before = new Date();
    const features = getDefaultFeatures('test');
    const after = new Date();

    expect(features.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(features.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});
