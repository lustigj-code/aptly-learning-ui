import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  calculateExamReadiness,
  generateDailySchedule,
  estimateLearningRate,
  adjustScheduleForLearningRate,
  getDaysUntilExam,
  type ExamScheduleConfig,
  type ExamReadinessResult,
  type DailySchedule,
} from '@/lib/certification/examScheduler';
import { SOCIAL_MEDIA_MARKETING_GRAPH } from '@/lib/mastery/knowledgeGraph';

// ============================================
// TYPES
// ============================================

interface SetExamDateRequest {
  examDate: string; // ISO date string
  targetRetention?: number; // 0.90-0.99, default 0.95
}

// Response type for documentation purposes
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type ScheduleResponse = {
  success: boolean;
  readiness: ExamReadinessResult;
  dailySchedule: DailySchedule;
  examDate: string;
  targetRetention: number;
}

// ============================================
// HELPERS
// ============================================

/**
 * Verify Firebase auth token and return user ID
 */
async function verifyAuth(request: NextRequest): Promise<{ userId: string } | { error: string; status: number }> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Unauthorized', status: 401 };
  }

  const idToken = authHeader.slice(7);
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return { userId: decodedToken.uid };
  } catch (error) {
    console.error('Token verification failed:', error);
    return { error: 'Invalid token', status: 401 };
  }
}

/**
 * Get user's skill mastery data from Firestore
 */
async function getUserSkillsData(userId: string) {
  // Get from BKT skill states collection
  const skillStatesSnap = await adminDb
    .collection('skillStates')
    .doc(userId)
    .collection('skills')
    .get();

  const skillStates: Record<string, {
    pMastery: number;
    attempts: number;
    lastAttempt?: Date;
  }> = {};

  skillStatesSnap.docs.forEach(doc => {
    const data = doc.data();
    skillStates[doc.id] = {
      pMastery: data.pMastery || 0,
      attempts: data.attempts || 0,
      lastAttempt: data.lastAttempt?.toDate?.() || undefined,
    };
  });

  // Get FSRS mastery data from review queue
  const reviewQueueSnap = await adminDb
    .collection('reviewQueue')
    .doc(userId)
    .collection('items')
    .get();

  const fsrsStates: Record<string, {
    stability: number;
    difficulty: number;
    state: string;
    lastReviewedAt?: Date;
  }> = {};

  reviewQueueSnap.docs.forEach(doc => {
    const data = doc.data();
    fsrsStates[doc.id] = {
      stability: data.fsrsState?.stability || 0,
      difficulty: data.fsrsState?.difficulty || 5,
      state: data.fsrsState?.state || 'new',
      lastReviewedAt: data.lastReviewedAt?.toDate?.() || undefined,
    };
  });

  return { skillStates, fsrsStates };
}

/**
 * Get user's interaction history for learning rate estimation
 */
async function getUserInteractionHistory(userId: string, limit: number = 100) {
  const interactionsSnap = await adminDb
    .collection('interactionLogs')
    .where('userId', '==', userId)
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();

  return interactionsSnap.docs.map(doc => {
    const data = doc.data();
    return {
      correct: data.isCorrect || false,
      responseTimeMs: data.responseTimeMs || 5000,
      attemptNumber: data.attemptNumber || 1,
    };
  });
}

/**
 * Build skills array from knowledge graph and user data
 */
function buildSkillsArray(
  skillStates: Record<string, { pMastery: number; attempts: number; lastAttempt?: Date }>,
  fsrsStates: Record<string, { stability: number; difficulty: number; state: string; lastReviewedAt?: Date }>
) {
  const concepts = SOCIAL_MEDIA_MARKETING_GRAPH.concepts;
  const skills = [];

  for (const [conceptId, concept] of Object.entries(concepts)) {
    const skillState = skillStates[conceptId];
    const fsrsState = fsrsStates[conceptId];

    skills.push({
      id: conceptId,
      name: concept.name,
      category: concept.category,
      pMastery: skillState?.pMastery || 0,
      attempts: skillState?.attempts || 0,
      lastReviewedAt: fsrsState?.lastReviewedAt || skillState?.lastAttempt,
      fsrsState: fsrsState ? {
        stability: fsrsState.stability,
        difficulty: fsrsState.difficulty,
        elapsedDays: 0,
        scheduledDays: 0,
        reps: skillState?.attempts || 0,
        lapses: 0,
        state: fsrsState.state as 'new' | 'learning' | 'review' | 'relearning',
      } : undefined,
    });
  }

  return skills;
}

