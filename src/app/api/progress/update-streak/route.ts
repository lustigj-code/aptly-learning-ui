/**
 * Update Streak API
 *
 * Updates daily streak based on activity.
 * Uses the unified `users.streak` location as the primary data store.
 *
 * @migration This endpoint was updated to write to `users.streak` instead
 * of the deprecated `userProgress` collection.
 */
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyBearerToken } from '@/lib/auth/apiAuth';
import { invalidateProgressCache } from '@/lib/data/userProgressLayer';

const { arrayUnion } = FieldValue;

const updateStreakSchema = z.object({
  userId: z.string().min(1).optional(),
});

/**
 * POST /api/progress/update-streak
 * Update daily streak based on activity
 * Handles streak continuation, freeze application, and reset logic
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
    const validation = updateStreakSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      );
    }

    // Get user data from primary location (users collection)
    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userSnap.data();
    const streakData = userData?.streak || {
      currentStreak: 0,
      longestStreak: 0,
      lastCompletedDate: '',
      freezesAvailable: 2,
      freezesUsed: [],
      streakHistory: [],
    };

    const today = new Date().toISOString().split('T')[0];
    const lastCompletedDate = streakData.lastCompletedDate || '';

    // If today's streak already updated, return current status
    if (lastCompletedDate === today) {
      return NextResponse.json(
        {
          success: true,
          currentStreak: streakData.currentStreak,
          frozeApplied: false,
          message: 'Streak already updated today',
        },
        { status: 200 }
      );
    }

    // Calculate yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];

    let newStreak = streakData.currentStreak || 0;

    // If last activity was yesterday, increment streak
    if (lastCompletedDate === yesterdayString) {
      newStreak++;
    } else if (lastCompletedDate && lastCompletedDate !== yesterdayString) {
      // Gap > 1 day: check for freezes
      const freezesAvailable = streakData.freezesAvailable || 0;

      if (freezesAvailable > 0) {
        // Apply freeze to yesterday
        await userRef.update({
          'streak.freezesAvailable': freezesAvailable - 1,
          'streak.freezesUsed': arrayUnion(
            yesterdayString
          ),
          'streak.lastCompletedDate': today,
        });
        // Invalidate cache
        invalidateProgressCache(userId);
        // Streak remains unchanged
        return NextResponse.json(
          {
            success: true,
            currentStreak: newStreak,
            frozeApplied: true,
            freezesRemaining: freezesAvailable - 1,
            message: 'Freeze applied to maintain streak',
          },
          { status: 200 }
        );
      } else {
        // No freezes available: reset streak
        newStreak = 1;
      }
    } else {
      // First activity
      newStreak = 1;
    }

    // Update longest streak if needed
    const longestStreak = Math.max(streakData.longestStreak || 0, newStreak);

    // Update user streak in users.streak (primary location)
    await userRef.update({
      'streak.currentStreak': newStreak,
      'streak.longestStreak': longestStreak,
      'streak.lastCompletedDate': today,
    });

    // Invalidate cache
    invalidateProgressCache(userId);

    return NextResponse.json(
      {
        success: true,
        currentStreak: newStreak,
        longestStreak,
        frozeApplied: false,
        message:
          newStreak > (streakData.currentStreak || 0)
            ? `Streak increased to ${newStreak} days!`
            : `Streak reset to 1 day`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update streak error:', error);
    return NextResponse.json(
      { error: 'Failed to update streak' },
      { status: 500 }
    );
  }
}
