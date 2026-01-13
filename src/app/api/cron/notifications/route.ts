import { NextRequest, NextResponse } from 'next/server';
import {
  runScheduledNotificationChecks,
  runStreakReminders,
  runReviewReminders,
  runOptimalTimeNudges,
  validateCronSecret,
} from '@/lib/notifications/scheduler';

/**
 * GET /api/cron/notifications
 *
 * Cron endpoint for running scheduled notification checks.
 * Protected by CRON_SECRET environment variable.
 *
 * Query params:
 * - type: 'all' | 'streak' | 'review' | 'optimal' (default: 'all')
 */
export async function GET(request: NextRequest) {
  try {
    // Validate cron secret
    const authHeader = request.headers.get('authorization');
    const secret = authHeader?.replace('Bearer ', '') || null;

    // Also check for Vercel cron header
    const vercelCronSecret = request.headers.get('x-vercel-cron-secret');

    if (!validateCronSecret(secret) && !validateCronSecret(vercelCronSecret)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get notification type from query
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'all';

    let result;

    switch (type) {
      case 'streak':
        result = await runStreakReminders();
        break;
      case 'review':
        result = await runReviewReminders();
        break;
      case 'optimal':
        result = await runOptimalTimeNudges();
        break;
      case 'all':
      default:
        result = await runScheduledNotificationChecks();
        break;
    }

    return NextResponse.json({
      success: true,
      type,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron notification error:', error);
    return NextResponse.json(
      {
        error: 'Cron job failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
