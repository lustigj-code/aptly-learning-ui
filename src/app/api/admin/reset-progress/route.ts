/**
 * Reset User Progress API
 *
 * Admin endpoint to reset a user's progress to start fresh with the FSM course.
 * This clears all lesson completions, atom completions, and resets course position.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/apiAuth'
import { adminDb } from '@/lib/firebase/admin'
import { DEFAULT_COURSE_ID } from '@/data/courseRegistry'

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request)

  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'userId is required' },
        { status: 400 }
      )
    }

    // Reset user progress document
    const progressRef = adminDb.collection('userProgress').doc(userId)
    const progressDoc = await progressRef.get()

    if (!progressDoc.exists) {
      return NextResponse.json(
        { success: false, message: 'User progress not found' },
        { status: 404 }
      )
    }

    // Reset to fresh state with FSM course
    const resetData = {
      // Course position
      currentCourseId: DEFAULT_COURSE_ID,
      currentModuleId: null,
      currentLessonId: null,
      currentAtomId: null,

      // Completions - clear all
      completedCourses: [],
      completedModules: [],
      completedLessons: [],
      completedAtoms: [],

      // XP and streak - reset
      xp: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
      streakFreezes: 0,

      // Meta
      updatedAt: new Date(),
      resetAt: new Date(),
      resetReason: 'Admin reset for course migration',
    }

    await progressRef.update(resetData)

    // Also clear any FSRS review data for this user
    const reviewsRef = adminDb.collection('userReviews').doc(userId)
    const reviewsDoc = await reviewsRef.get()

    if (reviewsDoc.exists) {
      await reviewsRef.update({
        cards: [],
        updatedAt: new Date(),
        resetAt: new Date(),
      })
    }

    return NextResponse.json({
      success: true,
      message: `Reset progress for user ${userId}. New course: ${DEFAULT_COURSE_ID}`,
      newCourseId: DEFAULT_COURSE_ID,
    })
  } catch (error) {
    console.error('Error resetting progress:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET: Check user's current progress state
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)

  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'userId query parameter is required' },
        { status: 400 }
      )
    }

    const progressRef = adminDb.collection('userProgress').doc(userId)
    const progressDoc = await progressRef.get()

    if (!progressDoc.exists) {
      return NextResponse.json({
        success: true,
        exists: false,
        message: 'No progress found for this user',
      })
    }

    const data = progressDoc.data()

    return NextResponse.json({
      success: true,
      exists: true,
      progress: {
        currentCourseId: data?.currentCourseId,
        currentModuleId: data?.currentModuleId,
        currentLessonId: data?.currentLessonId,
        completedLessons: data?.completedLessons?.length || 0,
        completedAtoms: data?.completedAtoms?.length || 0,
        xp: data?.xp || 0,
        currentStreak: data?.currentStreak || 0,
        lastActivityDate: data?.lastActivityDate,
        resetAt: data?.resetAt,
      },
    })
  } catch (error) {
    console.error('Error checking progress:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
