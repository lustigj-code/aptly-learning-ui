/**
 * Hybrid Types Unit Tests
 * Phase 7: Testing Foundation
 *
 * Tests for hybrid model utility functions:
 * - calculateBlendWeight for cold-start transitions
 * - routePrediction for model routing decisions
 * - evaluateShadowMode for A/B test evaluation
 */

import { describe, it, expect } from 'vitest';
import {
  calculateBlendWeight,
  routePrediction,
  evaluateShadowMode,
  DEFAULT_COLD_START_CONFIG,
  PROMOTION_CRITERIA,
  type ColdStartBlendConfig,
  type ShadowModeMetrics,
} from '../hybridTypes';

// ============================================
// calculateBlendWeight TESTS
// ============================================

describe('calculateBlendWeight', () => {
  describe('Default configuration (20-50 threshold)', () => {
    it('should return 0 for cold-start users (< 20 interactions)', () => {
      expect(calculateBlendWeight(0)).toBe(0);
      expect(calculateBlendWeight(10)).toBe(0);
      expect(calculateBlendWeight(19)).toBe(0);
    });

    it('should return 1 for fully warmed-up users (>= 50 interactions)', () => {
      expect(calculateBlendWeight(50)).toBe(1);
      expect(calculateBlendWeight(100)).toBe(1);
      expect(calculateBlendWeight(1000)).toBe(1);
    });

    it('should return intermediate values during transition (20-49)', () => {
      const weight25 = calculateBlendWeight(25);
      const weight35 = calculateBlendWeight(35);
      const weight45 = calculateBlendWeight(45);

      expect(weight25).toBeGreaterThan(0);
      expect(weight25).toBeLessThan(1);
      expect(weight35).toBeGreaterThan(weight25);
      expect(weight45).toBeGreaterThan(weight35);
    });

    it('should return exactly 0 at threshold boundary', () => {
      expect(calculateBlendWeight(20)).toBe(0);
    });

    it('should return linear progression with default config', () => {
      // Default is linear, so 35 should be ~50% through transition
      const weight35 = calculateBlendWeight(35);
      expect(weight35).toBeCloseTo(0.5, 1);
    });
  });

  describe('Sigmoid blend curve', () => {
    const sigmoidConfig: ColdStartBlendConfig = {
      coldStartThreshold: 20,
      warmUpEndThreshold: 50,
      blendCurve: 'sigmoid',
    };

    it('should return 0 below threshold', () => {
      expect(calculateBlendWeight(15, sigmoidConfig)).toBe(0);
    });

    it('should return 1 above warm-up', () => {
      expect(calculateBlendWeight(60, sigmoidConfig)).toBe(1);
    });

    it('should be approximately 0.5 at midpoint', () => {
      const midpoint = calculateBlendWeight(35, sigmoidConfig);
      expect(midpoint).toBeCloseTo(0.5, 1);
    });

    it('should have S-curve shape (slower at extremes)', () => {
      const early = calculateBlendWeight(22, sigmoidConfig);
      const late = calculateBlendWeight(48, sigmoidConfig);

      // Sigmoid should be closer to 0 early and closer to 1 late
      expect(early).toBeLessThan(0.2);
      expect(late).toBeGreaterThan(0.8);
    });
  });

  describe('Custom configuration', () => {
    it('should respect custom thresholds', () => {
      const customConfig: ColdStartBlendConfig = {
        coldStartThreshold: 10,
        warmUpEndThreshold: 30,
        blendCurve: 'linear',
      };

      expect(calculateBlendWeight(5, customConfig)).toBe(0);
      expect(calculateBlendWeight(10, customConfig)).toBe(0);
      expect(calculateBlendWeight(20, customConfig)).toBeCloseTo(0.5, 1);
      expect(calculateBlendWeight(30, customConfig)).toBe(1);
    });

    it('should handle narrow transition range', () => {
      const narrowConfig: ColdStartBlendConfig = {
        coldStartThreshold: 20,
        warmUpEndThreshold: 25,
        blendCurve: 'linear',
      };

      expect(calculateBlendWeight(20, narrowConfig)).toBe(0);
      expect(calculateBlendWeight(22, narrowConfig)).toBeCloseTo(0.4, 1);
      expect(calculateBlendWeight(25, narrowConfig)).toBe(1);
    });
  });
});

