import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { verifyAuth } from '@/lib/auth/apiAuth'
import { COURSES } from '@/data/mockData'
import type { Course } from '@/types'

type CourseResponse = {
  id: string
  number: number
  title: string
  description: string
  objectives: string[]
  estimatedHours: number
  isLocked: boolean
  prerequisites: string[]
  progress?: {
    completed: number
    total: number
    percentage: number
  }
}

/**
 * GET /api/courses
 * List all published courses with optional user progress overlay
 *
 * Query params:
 * - userId (optional): to get user's progress for courses
 */
export async function GET(request: NextRequest) {
  try {
    // Get userId from query params (optional)
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    // Fetch all courses from Firestore
    const coursesSnapshot = await adminDb
      .collection('courses')
      .where('isPublished', '==', true)
      .orderBy('number', 'asc')
      .get()

    // Fall back to mock data if Firestore is empty
    if (coursesSnapshot.empty) {
      const mockCourses: CourseResponse[] = COURSES.map((course) => ({
        id: course.id,
        number: course.number,
        title: course.title,
        description: course.description,
        objectives: course.objectives,
        estimatedHours: course.estimatedHours,
        isLocked: course.isLocked,
        prerequisites: course.prerequisites,
      }))

      return NextResponse.json(
        { courses: mockCourses },
        { status: 200 }
      )
    }

    const courses: CourseResponse[] = []

    // Process each course
    for (const courseDoc of coursesSnapshot.docs) {
      const courseData = courseDoc.data() as Course & { isPublished: boolean }
      const courseId = courseDoc.id

      const courseResponse: CourseResponse = {
        id: courseId,
        number: courseData.number,
        title: courseData.title,
        description: courseData.description,
        objectives: courseData.objectives,
        estimatedHours: courseData.estimatedHours,
        isLocked: courseData.isLocked,
        prerequisites: courseData.prerequisites,
      }

      // If userId provided, fetch user's progress for this course
      if (userId) {
        try {
          const userProgressDoc = await adminDb
            .collection('userProgress')
            .doc(userId)
            .get()

          if (userProgressDoc.exists) {
            const userProgress = userProgressDoc.data()
            const completedAtoms = (userProgress?.atomsCompleted || []) as string[]

            // Get all atoms in this course to calculate completion
            let totalAtoms = 0
            let completedCount = 0

            const modulesSnapshot = await adminDb
              .collection('courses')
              .doc(courseId)
              .collection('modules')
              .get()

            for (const moduleDoc of modulesSnapshot.docs) {
              const lessonsSnapshot = await moduleDoc.ref.collection('lessons').get()

              for (const lessonDoc of lessonsSnapshot.docs) {
                const lessonData = lessonDoc.data()
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

            courseResponse.progress = {
              completed: completedCount,
              total: totalAtoms,
              percentage: totalAtoms > 0 ? Math.round((completedCount / totalAtoms) * 100) : 0,
            }
          }
        } catch (error) {
          console.error(`Error fetching progress for course ${courseId}:`, error)
          // Continue without progress data
        }
      }

      courses.push(courseResponse)
    }

    return NextResponse.json(
      { courses },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error fetching courses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    )
  }
}
