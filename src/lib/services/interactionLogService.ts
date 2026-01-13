/**
 * Interaction Log Service
 * Logs all learning interactions for ML model training (DKT2 + BKT hybrid)
 * Server-side only - uses firebase-admin SDK
 */

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { InteractionLog, InteractionLogInput } from '@/types';
import { withErrorHandling, validateString, validateRequired, validateNumber } from '@/lib/errors/handlers';

const COLLECTION = 'interactionLogs';
const BATCH_SIZE = 500; // Firestore batch limit

/**
 * Log a single interaction to Firestore
 * @param input - Interaction data (id and timestamp auto-generated)
 * @returns The generated document ID
 */
export async function logInteraction(input: InteractionLogInput): Promise<string> {
  return withErrorHandling('log interaction', async () => {
    const docRef = adminDb.collection(COLLECTION).doc();

    const log: InteractionLog = {
      ...input,
      id: docRef.id,
      timestamp: input.timestamp || new Date(),
    };

    await docRef.set({
      ...log,
      timestamp: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });

    return docRef.id;
  });
}

/**
 * Batch log multiple interactions for performance
 * @param inputs - Array of interaction data
 * @returns void
 */
export async function batchLogInteractions(inputs: InteractionLogInput[]): Promise<void> {
  if (inputs.length === 0) return;

  return withErrorHandling('batch log interactions', async () => {
    // Split into batches of 500 (Firestore limit)
    for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
      const batch = adminDb.batch();
      const batchInputs = inputs.slice(i, i + BATCH_SIZE);

      for (const input of batchInputs) {
        const docRef = adminDb.collection(COLLECTION).doc();
        const log: InteractionLog = {
          ...input,
          id: docRef.id,
          timestamp: input.timestamp || new Date(),
        };

        batch.set(docRef, {
          ...log,
          timestamp: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      await batch.commit();
    }
  });
}

/**
 * Get interactions for a specific user
 * @param userId - User's Firebase UID
 * @param limit - Maximum number of results (default 100)
 * @returns Array of interactions sorted by timestamp desc
 */
export async function getInteractionsByUser(
  userId: string,
  limit: number = 100
): Promise<InteractionLog[]> {
  return withErrorHandling(`fetch interactions for user ${userId}`, async () => {
    validateString('userId', userId);
    validateNumber('limit', limit, 1);

    const snapshot = await adminDb
      .collection(COLLECTION)
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
      } as InteractionLog;
    });
  });
}

/**
 * Get interactions for a specific skill (for BKT parameter estimation)
 * @param skillId - Skill identifier
 * @param limit - Maximum number of results (default 1000)
 * @returns Array of interactions sorted by timestamp desc
 */
export async function getInteractionsBySkill(
  skillId: string,
  limit: number = 1000
): Promise<InteractionLog[]> {
  return withErrorHandling(`fetch interactions for skill ${skillId}`, async () => {
    validateString('skillId', skillId);
    validateNumber('limit', limit, 1);

    const snapshot = await adminDb
      .collection(COLLECTION)
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
      } as InteractionLog;
    });
  });
}

/**
 * Get interactions for a user on a specific skill (for individual mastery tracking)
 * @param userId - User's Firebase UID
 * @param skillId - Skill identifier
 * @param limit - Maximum number of results (default 50)
 * @returns Array of interactions sorted by timestamp asc (chronological)
 */
export async function getUserSkillInteractions(
  userId: string,
  skillId: string,
  limit: number = 50
): Promise<InteractionLog[]> {
  return withErrorHandling(`fetch interactions for user ${userId} skill ${skillId}`, async () => {
    validateRequired({ userId, skillId });
    validateNumber('limit', limit, 1);

    const snapshot = await adminDb
      .collection(COLLECTION)
      .where('userId', '==', userId)
      .where('skillId', '==', skillId)
      .orderBy('timestamp', 'asc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        timestamp: data.timestamp?.toDate?.() || new Date(),
      } as InteractionLog;
    });
  });
}

/**
 * Get total interaction count (for monitoring data collection progress)
 * @returns Total count of logged interactions
 */
export async function getInteractionCount(): Promise<number> {
  return withErrorHandling('get interaction count', async () => {
    const snapshot = await adminDb.collection(COLLECTION).count().get();
    return snapshot.data().count;
  });
}

/**
 * Get recent interactions for a user's session
 * @param userId - User's Firebase UID
 * @param sessionId - Session identifier
 * @returns Array of session interactions in chronological order
 */
export async function getSessionInteractions(
  userId: string,
  sessionId: string
): Promise<InteractionLog[]> {
  return withErrorHandling(`fetch session interactions for user ${userId}`, async () => {
    validateRequired({ userId, sessionId });

    const snapshot = await adminDb
      .collection(COLLECTION)
      .where('userId', '==', userId)
      .where('sessionId', '==', sessionId)
      .orderBy('timestamp', 'asc')
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        timestamp: data.timestamp?.toDate?.() || new Date(),
      } as InteractionLog;
    });
  });
}

/**
 * Get interaction statistics for monitoring
 * @returns Stats about interaction collection
 */
export async function getInteractionStats(): Promise<{
  totalCount: number;
  uniqueUsers: number;
  uniqueSkills: number;
  correctRate: number;
}> {
  return withErrorHandling('get interaction stats', async () => {
    // Get total count
    const countSnapshot = await adminDb.collection(COLLECTION).count().get();
    const totalCount = countSnapshot.data().count;

    // For unique counts, we'd need aggregation queries or Cloud Functions
    // For now, return total count and placeholder values
    return {
      totalCount,
      uniqueUsers: -1, // Requires aggregation
      uniqueSkills: -1, // Requires aggregation
      correctRate: -1, // Requires aggregation
    };
  });
}
