import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import {
  getExperiment,
  startExperiment,
  pauseExperiment,
  completeExperiment,
  calculateResults,
} from '@/lib/experiments';

/**
 * GET /api/admin/experiments/[id]
 * Get a specific experiment
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(token);

    const { id } = await params;
    const experiment = await getExperiment(id);

    if (!experiment) {
      return NextResponse.json(
        { error: 'Experiment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ experiment });
  } catch (error) {
    console.error('Error getting experiment:', error);
    return NextResponse.json(
      { error: 'Failed to get experiment' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/experiments/[id]/start
 * Start an experiment
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(token);

    const { id } = await params;

    // Determine action from URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const action = pathParts[pathParts.length - 1];

    switch (action) {
      case 'start':
        await startExperiment(id);
        return NextResponse.json({ message: 'Experiment started' });

      case 'pause':
        await pauseExperiment(id);
        return NextResponse.json({ message: 'Experiment paused' });

      case 'complete':
        const results = await completeExperiment(id);
        return NextResponse.json({ message: 'Experiment completed', results });

      case 'calculate':
        const calculatedResults = await calculateResults(id);
        return NextResponse.json({ results: calculatedResults });

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error performing experiment action:', error);
    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}
