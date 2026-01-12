/**
 * Hierarchical Intervention Manager
 *
 * Tracks and enforces the three-tier Socratic intervention model:
 * - Tier 1: Metacognitive questions ("What made you think that?")
 * - Tier 2: Specific hints pointing to confusion area
 * - Tier 3: Worked examples (last resort, never direct answer)
 *
 * Based on LearnLM/Google DeepMind research showing 93.8% remediation
 * with hierarchical Socratic tutoring vs 64.5% for static hints.
 *
 * Part of Phase 12: Socratic RAG Coach
 */

// ============================================
// TYPES
// ============================================

export type InterventionTier = 1 | 2 | 3;

/**
 * Intervention state for a specific concept/question
 */
export type InterventionState = {
  currentTier: InterventionTier;
  tier1Attempts: number;       // Metacognitive questions asked
  tier2Attempts: number;       // Specific hints given
  tier3Used: boolean;          // Whether worked example was provided
  conceptId: string;           // The concept being worked on
  questionId?: string;         // Specific question if applicable
  startedAt: Date;
  lastInteractionAt: Date;
};

/**
 * Intervention directive for prompt injection
 */
export type InterventionDirective = {
  tier: InterventionTier;
  instruction: string;
  examples: string[];
  constraints: string[];
};

// ============================================
// TIER CONFIGURATION
// ============================================

const TIER_CONFIG = {
  1: {
    maxAttempts: 2,
    name: 'Metacognitive Questioning',
    purpose: 'Understand student reasoning',
  },
  2: {
    maxAttempts: 2,
    name: 'Specific Guidance',
    purpose: 'Point to area of confusion',
  },
  3: {
    maxAttempts: 1, // Only one worked example
    name: 'Worked Example',
    purpose: 'Demonstrate method without giving answer',
  },
};

// ============================================
// DIRECTIVE GENERATORS
// ============================================

/**
 * Get intervention directive based on current state
 *
 * Returns structured directive for prompt injection
 */
export function getInterventionDirective(state: InterventionState): InterventionDirective {
  if (state.tier3Used) {
    // Post-Tier 3: Verify understanding
    return {
      tier: 3,
      instruction: `You've already provided a worked example. Now verify the student understood by asking them to apply the same method to their original question. Do NOT give the answer.`,
      examples: [
        'Now that you\'ve seen how I approached that similar problem, can you try the same approach with yours?',
        'What step from that example do you think applies here?',
        'How would you start solving your question using the method I showed?',
      ],
      constraints: [
        'Do not solve their problem for them',
        'Guide them to apply the worked example',
        'Be patient and encouraging',
      ],
    };
  }

  switch (state.currentTier) {
    case 1:
      return getTier1Directive(state.tier1Attempts);
    case 2:
      return getTier2Directive(state.tier2Attempts);
    case 3:
      return getTier3Directive();
  }
}

/**
 * Tier 1: Metacognitive questioning
 */
function getTier1Directive(attempts: number): InterventionDirective {
  const isSecondAttempt = attempts >= 1;

  return {
    tier: 1,
    instruction: isSecondAttempt
      ? `Use TIER 1 (second attempt): The student hasn't clarified their reasoning yet. Ask a more specific metacognitive question.`
      : `Use TIER 1 intervention: Ask a metacognitive question to understand the student's current thinking.`,
    examples: [
      'What made you choose that answer?',
      'Can you explain your reasoning?',
      'What do you already know about this topic?',
      'Walk me through how you approached this.',
      'What part of the question stood out to you?',
      'Before we continue, what do you think is the key concept here?',
    ],
    constraints: [
      'Do NOT give any hints about the correct answer',
      'Do NOT point to where they went wrong yet',
      'Focus purely on understanding their thinking',
      'Keep it to one question only',
    ],
  };
}

/**
 * Tier 2: Specific guidance
 */
function getTier2Directive(attempts: number): InterventionDirective {
  const isSecondAttempt = attempts >= 1;

  return {
    tier: 2,
    instruction: isSecondAttempt
      ? `Use TIER 2 (second attempt): Your previous hint wasn't enough. Be more specific about the area of confusion.`
      : `Use TIER 2 intervention: Point to the specific area of confusion without giving the answer.`,
    examples: [
      'Look at what happens when X...',
      'Notice that the question asks about Y, not Z',
      'Consider the relationship between A and B',
      'Think about what would happen if...',
      'The key here is to focus on [specific element]',
      'Have you considered [specific aspect]?',
    ],
    constraints: [
      'Point to the area of confusion',
      'Do NOT give the answer',
      'Do NOT explain why they are wrong',
      'Guide them to discover the issue themselves',
      'Be specific but not revealing',
    ],
  };
}

