/**
 * Conversation Logger for Training Data Collection
 *
 * Captures and analyzes tutoring conversations in real-time,
 * computing quality metrics and preparing data for model training.
 */

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  type TutoringSession,
  type ConversationTurn,
  type TurnMetadata,
  type UserLearningState,
  type LearningOutcome,
  calculateQualityMetrics,
  createEmptyTurnMetadata,
} from './schema';

// ============================================
// TURN ANALYSIS
// ============================================

/**
 * Analyze a tutor response for Socratic method adherence
 */
export function analyzeTutorResponse(content: string): Partial<TurnMetadata> {
  const lowerContent = content.toLowerCase();

  // Check for question ending
  const sentences = content.split(/[.!?]+/).filter(s => s.trim());
  const lastSentence = sentences[sentences.length - 1] || '';
  const askedQuestion = lastSentence.includes('?') || content.trim().endsWith('?');

  // Check for Socratic patterns
  const socraticPatterns = [
    'what do you think',
    'why do you think',
    'how would you',
    'what if',
    'can you explain',
    'what might happen',
    'why might that be',
    'what does that tell you',
    'how does that connect',
    "let's think about",
    'consider this',
    'what comes to mind',
    'based on what you know',
  ];
  const isSocratic = socraticPatterns.some(p => lowerContent.includes(p)) || askedQuestion;

  // Check for direct answer patterns (bad)
  const directAnswerPatterns = [
    'the answer is',
    'it means',
    'this is called',
    'the definition is',
    'simply put,',
    'in other words,',
    'to put it simply',
  ];
  const gaveDirectAnswer = directAnswerPatterns.some(p => lowerContent.includes(p)) && !askedQuestion;

  // Check for examples
  const examplePatterns = [
    'for example',
    'for instance',
    'imagine',
    'let\'s say',
    'think about',
    'consider',
    'like when',
    'such as',
    'nike',
    'apple',
    'coca-cola',
    'amazon',
    'facebook',
    'instagram',
    'meta',
  ];
  const usedExample = examplePatterns.some(p => lowerContent.includes(p));

  // Check for emotional acknowledgment
  const emotionPatterns = [
    'i understand',
    'that\'s frustrating',
    'it\'s okay',
    'don\'t worry',
    'that\'s normal',
    'many people',
    'it\'s common',
    'you\'re not alone',
    'i hear you',
    'good question',
    'great question',
  ];
  const acknowledgedEmotion = emotionPatterns.some(p => lowerContent.includes(p));

  return {
    isSocratic,
    askedQuestion,
    gaveDirectAnswer,
    usedExample,
    acknowledgedEmotion,
    tokenCount: content.split(/\s+/).length,
  };
}

/**
 * Analyze a user message for learning signals
 */
export function analyzeUserMessage(content: string): Partial<TurnMetadata> {
  const lowerContent = content.toLowerCase();

  // Confusion signals
  const confusionPatterns = [
    "don't understand",
    "don't get it",
    "confused",
    "makes no sense",
    "what do you mean",
    "can you explain",
    "i'm lost",
    "not following",
    "huh?",
    "???",
  ];
  const expressedConfusion = confusionPatterns.some(p => lowerContent.includes(p));

  // Frustration signals
  const frustrationPatterns = [
    "frustrated",
    "annoying",
    "stupid",
    "hate",
    "ugh",
    "argh",
    "this is hard",
    "give up",
    "can't do this",
    "impossible",
  ];
  const expressedFrustration = frustrationPatterns.some(p => lowerContent.includes(p));

  // Help seeking
  const helpPatterns = [
    "help",
    "please",
    "can you",
    "tell me",
    "show me",
    "explain",
  ];
  const askedForHelp = helpPatterns.some(p => lowerContent.includes(p));

  // Understanding signals
  const understandingPatterns = [
    "oh!",
    "aha",
    "i see",
    "i get it",
    "makes sense",
    "got it",
    "so it's",
    "so that means",
    "i understand",
    "now i know",
    "that's why",
    "oh that's",
  ];
  const demonstratedUnderstanding = understandingPatterns.some(p => lowerContent.includes(p));

  return {
    expressedConfusion,
    expressedFrustration,
    askedForHelp,
    demonstratedUnderstanding,
    tokenCount: content.split(/\s+/).length,
  };
}