// ============================================
// routePrediction TESTS
// ============================================

describe('routePrediction', () => {
  describe('Model routing decisions', () => {
    it('should route to BKT for cold-start users', () => {
      const decision = routePrediction(10);

      expect(decision.model).toBe('bkt');
      expect(decision.bktWeight).toBe(1);
      expect(decision.hybridWeight).toBe(0);
      expect(decision.reason).toContain('Cold start');
    });

    it('should route to hybrid for fully warmed-up users', () => {
      const decision = routePrediction(60);

      expect(decision.model).toBe('hybrid');
      expect(decision.bktWeight).toBe(0);
      expect(decision.hybridWeight).toBe(1);
      expect(decision.reason).toContain('Full hybrid');
    });

    it('should route to blend during transition', () => {
      const decision = routePrediction(35);

      expect(decision.model).toBe('blend');
      expect(decision.bktWeight).toBeGreaterThan(0);
      expect(decision.bktWeight).toBeLessThan(1);
      expect(decision.hybridWeight).toBeGreaterThan(0);
      expect(decision.hybridWeight).toBeLessThan(1);
      expect(decision.reason).toContain('Blending');
    });

    it('should have weights that sum to 1 during blend', () => {
      const decision = routePrediction(35);

      expect(decision.bktWeight + decision.hybridWeight).toBeCloseTo(1, 5);
    });
  });

  describe('Threshold boundary behavior', () => {
    it('should use BKT at exactly cold-start threshold', () => {
      const decision = routePrediction(20);

      expect(decision.model).toBe('bkt');
    });

    it('should use hybrid at exactly warm-up threshold', () => {
      const decision = routePrediction(50);

      expect(decision.model).toBe('hybrid');
    });

    it('should blend at one interaction above cold-start', () => {
      const decision = routePrediction(21);

      expect(decision.model).toBe('blend');
    });
  });

  describe('Custom configuration', () => {
    it('should respect custom thresholds', () => {
      const customConfig: ColdStartBlendConfig = {
        coldStartThreshold: 5,
        warmUpEndThreshold: 15,
        blendCurve: 'linear',
      };

      expect(routePrediction(3, customConfig).model).toBe('bkt');
      expect(routePrediction(10, customConfig).model).toBe('blend');
      expect(routePrediction(20, customConfig).model).toBe('hybrid');
    });
  });

  describe('Reason strings', () => {
    it('should include interaction count in reason', () => {
      const decision = routePrediction(25);

      expect(decision.reason).toContain('25');
    });

    it('should include percentage in blend reason', () => {
      const decision = routePrediction(35);

      expect(decision.reason).toMatch(/\d+%/);
    });
  });
});

// ============================================
// evaluateShadowMode TESTS
// ============================================

