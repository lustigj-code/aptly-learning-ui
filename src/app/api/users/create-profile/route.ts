import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { checkRateLimit, rateLimitedResponse } from '@/lib/security/rateLimiter'
import { z } from 'zod'
import { FieldValue } from 'firebase-admin/firestore'

const createProfileSchema = z.object({
  uid: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  onboardingCompleted: z.boolean().optional(),
  createdAt: z.string().optional(),
})

/**
 * POST /api/users/create-profile
 * Creates a user profile document in Firestore
 * Called after successful Firebase authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit check - 3 requests per hour per IP
    const rateLimitResult = await checkRateLimit(request, 'profile')
    if (!rateLimitResult.success) {
      return rateLimitedResponse(rateLimitResult)
    }

    const body = await request.json()

    // Validate input
    const validation = createProfileSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { uid, email, name, onboardingCompleted = false } = validation.data

    // Create user profile
    await adminDb.collection('users').doc(uid).set(
      {
        id: uid,
        email,
        name,
        avatar: null,
        role: 'student',
        permissions: [],
        onboardingCompleted,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        preferences: {
          learningGoal: null,
          experienceLevel: 0,
          dailyGoalMinutes: 20,
          learningPace: 'steady',
          soundEnabled: true,
          voiceEnabled: true,
          reducedMotion: false,
          selectedCharacter: 'owl',
        },
      },
      { merge: true } // Don't overwrite if exists
    )

    // Initialize user progress document
    await adminDb.collection('userProgress').doc(uid).set(
      {
        userId: uid,
        currentCourseId: null,
        currentModuleId: null,
        currentLessonId: null,
        currentAtomId: null,
        atomsCompleted: [],
        lessonsCompleted: [],
        modulesCompleted: [],
        coursesCompleted: [],
        completionDetails: {},
        totalXP: 0,
        currentLevel: 1,
        xpToNextLevel: 100,
        streak: {
          currentStreak: 0,
          longestStreak: 0,
          lastActivityDate: '',
          freezesAvailable: 2,
          freezesUsed: [],
          streakHistory: [],
        },
        overallPercentage: 0,
        totalTimeSpentMinutes: 0,
        lastActiveAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    return NextResponse.json(
      {
        success: true,
        message: 'Profile created successfully',
        data: {
          uid,
          email,
          name,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Profile creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create profile' },
      { status: 500 }
    )
  }
}
