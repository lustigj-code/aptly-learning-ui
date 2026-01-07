import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { COURSE_3_MODULE_1, COURSE_1_MODULE_1 } from '@/data/mockData'
import type {
  Lesson,
  Atom,
  VideoContent,
  ReadingContent,
  QuizContent,
  PracticeContent,
  ProjectContent,
} from '@/types'

type AtomResponse = {
  id: string
  lessonId: string
  type: string
  title: string
  content: VideoContent | ReadingContent | PracticeContent | QuizContent | ProjectContent
  estimatedMinutes: number
  isRequired: boolean
  masteryThreshold: number
  completed?: boolean
  score?: number
}

type LessonDetailResponse = {
  id: string
  number: number
  title: string
  objectives: string[]
  estimatedMinutes: number
  isLocked: boolean
  atoms: AtomResponse[]
}

/**
 * GET /api/lessons/[lessonId]
 * Fetch a single lesson with all embedded atoms
 *
 * Params:
 * - lessonId: Lesson ID from URL
 *
 * Query params:
 * - userId (optional): to get user's completion status for atoms
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await params
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    // Validate lessonId
    if (!lessonId || typeof lessonId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid lessonId' },
        { status: 400 }
      )
    }

    // Find the lesson by searching through courses -> modules -> lessons
    // This is a limitation of Firestore's flat structure; we need to search all paths
    let lessonDoc: FirebaseFirestore.DocumentSnapshot | null = null
    let lessonData: Lesson | null = null

    const coursesSnapshot = await adminDb.collection('courses').get()

    for (const courseDoc of coursesSnapshot.docs) {
      const modulesSnapshot = await courseDoc.ref.collection('modules').get()

      for (const moduleDoc of modulesSnapshot.docs) {
        const lessonDocRef = moduleDoc.ref.collection('lessons').doc(lessonId)
        const lesson = await lessonDocRef.get()

        if (lesson.exists) {
          lessonDoc = lesson
          lessonData = lesson.data() as Lesson
          break
        }
      }

      if (lessonDoc) break
    }

    // If not found in Firestore, fall back to mock data
    if (!lessonDoc || !lessonData) {
      // Check mock data for the lesson
      const mockModules = [COURSE_3_MODULE_1, COURSE_1_MODULE_1]
      for (const mockModule of mockModules) {
        const mockLesson = mockModule.lessons.find((l) => l.id === lessonId)
        if (mockLesson) {
          lessonData = mockLesson
          break
        }
      }

      if (!lessonData) {
        return NextResponse.json(
          { error: 'Lesson not found' },
          { status: 404 }
        )
      }
    }

    // Get user progress if userId provided
    let completionDetails: Record<string, { completed?: boolean; completedAt?: string; score?: number }> = {}
    if (userId) {
      const userProgressDoc = await adminDb
        .collection('userProgress')
        .doc(userId)
        .get()

      if (userProgressDoc.exists) {
        const userProgress = userProgressDoc.data()
        completionDetails = userProgress?.completionDetails || {}
      }
    }

    // Build lesson response with atoms
    const lessonResponse: LessonDetailResponse = {
      id: lessonId,
      number: lessonData.number,
      title: lessonData.title,
      objectives: lessonData.objectives,
      estimatedMinutes: lessonData.estimatedMinutes,
      isLocked: lessonData.isLocked,
      atoms: [],
    }

    // Process atoms (sorted by order in lesson)
    const atoms = (lessonData.atoms || []) as Atom[]
    atoms.sort((a, b) => {
      // Assume atoms have an order field or use index
      const aIndex = atoms.indexOf(a)
      const bIndex = atoms.indexOf(b)
      return aIndex - bIndex
    })

    for (const atom of atoms) {
      const atomResponse: AtomResponse = {
        id: atom.id,
        lessonId: atom.lessonId,
        type: atom.type,
        title: atom.title,
        content: atom.content,
        estimatedMinutes: atom.estimatedMinutes,
        isRequired: atom.isRequired,
        masteryThreshold: atom.masteryThreshold,
      }

      // Add completion status if user data available
      if (userId && completionDetails[atom.id]) {
        const atomCompletion = completionDetails[atom.id]
        atomResponse.completed = atomCompletion.completed || false

        // Add score for quizzes if available
        if (atom.type === 'quiz' && atomCompletion.score !== undefined) {
          atomResponse.score = atomCompletion.score
        }
      }

      lessonResponse.atoms.push(atomResponse)
    }

    return NextResponse.json(
      { lesson: lessonResponse },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error fetching lesson details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lesson details' },
      { status: 500 }
    )
  }
}
