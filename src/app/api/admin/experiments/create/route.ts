import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { createExperiment, type Experiment } from '@/lib/experiments';

/**
 * POST /api/admin/experiments/create
 * Create a new experiment (admin only)
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

    // Optional: Check if user has admin role via custom claims
    // if (decodedToken.role !== 'admin') {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.description) {
      return NextResponse.json(
        { error: 'Name and description are required' },
        { status: 400 }
      );
    }

    if (!body.variants?.control || !body.variants?.treatment) {
      return NextResponse.json(
        { error: 'Control and treatment variants are required' },
        { status: 400 }
      );
    }

    if (!body.allocation?.control || !body.allocation?.treatment) {
      return NextResponse.json(
        { error: 'Allocation percentages are required' },
        { status: 400 }
      );
    }

    // Validate allocation sums to 1
    const totalAllocation = body.allocation.control + body.allocation.treatment;
    if (Math.abs(totalAllocation - 1) > 0.01) {
      return NextResponse.json(
        { error: 'Allocation percentages must sum to 100%' },
        { status: 400 }
      );
    }

    // Construct experiment data
    const experimentData: Omit<Experiment, 'id' | 'createdAt' | 'updatedAt'> = {
      name: body.name,
      description: body.description,
      status: body.status || 'draft',
      startDate: body.startDate ? new Date(body.startDate) : new Date(),
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      variants: {
        control: {
          useAdaptiveSequencing: body.variants.control.useAdaptiveSequencing ?? false,
          useStruggleDetection: body.variants.control.useStruggleDetection ?? false,
          useProactiveCoach: body.variants.control.useProactiveCoach ?? false,
          usePretests: body.variants.control.usePretests ?? false,
          useContentVariants: body.variants.control.useContentVariants ?? false,
          useSocraticMode: body.variants.control.useSocraticMode ?? false,
        },
        treatment: {
          useAdaptiveSequencing: body.variants.treatment.useAdaptiveSequencing ?? true,
          useStruggleDetection: body.variants.treatment.useStruggleDetection ?? true,
          useProactiveCoach: body.variants.treatment.useProactiveCoach ?? true,
          usePretests: body.variants.treatment.usePretests ?? true,
          useContentVariants: body.variants.treatment.useContentVariants ?? true,
          useSocraticMode: body.variants.treatment.useSocraticMode ?? false,
        },
      },
      allocation: {
        control: body.allocation.control,
        treatment: body.allocation.treatment,
      },
      metrics: body.metrics || [
        'courseCompletionRate',
        'skillMasteryRate',
        'retentionRate',
      ],
      sampleSize: {
        target: body.sampleSize?.target || 200,
        current: { control: 0, treatment: 0 },
      },
    };

    const experimentId = await createExperiment(experimentData);

    return NextResponse.json({
      message: 'Experiment created successfully',
      experimentId,
    });
  } catch (error) {
    console.error('Error creating experiment:', error);
    return NextResponse.json(
      { error: 'Failed to create experiment' },
      { status: 500 }
    );
  }
}
