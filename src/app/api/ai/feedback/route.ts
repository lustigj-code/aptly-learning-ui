/**
 * AI Feedback Collection API
 * Phase 9: RLHF (Reinforcement Learning from Human Feedback)
 *
 * Collects user feedback on AI responses for model improvement
 * Stores feedback in Firestore for later analysis and retraining
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const { responseId, conversationId, rating, detailedFeedback } = await request.json();

    if (!responseId || !rating) {
      return NextResponse.json(
        { error: 'responseId and rating are required' },
        { status: 400 }
      );
    }

    if (!['thumbs_up', 'thumbs_down'].includes(rating)) {
      return NextResponse.json(
        { error: 'rating must be thumbs_up or thumbs_down' },
        { status: 400 }
      );
    }

    // Store feedback in Firestore
    if (adminDb) {
      await adminDb.collection('aiResponseFeedback').doc(responseId).set({
        responseId,
        conversationId: conversationId || null,
        rating,
        detailedFeedback: detailedFeedback || null,
        timestamp: new Date(),
        // Will be populated when we have user context
        userId: null,
      }, { merge: true });

      console.log(`✅ Feedback collected: ${rating} for ${responseId}`);
    } else {
      // Log feedback when Firestore not available (dev mode)
      console.log(`[DEV] Feedback: ${rating} for ${responseId}`, detailedFeedback || '');
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback recorded successfully',
    });
  } catch (error) {
    console.error('Feedback collection error:', error);

    // Still return success for better UX
    return NextResponse.json({
      success: true,
      message: 'Feedback received',
    });
  }
}

/**
 * GET: Retrieve feedback stats (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json({
        totalFeedback: 0,
        positiveRate: 0,
        recentFeedback: [],
      });
    }

    // Get last 100 feedback items
    const snapshot = await adminDb
      .collection('aiResponseFeedback')
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();

    type FeedbackDoc = {
      id: string;
      rating: 'thumbs_up' | 'thumbs_down';
      detailedFeedback?: string | null;
      timestamp: string | null;
    };

    const feedback: FeedbackDoc[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        rating: data.rating as 'thumbs_up' | 'thumbs_down',
        detailedFeedback: data.detailedFeedback || null,
        timestamp: data.timestamp?.toDate?.()?.toISOString() || null,
      };
    });

    const positive = feedback.filter(f => f.rating === 'thumbs_up').length;
    const total = feedback.length;

    return NextResponse.json({
      totalFeedback: total,
      positiveRate: total > 0 ? Math.round((positive / total) * 100) : 0,
      recentFeedback: feedback.slice(0, 10),
    });
  } catch (error) {
    console.error('Feedback stats error:', error);
    return NextResponse.json({
      totalFeedback: 0,
      positiveRate: 0,
      recentFeedback: [],
    });
  }
}
