/**
 * Optimized Learning Path API
 *
 * Returns ML-driven curriculum sequencing with:
 * - Optimized skill path
 * - Completion estimates
 * - Fast-track eligibility
 * - Learning velocity metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  buildOptimizedPath,
  getCompletionEstimate,
  checkFastTrackEligibility,
  calculateLearningVelocity,
} from '@/lib/adaptive/pathOptimizer';
import { getAuthenticatedUserId, validateBodyUserId } from '@/lib/auth/requireAuth';

// ============================================
// GET - Fetch optimized path data
// ============================================

export async function GET(request: NextRequest) {
  // IDOR Protection: Validate userId query param matches authenticated user
  const userIdResult = await getAuthenticatedUserId(request, { allowUserId: true });
  if (userIdResult instanceof NextResponse) {
    return userIdResult;
  }
  const userId = userIdResult;

  const searchParams = request.nextUrl.searchParams;
  const courseId = searchParams.get('courseId') || 'ai-at-work';

  try {
    // Fetch all data in parallel
    const [path, estimate, fastTrack, velocity] = await Promise.all([
      buildOptimizedPath(userId, courseId),
      getCompletionEstimate(userId, courseId),
      checkFastTrackEligibility(userId, courseId),
      calculateLearningVelocity(userId),
    ]);

    return NextResponse.json({
      success: true,
      path,
      estimate,
      fastTrack,
      velocity,
    });
  } catch (error) {
    console.error('[Path API] Error fetching optimized path:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch optimized path' },
      { status: 500 }
    );
  }
}

// ============================================
// POST - Calculate path with custom parameters
// ============================================

interface PathRequest {
  userId: string;
  courseId?: string;
  options?: {
    includeSkippable?: boolean;
    maxSkills?: number;
    targetCompletionDays?: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: PathRequest = await request.json();
    const { userId: bodyUserId, courseId = 'ai-at-work', options } = body;

    // IDOR Protection: Validate userId from body matches authenticated user
    const userIdResult = await validateBodyUserId(request, bodyUserId);
    if (userIdResult instanceof NextResponse) {
      return userIdResult;
    }
    const userId = userIdResult;

    // Build path with options
    const path = await buildOptimizedPath(userId, courseId);

    // Apply options if provided
    const processedPath = { ...path };
    if (options) {
      if (!options.includeSkippable) {
        processedPath.skills = path.skills.filter((s) => !s.canSkip);
      }
      if (options.maxSkills && options.maxSkills > 0) {
        processedPath.skills = processedPath.skills.slice(0, options.maxSkills);
      }
    }

    // Get additional data
    const [estimate, fastTrack, velocity] = await Promise.all([
      getCompletionEstimate(userId, courseId),
      checkFastTrackEligibility(userId, courseId),
      calculateLearningVelocity(userId),
    ]);

    return NextResponse.json({
      success: true,
      path: processedPath,
      estimate,
      fastTrack,
      velocity,
    });
  } catch (error) {
    console.error('[Path API] Error processing path request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process path request' },
      { status: 500 }
    );
  }
}
