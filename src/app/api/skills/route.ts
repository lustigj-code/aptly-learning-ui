/**
 * Skills API Routes
 *
 * GET /api/skills - Get all skill states for current user
 * POST /api/skills - Update a skill state after quiz answer
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/apiAuth';
import {
  getAllSkillStates,
  updateSkillState,
  getOrCreateSkillState,
  getSkillMasterySummary,
} from '@/lib/services/skillService';
import { updateMastery, formatMasteryPercent } from '@/lib/mastery/bkt';
import { getSkillsForQuestion } from '@/data/qMatrix';
import { AI_AT_WORK_SKILL_MAP, getSkillName } from '@/data/skillMap';

// ============================================
// GET - Get all skill states
// ============================================

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const states = await getAllSkillStates(user.uid);
    const summary = await getSkillMasterySummary(user.uid);

    // Enrich states with skill names
    const enrichedStates = states.map((state) => ({
      ...state,
      name: getSkillName(state.skillId),
      skill: AI_AT_WORK_SKILL_MAP.skills[state.skillId] || null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        states: enrichedStates,
        summary,
      },
    });
  } catch (error) {
    console.error('Error getting skill states:', error);
    return NextResponse.json(
      {
        error: 'Failed to get skill states',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================
// POST - Update skill state after quiz answer
// ============================================

interface UpdateSkillRequest {
  questionId: string;
  correct: boolean;
  // Or directly specify skillIds
  skillIds?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: UpdateSkillRequest = await request.json();

    if (!body.questionId && !body.skillIds) {
      return NextResponse.json(
        { error: 'questionId or skillIds is required' },
        { status: 400 }
      );
    }

    if (typeof body.correct !== 'boolean') {
      return NextResponse.json(
        { error: 'correct (boolean) is required' },
        { status: 400 }
      );
    }

    // Get skills to update
    let skillIds: string[];
    if (body.skillIds && body.skillIds.length > 0) {
      skillIds = body.skillIds;
    } else {
      skillIds = getSkillsForQuestion(body.questionId);
    }

    if (skillIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No skills mapped to this question',
        updates: [],
      });
    }

    // Update each skill
    const updates: Array<{
      skillId: string;
      skillName: string;
      previousMastery: number;
      newMastery: number;
      previousMasteryPercent: string;
      newMasteryPercent: string;
      isMastered: boolean;
    }> = [];

    for (const skillId of skillIds) {
      // Get current state (or create initial)
      const currentState = await getOrCreateSkillState(user.uid, skillId);
      const previousMastery = currentState.pMastery;

      // Get skill params
      const skill = AI_AT_WORK_SKILL_MAP.skills[skillId];
      const params = skill?.bktParams;

      // Update mastery using BKT
      const newState = updateMastery(currentState, body.correct, params);

      // Save to Firestore
      await updateSkillState(user.uid, skillId, newState);

      updates.push({
        skillId,
        skillName: getSkillName(skillId),
        previousMastery,
        newMastery: newState.pMastery,
        previousMasteryPercent: formatMasteryPercent(previousMastery),
        newMasteryPercent: formatMasteryPercent(newState.pMastery),
        isMastered: newState.pMastery >= 0.95,
      });
    }

    return NextResponse.json({
      success: true,
      updates,
    });
  } catch (error) {
    console.error('Error updating skill state:', error);
    return NextResponse.json(
      {
        error: 'Failed to update skill state',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
