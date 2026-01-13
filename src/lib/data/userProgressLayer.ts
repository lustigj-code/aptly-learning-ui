/**
 * Unified User Progress Layer
 *
 * Resolves the collection duality issue between:
 * - `users` collection: Original progress storage
 * - `userProgress` collection: Legacy/alternative progress storage
 * - `learners` collection: Newer structure with subcollections
 *
 * This layer provides a single interface for reading user progress
 * with fallback logic and eventual migration support.
 *
 * Migration Strategy:
 * 1. Reads: Try `users` first, fallback to `userProgress`, then `learners`
 * 2. Writes: Write to `users` (primary), optionally sync to others
 * 3. Migration: Batch job to consolidate data (documented below)
 *
 * MIGRATION DOCUMENTATION:
 * To run the migration, execute a Cloud Function or script that:
 * 1. Iterates through `userProgress` collection
 * 2. For each doc, merges data into `users/{userId}.progress`
 * 3. Marks `userProgress/{userId}` as migrated
 * 4. After verification, archive or delete `userProgress` docs
 */

import { adminDb } from '@/lib/firebase/admin';
import { LRUCache } from '@/lib/cache/LRUCache';

// Types for user progress data
export interface UserProgress {
  atomsCompleted: string[];
  lessonsCompleted: string[];
  modulesCompleted?: string[];
  coursesCompleted?: string[];
  totalXP: number;
  currentLevel: number;
  overallPercentage: number;
  currentCourseId?: string;
  currentModuleId?: string;
  currentLessonId?: string;
  lastAtomId?: string;
  resumeState?: {
    atomId: string;
    atomType: string;
    videoTimestamp?: number;
    quizQuestionIndex?: number;
    quizAnswers?: unknown;
    scrollPosition?: number;
    practiceResponse?: string;
    lastUpdated?: Date;
  };
}

export interface UserStreak {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate?: string;
  freezesAvailable: number;
  streakHistory: Array<{ date: string; completed: boolean }>;
}

export interface FullUserData {
  progress: UserProgress;
  streak: UserStreak;
  createdAt?: Date;
  lastActiveAt?: Date;
  source: 'users' | 'userProgress' | 'learners';
}

// Cache for user progress (5 minute TTL, max 500 users)
const progressCache = new LRUCache<string, FullUserData>({
  maxSize: 500,
  ttlMs: 5 * 60 * 1000, // 5 minutes
  cleanupIntervalMs: 60 * 1000, // Cleanup every minute
});

// Default empty progress for new users
const DEFAULT_PROGRESS: UserProgress = {
  atomsCompleted: [],
  lessonsCompleted: [],
  modulesCompleted: [],
  coursesCompleted: [],
  totalXP: 0,
  currentLevel: 1,
  overallPercentage: 0,
};

const DEFAULT_STREAK: UserStreak = {
  currentStreak: 0,
  longestStreak: 0,
  freezesAvailable: 2,
  streakHistory: [],
};

/**
 * Get user progress with unified fallback logic
 *
 * Read order:
 * 1. Check cache
 * 2. Try `users` collection (primary source)
 * 3. Fallback to `userProgress` collection (legacy)
 * 4. Fallback to `learners` collection (newer structure)
 * 5. Return defaults if not found anywhere
 */
