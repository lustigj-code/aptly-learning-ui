/**
 * Adaptive Session API
 *
 * Builds personalized learning sessions based on user state:
 * - Uses sequencer to prioritize items
 * - Builds session with warmup, learning, practice, cooldown
 * - Returns structured session for client rendering
 */

import { NextRequest, NextResponse } from 'next/server';
import { getNextItems, type SequencerConfig, fetchLearnerState } from '@/lib/adaptive/sequencer';
import { getSkillName } from '@/data/skillMap';
import { getSkillMap } from '@/lib/skillmap/skillMapStorage';
import {
  getReviewItemsForInterleaving,
  interleaveItems as fsrsInterleaveItems,
  shouldApplyInterleaving,
  DEFAULT_INTERLEAVING_CONFIG,
  type InterleavedItem,
} from '@/lib/sequencing';

// ============================================
// TYPES
// ============================================

interface SessionItem {
  type: 'review' | 'learn' | 'practice' | 'quiz' | 'warmup' | 'cooldown';
  itemId: string;
  skillId: string;
  estimatedMinutes: number;
  reason: string;
  order: number;
  isReviewChallenge?: boolean; // Badge indicator for FSRS-injected reviews
  metadata?: {
    retrievability?: number;
    similarity?: number;
  };
}

interface LearningSession {
  id: string;
  items: SessionItem[];
  estimatedMinutes: number;
  skillsFocused: string[];
  structure: {
    warmupReviews: number;
    mainLearning: number;
    practiceItems: number;
    cooldownReview: number;
    interleavedReviews: number; // FSRS-injected review items (max 5)
  };
  createdAt: Date;
}

interface SessionRequest {
  userId: string;
  courseId?: string; // Course to build session for (defaults to 'ai-at-work')
  availableMinutes: number;
  preferences: {
    learningPace: 'light' | 'moderate' | 'intensive';
    preferredFormat: 'video' | 'reading' | 'mixed';
    includeWarmup?: boolean;
    includeCooldown?: boolean;
    // Interleaving preferences (Phase 13)
    interleavingEnabled?: boolean;
    interleavingIntensity?: 'light' | 'moderate' | 'heavy';
  };
}

// ============================================
// INTERLEAVING HELPERS
// ============================================

/**
 * Convert interleaving intensity to ratio
 * light = 20%, moderate = 30%, heavy = 50%
 */
function _getInterleavingRatioFromIntensity(
  intensity: 'light' | 'moderate' | 'heavy' = 'moderate'
): number {
  const ratioMap = {
    light: 0.2,      // 20% reviews
    moderate: 0.3,   // 30% reviews
    heavy: 0.5,      // 50% reviews
  };
  return ratioMap[intensity];
}

// ============================================
// SESSION BUILDER
// ============================================