/**
 * Tier 3: Worked example
 */
function getTier3Directive(): InterventionDirective {
  return {
    tier: 3,
    instruction: `Use TIER 3 intervention (LAST RESORT): Provide a worked example of a SIMILAR (but different) problem. Show the method, then ask them to apply it to their question. NEVER give the direct answer.`,
    examples: [
      'Let me show you a similar problem: [describe different but analogous problem]. Here\'s how I\'d approach it: [show method step by step]. Now, how would you apply this to your question?',
      'I\'ll work through a related example: [example]. Notice how [key insight]. Can you use this approach for yours?',
    ],
    constraints: [
      'MUST use a DIFFERENT but similar problem',
      'Show the method/approach, not the specific answer',
      'After the example, ask them to apply it',
      'Do NOT solve their original problem',
      'The worked example should illuminate the method',
    ],
  };
}

// ============================================
// STATE MANAGEMENT
// ============================================

/**
 * Create initial intervention state for a concept
 */
export function createInterventionState(
  conceptId: string,
  questionId?: string
): InterventionState {
  const now = new Date();
  return {
    currentTier: 1,
    tier1Attempts: 0,
    tier2Attempts: 0,
    tier3Used: false,
    conceptId,
    questionId,
    startedAt: now,
    lastInteractionAt: now,
  };
}

/**
 * Advance intervention tier based on student response
 *
 * Called when student is still struggling after an intervention
 */
export function advanceTier(state: InterventionState): InterventionState {
  const now = new Date();
  const newState = { ...state, lastInteractionAt: now };

  // If already at Tier 3 and used, mark as exhausted
  if (state.currentTier === 3) {
    return { ...newState, tier3Used: true };
  }

  // Check if should advance from Tier 1
  if (state.currentTier === 1) {
    if (state.tier1Attempts >= TIER_CONFIG[1].maxAttempts) {
      return { ...newState, currentTier: 2, tier2Attempts: 0 };
    }
    return { ...newState, tier1Attempts: state.tier1Attempts + 1 };
  }

  // Check if should advance from Tier 2
  if (state.currentTier === 2) {
    if (state.tier2Attempts >= TIER_CONFIG[2].maxAttempts) {
      return { ...newState, currentTier: 3 };
    }
    return { ...newState, tier2Attempts: state.tier2Attempts + 1 };
  }

  return newState;
}

/**
 * Reset intervention state (e.g., when student gets it right)
 */
export function resetInterventionState(state: InterventionState): InterventionState {
  return createInterventionState(state.conceptId, state.questionId);
}

/**
 * Check if student is still struggling
 *
 * Used to determine if tier should advance
 */
export function isStillStruggling(
  studentResponse: string,
  isCorrectAnswer: boolean
): boolean {
  if (isCorrectAnswer) return false;

  const lower = studentResponse.toLowerCase();

  // Signs of continued struggle
  const struggleIndicators = [
    "don't know",
    "don't understand",
    "confused",
    "help",
    "what",
    "still stuck",
    "not sure",
    "i give up",
    "the answer",
    "just tell me",
  ];

  for (const indicator of struggleIndicators) {
    if (lower.includes(indicator)) return true;
  }

  // If response is very short, might indicate struggle
  if (studentResponse.length < 20) return true;

  return false;
}

// ============================================
// STATE PERSISTENCE HELPERS
// ============================================

/**
 * Serialize state for storage
 */
export function serializeState(state: InterventionState): string {
  return JSON.stringify({
    ...state,
    startedAt: state.startedAt.toISOString(),
    lastInteractionAt: state.lastInteractionAt.toISOString(),
  });
}

/**
 * Deserialize state from storage
 */
export function deserializeState(json: string): InterventionState {
  const data = JSON.parse(json);
  return {
    ...data,
    startedAt: new Date(data.startedAt),
    lastInteractionAt: new Date(data.lastInteractionAt),
  };
}

/**
 * Get human-readable tier description
 */
export function getTierDescription(tier: InterventionTier): string {
  return TIER_CONFIG[tier].name;
}

/**
 * Get intervention summary for logging/analytics
 */
export function getInterventionSummary(state: InterventionState): {
  tier: number;
  tierName: string;
  totalAttempts: number;
  durationMinutes: number;
} {
  const now = new Date();
  const durationMs = now.getTime() - state.startedAt.getTime();

  return {
    tier: state.currentTier,
    tierName: TIER_CONFIG[state.currentTier].name,
    totalAttempts: state.tier1Attempts + state.tier2Attempts + (state.tier3Used ? 1 : 0),
    durationMinutes: Math.round(durationMs / 60000),
  };
}
