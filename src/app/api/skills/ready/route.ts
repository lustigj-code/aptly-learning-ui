/**
 * Ready Skills API Route
 *
 * GET /api/skills/ready - Get skills user is ready to learn
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/apiAuth';
import {
  getReadyToLearnSkills,
  getMasteredSkills,
  getSkillStatesRecord,
} from '@/lib/services/skillService';
import { getSkillsByPriority } from '@/lib/mastery/bkt';
import { AI_AT_WORK_SKILL_MAP, getSkillName, getSkillsByModule } from '@/data/skillMap';

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

    // Get skills by priority (zone of proximal development)
    const { almostMastered, readyToLearn, locked } = getSkillsByPriority(
      AI_AT_WORK_SKILL_MAP,
      statesRecord
    );

    // Get mastered skills
    const mastered = await getMasteredSkills(user.uid);

    // Enrich with skill details
    const enrichSkills = (skillIds: string[]) =>
      skillIds.map((id) => ({
        id,
        name: getSkillName(id),
        skill: AI_AT_WORK_SKILL_MAP.skills[id],
        pMastery: statesRecord[id]?.pMastery ?? 0,
        attempts: statesRecord[id]?.attempts ?? 0,
      }));

    return NextResponse.json({
      success: true,
      data: {
        // Skills almost mastered (high priority - close to 95%)
        almostMastered: enrichSkills(almostMastered),

        // Skills ready to learn (unlocked, not yet mastered)
        readyToLearn: enrichSkills(readyToLearn),

        // Skills that are locked (prerequisites not met)
        locked: enrichSkills(locked),

        // Already mastered skills
        mastered: enrichSkills(mastered),

        // Summary counts
        counts: {
          almostMastered: almostMastered.length,
          readyToLearn: readyToLearn.length,
          locked: locked.length,
          mastered: mastered.length,
          total: Object.keys(AI_AT_WORK_SKILL_MAP.skills).length,
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
