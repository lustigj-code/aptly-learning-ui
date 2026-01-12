/**
 * Model Switching Service
 *
 * Decides which model pathway to use for each prediction:
 * - BKT only (cold-start)
 * - Hybrid (warm users)
 * - Forced model (debugging)
 *
 * Logs which model was used for each prediction for analysis.
 *
 * Part of Phase 15.2: Hybrid Model Integration
 */

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { SkillState, BKTParameters } from '@/lib/mastery/bkt';
import type { HybridPrediction, InteractionFeatures } from '@/lib/mastery/hybridTypes';
import { getPrediction } from '@/lib/mastery/predictionRouter';
import { predictCorrect, DEFAULT_BKT_PARAMS } from '@/lib/mastery/bkt';
import {
  blendPredictions,
  getColdStartState,
  type ModelWeight,
  type ColdStartConfig,
  DEFAULT_COLD_START_CONFIG,
} from './coldStart';

// ============================================================================
// TYPES
// ============================================================================

export type ModelPathway = 'bkt_only' | 'hybrid' | 'blended' | 'forced_bkt' | 'forced_hybrid';

export interface ModelDecision {
  pathway: ModelPathway;
  weights: ModelWeight;
  reason: string;
  interactionCount: number;
}

export interface PredictionResult {
  prediction: HybridPrediction;
  decision: ModelDecision;
  timestamp: Date;
  logged: boolean;
}

export interface PredictionLog {
  id: string;
  userId: string;
  skillId: string;
  timestamp: Date;
  pathway: ModelPathway;
  weights: ModelWeight;
  bktPrediction: number;
  hybridPrediction: number;
  finalPrediction: number;
  confidence: number;
  interactionCount: number;
  experimentVariant?: string;
}

