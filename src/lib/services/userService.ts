/**
 * User Service
 * Handles all Firestore operations for user documents
 * Server-side only - uses firebase-admin SDK
 */

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { User, UserPreferences } from '@/lib/auth/schemas';
import { withErrorHandling, validateString, validateRequired } from '@/lib/errors/handlers';

/**
 * Fetch a user document by UID
 * @param uid - User's Firebase UID
 * @returns User document or null if not found
 * @throws Error if database operation fails
 */
export async function getUser(uid: string): Promise<User | null> {
  return withErrorHandling(`fetch user ${uid}`, async () => {
    validateString('uid', uid);

    const doc = await adminDb.collection('users').doc(uid).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    if (!data) {
      return null;
    }

    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      progress: {
        ...data.progress,
        lastActiveAt: data.progress?.lastActiveAt?.toDate?.() || new Date(),
      },
      streak: {
        ...data.streak,
      },
      badges: data.badges || [],
    } as User;
  });
}

/**
 * Create a new user document in Firestore
 * Called after Firebase Authentication signup
 * @param uid - User's Firebase UID
 * @param email - User's email address
 * @param name - User's display name
 * @returns Void on success
 * @throws Error if document creation fails
 */
export async function createUser(uid: string, email: string, name: string): Promise<void> {
  return withErrorHandling(`create user ${uid}`, async () => {
    validateRequired({ uid, email, name });

    const newUser: Omit<User, 'id'> = {
      name,
      email,
      createdAt: new Date(),
      avatar: undefined,
      preferences: {
        learningPace: 'moderate',
        dailyGoalMinutes: 30,
        preferredLearningTime: 'morning',
        voiceEnabled: true,
        soundEffectsEnabled: true,
        reducedMotion: false,
      },
      progress: {
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
      },
      streak: {
        currentStreak: 0,
        longestStreak: 0,
        lastCompletedDate: '',
        freezesAvailable: 2,
        freezesUsed: [],
        streakHistory: [],
      },
      badges: [],
      status: 'active',
    };

    await adminDb.collection('users').doc(uid).set({
      ...newUser,
      createdAt: FieldValue.serverTimestamp(),
      'progress.lastActiveAt': FieldValue.serverTimestamp(),
    });
  });
}

/**
 * Update user preferences
 * @param uid - User's Firebase UID
 * @param preferences - Partial preferences object to merge
 * @returns Void on success
 * @throws Error if update fails
 */
export async function updateUserPreferences(
  uid: string,
  preferences: Partial<UserPreferences>
): Promise<void> {
  return withErrorHandling(`update preferences for user ${uid}`, async () => {
    validateString('uid', uid);

    if (!preferences || Object.keys(preferences).length === 0) {
      throw new Error('At least one preference field is required');
    }

    const updateData: Record<string, unknown> = {};
    Object.entries(preferences).forEach(([key, value]) => {
      updateData[`preferences.${key}`] = value;
    });

    await adminDb.collection('users').doc(uid).update(updateData);
  });
}

/**
 * Update user profile fields
 * Allows updating name, avatar, goal, experienceLevel, etc.
 * @param uid - User's Firebase UID
 * @param data - Partial user data to merge
 * @returns Void on success
 * @throws Error if update fails
 */
export async function updateUserProfile(
  uid: string,
  data: Partial<Omit<User, 'id' | 'email' | 'createdAt'>>
): Promise<void> {
  return withErrorHandling(`update user profile for ${uid}`, async () => {
    validateString('uid', uid);

    if (!data || Object.keys(data).length === 0) {
      throw new Error('At least one field is required for update');
    }

    // Filter out nested objects that need special handling
    const { preferences, progress, streak, badges: _badges, ...flatData } = data;

    const updateData: Record<string, unknown> = {
      ...flatData,
    };

    // Handle nested updates
    if (preferences) {
      Object.entries(preferences).forEach(([key, value]) => {
        updateData[`preferences.${key}`] = value;
      });
    }

    if (progress) {
      Object.entries(progress).forEach(([key, value]) => {
        updateData[`progress.${key}`] = value;
      });
    }

    if (streak) {
      Object.entries(streak).forEach(([key, value]) => {
        updateData[`streak.${key}`] = value;
      });
    }

    await adminDb.collection('users').doc(uid).update(updateData);
  });
}

/**
 * Soft delete a user (mark as inactive)
 * Does not delete the document, only sets status to 'inactive'
 * @param uid - User's Firebase UID
 * @returns Void on success
 * @throws Error if update fails
 */
export async function deleteUser(uid: string): Promise<void> {
  return withErrorHandling(`delete user ${uid}`, async () => {
    validateString('uid', uid);

    await adminDb.collection('users').doc(uid).update({
      status: 'inactive',
    });
  });
}

/**
 * Check if a user exists
 * @param uid - User's Firebase UID
 * @returns Boolean indicating if user exists
 * @throws Error if database operation fails
 */
export async function userExists(uid: string): Promise<boolean> {
  return withErrorHandling(`check user existence for ${uid}`, async () => {
    validateString('uid', uid);

    const doc = await adminDb.collection('users').doc(uid).get();
    return doc.exists;
  });
}

/**
 * Get user's email by UID
 * @param uid - User's Firebase UID
 * @returns User's email or null if not found
 * @throws Error if database operation fails
 */
export async function getUserEmail(uid: string): Promise<string | null> {
  return withErrorHandling(`fetch user email for ${uid}`, async () => {
    validateString('uid', uid);

    const doc = await adminDb.collection('users').doc(uid).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    return data?.email || null;
  });
}
