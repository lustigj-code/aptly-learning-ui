/**
 * User Service
 * Handles all Firestore operations for user documents
 * Server-side only - uses firebase-admin SDK
 */

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { User, UserPreferences } from '@/lib/auth/schemas';

/**
 * Fetch a user document by UID
 * @param uid - User's Firebase UID
 * @returns User document or null if not found
 * @throws Error if database operation fails
 */
export async function getUser(uid: string): Promise<User | null> {
  try {
    if (!uid || typeof uid !== 'string') {
      throw new Error('Invalid UID provided');
    }

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
  } catch (error) {
    console.error(`Error fetching user ${uid}:`, error);
    throw new Error(`Failed to fetch user: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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
  try {
    if (!uid || !email || !name) {
      throw new Error('UID, email, and name are required');
    }

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
  } catch (error) {
    console.error(`Error creating user ${uid}:`, error);
    throw new Error(
      `Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
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
  try {
    if (!uid || typeof uid !== 'string') {
      throw new Error('Invalid UID provided');
    }

    if (!preferences || Object.keys(preferences).length === 0) {
      throw new Error('At least one preference field is required');
    }

    const updateData: Record<string, any> = {};
    Object.entries(preferences).forEach(([key, value]) => {
      updateData[`preferences.${key}`] = value;
    });

    await adminDb.collection('users').doc(uid).update(updateData);
  } catch (error) {
    console.error(`Error updating preferences for user ${uid}:`, error);
    throw new Error(
      `Failed to update preferences: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
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
  try {
    if (!uid || typeof uid !== 'string') {
      throw new Error('Invalid UID provided');
    }

    if (!data || Object.keys(data).length === 0) {
      throw new Error('At least one field is required for update');
    }

    // Filter out nested objects that need special handling
    const { preferences, progress, streak, badges, ...flatData } = data;

    const updateData: Record<string, any> = {
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
  } catch (error) {
    console.error(`Error updating user profile for ${uid}:`, error);
    throw new Error(
      `Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Soft delete a user (mark as inactive)
 * Does not delete the document, only sets status to 'inactive'
 * @param uid - User's Firebase UID
 * @returns Void on success
 * @throws Error if update fails
 */
export async function deleteUser(uid: string): Promise<void> {
  try {
    if (!uid || typeof uid !== 'string') {
      throw new Error('Invalid UID provided');
    }

    await adminDb.collection('users').doc(uid).update({
      status: 'inactive',
    });
  } catch (error) {
    console.error(`Error deleting user ${uid}:`, error);
    throw new Error(
      `Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Check if a user exists
 * @param uid - User's Firebase UID
 * @returns Boolean indicating if user exists
 * @throws Error if database operation fails
 */
export async function userExists(uid: string): Promise<boolean> {
  try {
    if (!uid || typeof uid !== 'string') {
      throw new Error('Invalid UID provided');
    }

    const doc = await adminDb.collection('users').doc(uid).get();
    return doc.exists;
  } catch (error) {
    console.error(`Error checking user existence for ${uid}:`, error);
    throw new Error(
      `Failed to check user existence: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get user's email by UID
 * @param uid - User's Firebase UID
 * @returns User's email or null if not found
 * @throws Error if database operation fails
 */
export async function getUserEmail(uid: string): Promise<string | null> {
  try {
    if (!uid || typeof uid !== 'string') {
      throw new Error('Invalid UID provided');
    }

    const doc = await adminDb.collection('users').doc(uid).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    return data?.email || null;
  } catch (error) {
    console.error(`Error fetching user email for ${uid}:`, error);
    throw new Error(
      `Failed to fetch user email: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
