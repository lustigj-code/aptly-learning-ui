/**
 * Mastery Map API
 *
 * Returns skill map data with user progress for visualization
 *
 * Part of Phase 14: Mastery Map UX
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { getSkillMap } from '@/lib/skillmap/skillMapStorage';
import { AI_AT_WORK_SKILL_MAP } from '@/data/skillMap';
import { generateMasteryMapData } from '@/components/mastery/layoutUtils';
import type { SkillState } from '@/lib/mastery/bkt';
import type { ConceptMastery } from '@/lib/mastery/knowledgeGraph';

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
    let skillMapData = await getSkillMap(courseId);
    let skills: Record<string, any> = {};

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

    return NextResponse.json({
      success: true,
      data: mapData,
      stats: {
        totalSkills: mapData.nodes.length,
        mastered: mapData.nodes.filter(n => n.status === 'mastered').length,
        available: mapData.nodes.filter(n => n.status === 'available').length,
        locked: mapData.nodes.filter(n => n.status === 'locked').length,
        decaying: mapData.nodes.filter(n => n.status === 'decaying').length,
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
