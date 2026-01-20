/**
 * Complete Atom API
 *
 * Marks an atom as complete and awards XP. Uses the unified `users.progress`
 * location as the primary data store.
 *
 * @migration This endpoint was updated to write to `users.progress` instead
 * of the deprecated `userProgress` collection.
 */
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
import { invalidateProgressCache } from '@/lib/data/userProgressLayer';

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

    // Get or create user progress document from primary location (users.progress)
    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();

    let userProgress: Record<string, unknown>;

    if (!userSnap.exists || !userSnap.data()?.progress) {
      // Create initial progress for new users in users.progress
      const initialProgress = {
        atomsCompleted: [],
        completionDetails: {},
        totalXP: 0,
        currentLevel: 1,
        xpToNextLevel: 100,
      };
      const initialStreak = {
        currentStreak: 0,
        longestStreak: 0,
        lastCompletedDate: '',
        freezesAvailable: 2,
        freezesUsed: [],
      };
      await userRef.set({
        progress: initialProgress,
        streak: initialStreak,
        createdAt: serverTimestamp(),
        lastActiveAt: serverTimestamp(),
      }, { merge: true });
      userProgress = { ...initialProgress, streak: initialStreak };
    } else {
      const userData = userSnap.data() || {};
      userProgress = {
        ...(userData.progress || {}),
        streak: userData.streak || {},
      };
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

    // Calculate overall percentage based on completed atoms
    // Get current atomsCompleted after this update
    const currentAtomsCompleted = [...atomsCompleted, atomId];

    // Calculate total atoms in course by querying course structure
    let totalAtomCount = 0;
    try {
      const modulesSnap = await adminDb
        .collection('courses')
        .doc(courseId)
        .collection('modules')
        .get();

      for (const moduleDoc of modulesSnap.docs) {
        const lessonsSnap = await moduleDoc.ref.collection('lessons').get();
        for (const lessonDoc of lessonsSnap.docs) {
          const atomsSnap = await lessonDoc.ref.collection('atoms').get();
          totalAtomCount += atomsSnap.size;
        }
      }
    } catch (error) {
      console.error('Error counting atoms for percentage calculation:', error);
      // Fall back to a reasonable default based on completed count
      totalAtomCount = Math.max(currentAtomsCompleted.length * 4, 20);
    }

    // Calculate percentage (avoid division by zero)
    const overallPercentage = totalAtomCount > 0
      ? Math.round((currentAtomsCompleted.length / totalAtomCount) * 100)
      : 0;

    // Update user progress in users.progress (primary location)
    await userRef.update({
      'progress.atomsCompleted': arrayUnion(atomId),
      'progress.completionDetails': completionDetails,
      'progress.totalXP': newTotalXP,
      'progress.currentLevel': levelInfo.level,
      'progress.xpToNextLevel': levelInfo.xpToNextLevel,
      'progress.currentAtomId': atomId,
      'progress.overallPercentage': overallPercentage,
      lastActiveAt: serverTimestamp(),
    });

    // Invalidate progress cache after update
    invalidateProgressCache(userId);

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
 * Uses users.streak (primary location)
 * Wrapped in transaction to prevent race conditions
 */
async function updateStreakOnCompletion(userId: string): Promise<void> {
  const userRef = adminDb.collection('users').doc(userId);
  const today = new Date().toISOString().split('T')[0];

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayString = yesterday.toISOString().split('T')[0];

  await adminDb.runTransaction(async (transaction) => {
    const userSnap = await transaction.get(userRef);
    const userData = userSnap.data();

    const streakData = userData?.streak || {
      currentStreak: 0,
      longestStreak: 0,
      lastCompletedDate: '',
      freezesAvailable: 2,
      freezesUsed: [],
      streakHistory: [],
    };

    const lastCompletedDate = streakData.lastCompletedDate || '';

    // If today's activity already recorded, don't update streak
    if (lastCompletedDate === today) {
      return;
    }

    let newStreak = streakData.currentStreak || 0;

    // If last activity was yesterday, increment streak
    if (lastCompletedDate === yesterdayString) {
      newStreak++;
    } else if (lastCompletedDate && lastCompletedDate !== yesterdayString) {
      // Gap > 1 day - check freezes
      if (streakData.freezesAvailable > 0) {
        // Apply freeze and return early
        transaction.update(userRef, {
          'streak.freezesAvailable': streakData.freezesAvailable - 1,
          'streak.freezesUsed': arrayUnion(yesterdayString),
          'streak.lastCompletedDate': today,
        });
        return;
      }
      // No freezes available - reset streak
      newStreak = 1;
    } else {
      // First activity
      newStreak = 1;
    }

    // Update longest streak if needed
    const longestStreak = Math.max(streakData.longestStreak || 0, newStreak);

    transaction.update(userRef, {
      'streak.currentStreak': newStreak,
      'streak.longestStreak': longestStreak,
      'streak.lastCompletedDate': today,
    });
  });
}

/**
 * Trigger badge criteria check asynchronously
 * Uses users.progress (primary location)
 */
async function triggerBadgeCriteriaCheck(userId: string): Promise<void> {
  // This would typically trigger a Cloud Function or queue a job
  // For now, we'll implement basic badge checks here
  try {
    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();
    const userData = userSnap.data();

    const badgesToCheck = [];

    // Check for completion badges (from users.progress)
    const atomsCompleted = userData?.progress?.atomsCompleted?.length || 0;
    if (atomsCompleted >= 10) badgesToCheck.push('first-10-atoms');
    if (atomsCompleted >= 50) badgesToCheck.push('fifty-atoms');
    if (atomsCompleted >= 100) badgesToCheck.push('hundred-atoms');

    // Check for streak badges (from users.streak)
    const currentStreak = userData?.streak?.currentStreak || 0;
    if (currentStreak >= 7) badgesToCheck.push('week-warrior');
    if (currentStreak >= 30) badgesToCheck.push('month-master');

    // Award badges (in production, would validate in userAchievements collection)
    if (badgesToCheck.length > 0) {
      // Log badge check without exposing user ID
      console.log(`[Badge] Checking ${badgesToCheck.length} potential badges`);
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

      // Validate computed values before writing to Firestore
      const masteryLevel = updatedMastery.masteryLevel;
      const fsrsState = updatedMastery.fsrsState;

      // Ensure mastery level is valid (0-100 range)
      if (typeof masteryLevel !== 'number' || isNaN(masteryLevel) || masteryLevel < 0 || masteryLevel > 100) {
        console.error(`Invalid masteryLevel for concept ${conceptId}: ${masteryLevel}`);
        continue;
      }

      // Ensure FSRS state has valid stability (must be > 0)
      if (!fsrsState || typeof fsrsState.stability !== 'number' || fsrsState.stability <= 0) {
        console.error(`Invalid FSRS stability for concept ${conceptId}: ${fsrsState?.stability}`);
        // Fix invalid stability before writing
        if (fsrsState) {
          fsrsState.stability = 0.1; // Minimum safe value
        }
      }

      // Ensure dates are valid Date objects
      const nextReviewAt = updatedMastery.nextReviewAt instanceof Date && !isNaN(updatedMastery.nextReviewAt.getTime())
        ? updatedMastery.nextReviewAt
        : new Date();
      const lastReviewedAt = updatedMastery.lastReviewedAt instanceof Date && !isNaN(updatedMastery.lastReviewedAt.getTime())
        ? updatedMastery.lastReviewedAt
        : new Date();

      // Save validated mastery to Firestore
      await reviewRef.set({
        conceptId,
        userId,
        masteryLevel: Math.max(0, Math.min(100, masteryLevel)), // Clamp to valid range
        lastReviewedAt,
        lastQuizScore: Math.max(0, Math.min(100, updatedMastery.lastQuizScore || 0)),
        reviewCount: Math.max(0, updatedMastery.reviewCount || 0),
        correctStreak: Math.max(0, updatedMastery.correctStreak || 0),
        incorrectStreak: Math.max(0, updatedMastery.incorrectStreak || 0),
        fsrsState: {
          stability: Math.max(0.1, fsrsState.stability), // Ensure minimum stability
          difficulty: Math.max(0, Math.min(10, fsrsState.difficulty || 0)),
          elapsedDays: Math.max(0, fsrsState.elapsedDays || 0),
          scheduledDays: Math.max(0, fsrsState.scheduledDays || 0),
          reps: Math.max(0, fsrsState.reps || 0),
          lapses: Math.max(0, fsrsState.lapses || 0),
          state: fsrsState.state || 'new',
        },
        nextReviewAt,
        dueDate: nextReviewAt,
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
