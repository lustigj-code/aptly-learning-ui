import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { updateConceptMastery } from '@/lib/mastery/fsrs';
import type { ConceptMastery } from '@/lib/mastery/knowledgeGraph';

const { serverTimestamp } = FieldValue;

const completeReviewSchema = z.object({
  conceptId: z.string().min(1),
  score: z.number().min(0).max(100),
  timeSpentSeconds: z.number().min(0).optional(),
});

/**
 * POST /api/review/complete
 * Records a review result and updates FSRS state
 */
export async function POST(request: NextRequest) {
  try {
    // Get and verify Firebase ID token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const idToken = authHeader.slice(7);
    let userId: string;

    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      userId = decodedToken.uid;
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Validate input
    const body = await request.json();
    const validation = completeReviewSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { conceptId, score, timeSpentSeconds } = validation.data;

    // Get current mastery record
    const reviewRef = adminDb
      .collection('reviewQueue')
      .doc(userId)
      .collection('items')
      .doc(conceptId);

    const reviewSnap = await reviewRef.get();

    if (!reviewSnap.exists) {
      return NextResponse.json(
        { error: 'Review item not found' },
        { status: 404 }
      );
    }

    // Reconstruct mastery from Firestore data
    const data = reviewSnap.data();
    const mastery: ConceptMastery = {
      conceptId: data?.conceptId || conceptId,
      userId: data?.userId || userId,
      masteryLevel: data?.masteryLevel || 0,
      lastReviewedAt: data?.lastReviewedAt?.toDate() || new Date(),
      lastQuizScore: data?.lastQuizScore || 0,
      reviewCount: data?.reviewCount || 0,
      correctStreak: data?.correctStreak || 0,
      incorrectStreak: data?.incorrectStreak || 0,
      fsrsState: data?.fsrsState || {
        stability: 0,
        difficulty: 0,
        elapsedDays: 0,
        scheduledDays: 0,
        reps: 0,
        lapses: 0,
        state: 'new',
      },
      nextReviewAt: data?.nextReviewAt?.toDate() || new Date(),
      history: data?.history || [],
    };

    // Update mastery with FSRS algorithm
    const updatedMastery = updateConceptMastery(
      mastery,
      score,
      timeSpentSeconds || 60,
      'review'
    );

    // Save updated mastery to Firestore
    await reviewRef.set({
      conceptId,
      userId,
      masteryLevel: updatedMastery.masteryLevel,
      lastReviewedAt: updatedMastery.lastReviewedAt,
      lastQuizScore: updatedMastery.lastQuizScore,
      reviewCount: updatedMastery.reviewCount,
      correctStreak: updatedMastery.correctStreak,
      incorrectStreak: updatedMastery.incorrectStreak,
      fsrsState: updatedMastery.fsrsState,
      nextReviewAt: updatedMastery.nextReviewAt,
      dueDate: updatedMastery.nextReviewAt,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    // Calculate days until next review
    const now = new Date();
    const daysUntilNext = Math.ceil(
      (updatedMastery.nextReviewAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return NextResponse.json({
      success: true,
      conceptId,
      newMasteryLevel: Math.round(updatedMastery.masteryLevel),
      nextReviewAt: updatedMastery.nextReviewAt.toISOString(),
      daysUntilNextReview: daysUntilNext,
      reviewCount: updatedMastery.reviewCount,
      streak: score >= 70 ? updatedMastery.correctStreak : 0,
    });
  } catch (error) {
    console.error('Complete review error:', error);
    return NextResponse.json(
      { error: 'Failed to complete review' },
      { status: 500 }
    );
  }
}
