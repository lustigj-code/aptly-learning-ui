/**
 * @deprecated Uses legacy `userProgress` collection.
 * Should be migrated to use `users` collection.
 */
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { verifyBearerToken } from '@/lib/auth/apiAuth';

const { arrayUnion } = FieldValue;

const useFreezeSchema = z.object({
  // Empty object for this endpoint
});

/**
 * POST /api/progress/use-freeze
 * Manually apply a streak freeze to prevent streak loss
 * Sets lastCompletedDate to yesterday to "freeze" the streak
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Verify Bearer token and get authenticated userId
    const auth = await verifyBearerToken(request);
    if (!auth.authenticated) {
      return auth.error;
    }
    const userId = auth.userId;

    // Validate input
    const body = await request.json();
    const validation = useFreezeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      );
    }

    // Get user progress
    const userProgressRef = adminDb.collection('userProgress').doc(userId);
    const userProgressSnap = await userProgressRef.get();

    if (!userProgressSnap.exists) {
      return NextResponse.json(
        { error: 'User progress not found' },
        { status: 404 }
      );
    }

    const userProgress = userProgressSnap.data();
    const streakData = userProgress?.streak || {
      currentStreak: 0,
      longestStreak: 0,
      lastCompletedDate: '',
      freezesAvailable: 2,
      freezesUsed: [],
      streakHistory: [],
    };

    // Check if freezes are available
    const freezesAvailable = streakData.freezesAvailable || 0;
    if (freezesAvailable <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'No freezes available',
          freezesRemaining: 0,
        },
        { status: 400 }
      );
    }

    // Calculate yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];

    // Apply freeze to yesterday
    await userProgressRef.update({
      'streak.freezesAvailable': freezesAvailable - 1,
      'streak.freezesUsed': arrayUnion(yesterdayString),
      'streak.lastCompletedDate': yesterdayString,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Freeze applied successfully',
        freezesRemaining: freezesAvailable - 1,
        frozeDate: yesterdayString,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Use freeze error:', error);
    return NextResponse.json(
      { error: 'Failed to apply freeze' },
      { status: 500 }
    );
  }
}
