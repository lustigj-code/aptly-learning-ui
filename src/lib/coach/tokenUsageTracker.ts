/**
 * Token Usage Tracker
 *
 * Tracks AI token usage for monitoring, billing, and analytics.
 * Provides detailed usage breakdowns by model, endpoint, and time period.
 *
 * Part of Phase 12: Socratic RAG Coach
 */

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

// ============================================
// TYPES
// ============================================

export interface TokenUsage {
  userId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  timestamp: Date;
  endpoint: string;
  variant?: string;
  latencyMs?: number;
  success: boolean;
}

export interface UsageSummary {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  requestCount: number;
  estimatedCost: number;
  avgLatencyMs: number;
  successRate: number;
}

export interface ModelUsageBreakdown {
  model: string;
  totalTokens: number;
  requestCount: number;
  estimatedCost: number;
}

// ============================================
// CONFIGURATION
// ============================================

const COLLECTION = 'coachTokenUsage';
const DAILY_SUMMARY_COLLECTION = 'coachUsageSummary';

// Cost per 1K tokens (approximate)
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'gemini-2.0-flash': { input: 0.000075, output: 0.0003 },
  'gemini-socratic': { input: 0.000075, output: 0.0003 },
  'sage': { input: 0.0001, output: 0.0001 },
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
};

// ============================================
// RECORDING FUNCTIONS
// ============================================

/**
 * Record token usage for a coach API call
 *
 * @param usage - Token usage details
 */
export async function recordTokenUsage(usage: TokenUsage): Promise<void> {
  try {
    const doc = {
      ...usage,
      timestamp: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    };

    await adminDb.collection(COLLECTION).add(doc);

    // Also update daily summary
    await updateDailySummary(usage);
  } catch (error) {
    console.error('[TokenUsageTracker] Error recording usage:', error);
    // Don't throw - token tracking shouldn't fail the request
  }
}

/**
 * Update daily usage summary (aggregated document)
 */
