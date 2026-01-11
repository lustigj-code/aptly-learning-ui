/**
 * Delayed Retention Testing
 * Schedules and manages retention tests to prove learning actually sticks
 * Tests are scheduled 7 and 30 days after skill mastery
 */

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { trackRetentionTest } from '@/lib/analytics/events';

// ============================================
// TYPES
// ============================================

export interface RetentionTest {
  id: string;
  userId: string;
  skillIds: string[];
  scheduledFor: Date;
  status: 'scheduled' | 'available' | 'completed' | 'expired';
  delayDays: 7 | 30;
  originalMastery: Record<string, number>;  // Mastery at time of scheduling
  results?: RetentionResult;
  createdAt: Date;
  updatedAt: Date;
}

export interface RetentionResult {
  testDate: Date;
  scores: Record<string, number>;           // Score per skill (0-100)
  retention: Record<string, number>;        // % retained per skill
  overallRetention: number;                 // Average retention
  decay: Record<string, number>;            // originalMastery - currentScore
  questionsAnswered: number;
  correctAnswers: number;
  timeSpentMinutes: number;
}

export interface RetentionQuestion {
  id: string;
  skillId: string;
  question: string;
  options: string[];
  correctAnswer: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
}

export interface RetentionTestSession {
  testId: string;
  userId: string;
  questions: RetentionQuestion[];
  answers: Record<string, number>;          // questionId -> selectedAnswer
  startedAt: Date;
  completedAt?: Date;
}

// ============================================
// SCHEDULING FUNCTIONS
// ============================================

/**
 * Schedule a retention test for a user after skill mastery
 * Called automatically when skills reach 95% mastery
 */
export async function scheduleRetentionTest(
  userId: string,
  skillIds: string[],
  delayDays: 7 | 30,
  originalMastery: Record<string, number>
): Promise<RetentionTest> {
  const scheduledFor = new Date();
  scheduledFor.setDate(scheduledFor.getDate() + delayDays);

  const testData = {
    userId,
    skillIds,
    scheduledFor: Timestamp.fromDate(scheduledFor),
    status: 'scheduled' as const,
    delayDays,
    originalMastery,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  const docRef = await adminDb.collection('retentionTests').add(testData);

  // Track the scheduling event
  await trackRetentionTest(
    'retention_test_scheduled',
    userId,
    `retention_${docRef.id}`,
    {
      testId: docRef.id,
      skillIds,
      delayDays,
      originalMastery,
    }
  );

  return {
    id: docRef.id,
    userId,
    skillIds,
    scheduledFor,
    status: 'scheduled',
    delayDays,
    originalMastery,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Schedule both 7-day and 30-day retention tests for newly mastered skills
 */
export async function scheduleRetentionTestsForMastery(
  userId: string,
  skillId: string,
  masteryLevel: number
): Promise<void> {
  // Only schedule if skill actually reached mastery
  if (masteryLevel < 0.95) return;

  const originalMastery = { [skillId]: masteryLevel * 100 };

  // Schedule 7-day test
  await scheduleRetentionTest(userId, [skillId], 7, originalMastery);

  // Schedule 30-day test
  await scheduleRetentionTest(userId, [skillId], 30, originalMastery);
}

/**
 * Get retention tests for a user
 */
export async function getUserRetentionTests(
  userId: string,
  status?: RetentionTest['status']
): Promise<RetentionTest[]> {
  let query = adminDb
    .collection('retentionTests')
    .where('userId', '==', userId)
    .orderBy('scheduledFor', 'asc');

  if (status) {
    query = query.where('status', '==', status) as any;
  }

  const snapshot = await query.get();

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      skillIds: data.skillIds,
      scheduledFor: data.scheduledFor?.toDate?.() || new Date(data.scheduledFor),
      status: data.status,
      delayDays: data.delayDays,
      originalMastery: data.originalMastery,
      results: data.results ? {
        ...data.results,
        testDate: data.results.testDate?.toDate?.() || new Date(data.results.testDate),
      } : undefined,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
    } as RetentionTest;
  });
}

/**
 * Get available retention tests (scheduled date has passed)
 */
export async function getAvailableTests(userId: string): Promise<RetentionTest[]> {
  const now = new Date();

  // First, update any scheduled tests that are now available
  await updateScheduledToAvailable(userId);

  // Then get all available tests
  const snapshot = await adminDb
    .collection('retentionTests')
    .where('userId', '==', userId)
    .where('status', '==', 'available')
    .orderBy('scheduledFor', 'asc')
    .get();

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      skillIds: data.skillIds,
      scheduledFor: data.scheduledFor?.toDate?.() || new Date(data.scheduledFor),
      status: 'available' as const,
      delayDays: data.delayDays,
      originalMastery: data.originalMastery,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
    } as RetentionTest;
  });
}

