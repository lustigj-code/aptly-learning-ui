/**
 * Adaptive Session API
 *
 * Builds personalized learning sessions based on user state:
 * - Uses sequencer to prioritize items
 * - Builds session with warmup, learning, practice, cooldown
 * - Returns structured session for client rendering
 */

import { NextRequest, NextResponse } from 'next/server';
import { getNextItems, DEFAULT_SEQUENCER_CONFIG, type SequencerConfig } from '@/lib/adaptive/sequencer';
import { getSkillName } from '@/data/skillMap';

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
  };
  createdAt: Date;
}

interface SessionRequest {
  userId: string;
  availableMinutes: number;
  preferences: {
    learningPace: 'light' | 'moderate' | 'intensive';
    preferredFormat: 'video' | 'reading' | 'mixed';
    includeWarmup?: boolean;
    includeCooldown?: boolean;
  };
}

// ============================================
// SESSION BUILDER
// ============================================

async function buildSessionServer(
  userId: string,
  availableMinutes: number,
  preferences: SessionRequest['preferences']
): Promise<LearningSession> {
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
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
      const warmupItems = await getNextItems(userId, warmupConfig);
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
      const learningItems = await getNextItems(userId, learningConfig);
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
      const practiceItems = await getNextItems(userId, practiceConfig);
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

  // Interleave reviews into main content for better retention
  const interleavedItems = interleaveItems(items);

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

function interleaveItems(items: SessionItem[]): SessionItem[] {
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

// ============================================
// API HANDLER
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body: SessionRequest = await request.json();
    const { userId, availableMinutes, preferences } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const session = await buildSessionServer(
      userId,
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
