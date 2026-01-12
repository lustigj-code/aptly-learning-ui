/**
 * Socratic Coach Service
 *
 * Integrates all Socratic tutoring components:
 * - Socratic prompts (never direct answers at Level 1-2)
 * - Intervention hierarchy (question -> hint -> worked example)
 * - LearnLM-style scaffolding and metacognition
 * - BKT mastery state for personalization
 * - Experiment-aware (useSocraticMode flag)
 *
 * Part of Phase 12.2: Socratic Prompt Architecture
 */

import {
  buildSocraticPrompt,
  addEmotionalAdaptation,
  SOCRATIC_TEMPLATES,
  type SocraticPromptContext,
  type InterventionLevel,
  type InterventionType,
} from './socraticPrompts';

import {
  selectInterventionWithState,
  createInterventionState,
  updateInterventionState,
  shouldEscalateImmediately,
  hasShownUnderstanding,
  getInterventionSummary,
  serializeState,
  deserializeState,
  type InterventionState,
  type InterventionSelection,
  type InterventionConfig,
} from './interventionHierarchy';

import {
  buildMetacognitiveSection,
  buildTransferSection,
  detectStruggle,
  buildStruggleResponseSection,
  getLearnLMGenerationConfig,
  type StruggleIndicators,
} from './learnLMPrompts';

import type { SkillState, BKTParameters } from '@/lib/mastery/bkt';

// ============================================
// TYPES
// ============================================

export interface SocraticResponse {
  message: string;
  interventionLevel: InterventionLevel;
  interventionType: InterventionType;
  followUpQuestions: string[];
  relatedConcepts: string[];
  confidence?: number;
  reasoning?: string;
}

export interface SocraticCoachContext {
  // Student info
  userId: string;
  userName: string;

  // Current learning context
  conceptId: string;
  conceptName: string;
  questionId?: string;
  questionText?: string;
  questionDifficulty: number; // 1-5

  // Student's response
  studentMessage: string;
  studentAnswer?: string;
  correctAnswer?: string;
  isCorrect?: boolean;

  // Attempt tracking
  attemptCount: number;
  consecutiveWrong: number;

  // Mastery state (from BKT)
  skillState?: SkillState;
  priorMastery: number; // 0-1

  // Conversation context
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  interactionCount: number;
  responseTimeSeconds?: number;

  // Related concepts for transfer
  relatedConcepts?: string[];
  prerequisitesCovered?: string[];

  // Experiment variant
  useSocraticMode: boolean;
}

export interface SocraticCoachResult {
  response: SocraticResponse;
  systemPrompt: string;
  interventionState: InterventionState;
  struggleIndicators: StruggleIndicators;
  generationConfig: {
    temperature: number;
    maxOutputTokens: number;
    topP: number;
  };
  logEntry: SocraticLogEntry;
}

export interface SocraticLogEntry {
  timestamp: Date;
  userId: string;
  conceptId: string;
  questionId?: string;
  interventionLevel: InterventionLevel;
  interventionType: InterventionType;
  attemptCount: number;
  priorMastery: number;
  struggleSeverity: string;
  usedWorkedExample: boolean;
}

// ============================================
// STATE CACHE
// ============================================

// In-memory cache for intervention states
// In production, this should be persisted to Firestore
const interventionStateCache = new Map<string, InterventionState>();

/**
 * Get or create intervention state for a user/concept pair
 */
function getOrCreateState(userId: string, conceptId: string, questionId?: string): InterventionState {
  const key = `${userId}_${conceptId}_${questionId || 'general'}`;

  if (!interventionStateCache.has(key)) {
    interventionStateCache.set(key, createInterventionState(conceptId, questionId));
  }

  return interventionStateCache.get(key)!;
}

/**
 * Save intervention state to cache
 */
function saveState(userId: string, conceptId: string, state: InterventionState, questionId?: string): void {
  const key = `${userId}_${conceptId}_${questionId || 'general'}`;
  interventionStateCache.set(key, state);
}

/**
 * Clear intervention state (e.g., when moving to new question)
 */
export function clearInterventionState(userId: string, conceptId: string, questionId?: string): void {
  const key = `${userId}_${conceptId}_${questionId || 'general'}`;
  interventionStateCache.delete(key);
}

// ============================================
// MAIN SERVICE FUNCTION
// ============================================

/**
 * Generate a Socratic coaching response
 *
 * This is the main entry point for the Socratic coaching system.
 * It orchestrates all the components to generate an appropriate response.
 */
