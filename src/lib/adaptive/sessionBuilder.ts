/**
 * Session Builder - Creates Optimized Learning Sessions
 *
 * Builds personalized learning sessions that:
 * - Start with quick reviews (warm up retrieval)
 * - Include main learning block (new content)
 * - Interleave practice throughout
 * - End with review of what was just learned
 *
 * Note: Full sequencing requires server-side access. On client, uses API endpoint.
 */

import { getSkillName } from '@/data/skillMap';

// Dynamic import for server-only sequencer
// This prevents the adminDb import from breaking client-side builds
const isServer = typeof window === 'undefined';

// Define types locally to avoid importing from sequencer (which has server dependencies)
interface NextItemRecommendation {
  type: 'new_content' | 'review' | 'remediation' | 'practice';
  itemId: string;
  skillId: string;
  reason: string;
  priority: number;
  estimatedMinutes: number;
  metadata?: {
    pMastery?: number;
    predictedRetention?: number;
    overdueBy?: number;
    attemptsToMastery?: number;
  };
}

interface SequencerConfig {
  maxItems: number;
  sessionGoal: 'learn' | 'review' | 'mixed';
  availableMinutes?: number;
  userPreferences: {
    learningPace: 'light' | 'moderate' | 'intensive';
    preferredFormat: 'video' | 'reading' | 'mixed';
  };
}

// ============================================
// TYPES
// ============================================

export interface SessionItem {
  type: 'review' | 'learn' | 'practice' | 'quiz' | 'warmup' | 'cooldown';
  itemId: string;
  skillId: string;
  estimatedMinutes: number;
  reason: string;
  order: number;
}

export interface LearningSession {
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

export interface SessionConfig {
  availableMinutes: number;
  preferences: {
    learningPace: 'light' | 'moderate' | 'intensive';
    preferredFormat: 'video' | 'reading' | 'mixed';
    includeWarmup: boolean;
    includeCooldown: boolean;
  };
  sessionGoal: 'learn' | 'review' | 'mixed';
}

// ============================================
// DEFAULT CONFIG
// ============================================

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  availableMinutes: 30,
  preferences: {
    learningPace: 'moderate',
    preferredFormat: 'mixed',
    includeWarmup: true,
    includeCooldown: true,
  },
  sessionGoal: 'mixed',
};

// ============================================
// MAIN SESSION BUILDER
// ============================================

/**
 * Build optimized learning session
 *
 * Uses API endpoint when available, falls back to mock session.
 * Full server-side sequencing is available via /api/adaptive/session endpoint.
 */
export async function buildSession(
  userId: string,
  courseId: string = 'ai-at-work',
  availableMinutes: number = 30,
  preferences: SessionConfig['preferences'] = DEFAULT_SESSION_CONFIG.preferences
): Promise<LearningSession> {
  // Try API endpoint first, fall back to mock session
  return buildSessionViaAPI(userId, courseId, availableMinutes, preferences);
}

/**
 * Client-side session building via API
 */
async function buildSessionViaAPI(
  userId: string,
  courseId: string,
  availableMinutes: number,
  preferences: SessionConfig['preferences']
): Promise<LearningSession> {
  try {
    const response = await fetch('/api/adaptive/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, courseId, availableMinutes, preferences }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.session) {
        // Convert date strings back to Date objects
        return {
          ...data.session,
          createdAt: new Date(data.session.createdAt),
        };
      }
    }
  } catch (error) {
    console.error('[SessionBuilder] API error, using mock session:', error);
  }

  // Fallback to mock session if API fails
  return createMockSession(userId, availableMinutes, preferences);
}

/**
 * Create a mock session for development/fallback
 */
function createMockSession(
  userId: string,
  availableMinutes: number,
  preferences: SessionConfig['preferences']
): LearningSession {
  const sessionId = generateSessionId();

  // Create simple mock items based on available time
  const items: SessionItem[] = [
    {
      type: 'warmup',
      itemId: 'warmup-genai-definition',
      skillId: 'genai-definition',
      estimatedMinutes: 3,
      reason: 'Quick review to warm up your memory',
      order: 0,
    },
    {
      type: 'learn',
      itemId: 'lesson-1.1',
      skillId: 'prompt-components',
      estimatedMinutes: 10,
      reason: 'Continue learning prompt engineering',
      order: 1,
    },
    {
      type: 'practice',
      itemId: 'practice-prompt-components',
      skillId: 'prompt-components',
      estimatedMinutes: 5,
      reason: 'Practice what you just learned',
      order: 2,
    },
  ];

  return {
    id: sessionId,
    items,
    estimatedMinutes: items.reduce((sum, i) => sum + i.estimatedMinutes, 0),
    skillsFocused: [...new Set(items.map(i => i.skillId))],
    structure: {
      warmupReviews: items.filter(i => i.type === 'warmup').length,
      mainLearning: items.filter(i => i.type === 'learn').length,
      practiceItems: items.filter(i => i.type === 'practice').length,
      cooldownReview: items.filter(i => i.type === 'cooldown').length,
    },
    createdAt: new Date(),
  };
}

