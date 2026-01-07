/**
 * Progress Service
 * Handles all Firestore operations for user progress tracking
 * Server-side only - uses firebase-admin SDK
 */

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type {
  UserProgress,
  StreakDay,
  AssessmentScore,
  MasteryLevel,
} from '@/lib/auth/schemas';

/**
 * Get a user's complete progress document
 * @param uid - User's Firebase UID
 * @returns UserProgress document or null if not found
 * @throws Error if database operation fails
 */
export async function getUserProgress(uid: string): Promise<UserProgress | null> {
  try {
    if (!uid || typeof uid !== 'string') {
      throw new Error('Invalid UID provided');
    }

    const doc = await adminDb.collection('userProgress').doc(uid).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    if (!data) {
      return null;
    }

    return {
      userId: uid,
      ...data,
      lastActiveAt: data.lastActiveAt?.toDate?.() || new Date(),
    } as UserProgress;
  } catch (error) {
    console.error(`Error fetching progress for user ${uid}:`, error);
    throw new Error(
      `Failed to fetch progress: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Initialize progress document for a new user
 * Called after user profile creation during signup
 * @param uid - User's Firebase UID
 * @returns Void on success
 * @throws Error if document creation fails
 */
export async function initializeProgress(uid: string): Promise<void> {
  try {
    if (!uid || typeof uid !== 'string') {
      throw new Error('Invalid UID provided');
    }

    const initialProgress: UserProgress = {
      userId: uid,
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
      lastActiveAt: new Date(),
      xp: 0,
    };

    await adminDb.collection('userProgress').doc(uid).set({
      ...initialProgress,
      lastActiveAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error initializing progress for user ${uid}:`, error);
    throw new Error(
      `Failed to initialize progress: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Update any progress fields
 * Flexible update allowing partial updates of progress document
 * @param uid - User's Firebase UID
 * @param data - Partial UserProgress object to merge
 * @returns Void on success
 * @throws Error if update fails
 */
export async function updateProgress(
  uid: string,
  data: Partial<Omit<UserProgress, 'userId'>>
): Promise<void> {
  try {
    if (!uid || typeof uid !== 'string') {
      throw new Error('Invalid UID provided');
    }

    if (!data || Object.keys(data).length === 0) {
      throw new Error('At least one field is required for update');
    }

    const updateData: Record<string, any> = {};

    Object.entries(data).forEach(([key, value]) => {
      if (
        key === 'coursesCompleted' ||
        key === 'modulesCompleted' ||
        key === 'lessonsCompleted' ||
        key === 'atomsCompleted' ||
        key === 'assessmentScores' ||
        key === 'masteryLevels'
      ) {
        // Array fields
        updateData[key] = value;
      } else {
        // Scalar fields
        updateData[key] = value;
      }
    });

    updateData.lastActiveAt = FieldValue.serverTimestamp();

    await adminDb.collection('userProgress').doc(uid).update(updateData);
  } catch (error) {
    console.error(`Error updating progress for user ${uid}:`, error);
    throw new Error(
      `Failed to update progress: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
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
  try {
    if (!uid || !atomId) {
      throw new Error('UID and atomId are required');
    }

    if (typeof xpEarned !== 'number' || xpEarned < 0) {
      throw new Error('xpEarned must be a non-negative number');
    }

    if (typeof timeSpent !== 'number' || timeSpent < 0) {
      throw new Error('timeSpent must be a non-negative number');
    }

    const progressRef = adminDb.collection('userProgress').doc(uid);

    await progressRef.update({
      atomsCompleted: FieldValue.arrayUnion([atomId]),
      xp: FieldValue.increment(xpEarned),
      totalTimeSpentMinutes: FieldValue.increment(timeSpent),
      lastActiveAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error completing atom for user ${uid}:`, error);
    throw new Error(
      `Failed to complete atom: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Mark a lesson as complete
 * Adds to lessonsCompleted array and updates overallPercentage
 * @param uid - User's Firebase UID
 * @param lessonId - The lesson's ID
 * @returns Void on success
 * @throws Error if update fails
 */
export async function completeLesson(uid: string, lessonId: string): Promise<void> {
  try {
    if (!uid || !lessonId) {
      throw new Error('UID and lessonId are required');
    }

    const progressRef = adminDb.collection('userProgress').doc(uid);

    await progressRef.update({
      lessonsCompleted: FieldValue.arrayUnion([lessonId]),
      lastActiveAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error completing lesson for user ${uid}:`, error);
    throw new Error(
      `Failed to complete lesson: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
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
  try {
    if (!uid || !moduleId) {
      throw new Error('UID and moduleId are required');
    }

    const progressRef = adminDb.collection('userProgress').doc(uid);

    await progressRef.update({
      modulesCompleted: FieldValue.arrayUnion([moduleId]),
      lastActiveAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error completing module for user ${uid}:`, error);
    throw new Error(
      `Failed to complete module: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
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
  try {
    if (!uid || !courseId) {
      throw new Error('UID and courseId are required');
    }

    const progressRef = adminDb.collection('userProgress').doc(uid);

    await progressRef.update({
      coursesCompleted: FieldValue.arrayUnion([courseId]),
      lastActiveAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error completing course for user ${uid}:`, error);
    throw new Error(
      `Failed to complete course: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
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
  try {
    if (!uid || typeof uid !== 'string') {
      throw new Error('Invalid UID provided');
    }

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
          minutesStudied: 0, // Can be updated separately
          lessonsCompleted: 1,
        };

        await adminDb.collection('userProgress').doc(uid).update({
          'streak.currentStreak': newStreak,
          'streak.lastCompletedDate': today,
          'streak.longestStreak': Math.max(
            newStreak,
            progress.streak?.longestStreak || 0
          ),
          'streak.streakHistory': FieldValue.arrayUnion([streakDay]),
          lastActiveAt: FieldValue.serverTimestamp(),
        });
      }
    }

    return newStreak;
  } catch (error) {
    console.error(`Error updating streak for user ${uid}:`, error);
    throw new Error(
      `Failed to update streak: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Use one streak freeze to preserve the streak
 * Deducts from freezesAvailable and records usage date
 * @param uid - User's Firebase UID
 * @returns Remaining freezes available
 * @throws Error if update fails or no freezes available
 */
export async function useStreakFreeze(uid: string): Promise<number> {
  try {
    if (!uid || typeof uid !== 'string') {
      throw new Error('Invalid UID provided');
    }

    const progress = await getUserProgress(uid);
    if (!progress) {
      throw new Error('User progress not found');
    }

    const freezesAvailable = progress.streak?.freezesAvailable || 0;

    if (freezesAvailable <= 0) {
      throw new Error('No streak freezes available');
    }

    const today = new Date().toISOString().split('T')[0];

    await adminDb.collection('userProgress').doc(uid).update({
      'streak.freezesAvailable': freezesAvailable - 1,
      'streak.freezesUsed': FieldValue.arrayUnion([today]),
      lastActiveAt: FieldValue.serverTimestamp(),
    });

    return freezesAvailable - 1;
  } catch (error) {
    console.error(`Error using streak freeze for user ${uid}:`, error);
    throw new Error(
      `Failed to use streak freeze: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
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
  try {
    if (!uid || !courseId || !moduleId || !lessonId || !atomId) {
      throw new Error('All location IDs are required');
    }

    await adminDb.collection('userProgress').doc(uid).update({
      currentCourseId: courseId,
      currentModuleId: moduleId,
      currentLessonId: lessonId,
      currentAtomId: atomId,
      lastActiveAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error setting current location for user ${uid}:`, error);
    throw new Error(
      `Failed to set current location: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
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
  try {
    if (!uid || !assessmentId) {
      throw new Error('UID and assessmentId are required');
    }

    if (typeof score !== 'number' || score < 0 || score > 100) {
      throw new Error('Score must be a number between 0 and 100');
    }

    const assessmentScore: AssessmentScore = {
      assessmentId,
      score,
      completedAt: new Date(),
    };

    await adminDb.collection('userProgress').doc(uid).update({
      assessmentScores: FieldValue.arrayUnion([assessmentScore]),
      lastActiveAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error recording assessment score for user ${uid}:`, error);
    throw new Error(
      `Failed to record assessment score: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
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
  try {
    if (!uid || !skillId) {
      throw new Error('UID and skillId are required');
    }

    if (typeof level !== 'number' || level < 1 || level > 5) {
      throw new Error('Mastery level must be between 1 and 5');
    }

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

    await adminDb.collection('userProgress').doc(uid).update({
      masteryLevels: [...filteredMastery, masteryLevel],
      lastActiveAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error updating mastery level for user ${uid}:`, error);
    throw new Error(
      `Failed to update mastery level: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Update overall completion percentage
 * Should be calculated based on completed atoms/lessons/modules
 * @param uid - User's Firebase UID
 * @param percentage - Completion percentage (0-100)
 * @returns Void on success
 * @throws Error if update fails
 */
export async function updateOverallPercentage(uid: string, percentage: number): Promise<void> {
  try {
    if (!uid || typeof uid !== 'string') {
      throw new Error('Invalid UID provided');
    }

    if (typeof percentage !== 'number' || percentage < 0 || percentage > 100) {
      throw new Error('Percentage must be between 0 and 100');
    }

    await adminDb.collection('userProgress').doc(uid).update({
      overallPercentage: percentage,
      lastActiveAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error updating overall percentage for user ${uid}:`, error);
    throw new Error(
      `Failed to update overall percentage: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
