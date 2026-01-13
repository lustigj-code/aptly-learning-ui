/**
 * @deprecated Uses legacy `userProgress` collection.
 * Streak updates in main flow are handled by `/api/progress/sync`.
 */
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';

const { serverTimestamp, arrayUnion } = FieldValue;

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
    // Get user ID from auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = authHeader.slice(7);

    // Validate input
    const body = await request.json();
    const validation = updateStreakSchema.safeParse(body);
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
    let frozeApplied = false;

    // If last activity was yesterday, increment streak
    if (lastCompletedDate === yesterdayString) {
      newStreak++;
    } else if (lastCompletedDate && lastCompletedDate !== yesterdayString) {
      // Gap > 1 day: check for freezes
      const freezesAvailable = streakData.freezesAvailable || 0;

      if (freezesAvailable > 0) {
        // Apply freeze to yesterday
        await userProgressRef.update({
          'streak.freezesAvailable': freezesAvailable - 1,
          'streak.freezesUsed': arrayUnion(
            yesterdayString
          ),
          'streak.lastCompletedDate': today,
        });
        frozeApplied = true;
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

    // Update user progress
    await userProgressRef.update({
      'streak.currentStreak': newStreak,
      'streak.longestStreak': longestStreak,
      'streak.lastCompletedDate': today,
    });

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
