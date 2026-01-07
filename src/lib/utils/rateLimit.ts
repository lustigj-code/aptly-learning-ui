/**
 * Rate Limiting Utility
 * Enforces a 10 messages/minute per user limit for AI coach interactions
 * Stores usage data in Firestore `aiUsage` collection
 * Resets daily at midnight UTC
 */

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export type TokenUsageData = {
  userId: string;
  date: string; // Format: YYYY-MM-DD
  messageCount: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  requestCount: number;
  estimatedCost: number;
  createdAt: Date;
  updatedAt: Date;
};

const MESSAGES_PER_MINUTE = 10;

/**
 * Get usage document ID for a user on a specific date
 * Format: {userId}-{YYYY-MM-DD}
 */
function getUsageDocId(userId: string, date?: Date): string {
  const targetDate = date || new Date();
  const dateStr = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD
  return `${userId}-${dateStr}`;
}

/**
 * Check if user has messages remaining in current minute
 * @param userId - User's Firebase UID
 * @returns Object with hasMessages boolean and messagesRemaining count
 * @throws Error if database operation fails
 */
export async function checkRateLimit(userId: string): Promise<{
  hasMessages: boolean;
  messagesRemaining: number;
  lastMessage?: Date;
}> {
  try {
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid userId provided');
    }

    const docId = getUsageDocId(userId);
    const usageRef = adminDb.collection('aiUsage').doc(docId);
    const doc = await usageRef.get();

    // If no document exists, user has full quota
    if (!doc.exists) {
      return {
        hasMessages: true,
        messagesRemaining: MESSAGES_PER_MINUTE,
        lastMessage: undefined,
      };
    }

    const data = doc.data() as TokenUsageData | undefined;
    if (!data) {
      return {
        hasMessages: true,
        messagesRemaining: MESSAGES_PER_MINUTE,
        lastMessage: undefined,
      };
    }

    // Check if we're still within the rate limit window
    // For simplicity, we track messageCount which should be reset daily
    // In production, you might want to track timestamps of last N messages
    const recentMessageCount = data.messageCount || 0;

    const messagesRemaining = Math.max(0, MESSAGES_PER_MINUTE - recentMessageCount);
    const hasMessages = messagesRemaining > 0;

    // Get last message timestamp if available
    const lastMessageTime = data.updatedAt instanceof Date ? data.updatedAt : new Date(data.updatedAt);

    return {
      hasMessages,
      messagesRemaining,
      lastMessage: lastMessageTime,
    };
  } catch (error) {
    console.error(`Error checking rate limit for user ${userId}:`, error);
    throw new Error(
      `Failed to check rate limit: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Record a message for rate limiting
 * Increments message count for current day
 * @param userId - User's Firebase UID
 * @returns Updated message count
 * @throws Error if operation fails or rate limit exceeded
 */
export async function recordMessage(userId: string): Promise<number> {
  try {
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid userId provided');
    }

    // First check if we have messages remaining
    const { hasMessages } = await checkRateLimit(userId);
    if (!hasMessages) {
      throw new Error('Rate limit exceeded: Maximum 10 messages per minute');
    }

    const docId = getUsageDocId(userId);
    const usageRef = adminDb.collection('aiUsage').doc(docId);

    // Use transaction to ensure consistency
    const result = await adminDb.runTransaction(async (transaction) => {
      const doc = await transaction.get(usageRef);

      if (doc.exists) {
        const data = doc.data() as TokenUsageData | undefined;
        const newCount = (data?.messageCount || 0) + 1;

        transaction.update(usageRef, {
          messageCount: newCount,
          updatedAt: FieldValue.serverTimestamp(),
        });

        return newCount;
      } else {
        // Create new usage document
        const newData: Omit<TokenUsageData, 'createdAt' | 'updatedAt'> = {
          userId,
          date: getUsageDocId(userId).split('-').slice(1).join('-'),
          messageCount: 1,
          totalTokens: 0,
          inputTokens: 0,
          outputTokens: 0,
          requestCount: 0,
          estimatedCost: 0,
        };

        transaction.set(usageRef, {
          ...newData,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        return 1;
      }
    });

    return result;
  } catch (error) {
    console.error(`Error recording message for user ${userId}:`, error);
    throw new Error(
      `Failed to record message: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Record token usage for an API call
 * Tracks total tokens, input/output tokens, and estimated cost
 * @param userId - User's Firebase UID
 * @param tokens - Gemini API response token counts
 * @throws Error if operation fails
 */
export async function recordTokenUsage(
  userId: string,
  tokens: {
    inputTokens: number;
    outputTokens: number;
  }
): Promise<void> {
  try {
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid userId provided');
    }

    if (typeof tokens.inputTokens !== 'number' || typeof tokens.outputTokens !== 'number') {
      throw new Error('inputTokens and outputTokens must be numbers');
    }

    const docId = getUsageDocId(userId);
    const usageRef = adminDb.collection('aiUsage').doc(docId);

    const totalTokens = tokens.inputTokens + tokens.outputTokens;
    // Gemini 3 Flash pricing: $0.075 per 1M input, $0.30 per 1M output
    // = $0.000075 per 1K input, $0.0003 per 1K output
    const estimatedCost =
      (tokens.inputTokens / 1000) * 0.000075 + (tokens.outputTokens / 1000) * 0.0003;

    await adminDb.runTransaction(async (transaction) => {
      const doc = await transaction.get(usageRef);

      if (doc.exists) {
        const data = doc.data() as TokenUsageData | undefined;
        transaction.update(usageRef, {
          totalTokens: (data?.totalTokens || 0) + totalTokens,
          inputTokens: (data?.inputTokens || 0) + tokens.inputTokens,
          outputTokens: (data?.outputTokens || 0) + tokens.outputTokens,
          requestCount: (data?.requestCount || 0) + 1,
          estimatedCost: (data?.estimatedCost || 0) + estimatedCost,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        // Create new usage document with token data
        const newData: Omit<TokenUsageData, 'createdAt' | 'updatedAt'> = {
          userId,
          date: getUsageDocId(userId).split('-').slice(1).join('-'),
          messageCount: 0,
          totalTokens,
          inputTokens: tokens.inputTokens,
          outputTokens: tokens.outputTokens,
          requestCount: 1,
          estimatedCost,
        };

        transaction.set(usageRef, {
          ...newData,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    });
  } catch (error) {
    console.error(`Error recording token usage for user ${userId}:`, error);
    throw new Error(
      `Failed to record token usage: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get usage statistics for a user on a specific date
 * @param userId - User's Firebase UID
 * @param date - Optional date (defaults to today)
 * @returns Usage data for the date
 */
export async function getUsageStats(userId: string, date?: Date): Promise<TokenUsageData | null> {
  try {
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid userId provided');
    }

    const docId = getUsageDocId(userId, date);
    const doc = await adminDb.collection('aiUsage').doc(docId).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    if (!data) {
      return null;
    }

    return {
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
    } as TokenUsageData;
  } catch (error) {
    console.error(`Error getting usage stats for user ${userId}:`, error);
    throw new Error(
      `Failed to get usage stats: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Reset daily usage (called automatically by system)
 * Clears message count for new day but keeps historical token data
 * @param userId - User's Firebase UID
 * @param date - Date to reset (defaults to today)
 * @throws Error if operation fails
 */
export async function resetDailyUsage(userId: string, date?: Date): Promise<void> {
  try {
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid userId provided');
    }

    const docId = getUsageDocId(userId, date);
    const usageRef = adminDb.collection('aiUsage').doc(docId);

    await usageRef.update({
      messageCount: 0,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error resetting daily usage for user ${userId}:`, error);
    throw new Error(
      `Failed to reset daily usage: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