export async function getUserProgress(
  userId: string,
  options: { skipCache?: boolean } = {}
): Promise<FullUserData> {
  // Check cache first
  if (!options.skipCache) {
    const cached = progressCache.get(userId);
    if (cached) {
      return cached;
    }
  }

  try {
    // 1. Try `users` collection (primary)
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      if (userData?.progress) {
        const result: FullUserData = {
          progress: {
            ...DEFAULT_PROGRESS,
            ...userData.progress,
          },
          streak: {
            ...DEFAULT_STREAK,
            ...userData.streak,
          },
          createdAt: userData.createdAt?.toDate?.() ?? undefined,
          lastActiveAt: userData.lastActiveAt?.toDate?.() ?? undefined,
          source: 'users',
        };
        progressCache.set(userId, result);
        return result;
      }
    }

    // 2. Fallback to `userProgress` collection (legacy)
    // @deprecated - This collection should be migrated to `users`
    const userProgressDoc = await adminDb
      .collection('userProgress')
      .doc(userId)
      .get();
    if (userProgressDoc.exists) {
      const data = userProgressDoc.data();
      const result: FullUserData = {
        progress: {
          atomsCompleted: data?.atomsCompleted ?? [],
          lessonsCompleted: data?.lessonsCompleted ?? [],
          modulesCompleted: data?.modulesCompleted ?? [],
          coursesCompleted: data?.coursesCompleted ?? [],
          totalXP: data?.totalXP ?? 0,
          currentLevel: data?.currentLevel ?? 1,
          overallPercentage: data?.overallPercentage ?? 0,
          currentCourseId: data?.currentCourseId,
          currentModuleId: data?.currentModuleId,
          currentLessonId: data?.currentLessonId,
          lastAtomId: data?.lastAtomId,
        },
        streak: {
          currentStreak: data?.currentStreak ?? 0,
          longestStreak: data?.longestStreak ?? 0,
          freezesAvailable: data?.freezesAvailable ?? 2,
          streakHistory: data?.streakHistory ?? [],
          lastCompletedDate: data?.lastCompletedDate,
        },
        source: 'userProgress',
      };
      progressCache.set(userId, result);

      // Log deprecation warning in development
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `[UserProgressLayer] User ${userId} data from deprecated 'userProgress' collection. ` +
            'Consider running migration.'
        );
      }

      return result;
    }

    // 3. Fallback to `learners` collection (newer structure)
    const learnersProgressDoc = await adminDb
      .doc(`learners/${userId}/data/progress`)
      .get();
    if (learnersProgressDoc.exists) {
      const data = learnersProgressDoc.data();
      const result: FullUserData = {
        progress: {
          ...DEFAULT_PROGRESS,
          ...data,
        },
        streak: DEFAULT_STREAK,
        source: 'learners',
      };
      progressCache.set(userId, result);
      return result;
    }

    // 4. Return defaults for new users
    return {
      progress: DEFAULT_PROGRESS,
      streak: DEFAULT_STREAK,
      source: 'users',
    };
  } catch (error) {
    console.error(`[UserProgressLayer] Error fetching progress for ${userId}:`, error);
    throw error;
  }
}

/**
 * Get atoms completed for a user (convenience method)
 * Optimized for the common use case in courses API
 */
export async function getAtomsCompleted(userId: string): Promise<string[]> {
  const userData = await getUserProgress(userId);
  return userData.progress.atomsCompleted;
}

/**
 * Invalidate cache for a user
 * Call after progress updates to ensure fresh data
 */
export function invalidateProgressCache(userId: string): void {
  progressCache.delete(userId);
}

/**
 * Clear entire progress cache
 * Useful for admin operations or testing
 */
export function clearProgressCache(): void {
  progressCache.clear();
}

/**
 * Get cache statistics for monitoring
 */
export function getProgressCacheStats(): { size: number; maxSize: number; ttlMs: number } {
  return progressCache.getStats();
}

/**
 * Batch get progress for multiple users
 * More efficient than individual calls for lists
 */
export async function batchGetUserProgress(
  userIds: string[]
): Promise<Map<string, FullUserData>> {
  const results = new Map<string, FullUserData>();
  const uncached: string[] = [];

  // Check cache first
  for (const userId of userIds) {
    const cached = progressCache.get(userId);
    if (cached) {
      results.set(userId, cached);
    } else {
      uncached.push(userId);
    }
  }

  // Batch fetch uncached users
  if (uncached.length > 0) {
    // Firestore getAll supports up to 100 docs at once
    const batches: string[][] = [];
    for (let i = 0; i < uncached.length; i += 100) {
      batches.push(uncached.slice(i, i + 100));
    }

    for (const batch of batches) {
      const refs = batch.map((id) => adminDb.collection('users').doc(id));
      const docs = await adminDb.getAll(...refs);

      for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        const userId = batch[i];

        if (doc.exists) {
          const userData = doc.data();
          const result: FullUserData = {
            progress: {
              ...DEFAULT_PROGRESS,
              ...userData?.progress,
            },
            streak: {
              ...DEFAULT_STREAK,
              ...userData?.streak,
            },
            source: 'users',
          };
          progressCache.set(userId, result);
          results.set(userId, result);
        } else {
          // Will need to check fallback collections individually
          const fallbackData = await getUserProgress(userId);
          results.set(userId, fallbackData);
        }
      }
    }
  }

  return results;
}