export async function generateSocraticResponse(
  context: SocraticCoachContext,
  config?: InterventionConfig
): Promise<SocraticCoachResult> {
  // Get or create intervention state
  let state = getOrCreateState(context.userId, context.conceptId, context.questionId);

  // Detect struggle indicators
  const struggle = detectStruggle(
    context.studentMessage,
    context.consecutiveWrong,
    context.responseTimeSeconds || 30,
    context.interactionCount
  );

  // Check for immediate escalation
  const timeSinceLastHelp = state.lastInteractionTime
    ? (Date.now() - state.lastInteractionTime.getTime()) / 1000
    : 0;

  const immediateEscalation = shouldEscalateImmediately(
    state.currentLevel,
    context.studentMessage,
    timeSinceLastHelp
  );

  // Check if student has shown understanding
  const understanding = hasShownUnderstanding(
    context.studentMessage,
    context.isCorrect || false
  );

  // Determine intervention level
  let selection: InterventionSelection;

  if (understanding.understood && understanding.confidence !== 'low') {
    // Student understands - minimal intervention
    selection = {
      level: 1,
      type: 'question',
      rationale: 'Student demonstrated understanding - verification mode',
    };
    // Reset state for this concept
    state = createInterventionState(context.conceptId, context.questionId);
  } else if (immediateEscalation.shouldEscalate) {
    // Force escalation
    const nextLevel = Math.min(3, state.currentLevel + 1) as InterventionLevel;
    selection = {
      level: nextLevel,
      type: nextLevel === 3 ? 'worked_example' : nextLevel === 2 ? 'hint' : 'question',
      rationale: immediateEscalation.reason || 'Immediate escalation triggered',
    };
    state = updateInterventionState(state, selection);
  } else {
    // Normal selection based on attempts and mastery
    const result = selectInterventionWithState(
      state,
      context.priorMastery,
      context.questionDifficulty,
      config
    );
    selection = result.selection;
    state = result.newState;
  }

  // Build the complete system prompt
  const systemPrompt = buildCompleteSystemPrompt(context, selection, struggle, state);

  // Generate follow-up questions based on level
  const followUpQuestions = generateFollowUpQuestions(
    selection.level,
    context.conceptName,
    context.relatedConcepts || []
  );

  // Get generation config
  const scaffoldLevel = calculateScaffoldLevelFromMastery(context.priorMastery);
  const generationConfig = getLearnLMGenerationConfig(scaffoldLevel, struggle.severity);

  // Save updated state
  saveState(context.userId, context.conceptId, state, context.questionId);

  // Build response
  const response: SocraticResponse = {
    message: '', // Will be filled by AI generation
    interventionLevel: selection.level,
    interventionType: selection.type,
    followUpQuestions,
    relatedConcepts: context.relatedConcepts || [],
  };

  // Create log entry
  const logEntry: SocraticLogEntry = {
    timestamp: new Date(),
    userId: context.userId,
    conceptId: context.conceptId,
    questionId: context.questionId,
    interventionLevel: selection.level,
    interventionType: selection.type,
    attemptCount: context.attemptCount,
    priorMastery: context.priorMastery,
    struggleSeverity: struggle.severity,
    usedWorkedExample: selection.level === 3,
  };

  return {
    response,
    systemPrompt,
    interventionState: state,
    struggleIndicators: struggle,
    generationConfig,
    logEntry,
  };
}

// ============================================
// PROMPT BUILDING
// ============================================

/**
 * Build the complete system prompt combining all components
 */
function buildCompleteSystemPrompt(
  context: SocraticCoachContext,
  selection: InterventionSelection,
  struggle: StruggleIndicators,
  state: InterventionState
): string {
  // Build base Socratic prompt
  const socraticContext: SocraticPromptContext = {
    studentName: context.userName,
    conceptName: context.conceptName,
    questionText: context.questionText,
    studentAnswer: context.studentAnswer,
    correctAnswer: context.correctAnswer,
    priorMastery: context.priorMastery,
    attemptCount: context.attemptCount,
    consecutiveWrong: context.consecutiveWrong,
    questionDifficulty: context.questionDifficulty,
  };

  const { systemPrompt: basePrompt } = buildSocraticPrompt(socraticContext, selection.level);

  // Add emotional adaptation if needed
  const emotionalState = detectEmotionalStateFromMessage(context.studentMessage);
  const emotionalPrompt = addEmotionalAdaptation(basePrompt, emotionalState);

  // Add struggle response section
  const struggleSection = buildStruggleResponseSection(struggle);

  // Add metacognitive section if appropriate
  const metacognitiveSection = buildMetacognitiveSection(context.interactionCount);

  // Add transfer section if student has good mastery
  const transferSection = buildTransferSection(
    context.conceptName,
    context.relatedConcepts || [],
    context.priorMastery
  );

  // Add intervention state info
  const stateInfo = `
# INTERVENTION STATE
- Current level: ${selection.level} (${selection.type})
- Level 1 attempts: ${state.level1Attempts}
- Level 2 attempts: ${state.level2Attempts}
- Worked example used: ${state.level3Used ? 'Yes' : 'No'}
- Rationale: ${selection.rationale}`;

  // Combine all sections
  return `${emotionalPrompt}
${struggleSection}
${metacognitiveSection}
${transferSection}
${stateInfo}`;
}

/**
 * Detect emotional state from message content
 */
