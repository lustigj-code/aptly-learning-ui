/**
 * Progress Service
 * Handles all Firestore operations for user progress tracking
 * Server-side only - uses firebase-admin SDK
 *
 * IMPORTANT: All progress data is stored in the `users` collection
 * under the `progress` field (e.g., `users/{uid}.progress.lessonsCompleted`)
 */

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type {
  UserProgress,
  StreakDay,
  AssessmentScore,
  MasteryLevel,
} from '@/lib/auth/schemas';
import { withErrorHandling, validateString, validateRequired, validateNumber } from '@/lib/errors/handlers';

/**
 * Get a user's complete progress data from the users collection
 * @param uid - User's Firebase UID
 * @returns UserProgress object or null if not found
 * @throws Error if database operation fails
 */
export async function getUserProgress(uid: string): Promise<UserProgress | null> {
  return withErrorHandling(`fetch progress for user ${uid}`, async () => {
    validateString('uid', uid);

    const doc = await adminDb.collection('users').doc(uid).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    if (!data || !data.progress) {
      return null;
    }

    const progress = data.progress;
    return {
      userId: uid,
      currentCourseId: progress.currentCourseId || null,
      currentModuleId: progress.currentModuleId || null,
      currentLessonId: progress.currentLessonId || null,
      currentAtomId: progress.currentAtomId || null,
      overallPercentage: progress.overallPercentage || 0,
      coursesCompleted: progress.coursesCompleted || [],
      modulesCompleted: progress.modulesCompleted || [],
      lessonsCompleted: progress.lessonsCompleted || [],
      atomsCompleted: progress.atomsCompleted || [],
      assessmentScores: progress.assessmentScores || [],
      masteryLevels: progress.masteryLevels || [],
      totalTimeSpentMinutes: progress.totalTimeSpentMinutes || 0,
      lastActiveAt: data.lastActiveAt?.toDate?.() || new Date(),
      xp: progress.xp || 0,
      streak: data.streak,
    } as UserProgress;
  });
}

/**
 * Initialize progress fields for a new user
 * Called after user profile creation during signup
 * @param uid - User's Firebase UID
 * @returns Void on success
 * @throws Error if document creation fails
 */
export async function initializeProgress(uid: string): Promise<void> {
  return withErrorHandling(`initialize progress for user ${uid}`, async () => {
    validateString('uid', uid);

    const userRef = adminDb.collection('users').doc(uid);
    const userDoc = await userRef.get();

    const initialProgress = {
      currentCourseId: null,
      currentModuleId: null,
      currentLessonId: null,
      currentAtomId: null,
      overallPercentage: 0,
      coursesCompleted: [],
      modulesCompleted: [],
      lessonsCompleted: [],
      atomsCompleted: [],
      assessmentScores: [],
      masteryLevels: [],
      totalTimeSpentMinutes: 0,
      xp: 0,
      totalXP: 0,
      currentLevel: 1,
    };

    if (userDoc.exists) {
      // Update existing user document
      await userRef.update({
        progress: initialProgress,
        lastActiveAt: FieldValue.serverTimestamp(),
      });
    } else {
      // Create new user document with progress
      await userRef.set({
        createdAt: FieldValue.serverTimestamp(),
        progress: initialProgress,
        streak: {
          currentStreak: 0,
          longestStreak: 0,
          freezesAvailable: 2,
          streakHistory: [],
        },
        lastActiveAt: FieldValue.serverTimestamp(),
      });
    }
  });
}

/**
 * Update any progress fields
 * Flexible update allowing partial updates of progress
 * @param uid - User's Firebase UID
 * @param data - Partial UserProgress object to merge
 * @returns Void on success
 * @throws Error if update fails
 */
export async function updateProgress(
  uid: string,
  data: Partial<Omit<UserProgress, 'userId'>>
): Promise<void> {
  return withErrorHandling(`update progress for user ${uid}`, async () => {
    validateString('uid', uid);

    if (!data || Object.keys(data).length === 0) {
      throw new Error('At least one field is required for update');
    }

    const updateData: Record<string, unknown> = {};

    // Prefix all fields with 'progress.' to nest them correctly
    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'lastActiveAt' && key !== 'streak') {
        updateData[`progress.${key}`] = value;
      }
    });

    updateData.lastActiveAt = FieldValue.serverTimestamp();

    await adminDb.collection('users').doc(uid).update(updateData);
  });
}

