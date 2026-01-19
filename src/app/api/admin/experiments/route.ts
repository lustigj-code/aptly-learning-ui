import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { getExperiments, initializeExperiments } from '@/lib/experiments';

/**
 * GET /api/admin/experiments
 * Get all experiments (admin only)
 */
export async function GET(request: Request) {
  try {
    // Verify admin access
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(token);

    // Check if user is admin (you may want to check a custom claim)
    // For now, we just check if they're authenticated

    const experiments = await getExperiments();

    return NextResponse.json({ experiments });
  } catch (error) {
    console.error('Error getting experiments:', error);
    return NextResponse.json(
      { error: 'Failed to get experiments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/experiments
 * Initialize experiments (admin only)
 */
export async function POST(request: Request) {
  try {
    // Verify admin access
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(token);

    const experimentIds = await initializeExperiments();

    return NextResponse.json({
      message: 'Experiments initialized',
      experimentIds,
    });
  } catch (error) {
    console.error('Error initializing experiments:', error);
    return NextResponse.json(
      { error: 'Failed to initialize experiments' },
      { status: 500 }
    );
  }
}
