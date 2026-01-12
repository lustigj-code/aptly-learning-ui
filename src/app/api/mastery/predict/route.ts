/**
 * Mastery Prediction API
 *
 * Endpoint for getting mastery predictions using the hybrid model system.
 * Supports A/B testing variants and returns prediction with confidence and pathway used.
 *
 * Part of Phase 15.2: Hybrid Model Integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import type { SkillState } from '@/lib/mastery/bkt';
import { createInitialState, DEFAULT_BKT_PARAMS } from '@/lib/mastery/bkt';
import { getDefaultFeatures } from '@/lib/mastery/predictionRouter';
import type { InteractionFeatures } from '@/lib/mastery/hybridTypes';
import {
  getModelPrediction,
  getUserSkillInteractionCount,
  type PredictionResult,
} from '@/lib/ml/modelSwitching';
import { getColdStartState } from '@/lib/ml/coldStart';
import { getUserExperimentConfig, getUserVariant } from '@/lib/experiments/abTest';

// ============================================================================
// TYPES
// ============================================================================

interface PredictRequest {
  skillId: string;
  // Optional: provide features for more accurate prediction
  questionId?: string;
  questionDifficulty?: number;
  elapsedTimeSinceLastAttempt?: number;
}

interface PredictResponse {
  success: boolean;
  prediction: {
    pMastery: number;
    pCorrectNext: number;
    confidence: number;
    modelUsed: string;
  };
  pathway: {
    type: string;
    bktWeight: number;
    hybridWeight: number;
    reason: string;
  };
  coldStart: {
    phase: string;
    interactionCount: number;
    interactionsToWarm: number;
  };
  experimentVariant?: string;
}

// ============================================================================
// GET - Simple prediction query
// ============================================================================

export async function GET(request: NextRequest) {
  // Verify authentication
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let userId: string;
  try {
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    userId = decodedToken.uid;
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // Get query parameters
  const searchParams = request.nextUrl.searchParams;
  const skillId = searchParams.get('skillId');
  const forceModel = searchParams.get('forceModel') as 'bkt' | 'hybrid' | null;

  if (!skillId) {
    return NextResponse.json(
      { error: 'skillId query param required' },
      { status: 400 }
    );
  }

  try {
    const result = await getPredictionForUser(userId, skillId, undefined, forceModel);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Mastery Predict API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get prediction' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Prediction with additional features
// ============================================================================

export async function POST(request: NextRequest) {
  // Verify authentication
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let userId: string;
  try {
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    userId = decodedToken.uid;
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // Parse request body
  let body: PredictRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  if (!body.skillId) {
    return NextResponse.json(
      { error: 'skillId is required' },
      { status: 400 }
    );
  }

  // Build features from request
  const features: Partial<InteractionFeatures> = {};
  if (body.questionId) features.questionId = body.questionId;
  if (body.questionDifficulty !== undefined) {
    features.questionDifficulty = body.questionDifficulty;
    features.difficultyDeviation = body.questionDifficulty - 0.5; // Deviation from average
  }
  if (body.elapsedTimeSinceLastAttempt !== undefined) {
    features.elapsedTimeSinceLastAttempt = body.elapsedTimeSinceLastAttempt;
  }

  try {
    const result = await getPredictionForUser(userId, body.skillId, features);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Mastery Predict API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get prediction' },
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getPredictionForUser(
  userId: string,
  skillId: string,
  additionalFeatures?: Partial<InteractionFeatures>,
  forceModel?: 'bkt' | 'hybrid' | null
): Promise<PredictResponse> {
  // Get user's skill state
  const skillStateDoc = await adminDb
    .collection('skillStates')
    .doc(userId)
    .collection('skills')
    .doc(skillId)
    .get();

  let skillState: SkillState;
  if (skillStateDoc.exists) {
    const data = skillStateDoc.data()!;
    skillState = {
      skillId,
      pMastery: data.pMastery ?? 0.1,
      attempts: data.attempts ?? 0,
      correctCount: data.correctCount ?? 0,
      lastAttempt: data.lastAttempt?.toDate() ?? new Date(),
      history: data.history ?? [],
    };
  } else {
    // Create initial state
    skillState = createInitialState(skillId, DEFAULT_BKT_PARAMS);
  }

  // Get interaction count for this skill
  const interactionCount = await getUserSkillInteractionCount(userId, skillId);

  // Build features
  const defaultFeatures = getDefaultFeatures(skillId);
  const features: InteractionFeatures = {
    ...defaultFeatures,
    ...additionalFeatures,
    attemptNumber: skillState.attempts,
    recentCorrectRate: skillState.attempts > 0
      ? skillState.correctCount / skillState.attempts
      : 0.5,
  };

  // Get experiment variant (if in A/B test)
  let experimentVariant: string | undefined;
  const experimentConfig = await getUserExperimentConfig(userId);

  // Check if user has a specific variant for the hybrid model experiment
  const hybridExperimentId = await findHybridExperimentId();
  if (hybridExperimentId) {
    const variant = await getUserVariant(userId, hybridExperimentId);
    if (variant) {
      experimentVariant = variant;
    }
  }

  // Override force model based on experiment config
  let effectiveForceModel = forceModel;
  if (!forceModel && experimentConfig.useHybridModel === false) {
    effectiveForceModel = 'bkt';
  }

  // Get prediction
  const result: PredictionResult = await getModelPrediction(
    userId,
    skillState,
    features,
    interactionCount,
    effectiveForceModel ? {
      coldStart: { coldStartThreshold: 10, warmUpThreshold: 20, finalBktWeight: 0.2, transitionCurve: 'linear' },
      forceModel: effectiveForceModel,
      enableLogging: true,
      logCollection: 'predictionLogs',
    } : undefined,
    DEFAULT_BKT_PARAMS,
    experimentVariant
  );

  // Get cold-start state
  const coldStartState = getColdStartState(userId, interactionCount);

  return {
    success: true,
    prediction: {
      pMastery: result.prediction.pMastery,
      pCorrectNext: result.prediction.pCorrectNext,
      confidence: result.prediction.confidence,
      modelUsed: result.prediction.modelUsed,
    },
    pathway: {
      type: result.decision.pathway,
      bktWeight: result.decision.weights.bkt,
      hybridWeight: result.decision.weights.hybrid,
      reason: result.decision.reason,
    },
    coldStart: {
      phase: coldStartState.phase,
      interactionCount: coldStartState.interactionCount,
      interactionsToWarm: Math.max(0, 20 - interactionCount),
    },
    experimentVariant,
  };
}

/**
 * Find the experiment ID for BKT vs Hybrid experiment
 */
async function findHybridExperimentId(): Promise<string | null> {
  try {
    const snapshot = await adminDb
      .collection('experiments')
      .where('name', '==', 'BKT vs Hybrid Learner Model')
      .where('status', '==', 'running')
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return snapshot.docs[0].id;
  } catch {
    return null;
  }
}
