import { NextRequest, NextResponse } from 'next/server'
import {
  startLearningFlow,
  getCurrentFlowState,
  advanceFlow,
  pauseFlow,
  resumeFlow,
  recordQuizAnswer,
  type FlowOptions,
  type CompletionData,
  type QuizAnswer,
} from '@/lib/services/flowController'
import { getAuthenticatedUserId } from '@/lib/auth/requireAuth'

/**
 * Flow Controller API
 *
 * Handles learning flow operations:
 * - GET: Get current flow state
 * - POST: Start flow, advance flow, record quiz answer, pause/resume
 */

// GET - Get current flow state
export async function GET(request: NextRequest) {
  try {
    // IDOR Protection: Validate userId query param matches authenticated user
    const userIdResult = await getAuthenticatedUserId(request, { allowUserId: true })
    if (userIdResult instanceof NextResponse) {
      return userIdResult
    }
    const userId = userIdResult

    const state = await getCurrentFlowState(userId)
    return NextResponse.json(state)
  } catch (error) {
    console.error('[Flow API] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to get flow state' },
      { status: 500 }
    )
  }
}

// POST - Flow operations
export async function POST(request: NextRequest) {
  try {
    // IDOR Protection: Validate userId matches authenticated user
    const userIdResult = await getAuthenticatedUserId(request, { allowUserId: true })
    if (userIdResult instanceof NextResponse) {
      return userIdResult
    }
    const userId = userIdResult

    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'start': {
        const options: FlowOptions = body.options || {}
        const result = await startLearningFlow(userId, options)
        return NextResponse.json(result)
      }

      case 'advance': {
        const completion: CompletionData = body.completion
        if (!completion?.atomId) {
          return NextResponse.json(
            { error: 'completion.atomId required' },
            { status: 400 }
          )
        }
        const result = await advanceFlow(userId, completion)
        return NextResponse.json(result)
      }

      case 'quiz': {
        const answer: QuizAnswer = body.answer
        if (!answer?.questionId) {
          return NextResponse.json(
            { error: 'answer.questionId required' },
            { status: 400 }
          )
        }
        const result = await recordQuizAnswer(userId, answer)
        return NextResponse.json(result)
      }

      case 'pause': {
        const result = await pauseFlow(userId)
        return NextResponse.json(result)
      }

      case 'resume': {
        const result = await resumeFlow(userId)
        return NextResponse.json(result)
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[Flow API] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to process flow action' },
      { status: 500 }
    )
  }
}