/**
 * Update scheduled tests to available if their date has passed
 */
async function updateScheduledToAvailable(userId: string): Promise<void> {
  const now = Timestamp.now();

  const scheduledSnapshot = await adminDb
    .collection('retentionTests')
    .where('userId', '==', userId)
    .where('status', '==', 'scheduled')
    .where('scheduledFor', '<=', now)
    .get();

  const batch = adminDb.batch();

  for (const doc of scheduledSnapshot.docs) {
    batch.update(doc.ref, {
      status: 'available',
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Track availability
    const data = doc.data();
    await trackRetentionTest(
      'retention_test_available',
      userId,
      `retention_${doc.id}`,
      {
        testId: doc.id,
        skillIds: data.skillIds,
        delayDays: data.delayDays,
      }
    );
  }

  await batch.commit();
}

/**
 * Expire old available tests that weren't taken within 7 days of becoming available
 */
export async function expireOldTests(): Promise<number> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const snapshot = await adminDb
    .collection('retentionTests')
    .where('status', '==', 'available')
    .where('scheduledFor', '<=', Timestamp.fromDate(sevenDaysAgo))
    .get();

  const batch = adminDb.batch();

  for (const doc of snapshot.docs) {
    batch.update(doc.ref, {
      status: 'expired',
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
  return snapshot.docs.length;
}

// ============================================
// TEST GENERATION
// ============================================

/**
 * Generate retention test questions for skills
 * Questions should be different from original learning to test true retention
 */
export async function generateRetentionQuestions(
  skillIds: string[],
  questionsPerSkill: number = 3
): Promise<RetentionQuestion[]> {
  const questions: RetentionQuestion[] = [];

  for (const skillId of skillIds) {
    // Get skill info
    const skillDoc = await adminDb.collection('skills').doc(skillId).get();
    const skill = skillDoc.data();

    if (!skill) continue;

    // Get existing questions for this skill that are marked for retention testing
    const questionsSnapshot = await adminDb
      .collection('retentionQuestions')
      .where('skillId', '==', skillId)
      .limit(questionsPerSkill)
      .get();

    if (questionsSnapshot.empty) {
      // If no retention questions exist, use regular quiz questions
      const quizQuestionsSnapshot = await adminDb
        .collection('questions')
        .where('skills', 'array-contains', skillId)
        .limit(questionsPerSkill)
        .get();

      for (const doc of quizQuestionsSnapshot.docs) {
        const q = doc.data();
        questions.push({
          id: doc.id,
          skillId,
          question: q.question,
          options: q.options || [],
          correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
          difficulty: q.difficulty || 3,
        });
      }
    } else {
      for (const doc of questionsSnapshot.docs) {
        const q = doc.data();
        questions.push({
          id: doc.id,
          skillId,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          difficulty: q.difficulty,
        });
      }
    }
  }

  // Shuffle questions
  return questions.sort(() => Math.random() - 0.5);
}

// ============================================
// TEST EXECUTION
// ============================================

/**
 * Start a retention test session
 */
export async function startRetentionTest(
  testId: string,
  userId: string
): Promise<RetentionTestSession> {
  // Get the test
  const testDoc = await adminDb.collection('retentionTests').doc(testId).get();

  if (!testDoc.exists) {
    throw new Error(`Retention test ${testId} not found`);
  }

  const test = testDoc.data();

  if (test?.userId !== userId) {
    throw new Error('Unauthorized access to retention test');
  }

  if (test?.status !== 'available') {
    throw new Error(`Test is not available (status: ${test?.status})`);
  }

  // Generate questions
  const questions = await generateRetentionQuestions(test.skillIds);

  // Create session
  const session: Omit<RetentionTestSession, 'testId'> = {
    userId,
    questions,
    answers: {},
    startedAt: new Date(),
  };

  // Store session
  await adminDb.collection('retentionTestSessions').doc(testId).set({
    ...session,
    startedAt: FieldValue.serverTimestamp(),
  });

  // Track start
  await trackRetentionTest(
    'retention_test_started',
    userId,
    `retention_${testId}`,
    {
      testId,
      skillIds: test.skillIds,
      delayDays: test.delayDays,
    }
  );

  return {
    testId,
    ...session,
  };
}

/**
 * Submit an answer for a retention test question
 */
export async function submitRetentionAnswer(
  testId: string,
  questionId: string,
  selectedAnswer: number
): Promise<void> {
  await adminDb.collection('retentionTestSessions').doc(testId).update({
    [`answers.${questionId}`]: selectedAnswer,
  });
}

/**
 * Complete a retention test and calculate results
 */
export async function completeRetentionTest(
  testId: string,
  userId: string
): Promise<RetentionResult> {
  // Get session
  const sessionDoc = await adminDb.collection('retentionTestSessions').doc(testId).get();
  const session = sessionDoc.data();

  if (!session) {
    throw new Error(`Session for test ${testId} not found`);
  }

  // Get test
  const testDoc = await adminDb.collection('retentionTests').doc(testId).get();
  const test = testDoc.data();

  if (!test) {
    throw new Error(`Test ${testId} not found`);
  }

  // Calculate results
  const questions: RetentionQuestion[] = session.questions;
  const answers = session.answers || {};

  // Group questions by skill
  const skillQuestions: Record<string, RetentionQuestion[]> = {};
  for (const q of questions) {
    if (!skillQuestions[q.skillId]) {
      skillQuestions[q.skillId] = [];
    }
    skillQuestions[q.skillId].push(q);
  }

  // Calculate scores per skill
  const scores: Record<string, number> = {};
  const retention: Record<string, number> = {};
  const decay: Record<string, number> = {};
  let totalCorrect = 0;
  let totalQuestions = 0;

  for (const skillId of Object.keys(skillQuestions)) {
    const skillQs = skillQuestions[skillId];
    let correct = 0;

    for (const q of skillQs) {
      totalQuestions++;
      if (answers[q.id] === q.correctAnswer) {
        correct++;
        totalCorrect++;
      }
    }

    const score = skillQs.length > 0 ? (correct / skillQs.length) * 100 : 0;
    scores[skillId] = Math.round(score);

    const originalMastery = test.originalMastery[skillId] || 100;
    retention[skillId] = originalMastery > 0
      ? Math.round((score / originalMastery) * 100)
      : 0;
    decay[skillId] = Math.round(originalMastery - score);
  }

  // Calculate overall retention
  const retentionValues = Object.values(retention);
  const overallRetention = retentionValues.length > 0
    ? Math.round(retentionValues.reduce((a, b) => a + b, 0) / retentionValues.length)
    : 0;

  // Calculate time spent
  const startedAt = session.startedAt?.toDate?.() || new Date(session.startedAt);
  const completedAt = new Date();
  const timeSpentMinutes = Math.round(
    (completedAt.getTime() - startedAt.getTime()) / (1000 * 60)
  );

  const results: RetentionResult = {
    testDate: completedAt,
    scores,
    retention,
    overallRetention,
    decay,
    questionsAnswered: Object.keys(answers).length,
    correctAnswers: totalCorrect,
    timeSpentMinutes,
  };

  // Update test with results
  await adminDb.collection('retentionTests').doc(testId).update({
    status: 'completed',
    results: {
      ...results,
      testDate: Timestamp.fromDate(completedAt),
    },
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Update session
  await adminDb.collection('retentionTestSessions').doc(testId).update({
    completedAt: FieldValue.serverTimestamp(),
  });

  // Track completion
  await trackRetentionTest(
    'retention_test_completed',
    userId,
    `retention_${testId}`,
    {
      testId,
      skillIds: test.skillIds,
      delayDays: test.delayDays,
      originalMastery: test.originalMastery,
      currentScores: scores,
      overallRetention,
    }
  );

  return results;
}

/**
 * Run a complete retention test from start to finish
 */
export async function runRetentionTest(
  testId: string,
  userId: string,
  answers: Record<string, number>
): Promise<RetentionResult> {
  // Start the test
  await startRetentionTest(testId, userId);

  // Submit all answers
  for (const [questionId, answer] of Object.entries(answers)) {
    await submitRetentionAnswer(testId, questionId, answer);
  }

  // Complete and get results
  return completeRetentionTest(testId, userId);
}

// ============================================
// NOTIFICATION
// ============================================

/**
 * Get pending test notifications for a user
 */
export async function getPendingTestNotifications(
  userId: string
): Promise<{ testId: string; skillNames: string[]; delayDays: number }[]> {
  const availableTests = await getAvailableTests(userId);

  const notifications: { testId: string; skillNames: string[]; delayDays: number }[] = [];

  for (const test of availableTests) {
    // Get skill names
    const skillNames: string[] = [];
    for (const skillId of test.skillIds) {
      const skillDoc = await adminDb.collection('skills').doc(skillId).get();
      if (skillDoc.exists) {
        skillNames.push(skillDoc.data()?.name || skillId);
      } else {
        skillNames.push(skillId);
      }
    }

    notifications.push({
      testId: test.id,
      skillNames,
      delayDays: test.delayDays,
    });
  }

  return notifications;
}

/**
 * Send notification for pending retention tests
 * This would integrate with your notification system
 */
export async function notifyPendingTests(userId: string): Promise<void> {
  const notifications = await getPendingTestNotifications(userId);

  if (notifications.length === 0) return;

  // Store notification in user's notification queue
  for (const notification of notifications) {
    await adminDb.collection('notifications').add({
      userId,
      type: 'retention_test_available',
      title: 'Retention Check Available',
      message: `Test your memory: ${notification.skillNames.join(', ')} (${notification.delayDays}-day check)`,
      data: {
        testId: notification.testId,
        skillNames: notification.skillNames,
        delayDays: notification.delayDays,
      },
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
}

// ============================================
// ANALYTICS
// ============================================

/**
 * Get retention test analytics for a user
 */
export async function getUserRetentionAnalytics(
  userId: string
): Promise<{
  totalTests: number;
  completedTests: number;
  averageRetention7Day: number;
  averageRetention30Day: number;
  skillsWithBestRetention: { skillId: string; retention: number }[];
  skillsWithWorstRetention: { skillId: string; retention: number }[];
}> {
  const tests = await getUserRetentionTests(userId);

  const completedTests = tests.filter(t => t.status === 'completed' && t.results);
  const tests7Day = completedTests.filter(t => t.delayDays === 7);
  const tests30Day = completedTests.filter(t => t.delayDays === 30);

  // Calculate averages
  const avg7Day = tests7Day.length > 0
    ? tests7Day.reduce((sum, t) => sum + (t.results?.overallRetention || 0), 0) / tests7Day.length
    : 0;

  const avg30Day = tests30Day.length > 0
    ? tests30Day.reduce((sum, t) => sum + (t.results?.overallRetention || 0), 0) / tests30Day.length
    : 0;

  // Aggregate retention by skill
  const skillRetention: Record<string, number[]> = {};

  for (const test of completedTests) {
    if (!test.results?.retention) continue;

    for (const [skillId, retention] of Object.entries(test.results.retention)) {
      if (!skillRetention[skillId]) {
        skillRetention[skillId] = [];
      }
      skillRetention[skillId].push(retention);
    }
  }

  // Calculate average retention per skill
  const skillAverages = Object.entries(skillRetention).map(([skillId, retentions]) => ({
    skillId,
    retention: Math.round(retentions.reduce((a, b) => a + b, 0) / retentions.length),
  }));

  // Sort for best/worst
  const sorted = [...skillAverages].sort((a, b) => b.retention - a.retention);

  return {
    totalTests: tests.length,
    completedTests: completedTests.length,
    averageRetention7Day: Math.round(avg7Day),
    averageRetention30Day: Math.round(avg30Day),
    skillsWithBestRetention: sorted.slice(0, 5),
    skillsWithWorstRetention: sorted.slice(-5).reverse(),
  };
}

/**
 * Get platform-wide retention analytics
 */
export async function getPlatformRetentionAnalytics(): Promise<{
  totalTestsCompleted: number;
  averageRetention7Day: number;
  averageRetention30Day: number;
  retentionTrend: { date: string; retention: number }[];
}> {
  const snapshot = await adminDb
    .collection('retentionTests')
    .where('status', '==', 'completed')
    .orderBy('updatedAt', 'desc')
    .limit(1000)
    .get();

  const tests = snapshot.docs.map(doc => doc.data());

  const tests7Day = tests.filter(t => t.delayDays === 7);
  const tests30Day = tests.filter(t => t.delayDays === 30);

  const avg7Day = tests7Day.length > 0
    ? tests7Day.reduce((sum, t) => sum + (t.results?.overallRetention || 0), 0) / tests7Day.length
    : 0;

  const avg30Day = tests30Day.length > 0
    ? tests30Day.reduce((sum, t) => sum + (t.results?.overallRetention || 0), 0) / tests30Day.length
    : 0;

  // Calculate trend (last 30 days)
  const retentionByDate: Record<string, number[]> = {};

  for (const test of tests) {
    if (!test.results?.testDate) continue;

    const date = test.results.testDate.toDate?.()?.toISOString()?.split('T')[0] ||
      new Date(test.results.testDate).toISOString().split('T')[0];

    if (!retentionByDate[date]) {
      retentionByDate[date] = [];
    }
    retentionByDate[date].push(test.results.overallRetention || 0);
  }

  const retentionTrend = Object.entries(retentionByDate)
    .map(([date, values]) => ({
      date,
      retention: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);

  return {
    totalTestsCompleted: tests.length,
    averageRetention7Day: Math.round(avg7Day),
    averageRetention30Day: Math.round(avg30Day),
    retentionTrend,
  };
}
