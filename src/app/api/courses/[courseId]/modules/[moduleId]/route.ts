import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { getAuthenticatedUserId } from '@/lib/auth/requireAuth'
import type { Module, Lesson } from '@/types'

type LessonInModuleResponse = {
  id: string
  number: number
  title: string
  objectives: string[]
  estimatedMinutes: number
  atomCount: number
  isLocked: boolean
  progress?: {
    completed: number
    total: number
    percentage: number
  }
}

type ModuleDetailResponse = {
  id: string
  number: number
  title: string
  objectives: string[]
  estimatedMinutes: number
  isLocked: boolean
  lessons: LessonInModuleResponse[]
}

/**
 * GET /api/courses/[courseId]/modules/[moduleId]
 * Fetch a single module with all lessons and progress
 *
 * Params:
 * - courseId: Course ID from URL
 * - moduleId: Module ID from URL
 *
 * Query params:
 * - userId (optional): to get user's progress for lessons
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; moduleId: string }> }
) {
  try {
    const { courseId, moduleId } = await params
    const searchParams = request.nextUrl.searchParams
    const requestedUserId = searchParams.get('userId')

    // IDOR Protection: If userId is provided, validate it matches authenticated user
    // If no userId, allow access without user-specific progress data
    let userId: string | null = null
    if (requestedUserId) {
      const userIdResult = await getAuthenticatedUserId(request, { allowUserId: true })
      if (userIdResult instanceof NextResponse) {
        return userIdResult
      }
      userId = userIdResult
    }

    // Validate params
    if (!courseId || !moduleId || typeof courseId !== 'string' || typeof moduleId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid courseId or moduleId' },
        { status: 400 }
      )
    }

    // Fetch the module
    const moduleDoc = await adminDb
      .collection('courses')
      .doc(courseId)
      .collection('modules')
      .doc(moduleId)
      .get()

    if (!moduleDoc.exists) {
      return NextResponse.json(
        { error: 'Module not found' },
        { status: 404 }
      )
    }

    const moduleData = moduleDoc.data() as Module

    // Get user progress if userId provided
    let userProgress: { atomsCompleted?: string[]; lessonsCompleted?: string[] } | null = null
    if (userId) {
      const userProgressDoc = await adminDb
        .collection('userProgress')
        .doc(userId)
        .get()

      if (userProgressDoc.exists) {
        const data = userProgressDoc.data()
        userProgress = data ? { atomsCompleted: data.atomsCompleted, lessonsCompleted: data.lessonsCompleted } : null
      }
    }

    const moduleResponse: ModuleDetailResponse = {
      id: moduleId,
      number: moduleData.number,
      title: moduleData.title,
      objectives: moduleData.objectives,
      estimatedMinutes: moduleData.estimatedMinutes,
      isLocked: moduleData.isLocked,
      lessons: [],
    }

    // Fetch all lessons for this module
    const lessonsSnapshot = await moduleDoc.ref
      .collection('lessons')
      .orderBy('number', 'asc')
      .get()

    for (const lessonDoc of lessonsSnapshot.docs) {
      const lessonData = lessonDoc.data() as Lesson
      const atomCount = (lessonData.atoms || []).length

      const lessonResponse: LessonInModuleResponse = {
        id: lessonDoc.id,
        number: lessonData.number,
        title: lessonData.title,
        objectives: lessonData.objectives,
        estimatedMinutes: lessonData.estimatedMinutes,
        atomCount,
        isLocked: lessonData.isLocked,
      }

      // Add progress if user data available
      if (userProgress) {
        const completedAtoms = (userProgress.atomsCompleted || []) as string[]
        const atoms = lessonData.atoms || []

        const completedCount = atoms.filter((atom) =>
          completedAtoms.includes(atom.id)
        ).length

        lessonResponse.progress = {
          completed: completedCount,
          total: atomCount,
          percentage: atomCount > 0 ? Math.round((completedCount / atomCount) * 100) : 0,
        }
      }

      moduleResponse.lessons.push(lessonResponse)
    }

    return NextResponse.json(
      { module: moduleResponse },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error fetching module details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch module details' },
      { status: 500 }
    )
  }
}
