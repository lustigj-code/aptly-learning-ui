/**
 * Prediction Fallback Service
 *
 * Handles prediction failures gracefully by falling back from hybrid to BKT.
 * Ensures users always get a prediction, even if the ML model fails.
 *
 * Part of Phase 15.3: ML Model Full Integration
 */

import { getHybridModel, type HybridLearnerModel } from './hybridModel';
import type { HybridPrediction } from './hybridModelTypes';
import { getColdStartState, type ColdStartConfig, DEFAULT_COLD_START_CONFIG } from './coldStart';
import { DEFAULT_BKT_PARAMS, predictCorrect } from '@/lib/mastery/bkt';
import type { InteractionLog } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

export interface FallbackPrediction {
  /** The prediction result */
  prediction: HybridPrediction;
  /** Source of the prediction */
  source: 'hybrid' | 'bkt_fallback' | 'default_fallback';
  /** Whether a fallback was used */
  usedFallback: boolean;
  /** Reason for fallback (if any) */
  fallbackReason?: string;
  /** Time taken to get prediction (ms) */
  computeTimeMs: number;
}

export interface FallbackConfig {
  /** Timeout for hybrid prediction (ms) */
  hybridTimeoutMs: number;
  /** Whether to log fallback events */
  logFallbacks: boolean;
  /** Cold-start configuration */
  coldStart: ColdStartConfig;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

export const DEFAULT_FALLBACK_CONFIG: FallbackConfig = {
  hybridTimeoutMs: 5000,
  logFallbacks: true,
  coldStart: DEFAULT_COLD_START_CONFIG,
};

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Get prediction with automatic fallback
 *
 * Tries hybrid model first, falls back to BKT if:
 * - Hybrid prediction fails or times out
 * - Result is invalid (NaN, out of range)
 * - User is in cold-start phase
 *
 * @param userId - User identifier
 * @param skillId - Skill identifier
 * @param interactions - User's interaction history (optional)
 * @param config - Fallback configuration
 * @returns Prediction with fallback metadata
 */
export async function getPredictionWithFallback(
  userId: string,
  skillId: string,
  interactions?: InteractionLog[],
  config: FallbackConfig = DEFAULT_FALLBACK_CONFIG
): Promise<FallbackPrediction> {
  const startTime = Date.now();

  // Check cold-start status
  const interactionCount = interactions?.length ?? 0;
  const coldStartState = getColdStartState(userId, interactionCount, config.coldStart);

  // If in pure cold-start, skip hybrid and use BKT directly
  if (coldStartState.phase === 'cold_start') {
    const bktPrediction = createBKTFallbackPrediction(skillId, interactionCount);
    return {
      prediction: bktPrediction,
      source: 'bkt_fallback',
      usedFallback: false, // Not a fallback - this is expected behavior
      fallbackReason: `Cold start: ${coldStartState.phaseDescription}`,
      computeTimeMs: Date.now() - startTime,
    };
  }

  // Try hybrid prediction with timeout
  try {
    const hybridPrediction = await getHybridPredictionWithTimeout(
      userId,
      skillId,
      interactions,
      config.hybridTimeoutMs
    );

    // Validate prediction
    if (!isValidPrediction(hybridPrediction)) {
      if (config.logFallbacks) {
        console.warn('[PredictionFallback] Invalid hybrid prediction, falling back to BKT', {
          userId,
          skillId,
          prediction: hybridPrediction,
        });
      }

      const bktPrediction = createBKTFallbackPrediction(skillId, interactionCount);
      return {
        prediction: bktPrediction,
        source: 'bkt_fallback',
        usedFallback: true,
        fallbackReason: 'Invalid hybrid prediction values',
        computeTimeMs: Date.now() - startTime,
      };
    }

    return {
      prediction: hybridPrediction,
      source: 'hybrid',
      usedFallback: false,
      computeTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    if (config.logFallbacks) {
      console.error('[PredictionFallback] Hybrid prediction failed, falling back to BKT', {
        userId,
        skillId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    const bktPrediction = createBKTFallbackPrediction(skillId, interactionCount);
    return {
      prediction: bktPrediction,
      source: 'bkt_fallback',
      usedFallback: true,
      fallbackReason: error instanceof Error ? error.message : 'Hybrid prediction failed',
      computeTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Get hybrid prediction with timeout
 */
async function getHybridPredictionWithTimeout(
  userId: string,
  skillId: string,
  interactions: InteractionLog[] | undefined,
  timeoutMs: number
): Promise<HybridPrediction> {
  const model = getHybridModel();

  const predictionPromise = model.predict(userId, skillId, interactions);

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Prediction timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  return Promise.race([predictionPromise, timeoutPromise]);
}

/**
 * Create BKT fallback prediction
 */
function createBKTFallbackPrediction(
  skillId: string,
  interactionCount: number,
  pMastery: number = 0.1
): HybridPrediction {
  const pCorrect = predictCorrect(pMastery, DEFAULT_BKT_PARAMS);

  return {
    masteryProbability: pMastery,
    correctProbability: pCorrect,
    confidence: Math.min(0.5 + interactionCount * 0.05, 0.8),
    pathway: 'bkt',
    contributions: {
      bkt: 1,
      transformer: 0,
      difficultyAdjustment: 0,
      temporalDecay: 0,
    },
    metadata: {
      modelVersion: 'bkt-fallback',
      interactionCount,
      computeTimeMs: 0,
      isColdStart: interactionCount < 10,
      blendWeight: 0,
      timestamp: new Date(),
    },
  };
}

/**
 * Validate prediction values
 */
function isValidPrediction(prediction: HybridPrediction): boolean {
  // Check for NaN values
  if (
    Number.isNaN(prediction.masteryProbability) ||
    Number.isNaN(prediction.correctProbability) ||
    Number.isNaN(prediction.confidence)
  ) {
    return false;
  }

  // Check for out-of-range values
  if (
    prediction.masteryProbability < 0 ||
    prediction.masteryProbability > 1 ||
    prediction.correctProbability < 0 ||
    prediction.correctProbability > 1 ||
    prediction.confidence < 0 ||
    prediction.confidence > 1
  ) {
    return false;
  }

  return true;
}

// ============================================================================
// BATCH PREDICTIONS
// ============================================================================

/**
 * Get predictions for multiple skills with fallback
 *
 * @param userId - User identifier
 * @param skillIds - Array of skill identifiers
 * @param interactions - User's interaction history
 * @param config - Fallback configuration
 * @returns Map of skillId to FallbackPrediction
 */
export async function getBatchPredictionsWithFallback(
  userId: string,
  skillIds: string[],
  interactions?: InteractionLog[],
  config: FallbackConfig = DEFAULT_FALLBACK_CONFIG
): Promise<Map<string, FallbackPrediction>> {
  const results = new Map<string, FallbackPrediction>();

  // Process in parallel
  const predictions = await Promise.all(
    skillIds.map((skillId) =>
      getPredictionWithFallback(userId, skillId, interactions, config)
    )
  );

  for (let i = 0; i < skillIds.length; i++) {
    results.set(skillIds[i], predictions[i]);
  }

  return results;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if hybrid model should be used for a user
 */
export function shouldUseHybrid(
  interactionCount: number,
  config: ColdStartConfig = DEFAULT_COLD_START_CONFIG
): boolean {
  return interactionCount >= config.coldStartThreshold;
}

/**
 * Get the current model that would be used for a user
 */
export function getCurrentModelForUser(
  interactionCount: number,
  config: ColdStartConfig = DEFAULT_COLD_START_CONFIG
): 'bkt' | 'blended' | 'hybrid' {
  const coldStartState = getColdStartState('', interactionCount, config);

  switch (coldStartState.phase) {
    case 'cold_start':
      return 'bkt';
    case 'warming_up':
      return 'blended';
    case 'warm':
      return 'hybrid';
    default:
      return 'bkt';
  }
}

/**
 * Create a default prediction when no data is available
 */
export function createDefaultPrediction(skillId: string): HybridPrediction {
  return {
    masteryProbability: 0.1,
    correctProbability: predictCorrect(0.1, DEFAULT_BKT_PARAMS),
    confidence: 0.3,
    pathway: 'bkt',
    contributions: {
      bkt: 1,
      transformer: 0,
      difficultyAdjustment: 0,
      temporalDecay: 0,
    },
    metadata: {
      modelVersion: 'default',
      interactionCount: 0,
      computeTimeMs: 0,
      isColdStart: true,
      blendWeight: 0,
      timestamp: new Date(),
    },
  };
}