async function updateDailySummary(usage: TokenUsage): Promise<void> {
  const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const docId = `${usage.userId}_${dateStr}`;
  const ref = adminDb.collection(DAILY_SUMMARY_COLLECTION).doc(docId);

  const cost = calculateCost(
    usage.model,
    usage.promptTokens,
    usage.completionTokens
  );

  try {
    await adminDb.runTransaction(async (transaction) => {
      const doc = await transaction.get(ref);

      if (doc.exists) {
        const data = doc.data();
        transaction.update(ref, {
          totalTokens: (data?.totalTokens || 0) + usage.totalTokens,
          promptTokens: (data?.promptTokens || 0) + usage.promptTokens,
          completionTokens: (data?.completionTokens || 0) + usage.completionTokens,
          requestCount: (data?.requestCount || 0) + 1,
          estimatedCost: (data?.estimatedCost || 0) + cost,
          successCount: (data?.successCount || 0) + (usage.success ? 1 : 0),
          totalLatencyMs: (data?.totalLatencyMs || 0) + (usage.latencyMs || 0),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        transaction.set(ref, {
          userId: usage.userId,
          date: dateStr,
          totalTokens: usage.totalTokens,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          requestCount: 1,
          estimatedCost: cost,
          successCount: usage.success ? 1 : 0,
          totalLatencyMs: usage.latencyMs || 0,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    });
  } catch (error) {
    console.error('[TokenUsageTracker] Error updating daily summary:', error);
  }
}

// ============================================
// QUERY FUNCTIONS
// ============================================

/**
 * Get token usage for a user within a date range
 *
 * @param userId - User's Firebase UID
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @returns Total tokens used in the period
 */
export async function getUserTokenUsage(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  try {
    const snapshot = await adminDb
      .collection(COLLECTION)
      .where('userId', '==', userId)
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate)
      .get();

    return snapshot.docs.reduce(
      (sum, doc) => sum + (doc.data().totalTokens || 0),
      0
    );
  } catch (error) {
    console.error('[TokenUsageTracker] Error getting user usage:', error);
    return 0;
  }
}

/**
 * Get detailed usage summary for a user
 *
 * @param userId - User's Firebase UID
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @returns Detailed usage summary
 */
export async function getUserUsageSummary(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<UsageSummary> {
  try {
    const snapshot = await adminDb
      .collection(COLLECTION)
      .where('userId', '==', userId)
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate)
      .get();

    let totalTokens = 0;
    let promptTokens = 0;
    let completionTokens = 0;
    let totalCost = 0;
    let totalLatency = 0;
    let successCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      totalTokens += data.totalTokens || 0;
      promptTokens += data.promptTokens || 0;
      completionTokens += data.completionTokens || 0;
      totalCost += calculateCost(
        data.model,
        data.promptTokens || 0,
        data.completionTokens || 0
      );
      totalLatency += data.latencyMs || 0;
      if (data.success) successCount++;
    }

    const requestCount = snapshot.size;

    return {
      totalTokens,
      promptTokens,
      completionTokens,
      requestCount,
      estimatedCost: Math.round(totalCost * 10000) / 10000,
      avgLatencyMs: requestCount > 0 ? Math.round(totalLatency / requestCount) : 0,
      successRate: requestCount > 0 ? successCount / requestCount : 1,
    };
  } catch (error) {
    console.error('[TokenUsageTracker] Error getting usage summary:', error);
    return {
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      requestCount: 0,
      estimatedCost: 0,
      avgLatencyMs: 0,
      successRate: 1,
    };
  }
}

/**
 * Get usage breakdown by model
 *
 * @param userId - User's Firebase UID
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @returns Usage breakdown by model
 */
export async function getUsageByModel(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<ModelUsageBreakdown[]> {
  try {
    const snapshot = await adminDb
      .collection(COLLECTION)
      .where('userId', '==', userId)
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate)
      .get();

    const modelMap = new Map<string, ModelUsageBreakdown>();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const model = data.model || 'unknown';

      const existing = modelMap.get(model) || {
        model,
        totalTokens: 0,
        requestCount: 0,
        estimatedCost: 0,
      };

      existing.totalTokens += data.totalTokens || 0;
      existing.requestCount += 1;
      existing.estimatedCost += calculateCost(
        model,
        data.promptTokens || 0,
        data.completionTokens || 0
      );

      modelMap.set(model, existing);
    }

    return Array.from(modelMap.values()).sort(
      (a, b) => b.totalTokens - a.totalTokens
    );
  } catch (error) {
    console.error('[TokenUsageTracker] Error getting model breakdown:', error);
    return [];
  }
}

/**
 * Get daily usage summary (from pre-aggregated collection)
 *
 * @param userId - User's Firebase UID
 * @param date - Optional specific date (defaults to today)
 */
export async function getDailyUsage(
  userId: string,
  date?: Date
): Promise<UsageSummary | null> {
  const dateStr = (date || new Date()).toISOString().split('T')[0];
  const docId = `${userId}_${dateStr}`;

  try {
    const doc = await adminDb.collection(DAILY_SUMMARY_COLLECTION).doc(docId).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    const requestCount = data?.requestCount || 0;
    return {
      totalTokens: data?.totalTokens || 0,
      promptTokens: data?.promptTokens || 0,
      completionTokens: data?.completionTokens || 0,
      requestCount,
      estimatedCost: data?.estimatedCost || 0,
      avgLatencyMs:
        requestCount > 0
          ? Math.round((data?.totalLatencyMs || 0) / requestCount)
          : 0,
      successRate:
        requestCount > 0
          ? (data?.successCount || 0) / requestCount
          : 1,
    };
  } catch (error) {
    console.error('[TokenUsageTracker] Error getting daily usage:', error);
    return null;
  }
}

// ============================================
// HELPERS
// ============================================

/**
 * Calculate estimated cost for token usage
 */
function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const costs = MODEL_COSTS[model] || MODEL_COSTS['gemini-2.0-flash'];

  const inputCost = (promptTokens / 1000) * costs.input;
  const outputCost = (completionTokens / 1000) * costs.output;

  return inputCost + outputCost;
}

/**
 * Create a TokenUsage object from API response metadata
 */
export function createTokenUsage(
  userId: string,
  model: string,
  endpoint: string,
  promptTokens: number,
  completionTokens: number,
  options?: {
    variant?: string;
    latencyMs?: number;
    success?: boolean;
  }
): TokenUsage {
  return {
    userId,
    model,
    endpoint,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    timestamp: new Date(),
    variant: options?.variant,
    latencyMs: options?.latencyMs,
    success: options?.success ?? true,
  };
}

/**
 * Check if user is approaching usage limits
 */
export async function checkUsageLimits(
  userId: string,
  dailyTokenLimit: number = 100000
): Promise<{
  isOverLimit: boolean;
  tokensUsed: number;
  tokensRemaining: number;
  percentUsed: number;
}> {
  const dailyUsage = await getDailyUsage(userId);
  const tokensUsed = dailyUsage?.totalTokens || 0;
  const tokensRemaining = Math.max(0, dailyTokenLimit - tokensUsed);
  const percentUsed = (tokensUsed / dailyTokenLimit) * 100;

  return {
    isOverLimit: tokensUsed >= dailyTokenLimit,
    tokensUsed,
    tokensRemaining,
    percentUsed: Math.round(percentUsed * 10) / 10,
  };
}