/**
 * Mark an atom as complete and award XP
 * Updates atomsCompleted array, xp, and lastActiveAt
 * @param uid - User's Firebase UID
 * @param atomId - The atom's ID
 * @param xpEarned - XP points to add
 * @param timeSpent - Minutes spent on this atom
 * @returns Void on success
 * @throws Error if update fails
 */
export async function completeAtom(
  uid: string,
  atomId: string,
  xpEarned: number,
  timeSpent: number
): Promise<void> {
  return withErrorHandling(`complete atom for user ${uid}`, async () => {
    validateRequired({ uid, atomId });
    validateNumber('xpEarned', xpEarned, 0);
    validateNumber('timeSpent', timeSpent, 0);

    const userRef = adminDb.collection('users').doc(uid);

    await userRef.update({
      'progress.atomsCompleted': FieldValue.arrayUnion(atomId),
      'progress.xp': FieldValue.increment(xpEarned),
      'progress.totalXP': FieldValue.increment(xpEarned),
      'progress.totalTimeSpentMinutes': FieldValue.increment(timeSpent),
      lastActiveAt: FieldValue.serverTimestamp(),
    });
  });
}

/**
 * Mark a lesson as complete
 * Adds to lessonsCompleted array
 * @param uid - User's Firebase UID
 * @param lessonId - The lesson's ID
 * @returns Void on success
 * @throws Error if update fails
 */
export async function completeLesson(uid: string, lessonId: string): Promise<void> {
  return withErrorHandling(`complete lesson for user ${uid}`, async () => {
    validateRequired({ uid, lessonId });

    const userRef = adminDb.collection('users').doc(uid);

    await userRef.update({
      'progress.lessonsCompleted': FieldValue.arrayUnion(lessonId),
      lastActiveAt: FieldValue.serverTimestamp(),
    });
  });
}

/**
 * Complete a module
 * Adds to modulesCompleted array
 * @param uid - User's Firebase UID
 * @param moduleId - The module's ID
 * @returns Void on success
 * @throws Error if update fails
 */
export async function completeModule(uid: string, moduleId: string): Promise<void> {
  return withErrorHandling(`complete module for user ${uid}`, async () => {
    validateRequired({ uid, moduleId });

    const userRef = adminDb.collection('users').doc(uid);

    await userRef.update({
      'progress.modulesCompleted': FieldValue.arrayUnion(moduleId),
      lastActiveAt: FieldValue.serverTimestamp(),
    });
  });
}

/**
 * Complete a course
 * Adds to coursesCompleted array
 * @param uid - User's Firebase UID
 * @param courseId - The course's ID
 * @returns Void on success
 * @throws Error if update fails
 */
export async function completeCourse(uid: string, courseId: string): Promise<void> {
  return withErrorHandling(`complete course for user ${uid}`, async () => {
    validateRequired({ uid, courseId });

    const userRef = adminDb.collection('users').doc(uid);

    await userRef.update({
      'progress.coursesCompleted': FieldValue.arrayUnion(courseId),
      lastActiveAt: FieldValue.serverTimestamp(),
    });
  });
}

/**
 * Update daily streak
 * Increments streak if completed today, resets if not completed
 * @param uid - User's Firebase UID
 * @param completedToday - Whether user completed learning today
 * @returns Updated streak count
 * @throws Error if update fails
 */
export async function updateStreak(uid: string, completedToday: boolean): Promise<number> {
  return withErrorHandling(`update streak for user ${uid}`, async () => {
    validateString('uid', uid);

    const progress = await getUserProgress(uid);
    if (!progress) {
      throw new Error('User progress not found');
    }

    const today = new Date().toISOString().split('T')[0];
    const lastDate = progress.streak?.lastCompletedDate || '';

    let newStreak = progress.streak?.currentStreak || 0;

    if (completedToday) {
      // Check if already completed today
      if (lastDate !== today) {
        // New completion for today
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        // If last completed was yesterday, increment streak
        if (lastDate === yesterdayStr) {
          newStreak += 1;
        } else {
          // Gap in streak - reset to 1
          newStreak = 1;
        }

        // Add today to history
        const streakDay: StreakDay = {
          date: today,
          completed: true,
          minutesStudied: 0,
          lessonsCompleted: 1,
        };

        await adminDb.collection('users').doc(uid).update({
          'streak.currentStreak': newStreak,
          'streak.lastCompletedDate': today,
          'streak.longestStreak': Math.max(
            newStreak,
            progress.streak?.longestStreak || 0
          ),
          'streak.streakHistory': FieldValue.arrayUnion(streakDay),
          lastActiveAt: FieldValue.serverTimestamp(),
        });
      }
    }

    return newStreak;
  });
}

