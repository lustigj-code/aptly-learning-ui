/**
 * @deprecated Uses legacy `userProgress` collection.
 * Progress data should be read from `users.progress` instead.
 */
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import type { Course, Module, Lesson } from '@/types'

type CourseProgressResponse = {
  courseId: string
  completedAtoms: number
  totalAtoms: number
  percentage: number
  currentLesson?: string
  currentAtom?: string
  lessonsCompleted: number
  lessonsTotal: number
}

/**
 * GET /api/progress/by-course
 * Get user's progress for a specific course
 *
 * Query params:
 * - userId (required): User ID
 * - courseId (required): Course ID
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const courseId = searchParams.get('courseId')

    // Validate required params
    if (!userId || !courseId) {
      return NextResponse.json(
        { error: 'Missing required parameters: userId and courseId' },
        { status: 400 }
      )
    }

    if (typeof userId !== 'string' || typeof courseId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid parameter types' },
        { status: 400 }
      )
    }

    // Fetch user's progress
    const userProgressDoc = await adminDb
      .collection('userProgress')
      .doc(userId)
      .get()

    if (!userProgressDoc.exists) {
      return NextResponse.json(
        { error: 'User progress not found' },
        { status: 404 }
      )
    }

    const userProgress = userProgressDoc.data()
    const completedAtoms = (userProgress?.atomsCompleted || []) as string[]
    const completedLessons = (userProgress?.lessonsCompleted || []) as string[]
    const currentLesson = userProgress?.currentLessonId as string | undefined
    const currentAtom = userProgress?.currentAtomId as string | undefined

    // Fetch the course to count total atoms
    const courseDoc = await adminDb.collection('courses').doc(courseId).get()

    if (!courseDoc.exists) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    // Count total atoms and lessons in course
    let totalAtoms = 0
    let completedCount = 0
    let totalLessons = 0
    let lessonsCompletedInCourse = 0

    const modulesSnapshot = await courseDoc.ref.collection('modules').get()

    for (const moduleDoc of modulesSnapshot.docs) {
      const lessonsSnapshot = await moduleDoc.ref.collection('lessons').get()

      for (const lessonDoc of lessonsSnapshot.docs) {
        totalLessons++

        // Check if lesson is completed
        if (completedLessons.includes(lessonDoc.id)) {
          lessonsCompletedInCourse++
        }

        const lessonData = lessonDoc.data() as Lesson
        const atoms = lessonData.atoms || []

        totalAtoms += atoms.length

        // Count completed atoms
        for (const atom of atoms) {
          if (completedAtoms.includes(atom.id)) {
            completedCount++
          }
        }
      }
    }

    const progressResponse: CourseProgressResponse = {
      courseId,
      completedAtoms: completedCount,
      totalAtoms,
      percentage: totalAtoms > 0 ? Math.round((completedCount / totalAtoms) * 100) : 0,
      lessonsCompleted: lessonsCompletedInCourse,
      lessonsTotal: totalLessons,
    }

    // Add current position if available
    if (currentLesson) {
      progressResponse.currentLesson = currentLesson
    }

    if (currentAtom) {
      progressResponse.currentAtom = currentAtom
    }

    return NextResponse.json(
      { progress: progressResponse },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error fetching course progress:', error)
    return NextResponse.json(
      { error: 'Failed to fetch course progress' },
      { status: 500 }
    )
  }
}
