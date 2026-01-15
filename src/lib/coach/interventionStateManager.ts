/**
 * Intervention State Manager
 *
 * Manages intervention state persistence using Firestore.
 * Replaces the in-memory cache that was losing state on server restart.
 *
 * CRITICAL FIX: Previously used in-memory Map (line 60 of route.ts)
 * which lost state on serverless cold starts and deploys.
 *
 * Part of Phase 12: Socratic RAG Coach
 */

import { adminDb } from '@/lib/firebase/admin';
import {
  createInterventionState as createState,
  advanceTier as advanceStateTier,
  type InterventionState,
  type InterventionTier,
} from '@/lib/rag/interventionManager';

// ============================================
// TYPES
// ============================================

/**
 * Firestore document structure for intervention states
 */
export interface InterventionStateDocument {
  userId: string;
  conceptId: string;
  currentTier: InterventionTier;
  tier1Attempts: number;
  tier2Attempts: number;
  tier3Used: boolean;
  questionId?: string;
  startedAt: Date;
  lastInteractionAt: Date;
  updatedAt: Date;
}

// ============================================
// CONFIGURATION
// ============================================

const COLLECTION = 'interventionStates';

// Cache for reducing Firestore reads (short TTL for serverless)
const stateCache = new Map<string, { state: InterventionState; timestamp: number }>();
const CACHE_TTL_MS = 30000; // 30 seconds cache

/**
 * Generate document ID from userId and conceptId
 */
function getDocId(userId: string, conceptId: string): string {
  return `${userId}_${conceptId}`;
}

/**
 * Check if cached state is still valid
 */
function getCachedState(key: string): InterventionState | null {
  const cached = stateCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.state;
  }
  stateCache.delete(key);
  return null;
}

/**
 * Update cache with new state
 */
function setCachedState(key: string, state: InterventionState): void {
  stateCache.set(key, { state, timestamp: Date.now() });
}

// ============================================
// FIRESTORE OPERATIONS
// ============================================

/**
 * Get intervention state for a user and concept
 *
 * @param userId - User's Firebase UID
 * @param conceptId - Concept/skill identifier
 * @returns InterventionState or null if not found
 */
export async function getInterventionState(
  userId: string,
  conceptId: string
): Promise<InterventionState | null> {
  const docId = getDocId(userId, conceptId);

  // Check cache first
  const cached = getCachedState(docId);
  if (cached) {
    return cached;
  }

  // Safety check: if adminDb is not initialized, return null
  if (!adminDb) {
    console.warn('[InterventionStateManager] adminDb not initialized, returning null');
    return null;
  }

  try {
    const doc = await adminDb.collection(COLLECTION).doc(docId).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data() as InterventionStateDocument;

    const state: InterventionState = {
      currentTier: data.currentTier,
      tier1Attempts: data.tier1Attempts,
      tier2Attempts: data.tier2Attempts,
      tier3Used: data.tier3Used,
      conceptId: data.conceptId,
      questionId: data.questionId,
      startedAt: data.startedAt instanceof Date ? data.startedAt : data.startedAt,
      lastInteractionAt:
        data.lastInteractionAt instanceof Date
          ? data.lastInteractionAt
          : data.lastInteractionAt,
    };

    // Handle Firestore Timestamp conversion
    if (data.startedAt && typeof (data.startedAt as unknown as { toDate: () => Date }).toDate === 'function') {
      state.startedAt = (data.startedAt as unknown as { toDate: () => Date }).toDate();
    }
    if (data.lastInteractionAt && typeof (data.lastInteractionAt as unknown as { toDate: () => Date }).toDate === 'function') {
      state.lastInteractionAt = (data.lastInteractionAt as unknown as { toDate: () => Date }).toDate();
    }

    setCachedState(docId, state);
    return state;
  } catch (error) {
    console.error('[InterventionStateManager] Error getting state:', error);
    return null;
  }
}

/**
 * Get or create intervention state
 *
 * Creates new state if none exists for the user/concept combination
 * CRITICAL: Returns default state on any error to prevent AI response failures
 *
 * @param userId - User's Firebase UID
 * @param conceptId - Concept/skill identifier
 * @param questionId - Optional specific question ID
 * @returns InterventionState (existing or newly created)
 */
export async function getOrCreateInterventionState(
  userId: string,
  conceptId: string,
  questionId?: string
): Promise<InterventionState> {
  try {
    const existing = await getInterventionState(userId, conceptId);

    if (existing) {
      return existing;
    }

    // Create new state
    const newState = createState(conceptId, questionId);

    // Try to save, but don't fail if Firestore is unavailable
    try {
      await saveInterventionState(userId, newState);
    } catch (saveError) {
      console.warn('[InterventionStateManager] Could not save state (Firestore may be unavailable):', saveError);
      // Continue with in-memory state
    }

    return newState;
  } catch (error) {
    console.error('[InterventionStateManager] Error in getOrCreateInterventionState:', error);
    // Return default tier 1 state to allow AI to still respond
    console.log('[InterventionStateManager] Returning default state to allow AI response');
    return createState(conceptId, questionId);
  }
}

