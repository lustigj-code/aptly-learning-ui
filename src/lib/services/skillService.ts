/**
 * Skill Service
 * Handles all Firestore operations for skill states (BKT)
 * Server-side only - uses firebase-admin SDK
 *
 * Collection structure:
 * skillStates/{userId}/skills/{skillId}
 *   - skillId: string
 *   - pMastery: number
 *   - attempts: number
 *   - correctCount: number
 *   - lastAttempt: timestamp
 *   - history: array (last 20 entries)
 */

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  type SkillState,
  type SkillHistoryEntry,
  createInitialState,
  isMastered,
  getReadySkills,
  DEFAULT_MASTERY_THRESHOLD,
} from '@/lib/mastery/bkt';
import { AI_AT_WORK_SKILL_MAP } from '@/data/skillMap';

// ============================================
// TYPES
// ============================================

interface FirestoreSkillState {
  skillId: string;
  pMastery: number;
  attempts: number;
  correctCount: number;
  lastAttempt: FirebaseFirestore.Timestamp | null;
  history: Array<{
    timestamp: FirebaseFirestore.Timestamp;
    correct: boolean;
    pMasteryAfter: number;
  }>;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Convert Firestore document to SkillState
 */
function firestoreToSkillState(
  doc: FirebaseFirestore.DocumentSnapshot
): SkillState | null {
  if (!doc.exists) return null;

  const data = doc.data() as FirestoreSkillState;
  if (!data) return null;

  return {
    skillId: data.skillId || doc.id,
    pMastery: data.pMastery ?? 0,
    attempts: data.attempts ?? 0,
    correctCount: data.correctCount ?? 0,
    lastAttempt: data.lastAttempt?.toDate() ?? new Date(),
    history: (data.history || []).map((h) => ({
      timestamp: h.timestamp?.toDate() ?? new Date(),
      correct: h.correct ?? false,
      pMasteryAfter: h.pMasteryAfter ?? 0,
    })),
  };
}

/**
 * Convert SkillState to Firestore document format
 */
function skillStateToFirestore(
  state: SkillState
): Omit<FirestoreSkillState, 'lastAttempt' | 'history'> & {
  lastAttempt: FirebaseFirestore.FieldValue;
  history: Array<{
    timestamp: FirebaseFirestore.FieldValue | Date;
    correct: boolean;
    pMasteryAfter: number;
  }>;
} {
  return {
    skillId: state.skillId,
    pMastery: state.pMastery,
    attempts: state.attempts,
    correctCount: state.correctCount,
    lastAttempt: FieldValue.serverTimestamp(),
    history: state.history.slice(-20).map((h) => ({
      timestamp: h.timestamp,
      correct: h.correct,
      pMasteryAfter: h.pMasteryAfter,
    })),
  };
}

// ============================================
// MAIN SERVICE FUNCTIONS
// ============================================

/**
 * Get skill state for a user and skill
 * @param userId - User's Firebase UID
 * @param skillId - Skill ID
 * @returns SkillState or null if not found
 */
export async function getSkillState(
  userId: string,
  skillId: string
): Promise<SkillState | null> {
  try {
    if (!userId || !skillId) {
      throw new Error('User ID and Skill ID are required');
    }

    const doc = await adminDb
      .collection('skillStates')
      .doc(userId)
      .collection('skills')
      .doc(skillId)
      .get();

    return firestoreToSkillState(doc);
  } catch (error) {
    console.error(`Error getting skill state for ${userId}/${skillId}:`, error);
    throw new Error(
      `Failed to get skill state: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get all skill states for a user
 * @param userId - User's Firebase UID
 * @returns Array of SkillState
 */
export async function getAllSkillStates(userId: string): Promise<SkillState[]> {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const snapshot = await adminDb
      .collection('skillStates')
      .doc(userId)
      .collection('skills')
      .get();

    const states: SkillState[] = [];

    for (const doc of snapshot.docs) {
      const state = firestoreToSkillState(doc);
      if (state) {
        states.push(state);
      }
    }

    return states;
  } catch (error) {
    console.error(`Error getting all skill states for ${userId}:`, error);
    throw new Error(
      `Failed to get skill states: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get skill states as a record (keyed by skillId)
 * @param userId - User's Firebase UID
 * @returns Record of skillId to SkillState
 */
export async function getSkillStatesRecord(
  userId: string
): Promise<Record<string, SkillState>> {
  const states = await getAllSkillStates(userId);
  const record: Record<string, SkillState> = {};

  for (const state of states) {
    record[state.skillId] = state;
  }

  return record;
}

/**
 * Update (or create) a skill state in Firestore
 * @param userId - User's Firebase UID
 * @param skillId - Skill ID
 * @param state - The updated SkillState
 */
export async function updateSkillState(
  userId: string,
  skillId: string,
  state: SkillState
): Promise<void> {
  try {
    if (!userId || !skillId || !state) {
      throw new Error('User ID, Skill ID, and state are required');
    }

    const firestoreData = skillStateToFirestore(state);

    await adminDb
      .collection('skillStates')
      .doc(userId)
      .collection('skills')
      .doc(skillId)
      .set(firestoreData, { merge: true });
  } catch (error) {
    console.error(`Error updating skill state for ${userId}/${skillId}:`, error);
    throw new Error(
      `Failed to update skill state: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Batch update multiple skill states
 * @param userId - User's Firebase UID
 * @param states - Array of SkillState to update
 */
export async function batchUpdateSkillStates(
  userId: string,
  states: SkillState[]
): Promise<void> {
  try {
    if (!userId || !states || states.length === 0) {
      throw new Error('User ID and at least one state are required');
    }

    const batch = adminDb.batch();

    for (const state of states) {
      const docRef = adminDb
        .collection('skillStates')
        .doc(userId)
        .collection('skills')
        .doc(state.skillId);

      const firestoreData = skillStateToFirestore(state);
      batch.set(docRef, firestoreData, { merge: true });
    }

    await batch.commit();
  } catch (error) {
    console.error(`Error batch updating skill states for ${userId}:`, error);
    throw new Error(
      `Failed to batch update skill states: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get all mastered skills for a user
 * @param userId - User's Firebase UID
 * @param threshold - Mastery threshold (default 0.95)
 * @returns Array of skill IDs that are mastered
 */
export async function getMasteredSkills(
  userId: string,
  threshold: number = DEFAULT_MASTERY_THRESHOLD
): Promise<string[]> {
  try {
    const states = await getAllSkillStates(userId);

    return states
      .filter((state) => isMastered(state, threshold))
      .map((state) => state.skillId);
  } catch (error) {
    console.error(`Error getting mastered skills for ${userId}:`, error);
    throw new Error(
      `Failed to get mastered skills: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get skills user is ready to learn (prerequisites mastered, not yet mastered)
 * @param userId - User's Firebase UID
 * @returns Array of skill IDs ready to learn
 */
export async function getReadyToLearnSkills(userId: string): Promise<string[]> {
  try {
    const statesRecord = await getSkillStatesRecord(userId);

    return getReadySkills(AI_AT_WORK_SKILL_MAP, statesRecord, DEFAULT_MASTERY_THRESHOLD);
  } catch (error) {
    console.error(`Error getting ready to learn skills for ${userId}:`, error);
    throw new Error(
      `Failed to get ready skills: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Initialize all skill states for a user (with default initial values)
 * Useful for onboarding a new user
 * @param userId - User's Firebase UID
 */
export async function initializeSkillStates(userId: string): Promise<void> {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const batch = adminDb.batch();

    for (const [skillId, skill] of Object.entries(AI_AT_WORK_SKILL_MAP.skills)) {
      const initialState = createInitialState(skillId, skill.bktParams);
      const docRef = adminDb
        .collection('skillStates')
        .doc(userId)
        .collection('skills')
        .doc(skillId);

      const firestoreData = skillStateToFirestore(initialState);
      batch.set(docRef, firestoreData);
    }

    await batch.commit();
  } catch (error) {
    console.error(`Error initializing skill states for ${userId}:`, error);
    throw new Error(
      `Failed to initialize skill states: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get or create a skill state (returns existing or creates initial)
 * @param userId - User's Firebase UID
 * @param skillId - Skill ID
 * @returns SkillState (existing or newly created)
 */
export async function getOrCreateSkillState(
  userId: string,
  skillId: string
): Promise<SkillState> {
  try {
    const existing = await getSkillState(userId, skillId);

    if (existing) {
      return existing;
    }

    // Create initial state
    const skill = AI_AT_WORK_SKILL_MAP.skills[skillId];
    const params = skill?.bktParams;
    const initialState = createInitialState(skillId, params);

    await updateSkillState(userId, skillId, initialState);

    return initialState;
  } catch (error) {
    console.error(`Error getting/creating skill state for ${userId}/${skillId}:`, error);
    throw new Error(
      `Failed to get/create skill state: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Delete all skill states for a user
 * @param userId - User's Firebase UID
 */
export async function deleteAllSkillStates(userId: string): Promise<void> {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const snapshot = await adminDb
      .collection('skillStates')
      .doc(userId)
      .collection('skills')
      .get();

    const batch = adminDb.batch();

    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
    }

    await batch.commit();
  } catch (error) {
    console.error(`Error deleting skill states for ${userId}:`, error);
    throw new Error(
      `Failed to delete skill states: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get skill mastery summary for a user
 * @param userId - User's Firebase UID
 * @returns Summary object with counts
 */
export async function getSkillMasterySummary(userId: string): Promise<{
  total: number;
  mastered: number;
  learning: number;
  notStarted: number;
  averageMastery: number;
}> {
  try {
    const states = await getAllSkillStates(userId);
    const totalSkills = Object.keys(AI_AT_WORK_SKILL_MAP.skills).length;
    const statesById = new Map(states.map((s) => [s.skillId, s]));

    let mastered = 0;
    let learning = 0;
    let notStarted = 0;
    let totalMastery = 0;
    let statesWithMastery = 0;

    for (const skillId of Object.keys(AI_AT_WORK_SKILL_MAP.skills)) {
      const state = statesById.get(skillId);

      if (!state || state.attempts === 0) {
        notStarted++;
      } else if (isMastered(state)) {
        mastered++;
        totalMastery += state.pMastery;
        statesWithMastery++;
      } else {
        learning++;
        totalMastery += state.pMastery;
        statesWithMastery++;
      }
    }

    const averageMastery = statesWithMastery > 0 ? totalMastery / statesWithMastery : 0;

    return {
      total: totalSkills,
      mastered,
      learning,
      notStarted,
      averageMastery,
    };
  } catch (error) {
    console.error(`Error getting skill mastery summary for ${userId}:`, error);
    throw new Error(
      `Failed to get skill summary: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
