import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { assignVariant } from '@/lib/experiments';

/**
 * POST /api/experiments/assign
 * Assign a user to an experiment variant
 */
export async function POST(request: Request) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];

    // Verify token and get user
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get experiment ID from body
    const body = await request.json();
    const { experimentId } = body;

    if (!experimentId) {
      return NextResponse.json(
        { error: 'experimentId is required' },
        { status: 400 }
      );
    }

    // Assign variant
    const variant = await assignVariant(userId, experimentId);

    return NextResponse.json({ variant });
  } catch (error) {
    console.error('Error assigning variant:', error);
    return NextResponse.json(
      { error: 'Failed to assign variant' },
      { status: 500 }
    );
  }
}
