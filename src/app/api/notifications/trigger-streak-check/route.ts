import { NextRequest, NextResponse } from 'next/server';
import { checkStreakAtRisk } from '@/lib/notifications/triggers';

/**
 * POST /api/notifications/trigger-streak-check
 *
 * Client-side trigger to check if user should receive a streak-at-risk notification.
 * This is a fire-and-forget endpoint - it returns immediately.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid userId' },
        { status: 400 }
      );
    }

    // Fire and forget - don't await
    checkStreakAtRisk(userId).catch((err) => {
      console.error('Streak notification check failed:', err);
    });

    return NextResponse.json({
      success: true,
      message: 'Streak check triggered',
    });
  } catch (error) {
    console.error('Trigger streak check error:', error);
    return NextResponse.json(
      { error: 'Failed to trigger streak check' },
      { status: 500 }
    );
  }
}
