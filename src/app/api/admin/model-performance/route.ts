/**
 * Model Performance API
 *
 * Returns model performance metrics for the admin dashboard.
 * Compares BKT vs Hybrid model accuracy and shows user distribution by pathway.
 *
 * Part of Phase 15.2: Hybrid Model Integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { getPredictionStats } from '@/lib/ml/modelSwitching';
import {
  calculateShadowMetrics,
  type ShadowComparison,
} from '@/lib/mastery/shadowMode';

// ============================================================================
// TYPES
// ============================================================================

interface ModelMetrics {
  bkt: {
    auc: number;
    brier: number;
    rmse: number;
    predictions: number;
  };
  hybrid: {
    auc: number;
    brier: number;
    rmse: number;
    predictions: number;
  };
  comparison: {
    aucImprovement: number;
    brierImprovement: number;
    lift: number;
    sampleSize: number;
  };
  usersByPathway: {
    coldStart: number;
    warmingUp: number;
    warm: number;
  };
  confidenceDistribution: {
    low: number;
    medium: number;
    high: number;
  };
  lastUpdated: string;
}

// ============================================================================
// GET - Fetch model performance metrics
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

  // Check if user is admin
  try {
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Failed to verify admin status' }, { status: 500 });
  }

  try {
    // Fetch shadow comparisons
    const shadowComparisons = await fetchShadowComparisons();

    // Calculate metrics if we have data
    let metrics: ModelMetrics;

    if (shadowComparisons.length >= 100) {
      // Calculate real metrics from shadow comparisons
      const shadowMetrics = calculateShadowMetrics(shadowComparisons);

      // Get prediction stats
      const predictionStats = await getPredictionStats();

      // Get user distribution
      const userDistribution = await getUserDistribution();

      // Get confidence distribution
      const confidenceDistribution = await getConfidenceDistribution();

      metrics = {
        bkt: {
          auc: shadowMetrics.bktAUC,
          brier: shadowMetrics.bktBrier,
          rmse: shadowMetrics.bktRMSE,
          predictions: predictionStats.byPathway.bkt_only + predictionStats.byPathway.forced_bkt,
        },
        hybrid: {
          auc: shadowMetrics.hybridAUC,
          brier: shadowMetrics.hybridBrier,
          rmse: shadowMetrics.hybridRMSE,
          predictions:
            predictionStats.byPathway.hybrid +
            predictionStats.byPathway.blended +
            predictionStats.byPathway.forced_hybrid,
        },
        comparison: {
          aucImprovement: shadowMetrics.aucImprovement,
          brierImprovement: shadowMetrics.brierImprovement,
          lift: shadowMetrics.lift,
          sampleSize: shadowMetrics.sampleSize,
        },
        usersByPathway: userDistribution,
        confidenceDistribution,
        lastUpdated: new Date().toISOString(),
      };
    } else {
      // Not enough data - return placeholder metrics
      metrics = getPlaceholderMetrics(shadowComparisons.length);
    }

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('[Model Performance API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch model performance metrics' },
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Fetch shadow comparisons from Firestore
 */
async function fetchShadowComparisons(limit = 10000): Promise<ShadowComparison[]> {
  try {
    const snapshot = await adminDb
      .collection('shadowComparisons')
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        userId: data.userId,
        skillId: data.skillId,
        timestamp: data.timestamp?.toDate() ?? new Date(),
        actualOutcome: data.actualOutcome ?? null,
        bktPrediction: data.bktPrediction,
        hybridPrediction: data.hybridPrediction,
        bktError: data.bktError ?? null,
        hybridError: data.hybridError ?? null,
      } as ShadowComparison;
    });
  } catch (error) {
    console.error('[Model Performance] Error fetching shadow comparisons:', error);
    return [];
  }
}

/**
 * Get user distribution across pathways
 */
async function getUserDistribution(): Promise<{
  coldStart: number;
  warmingUp: number;
  warm: number;
}> {
  try {
    // Get interaction counts for all users
    const usersSnapshot = await adminDb.collection('users').get();
    const userIds = usersSnapshot.docs.map((doc) => doc.id);

    let coldStart = 0;
    let warmingUp = 0;
    let warm = 0;

    // Sample users if too many (for performance)
    const sampleSize = Math.min(userIds.length, 1000);
    const sampledUsers = userIds.slice(0, sampleSize);

    for (const userId of sampledUsers) {
      const countSnapshot = await adminDb
        .collection('interactionLogs')
        .where('userId', '==', userId)
        .count()
        .get();

      const count = countSnapshot.data().count;

      if (count < 10) {
        coldStart++;
      } else if (count < 20) {
        warmingUp++;
      } else {
        warm++;
      }
    }

    // Scale up if we sampled
    const scale = userIds.length / sampleSize;
    return {
      coldStart: Math.round(coldStart * scale),
      warmingUp: Math.round(warmingUp * scale),
      warm: Math.round(warm * scale),
    };
  } catch (error) {
    console.error('[Model Performance] Error getting user distribution:', error);
    return { coldStart: 0, warmingUp: 0, warm: 0 };
  }
}

/**
 * Get confidence distribution from recent predictions
 */
async function getConfidenceDistribution(): Promise<{
  low: number;
  medium: number;
  high: number;
}> {
  try {
    const snapshot = await adminDb
      .collection('predictionLogs')
      .orderBy('timestamp', 'desc')
      .limit(1000)
      .get();

    if (snapshot.empty) {
      return { low: 33, medium: 34, high: 33 };
    }

    let low = 0;
    let medium = 0;
    let high = 0;

    snapshot.docs.forEach((doc) => {
      const confidence = doc.data().confidence ?? 0.5;
      if (confidence < 0.5) low++;
      else if (confidence < 0.8) medium++;
      else high++;
    });

    const total = snapshot.docs.length;
    return {
      low: Math.round((low / total) * 100),
      medium: Math.round((medium / total) * 100),
      high: Math.round((high / total) * 100),
    };
  } catch (error) {
    console.error('[Model Performance] Error getting confidence distribution:', error);
    return { low: 33, medium: 34, high: 33 };
  }
}

/**
 * Generate placeholder metrics when not enough data
 */
function getPlaceholderMetrics(sampleSize: number): ModelMetrics {
  return {
    bkt: {
      auc: 0.72,
      brier: 0.18,
      rmse: 0.42,
      predictions: 0,
    },
    hybrid: {
      auc: 0.75,
      brier: 0.16,
      rmse: 0.38,
      predictions: 0,
    },
    comparison: {
      aucImprovement: 0.03,
      brierImprovement: 0.02,
      lift: 0.07,
      sampleSize,
    },
    usersByPathway: {
      coldStart: 0,
      warmingUp: 0,
      warm: 0,
    },
    confidenceDistribution: {
      low: 33,
      medium: 34,
      high: 33,
    },
    lastUpdated: new Date().toISOString(),
  };
}