// ============================================
// GET - Get current schedule and readiness
// ============================================

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { userId } = authResult;

    // Get user's exam settings
    const userProfileSnap = await adminDb.collection('userProfiles').doc(userId).get();
    const userProfile = userProfileSnap.data();

    if (!userProfile?.preferences?.certificationExamDate) {
      return NextResponse.json({
        success: false,
        message: 'No exam date set',
        readiness: null,
        dailySchedule: null,
      });
    }

    const examDate = new Date(userProfile.preferences.certificationExamDate);
    const targetRetention = userProfile.preferences.targetRetention || 0.95;

    // Check if exam date has passed
    if (getDaysUntilExam(examDate) < 0) {
      return NextResponse.json({
        success: false,
        message: 'Exam date has passed',
        readiness: null,
        dailySchedule: null,
        examDate: examDate.toISOString(),
      });
    }

    // Get user's skill data
    const { skillStates, fsrsStates } = await getUserSkillsData(userId);
    const skills = buildSkillsArray(skillStates, fsrsStates);

    // Get interaction history for learning rate
    const interactionHistory = await getUserInteractionHistory(userId);
    const learningRate = estimateLearningRate(interactionHistory);

    // Calculate readiness
    const config: ExamScheduleConfig = {
      examDate,
      targetRetention,
      userId,
    };

    const readiness = calculateExamReadiness(skills, config);

    // Generate daily schedule
    let dailySchedule = generateDailySchedule(readiness);

    // Adjust for learning rate
    dailySchedule = adjustScheduleForLearningRate(dailySchedule, learningRate);

    return NextResponse.json({
      success: true,
      readiness,
      dailySchedule,
      examDate: examDate.toISOString(),
      targetRetention,
      learningRate,
    });
  } catch (error) {
    console.error('Get schedule error:', error);
    return NextResponse.json(
      { error: 'Failed to get schedule' },
      { status: 500 }
    );
  }
}

// ============================================
// POST - Set exam date and calculate schedule
// ============================================

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { userId } = authResult;

    // Parse request body
    let body: SetExamDateRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // Validate exam date
    if (!body.examDate) {
      return NextResponse.json(
        { error: 'examDate is required' },
        { status: 400 }
      );
    }

    const examDate = new Date(body.examDate);
    if (isNaN(examDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid exam date format' },
        { status: 400 }
      );
    }

    // Validate date is in future
    const daysUntil = getDaysUntilExam(examDate);
    if (daysUntil < 0) {
      return NextResponse.json(
        { error: 'Exam date must be in the future' },
        { status: 400 }
      );
    }

    // Validate target retention
    const targetRetention = body.targetRetention || 0.95;
    if (targetRetention < 0.80 || targetRetention > 0.99) {
      return NextResponse.json(
        { error: 'Target retention must be between 0.80 and 0.99' },
        { status: 400 }
      );
    }

    // Update user profile with exam settings
    await adminDb.collection('userProfiles').doc(userId).update({
      'preferences.certificationExamDate': examDate.toISOString(),
      'preferences.targetRetention': targetRetention,
      'preferences.examModeEnabled': true,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Get user's skill data
    const { skillStates, fsrsStates } = await getUserSkillsData(userId);
    const skills = buildSkillsArray(skillStates, fsrsStates);

    // Get interaction history for learning rate
    const interactionHistory = await getUserInteractionHistory(userId);
    const learningRate = estimateLearningRate(interactionHistory);

    // Calculate readiness
    const config: ExamScheduleConfig = {
      examDate,
      targetRetention,
      userId,
    };

    const readiness = calculateExamReadiness(skills, config);

    // Generate daily schedule
    let dailySchedule = generateDailySchedule(readiness);

    // Adjust for learning rate
    dailySchedule = adjustScheduleForLearningRate(dailySchedule, learningRate);

    // Store the calculated schedule for quick access
    await adminDb.collection('examSchedules').doc(userId).set({
      userId,
      examDate: examDate.toISOString(),
      targetRetention,
      readiness,
      dailySchedule,
      learningRate,
      calculatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      readiness,
      dailySchedule,
      examDate: examDate.toISOString(),
      targetRetention,
      learningRate,
      message: `Exam date set for ${examDate.toLocaleDateString()}. ${daysUntil} days remaining.`,
    });
  } catch (error) {
    console.error('Set exam date error:', error);
    return NextResponse.json(
      { error: 'Failed to set exam date' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE - Clear exam date
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { userId } = authResult;

    // Clear exam settings from user profile
    await adminDb.collection('userProfiles').doc(userId).update({
      'preferences.certificationExamDate': FieldValue.delete(),
      'preferences.examModeEnabled': false,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Delete stored schedule
    await adminDb.collection('examSchedules').doc(userId).delete();

    return NextResponse.json({
      success: true,
      message: 'Exam date cleared',
    });
  } catch (error) {
    console.error('Clear exam date error:', error);
    return NextResponse.json(
      { error: 'Failed to clear exam date' },
      { status: 500 }
    );
  }
}
