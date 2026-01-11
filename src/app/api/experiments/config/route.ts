import { NextResponse } from 'next/server';
import { getIdToken } from '@/lib/firebase';
import { adminAuth } from '@/lib/firebase/admin';
import { getUserExperimentConfig, getUserExperiments } from '@/lib/experiments';

/**
 * GET /api/experiments/config
 * Get the current user's experiment configuration
 */
export async function GET(request: Request) {
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

    // Get user's experiment config
    const config = await getUserExperimentConfig(userId);
    const experiments = await getUserExperiments(userId);

    return NextResponse.json({
      config,
      experiments: experiments.map(e => ({
        experimentId: e.experimentId,
        variant: e.variant,
      })),
    });
  } catch (error) {
    console.error('Error getting experiment config:', error);
    return NextResponse.json(
      { error: 'Failed to get experiment config' },
      { status: 500 }
    );
  }
}
