/**
 * Mastery Map API
 *
 * Returns skill map data with user progress for visualization
 *
 * Uses hybrid ML model for mastery predictions:
 * - Confidence and model info per skill
 * - Reasoning about prediction source
 * - Model status in response
 *
 * Part of Phase 14: Mastery Map UX
 * Part of Phase 15.3: ML Model Full Integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { getSkillMap } from '@/lib/skillmap/skillMapStorage';
import { AI_AT_WORK_SKILL_MAP } from '@/data/skillMap';
import { generateMasteryMapData } from '@/components/mastery/layoutUtils';
import type { SkillState, Skill } from '@/lib/mastery/bkt';
import type { ConceptMastery } from '@/lib/mastery/knowledgeGraph';
import {
  getPredictionWithFallback,
  shouldUseHybrid,
  getCurrentModelForUser,
} from '@/lib/ml/predictionFallback';
import { DEFAULT_COLD_START_CONFIG } from '@/lib/ml/coldStart';

export async function GET(request: NextRequest) {
  // Verify authentication
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let authenticatedUserId: string;
  try {
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    authenticatedUserId = decodedToken.uid;
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const requestedUserId = searchParams.get('userId');
  const courseId = searchParams.get('courseId') || 'ai-at-work';

  if (!requestedUserId) {
    return NextResponse.json(
      { error: 'userId query param required' },
      { status: 400 }
    );
  }

  // IDOR Protection: Users can only access their own data
  if (requestedUserId !== authenticatedUserId) {
    return NextResponse.json(
      { error: 'Cannot access other users data' },
      { status: 403 }
    );
  }

  const userId = authenticatedUserId;

  try {
    // Get skill map
    const skillMapData = await getSkillMap(courseId);
    let skills: Record<string, Skill> = {};

    if (skillMapData && skillMapData.skills) {
      skills = skillMapData.skills;
    } else {
      // Fallback to hardcoded
      skills = AI_AT_WORK_SKILL_MAP.skills;
    }

    // Fetch skill states
    const skillStatesRef = adminDb.collection('skillStates').doc(userId).collection('skills');
    const skillStatesSnap = await skillStatesRef.get();

    const skillStates: Record<string, SkillState> = {};
    skillStatesSnap.forEach(doc => {
      const data = doc.data();
      skillStates[doc.id] = {
        skillId: doc.id,
        pMastery: data.pMastery ?? 0,
        attempts: data.attempts ?? 0,
        correctCount: data.correctCount ?? 0,
        lastAttempt: data.lastAttempt?.toDate() ?? new Date(),
        history: data.history ?? [],
      };
    });

    // Fetch FSRS states
    const fsrsRef = adminDb.collection('conceptMastery').doc(userId).collection('concepts');
    const fsrsSnap = await fsrsRef.get();

    const fsrsStates: ConceptMastery[] = [];
    fsrsSnap.forEach(doc => {
      const data = doc.data();
      fsrsStates.push({
        conceptId: doc.id,
        userId,
        masteryLevel: data.masteryLevel ?? 0,
        lastReviewedAt: data.lastReviewedAt?.toDate() ?? new Date(),
        lastQuizScore: data.lastQuizScore ?? 0,
        reviewCount: data.reviewCount ?? 0,
        correctStreak: data.correctStreak ?? 0,
        incorrectStreak: data.incorrectStreak ?? 0,
        fsrsState: data.fsrsState ?? {
          stability: 0,
          difficulty: 0,
          elapsedDays: 0,
          scheduledDays: 0,
          reps: 0,
          lapses: 0,
          state: 'new',
        },
        nextReviewAt: data.nextReviewAt?.toDate() ?? new Date(),
        history: data.history ?? [],
      });
    });

    // Get current learning position
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const currentSkillId = userData?.progress?.currentSkillId;

    // Generate map data
    const mapData = generateMasteryMapData(
      { skills },
      skillStates,
      fsrsStates,
      currentSkillId
    );

    // Calculate total interaction count
    const totalInteractions = Object.values(skillStates).reduce(
      (sum, state) => sum + (state.attempts || 0),
      0
    );

    // Enhance nodes with ML predictions
    const enhancedNodes = await Promise.all(
      mapData.nodes.map(async (node) => {
        const skillState = skillStates[node.id];
        const attempts = skillState?.attempts ?? 0;

        // Get ML prediction for this skill
        const fallbackResult = await getPredictionWithFallback(
          userId,
          node.id,
          undefined,
          {
            hybridTimeoutMs: 2000,
            logFallbacks: false, // Don't log for map - too many predictions
            coldStart: DEFAULT_COLD_START_CONFIG,
          }
        );

        const prediction = fallbackResult.prediction;

        // Generate reasoning based on model used
        let reasoning: string;
        if (fallbackResult.source === 'hybrid') {
          reasoning = `Hybrid model prediction based on ${prediction.metadata.interactionCount} interactions. ` +
            `Confidence: ${Math.round(prediction.confidence * 100)}%`;
        } else if (prediction.metadata.isColdStart) {
          reasoning = `Building your profile (${attempts}/${DEFAULT_COLD_START_CONFIG.coldStartThreshold} interactions needed for ML predictions)`;
        } else {
          reasoning = `BKT model prediction with ${attempts} attempts`;
        }

        return {
          ...node,
          // ML-enhanced fields
          mlMastery: prediction.masteryProbability,
          confidence: prediction.confidence,
          modelUsed: fallbackResult.source === 'hybrid' ? 'hybrid' : 'bkt',
          pathway: prediction.pathway,
          reasoning,
          correctProbability: prediction.correctProbability,
          contributions: prediction.contributions,
        };
      })
    );

    // Determine current model status
    const currentModel = getCurrentModelForUser(totalInteractions);
    const usingHybrid = shouldUseHybrid(totalInteractions);

    // Calculate average confidence
    const avgConfidence = enhancedNodes.length > 0
      ? enhancedNodes.reduce((sum, n) => sum + n.confidence, 0) / enhancedNodes.length
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        ...mapData,
        nodes: enhancedNodes,
      },
      stats: {
        totalSkills: mapData.nodes.length,
        mastered: mapData.nodes.filter(n => n.status === 'mastered').length,
        available: mapData.nodes.filter(n => n.status === 'available').length,
        locked: mapData.nodes.filter(n => n.status === 'locked').length,
        decaying: mapData.nodes.filter(n => n.status === 'decaying').length,
        avgConfidence: Math.round(avgConfidence * 100),
      },
      // Model information
      modelInfo: {
        currentModel,
        usingHybrid,
        interactionCount: totalInteractions,
        hybridThreshold: DEFAULT_COLD_START_CONFIG.coldStartThreshold,
        interactionsToHybrid: Math.max(0, DEFAULT_COLD_START_CONFIG.coldStartThreshold - totalInteractions),
        avgConfidence: Math.round(avgConfidence * 100),
      },
    });
  } catch (error) {
    console.error('[Mastery Map API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate mastery map' },
      { status: 500 }
    );
  }
}
