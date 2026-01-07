/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { z } from 'zod';
import { evaluateBadgeCriteria } from '@/lib/utils/badgeEvaluator';
import type { Badge, UserProgress } from '@/types';
import { FieldValue } from 'firebase-admin/firestore';

const checkCriteriaSchema = z.object({
  userId: z.string().min(1),
});

type EarnedBadge = {
  id: string;
  title: string;
  earnedAt: string;
};

/**
 * POST /api/badges/check-criteria
 * Evaluate all badge criteria for a user and award badges if criteria are met
 * This is an async operation that should be called from progress update routes
 *
 * Request body: { userId: string }
 * Response: { success: boolean; newBadges: EarnedBadge[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = checkCriteriaSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { userId } = validation.data;

    // Fetch user progress
    const userProgressSnap = await adminDb
      .collection('userProgress')
      .doc(userId)
      .get();

    if (!userProgressSnap.exists) {
      return NextResponse.json(
        { error: 'User progress not found' },
        { status: 404 }
      );
    }

    const userProgress = userProgressSnap.data() as UserProgress;

    // Fetch all badge definitions
    const badgesSnap = await adminDb.collection('badges').get();
    if (badgesSnap.empty) {
      return NextResponse.json(
        { success: true, newBadges: [] },
        { status: 200 }
      );
    }

    const badges = badgesSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Badge[];

    // Get user's already earned badges
    const userBadgesRef = adminDb.collection('userBadges').doc(userId);
    const userBadgesSnap = await userBadgesRef.get();
    const earnedBadgeIds = userBadgesSnap.exists
      ? (userBadgesSnap.data()?.badges || []).map((b: Badge) => b.id)
      : [];

    // Evaluate each badge
    const newBadges: EarnedBadge[] = [];
    const badgesToAdd: Badge[] = [];

    for (const badge of badges) {
      // Skip if user already has this badge
      if (earnedBadgeIds.includes(badge.id)) {
        continue;
      }

      // Evaluate criteria
      const meetsCriteria = await evaluateBadgeCriteria(
        userId,
        badge.criteria,
        userProgress as any
      );

      if (meetsCriteria) {
        const earnedAt = new Date().toISOString();
        newBadges.push({
          id: badge.id,
          title: badge.title,
          earnedAt,
        });
        badgesToAdd.push({
          ...badge,
          earnedAt: new Date(earnedAt),
        });
      }
    }

    // Update userBadges collection if new badges earned
    if (newBadges.length > 0) {
      const existingBadges = userBadgesSnap.exists
        ? (userBadgesSnap.data()?.badges || [])
        : [];

      await userBadgesRef.set(
        {
          userId,
          badges: [...existingBadges, ...badgesToAdd],
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    }

    return NextResponse.json(
      {
        success: true,
        newBadges,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Badge check-criteria error:', error);
    return NextResponse.json(
      { error: 'Failed to check badge criteria' },
      { status: 500 }
    );
  }
}