/**
 * Save intervention state to Firestore
 * NOTE: Does not throw on error - logs warning and continues
 * This prevents AI response failures when Firestore is unavailable
 *
 * @param userId - User's Firebase UID
 * @param state - InterventionState to save
 */
export async function saveInterventionState(
  userId: string,
  state: InterventionState
): Promise<void> {
  const docId = getDocId(userId, state.conceptId);

  // Safety check: if adminDb is not initialized, just cache locally
  if (!adminDb) {
    console.warn('[InterventionStateManager] adminDb not initialized, caching locally only');
    setCachedState(docId, state);
    return;
  }

  try {
    // Build document without undefined values (Firestore doesn't accept undefined)
    const document: Partial<InterventionStateDocument> = {
      userId,
      conceptId: state.conceptId,
      currentTier: state.currentTier,
      tier1Attempts: state.tier1Attempts,
      tier2Attempts: state.tier2Attempts,
      tier3Used: state.tier3Used,
      startedAt: state.startedAt,
      lastInteractionAt: state.lastInteractionAt,
      updatedAt: new Date(),
    };

    // Only add questionId if defined
    if (state.questionId !== undefined) {
      document.questionId = state.questionId;
    }

    await adminDb.collection(COLLECTION).doc(docId).set(document, { merge: true });

    // Update cache
    setCachedState(docId, state);
  } catch (error) {
    // Don't throw - just log and continue (allows AI to still respond)
    console.warn('[InterventionStateManager] Error saving state (non-fatal):', error);
    // Still update local cache even if Firestore fails
    setCachedState(docId, state);
  }
}

/**
 * Escalate intervention tier
 *
 * Advances the tier based on student struggle and saves to Firestore
 *
 * @param userId - User's Firebase UID
 * @param conceptId - Concept/skill identifier
 * @returns Updated InterventionState
 */
export async function escalateIntervention(
  userId: string,
  conceptId: string
): Promise<InterventionState> {
  const current = await getOrCreateInterventionState(userId, conceptId);
  const newState = advanceStateTier(current);

  await saveInterventionState(userId, newState);

  console.log('[InterventionStateManager] Escalated intervention:', {
    userId,
    conceptId,
    previousTier: current.currentTier,
    newTier: newState.currentTier,
  });

  return newState;
}

/**
 * Reset intervention state (e.g., when student gets it right)
 *
 * @param userId - User's Firebase UID
 * @param conceptId - Concept/skill identifier
 */
export async function resetInterventionState(
  userId: string,
  conceptId: string
): Promise<void> {
  const docId = getDocId(userId, conceptId);

  try {
    await adminDb.collection(COLLECTION).doc(docId).delete();

    // Clear from cache
    stateCache.delete(docId);

    console.log('[InterventionStateManager] Reset intervention state:', {
      userId,
      conceptId,
    });
  } catch (error) {
    console.error('[InterventionStateManager] Error resetting state:', error);
    throw new Error(`Failed to reset intervention state: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get all intervention states for a user
 *
 * Useful for analytics and user progress dashboards
 *
 * @param userId - User's Firebase UID
 * @returns Array of InterventionState objects
 */
export async function getUserInterventionStates(
  userId: string
): Promise<InterventionState[]> {
  try {
    const snapshot = await adminDb
      .collection(COLLECTION)
      .where('userId', '==', userId)
      .orderBy('lastInteractionAt', 'desc')
      .limit(50)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data() as InterventionStateDocument;
      return {
        currentTier: data.currentTier,
        tier1Attempts: data.tier1Attempts,
        tier2Attempts: data.tier2Attempts,
        tier3Used: data.tier3Used,
        conceptId: data.conceptId,
        questionId: data.questionId,
        startedAt: (data.startedAt as unknown as { toDate?: () => Date }).toDate?.() || data.startedAt,
        lastInteractionAt: (data.lastInteractionAt as unknown as { toDate?: () => Date }).toDate?.() || data.lastInteractionAt,
      } as InterventionState;
    });
  } catch (error) {
    console.error('[InterventionStateManager] Error getting user states:', error);
    return [];
  }
}

/**
 * Batch cleanup of stale intervention states
 *
 * Removes states older than specified days (for maintenance)
 *
 * @param daysOld - Delete states older than this many days
 * @returns Number of deleted documents
 */
export async function cleanupStaleStates(daysOld: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  try {
    const snapshot = await adminDb
      .collection(COLLECTION)
      .where('lastInteractionAt', '<', cutoffDate)
      .limit(500)
      .get();

    if (snapshot.empty) {
      return 0;
    }

    const batch = adminDb.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    console.log(`[InterventionStateManager] Cleaned up ${snapshot.size} stale states`);
    return snapshot.size;
  } catch (error) {
    console.error('[InterventionStateManager] Error cleaning up states:', error);
    return 0;
  }
}

/**
 * Clear cache (useful for testing)
 */
export function clearCache(): void {
  stateCache.clear();
}
