/**
 * Lesson Context Builder
 *
 * Builds lesson and atom context for coach interactions.
 * Fetches curriculum content from Firestore or mock data.
 */

import { adminDb } from '@/lib/firebase/admin'
import { COURSE_3_MODULE_1, COURSE_1_MODULE_1 } from '@/data/mockData'
import type { Lesson as MockLesson } from '@/types'

// ============================================
// TYPES
// ============================================

export type AtomContent = {
  id: string
  type: 'reading' | 'video' | 'quiz' | 'practice'
  title: string
  content: string | object
  objectives?: string[]
  keyPoints?: string[]
  expectedOutcomes?: string[]
  rubric?: Array<{
    criterion: string
    weight: number
  }>
}

export type LessonContext = {
  id: string
  title: string
  objectives: string[]
  atoms: AtomContent[]
  moduleId: string
  moduleName: string
  courseId: string
  courseName: string
  estimatedMinutes: number
  prerequisitesConcepts: string[]
}

// ============================================
// LESSON FETCHING
// ============================================

/**
 * Fetch lesson context from Firestore or mock data
 */
export async function fetchLessonContext(lessonId: string): Promise<LessonContext | null> {
  try {
    // First try Firestore
    const lessonDoc = await adminDb.collection('lessons').doc(lessonId).get()

    if (lessonDoc.exists) {
      const data = lessonDoc.data()

      // Fetch full atom content
      const atoms: AtomContent[] = (data?.atoms || []).map((atom: Record<string, unknown>) => ({
        id: atom.id as string || '',
        type: atom.type as AtomContent['type'] || 'reading',
        title: atom.title as string || '',
        content: atom.content || '',
        objectives: atom.objectives as string[] || [],
        keyPoints: atom.keyPoints as string[] || [],
        expectedOutcomes: atom.expectedOutcomes as string[] || [],
        rubric: atom.rubric as AtomContent['rubric'] || [],
      }))

      return {
        id: lessonDoc.id,
        title: data?.title || 'Unknown Lesson',
        objectives: data?.objectives || [],
        atoms,
        moduleId: data?.moduleId || '',
        moduleName: '',
        courseId: data?.courseId || '',
        courseName: '',
        estimatedMinutes: data?.estimatedMinutes || 15,
        prerequisitesConcepts: data?.prerequisites || [],
      }
    }

    // Fall back to mock data if not found in Firestore
    const mockModules = [COURSE_3_MODULE_1, COURSE_1_MODULE_1]
    for (const mockModule of mockModules) {
      const mockLesson = mockModule.lessons.find((l: MockLesson) => l.id === lessonId)
      if (mockLesson) {
        // Convert mock lesson to LessonContext
        const atoms: AtomContent[] = (mockLesson.atoms || []).map((atom) => ({
          id: atom.id,
          type: atom.type as AtomContent['type'],
          title: atom.title,
          content: atom.content || '',
          objectives: [],
          keyPoints: (atom.content as { keyTakeaways?: string[] })?.keyTakeaways || [],
          expectedOutcomes: (atom.content as { expectedOutcomes?: string[] })?.expectedOutcomes || [],
          rubric: (atom.content as { rubric?: Array<{ criterion: string; weight: number }> })?.rubric || [],
        }))

        return {
          id: mockLesson.id,
          title: mockLesson.title,
          objectives: mockLesson.objectives || [],
          atoms,
          moduleId: mockModule.id,
          moduleName: mockModule.title,
          courseId: mockModule.courseId,
          courseName: '', // Would need to look this up
          estimatedMinutes: mockLesson.estimatedMinutes || 15,
          prerequisitesConcepts: [],
        }
      }
    }

    return null
  } catch (error) {
    console.error(`Error fetching lesson context for ${lessonId}:`, error)
    return null
  }
}

/**
 * Get current atom from lesson context by ID
 */
export function getCurrentAtom(
  lessonContext: LessonContext | null,
  atomId: string
): AtomContent | null {
  if (!lessonContext || !atomId) return null
  return lessonContext.atoms.find((a) => a.id === atomId) || null
}
