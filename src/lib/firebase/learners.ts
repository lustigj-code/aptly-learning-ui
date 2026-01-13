/**
 * Learner Data Access Layer
 *
 * Single source of truth for all learner data operations.
 * All reads/writes to learners/{userId}/* go through this module.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import type {
  LearnerProgress,
  ConceptMastery,
  LearningSession,
  ResumeState,
  StreakData,
  DEFAULT_LEARNER_PROGRESS,
  DEFAULT_FSRS,
  DEFAULT_BKT,
} from './schema';
import { getMasteryLevel, SMM_SKILLS } from './schema';

// ═══════════════════════════════════════════════════════════════════════════
// PROGRESS OPERATIONS - learners/{userId}/progress
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get learner progress document
 * Returns null if not found (new user)
 */
export async function getLearnerProgress(userId: string): Promise<LearnerProgress | null> {
  if (!db) return null;

  const docRef = doc(db, 'learners', userId, 'data', 'progress');
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return docSnap.data() as LearnerProgress;
}

/**
 * Initialize learner progress for new user
 */
export async function initializeLearnerProgress(userId: string): Promise<LearnerProgress> {
  if (!db) throw new Error('Firestore not initialized');

  const progress: LearnerProgress = {
    currentCourseId: 'course-1',
    currentModuleId: 'c1-m1',
    currentLessonId: 'c1-m1-l1',
    currentAtomId: '',
    resumeState: null,
    atomsCompleted: [],
    lessonsCompleted: [],
    modulesCompleted: [],
    coursesCompleted: [],
    totalXP: 0,
    currentLevel: 1,
    totalTimeMinutes: 0,
    lastActiveAt: Timestamp.now(),
    streak: {
      current: 0,
      longest: 0,
      lastDate: '',
      freezesLeft: 2,
      history: [],
    },
    avgMastery: 0,
    learningVelocity: 0,
    struggleScore: 0,
    engagementScore: 0,
  };

  const docRef = doc(db, 'learners', userId, 'data', 'progress');
  await setDoc(docRef, progress);

  return progress;
}

/**
 * Get or create learner progress
 */
export async function getOrCreateLearnerProgress(userId: string): Promise<LearnerProgress> {
  const existing = await getLearnerProgress(userId);
  if (existing) return existing;
  return initializeLearnerProgress(userId);
}

/**
 * Update current position (for resume functionality)
 */
export async function updateCurrentPosition(
  userId: string,
  position: {
    courseId: string;
    moduleId: string;
    lessonId: string;
    atomId: string;
  }
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const docRef = doc(db, 'learners', userId, 'data', 'progress');
  await updateDoc(docRef, {
    currentCourseId: position.courseId,
    currentModuleId: position.moduleId,
    currentLessonId: position.lessonId,
    currentAtomId: position.atomId,
    lastActiveAt: serverTimestamp(),
  });
}

/**
 * Update resume state (for mid-content resume)
 */
export async function updateResumeState(
  userId: string,
  resumeState: Omit<ResumeState, 'lastUpdated'>
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const docRef = doc(db, 'learners', userId, 'data', 'progress');
  await updateDoc(docRef, {
    resumeState: {
      ...resumeState,
      lastUpdated: serverTimestamp(),
    },
    lastActiveAt: serverTimestamp(),
  });
}

/**
 * Clear resume state (after completing an atom)
 */
export async function clearResumeState(userId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const docRef = doc(db, 'learners', userId, 'data', 'progress');
  await updateDoc(docRef, {
    resumeState: null,
    lastActiveAt: serverTimestamp(),
  });
}

/**
 * Mark atom as completed and update progress
 */
export async function markAtomCompleted(
  userId: string,
  atomId: string,
  xpEarned: number = 25
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const progress = await getLearnerProgress(userId);
  if (!progress) throw new Error('Learner progress not found');

  // Don't add if already completed
  if (progress.atomsCompleted.includes(atomId)) return;

  const docRef = doc(db, 'learners', userId, 'data', 'progress');
  await updateDoc(docRef, {
    atomsCompleted: [...progress.atomsCompleted, atomId],
    totalXP: progress.totalXP + xpEarned,
    lastActiveAt: serverTimestamp(),
    resumeState: null, // Clear resume state after completion
  });
}

