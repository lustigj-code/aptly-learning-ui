/**
 * User API Client
 * Handles all user-related API endpoints
 */

import { post, get, patch, type ApiResponse } from './client';
import type { LearningPace, LearningTime } from '@/types';

// ============================================
// REQUEST TYPES
// ============================================

export type CreateProfileRequest = {
  uid: string;
  email: string;
  name: string;
  onboardingCompleted?: boolean;
};

export type UpdateProfileRequest = {
  name?: string;
  avatar?: string | null;
  goal?: string;
  experienceLevel?: number;
  onboardingCompleted?: boolean;
};

export type UpdatePreferencesRequest = {
  learningPace?: LearningPace;
  dailyGoalMinutes?: number;
  preferredLearningTime?: LearningTime;
  voiceEnabled?: boolean;
  soundEffectsEnabled?: boolean;
  reducedMotion?: boolean;
};

// ============================================
// RESPONSE TYPES
// ============================================

export type UserPreferencesData = {
  learningPace: LearningPace;
  dailyGoalMinutes: number;
  preferredLearningTime: LearningTime;
  voiceEnabled: boolean;
  soundEffectsEnabled: boolean;
  reducedMotion: boolean;
};

export type StreakDataResponse = {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string;
  freezesAvailable: number;
  freezesUsed: string[];
  streakHistory: Array<{
    date: string;
    completed: boolean;
    minutesStudied: number;
    lessonsCompleted: number;
  }>;
};

export type UserProgressData = {
  currentCourseId: string | null;
  currentModuleId: string | null;
  currentLessonId: string | null;
  currentAtomId: string | null;
  overallPercentage: number;
  coursesCompleted: string[];
  modulesCompleted: string[];
  lessonsCompleted: string[];
  atomsCompleted: string[];
  totalTimeSpentMinutes: number;
  lastActiveAt: string;
  xp: number;
  totalXP?: number;
  currentLevel?: number;
  xpToNextLevel?: number;
};

export type UserProfileData = {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  createdAt: string;
  preferences: UserPreferencesData;
  progress: UserProgressData;
  streak: StreakDataResponse;
  badges: Array<{
    id: string;
    title: string;
    earnedAt?: string;
  }>;
  goal?: string;
  experienceLevel?: number;
  onboardingCompleted?: boolean;
  role?: string;
  status?: string;
};

export type CreateProfileResponse = {
  success: boolean;
  message: string;
  data: {
    uid: string;
    email: string;
    name: string;
  };
};

export type UpdateProfileResponse = {
  success: boolean;
  message: string;
};

export type UpdatePreferencesResponse = {
  success: boolean;
  message: string;
};

export type GetProfileResponse = {
  success: boolean;
  user: UserProfileData;
};

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Create a new user profile in Firestore
 * Called after successful Firebase authentication
 *
 * @param data - User profile data
 * @returns Created profile confirmation
 */
export async function createProfile(
  data: CreateProfileRequest
): Promise<ApiResponse<CreateProfileResponse>> {
  return post<CreateProfileResponse>('/api/users/create-profile', data, {
    skipAuth: true, // Profile creation happens before auth is fully set up
  });
}

/**
 * Update user profile fields
 * Allows updating name, avatar, goal, experienceLevel, etc.
 *
 * @param userId - User ID
 * @param data - Profile fields to update
 * @returns Update confirmation
 */
export async function updateProfile(
  userId: string,
  data: UpdateProfileRequest
): Promise<ApiResponse<UpdateProfileResponse>> {
  return patch<UpdateProfileResponse>(`/api/users/${userId}/profile`, data);
}

/**
 * Update user preferences
 *
 * @param userId - User ID
 * @param prefs - Preference fields to update
 * @returns Update confirmation
 */
export async function updatePreferences(
  userId: string,
  prefs: UpdatePreferencesRequest
): Promise<ApiResponse<UpdatePreferencesResponse>> {
  return patch<UpdatePreferencesResponse>(`/api/users/${userId}/preferences`, prefs);
}