describe('evaluateShadowMode', () => {
  function createMetrics(overrides: Partial<ShadowModeMetrics> = {}): ShadowModeMetrics {
    return {
      bktPredictions: [],
      hybridPredictions: [],
      actualOutcomes: new Array(PROMOTION_CRITERIA.minSampleSize).fill(true),
      bktAUC: 0.75,
      hybridAUC: 0.80, // 5% improvement
      bktBrier: 0.15,
      hybridBrier: 0.14, // Better calibration
      shouldPromoteHybrid: false,
      ...overrides,
    };
  }

  describe('Sample size requirement', () => {
    it('should reject with insufficient samples', () => {
      const metrics = createMetrics({
        actualOutcomes: new Array(500).fill(true), // Less than 1000
      });

      expect(evaluateShadowMode(metrics)).toBe(false);
    });

    it('should accept with sufficient samples', () => {
      const metrics = createMetrics();

      expect(evaluateShadowMode(metrics)).toBe(true);
    });

    it('should accept with exactly minimum samples', () => {
      const metrics = createMetrics({
        actualOutcomes: new Array(PROMOTION_CRITERIA.minSampleSize).fill(true),
      });

      expect(evaluateShadowMode(metrics)).toBe(true);
    });
  });

  describe('AUC improvement requirement', () => {
    it('should reject if AUC improvement is insufficient', () => {
      const metrics = createMetrics({
        bktAUC: 0.75,
        hybridAUC: 0.76, // Only 1% improvement
      });

      expect(evaluateShadowMode(metrics)).toBe(false);
    });

    it('should accept if AUC improvement meets threshold', () => {
      const metrics = createMetrics({
        bktAUC: 0.75,
        hybridAUC: 0.77, // 2% improvement
      });

      expect(evaluateShadowMode(metrics)).toBe(true);
    });

    it('should reject if hybrid AUC is worse', () => {
      const metrics = createMetrics({
        bktAUC: 0.80,
        hybridAUC: 0.75, // Worse
      });

      expect(evaluateShadowMode(metrics)).toBe(false);
    });
  });

  describe('Calibration (Brier) requirement', () => {
    it('should reject if calibration degrades too much', () => {
      const metrics = createMetrics({
        bktBrier: 0.10,
        hybridBrier: 0.15, // 5% worse
      });

      expect(evaluateShadowMode(metrics)).toBe(false);
    });

    it('should accept if calibration improves', () => {
      const metrics = createMetrics({
        bktBrier: 0.15,
        hybridBrier: 0.12, // Better
      });

      expect(evaluateShadowMode(metrics)).toBe(true);
    });

    it('should accept if calibration stays within threshold', () => {
      const metrics = createMetrics({
        bktBrier: 0.10,
        hybridBrier: 0.105, // Slight degradation within tolerance
      });

      expect(evaluateShadowMode(metrics)).toBe(true);
    });
  });

  describe('Combined criteria', () => {
    it('should require all criteria to pass', () => {
      // Good AUC but bad calibration
      const metrics1 = createMetrics({
        hybridAUC: 0.85,
        bktAUC: 0.75,
        hybridBrier: 0.20,
        bktBrier: 0.10,
      });
      expect(evaluateShadowMode(metrics1)).toBe(false);

      // Good calibration but bad AUC
      const metrics2 = createMetrics({
        hybridAUC: 0.76,
        bktAUC: 0.75,
        hybridBrier: 0.10,
        bktBrier: 0.12,
      });
      expect(evaluateShadowMode(metrics2)).toBe(false);
    });

    it('should pass when all criteria are met', () => {
      const metrics = createMetrics({
        actualOutcomes: new Array(2000).fill(true),
        hybridAUC: 0.82,
        bktAUC: 0.75,
        hybridBrier: 0.12,
        bktBrier: 0.13,
      });

      expect(evaluateShadowMode(metrics)).toBe(true);
    });
  });
});

// ============================================
// CONSTANTS TESTS
// ============================================

describe('Configuration constants', () => {
  describe('DEFAULT_COLD_START_CONFIG', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_COLD_START_CONFIG.coldStartThreshold).toBe(20);
      expect(DEFAULT_COLD_START_CONFIG.warmUpEndThreshold).toBe(50);
      expect(DEFAULT_COLD_START_CONFIG.blendCurve).toBe('linear');
    });

    it('should have valid threshold range', () => {
      expect(DEFAULT_COLD_START_CONFIG.warmUpEndThreshold).toBeGreaterThan(
        DEFAULT_COLD_START_CONFIG.coldStartThreshold
      );
    });
  });

  describe('PROMOTION_CRITERIA', () => {
    it('should have reasonable thresholds', () => {
      expect(PROMOTION_CRITERIA.minAUCImprovement).toBe(0.02);
      expect(PROMOTION_CRITERIA.maxBrierIncrease).toBe(0.01);
      expect(PROMOTION_CRITERIA.minSampleSize).toBe(1000);
      expect(PROMOTION_CRITERIA.minDurationDays).toBe(7);
      expect(PROMOTION_CRITERIA.pValueThreshold).toBe(0.05);
    });

    it('should have positive thresholds', () => {
      expect(PROMOTION_CRITERIA.minAUCImprovement).toBeGreaterThan(0);
      expect(PROMOTION_CRITERIA.maxBrierIncrease).toBeGreaterThan(0);
      expect(PROMOTION_CRITERIA.minSampleSize).toBeGreaterThan(0);
    });
  });
});