/**
 * Mark lesson as completed
 */
export async function markLessonCompleted(userId: string, lessonId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const progress = await getLearnerProgress(userId);
  if (!progress) throw new Error('Learner progress not found');

  if (progress.lessonsCompleted.includes(lessonId)) return;

  const docRef = doc(db, 'learners', userId, 'data', 'progress');
  await updateDoc(docRef, {
    lessonsCompleted: [...progress.lessonsCompleted, lessonId],
    lastActiveAt: serverTimestamp(),
  });
}

/**
 * Update streak data
 */
export async function updateStreak(userId: string, streakData: StreakData): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const docRef = doc(db, 'learners', userId, 'data', 'progress');
  await updateDoc(docRef, {
    streak: streakData,
    lastActiveAt: serverTimestamp(),
  });
}

/**
 * Add time spent to total
 */
export async function addTimeSpent(userId: string, minutes: number): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const progress = await getLearnerProgress(userId);
  if (!progress) throw new Error('Learner progress not found');

  const docRef = doc(db, 'learners', userId, 'data', 'progress');
  await updateDoc(docRef, {
    totalTimeMinutes: progress.totalTimeMinutes + minutes,
    lastActiveAt: serverTimestamp(),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// MASTERY OPERATIONS - learners/{userId}/mastery/{conceptId}
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get mastery for a specific concept
 */
export async function getConceptMastery(
  userId: string,
  conceptId: string
): Promise<ConceptMastery | null> {
  if (!db) return null;

  const docRef = doc(db, 'learners', userId, 'mastery', conceptId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return docSnap.data() as ConceptMastery;
}

/**
 * Get all concept masteries for a user
 */
export async function getAllConceptMasteries(userId: string): Promise<ConceptMastery[]> {
  if (!db) return [];

  const collRef = collection(db, 'learners', userId, 'mastery');
  const querySnap = await getDocs(collRef);

  return querySnap.docs.map((doc) => doc.data() as ConceptMastery);
}

/**
 * Initialize or update concept mastery after an attempt
 */
export async function updateConceptMastery(
  userId: string,
  conceptId: string,
  update: {
    isCorrect: boolean;
    responseTimeMs: number;
    pMasteryAfter: number;
  }
): Promise<ConceptMastery> {
  if (!db) throw new Error('Firestore not initialized');

  const existing = await getConceptMastery(userId, conceptId);
  const now = Timestamp.now();

  if (!existing) {
    // Create new mastery record
    const newMastery: ConceptMastery = {
      conceptId,
      conceptName: SMM_SKILLS[conceptId] || conceptId,
      pMastery: update.pMasteryAfter,
      masteryLevel: getMasteryLevel(update.pMasteryAfter),
      fsrs: {
        stability: update.isCorrect ? 1 : 0.1,
        difficulty: 5,
        nextReviewAt: now,
        state: 'learning',
        reps: 1,
        lapses: update.isCorrect ? 0 : 1,
      },
      bkt: {
        pLearn: 0.3,
        pGuess: 0.2,
        pSlip: 0.1,
        attempts: 1,
        correctCount: update.isCorrect ? 1 : 0,
      },
      history: [
        {
          timestamp: now,
          correct: update.isCorrect,
          pMasteryAfter: update.pMasteryAfter,
          responseTimeMs: update.responseTimeMs,
        },
      ],
      lastAttempt: now,
      updatedAt: now,
    };

    const docRef = doc(db, 'learners', userId, 'mastery', conceptId);
    await setDoc(docRef, newMastery);
    return newMastery;
  }

  // Update existing mastery
  const updatedHistory = [
    ...existing.history,
    {
      timestamp: now,
      correct: update.isCorrect,
      pMasteryAfter: update.pMasteryAfter,
      responseTimeMs: update.responseTimeMs,
    },
  ].slice(-50); // Keep last 50 entries

  const updatedMastery: Partial<ConceptMastery> = {
    pMastery: update.pMasteryAfter,
    masteryLevel: getMasteryLevel(update.pMasteryAfter),
    bkt: {
      ...existing.bkt,
      attempts: existing.bkt.attempts + 1,
      correctCount: existing.bkt.correctCount + (update.isCorrect ? 1 : 0),
    },
    fsrs: {
      ...existing.fsrs,
      reps: existing.fsrs.reps + 1,
      lapses: existing.fsrs.lapses + (update.isCorrect ? 0 : 1),
    },
    history: updatedHistory,
    lastAttempt: now,
    updatedAt: now,
  };

  const docRef = doc(db, 'learners', userId, 'mastery', conceptId);
  await updateDoc(docRef, updatedMastery);

  return { ...existing, ...updatedMastery } as ConceptMastery;
}

// ═══════════════════════════════════════════════════════════════════════════
// SESSION OPERATIONS - learners/{userId}/sessions/{sessionId}
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get active session (if any)
 */
export async function getActiveSession(userId: string): Promise<LearningSession | null> {
  if (!db) return null;

  const collRef = collection(db, 'learners', userId, 'sessions');
  const q = query(collRef, where('endedAt', '==', null), orderBy('startedAt', 'desc'), limit(1));

  const querySnap = await getDocs(q);
  if (querySnap.empty) return null;

  return querySnap.docs[0].data() as LearningSession;
}

/**
 * Create a new learning session
 */
export async function createSession(
  userId: string,
  deviceInfo: { deviceType: 'mobile' | 'tablet' | 'desktop'; userAgent: string }
): Promise<LearningSession> {
  if (!db) throw new Error('Firestore not initialized');

  const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const session: LearningSession = {
    sessionId,
    startedAt: Timestamp.now(),
    endedAt: null,
    durationMinutes: 0,
    atomsViewed: [],
    atomsCompleted: [],
    conceptsTouched: [],
    activeTimeMinutes: 0,
    idleTimeMinutes: 0,
    questionsAttempted: 0,
    questionsCorrect: 0,
    avgResponseTimeMs: 0,
    hintsRequested: 0,
    retryCount: 0,
    struggleEvents: 0,
    ...deviceInfo,
  };

  const docRef = doc(db, 'learners', userId, 'sessions', sessionId);
  await setDoc(docRef, session);

  return session;
}

/**
 * End a learning session
 */
export async function endSession(userId: string, sessionId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const docRef = doc(db, 'learners', userId, 'sessions', sessionId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return;

  const session = docSnap.data() as LearningSession;
  const now = Timestamp.now();
  const durationMinutes = Math.round(
    (now.toMillis() - session.startedAt.toMillis()) / (1000 * 60)
  );

  await updateDoc(docRef, {
    endedAt: now,
    durationMinutes,
  });
}

/**
 * Update session metrics
 */
export async function updateSessionMetrics(
  userId: string,
  sessionId: string,
  metrics: Partial<
    Pick<
      LearningSession,
      | 'atomsViewed'
      | 'atomsCompleted'
      | 'conceptsTouched'
      | 'questionsAttempted'
      | 'questionsCorrect'
      | 'hintsRequested'
      | 'retryCount'
      | 'struggleEvents'
    >
  >
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const docRef = doc(db, 'learners', userId, 'sessions', sessionId);
  await updateDoc(docRef, metrics);
}

/**
 * Get or create active session
 */
export async function getOrCreateActiveSession(
  userId: string,
  deviceInfo: { deviceType: 'mobile' | 'tablet' | 'desktop'; userAgent: string }
): Promise<LearningSession> {
  const existing = await getActiveSession(userId);
  if (existing) return existing;
  return createSession(userId, deviceInfo);
}
