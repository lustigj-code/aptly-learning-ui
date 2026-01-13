/**
 * Prediction Logger Service
 *
 * Logs all ML predictions to Firestore for:
 * - Model performance monitoring
 * - A/B testing analysis
 * - Model improvement data collection
 * - Debugging and auditing
 *
 * Part of Phase 15.3: ML Model Full Integration
 */

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { HybridPrediction } from './hybridModelTypes';

// ============================================================================
// TYPES
// ============================================================================

export interface PredictionLogEntry {
  /** Unique log ID */
  id?: string;
  /** User identifier */
  userId: string;
  /** Skill identifier */
  skillId: string;
  /** The prediction result */
  prediction: {
    masteryProbability: number;
    correctProbability: number;
    confidence: number;
    pathway: string;
  };
  /** Which model was used */
  modelUsed: 'bkt' | 'hybrid' | 'blended';
  /** Model version */
  modelVersion: string;
  /** Prediction confidence */
  confidence: number;
  /** Timestamp of prediction */
  timestamp: Date;
  /** Context about the prediction */
  context: PredictionContext;
  /** Whether a fallback was used */
  usedFallback?: boolean;
  /** Fallback reason if applicable */
  fallbackReason?: string;
}

export interface PredictionContext {
  /** Number of user interactions */
  interactionCount: number;
  /** Whether user is in cold-start phase */
  isColdStart: boolean;
  /** Request source (api, component, etc.) */
  source?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface LoggerConfig {
  /** Whether logging is enabled */
  enabled: boolean;
  /** Firestore collection name */
  collection: string;
  /** Sample rate (0-1) for logging */
  sampleRate: number;
  /** Whether to log in batches */
  batchMode: boolean;
  /** Batch size before flush */
  batchSize: number;
  /** Batch flush interval (ms) */
  flushIntervalMs: number;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

export const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
  enabled: true,
  collection: 'mlPredictionLogs',
  sampleRate: 1.0, // Log all predictions by default
  batchMode: false,
  batchSize: 50,
  flushIntervalMs: 10000,
};

// ============================================================================
// BATCH BUFFER
// ============================================================================

let logBuffer: PredictionLogEntry[] = [];
let flushTimer: NodeJS.Timeout | null = null;

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Log a prediction to Firestore
 *
 * @param entry - Prediction log entry
 * @param config - Logger configuration
 * @returns Log document ID if logged, undefined if skipped
 */
export async function logPrediction(
  entry: Omit<PredictionLogEntry, 'id'>,
  config: LoggerConfig = DEFAULT_LOGGER_CONFIG
): Promise<string | undefined> {
  if (!config.enabled) {
    return undefined;
  }

  // Apply sampling
  if (config.sampleRate < 1 && Math.random() > config.sampleRate) {
    return undefined;
  }

  if (config.batchMode) {
    return logPredictionBatched(entry, config);
  }

  return logPredictionImmediate(entry, config);
}

/**
 * Log prediction immediately
 */
async function logPredictionImmediate(
  entry: Omit<PredictionLogEntry, 'id'>,
  config: LoggerConfig
): Promise<string | undefined> {
  try {
    const docRef = adminDb.collection(config.collection).doc();

    await docRef.set({
      ...entry,
      id: docRef.id,
      timestamp: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error('[PredictionLogger] Failed to log prediction:', error);
    return undefined;
  }
}

/**
 * Log prediction with batching
 */
async function logPredictionBatched(
  entry: Omit<PredictionLogEntry, 'id'>,
  config: LoggerConfig
): Promise<string | undefined> {
  const entryWithTimestamp = {
    ...entry,
    timestamp: new Date(),
  };

  logBuffer.push(entryWithTimestamp as PredictionLogEntry);

  // Start flush timer if not already running
  if (!flushTimer) {
    flushTimer = setTimeout(() => flushLogBuffer(config), config.flushIntervalMs);
  }

  // Flush immediately if buffer is full
  if (logBuffer.length >= config.batchSize) {
    await flushLogBuffer(config);
  }

  return 'batched';
}

/**
 * Flush the log buffer to Firestore
 */
async function flushLogBuffer(config: LoggerConfig): Promise<void> {
  if (logBuffer.length === 0) {
    return;
  }

  // Clear timer
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  // Take current buffer and reset
  const entriesToFlush = [...logBuffer];
  logBuffer = [];

  try {
    const batch = adminDb.batch();

    for (const entry of entriesToFlush) {
      const docRef = adminDb.collection(config.collection).doc();
      batch.set(docRef, {
        ...entry,
        id: docRef.id,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    console.error('[PredictionLogger] Failed to flush log buffer:', error);
    // Re-add entries to buffer for retry
    logBuffer = [...entriesToFlush, ...logBuffer];
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Log a hybrid prediction with full context
 */
export async function logHybridPrediction(
  userId: string,
  skillId: string,
  prediction: HybridPrediction,
  context: Partial<PredictionContext> = {},
  config: LoggerConfig = DEFAULT_LOGGER_CONFIG
): Promise<string | undefined> {
  const entry: Omit<PredictionLogEntry, 'id'> = {
    userId,
    skillId,
    prediction: {
      masteryProbability: prediction.masteryProbability,
      correctProbability: prediction.correctProbability,
      confidence: prediction.confidence,
      pathway: prediction.pathway,
    },
    modelUsed: prediction.pathway === 'bkt' ? 'bkt' : prediction.pathway === 'transformer' ? 'hybrid' : 'blended',
    modelVersion: prediction.metadata.modelVersion,
    confidence: prediction.confidence,
    timestamp: new Date(),
    context: {
      interactionCount: prediction.metadata.interactionCount,
      isColdStart: prediction.metadata.isColdStart,
      ...context,
    },
  };

  return logPrediction(entry, config);
}

/**
 * Log a prediction from the fallback service
 */
export async function logFallbackPrediction(
  userId: string,
  skillId: string,
  prediction: HybridPrediction,
  source: 'hybrid' | 'bkt_fallback' | 'default_fallback',
  fallbackReason?: string,
  context: Partial<PredictionContext> = {},
  config: LoggerConfig = DEFAULT_LOGGER_CONFIG
): Promise<string | undefined> {
  const entry: Omit<PredictionLogEntry, 'id'> = {
    userId,
    skillId,
    prediction: {
      masteryProbability: prediction.masteryProbability,
      correctProbability: prediction.correctProbability,
      confidence: prediction.confidence,
      pathway: prediction.pathway,
    },
    modelUsed: source === 'hybrid' ? 'hybrid' : 'bkt',
    modelVersion: prediction.metadata.modelVersion,
    confidence: prediction.confidence,
    timestamp: new Date(),
    context: {
      interactionCount: prediction.metadata.interactionCount,
      isColdStart: prediction.metadata.isColdStart,
      ...context,
    },
    usedFallback: source !== 'hybrid',
    fallbackReason,
  };

  return logPrediction(entry, config);
}

// ============================================================================
// ANALYTICS QUERIES
// ============================================================================

/**
 * Get prediction logs for a user
 */
export async function getUserPredictionLogs(
  userId: string,
  limit: number = 100,
  config: LoggerConfig = DEFAULT_LOGGER_CONFIG
): Promise<PredictionLogEntry[]> {
  try {
    const snapshot = await adminDb
      .collection(config.collection)
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        timestamp: data.timestamp?.toDate?.() || new Date(),
      } as PredictionLogEntry;
    });
  } catch (error) {
    console.error('[PredictionLogger] Failed to get user logs:', error);
    return [];
  }
}

/**
 * Get prediction logs for a skill
 */
export async function getSkillPredictionLogs(
  skillId: string,
  limit: number = 100,
  config: LoggerConfig = DEFAULT_LOGGER_CONFIG
): Promise<PredictionLogEntry[]> {
  try {
    const snapshot = await adminDb
      .collection(config.collection)
      .where('skillId', '==', skillId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        timestamp: data.timestamp?.toDate?.() || new Date(),
      } as PredictionLogEntry;
    });
  } catch (error) {
    console.error('[PredictionLogger] Failed to get skill logs:', error);
    return [];
  }
}

/**
 * Get prediction statistics
 */
export async function getPredictionStats(
  startDate?: Date,
  endDate?: Date,
  config: LoggerConfig = DEFAULT_LOGGER_CONFIG
): Promise<{
  totalPredictions: number;
  byModel: Record<string, number>;
  avgConfidence: number;
  fallbackRate: number;
}> {
  try {
    let query = adminDb.collection(config.collection).orderBy('timestamp', 'desc');

    if (startDate) {
      query = query.where('timestamp', '>=', startDate) as typeof query;
    }
    if (endDate) {
      query = query.where('timestamp', '<=', endDate) as typeof query;
    }

    const snapshot = await query.limit(10000).get();

    const byModel: Record<string, number> = {
      bkt: 0,
      hybrid: 0,
      blended: 0,
    };

    let totalConfidence = 0;
    let fallbackCount = 0;

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const model = data.modelUsed || 'bkt';
      byModel[model] = (byModel[model] || 0) + 1;
      totalConfidence += data.confidence || 0;
      if (data.usedFallback) {
        fallbackCount++;
      }
    });

    const total = snapshot.docs.length;

    return {
      totalPredictions: total,
      byModel,
      avgConfidence: total > 0 ? totalConfidence / total : 0,
      fallbackRate: total > 0 ? fallbackCount / total : 0,
    };
  } catch (error) {
    console.error('[PredictionLogger] Failed to get stats:', error);
    return {
      totalPredictions: 0,
      byModel: { bkt: 0, hybrid: 0, blended: 0 },
      avgConfidence: 0,
      fallbackRate: 0,
    };
  }
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Flush any remaining buffered logs (call on shutdown)
 */
export async function shutdownLogger(
  config: LoggerConfig = DEFAULT_LOGGER_CONFIG
): Promise<void> {
  await flushLogBuffer(config);
}
