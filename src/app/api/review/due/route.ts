import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { SOCIAL_MEDIA_MARKETING_GRAPH } from '@/lib/mastery/knowledgeGraph';
import type { FSRSState, ConceptMastery } from '@/lib/mastery/knowledgeGraph';
import { checkReviewBacklog } from '@/lib/notifications/triggers';
import {
  calculateReviewPriority,
  createReviewBatch,
  findOptimalReviewTime,
  getReviewForecast,
  type SmartReviewItem,
  type ReviewBatch,
  type ReviewForecast,
  type OptimalTimeResult,
} from '@/lib/mastery/smartReview';
import {
  getPredictionWithFallback,
  shouldUseHybrid,
  getCurrentModelForUser,
} from '@/lib/ml/predictionFallback';
import { DEFAULT_COLD_START_CONFIG } from '@/lib/ml/coldStart';

// Urgency level thresholds
const URGENCY_HIGH_THRESHOLD = 0.7;
const URGENCY_MEDIUM_THRESHOLD = 0.4;

/**
 * GET /api/review/due
 * Returns items due for review for the authenticated user
 *
 * Enhanced with:
 * - Smart review scheduling (ML-based prioritization)
 * - Hybrid ML predictions for mastery probability
 * - Priority score: (1 - pMastery) * 0.5 + (1 - retrievability) * 0.5
 * - Urgency levels based on combined analysis
 *
 * Part of Phase 15.3: ML Model Full Integration
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

    // Get optional params
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    const includeForecast = url.searchParams.get('forecast') === 'true';
    const maxMinutes = parseInt(url.searchParams.get('maxMinutes') || '20', 10);

    // Query review items that are due (dueDate <= now)
    const now = new Date();
    const reviewItemsRef = adminDb
      .collection('reviewQueue')
      .doc(userId)
      .collection('items');

    const dueItemsSnap = await reviewItemsRef
      .where('dueDate', '<=', now)
      .orderBy('dueDate', 'asc')
      .limit(limit * 2) // Get more for smart filtering
      .get();

    // Build concept names map
    const conceptNames: Record<string, string> = {};
    for (const conceptId of Object.keys(SOCIAL_MEDIA_MARKETING_GRAPH.concepts)) {
      conceptNames[conceptId] = SOCIAL_MEDIA_MARKETING_GRAPH.concepts[conceptId].name;
    }

    // Transform to smart review items
    const smartItems: SmartReviewItem[] = [];
    const rawItems: Array<{
      conceptId: string;
      conceptName: string;
      conceptDescription: string;
      category: string;
      masteryLevel: number;
      lastReviewedAt: string | null;
      dueDate: string | null;
      reviewCount: number;
      fsrsState: FSRSState | null;
      keyTerms: string[];
      priority: number;
      retrievability: number;
      reasoning: string;
      // ML-enhanced fields
      mlMastery: number;
      confidence: number;
      modelUsed: 'hybrid' | 'bkt';
      urgency: 'high' | 'medium' | 'low';
      correctProbability: number;
    }> = [];

    // Calculate total interactions for model selection
    let totalInteractions = 0;

    for (const doc of dueItemsSnap.docs) {
      const data = doc.data();
      const conceptId = doc.id;

      // Get concept details from knowledge graph
      const concept = SOCIAL_MEDIA_MARKETING_GRAPH.concepts[conceptId];
      const fsrsState: FSRSState = data.fsrsState || {
        stability: 1,
        difficulty: 5,
        elapsedDays: 0,
        scheduledDays: 1,
        reps: 0,
        lapses: 0,
        state: 'new',
      };

      const lastReviewedAt = data.lastReviewedAt?.toDate?.() || now;
      const masteryLevel = data.masteryLevel || 0;
      const reviewCount = data.reviewCount || 0;
      totalInteractions += reviewCount;

      // Calculate smart review priority
      const smartItem = calculateReviewPriority(
        conceptId,
        concept?.name || conceptId,
        fsrsState,
        masteryLevel,
        lastReviewedAt
      );

      // Get ML prediction for this concept
      const mlPrediction = await getPredictionWithFallback(
        userId,
        conceptId,
        undefined,
        {
          hybridTimeoutMs: 2000,
          logFallbacks: false, // Don't log for batch operations
          coldStart: DEFAULT_COLD_START_CONFIG,
        }
      );

      const pMastery = mlPrediction.prediction.masteryProbability;
      const retrievability = smartItem.retrievability;

      // Calculate combined priority score
      // Higher score = more urgent to review
      const mlPriority = (1 - pMastery) * 0.5 + (1 - retrievability) * 0.5;

      // Determine urgency level
      let urgency: 'high' | 'medium' | 'low';
      if (mlPriority >= URGENCY_HIGH_THRESHOLD) {
        urgency = 'high';
      } else if (mlPriority >= URGENCY_MEDIUM_THRESHOLD) {
        urgency = 'medium';
      } else {
        urgency = 'low';
      }

      smartItems.push({
        ...smartItem,
        priority: mlPriority, // Use ML-enhanced priority
      });

      rawItems.push({
        conceptId,
        conceptName: concept?.name || conceptId,
        conceptDescription: concept?.description || '',
        category: concept?.category || 'general',
        masteryLevel,
        lastReviewedAt: lastReviewedAt.toISOString(),
        dueDate: data.dueDate?.toDate?.()?.toISOString() || null,
        reviewCount,
        fsrsState,
        keyTerms: concept?.keyTerms || [],
        priority: mlPriority,
        retrievability: smartItem.retrievability,
        reasoning: smartItem.reasoning,
        // ML-enhanced fields
        mlMastery: pMastery,
        confidence: mlPrediction.prediction.confidence,
        modelUsed: mlPrediction.source === 'hybrid' ? 'hybrid' : 'bkt',
        urgency,
        correctProbability: mlPrediction.prediction.correctProbability,
      });
    }

    // Create optimized review batch
    const batch: ReviewBatch = createReviewBatch(smartItems, maxMinutes);

    // Sort raw items by priority to match batch
    const sortedItems = rawItems
      .sort((a, b) => b.priority - a.priority)
      .slice(0, limit);

    // Get optimal review time (from user's history if available)
    let optimalTime: OptimalTimeResult = {
      hour: 10,
      confidence: 0.3,
      reasoning: 'Default morning review time',
    };

    // Try to get user's review history for optimal time calculation
    try {
      const historySnap = await adminDb
        .collection('reviewHistory')
        .doc(userId)
        .collection('events')
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();

      if (!historySnap.empty) {
        const historyEvents = historySnap.docs.map(d => {
          const eventData = d.data();
          return {
            timestamp: eventData.timestamp?.toDate?.() || new Date(),
            score: eventData.score || 0,
            correct: eventData.correct || false,
          };
        });
        optimalTime = findOptimalReviewTime(historyEvents);
      }
    } catch (historyError) {
      // Silently fail - optimal time is optional enhancement
      console.debug('Could not fetch review history for optimal time:', historyError);
    }

    // Get 7-day forecast if requested
    let forecast: ReviewForecast[] | null = null;
    if (includeForecast) {
      try {
        // Get all mastery records for forecast
        const allItemsSnap = await reviewItemsRef.limit(100).get();
        const masteryRecords: ConceptMastery[] = allItemsSnap.docs.map(d => {
          const data = d.data();
          return {
            conceptId: d.id,
            userId,
            masteryLevel: data.masteryLevel || 0,
            lastReviewedAt: data.lastReviewedAt?.toDate?.() || new Date(),
            lastQuizScore: data.lastQuizScore || 0,
            reviewCount: data.reviewCount || 0,
            correctStreak: data.correctStreak || 0,
            incorrectStreak: data.incorrectStreak || 0,
            fsrsState: data.fsrsState || {
              stability: 1,
              difficulty: 5,
              elapsedDays: 0,
              scheduledDays: 1,
              reps: 0,
              lapses: 0,
              state: 'new' as const,
            },
            nextReviewAt: data.dueDate?.toDate?.() || new Date(),
            history: [],
          };
        });
        forecast = getReviewForecast(masteryRecords, 7);
      } catch (forecastError) {
        console.debug('Could not generate forecast:', forecastError);
      }
    }

    // Fire and forget: check if user should receive a review backlog notification
    if (sortedItems.length >= 5) {
      checkReviewBacklog(userId, sortedItems.length).catch((err) => {
        console.error('Failed to check review backlog notification:', err);
      });
    }

    // Calculate model info
    const currentModel = getCurrentModelForUser(totalInteractions);
    const usingHybrid = shouldUseHybrid(totalInteractions);

    // Calculate average confidence and mastery
    const avgConfidence = sortedItems.length > 0
      ? sortedItems.reduce((sum, item) => sum + (item.confidence || 0.5), 0) / sortedItems.length
      : 0.5;
    const avgMlMastery = sortedItems.length > 0
      ? sortedItems.reduce((sum, item) => sum + (item.mlMastery || 0), 0) / sortedItems.length
      : 0;

    // Count urgency levels
    const urgencyCounts = {
      high: sortedItems.filter((item) => item.urgency === 'high').length,
      medium: sortedItems.filter((item) => item.urgency === 'medium').length,
      low: sortedItems.filter((item) => item.urgency === 'low').length,
    };

    return NextResponse.json({
      success: true,
      dueCount: sortedItems.length,
      items: sortedItems,
      // Smart review enhancements
      batch: {
        estimatedDurationMinutes: batch.estimatedDurationMinutes,
        expectedRetentionGain: Math.round(batch.expectedRetentionGain),
        batchReasoning: batch.batchReasoning,
      },
      optimalTime: {
        hour: optimalTime.hour,
        confidence: Math.round(optimalTime.confidence * 100) / 100,
        reasoning: optimalTime.reasoning,
      },
      // ML Model information
      modelInfo: {
        currentModel,
        usingHybrid,
        interactionCount: totalInteractions,
        hybridThreshold: DEFAULT_COLD_START_CONFIG.coldStartThreshold,
        avgConfidence: Math.round(avgConfidence * 100),
        avgMlMastery: Math.round(avgMlMastery * 100),
      },
      // Urgency summary
      urgencySummary: urgencyCounts,
      ...(forecast && {
        forecast: forecast.map(f => ({
          date: f.date.toISOString(),
          dueCount: f.dueCount,
          estimatedMinutes: f.estimatedMinutes,
        })),
      }),
    });
  } catch (error) {
    console.error('Get due reviews error:', error);
    return NextResponse.json(
      { error: 'Failed to get due reviews' },
      { status: 500 }
    );
  }
}