/**
 * Create a complete turn object
 */
export function createTurn(
  role: 'user' | 'tutor',
  content: string,
  responseTimeMs: number = 0
): ConversationTurn {
  const baseMetadata = createEmptyTurnMetadata();

  const analysis = role === 'tutor'
    ? analyzeTutorResponse(content)
    : analyzeUserMessage(content);

  return {
    role,
    content,
    timestamp: new Date(),
    metadata: {
      ...baseMetadata,
      ...analysis,
      responseTimeMs,
    },
  };
}

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Create a new tutoring session for logging
 */
export async function createTutoringSession(
  conversationId: string,
  userId: string,
  lessonId: string,
  lessonTitle: string,
  moduleId: string,
  courseId: string,
  userState: UserLearningState,
  atomId?: string,
  atomType?: 'reading' | 'video' | 'quiz' | 'practice'
): Promise<string> {
  const session: Omit<TutoringSession, 'id'> = {
    conversationId,
    userId,
    lessonId,
    lessonTitle,
    moduleId,
    courseId,
    atomId,
    atomType,
    turns: [],
    startedAt: new Date(),
    endedAt: new Date(),
    durationMinutes: 0,
    totalTurns: 0,
    userStateAtStart: userState,
    userStateAtEnd: userState,
    qualityMetrics: calculateQualityMetrics([]),
    outcomes: {
      demonstratedUnderstanding: false,
      completedAtom: false,
      neededMultipleAttempts: false,
      continuedLearning: false,
      returnedNextDay: false,
      overallOutcomeScore: 0,
    },
    exportedForTraining: false,
  };

  const docRef = await adminDb.collection('tutoring_sessions').add({
    ...session,
    startedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Add a turn to an existing session
 */
export async function addTurnToSession(
  sessionId: string,
  role: 'user' | 'tutor',
  content: string,
  responseTimeMs: number = 0
): Promise<void> {
  const turn = createTurn(role, content, responseTimeMs);

  await adminDb.collection('tutoring_sessions').doc(sessionId).update({
    turns: FieldValue.arrayUnion(turn),
    totalTurns: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Complete a tutoring session with outcomes
 */
export async function completeSession(
  sessionId: string,
  userStateAtEnd: UserLearningState,
  outcomes: Partial<LearningOutcome>
): Promise<void> {
  // Get current session to calculate metrics
  const sessionDoc = await adminDb.collection('tutoring_sessions').doc(sessionId).get();

  if (!sessionDoc.exists) {
    console.warn(`Session ${sessionId} not found`);
    return;
  }

  const sessionData = sessionDoc.data() as TutoringSession;
  const turns = sessionData.turns || [];

  // Calculate quality metrics
  const qualityMetrics = calculateQualityMetrics(turns);

  // Calculate duration
  const startTime = sessionData.startedAt instanceof Date
    ? sessionData.startedAt
    : new Date((sessionData.startedAt as { toDate: () => Date }).toDate());
  const durationMinutes = (Date.now() - startTime.getTime()) / (60 * 1000);

  // Calculate outcome score
  const overallOutcomeScore = calculateOutcomeScore(outcomes);

  // Check for understanding in conversation
  const demonstratedUnderstanding = turns.some(
    t => t.role === 'user' && t.metadata.demonstratedUnderstanding
  );

  const fullOutcomes: LearningOutcome = {
    demonstratedUnderstanding,
    completedAtom: outcomes.completedAtom || false,
    neededMultipleAttempts: turns.filter(t => t.role === 'user' && t.metadata.expressedConfusion).length > 2,
    continuedLearning: outcomes.continuedLearning || false,
    returnedNextDay: false, // Will be updated later
    overallOutcomeScore,
    ...outcomes,
  };

  await adminDb.collection('tutoring_sessions').doc(sessionId).update({
    endedAt: FieldValue.serverTimestamp(),
    durationMinutes,
    userStateAtEnd,
    qualityMetrics,
    outcomes: fullOutcomes,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Get a tutoring session by ID
 */
export async function getTutoringSession(sessionId: string): Promise<TutoringSession | null> {
  const doc = await adminDb.collection('tutoring_sessions').doc(sessionId).get();

  if (!doc.exists) {
    return null;
  }

  return {
    id: doc.id,
    ...doc.data(),
  } as TutoringSession;
}

/**
 * Find or create a session for a conversation
 */
export async function getOrCreateSession(
  conversationId: string,
  userId: string,
  lessonId: string,
  lessonTitle: string,
  moduleId: string,
  courseId: string,
  userState: UserLearningState,
  atomId?: string,
  atomType?: 'reading' | 'video' | 'quiz' | 'practice'
): Promise<string> {
  // Check for existing session for this conversation
  const existing = await adminDb
    .collection('tutoring_sessions')
    .where('conversationId', '==', conversationId)
    .where('exportedForTraining', '==', false)
    .limit(1)
    .get();

  if (!existing.empty) {
    return existing.docs[0].id;
  }

  // Create new session
  return createTutoringSession(
    conversationId,
    userId,
    lessonId,
    lessonTitle,
    moduleId,
    courseId,
    userState,
    atomId,
    atomType
  );
}

// ============================================
// BATCH OPERATIONS
// ============================================

/**
 * Update sessions with return behavior (run daily)
 */
export async function updateReturnBehavior(): Promise<number> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const endOfYesterday = new Date(yesterday);
  endOfYesterday.setHours(23, 59, 59, 999);

  // Get sessions from yesterday
  const sessionsSnapshot = await adminDb
    .collection('tutoring_sessions')
    .where('endedAt', '>=', yesterday)
    .where('endedAt', '<=', endOfYesterday)
    .get();

  let updatedCount = 0;

  for (const sessionDoc of sessionsSnapshot.docs) {
    const session = sessionDoc.data() as TutoringSession;

    // Check if user returned today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todaySession = await adminDb
      .collection('tutoring_sessions')
      .where('userId', '==', session.userId)
      .where('startedAt', '>=', todayStart)
      .limit(1)
      .get();

    if (!todaySession.empty) {
      await adminDb.collection('tutoring_sessions').doc(sessionDoc.id).update({
        'outcomes.returnedNextDay': true,
        'outcomes.overallOutcomeScore': calculateOutcomeScore({
          ...session.outcomes,
          returnedNextDay: true,
        }),
      });
      updatedCount++;
    }
  }

  return updatedCount;
}

/**
 * Get sessions ready for training export
 */
export async function getSessionsForExport(
  minQualityScore: number = 0.5,
  minOutcomeScore: number = 0.3,
  limit: number = 1000
): Promise<TutoringSession[]> {
  const snapshot = await adminDb
    .collection('tutoring_sessions')
    .where('exportedForTraining', '==', false)
    .where('totalTurns', '>=', 4)
    .orderBy('totalTurns', 'desc')
    .limit(limit)
    .get();

  const sessions: TutoringSession[] = [];

  for (const doc of snapshot.docs) {
    const session = {
      id: doc.id,
      ...doc.data(),
    } as TutoringSession;

    // Filter by quality
    if (session.qualityMetrics.socraticRatio >= minQualityScore &&
        session.outcomes.overallOutcomeScore >= minOutcomeScore) {
      sessions.push(session);
    }
  }

  return sessions;
}

/**
 * Mark sessions as exported
 */
export async function markSessionsExported(sessionIds: string[]): Promise<void> {
  const batch = adminDb.batch();

  for (const id of sessionIds) {
    const ref = adminDb.collection('tutoring_sessions').doc(id);
    batch.update(ref, {
      exportedForTraining: true,
      exportedAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
}
