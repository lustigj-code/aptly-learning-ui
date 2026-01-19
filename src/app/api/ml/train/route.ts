/**
 * ML Training API Endpoint
 *
 * POST /api/ml/train
 * Triggers ML model training using EdNet or ASSISTments datasets.
 *
 * This endpoint:
 * 1. Validates admin permissions
 * 2. Loads and validates the dataset
 * 3. Transforms data to FSRS/BKT format
 * 4. Estimates optimal parameters using MLE
 * 5. Stores results in Firestore
 *
 * Training runs as a background job with progress updates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { z } from 'zod';
import * as path from 'path';

// ============================================================================
// SCHEMAS
// ============================================================================

const trainingRequestSchema = z.object({
  /** Data source type */
  dataSource: z.enum(['ednet', 'assistments', 'custom']),
  /** Path to data file (relative to data directory or absolute) */
  dataPath: z.string().optional(),
  /** Training configuration */
  config: z
    .object({
      /** Train/test split ratio */
      trainRatio: z.number().min(0.5).max(0.95).default(0.8),
      /** Model types to train */
      modelTypes: z.array(z.enum(['fsrs', 'bkt', 'both'])).default(['both']),
      /** Whether to train per-skill BKT parameters */
      perSkillBKT: z.boolean().default(false),
      /** Grid search size */
      gridSize: z.number().min(2).max(10).default(5),
      /** Cross-validation folds */
      cvFolds: z.number().min(2).max(10).default(5),
      /** Maximum rows to load (for testing) */
      maxRows: z.number().optional(),
      /** Random seed */
      seed: z.number().default(42),
    })
    .optional(),
});

// ============================================================================
// TYPES
// ============================================================================

interface TrainingProgress {
  status: 'pending' | 'loading' | 'validating' | 'transforming' | 'training' | 'completed' | 'failed';
  progress: number; // 0-100
  currentStep: string;
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  error?: string;
  results?: TrainingResults;
}

