/**
 * Intervention Hierarchy
 *
 * Implements the three-tier intervention model for Socratic coaching:
 * - Level 1: Leading questions (metacognitive)
 * - Level 2: Hints with context
 * - Level 3: Worked example (only after 2 failed attempts)
 *
 * Based on LearnLM research: 93.8% remediation with hierarchical tutoring
 * vs 64.5% for static hints.
 *
 * Part of Phase 12.2: Socratic Prompt Architecture
 */

import type { InterventionLevel, InterventionType } from './socraticPrompts';

// ============================================
// TYPES
// ============================================

export type { InterventionLevel, InterventionType };

export interface InterventionSelection {
  level: InterventionLevel;
  type: InterventionType;
  rationale: string;
}

export interface InterventionConfig {
  // Thresholds for level escalation
  level1MaxAttempts: number;       // Default: 2
  level2MaxAttempts: number;       // Default: 2

  // Mastery thresholds
  lowMasteryThreshold: number;     // Default: 0.3 - Skip to level 2 faster
  highMasteryThreshold: number;    // Default: 0.7 - Stay at level 1 longer

  // Difficulty adjustments
  highDifficultyThreshold: number; // Default: 4 - More lenient escalation

  // Time-based escalation (in seconds)
  maxTimeAtLevel: number;          // Default: 180 (3 minutes)
}

