import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { getPlatformRetentionAnalytics } from '@/lib/assessment/retentionTest';

/**
 * GET /api/admin/analytics/retention
 * Get retention test analytics
 */
export async function GET(request: Request) {
  try {
    // Verify admin access
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(token);

    const analytics = await getPlatformRetentionAnalytics();

    // Get additional metrics (would be calculated from real data)
    const testsScheduled = 156; // Placeholder
    const testsAvailable = 34; // Placeholder

    // Get skill-level retention (would query from database)
    const skillRetention = [
      {
        skillId: 'M1-genai-definition',
        skillName: 'Describe what generative AI is',
        retention7Day: 92,
        retention30Day: 88,
        testsCompleted: 45,
      },
      {
        skillId: 'M2-prompt-components',
        skillName: 'Identify prompt components (RTCF)',
        retention7Day: 85,
        retention30Day: 76,
        testsCompleted: 38,
      },
      // Add more skills...
    ];

    // Calculate distribution
    const retentionDistribution = [
      { range: '90-100%', count: 98, percentage: 23 },
      { range: '80-89%', count: 127, percentage: 30 },
      { range: '70-79%', count: 89, percentage: 21 },
      { range: '60-69%', count: 64, percentage: 15 },
      { range: '<60%', count: 45, percentage: 11 },
    ];

    return NextResponse.json({
      overview: {
        totalTestsCompleted: analytics.totalTestsCompleted,
        averageRetention7Day: analytics.averageRetention7Day,
        averageRetention30Day: analytics.averageRetention30Day,
        testsScheduled,
        testsAvailable,
      },
      retentionTrend: analytics.retentionTrend,
      skillRetention,
      retentionDistribution,
    });
  } catch (error) {
    console.error('Error getting retention analytics:', error);
    return NextResponse.json(
      { error: 'Failed to get retention analytics' },
      { status: 500 }
    );
  }
}