interface TrainingResults {
  fsrs?: {
    parameters: {
      requestRetention: number;
      maximumInterval: number;
      w: number[];
    };
    metrics: {
      auc: number;
      rmse: number;
      brier: number;
      accuracy: number;
    };
    trainingTimeMs: number;
  };
  bkt?: {
    parameters: {
      pL0: number;
      pT: number;
      pG: number;
      pS: number;
    };
    skillParameters?: Record<string, { pL0: number; pT: number; pG: number; pS: number }>;
    metrics: {
      auc: number;
      rmse: number;
      brier: number;
      accuracy: number;
    };
    trainingTimeMs: number;
  };
  datasetStats: {
    totalInteractions: number;
    uniqueUsers: number;
    uniqueSkills: number;
    correctRate: number;
    trainSize: number;
    testSize: number;
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Update training progress in Firestore
 */
async function updateProgress(trainingId: string, update: Partial<TrainingProgress>) {
  try {
    await adminDb
      .collection('mlTraining')
      .doc(trainingId)
      .set(
        {
          ...update,
          updatedAt: new Date(),
        },
        { merge: true }
      );
  } catch (error) {
    console.error('Failed to update training progress:', error);
  }
}

/**
 * Store optimized parameters in Firestore
 */
async function storeParameters(results: TrainingResults) {
  try {
    const timestamp = new Date();

    // Store FSRS parameters
    if (results.fsrs) {
      await adminDb
        .collection('mlConfig')
        .doc('fsrsParameters')
        .set({
          ...results.fsrs.parameters,
          metrics: results.fsrs.metrics,
          updatedAt: timestamp,
          source: 'training',
        });
    }

    // Store BKT parameters
    if (results.bkt) {
      await adminDb
        .collection('mlConfig')
        .doc('bktParameters')
        .set({
          ...results.bkt.parameters,
          metrics: results.bkt.metrics,
          updatedAt: timestamp,
          source: 'training',
        });

      // Store per-skill parameters if available
      if (results.bkt.skillParameters) {
        for (const [skillId, params] of Object.entries(results.bkt.skillParameters)) {
          await adminDb
            .collection('mlConfig')
            .doc('bktParameters')
            .collection('skills')
            .doc(skillId)
            .set({
              ...params,
              updatedAt: timestamp,
            });
        }
      }
    }

    // Store history entry
    await adminDb.collection('mlConfig').doc('parameters').collection('history').add({
      timestamp,
      fsrs: results.fsrs
        ? {
            parameters: results.fsrs.parameters,
            metrics: results.fsrs.metrics,
          }
        : null,
      bkt: results.bkt
        ? {
            parameters: results.bkt.parameters,
            metrics: results.bkt.metrics,
          }
        : null,
      datasetStats: results.datasetStats,
    });
  } catch (error) {
    console.error('Failed to store parameters:', error);
    throw error;
  }
}

/**
 * Run the training pipeline
 */
async function runTrainingPipeline(
  trainingId: string,
  dataSource: 'ednet' | 'assistments' | 'custom',
  dataPath: string | undefined,
  config: z.infer<typeof trainingRequestSchema>['config']
) {
  const {
    trainRatio = 0.8,
    modelTypes = ['both'],
    perSkillBKT = false,
    gridSize = 5,
    cvFolds = 5,
    maxRows,
    seed = 42,
  } = config || {};

  const trainFSRS = modelTypes.includes('fsrs') || modelTypes.includes('both');
  const trainBKT = modelTypes.includes('bkt') || modelTypes.includes('both');

  try {
    // Step 1: Load data
    await updateProgress(trainingId, {
      status: 'loading',
      progress: 10,
      currentStep: 'Loading dataset...',
    });

    // Dynamic imports to avoid loading heavy modules on every request
    const { loadData, validateDataset } = await import('@/lib/ml/training/ednetLoader');
    const {
      transformToFSRSFormat,
      transformToBKTFormat,
      splitTrainTest,
    } = await import('@/lib/ml/training/dataTransformer');
    const {
      estimateFSRSParameters,
      estimateBKTParameters,
    } = await import('@/lib/ml/training/parameterEstimator');

    // Resolve data path
    const resolvedPath = dataPath
      ? path.isAbsolute(dataPath)
        ? dataPath
        : path.join(process.cwd(), 'data', dataPath)
      : path.join(process.cwd(), 'data', `${dataSource}_sample.csv`);

    const rawData = await loadData(resolvedPath, dataSource, {
      maxRows,
      skipInvalid: true,
    });

    if (rawData.length === 0) {
      throw new Error('No valid interactions loaded from dataset');
    }

    // Step 2: Validate data
    await updateProgress(trainingId, {
      status: 'validating',
      progress: 20,
      currentStep: `Validating ${rawData.length} interactions...`,
    });

    const validation = validateDataset(rawData);
    if (!validation.valid && validation.invalidCount > validation.validCount) {
      throw new Error(
        `Dataset validation failed: ${validation.invalidCount} invalid of ${validation.stats.totalInteractions} total`
      );
    }

    // Step 3: Transform data
    await updateProgress(trainingId, {
      status: 'transforming',
      progress: 30,
      currentStep: 'Transforming data to training format...',
    });

    const results: TrainingResults = {
      datasetStats: {
        totalInteractions: validation.stats.totalInteractions,
        uniqueUsers: validation.stats.uniqueUsers,
        uniqueSkills: validation.stats.uniqueSkills,
        correctRate: validation.stats.correctRate,
        trainSize: 0,
        testSize: 0,
      },
    };

    // Step 4: Train FSRS
    if (trainFSRS) {
      await updateProgress(trainingId, {
        status: 'training',
        progress: 40,
        currentStep: 'Training FSRS model...',
      });

      const fsrsData = transformToFSRSFormat(rawData);
      const { train: fsrsTrain, test: fsrsTest } = splitTrainTest(
        fsrsData,
        trainRatio,
        'temporal',
        seed
      );

      results.datasetStats.trainSize = fsrsTrain.length;
      results.datasetStats.testSize = fsrsTest.length;

      const fsrsResult = estimateFSRSParameters(fsrsTrain, {
        gridSize,
        cvFolds,
        seed,
      });

      results.fsrs = {
        parameters: fsrsResult.parameters,
        metrics: {
          auc: fsrsResult.metrics.auc,
          rmse: fsrsResult.metrics.rmse,
          brier: fsrsResult.metrics.brier,
          accuracy: fsrsResult.metrics.accuracy,
        },
        trainingTimeMs: fsrsResult.trainingTimeMs,
      };

      await updateProgress(trainingId, {
        progress: 60,
        currentStep: `FSRS trained: AUC=${fsrsResult.metrics.auc.toFixed(3)}`,
      });
    }

    // Step 5: Train BKT
    if (trainBKT) {
      await updateProgress(trainingId, {
        status: 'training',
        progress: trainFSRS ? 70 : 50,
        currentStep: 'Training BKT model...',
      });

      const bktData = transformToBKTFormat(rawData);
      const { train: bktTrain, test: bktTest } = splitTrainTest(
        bktData,
        trainRatio,
        'user', // User-based split for BKT
        seed
      );

      if (!trainFSRS) {
        results.datasetStats.trainSize = bktTrain.length;
        results.datasetStats.testSize = bktTest.length;
      }

      const bktResult = estimateBKTParameters(
        bktTrain,
        {
          gridSize,
          cvFolds,
          seed,
        },
        perSkillBKT
      );

      results.bkt = {
        parameters: bktResult.parameters,
        metrics: {
          auc: bktResult.metrics.auc,
          rmse: bktResult.metrics.rmse,
          brier: bktResult.metrics.brier,
          accuracy: bktResult.metrics.accuracy,
        },
        trainingTimeMs: bktResult.trainingTimeMs,
      };

      // Convert Map to Record for storage
      if (bktResult.skillParameters) {
        results.bkt.skillParameters = {};
        for (const [skillId, params] of bktResult.skillParameters.entries()) {
          results.bkt.skillParameters[skillId] = params;
        }
      }

      await updateProgress(trainingId, {
        progress: 90,
        currentStep: `BKT trained: AUC=${bktResult.metrics.auc.toFixed(3)}`,
      });
    }

    // Step 6: Store results
    await updateProgress(trainingId, {
      progress: 95,
      currentStep: 'Storing optimized parameters...',
    });

    await storeParameters(results);

    // Complete
    await updateProgress(trainingId, {
      status: 'completed',
      progress: 100,
      currentStep: 'Training complete',
      completedAt: new Date(),
      results,
    });
  } catch (error) {
    console.error('Training pipeline error:', error);
    await updateProgress(trainingId, {
      status: 'failed',
      currentStep: 'Training failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// ============================================================================
// API HANDLERS
// ============================================================================

/**
 * POST /api/ml/train
 * Start a new training job
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.slice(7);
    let userId: string;
    let userRole: string | undefined;

    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      userId = decodedToken.uid;

      // Get user role from Firestore
      const userDoc = await adminDb.collection('users').doc(userId).get();
      userRole = userDoc.data()?.role;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Verify admin role
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const validation = trainingRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { dataSource, dataPath, config } = validation.data;

    // Create training job record with cryptographically secure ID
    const trainingId = `train_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const initialProgress: TrainingProgress = {
      status: 'pending',
      progress: 0,
      currentStep: 'Initializing...',
      startedAt: new Date(),
      updatedAt: new Date(),
    };

    await adminDb.collection('mlTraining').doc(trainingId).set({
      ...initialProgress,
      requestedBy: userId,
      dataSource,
      dataPath,
      config,
    });

    // Start training in background (non-blocking)
    // In production, this would be a queue job (Bull, etc.)
    runTrainingPipeline(trainingId, dataSource, dataPath, config).catch((error) => {
      console.error('Background training error:', error);
    });

    return NextResponse.json(
      {
        success: true,
        trainingId,
        message: 'Training job started',
        status: initialProgress,
      },
      { status: 202 }
    );
  } catch (error) {
    console.error('Training API error:', error);
    return NextResponse.json(
      { error: 'Failed to start training job' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ml/train?trainingId=xxx
 * Get training job status
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.slice(7);

    try {
      await adminAuth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get training ID from query params
    const { searchParams } = new URL(request.url);
    const trainingId = searchParams.get('trainingId');

    if (!trainingId) {
      // Return recent training jobs
      const recentJobs = await adminDb
        .collection('mlTraining')
        .orderBy('startedAt', 'desc')
        .limit(10)
        .get();

      const jobs = recentJobs.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return NextResponse.json({ success: true, jobs });
    }

    // Get specific training job
    const jobDoc = await adminDb.collection('mlTraining').doc(trainingId).get();

    if (!jobDoc.exists) {
      return NextResponse.json(
        { error: 'Training job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      trainingId,
      ...jobDoc.data(),
    });
  } catch (error) {
    console.error('Get training status error:', error);
    return NextResponse.json(
      { error: 'Failed to get training status' },
      { status: 500 }
    );
  }
}