export interface InterventionState {
  currentLevel: InterventionLevel;
  level1Attempts: number;
  level2Attempts: number;
  level3Used: boolean;
  conceptId: string;
  questionId?: string;
  startTime: Date;
  lastInteractionTime: Date;
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

export const DEFAULT_INTERVENTION_CONFIG: InterventionConfig = {
  level1MaxAttempts: 2,
  level2MaxAttempts: 2,
  lowMasteryThreshold: 0.3,
  highMasteryThreshold: 0.7,
  highDifficultyThreshold: 4,
  maxTimeAtLevel: 180,
};

// ============================================
// CORE SELECTION FUNCTION
// ============================================

/**
 * Select the appropriate intervention based on learner state
 *
 * This is the main decision function that determines which level of
 * Socratic intervention to use based on:
 * - Number of attempts (with and without help)
 * - Prior mastery level (from BKT)
 * - Question difficulty
 *
 * @param attemptCount - Total attempts on this question
 * @param priorMastery - P(mastery) from BKT (0-1)
 * @param questionDifficulty - Difficulty rating (1-5)
 * @param config - Optional custom configuration
 * @returns InterventionSelection with level, type, and rationale
 */
export function selectIntervention(
  attemptCount: number,
  priorMastery: number,
  questionDifficulty: number,
  config: InterventionConfig = DEFAULT_INTERVENTION_CONFIG
): InterventionSelection {
  // Edge case: first attempt always gets level 1
  if (attemptCount <= 1) {
    return {
      level: 1,
      type: 'question',
      rationale: 'First attempt - start with metacognitive questioning',
    };
  }

  // Calculate effective attempt count based on mastery and difficulty
  const effectiveAttempts = calculateEffectiveAttempts(
    attemptCount,
    priorMastery,
    questionDifficulty,
    config
  );

  // Determine level based on effective attempts
  if (effectiveAttempts <= config.level1MaxAttempts) {
    return {
      level: 1,
      type: 'question',
      rationale: `Attempt ${attemptCount} - continuing with leading questions`,
    };
  }

  if (effectiveAttempts <= config.level1MaxAttempts + config.level2MaxAttempts) {
    return {
      level: 2,
      type: 'hint',
      rationale: `Attempt ${attemptCount} - escalating to contextual hints`,
    };
  }

  // Level 3: Worked example (last resort)
  return {
    level: 3,
    type: 'worked_example',
    rationale: `Attempt ${attemptCount} - providing worked example as last resort`,
  };
}

/**
 * Calculate effective attempts accounting for mastery and difficulty
 *
 * Low mastery students get to hints faster.
 * High difficulty questions get more patience.
 */
function calculateEffectiveAttempts(
  attemptCount: number,
  priorMastery: number,
  questionDifficulty: number,
  config: InterventionConfig
): number {
  let effectiveAttempts = attemptCount;

  // Low mastery: Escalate faster (add 0.5-1 to effective count)
  if (priorMastery < config.lowMasteryThreshold) {
    effectiveAttempts += 1;
  } else if (priorMastery < 0.5) {
    effectiveAttempts += 0.5;
  }

  // High mastery: Give more chances at level 1 (subtract 0.5-1)
  if (priorMastery > config.highMasteryThreshold) {
    effectiveAttempts -= 1;
  } else if (priorMastery > 0.6) {
    effectiveAttempts -= 0.5;
  }

  // High difficulty: More patience (subtract 0.5-1)
  if (questionDifficulty >= config.highDifficultyThreshold) {
    effectiveAttempts -= 1;
  } else if (questionDifficulty >= 3) {
    effectiveAttempts -= 0.5;
  }

  // Never go below 1
  return Math.max(1, effectiveAttempts);
}

// ============================================
// STATE MANAGEMENT
// ============================================

/**
 * Create initial intervention state for a new concept/question
 */
export function createInterventionState(
  conceptId: string,
  questionId?: string
): InterventionState {
  const now = new Date();
  return {
    currentLevel: 1,
    level1Attempts: 0,
    level2Attempts: 0,
    level3Used: false,
    conceptId,
    questionId,
    startTime: now,
    lastInteractionTime: now,
  };
}

/**
 * Update intervention state after an interaction
 */
export function updateInterventionState(
  state: InterventionState,
  selection: InterventionSelection
): InterventionState {
  const now = new Date();
  const newState = {
    ...state,
    currentLevel: selection.level,
    lastInteractionTime: now,
  };

  switch (selection.level) {
    case 1:
      newState.level1Attempts = state.level1Attempts + 1;
      break;
    case 2:
      newState.level2Attempts = state.level2Attempts + 1;
      break;
    case 3:
      newState.level3Used = true;
      break;
  }

  return newState;
}

/**
 * Reset intervention state (e.g., when moving to new question)
 */
export function resetInterventionState(
  state: InterventionState,
  newConceptId?: string,
  newQuestionId?: string
): InterventionState {
  return createInterventionState(
    newConceptId || state.conceptId,
    newQuestionId
  );
}

// ============================================
// ADVANCED SELECTION
// ============================================

/**
 * Select intervention with full state tracking
 *
 * More sophisticated version that uses state history
 * and time-based factors.
 */
export function selectInterventionWithState(
  state: InterventionState,
  priorMastery: number,
  questionDifficulty: number,
  config: InterventionConfig = DEFAULT_INTERVENTION_CONFIG
): { selection: InterventionSelection; newState: InterventionState } {
  const totalAttempts = state.level1Attempts + state.level2Attempts + (state.level3Used ? 1 : 0) + 1;

  // Check for time-based escalation
  const timeSinceStart = (new Date().getTime() - state.startTime.getTime()) / 1000;
  const timeBasedEscalation = Math.floor(timeSinceStart / config.maxTimeAtLevel);

  // Adjust attempt count based on time
  const adjustedAttempts = totalAttempts + timeBasedEscalation;

  // Get base selection
  const selection = selectIntervention(
    adjustedAttempts,
    priorMastery,
    questionDifficulty,
    config
  );

  // Override if we've already used level 3
  if (state.level3Used && selection.level === 3) {
    // After level 3, we should verify understanding
    return {
      selection: {
        level: 3,
        type: 'worked_example',
        rationale: 'Post-worked-example: verifying understanding',
      },
      newState: {
        ...state,
        lastInteractionTime: new Date(),
      },
    };
  }

  // Update state
  const newState = updateInterventionState(state, selection);

  return { selection, newState };
}

// ============================================
// SPECIAL CASES
// ============================================

/**
 * Determine if student should skip to a higher level
 *
 * Used in special cases like:
 * - Student explicitly asks for more help
 * - Student shows extreme frustration
 * - Student has been stuck for a long time
 */
export function shouldEscalateImmediately(
  currentLevel: InterventionLevel,
  studentMessage: string,
  timeSinceLastHelp: number
): { shouldEscalate: boolean; reason?: string } {
  const lowerMessage = studentMessage.toLowerCase();

  // Explicit escalation requests
  const escalationPhrases = [
    "just tell me",
    "give me the answer",
    "i give up",
    "show me how",
    "can you just",
    "please just tell",
    "i'm stuck",
    "this is impossible",
  ];

  for (const phrase of escalationPhrases) {
    if (lowerMessage.includes(phrase)) {
      return {
        shouldEscalate: currentLevel < 3,
        reason: `Student requested more direct help: "${phrase}"`,
      };
    }
  }

  // Time-based escalation (more than 5 minutes at same level)
  if (timeSinceLastHelp > 300) {
    return {
      shouldEscalate: currentLevel < 3,
      reason: 'Extended time without progress',
    };
  }

  return { shouldEscalate: false };
}

/**
 * Determine if student has demonstrated understanding
 *
 * Used to decide if we can de-escalate or move on
 */
export function hasShownUnderstanding(
  studentMessage: string,
  isCorrectAnswer: boolean
): { understood: boolean; confidence: 'high' | 'medium' | 'low' } {
  if (isCorrectAnswer) {
    // Check if they explained their reasoning
    const explanationIndicators = [
      'because',
      'since',
      'this means',
      'therefore',
      'so that',
      'which is why',
      'the reason',
    ];

    const hasExplanation = explanationIndicators.some(
      indicator => studentMessage.toLowerCase().includes(indicator)
    );

    return {
      understood: true,
      confidence: hasExplanation ? 'high' : 'medium',
    };
  }

  // Check for partial understanding
  const partialIndicators = [
    'i think i get it',
    'oh i see',
    'that makes sense',
    'now i understand',
  ];

  for (const indicator of partialIndicators) {
    if (studentMessage.toLowerCase().includes(indicator)) {
      return {
        understood: true,
        confidence: 'low',
      };
    }
  }

  return { understood: false, confidence: 'low' };
}

// ============================================
// ANALYTICS HELPERS
// ============================================

/**
 * Get summary of intervention session for logging
 */
export function getInterventionSummary(state: InterventionState): {
  conceptId: string;
  questionId?: string;
  totalAttempts: number;
  highestLevel: InterventionLevel;
  durationSeconds: number;
  level1Count: number;
  level2Count: number;
  usedWorkedExample: boolean;
} {
  const now = new Date();
  const durationSeconds = Math.round(
    (now.getTime() - state.startTime.getTime()) / 1000
  );

  return {
    conceptId: state.conceptId,
    questionId: state.questionId,
    totalAttempts: state.level1Attempts + state.level2Attempts + (state.level3Used ? 1 : 0),
    highestLevel: state.level3Used ? 3 : state.level2Attempts > 0 ? 2 : 1,
    durationSeconds,
    level1Count: state.level1Attempts,
    level2Count: state.level2Attempts,
    usedWorkedExample: state.level3Used,
  };
}

/**
 * Serialize intervention state for storage
 */
export function serializeState(state: InterventionState): string {
  return JSON.stringify({
    ...state,
    startTime: state.startTime.toISOString(),
    lastInteractionTime: state.lastInteractionTime.toISOString(),
  });
}

/**
 * Deserialize intervention state from storage
 */
export function deserializeState(json: string): InterventionState {
  const data = JSON.parse(json);
  return {
    ...data,
    startTime: new Date(data.startTime),
    lastInteractionTime: new Date(data.lastInteractionTime),
  };
}

// ============================================
// EXPORTS
// ============================================

const interventionHierarchyModule = {
  selectIntervention,
  selectInterventionWithState,
  createInterventionState,
  updateInterventionState,
  resetInterventionState,
  shouldEscalateImmediately,
  hasShownUnderstanding,
  getInterventionSummary,
  serializeState,
  deserializeState,
  DEFAULT_INTERVENTION_CONFIG,
};

export default interventionHierarchyModule;
