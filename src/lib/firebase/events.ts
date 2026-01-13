/**
 * Events Data Access Layer
 *
 * Logging layer for all learning events:
 * - interactions: Quiz answers, practice responses (ML training data)
 * - engagement: Video watch, reading analytics
 * - struggles: Intervention triggers
 */

import {
  doc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import type {
  InteractionEvent,
  EngagementEvent,
  StruggleEvent,
  AtomType,
  InteractionType,
  EngagementType,
  StruggleType,
  StruggeSeverity,
  VideoMetrics,
  ReadingMetrics,
} from './schema';

// Generate unique event ID
function generateEventId(): string {
  return `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERACTION EVENTS - events/interactions/{eventId}
// ═══════════════════════════════════════════════════════════════════════════

export type LogInteractionParams = {
  userId: string;
  sessionId: string;
  courseId: string;
  moduleId: string;
  lessonId: string;
  atomId: string;
  atomType: AtomType;
  conceptId: string;
  questionId?: string;
  type: InteractionType;
  isCorrect: boolean | null;
  selectedAnswer?: string;
  correctAnswer?: string;
  responseTimeMs: number;
  timeSinceLastAttempt?: number;
  pMasteryBefore: number;
  pMasteryAfter: number;
  attemptNumber: number;
  consecutiveWrong: number;
  questionDifficulty?: number;
  userAbilityEstimate?: number;
};

/**
 * Log a learning interaction (quiz answer, practice submit, etc.)
 * This is the primary ML training data source
 */
export async function logInteraction(params: LogInteractionParams): Promise<string> {
  if (!db) throw new Error('Firestore not initialized');

  const eventId = generateEventId();

  const event: InteractionEvent = {
    eventId,
    userId: params.userId,
    sessionId: params.sessionId,
    courseId: params.courseId,
    moduleId: params.moduleId,
    lessonId: params.lessonId,
    atomId: params.atomId,
    atomType: params.atomType,
    conceptId: params.conceptId,
    questionId: params.questionId || null,
    type: params.type,
    isCorrect: params.isCorrect,
    selectedAnswer: params.selectedAnswer || null,
    correctAnswer: params.correctAnswer || null,
    timestamp: Timestamp.now(),
    responseTimeMs: params.responseTimeMs,
    timeSinceLastAttempt: params.timeSinceLastAttempt || null,
    pMasteryBefore: params.pMasteryBefore,
    pMasteryAfter: params.pMasteryAfter,
    attemptNumber: params.attemptNumber,
    consecutiveWrong: params.consecutiveWrong,
    questionDifficulty: params.questionDifficulty || null,
    userAbilityEstimate: params.userAbilityEstimate || null,
  };

  const docRef = doc(db, 'events', 'interactions', 'items', eventId);
  await setDoc(docRef, event);

  return eventId;
}

/**
 * Get recent interactions for a user (for prediction accuracy calculation)
 */
export async function getRecentInteractions(
  userId: string,
  limitCount: number = 100
): Promise<InteractionEvent[]> {
  if (!db) return [];

  const collRef = collection(db, 'events', 'interactions', 'items');
  const q = query(
    collRef,
    where('userId', '==', userId),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );

  const querySnap = await getDocs(q);
  return querySnap.docs.map((doc) => doc.data() as InteractionEvent);
}

/**
 * Get interactions for a specific concept (for learning curve analysis)
 */
export async function getConceptInteractions(
  userId: string,
  conceptId: string
): Promise<InteractionEvent[]> {
  if (!db) return [];

  const collRef = collection(db, 'events', 'interactions', 'items');
  const q = query(
    collRef,
    where('userId', '==', userId),
    where('conceptId', '==', conceptId),
    orderBy('timestamp', 'asc')
  );

  const querySnap = await getDocs(q);
  return querySnap.docs.map((doc) => doc.data() as InteractionEvent);
}

// ═══════════════════════════════════════════════════════════════════════════
// ENGAGEMENT EVENTS - events/engagement/{eventId}
// ═══════════════════════════════════════════════════════════════════════════

export type LogEngagementParams = {
  userId: string;
  sessionId: string;
  atomId: string;
  atomType: AtomType;
  type: EngagementType;
  videoMetrics?: VideoMetrics;
  readingMetrics?: ReadingMetrics;
};

/**
 * Log an engagement event (video watch, reading view, etc.)
 */
export async function logEngagement(params: LogEngagementParams): Promise<string> {
  if (!db) throw new Error('Firestore not initialized');

  const eventId = generateEventId();

  const event: EngagementEvent = {
    userId: params.userId,
    sessionId: params.sessionId,
    atomId: params.atomId,
    atomType: params.atomType,
    type: params.type,
    videoMetrics: params.videoMetrics || null,
    readingMetrics: params.readingMetrics || null,
    timestamp: Timestamp.now(),
  };

  const docRef = doc(db, 'events', 'engagement', 'items', eventId);
  await setDoc(docRef, event);

  return eventId;
}

/**
 * Log video watch progress
 */
export async function logVideoProgress(
  userId: string,
  sessionId: string,
  atomId: string,
  metrics: VideoMetrics
): Promise<string> {
  return logEngagement({
    userId,
    sessionId,
    atomId,
    atomType: 'video',
    type: 'video_watch',
    videoMetrics: metrics,
  });
}

/**
 * Log reading progress
 */
export async function logReadingProgress(
  userId: string,
  sessionId: string,
  atomId: string,
  metrics: ReadingMetrics
): Promise<string> {
  return logEngagement({
    userId,
    sessionId,
    atomId,
    atomType: 'reading',
    type: 'reading_view',
    readingMetrics: metrics,
  });
}

/**
 * Log content completion
 */
export async function logContentComplete(
  userId: string,
  sessionId: string,
  atomId: string,
  atomType: AtomType
): Promise<string> {
  return logEngagement({
    userId,
    sessionId,
    atomId,
    atomType,
    type: 'content_complete',
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// STRUGGLE EVENTS - events/struggles/{eventId}
// ═══════════════════════════════════════════════════════════════════════════

export type LogStruggleParams = {
  userId: string;
  sessionId: string;
  conceptId: string;
  atomId: string;
  type: StruggleType;
  severity: StruggeSeverity;
  consecutiveWrong: number;
  timeStuckMs: number;
  hintsUsed: number;
  pMasteryAtStruggle: number;
  interventionType?: string;
  interventionAccepted?: boolean;
};

/**
 * Log a struggle event (for intervention triggers)
 */
export async function logStruggle(params: LogStruggleParams): Promise<string> {
  if (!db) throw new Error('Firestore not initialized');

  const eventId = generateEventId();

  const event: StruggleEvent = {
    userId: params.userId,
    sessionId: params.sessionId,
    conceptId: params.conceptId,
    atomId: params.atomId,
    type: params.type,
    severity: params.severity,
    consecutiveWrong: params.consecutiveWrong,
    timeStuckMs: params.timeStuckMs,
    hintsUsed: params.hintsUsed,
    pMasteryAtStruggle: params.pMasteryAtStruggle,
    interventionType: params.interventionType || null,
    interventionAccepted: params.interventionAccepted ?? null,
    timestamp: Timestamp.now(),
  };

  const docRef = doc(db, 'events', 'struggles', 'items', eventId);
  await setDoc(docRef, event);

  return eventId;
}

/**
 * Get recent struggles for a user (for struggle score calculation)
 */
export async function getRecentStruggles(
  userId: string,
  limitCount: number = 20
): Promise<StruggleEvent[]> {
  if (!db) return [];

  const collRef = collection(db, 'events', 'struggles', 'items');
  const q = query(
    collRef,
    where('userId', '==', userId),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );

  const querySnap = await getDocs(q);
  return querySnap.docs.map((doc) => doc.data() as StruggleEvent);
}

// ═══════════════════════════════════════════════════════════════════════════
// STRUGGLE DETECTION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect if current state indicates struggle and log if needed
 */
export async function detectAndLogStruggle(
  userId: string,
  sessionId: string,
  conceptId: string,
  atomId: string,
  metrics: {
    consecutiveWrong: number;
    timeOnQuestionMs: number;
    hintsUsed: number;
    pMastery: number;
  }
): Promise<boolean> {
  // Struggle detection thresholds
  const CONSECUTIVE_WRONG_THRESHOLD = 3;
  const TIME_STUCK_THRESHOLD_MS = 60000; // 1 minute
  const HINTS_THRESHOLD = 2;

  let shouldLog = false;
  let type: StruggleType = 'multiple_wrong';
  let severity: StruggeSeverity = 'low';

  // Check for multiple wrong answers
  if (metrics.consecutiveWrong >= CONSECUTIVE_WRONG_THRESHOLD) {
    shouldLog = true;
    type = 'multiple_wrong';
    severity = metrics.consecutiveWrong >= 5 ? 'high' : 'medium';
  }

  // Check for being stuck
  if (metrics.timeOnQuestionMs >= TIME_STUCK_THRESHOLD_MS) {
    shouldLog = true;
    type = 'long_pause';
    severity =
      metrics.timeOnQuestionMs >= TIME_STUCK_THRESHOLD_MS * 2 ? 'high' : 'medium';
  }

  // Check for excessive hint usage
  if (metrics.hintsUsed >= HINTS_THRESHOLD) {
    shouldLog = true;
    type = 'hint_request';
    severity = metrics.hintsUsed >= 4 ? 'high' : 'medium';
  }

  if (shouldLog) {
    await logStruggle({
      userId,
      sessionId,
      conceptId,
      atomId,
      type,
      severity,
      consecutiveWrong: metrics.consecutiveWrong,
      timeStuckMs: metrics.timeOnQuestionMs,
      hintsUsed: metrics.hintsUsed,
      pMasteryAtStruggle: metrics.pMastery,
    });
  }

  return shouldLog;
}
