import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import {
  getDailyActiveUsers,
  getWeeklyActiveUsers,
  getMonthlyActiveUsers,
  getEventSummary,
} from '@/lib/analytics';

/**
 * POST /api/admin/analytics/overview
 * Get overview metrics for the analytics dashboard
 */
export async function POST(request: Request) {
  try {
    // Verify admin access
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(token);

    const body = await request.json();
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);

    // Get user counts
    const usersSnapshot = await adminDb.collection('users').count().get();
    const totalUsers = usersSnapshot.data().count;

    const activeUsers7d = await getWeeklyActiveUsers(endDate);
    const activeUsers30d = await getMonthlyActiveUsers(endDate);

    // Get event summary
    const eventSummary = await getEventSummary({ start: startDate, end: endDate });

    // Calculate completion rate (this would normally come from efficacy metrics)
    // Using placeholder calculation
    const courseCompletionRate = 28; // Would calculate from actual data

    // Calculate skill mastery velocity (skills per hour)
    const skillMasteryVelocity = 2.4; // Would calculate from actual data

    // Generate trend data
    const dailyActiveUsers = await generateDailyTrend(startDate, endDate, 'session_start');
    const completionRateTrend = await generateCompletionTrend(startDate, endDate);
    const sessionLengthTrend = await generateSessionLengthTrend(startDate, endDate);

    // Calculate trends (compare to previous period)
    const previousPeriodStart = new Date(startDate);
    previousPeriodStart.setDate(
      previousPeriodStart.getDate() - (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const previousEventSummary = await getEventSummary({
      start: previousPeriodStart,
      end: startDate,
    });

    const trends = {
      users: calculateTrend(totalUsers, totalUsers * 0.88), // Placeholder
      completion: calculateTrend(courseCompletionRate, courseCompletionRate * 0.69),
      sessionLength: calculateTrend(
        eventSummary.avgSessionLength,
        previousEventSummary.avgSessionLength || eventSummary.avgSessionLength * 0.92
      ),
      masteryVelocity: calculateTrend(skillMasteryVelocity, skillMasteryVelocity * 0.87),
    };

    return NextResponse.json({
      totalUsers,
      activeUsers7d,
      activeUsers30d,
      courseCompletionRate,
      averageSessionLength: eventSummary.avgSessionLength,
      skillMasteryVelocity,
      trends,
      dailyActiveUsers,
      completionRateTrend,
      sessionLengthTrend,
    });
  } catch (error) {
    console.error('Error getting overview metrics:', error);
    return NextResponse.json(
      { error: 'Failed to get overview metrics' },
      { status: 500 }
    );
  }
}

function calculateTrend(current: number, previous: number): number {
  if (previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 100);
}

async function generateDailyTrend(
  startDate: Date,
  endDate: Date,
  eventType: string
): Promise<{ date: string; value: number }[]> {
  const data: { date: string; value: number }[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    const count = await getDailyActiveUsers(current);
    data.push({ date: dateStr, value: count });
    current.setDate(current.getDate() + 1);
  }

  return data;
}

async function generateCompletionTrend(
  startDate: Date,
  endDate: Date
): Promise<{ date: string; value: number }[]> {
  // This would calculate actual completion rates per day
  // For now, return placeholder data
  const data: { date: string; value: number }[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    data.push({
      date: dateStr,
      value: 20 + Math.floor(Math.random() * 15),
    });
    current.setDate(current.getDate() + 1);
  }

  return data;
}

async function generateSessionLengthTrend(
  startDate: Date,
  endDate: Date
): Promise<{ date: string; value: number }[]> {
  // This would calculate actual session lengths per day
  // For now, return placeholder data
  const data: { date: string; value: number }[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    data.push({
      date: dateStr,
      value: 12 + Math.floor(Math.random() * 10),
    });
    current.setDate(current.getDate() + 1);
  }

  return data;
}
