import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import type { Course, Module, Lesson } from '@/types'

type LessonResponse = {
  id: string
  number: number
  title: string
  objectives: string[]
  estimatedMinutes: number
  atomCount: number
  isLocked: boolean
}

type ModuleResponse = {
  id: string
  number: number
  title: string
  objectives: string[]
  estimatedMinutes: number
  lessons: LessonResponse[]
  isLocked: boolean
}

type CourseDetailResponse = {
  id: string
  number: number
  title: string
  description: string
  objectives: string[]
  estimatedHours: number
  isLocked: boolean
  prerequisites: string[]
  modules: ModuleResponse[]
}

/**
 * GET /api/courses/[courseId]
 * Fetch a single course with all modules and lessons
 *
 * Params:
 * - courseId: Course ID from URL
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params

    // Validate courseId format
    if (!courseId || typeof courseId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid courseId' },
        { status: 400 }
      )
    }

    // Fetch the course
    const courseDoc = await adminDb
      .collection('courses')
      .doc(courseId)
      .get()

    if (!courseDoc.exists) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    const courseData = courseDoc.data() as Course & { isPublished: boolean }

    // Build course response with modules and lessons
    const courseResponse: CourseDetailResponse = {
      id: courseId,
      number: courseData.number,
      title: courseData.title,
      description: courseData.description,
      objectives: courseData.objectives,
      estimatedHours: courseData.estimatedHours,
      isLocked: courseData.isLocked,
      prerequisites: courseData.prerequisites,
      modules: [],
    }

    // Fetch all modules for this course
    const modulesSnapshot = await adminDb
      .collection('courses')
      .doc(courseId)
      .collection('modules')
      .orderBy('number', 'asc')
      .get()

    for (const moduleDoc of modulesSnapshot.docs) {
      const moduleData = moduleDoc.data() as Module

      const moduleResponse: ModuleResponse = {
        id: moduleDoc.id,
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

        const lessonResponse: LessonResponse = {
          id: lessonDoc.id,
          number: lessonData.number,
          title: lessonData.title,
          objectives: lessonData.objectives,
          estimatedMinutes: lessonData.estimatedMinutes,
          atomCount: (lessonData.atoms || []).length,
          isLocked: lessonData.isLocked,
        }

        moduleResponse.lessons.push(lessonResponse)
      }

      courseResponse.modules.push(moduleResponse)
    }

    return NextResponse.json(
      { course: courseResponse },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error fetching course details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch course details' },
      { status: 500 }
    )
  }
}