/**
 * Use one streak freeze to preserve the streak
 * Deducts from freezesAvailable and records usage date
 * @param uid - User's Firebase UID
 * @returns Remaining freezes available
 * @throws Error if update fails or no freezes available
 */
export async function useStreakFreeze(uid: string): Promise<number> {
  return withErrorHandling(`use streak freeze for user ${uid}`, async () => {
    validateString('uid', uid);

    const progress = await getUserProgress(uid);
    if (!progress) {
      throw new Error('User progress not found');
    }

    const freezesAvailable = progress.streak?.freezesAvailable || 0;

    if (freezesAvailable <= 0) {
      throw new Error('No streak freezes available');
    }

    const today = new Date().toISOString().split('T')[0];

    await adminDb.collection('users').doc(uid).update({
      'streak.freezesAvailable': freezesAvailable - 1,
      'streak.freezesUsed': FieldValue.arrayUnion(today),
      lastActiveAt: FieldValue.serverTimestamp(),
    });

    return freezesAvailable - 1;
  });
}

/**
 * Set current course, module, lesson, and atom in progress
 * @param uid - User's Firebase UID
 * @param courseId - Course ID
 * @param moduleId - Module ID
 * @param lessonId - Lesson ID
 * @param atomId - Atom ID
 * @returns Void on success
 * @throws Error if update fails
 */
export async function setCurrentLocation(
  uid: string,
  courseId: string,
  moduleId: string,
  lessonId: string,
  atomId: string
): Promise<void> {
  return withErrorHandling(`set current location for user ${uid}`, async () => {
    validateRequired({ uid, courseId, moduleId, lessonId, atomId });

    await adminDb.collection('users').doc(uid).update({
      'progress.currentCourseId': courseId,
      'progress.currentModuleId': moduleId,
      'progress.currentLessonId': lessonId,
      'progress.currentAtomId': atomId,
      lastActiveAt: FieldValue.serverTimestamp(),
    });
  });
}

/**
 * Add an assessment score to user's progress
 * @param uid - User's Firebase UID
 * @param assessmentId - Assessment ID
 * @param score - Score achieved
 * @returns Void on success
 * @throws Error if update fails
 */
export async function recordAssessmentScore(
  uid: string,
  assessmentId: string,
  score: number
): Promise<void> {
  return withErrorHandling(`record assessment score for user ${uid}`, async () => {
    validateRequired({ uid, assessmentId });
    validateNumber('score', score, 0, 100);

    const assessmentScore: AssessmentScore = {
      assessmentId,
      score,
      completedAt: new Date(),
    };

    await adminDb.collection('users').doc(uid).update({
      'progress.assessmentScores': FieldValue.arrayUnion(assessmentScore),
      lastActiveAt: FieldValue.serverTimestamp(),
    });
  });
}

/**
 * Update mastery level for a skill
 * @param uid - User's Firebase UID
 * @param skillId - Skill ID
 * @param level - Mastery level (1-5)
 * @returns Void on success
 * @throws Error if update fails
 */
export async function updateMasteryLevel(
  uid: string,
  skillId: string,
  level: number
): Promise<void> {
  return withErrorHandling(`update mastery level for user ${uid}`, async () => {
    validateRequired({ uid, skillId });
    validateNumber('level', level, 1, 5);

    const masteryLevel: MasteryLevel = {
      skillId,
      level,
    };

    // Remove old entry if exists and add new one
    const progress = await getUserProgress(uid);
    if (!progress) {
      throw new Error('User progress not found');
    }

    const filteredMastery = progress.masteryLevels.filter(m => m.skillId !== skillId);

    await adminDb.collection('users').doc(uid).update({
      'progress.masteryLevels': [...filteredMastery, masteryLevel],
      lastActiveAt: FieldValue.serverTimestamp(),
    });
  });
}

/**
 * Update overall completion percentage
 * @param uid - User's Firebase UID
 * @param percentage - Completion percentage (0-100)
 * @returns Void on success
 * @throws Error if update fails
 */
export async function updateOverallPercentage(uid: string, percentage: number): Promise<void> {
  return withErrorHandling(`update overall percentage for user ${uid}`, async () => {
    validateString('uid', uid);
    validateNumber('percentage', percentage, 0, 100);

    await adminDb.collection('users').doc(uid).update({
      'progress.overallPercentage': percentage,
      lastActiveAt: FieldValue.serverTimestamp(),
    });
  });
}
