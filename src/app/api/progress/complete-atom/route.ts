import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { calculateAtomXP, calculateLevel } from '@/lib/utils/xpCalculator';
import { getConceptsForAtom } from '@/data/courseToConceptMap';
import {
  updateConceptMastery,
  createInitialConceptMastery,
} from '@/lib/mastery/fsrs';
import type { ConceptMastery } from '@/lib/mastery/knowledgeGraph';

const { serverTimestamp, arrayUnion } = FieldValue;

const completeAtomSchema = z.object({
  atomId: z.string().min(1),
  lessonId: z.string().min(1),
  moduleId: z.string().min(1),
  courseId: z.string().min(1),
  score: z.number().optional(),
  timeSpentSeconds: z.number().min(0).optional(),
});

type CelebrationData = {
  xpEarned: number;
  newLevel?: number;
  badge?: { id: string; title: string };
  streakMilestone?: number;
  message: string;
};

/**
 * POST /api/progress/complete-atom
 * Mark an atom as complete and award XP
 * Server-side calculation ensures no client-side cheating
 */
export async function POST(request: NextRequest) {
  try {
    // Get and verify Firebase ID token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const idToken = authHeader.slice(7);
    let userId: string;

    try {
      // Verify the Firebase ID token
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      userId = decodedToken.uid;
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Validate input
    const body = await request.json();
    const validation = completeAtomSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { atomId, lessonId, moduleId, courseId, score, timeSpentSeconds } =
      validation.data;

    // Get or create user progress document
    const userProgressRef = adminDb.collection('userProgress').doc(userId);
    const userProgressSnap = await userProgressRef.get();

    let userProgress: Record<string, unknown>;

    if (!userProgressSnap.exists) {
      // Create initial progress for new users
      const initialProgress = {
        userId,
        atomsCompleted: [],
        completionDetails: {},
        totalXP: 0,
        currentLevel: 1,
        xpToNextLevel: 100,
        streak: {
          currentStreak: 0,
          longestStreak: 0,
          lastCompletedDate: '',
          freezesAvailable: 2,
          freezesUsed: [],
        },
        createdAt: serverTimestamp(),
        lastActiveAt: serverTimestamp(),
      };
      await userProgressRef.set(initialProgress);
      userProgress = initialProgress;
    } else {
      userProgress = userProgressSnap.data() || {};
    }

    // Check if atom already completed
    const atomsCompleted = (userProgress.atomsCompleted || []) as string[];
    if (atomsCompleted.includes(atomId)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Atom already completed',
          xpEarned: 0,
        },
        { status: 400 }
      );
    }

    // Fetch atom details to get base XP
    let atomType: 'video' | 'reading' | 'quiz' | 'practice' = 'video';
    try {
      const atomRef = adminDb
        .collection('courses')
        .doc(courseId)
        .collection('modules')
        .doc(moduleId)
        .collection('lessons')
        .doc(lessonId)
        .collection('atoms')
        .doc(atomId);

      const atomSnap = await atomRef.get();
      if (atomSnap.exists) {
        atomType = (atomSnap.data()?.type || 'video') as typeof atomType;
      }
    } catch (error) {
      console.error('Error fetching atom details:', error);
      // Continue with default type
    }

    // Calculate XP with multipliers
    const streakData = (userProgress.streak || {}) as Record<string, unknown>;
    const currentStreak = (streakData.currentStreak || 0) as number;
    const xpEarned = calculateAtomXP(atomType, currentStreak, score);

    // Calculate new total XP and level
    const currentTotalXP = (userProgress.totalXP || 0) as number;
    const newTotalXP = currentTotalXP + xpEarned;
    const levelInfo = calculateLevel(newTotalXP);
    const previousLevel = calculateLevel(currentTotalXP).level;
    const leveledUp = levelInfo.level > previousLevel;

    // Prepare completion details
    const completionDetails = (userProgress.completionDetails || {}) as Record<string, unknown>;
    completionDetails[atomId] = {
      timestamp: serverTimestamp(),
      xpEarned,
      timeSpent: timeSpentSeconds || 0,
      score: score || null,
    };

    // Update user progress
    await userProgressRef.update({
      atomsCompleted: arrayUnion(atomId),
      completionDetails,
      totalXP: newTotalXP,
      currentLevel: levelInfo.level,
      xpToNextLevel: levelInfo.xpToNextLevel,
      currentAtomId: atomId,
      lastActiveAt: serverTimestamp(),
    });

    // Update streak
    await updateStreakOnCompletion(userId);

    // Update FSRS concept mastery and schedule reviews
    await updateFSRSMastery(
      userId,
      atomId,
      score ?? 80, // Default to 80% for non-quiz atoms
      timeSpentSeconds ?? 60
    ).catch((error) =>
      console.error('Error updating FSRS mastery:', error)
    );

    // Trigger badge criteria check (async, don't await)
    triggerBadgeCriteriaCheck(userId).catch((error) =>
      console.error('Error checking badge criteria:', error)
    );

    // Prepare celebration data
    const celebration: CelebrationData = {
      xpEarned,
      message: `You earned ${xpEarned} XP!`,
    };

    if (leveledUp) {
      celebration.newLevel = levelInfo.level;
      celebration.message += ` You've reached level ${levelInfo.level}!`;
    }

    // Check for streak milestones
    const updatedStreak = currentStreak > 0 ? currentStreak + 1 : 1;
    if ([7, 14, 30, 60].includes(updatedStreak)) {
      celebration.streakMilestone = updatedStreak;
      celebration.message += ` ${updatedStreak} day streak!`;
    }

    return NextResponse.json(
      {
        success: true,
        xpEarned,
        newLevel: levelInfo.level,
        leveledUp,
        celebration,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Complete atom error:', error);
    return NextResponse.json(
      { error: 'Failed to complete atom' },
      { status: 500 }
    );
  }
}

/**
 * Update streak when atom is completed
 */
async function updateStreakOnCompletion(userId: string): Promise<void> {
  const userProgressRef = adminDb.collection('userProgress').doc(userId);
  const userProgressSnap = await userProgressRef.get();
  const userProgress = userProgressSnap.data();

  const streakData = userProgress?.streak || {
    currentStreak: 0,
    longestStreak: 0,
    lastCompletedDate: '',
    freezesAvailable: 2,
    freezesUsed: [],
    streakHistory: [],
  };

  const today = new Date().toISOString().split('T')[0];
  const lastCompletedDate = streakData.lastCompletedDate || '';

  // If today's activity already recorded, don't update streak
  if (lastCompletedDate === today) {
    return;
  }

  // Calculate yesterday's date
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayString = yesterday.toISOString().split('T')[0];

  let newStreak = streakData.currentStreak || 0;

  // If last activity was yesterday, increment streak
  if (lastCompletedDate === yesterdayString) {
    newStreak++;
  } else if (lastCompletedDate !== today) {
    // If gap > 1 day, check freezes
    if (lastCompletedDate && lastCompletedDate !== yesterdayString) {
      if (streakData.freezesAvailable > 0) {
        // Apply freeze
        await userProgressRef.update({
          'streak.freezesAvailable': streakData.freezesAvailable - 1,
          'streak.freezesUsed': arrayUnion(yesterdayString),
          'streak.lastCompletedDate': today,
        });
        return;
      } else {
        // Reset streak
        newStreak = 1;
      }
    } else {
      // First activity
      newStreak = 1;
    }
  }

  // Update longest streak if needed
  const longestStreak = Math.max(
    streakData.longestStreak || 0,
    newStreak
  );

  await userProgressRef.update({
    'streak.currentStreak': newStreak,
    'streak.longestStreak': longestStreak,
    'streak.lastCompletedDate': today,
  });
}

/**
 * Trigger badge criteria check asynchronously
 */
async function triggerBadgeCriteriaCheck(userId: string): Promise<void> {
  // This would typically trigger a Cloud Function or queue a job
  // For now, we'll implement basic badge checks here
  try {
    const userProgressRef = adminDb.collection('userProgress').doc(userId);
    const userProgressSnap = await userProgressRef.get();
    const userProgress = userProgressSnap.data();

    const badgesToCheck = [];

    // Check for completion badges
    const atomsCompleted = userProgress?.atomsCompleted?.length || 0;
    if (atomsCompleted >= 10) badgesToCheck.push('first-10-atoms');
    if (atomsCompleted >= 50) badgesToCheck.push('fifty-atoms');
    if (atomsCompleted >= 100) badgesToCheck.push('hundred-atoms');

    // Check for streak badges
    const currentStreak = userProgress?.streak?.currentStreak || 0;
    if (currentStreak >= 7) badgesToCheck.push('week-warrior');
    if (currentStreak >= 30) badgesToCheck.push('month-master');

    // Award badges (in production, would validate in userAchievements collection)
    if (badgesToCheck.length > 0) {
      console.log(`Badge check triggered for user ${userId}:`, badgesToCheck);
    }
  } catch (error) {
    console.error('Badge criteria check error:', error);
  }
}

/**
 * Update FSRS concept mastery after atom completion
 * Creates review items in Firestore for spaced repetition
 */
async function updateFSRSMastery(
  userId: string,
  atomId: string,
  score: number,
  timeSpentSeconds: number
): Promise<void> {
  // Get concepts associated with this atom
  const concepts = getConceptsForAtom(atomId);

  if (concepts.length === 0) {
    console.log(`No concepts mapped for atom ${atomId}`);
    return;
  }

  // Update mastery for each concept
  for (const conceptId of concepts) {
    try {
      const reviewRef = adminDb
        .collection('reviewQueue')
        .doc(userId)
        .collection('items')
        .doc(conceptId);

      const reviewSnap = await reviewRef.get();

      let mastery: ConceptMastery;

      if (!reviewSnap.exists) {
        // Create initial mastery record
        mastery = createInitialConceptMastery(conceptId, userId);
      } else {
        // Reconstruct mastery from Firestore data
        const data = reviewSnap.data();
        mastery = {
          conceptId: data?.conceptId || conceptId,
          userId: data?.userId || userId,
          masteryLevel: data?.masteryLevel || 0,
          lastReviewedAt: data?.lastReviewedAt?.toDate() || new Date(),
          lastQuizScore: data?.lastQuizScore || 0,
          reviewCount: data?.reviewCount || 0,
          correctStreak: data?.correctStreak || 0,
          incorrectStreak: data?.incorrectStreak || 0,
          fsrsState: data?.fsrsState || {
            stability: 0,
            difficulty: 0,
            elapsedDays: 0,
            scheduledDays: 0,
            reps: 0,
            lapses: 0,
            state: 'new',
          },
          nextReviewAt: data?.nextReviewAt?.toDate() || new Date(),
          history: data?.history || [],
        };
      }

      // Update mastery with FSRS algorithm
      const updatedMastery = updateConceptMastery(
        mastery,
        score,
        timeSpentSeconds,
        'lesson_complete'
      );

      // Save updated mastery to Firestore
      await reviewRef.set({
        conceptId,
        userId,
        masteryLevel: updatedMastery.masteryLevel,
        lastReviewedAt: updatedMastery.lastReviewedAt,
        lastQuizScore: updatedMastery.lastQuizScore,
        reviewCount: updatedMastery.reviewCount,
        correctStreak: updatedMastery.correctStreak,
        incorrectStreak: updatedMastery.incorrectStreak,
        fsrsState: updatedMastery.fsrsState,
        nextReviewAt: updatedMastery.nextReviewAt,
        dueDate: updatedMastery.nextReviewAt,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      console.log(
        `Updated mastery for concept ${conceptId}: ` +
        `${Math.round(updatedMastery.masteryLevel)}%, ` +
        `next review: ${updatedMastery.nextReviewAt.toISOString().split('T')[0]}`
      );
    } catch (error) {
      console.error(`Error updating mastery for concept ${conceptId}:`, error);
    }
  }
}
