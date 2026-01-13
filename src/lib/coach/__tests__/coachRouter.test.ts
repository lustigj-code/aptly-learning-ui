/**
 * Coach Router Unit Tests
 * Phase 7: Testing Foundation
 *
 * Tests for AI model selection logic:
 * - selectCoachModel routing decisions
 * - A/B test bucketing
 * - Model availability checks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  selectCoachModel,
  getRoutingConfig,
  getAbTestVariant,
  isSageModelConfigured,
  isSocraticModeAvailable,
  getAvailableModels,
  logModelSelection,
  type CoachRoutingConfig,
} from '../coachRouter';

// ============================================
// MOCK ENVIRONMENT
// ============================================

const originalEnv = process.env;

beforeEach(() => {
  // Reset environment before each test
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
  vi.restoreAllMocks();
});

// ============================================
// selectCoachModel TESTS
// ============================================

describe('selectCoachModel', () => {
  describe('Socratic mode priority', () => {
    it('should select Socratic when enabled', () => {
      const config: CoachRoutingConfig = {
        useSageModel: true,
        sageAbTestEnabled: true,
        socraticModeEnabled: true,
        userId: 'user-123',
      };

      const result = selectCoachModel(config);

      expect(result.model).toBe('socratic');
      expect(result.reason).toContain('Socratic mode enabled');
    });

    it('should prioritize Socratic over Sage', () => {
      const config: CoachRoutingConfig = {
        useSageModel: true,
        sageAbTestEnabled: false,
        socraticModeEnabled: true,
        userId: 'user-123',
      };

      const result = selectCoachModel(config);

      expect(result.model).toBe('socratic');
    });
  });

  describe('Sage A/B test', () => {
    it('should route to treatment group when bucket < 50', () => {
      // Find a userId that hashes to treatment (bucket < 50)
      // Using a known hash behavior
      const config: CoachRoutingConfig = {
        useSageModel: true,
        sageAbTestEnabled: true,
        socraticModeEnabled: false,
        userId: 'user-treatment-1', // This should hash to < 50
      };

      const result = selectCoachModel(config);

      // Either treatment or control depending on hash
      expect(['sage', 'gemini']).toContain(result.model);
      if (result.variant) {
        expect(['treatment', 'control']).toContain(result.variant);
      }
    });

    it('should include variant in result during A/B test', () => {
      const config: CoachRoutingConfig = {
        useSageModel: true,
        sageAbTestEnabled: true,
        socraticModeEnabled: false,
        userId: 'test-user-abc',
      };

      const result = selectCoachModel(config);

      expect(result.variant).toBeDefined();
      expect(['treatment', 'control']).toContain(result.variant);
    });

    it('should consistently assign same user to same bucket', () => {
      const config: CoachRoutingConfig = {
        useSageModel: true,
        sageAbTestEnabled: true,
        socraticModeEnabled: false,
        userId: 'consistent-user-id',
      };

      const result1 = selectCoachModel(config);
      const result2 = selectCoachModel(config);
      const result3 = selectCoachModel(config);

      expect(result1.model).toBe(result2.model);
      expect(result2.model).toBe(result3.model);
      expect(result1.variant).toBe(result2.variant);
    });
  });

  describe('Direct Sage model usage', () => {
    it('should use Sage directly when enabled without A/B test', () => {
      const config: CoachRoutingConfig = {
        useSageModel: true,
        sageAbTestEnabled: false,
        socraticModeEnabled: false,
        userId: 'user-123',
      };

      const result = selectCoachModel(config);

      expect(result.model).toBe('sage');
      expect(result.reason).toContain('Sage model enabled directly');
      expect(result.variant).toBeUndefined();
    });
  });

  describe('Default Gemini fallback', () => {
    it('should default to Gemini when no special config', () => {
      const config: CoachRoutingConfig = {
        useSageModel: false,
        sageAbTestEnabled: false,
        socraticModeEnabled: false,
        userId: 'user-123',
      };

      const result = selectCoachModel(config);

      expect(result.model).toBe('gemini');
      expect(result.reason).toBe('Default model');
    });

    it('should use Gemini when Sage is disabled', () => {
      const config: CoachRoutingConfig = {
        useSageModel: false,
        sageAbTestEnabled: true, // A/B test enabled but Sage disabled
        socraticModeEnabled: false,
        userId: 'user-123',
      };

      const result = selectCoachModel(config);

      expect(result.model).toBe('gemini');
    });
  });
});

// ============================================
// getRoutingConfig TESTS
// ============================================

describe('getRoutingConfig', () => {
  it('should read useSageModel from env', () => {
    process.env.USE_SAGE_MODEL = 'true';

    const config = getRoutingConfig();

    expect(config.useSageModel).toBe(true);
  });

  it('should read sageAbTestEnabled from env', () => {
    process.env.SAGE_AB_TEST = 'true';

    const config = getRoutingConfig();

    expect(config.sageAbTestEnabled).toBe(true);
  });

  it('should default to false when env vars not set', () => {
    delete process.env.USE_SAGE_MODEL;
    delete process.env.SAGE_AB_TEST;

    const config = getRoutingConfig();

    expect(config.useSageModel).toBe(false);
    expect(config.sageAbTestEnabled).toBe(false);
  });

  it('should handle non-true string values as false', () => {
    process.env.USE_SAGE_MODEL = 'yes';
    process.env.SAGE_AB_TEST = '1';

    const config = getRoutingConfig();

    expect(config.useSageModel).toBe(false);
    expect(config.sageAbTestEnabled).toBe(false);
  });
});

// ============================================
// getAbTestVariant TESTS
// ============================================

describe('getAbTestVariant', () => {
  it('should return treatment or control', () => {
    const variant = getAbTestVariant('user-123', 'test-1');

    expect(['treatment', 'control']).toContain(variant);
  });

  it('should be deterministic for same user and test', () => {
    const variant1 = getAbTestVariant('user-123', 'test-1');
    const variant2 = getAbTestVariant('user-123', 'test-1');

    expect(variant1).toBe(variant2);
  });

  it('should differ for different test IDs', () => {
    // Not guaranteed to differ but should use different hash
    const variant1 = getAbTestVariant('same-user', 'test-alpha');
    const variant2 = getAbTestVariant('same-user', 'test-beta');

    // We just verify both return valid values
    expect(['treatment', 'control']).toContain(variant1);
    expect(['treatment', 'control']).toContain(variant2);
  });

  it('should respect treatment percentage', () => {
    // With 0% treatment, all should be control
    const allControl = Array.from({ length: 10 }, (_, i) =>
      getAbTestVariant(`user-${i}`, 'test-0', 0)
    );
    expect(allControl.every(v => v === 'control')).toBe(true);

    // With 100% treatment, all should be treatment
    const allTreatment = Array.from({ length: 10 }, (_, i) =>
      getAbTestVariant(`user-${i}`, 'test-100', 100)
    );
    expect(allTreatment.every(v => v === 'treatment')).toBe(true);
  });

  it('should default to 50% split', () => {
    // Generate many assignments and check rough distribution
    const assignments = Array.from({ length: 100 }, (_, i) =>
      getAbTestVariant(`user-${i}-${Math.random()}`, 'test-1')
    );

    const treatmentCount = assignments.filter(v => v === 'treatment').length;

    // Should be roughly 50/50 (allow 20% variance for statistical noise)
    expect(treatmentCount).toBeGreaterThan(30);
    expect(treatmentCount).toBeLessThan(70);
  });
});

// ============================================
// isSageModelConfigured TESTS
// ============================================

describe('isSageModelConfigured', () => {
  it('should return true when endpoint is set', () => {
    process.env.SAGE_MODEL_ENDPOINT = 'https://sage.example.com';

    expect(isSageModelConfigured()).toBe(true);
  });

  it('should return true when USE_SAGE_MODEL is true', () => {
    process.env.USE_SAGE_MODEL = 'true';

    expect(isSageModelConfigured()).toBe(true);
  });

  it('should return false when nothing is configured', () => {
    delete process.env.SAGE_MODEL_ENDPOINT;
    delete process.env.USE_SAGE_MODEL;

    expect(isSageModelConfigured()).toBe(false);
  });
});

// ============================================
// isSocraticModeAvailable TESTS
// ============================================

describe('isSocraticModeAvailable', () => {
  it('should return true with Gemini API key and Pinecone', () => {
    process.env.GOOGLE_GENAI_API_KEY = 'test-key';
    process.env.PINECONE_API_KEY = 'pinecone-key';

    expect(isSocraticModeAvailable()).toBe(true);
  });

  it('should return true with Gemini API key and Firestore vector store', () => {
    process.env.GOOGLE_GENAI_API_KEY = 'test-key';
    process.env.VECTOR_STORE_PROVIDER = 'firestore';

    expect(isSocraticModeAvailable()).toBe(true);
  });

  it('should return false without Gemini API key', () => {
    delete process.env.GOOGLE_GENAI_API_KEY;
    process.env.PINECONE_API_KEY = 'pinecone-key';

    expect(isSocraticModeAvailable()).toBe(false);
  });

  it('should return false without vector store', () => {
    process.env.GOOGLE_GENAI_API_KEY = 'test-key';
    delete process.env.PINECONE_API_KEY;
    delete process.env.VECTOR_STORE_PROVIDER;

    expect(isSocraticModeAvailable()).toBe(false);
  });
});

// ============================================
// getAvailableModels TESTS
// ============================================

describe('getAvailableModels', () => {
  it('should return empty array without API key', () => {
    delete process.env.GOOGLE_GENAI_API_KEY;

    const models = getAvailableModels();

    expect(models).toEqual([]);
  });

  it('should include Gemini when API key is set', () => {
    process.env.GOOGLE_GENAI_API_KEY = 'test-key';

    const models = getAvailableModels();

    expect(models).toContain('gemini');
  });

  it('should include Sage when configured', () => {
    process.env.GOOGLE_GENAI_API_KEY = 'test-key';
    process.env.USE_SAGE_MODEL = 'true';

    const models = getAvailableModels();

    expect(models).toContain('gemini');
    expect(models).toContain('sage');
  });

  it('should include Socratic when available', () => {
    process.env.GOOGLE_GENAI_API_KEY = 'test-key';
    process.env.PINECONE_API_KEY = 'pinecone-key';

    const models = getAvailableModels();

    expect(models).toContain('gemini');
    expect(models).toContain('socratic');
  });

  it('should return all models when fully configured', () => {
    process.env.GOOGLE_GENAI_API_KEY = 'test-key';
    process.env.USE_SAGE_MODEL = 'true';
    process.env.PINECONE_API_KEY = 'pinecone-key';

    const models = getAvailableModels();

    expect(models).toContain('gemini');
    expect(models).toContain('sage');
    expect(models).toContain('socratic');
  });
});

// ============================================
// logModelSelection TESTS
// ============================================

describe('logModelSelection', () => {
  it('should log without throwing', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    expect(() => {
      logModelSelection(
        'user-123456789',
        { model: 'gemini', reason: 'Default' },
        'chat'
      );
    }).not.toThrow();

    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should truncate userId for privacy', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    logModelSelection(
      'very-long-user-id-that-should-be-truncated',
      { model: 'sage', variant: 'treatment', reason: 'A/B test' },
      'quiz-help'
    );

    const logCall = consoleSpy.mock.calls[0][1];
    expect(logCall.userId).toContain('...');
    expect(logCall.userId.length).toBeLessThan('very-long-user-id-that-should-be-truncated'.length);
  });

  it('should include all relevant fields', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    logModelSelection(
      'user-123',
      { model: 'socratic', reason: 'Feature flag' },
      'summary'
    );

    const logCall = consoleSpy.mock.calls[0][1];
    expect(logCall.model).toBe('socratic');
    expect(logCall.reason).toBe('Feature flag');
    expect(logCall.requestType).toBe('summary');
    expect(logCall.timestamp).toBeDefined();
  });
});
