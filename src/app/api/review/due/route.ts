import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { SOCIAL_MEDIA_MARKETING_GRAPH } from '@/lib/mastery/knowledgeGraph';

/**
 * GET /api/review/due
 * Returns items due for review for the authenticated user
 */
export async function GET(request: NextRequest) {
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

    // Get optional limit from query params
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);

    // Query review items that are due (dueDate <= now)
    const now = new Date();
    const reviewItemsRef = adminDb
      .collection('reviewQueue')
      .doc(userId)
      .collection('items');

    const dueItemsSnap = await reviewItemsRef
      .where('dueDate', '<=', now)
      .orderBy('dueDate', 'asc')
      .limit(limit)
      .get();

    // Transform results
    const dueItems = dueItemsSnap.docs.map(doc => {
      const data = doc.data();
      const conceptId = doc.id;

      // Get concept details from knowledge graph
      const concept = SOCIAL_MEDIA_MARKETING_GRAPH.concepts[conceptId];

      return {
        conceptId,
        conceptName: concept?.name || conceptId,
        conceptDescription: concept?.description || '',
        category: concept?.category || 'general',
        masteryLevel: data.masteryLevel || 0,
        lastReviewedAt: data.lastReviewedAt?.toDate?.()?.toISOString() || null,
        dueDate: data.dueDate?.toDate?.()?.toISOString() || null,
        reviewCount: data.reviewCount || 0,
        fsrsState: data.fsrsState || null,
        keyTerms: concept?.keyTerms || [],
      };
    });

    return NextResponse.json({
      success: true,
      dueCount: dueItems.length,
      items: dueItems,
    });
  } catch (error) {
    console.error('Get due reviews error:', error);
    return NextResponse.json(
      { error: 'Failed to get due reviews' },
      { status: 500 }
    );
  }
}