async function buildSessionServer(
  userId: string,
  courseId: string,
  availableMinutes: number,
  preferences: SessionRequest['preferences']
): Promise<LearningSession> {
  // Use cryptographically secure ID generation
  const sessionId = `session-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const items: SessionItem[] = [];
  let remainingMinutes = availableMinutes;
  let order = 0;

  // Calculate time allocations based on pace
  const allocations = getTimeAllocations(availableMinutes, preferences.learningPace);

  // Phase 1: Warmup Reviews
  if (preferences.includeWarmup !== false && allocations.warmup > 0) {
    const warmupConfig: SequencerConfig = {
      maxItems: 2,
      sessionGoal: 'review',
      availableMinutes: allocations.warmup,
      userPreferences: {
        learningPace: preferences.learningPace,
        preferredFormat: preferences.preferredFormat,
      },
    };

    try {
      const warmupItems = await getNextItems(userId, courseId, warmupConfig);
      for (const item of warmupItems.slice(0, 2)) {
        if (remainingMinutes < item.estimatedMinutes) break;

        items.push({
          type: 'warmup',
          itemId: item.itemId,
          skillId: item.skillId,
          estimatedMinutes: item.estimatedMinutes,
          reason: `Warm-up: ${item.reason}`,
          order: order++,
        });
        remainingMinutes -= item.estimatedMinutes;
      }
    } catch (error) {
      console.warn('[Session API] Warmup fetch failed:', error);
    }
  }

  // Phase 2: Main Learning Block
  if (allocations.learning > 0 && remainingMinutes > 5) {
    const learningConfig: SequencerConfig = {
      maxItems: 3,
      sessionGoal: 'learn',
      availableMinutes: Math.min(remainingMinutes - 5, allocations.learning),
      userPreferences: {
        learningPace: preferences.learningPace,
        preferredFormat: preferences.preferredFormat,
      },
    };

    try {
      const learningItems = await getNextItems(userId, courseId, learningConfig);
      const newContentItems = learningItems.filter(i => i.type === 'new_content');

      for (const item of newContentItems.slice(0, 2)) {
        if (remainingMinutes < item.estimatedMinutes + 5) break;

        items.push({
          type: 'learn',
          itemId: item.itemId,
          skillId: item.skillId,
          estimatedMinutes: item.estimatedMinutes,
          reason: item.reason,
          order: order++,
        });
        remainingMinutes -= item.estimatedMinutes;
      }
    } catch (error) {
      console.warn('[Session API] Learning fetch failed:', error);
    }
  }

  // Phase 3: Interleaved Practice
  if (allocations.practice > 0 && remainingMinutes > 3) {
    const practiceConfig: SequencerConfig = {
      maxItems: 3,
      sessionGoal: 'mixed',
      availableMinutes: Math.min(remainingMinutes - 3, allocations.practice),
      userPreferences: {
        learningPace: preferences.learningPace,
        preferredFormat: preferences.preferredFormat,
      },
    };

    try {
      const practiceItems = await getNextItems(userId, courseId, practiceConfig);
      const practices = practiceItems.filter(
        i => i.type === 'practice' || i.priority === 2 || i.priority === 3
      );

      for (const item of practices.slice(0, 2)) {
        if (remainingMinutes < item.estimatedMinutes + 3) break;

        items.push({
          type: 'practice',
          itemId: item.itemId,
          skillId: item.skillId,
          estimatedMinutes: item.estimatedMinutes,
          reason: item.reason,
          order: order++,
        });
        remainingMinutes -= item.estimatedMinutes;
      }
    } catch (error) {
      console.warn('[Session API] Practice fetch failed:', error);
    }
  }

  // Phase 4: Cooldown Review
  if (preferences.includeCooldown !== false && remainingMinutes >= 3) {
    const learnedSkills = items.filter(i => i.type === 'learn').map(i => i.skillId);

    if (learnedSkills.length > 0) {
      items.push({
        type: 'cooldown',
        itemId: `cooldown-${learnedSkills[0]}`,
        skillId: learnedSkills[0],
        estimatedMinutes: 3,
        reason: `Quick recap: "${getSkillName(learnedSkills[0])}"`,
        order: order++,
      });
      remainingMinutes -= 3;
    }
  }

  // Interleave reviews into main content using FSRS-based algorithm (Phase 13)
  // Pass user's interleaving preferences
  const interleavedItems = await interleaveItemsWithFSRS(items, userId, courseId, {
    interleavingEnabled: preferences.interleavingEnabled,
    interleavingIntensity: preferences.interleavingIntensity,
  });

  // Build session summary
  const skillsFocused = [...new Set(interleavedItems.map(i => i.skillId))];

  return {
    id: sessionId,
    items: interleavedItems,
    estimatedMinutes: availableMinutes - remainingMinutes,
    skillsFocused,
    structure: {
      warmupReviews: interleavedItems.filter(i => i.type === 'warmup').length,
      mainLearning: interleavedItems.filter(i => i.type === 'learn').length,
      practiceItems: interleavedItems.filter(i => i.type === 'practice').length,
      cooldownReview: interleavedItems.filter(i => i.type === 'cooldown').length,
      interleavedReviews: interleavedItems.filter(i => i.isReviewChallenge).length,
    },
    createdAt: new Date(),
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getTimeAllocations(
  totalMinutes: number,
  pace: 'light' | 'moderate' | 'intensive'
): { warmup: number; learning: number; practice: number; cooldown: number } {
  const allocations = {
    light: { warmup: 0.1, learning: 0.5, practice: 0.3, cooldown: 0.1 },
    moderate: { warmup: 0.15, learning: 0.45, practice: 0.3, cooldown: 0.1 },
    intensive: { warmup: 0.1, learning: 0.35, practice: 0.45, cooldown: 0.1 },
  };

  const paceConfig = allocations[pace];

  return {
    warmup: Math.floor(totalMinutes * paceConfig.warmup),
    learning: Math.floor(totalMinutes * paceConfig.learning),
    practice: Math.floor(totalMinutes * paceConfig.practice),
    cooldown: Math.floor(totalMinutes * paceConfig.cooldown),
  };
}

function interleaveItemsSimple(items: SessionItem[]): SessionItem[] {
  const warmups = items.filter(i => i.type === 'warmup');
  const learns = items.filter(i => i.type === 'learn');
  const practices = items.filter(i => i.type === 'practice');
  const cooldowns = items.filter(i => i.type === 'cooldown');

  const result: SessionItem[] = [];
  let order = 0;

  // Start with warmups
  for (const item of warmups) {
    result.push({ ...item, order: order++ });
  }

  // Interleave learning and practice
  const maxLen = Math.max(learns.length, practices.length);
  for (let i = 0; i < maxLen; i++) {
    if (learns[i]) {
      result.push({ ...learns[i], order: order++ });
    }
    if (practices[i]) {
      result.push({ ...practices[i], order: order++ });
    }
  }

  // End with cooldown
  for (const item of cooldowns) {
    result.push({ ...item, order: order++ });
  }

  return result;
}

/**
 * Advanced FSRS-based interleaving (Phase 13)
 *
 * Injects review items when Retrievability < 90%
 * Uses semantic similarity to select relevant reviews
 * Respects user's interleaving preferences (enabled/intensity)
 */
async function interleaveItemsWithFSRS(
  items: SessionItem[],
  userId: string,
  courseId: string,
  interleavingPrefs?: {
    interleavingEnabled?: boolean;
    interleavingIntensity?: 'light' | 'moderate' | 'heavy';
  }
): Promise<SessionItem[]> {
  try {
    // Check if interleaving is disabled by user preference (default: enabled)
    const interleavingEnabled = interleavingPrefs?.interleavingEnabled ?? true;
    if (!interleavingEnabled) {
      return interleaveItemsSimple(items);
    }

    // Get user's mastery data
    const learnerState = await fetchLearnerState(userId);

    // Check if interleaving should be applied based on FSRS state
    if (!shouldApplyInterleaving(learnerState.fsrsStates, DEFAULT_INTERLEAVING_CONFIG)) {
      return interleaveItemsSimple(items);
    }

    // Get skill map for the course
    const skillMap = await getSkillMap(courseId);
    if (!skillMap || !skillMap.skills) {
      return interleaveItemsSimple(items);
    }

    // Find current skill being learned
    const currentSkillId = items.find(i => i.type === 'learn')?.skillId || '';

    // Calculate max review items based on intensity
    // light = 3 max, moderate = 5 max, heavy = 7 max
    const maxReviewItemsMap = {
      light: 3,
      moderate: 5,
      heavy: 7,
    };
    const maxReviewItems = maxReviewItemsMap[interleavingPrefs?.interleavingIntensity ?? 'moderate'];

    const customConfig: typeof DEFAULT_INTERLEAVING_CONFIG = {
      ...DEFAULT_INTERLEAVING_CONFIG,
      maxReviewItems,
      // Adjust min ratio based on intensity
      minNewToReviewRatio: interleavingPrefs?.interleavingIntensity === 'heavy' ? 1 : 2,
    };

    // Get FSRS-based review items
    const reviewItems = getReviewItemsForInterleaving(
      learnerState.fsrsStates,
      currentSkillId,
      { skills: skillMap.skills },
      customConfig
    );

    if (reviewItems.length === 0) {
      return interleaveItemsSimple(items);
    }

    // Convert session items to InterleavedItem format
    const newItems: InterleavedItem[] = items.map(item => ({
      type: 'new' as const,
      itemId: item.itemId,
      skillId: item.skillId,
      reason: item.reason,
      estimatedMinutes: item.estimatedMinutes,
      isReviewChallenge: false,
    }));

    // Use FSRS interleaving algorithm with custom config
    const interleaved = fsrsInterleaveItems(newItems, reviewItems, customConfig);

    // Convert back to SessionItem format
    return interleaved.map((item, index) => {
      // Find original item type
      const originalItem = items.find(i => i.itemId === item.itemId);
      const itemType = item.type === 'review'
        ? 'review'
        : originalItem?.type || 'practice';

      return {
        type: itemType,
        itemId: item.itemId,
        skillId: item.skillId,
        estimatedMinutes: item.estimatedMinutes,
        reason: item.reason,
        order: index,
        isReviewChallenge: item.isReviewChallenge,
        metadata: item.metadata,
      };
    });
  } catch (error) {
    console.warn('[Session API] FSRS interleaving failed, using simple interleaving:', error);
    return interleaveItemsSimple(items);
  }
}

// ============================================
// API HANDLER
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body: SessionRequest = await request.json();
    const { userId, courseId, availableMinutes, preferences } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const session = await buildSessionServer(
      userId,
      courseId || 'ai-at-work',
      availableMinutes || 30,
      preferences || {
        learningPace: 'moderate',
        preferredFormat: 'mixed',
        includeWarmup: true,
        includeCooldown: true,
      }
    );

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (error) {
    console.error('[Session API] Error building session:', error);
    return NextResponse.json(
      { error: 'Failed to build session' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');
  const courseId = searchParams.get('courseId');
  const minutes = searchParams.get('minutes');

  if (!userId) {
    return NextResponse.json(
      { error: 'userId query param required' },
      { status: 400 }
    );
  }

  try {
    const session = await buildSessionServer(
      userId,
      courseId || 'ai-at-work',
      parseInt(minutes || '30', 10),
      {
        learningPace: 'moderate',
        preferredFormat: 'mixed',
        includeWarmup: true,
        includeCooldown: true,
      }
    );

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (error) {
    console.error('[Session API] Error building session:', error);
    return NextResponse.json(
      { error: 'Failed to build session' },
      { status: 500 }
    );
  }
}