// ============================================
// MIGRATION HELPERS (for future use)
// ============================================

/**
 * Check if a user needs migration from userProgress to users
 * @internal For migration scripts
 */
export async function checkMigrationNeeded(userId: string): Promise<boolean> {
  const userDoc = await adminDb.collection('users').doc(userId).get();
  const hasUserProgress = userDoc.exists && userDoc.data()?.progress;

  const legacyDoc = await adminDb.collection('userProgress').doc(userId).get();
  const hasLegacyProgress = legacyDoc.exists;

  // Migration needed if legacy exists but primary doesn't have all data
  return hasLegacyProgress && !hasUserProgress;
}

/**
 * Migrate a single user from userProgress to users collection
 * @internal For migration scripts - DO NOT call in production APIs
 */
export async function migrateUserProgress(userId: string): Promise<boolean> {
  const legacyDoc = await adminDb.collection('userProgress').doc(userId).get();
  if (!legacyDoc.exists) {
    return false; // Nothing to migrate
  }

  const legacyData = legacyDoc.data();
  const userRef = adminDb.collection('users').doc(userId);
  const userDoc = await userRef.get();

  // Merge legacy data into users collection
  const mergedProgress: UserProgress = {
    atomsCompleted: [
      ...new Set([
        ...(userDoc.data()?.progress?.atomsCompleted ?? []),
        ...(legacyData?.atomsCompleted ?? []),
      ]),
    ],
    lessonsCompleted: [
      ...new Set([
        ...(userDoc.data()?.progress?.lessonsCompleted ?? []),
        ...(legacyData?.lessonsCompleted ?? []),
      ]),
    ],
    modulesCompleted: [
      ...new Set([
        ...(userDoc.data()?.progress?.modulesCompleted ?? []),
        ...(legacyData?.modulesCompleted ?? []),
      ]),
    ],
    coursesCompleted: [
      ...new Set([
        ...(userDoc.data()?.progress?.coursesCompleted ?? []),
        ...(legacyData?.coursesCompleted ?? []),
      ]),
    ],
    totalXP: Math.max(
      userDoc.data()?.progress?.totalXP ?? 0,
      legacyData?.totalXP ?? 0
    ),
    currentLevel: Math.max(
      userDoc.data()?.progress?.currentLevel ?? 1,
      legacyData?.currentLevel ?? 1
    ),
    overallPercentage: Math.max(
      userDoc.data()?.progress?.overallPercentage ?? 0,
      legacyData?.overallPercentage ?? 0
    ),
    currentCourseId:
      userDoc.data()?.progress?.currentCourseId ?? legacyData?.currentCourseId,
    currentModuleId:
      userDoc.data()?.progress?.currentModuleId ?? legacyData?.currentModuleId,
    currentLessonId:
      userDoc.data()?.progress?.currentLessonId ?? legacyData?.currentLessonId,
    lastAtomId:
      userDoc.data()?.progress?.lastAtomId ?? legacyData?.lastAtomId,
  };

  await userRef.set(
    {
      progress: mergedProgress,
      migratedFromUserProgress: true,
      migratedAt: new Date(),
    },
    { merge: true }
  );

  // Mark legacy doc as migrated (don't delete yet for safety)
  await legacyDoc.ref.update({
    _migrated: true,
    _migratedAt: new Date(),
  });

  // Invalidate cache
  invalidateProgressCache(userId);

  return true;
}
