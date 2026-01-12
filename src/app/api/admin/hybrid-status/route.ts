/**
 * Hybrid Model Status API
 *
 * Returns current hybrid model training status including:
 * - Shadow comparison sample size
 * - Lift over BKT baseline
 * - Production readiness
 *
 * Part of Phase 15: Hybrid Learner Model
 */

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import {
  calculateLift,
  isHybridProductionReady,
  type ShadowComparison,
} from '@/lib/mastery/shadowMode';

export async function GET() {
  try {
    // Fetch shadow comparisons from Firestore
    const comparisonsRef = adminDb.collection('shadowComparisons');
    const snapshot = await comparisonsRef
      .orderBy('timestamp', 'desc')
      .limit(10000) // Limit for performance
      .get();

    const comparisons: ShadowComparison[] = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      comparisons.push({
        userId: data.userId,
        skillId: data.skillId,
        timestamp: data.timestamp?.toDate() ?? new Date(),
        actualOutcome: data.actualOutcome ?? null,
        bktPrediction: data.bktPrediction,
        hybridPrediction: data.hybridPrediction,
        bktError: data.bktError ?? null,
        hybridError: data.hybridError ?? null,
      });
    });

    // Calculate metrics
    const readiness = isHybridProductionReady(comparisons);
    const lift = calculateLift(comparisons);

    return NextResponse.json({
      sampleSize: readiness.sampleSize,
      lift,
      ready: readiness.ready,
      reason: readiness.reason,
    });
  } catch (error) {
    console.error('[Hybrid Status API] Error:', error);

    // Return empty status on error (collection may not exist yet)
    return NextResponse.json({
      sampleSize: 0,
      lift: 0,
      ready: false,
      reason: 'No shadow comparisons yet. Data collection in progress.',
    });
  }
}
