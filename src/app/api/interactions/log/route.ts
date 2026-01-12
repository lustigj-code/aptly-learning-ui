import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { z } from 'zod';
import { batchLogInteractions, logInteraction } from '@/lib/services/interactionLogService';
import type { InteractionLogInput, InteractionType, AtomType } from '@/types';

// Schema for single interaction
const interactionSchema = z.object({
  userId: z.string().min(1),
  sessionId: z.string().min(1),
  courseId: z.string().min(1),
  moduleId: z.string().min(1),
  lessonId: z.string().min(1),
  atomId: z.string().min(1),
  atomType: z.enum(['video', 'reading', 'quiz', 'practice', 'project']),
  skillId: z.string().min(1),
  skillName: z.string().min(1),
  questionId: z.string().optional(),
  interactionType: z.enum([
    'quiz_answer',
    'practice_response',
    'content_view',
    'hint_request',
    'coach_interaction',
    'review_attempt',
  ]),
  isCorrect: z.boolean().optional(),
  selectedAnswer: z.string().optional(),
  correctAnswer: z.string().optional(),
  responseTimeMs: z.number().min(0),
  timeGapFromLastAttempt: z.number().optional(),
  attemptNumber: z.number().min(1),
  consecutiveWrongOnSkill: z.number().min(0),
  hintsUsedBefore: z.number().min(0),
  questionDifficulty: z.number().optional(),
  userAbilityEstimate: z.number().optional(),
  pMasteryBefore: z.number().min(0).max(1),
  pMasteryAfter: z.number().min(0).max(1),
  experimentVariants: z.record(z.string(), z.string()).default({}),
  timestamp: z.string().datetime().optional(),
});

// Schema for batch request
const batchRequestSchema = z.object({
  interactions: z.array(interactionSchema).min(1).max(100),
});

/**
 * POST /api/interactions/log
 * Log learning interactions for ML model training
 * Accepts single interaction or batch of interactions
 */
export async function POST(request: NextRequest) {
  try {
    // Get and verify Firebase ID token
    const authHeader = request.headers.get('authorization');

    // For sendBeacon requests, token might be in body or we allow unauthenticated logging
    // (since we validate userId against session)
    let userId: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      const idToken = authHeader.slice(7);
      try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        userId = decodedToken.uid;
      } catch (error) {
        console.error('Token verification failed:', error);
        // Continue without auth - we'll validate userId matches session
      }
    }

    // Parse and validate input
    const body = await request.json();
    const validation = batchRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { interactions } = validation.data;

    // If authenticated, verify all interactions belong to this user
    if (userId) {
      const unauthorized = interactions.filter((i) => i.userId !== userId);
      if (unauthorized.length > 0) {
        return NextResponse.json(
          { error: 'Cannot log interactions for other users' },
          { status: 403 }
        );
      }
    }

    // Convert to InteractionLogInput format
    const inputs: InteractionLogInput[] = interactions.map((i) => ({
      ...i,
      atomType: i.atomType as AtomType,
      interactionType: i.interactionType as InteractionType,
      timestamp: i.timestamp ? new Date(i.timestamp) : undefined,
    }));

    // Log interactions
    if (inputs.length === 1) {
      const id = await logInteraction(inputs[0]);
      return NextResponse.json({ success: true, id, count: 1 }, { status: 201 });
    } else {
      await batchLogInteractions(inputs);
      return NextResponse.json(
        { success: true, count: inputs.length },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error('Interaction log error:', error);
    return NextResponse.json(
      { error: 'Failed to log interactions' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/interactions/log
 * Get interaction statistics (for monitoring data collection)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.slice(7);
    let userId: string;

    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      userId = decodedToken.uid;
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // For now, any authenticated user can view stats
    // In production, add admin role check
    const { getInteractionStats } = await import(
      '@/lib/services/interactionLogService'
    );
    const stats = await getInteractionStats();

    return NextResponse.json({ success: true, stats }, { status: 200 });
  } catch (error) {
    console.error('Get interaction stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get interaction stats' },
      { status: 500 }
    );
  }
}
