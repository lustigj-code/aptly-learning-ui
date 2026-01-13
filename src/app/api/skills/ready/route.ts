/**
 * Ready Skills API Route
 *
 * GET /api/skills/ready - Get skills user is ready to learn
 *
 * Uses hybrid ML model for skill recommendations:
 * - Zone of Proximal Development (0.4-0.7 mastery optimal)
 * - Confidence-based ranking
 * - Model info in response
 *
 * Part of Phase 15.3: ML Model Full Integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/apiAuth';
import {
  getReadyToLearnSkills,
  getMasteredSkills,
  getSkillStatesRecord,
} from '@/lib/services/skillService';
import { getSkillsByPriority } from '@/lib/mastery/bkt';
import { AI_AT_WORK_SKILL_MAP, getSkillName } from '@/data/skillMap';
import {
  getPredictionWithFallback,
  shouldUseHybrid,
  getCurrentModelForUser,
} from '@/lib/ml/predictionFallback';
import { logHybridPrediction } from '@/lib/ml/predictionLogger';
import { DEFAULT_COLD_START_CONFIG } from '@/lib/ml/coldStart';

// Zone of Proximal Development bounds
const ZPD_LOW = 0.4;
const ZPD_HIGH = 0.7;

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get current skill states
    const statesRecord = await getSkillStatesRecord(user.uid);

    // Calculate total interaction count for model selection
    const totalInteractions = Object.values(statesRecord).reduce(
      (sum, state) => sum + (state.attempts || 0),
      0
    );

    // Get skills by priority (zone of proximal development)
    const { almostMastered, readyToLearn, locked } = getSkillsByPriority(
      AI_AT_WORK_SKILL_MAP,
      statesRecord
    );

    // Get mastered skills
    const mastered = await getMasteredSkills(user.uid);

    // Enrich skills with hybrid model predictions
    const enrichSkillsWithML = async (skillIds: string[]) => {
      const enrichedSkills = await Promise.all(
        skillIds.map(async (id) => {
          const state = statesRecord[id];
          const attempts = state?.attempts ?? 0;

          // Get ML prediction for this skill
          const fallbackResult = await getPredictionWithFallback(
            user.uid,
            id,
            undefined, // No interaction history needed for mastery check
            {
              hybridTimeoutMs: 3000,
              logFallbacks: true,
              coldStart: DEFAULT_COLD_START_CONFIG,
            }
          );

          const prediction = fallbackResult.prediction;

          // Log prediction (fire and forget)
          logHybridPrediction(user.uid, id, prediction, {
            source: 'skills-ready-api',
            interactionCount: attempts,
            isColdStart: prediction.metadata.isColdStart,
          }).catch(() => {});

          // Calculate ZPD score (closer to 0.5-0.6 is better)
          const masteryProb = prediction.masteryProbability;
          let zpdScore = 0;
          if (masteryProb >= ZPD_LOW && masteryProb <= ZPD_HIGH) {
            // In ZPD - score based on how close to optimal (0.55)
            zpdScore = 1 - Math.abs(masteryProb - 0.55) / 0.15;
          } else if (masteryProb < ZPD_LOW) {
            // Below ZPD - still learnable but less optimal
            zpdScore = masteryProb / ZPD_LOW * 0.5;
          } else {
            // Above ZPD - almost mastered, high priority to complete
            zpdScore = 0.8 + (masteryProb - ZPD_HIGH) / (1 - ZPD_HIGH) * 0.2;
          }

          return {
            id,
            name: getSkillName(id),
            skill: AI_AT_WORK_SKILL_MAP.skills[id],
            pMastery: masteryProb,
            attempts,
            // ML-specific fields
            confidence: prediction.confidence,
            modelUsed: fallbackResult.source === 'hybrid' ? 'hybrid' : 'bkt',
            pathway: prediction.pathway,
            zpdScore,
            inZPD: masteryProb >= ZPD_LOW && masteryProb <= ZPD_HIGH,
            correctProbability: prediction.correctProbability,
          };
        })
      );

      // Sort by ZPD score (highest first) for optimal learning order
      return enrichedSkills.sort((a, b) => b.zpdScore - a.zpdScore);
    };

    // Enrich all skill categories
    const [enrichedAlmostMastered, enrichedReadyToLearn, enrichedLocked, enrichedMastered] =
      await Promise.all([
        enrichSkillsWithML(almostMastered),
        enrichSkillsWithML(readyToLearn),
        enrichSkillsWithML(locked),
        enrichSkillsWithML(mastered),
      ]);

    // Determine current model being used
    const currentModel = getCurrentModelForUser(totalInteractions);
    const usingHybrid = shouldUseHybrid(totalInteractions);

    return NextResponse.json({
      success: true,
      data: {
        // Skills almost mastered (high priority - close to 95%)
        almostMastered: enrichedAlmostMastered,

        // Skills ready to learn (unlocked, not yet mastered)
        readyToLearn: enrichedReadyToLearn,

        // Skills that are locked (prerequisites not met)
        locked: enrichedLocked,

        // Already mastered skills
        mastered: enrichedMastered,

        // Summary counts
        counts: {
          almostMastered: almostMastered.length,
          readyToLearn: readyToLearn.length,
          locked: locked.length,
          mastered: mastered.length,
          total: Object.keys(AI_AT_WORK_SKILL_MAP.skills).length,
        },

        // Model information
        modelInfo: {
          currentModel,
          usingHybrid,
          interactionCount: totalInteractions,
          hybridThreshold: DEFAULT_COLD_START_CONFIG.coldStartThreshold,
          interactionsToHybrid: Math.max(0, DEFAULT_COLD_START_CONFIG.coldStartThreshold - totalInteractions),
        },
      },
    });
  } catch (error) {
    console.error('Error getting ready skills:', error);
    return NextResponse.json(
      {
        error: 'Failed to get ready skills',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
