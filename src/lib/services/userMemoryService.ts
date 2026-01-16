/**
 * User Memory Service
 *
 * Phase 4: Manages cross-session memory for AI coach personalization.
 * Stores key facts, learning preferences, and insights about users
 * in Firestore at: learners/{userId}/memory
 */

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type {
  UserMemory,
  MemoryFact,
  MemoryFactCategory,
  LearningStyle,
} from '@/lib/firebase/schema';
import { withErrorHandling, validateString } from '@/lib/errors/handlers';

// ============================================
// MEMORY CRUD OPERATIONS
// ============================================

/**
 * Get a user's memory document
 * @param uid - User's Firebase UID
 * @returns UserMemory or null if not found
 */
export async function getMemory(uid: string): Promise<UserMemory | null> {
  return withErrorHandling(`get memory for user ${uid}`, async () => {
    validateString('uid', uid);

    const doc = await adminDb.collection('learners').doc(uid).collection('memory').doc('facts').get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    if (!data) return null;

    return {
      keyFacts: (data.keyFacts || []).map((f: MemoryFact) => ({
        ...f,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      })),
      preferredStyle: data.preferredStyle,
      styleConfidence: data.styleConfidence,
      currentStruggles: data.currentStruggles || [],
      currentStrengths: data.currentStrengths || [],
      primaryGoal: data.primaryGoal,
      targetDate: data.targetDate,
      lastUpdated: data.lastUpdated,
      totalConversationsAnalyzed: data.totalConversationsAnalyzed || 0,
    } as UserMemory;
  });
}

/**
 * Initialize memory document for a user (if not exists)
 * @param uid - User's Firebase UID
 */
export async function initializeMemory(uid: string): Promise<void> {
  return withErrorHandling(`initialize memory for user ${uid}`, async () => {
    validateString('uid', uid);

    const docRef = adminDb.collection('learners').doc(uid).collection('memory').doc('facts');
    const doc = await docRef.get();

    if (!doc.exists) {
      await docRef.set({
        keyFacts: [],
        currentStruggles: [],
        currentStrengths: [],
        totalConversationsAnalyzed: 0,
        lastUpdated: FieldValue.serverTimestamp(),
      });
    }
  });
}

/**
 * Add a new fact to user's memory
 * @param uid - User's Firebase UID
 * @param fact - The fact text
 * @param category - Category of the fact
 * @param source - How the fact was learned (explicit or inferred)
 * @param confidence - Confidence level (0-1)
 * @param conversationId - Optional conversation where this was learned
 * @returns The new fact ID
 */
