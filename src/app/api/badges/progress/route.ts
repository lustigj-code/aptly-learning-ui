import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { z } from 'zod';
import { getAuthenticatedUserId } from '@/lib/auth/requireAuth';
import { calculateBadgeProgress } from '@/lib/utils/badgeEvaluator';
import { getUserProgress } from '@/lib/data/userProgressLayer';
import type { Badge } from '@/types';

const progressSchema = z.object({
  userId: z.string().min(1),
  badgeId: z.string().min(1).optional(),
});

type BadgeProgressResponse = {
  badgeId: string;
  title: string;
  earned: boolean;
  earnedAt?: string;
  progress?: {
    current: number;
    target: number;
    label: string;
  };
};

/**
 * GET /api/badges/progress?userId=xxx&badgeId=yyy
 * Get badge progress for a user
 * If badgeId is provided, returns progress for specific badge
 * If not provided, returns progress for all badges
 *
 * Query params: userId (required), badgeId (optional)
 * Response: { success: boolean; badges: BadgeProgressResponse[] }
 *
 * Phase 5 Optimization: Uses unified user progress layer with caching
 */
export async function GET(request: NextRequest) {
  try {
    // IDOR Protection: Validate userId query param matches authenticated user
    const userIdResult = await getAuthenticatedUserId(request, { allowUserId: true });
    if (userIdResult instanceof NextResponse) {
      return userIdResult;
    }
    const userId = userIdResult;

    const searchParams = request.nextUrl.searchParams;
    const badgeId = searchParams.get('badgeId');

    // Validate input
    const validation = progressSchema.safeParse({ userId, badgeId });
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      );
    }

    // Fetch user progress using unified layer (with caching and fallback)
    const userData = await getUserProgress(userId);

    // Convert to format expected by badge evaluator
    const userProgress = {
      atomsCompleted: userData.progress.atomsCompleted,
      lessonsCompleted: userData.progress.lessonsCompleted,
      modulesCompleted: userData.progress.modulesCompleted ?? [],
      coursesCompleted: userData.progress.coursesCompleted ?? [],
      totalXP: userData.progress.totalXP,
      currentLevel: userData.progress.currentLevel,
      overallPercentage: userData.progress.overallPercentage,
      currentStreak: userData.streak.currentStreak,
      longestStreak: userData.streak.longestStreak,
    };

    // Fetch badges from Firestore
    let badgesQuery = adminDb.collection('badges');
    if (badgeId) {
      badgesQuery = badgesQuery.where('id', '==', badgeId) as typeof badgesQuery;
    }

    const badgesSnap = await badgesQuery.get();
    if (badgesSnap.empty) {
      return NextResponse.json(
        { error: badgeId ? 'Badge not found' : 'No badges found' },
        { status: 404 }
      );
    }

    const badges = badgesSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Badge[];

    // Get user's earned badges
    const userBadgesSnap = await adminDb
      .collection('userBadges')
      .doc(userId!)
      .get();

    const earnedBadges = userBadgesSnap.exists
      ? (userBadgesSnap.data()?.badges || [])
      : [];

    const earnedBadgeMap = new Map(
      (earnedBadges as Badge[]).map((b: Badge) => [b.id, b])
    );

    // Calculate progress for each badge
    const badgeProgress: BadgeProgressResponse[] = [];

    for (const badge of badges) {
      const earnedBadge = earnedBadgeMap.get(badge.id);
      const isEarned = !!earnedBadge;

      const response: BadgeProgressResponse = {
        badgeId: badge.id,
        title: badge.title,
        earned: isEarned,
      };

      if (isEarned && earnedBadge) {
        const earnedAt = (earnedBadge as Record<string, unknown>).earnedAt;
        if (earnedAt) {
          response.earnedAt = new Date(earnedAt as string | number | Date).toISOString();
        }
      }

      // Calculate progress if badge is not earned yet
      if (!isEarned) {
        const progress = calculateBadgeProgress(badge.criteria, userProgress);
        if (progress) {
          response.progress = progress;
        }
      }

      badgeProgress.push(response);
    }

    return NextResponse.json(
      {
        success: true,
        badges: badgeProgress,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Badge progress error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch badge progress' },
      { status: 500 }
    );
  }
}