/**
 * Get user profile by ID
 *
 * @param userId - User ID
 * @returns Full user profile data
 */
export async function getProfile(
  userId: string
): Promise<ApiResponse<GetProfileResponse>> {
  return get<GetProfileResponse>(`/api/users/${userId}`);
}

/**
 * Get current authenticated user's profile
 *
 * @returns Current user's profile data
 */
export async function getCurrentUserProfile(): Promise<ApiResponse<GetProfileResponse>> {
  return get<GetProfileResponse>('/api/users/me');
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Update a single preference field
 */
export async function updateSinglePreference<K extends keyof UpdatePreferencesRequest>(
  userId: string,
  key: K,
  value: UpdatePreferencesRequest[K]
): Promise<ApiResponse<UpdatePreferencesResponse>> {
  return updatePreferences(userId, { [key]: value } as UpdatePreferencesRequest);
}

/**
 * Toggle a boolean preference
 */
export async function togglePreference(
  userId: string,
  key: 'voiceEnabled' | 'soundEffectsEnabled' | 'reducedMotion',
  currentValue: boolean
): Promise<ApiResponse<UpdatePreferencesResponse>> {
  return updateSinglePreference(userId, key, !currentValue);
}

/**
 * Update learning pace
 */
export async function setLearningPace(
  userId: string,
  pace: LearningPace
): Promise<ApiResponse<UpdatePreferencesResponse>> {
  return updateSinglePreference(userId, 'learningPace', pace);
}

/**
 * Update daily goal
 */
export async function setDailyGoal(
  userId: string,
  minutes: number
): Promise<ApiResponse<UpdatePreferencesResponse>> {
  return updateSinglePreference(userId, 'dailyGoalMinutes', minutes);
}

/**
 * Mark onboarding as complete
 */
export async function completeOnboarding(
  userId: string
): Promise<ApiResponse<UpdateProfileResponse>> {
  return updateProfile(userId, { onboardingCompleted: true });
}

/**
 * Update user's avatar
 */
export async function updateAvatar(
  userId: string,
  avatarUrl: string | null
): Promise<ApiResponse<UpdateProfileResponse>> {
  return updateProfile(userId, { avatar: avatarUrl });
}

/**
 * Update user's display name
 */
export async function updateDisplayName(
  userId: string,
  name: string
): Promise<ApiResponse<UpdateProfileResponse>> {
  return updateProfile(userId, { name });
}

/**
 * Set user's learning goal
 */
export async function setLearningGoal(
  userId: string,
  goal: string
): Promise<ApiResponse<UpdateProfileResponse>> {
  return updateProfile(userId, { goal });
}

/**
 * Set user's experience level (1-5)
 */
export async function setExperienceLevel(
  userId: string,
  level: number
): Promise<ApiResponse<UpdateProfileResponse>> {
  const clampedLevel = Math.max(1, Math.min(5, level));
  return updateProfile(userId, { experienceLevel: clampedLevel });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if user has completed onboarding
 */
export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  const response = await getProfile(userId);

  if (response.success) {
    return response.data.user.onboardingCompleted === true;
  }

  return false;
}

/**
 * Get user's current XP
 */
export async function getUserXP(userId: string): Promise<number> {
  const response = await getProfile(userId);

  if (response.success) {
    return response.data.user.progress.totalXP ?? response.data.user.progress.xp ?? 0;
  }

  return 0;
}

/**
 * Get user's current level
 */
export async function getUserLevel(userId: string): Promise<number> {
  const response = await getProfile(userId);

  if (response.success) {
    return response.data.user.progress.currentLevel ?? 1;
  }

  return 1;
}

/**
 * Get user's current streak
 */
export async function getUserStreak(userId: string): Promise<number> {
  const response = await getProfile(userId);

  if (response.success) {
    return response.data.user.streak.currentStreak;
  }

  return 0;
}