/**
 * Server-side session building with full sequencer
 * Note: Only called on server, but we use runtime-only import to be safe
 */
async function buildSessionDirect(
  userId: string,
  courseId: string,
  availableMinutes: number,
  preferences: SessionConfig['preferences']
): Promise<LearningSession> {
  // Use runtime-only dynamic import pattern that webpack won't analyze
  // This prevents the sequencer (with adminDb) from being bundled in client code
  const sequencerPath = './sequencer';
  const sequencerModule = await (Function('return import("' + sequencerPath + '")')()) as typeof import('./sequencer');
  const { getNextItems } = sequencerModule;

  const sessionId = generateSessionId();
  const items: SessionItem[] = [];
  let remainingMinutes = availableMinutes;
  let order = 0;

  // Calculate time allocations based on pace
  const allocations = getTimeAllocations(availableMinutes, preferences.learningPace);

  // Phase 1: Warmup Reviews (1-2 quick reviews)
  if (preferences.includeWarmup && allocations.warmup > 0) {
    const warmupConfig: SequencerConfig = {
      maxItems: 2,
      sessionGoal: 'review',
      availableMinutes: allocations.warmup,
      userPreferences: preferences,
    };

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
  }

  // Phase 2: Main Learning Block (new content)
  if (allocations.learning > 0 && remainingMinutes > 5) {
    const learningConfig: SequencerConfig = {
      maxItems: 3,
      sessionGoal: 'learn',
      availableMinutes: Math.min(remainingMinutes - 5, allocations.learning),
      userPreferences: preferences,
    };

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
  }

  // Phase 3: Interleaved Practice
  if (allocations.practice > 0 && remainingMinutes > 3) {
    const practiceConfig: SequencerConfig = {
      maxItems: 3,
      sessionGoal: 'mixed',
      availableMinutes: Math.min(remainingMinutes - 3, allocations.practice),
      userPreferences: preferences,
    };

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
  }

  // Phase 4: Cooldown Review (review of what was learned)
  if (preferences.includeCooldown && remainingMinutes >= 3) {
    const learnedSkills = items.filter(i => i.type === 'learn').map(i => i.skillId);

    if (learnedSkills.length > 0) {
      // Quick review of what was just learned
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
  const interleavedItems = interleaveReviews(items);

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

/**
 * Calculate time allocations based on learning pace
 */
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

/**
 * Interleave reviews into new learning content for better retention
 * Uses research-backed interleaving pattern
 */
export function interleaveReviews(items: SessionItem[]): SessionItem[] {
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
  // Pattern: Learn -> Practice -> Learn -> Practice
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
 * Generate unique session ID
 */
function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get session summary text for UI display
 */
export function getSessionSummary(session: LearningSession): string {
  const parts: string[] = [];

  if (session.structure.warmupReviews > 0) {
    parts.push(`${session.structure.warmupReviews} review${session.structure.warmupReviews > 1 ? 's' : ''}`);
  }
  if (session.structure.mainLearning > 0) {
    parts.push(`${session.structure.mainLearning} new lesson${session.structure.mainLearning > 1 ? 's' : ''}`);
  }
  if (session.structure.practiceItems > 0) {
    parts.push(`${session.structure.practiceItems} practice${session.structure.practiceItems > 1 ? 's' : ''}`);
  }

  return `Today: ${parts.join(' + ')} (~${session.estimatedMinutes} min)`;
}

/**
 * Check if a session has expired or needs refresh
 */
export function isSessionStale(session: LearningSession, maxAgeMinutes: number = 60): boolean {
  const ageMs = Date.now() - session.createdAt.getTime();
  const ageMinutes = ageMs / (1000 * 60);
  return ageMinutes > maxAgeMinutes;
}

// ============================================
// EXPORTS
// ============================================

export type { NextItemRecommendation };
