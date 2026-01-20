/**
 * Practice Evaluation API Route
 *
 * Scores practice responses using AI-powered rubric evaluation.
 * Returns criterion-level scores and Socratic feedback.
 */

import { NextRequest, NextResponse } from 'next/server';
import { scoreWithRubric, type PracticeRubric } from '@/lib/ai/practice-feedback';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

// ============================================
// TYPES
// ============================================

type RequestBody = {
  userId?: string;
  atomId: string;
  lessonId?: string;
  response: string;
  rubric: PracticeRubric[];
  context: {
    prompt: string;
    expectedOutcomes: string[];
  };
};

// ============================================
// MAIN HANDLER
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Parse request
    const body: RequestBody = await request.json();
    const { userId: providedUserId, atomId, lessonId, response, rubric, context } = body;

    // Validate required fields
    if (!response || !rubric || rubric.length === 0 || !context?.prompt) {
      return NextResponse.json(
        { error: 'Missing required fields: response, rubric, context.prompt' },
        { status: 400 }
      );
    }

    // Authenticate user
    const userId = await authenticateUser(request, providedUserId);

    // Score the response with AI
    const result = await scoreWithRubric(response, rubric, context);

    // Store the result in Firestore if we have user and atom IDs
    if (userId && atomId && adminDb) {
      try {
        const practiceResultRef = adminDb
          .collection('users')
          .doc(userId)
          .collection('practiceResults')
          .doc(atomId);

        await practiceResultRef.set({
          atomId,
          lessonId: lessonId || null,
          response,
          overallScore: result.overallScore,
          criterionScores: result.criterionScores,
          overallFeedback: result.overallFeedback,
          submittedAt: new Date(),
        });
      } catch (dbError) {
        // Log but don't fail the request
        console.warn('[Practice API] Could not save result to Firestore:', dbError);
      }
    }

    return NextResponse.json({
      success: true,
      result: {
        overallScore: result.overallScore,
        criterionScores: result.criterionScores,
        overallFeedback: result.overallFeedback,
        passed: result.overallScore >= 70,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Practice API] Error:', errorMessage);

    return NextResponse.json(
      { error: 'Failed to evaluate practice response', message: errorMessage },
      { status: 500 }
    );
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function authenticateUser(request: NextRequest, providedUserId?: string): Promise<string | null> {
  // SECURITY: Always verify auth token first - never trust providedUserId alone
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decodedToken = await adminAuth.verifyIdToken(token);
      const authenticatedUid = decodedToken.uid;

      // If providedUserId was given, verify it matches the authenticated user (IDOR protection)
      if (providedUserId && providedUserId !== authenticatedUid) {
        console.warn('[Practice API] IDOR attempt: providedUserId does not match authenticated user');
        return null; // Reject mismatched userId
      }

      return authenticatedUid;
    }
  } catch (error) {
    console.warn('[Practice API] Auth verification failed:', error);
  }

  // Fallback to session ID only if no auth token (for anonymous/demo usage)
  const sessionId = request.headers.get('x-session-id');
  if (sessionId && !providedUserId) {
    return sessionId;
  }

  return null;
}