export async function addFact(
  uid: string,
  fact: string,
  category: MemoryFactCategory,
  source: 'explicit' | 'inferred' = 'inferred',
  confidence: number = 0.7,
  conversationId?: string
): Promise<string> {
  return withErrorHandling(`add fact for user ${uid}`, async () => {
    validateString('uid', uid);
    validateString('fact', fact);

    // Ensure memory document exists
    await initializeMemory(uid);

    const factId = `fact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newFact: Omit<MemoryFact, 'createdAt' | 'updatedAt'> & { createdAt: typeof FieldValue.serverTimestamp; updatedAt: typeof FieldValue.serverTimestamp } = {
      id: factId,
      fact,
      category,
      confidence: Math.max(0, Math.min(1, confidence)),
      source,
      createdAt: FieldValue.serverTimestamp() as unknown as typeof FieldValue.serverTimestamp,
      updatedAt: FieldValue.serverTimestamp() as unknown as typeof FieldValue.serverTimestamp,
      ...(conversationId && { conversationId }),
    };

    const docRef = adminDb.collection('learners').doc(uid).collection('memory').doc('facts');

    await docRef.update({
      keyFacts: FieldValue.arrayUnion(newFact),
      lastUpdated: FieldValue.serverTimestamp(),
    });

    return factId;
  });
}

/**
 * Update confidence for an existing fact
 * @param uid - User's Firebase UID
 * @param factId - The fact's ID
 * @param newConfidence - New confidence level (0-1)
 */
export async function updateFactConfidence(
  uid: string,
  factId: string,
  newConfidence: number
): Promise<void> {
  return withErrorHandling(`update fact confidence for user ${uid}`, async () => {
    validateString('uid', uid);
    validateString('factId', factId);

    const memory = await getMemory(uid);
    if (!memory) return;

    const updatedFacts = memory.keyFacts.map((f) =>
      f.id === factId
        ? { ...f, confidence: Math.max(0, Math.min(1, newConfidence)), updatedAt: new Date() }
        : f
    );

    const docRef = adminDb.collection('learners').doc(uid).collection('memory').doc('facts');
    await docRef.update({
      keyFacts: updatedFacts,
      lastUpdated: FieldValue.serverTimestamp(),
    });
  });
}

/**
 * Remove a fact from memory
 * @param uid - User's Firebase UID
 * @param factId - The fact's ID to remove
 */
export async function removeFact(uid: string, factId: string): Promise<void> {
  return withErrorHandling(`remove fact for user ${uid}`, async () => {
    validateString('uid', uid);
    validateString('factId', factId);

    const memory = await getMemory(uid);
    if (!memory) return;

    const updatedFacts = memory.keyFacts.filter((f) => f.id !== factId);

    const docRef = adminDb.collection('learners').doc(uid).collection('memory').doc('facts');
    await docRef.update({
      keyFacts: updatedFacts,
      lastUpdated: FieldValue.serverTimestamp(),
    });
  });
}

/**
 * Set the user's preferred learning style
 * @param uid - User's Firebase UID
 * @param style - The learning style
 * @param confidence - Confidence in this preference (0-1)
 */
export async function setLearningStyle(
  uid: string,
  style: LearningStyle,
  confidence: number = 0.7
): Promise<void> {
  return withErrorHandling(`set learning style for user ${uid}`, async () => {
    validateString('uid', uid);

    await initializeMemory(uid);

    const docRef = adminDb.collection('learners').doc(uid).collection('memory').doc('facts');
    await docRef.update({
      preferredStyle: style,
      styleConfidence: Math.max(0, Math.min(1, confidence)),
      lastUpdated: FieldValue.serverTimestamp(),
    });
  });
}

/**
 * Update struggles and strengths
 * @param uid - User's Firebase UID
 * @param struggles - Current struggle areas
 * @param strengths - Current strength areas
 */
export async function updateStruggleStrengths(
  uid: string,
  struggles: string[],
  strengths: string[]
): Promise<void> {
  return withErrorHandling(`update struggles/strengths for user ${uid}`, async () => {
    validateString('uid', uid);

    await initializeMemory(uid);

    const docRef = adminDb.collection('learners').doc(uid).collection('memory').doc('facts');
    await docRef.update({
      currentStruggles: struggles,
      currentStrengths: strengths,
      lastUpdated: FieldValue.serverTimestamp(),
    });
  });
}

/**
 * Set user's primary goal
 * @param uid - User's Firebase UID
 * @param goal - The goal text
 * @param targetDate - Optional target date
 */
export async function setGoal(
  uid: string,
  goal: string,
  targetDate?: Date
): Promise<void> {
  return withErrorHandling(`set goal for user ${uid}`, async () => {
    validateString('uid', uid);

    await initializeMemory(uid);

    const docRef = adminDb.collection('learners').doc(uid).collection('memory').doc('facts');
    const updateData: Record<string, unknown> = {
      primaryGoal: goal,
      lastUpdated: FieldValue.serverTimestamp(),
    };

    if (targetDate) {
      updateData.targetDate = targetDate;
    }

    await docRef.update(updateData);
  });
}

/**
 * Increment the count of analyzed conversations
 * @param uid - User's Firebase UID
 */
export async function incrementConversationsAnalyzed(uid: string): Promise<void> {
  return withErrorHandling(`increment conversations analyzed for user ${uid}`, async () => {
    validateString('uid', uid);

    await initializeMemory(uid);

    const docRef = adminDb.collection('learners').doc(uid).collection('memory').doc('facts');
    await docRef.update({
      totalConversationsAnalyzed: FieldValue.increment(1),
      lastUpdated: FieldValue.serverTimestamp(),
    });
  });
}

// ============================================
// QUERY HELPERS
// ============================================

/**
 * Get facts by category
 * @param uid - User's Firebase UID
 * @param category - Category to filter by
 */
export async function getFactsByCategory(
  uid: string,
  category: MemoryFactCategory
): Promise<MemoryFact[]> {
  const memory = await getMemory(uid);
  if (!memory) return [];

  return memory.keyFacts.filter((f) => f.category === category);
}

/**
 * Get high-confidence facts only (confidence >= threshold)
 * @param uid - User's Firebase UID
 * @param threshold - Minimum confidence level (default 0.7)
 */
export async function getHighConfidenceFacts(
  uid: string,
  threshold: number = 0.7
): Promise<MemoryFact[]> {
  const memory = await getMemory(uid);
  if (!memory) return [];

  return memory.keyFacts.filter((f) => f.confidence >= threshold);
}

/**
 * Build a summary of what we know about the user for context
 * @param uid - User's Firebase UID
 * @returns Formatted string for AI context
 */
export async function buildMemorySummary(uid: string): Promise<string | null> {
  const memory = await getMemory(uid);
  if (!memory) return null;

  const sections: string[] = [];

  // High-confidence facts
  const highConfFacts = memory.keyFacts.filter((f) => f.confidence >= 0.7);
  if (highConfFacts.length > 0) {
    const grouped: Record<string, string[]> = {};
    highConfFacts.forEach((f) => {
      if (!grouped[f.category]) grouped[f.category] = [];
      grouped[f.category].push(f.fact);
    });

    if (grouped.struggle?.length) {
      sections.push(`Struggles with: ${grouped.struggle.join(', ')}`);
    }
    if (grouped.strength?.length) {
      sections.push(`Strong at: ${grouped.strength.join(', ')}`);
    }
    if (grouped.preference?.length) {
      sections.push(`Preferences: ${grouped.preference.join(', ')}`);
    }
    if (grouped.goal?.length) {
      sections.push(`Goals: ${grouped.goal.join(', ')}`);
    }
    if (grouped.background?.length) {
      sections.push(`Background: ${grouped.background.join(', ')}`);
    }
  }

  // Learning style
  if (memory.preferredStyle && memory.styleConfidence && memory.styleConfidence >= 0.6) {
    sections.push(`Preferred learning style: ${memory.preferredStyle}`);
  }

  // Primary goal
  if (memory.primaryGoal) {
    sections.push(`Primary goal: ${memory.primaryGoal}`);
  }

  return sections.length > 0 ? sections.join('\n') : null;
}
