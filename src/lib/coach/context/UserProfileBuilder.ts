/**
 * User Profile Builder
 *
 * Builds user profile context for coach interactions.
 * Handles user data aggregation for AI context.
 */

import { adminDb } from '@/lib/firebase/admin'

// ============================================
// TYPES
// ============================================

export type UserProfile = {
  id: string
  name: string
  email: string
  goal?: string
  experienceLevel: number // 0-100
  learningStyle: 'video' | 'reading' | 'mixed'
  dailyGoalMinutes: number
  voiceEnabled: boolean
}

// ============================================
// PROFILE BUILDING
// ============================================

/**
 * Fetch user profile from Firestore
 * Returns default profile if user not found
 */
export async function fetchUserProfile(userId: string): Promise<UserProfile> {
  try {
    const userDoc = await adminDb.collection('users').doc(userId).get()

    if (!userDoc.exists) {
      return getDefaultUserProfile(userId)
    }

    const data = userDoc.data()
    return {
      id: userId,
      name: data?.name || 'Learner',
      email: data?.email || '',
      goal: data?.preferences?.goal || data?.goal || undefined,
      experienceLevel: data?.preferences?.experienceLevel || 0,
      learningStyle: data?.preferences?.preferReadingOrVideo === 'video' ? 'video' :
                     data?.preferences?.preferReadingOrVideo === 'reading' ? 'reading' : 'mixed',
      dailyGoalMinutes: data?.preferences?.dailyGoalMinutes || 15,
      voiceEnabled: data?.preferences?.voiceEnabled || false,
    }
  } catch (error) {
    console.error(`Error fetching user profile for ${userId}:`, error)
    return getDefaultUserProfile(userId)
  }
}

/**
 * Get default user profile for new/unknown users
 */
export function getDefaultUserProfile(userId: string): UserProfile {
  return {
    id: userId,
    name: 'Learner',
    email: '',
    goal: undefined,
    experienceLevel: 25,
    learningStyle: 'mixed',
    dailyGoalMinutes: 15,
    voiceEnabled: false,
  }
}