function detectEmotionalStateFromMessage(
  message: string
): 'frustrated' | 'confused' | 'engaged' | 'neutral' {
  const lower = message.toLowerCase();

  // Frustration indicators
  if (
    lower.includes("don't understand") ||
    lower.includes("doesn't make sense") ||
    lower.includes('frustrated') ||
    lower.includes('give up') ||
    lower.includes('too hard') ||
    lower.includes('impossible') ||
    lower.includes('hate this')
  ) {
    return 'frustrated';
  }

  // Confusion indicators
  if (
    lower.includes('what do you mean') ||
    lower.includes("don't get") ||
    lower.includes('help me') ||
    lower.includes('unclear') ||
    lower.includes('not sure') ||
    lower.includes('confused')
  ) {
    return 'confused';
  }

  // Engagement indicators
  if (
    lower.includes('interesting') ||
    lower.includes('tell me more') ||
    lower.includes('why') ||
    lower.includes('how does') ||
    lower.includes('makes sense') ||
    lower.includes('got it') ||
    lower.includes('i see')
  ) {
    return 'engaged';
  }

  return 'neutral';
}

/**
 * Generate follow-up questions based on intervention level
 */
function generateFollowUpQuestions(
  level: InterventionLevel,
  conceptName: string,
  relatedConcepts: string[]
): string[] {
  const questions: string[] = [];

  switch (level) {
    case 1:
      questions.push(
        SOCRATIC_TEMPLATES.level1.understandReasoning,
        SOCRATIC_TEMPLATES.level1.priorKnowledge.replace('[concept]', conceptName),
        SOCRATIC_TEMPLATES.level1.breakDown
      );
      break;

    case 2:
      questions.push(
        SOCRATIC_TEMPLATES.level2.focus.replace('[specific element]', conceptName),
        SOCRATIC_TEMPLATES.level2.reread.replace('[specific part]', 'the key relationship'),
        SOCRATIC_TEMPLATES.level2.eliminate.replace('[principle]', 'what we know so far')
      );
      break;

    case 3:
      questions.push(
        SOCRATIC_TEMPLATES.level3.apply,
        SOCRATIC_TEMPLATES.level3.transfer
      );
      break;
  }

  // Add transfer questions if related concepts exist
  if (relatedConcepts.length > 0 && level <= 2) {
    questions.push(
      `How does this connect to ${relatedConcepts[0]}?`
    );
  }

  return questions;
}

/**
 * Calculate scaffold level from mastery
 */
function calculateScaffoldLevelFromMastery(mastery: number): number {
  if (mastery < 0.2) return 1;
  if (mastery < 0.4) return 2;
  if (mastery < 0.6) return 3;
  if (mastery < 0.8) return 4;
  return 5;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get current intervention state for logging/debugging
 */
export function getInterventionStateInfo(
  userId: string,
  conceptId: string,
  questionId?: string
): { state: InterventionState | null; summary: ReturnType<typeof getInterventionSummary> | null } {
  const key = `${userId}_${conceptId}_${questionId || 'general'}`;
  const state = interventionStateCache.get(key);

  if (!state) {
    return { state: null, summary: null };
  }

  return {
    state,
    summary: getInterventionSummary(state),
  };
}

/**
 * Serialize all intervention states for persistence
 */
export function serializeAllStates(): Record<string, string> {
  const serialized: Record<string, string> = {};

  interventionStateCache.forEach((state, key) => {
    serialized[key] = serializeState(state);
  });

  return serialized;
}

/**
 * Restore intervention states from persistence
 */
export function restoreStates(serialized: Record<string, string>): void {
  Object.entries(serialized).forEach(([key, value]) => {
    try {
      const state = deserializeState(value);
      interventionStateCache.set(key, state);
    } catch (error) {
      console.warn(`Failed to deserialize state for ${key}:`, error);
    }
  });
}

/**
 * Get BKT-based context for Socratic coaching
 */
export function getBKTContext(
  skillState: SkillState | undefined,
  _bktParams?: BKTParameters
): { priorMastery: number; masteryLevel: string } {
  if (!skillState) {
    return { priorMastery: 0.1, masteryLevel: 'novice' };
  }

  const priorMastery = skillState.pMastery;
  let masteryLevel: string;

  if (priorMastery >= 0.95) {
    masteryLevel = 'mastered';
  } else if (priorMastery >= 0.7) {
    masteryLevel = 'proficient';
  } else if (priorMastery >= 0.3) {
    masteryLevel = 'learning';
  } else {
    masteryLevel = 'novice';
  }

  return { priorMastery, masteryLevel };
}

// ============================================
// EXPORTS
// ============================================

export {
  // Re-export types for convenience
  type InterventionLevel,
  type InterventionType,
  type InterventionState,
  type InterventionSelection,
  type StruggleIndicators,
};

const socraticCoachModule = {
  generateSocraticResponse,
  clearInterventionState,
  getInterventionStateInfo,
  serializeAllStates,
  restoreStates,
  getBKTContext,
};

export default socraticCoachModule;