export interface ModelSwitchingConfig {
  coldStart: ColdStartConfig;
  /** Force a specific model (for debugging) */
  forceModel?: 'bkt' | 'hybrid' | null;
  /** Enable prediction logging */
  enableLogging: boolean;
  /** Log collection name */
  logCollection: string;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

export const DEFAULT_MODEL_SWITCHING_CONFIG: ModelSwitchingConfig = {
  coldStart: DEFAULT_COLD_START_CONFIG,
  forceModel: null,
  enableLogging: true,
  logCollection: 'predictionLogs',
};

// ============================================================================
// CORE SERVICE
// ============================================================================

/**
 * Get prediction using the appropriate model pathway
 *
 * @param userId - User identifier
 * @param skillState - Current skill state
 * @param features - Interaction features
 * @param interactionCount - Total interactions for this user/skill
 * @param config - Model switching configuration
 * @param bktParams - BKT parameters
 * @param experimentVariant - A/B test variant (optional)
 * @returns Prediction result with decision metadata
 */
export async function getModelPrediction(
  userId: string,
  skillState: SkillState,
  features: InteractionFeatures,
  interactionCount: number,
  config: ModelSwitchingConfig = DEFAULT_MODEL_SWITCHING_CONFIG,
  bktParams: BKTParameters = DEFAULT_BKT_PARAMS,
  experimentVariant?: string
): Promise<PredictionResult> {
  const timestamp = new Date();

  // Make routing decision
  const decision = makeModelDecision(interactionCount, config, experimentVariant);

  // Get predictions based on pathway
  let prediction: HybridPrediction;
  let bktPrediction: number;
  let hybridPrediction: number;

  switch (decision.pathway) {
    case 'forced_bkt':
    case 'bkt_only':
      bktPrediction = predictCorrect(skillState.pMastery, bktParams);
      hybridPrediction = bktPrediction; // Not calculated
      prediction = {
        pMastery: skillState.pMastery,
        pCorrectNext: bktPrediction,
        confidence: Math.min(0.5 + skillState.attempts * 0.05, 0.9),
        modelUsed: 'bkt',
        features: {
          bktContribution: 1.0,
          temporalContribution: 0,
          difficultyAdjustment: 0,
        },
      };
      break;

    case 'forced_hybrid':
    case 'hybrid':
      prediction = getPrediction(skillState, features, undefined, bktParams);
      bktPrediction = predictCorrect(skillState.pMastery, bktParams);
      hybridPrediction = prediction.pCorrectNext;
      break;

    case 'blended':
    default:
      // Get both predictions
      bktPrediction = predictCorrect(skillState.pMastery, bktParams);
      const rawHybridPrediction = getPrediction(skillState, features, undefined, bktParams);
      hybridPrediction = rawHybridPrediction.pCorrectNext;

      // Blend based on weights
      const blendedPCorrect = blendPredictions(
        bktPrediction,
        hybridPrediction,
        decision.weights
      );

      prediction = {
        pMastery: skillState.pMastery,
        pCorrectNext: blendedPCorrect,
        confidence: rawHybridPrediction.confidence * decision.weights.hybrid +
                    (Math.min(0.5 + skillState.attempts * 0.05, 0.9)) * decision.weights.bkt,
        modelUsed: 'hybrid',
        features: {
          bktContribution: decision.weights.bkt,
          temporalContribution: rawHybridPrediction.features.temporalContribution * decision.weights.hybrid,
          difficultyAdjustment: rawHybridPrediction.features.difficultyAdjustment * decision.weights.hybrid,
        },
      };
      break;
  }

  // Log prediction if enabled
  let logged = false;
  if (config.enableLogging) {
    try {
      await logPrediction({
        userId,
        skillId: skillState.skillId,
        timestamp,
        pathway: decision.pathway,
        weights: decision.weights,
        bktPrediction,
        hybridPrediction,
        finalPrediction: prediction.pCorrectNext,
        confidence: prediction.confidence,
        interactionCount,
        experimentVariant,
      }, config.logCollection);
      logged = true;
    } catch (error) {
      console.error('[ModelSwitching] Failed to log prediction:', error);
    }
  }

  return {
    prediction,
    decision,
    timestamp,
    logged,
  };
}

/**
 * Make model routing decision based on interaction count and config
 */
export function makeModelDecision(
  interactionCount: number,
  config: ModelSwitchingConfig = DEFAULT_MODEL_SWITCHING_CONFIG,
  experimentVariant?: string
): ModelDecision {
  // Handle forced model (debugging)
  if (config.forceModel === 'bkt') {
    return {
      pathway: 'forced_bkt',
      weights: { bkt: 1.0, hybrid: 0.0 },
      reason: 'Forced BKT mode (debug)',
      interactionCount,
    };
  }

  if (config.forceModel === 'hybrid') {
    return {
      pathway: 'forced_hybrid',
      weights: { bkt: 0.0, hybrid: 1.0 },
      reason: 'Forced hybrid mode (debug)',
      interactionCount,
    };
  }

  // Handle A/B test variants
  if (experimentVariant === 'control') {
    return {
      pathway: 'bkt_only',
      weights: { bkt: 1.0, hybrid: 0.0 },
      reason: 'A/B test control group (BKT only)',
      interactionCount,
    };
  }

  // Normal cold-start logic
  const coldStartState = getColdStartState('', interactionCount, config.coldStart);
  const weights = coldStartState.weights;

  // Determine pathway
  let pathway: ModelPathway;
  let reason: string;

  if (weights.hybrid === 0) {
    pathway = 'bkt_only';
    reason = `Cold start: ${interactionCount} < ${config.coldStart.coldStartThreshold} interactions`;
  } else if (weights.bkt === config.coldStart.finalBktWeight) {
    pathway = 'hybrid';
    reason = `Warm user: ${Math.round(weights.hybrid * 100)}% hybrid weight`;
  } else {
    pathway = 'blended';
    reason = `Warming up: ${Math.round(weights.hybrid * 100)}% hybrid, ${Math.round(weights.bkt * 100)}% BKT`;
  }

  return {
    pathway,
    weights,
    reason,
    interactionCount,
  };
}

// ============================================================================
// LOGGING
// ============================================================================

/**
 * Log a prediction to Firestore for analysis
 */
async function logPrediction(
  log: Omit<PredictionLog, 'id'>,
  collection: string
): Promise<string> {
  const docRef = adminDb.collection(collection).doc();

  await docRef.set({
    ...log,
    id: docRef.id,
    timestamp: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Get prediction logs for analysis
 *
 * @param filters - Optional filters
 * @param limit - Max results
 * @returns Array of prediction logs
 */
export async function getPredictionLogs(
  filters?: {
    userId?: string;
    skillId?: string;
    pathway?: ModelPathway;
    startDate?: Date;
    endDate?: Date;
  },
  limit: number = 1000
): Promise<PredictionLog[]> {
  let query = adminDb.collection('predictionLogs')
    .orderBy('timestamp', 'desc')
    .limit(limit);

  if (filters?.userId) {
    query = query.where('userId', '==', filters.userId) as typeof query;
  }

  if (filters?.skillId) {
    query = query.where('skillId', '==', filters.skillId) as typeof query;
  }

  if (filters?.pathway) {
    query = query.where('pathway', '==', filters.pathway) as typeof query;
  }

  const snapshot = await query.get();

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      timestamp: data.timestamp?.toDate?.() || new Date(),
    } as PredictionLog;
  });
}

/**
 * Get prediction statistics by pathway
 */
export async function getPredictionStats(): Promise<{
  totalPredictions: number;
  byPathway: Record<ModelPathway, number>;
  avgConfidence: number;
}> {
  // Get recent predictions for stats
  const logs = await getPredictionLogs({}, 10000);

  const byPathway: Record<ModelPathway, number> = {
    bkt_only: 0,
    hybrid: 0,
    blended: 0,
    forced_bkt: 0,
    forced_hybrid: 0,
  };

  let totalConfidence = 0;

  for (const log of logs) {
    byPathway[log.pathway] = (byPathway[log.pathway] || 0) + 1;
    totalConfidence += log.confidence;
  }

  return {
    totalPredictions: logs.length,
    byPathway,
    avgConfidence: logs.length > 0 ? totalConfidence / logs.length : 0,
  };
}

// ============================================================================
// USER INTERACTION COUNT
// ============================================================================

/**
 * Get interaction count for a user (across all skills)
 */
export async function getUserInteractionCount(userId: string): Promise<number> {
  try {
    const snapshot = await adminDb
      .collection('interactionLogs')
      .where('userId', '==', userId)
      .count()
      .get();

    return snapshot.data().count;
  } catch (error) {
    console.error('[ModelSwitching] Error getting interaction count:', error);
    return 0;
  }
}

/**
 * Get interaction count for a user on a specific skill
 */
export async function getUserSkillInteractionCount(
  userId: string,
  skillId: string
): Promise<number> {
  try {
    const snapshot = await adminDb
      .collection('interactionLogs')
      .where('userId', '==', userId)
      .where('skillId', '==', skillId)
      .count()
      .get();

    return snapshot.data().count;
  } catch (error) {
    console.error('[ModelSwitching] Error getting skill interaction count:', error);
    return 0;
  }
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Get model decisions for multiple users (batch operation)
 */
export async function getBatchModelDecisions(
  userIds: string[],
  config: ModelSwitchingConfig = DEFAULT_MODEL_SWITCHING_CONFIG
): Promise<Map<string, ModelDecision>> {
  const decisions = new Map<string, ModelDecision>();

  // Get interaction counts in parallel
  const counts = await Promise.all(
    userIds.map(userId => getUserInteractionCount(userId))
  );

  for (let i = 0; i < userIds.length; i++) {
    decisions.set(userIds[i], makeModelDecision(counts[i], config));
  }

  return decisions;
}

// ============================================================================
// CONFIGURATION HELPERS
// ============================================================================

/**
 * Create a model switching configuration with overrides
 */
export function createModelSwitchingConfig(
  overrides: Partial<ModelSwitchingConfig>
): ModelSwitchingConfig {
  return {
    ...DEFAULT_MODEL_SWITCHING_CONFIG,
    ...overrides,
    coldStart: {
      ...DEFAULT_COLD_START_CONFIG,
      ...overrides.coldStart,
    },
  };
}

/**
 * Configuration for debugging with forced BKT
 */
export const DEBUG_BKT_CONFIG: ModelSwitchingConfig = {
  ...DEFAULT_MODEL_SWITCHING_CONFIG,
  forceModel: 'bkt',
  enableLogging: true,
};

/**
 * Configuration for debugging with forced hybrid
 */
export const DEBUG_HYBRID_CONFIG: ModelSwitchingConfig = {
  ...DEFAULT_MODEL_SWITCHING_CONFIG,
  forceModel: 'hybrid',
  enableLogging: true,
};
