/**
 * Coach Integration
 *
 * Bridges the multi-agent system with the existing coach API.
 * Provides seamless integration so the new agent architecture
 * can be used through the existing coach endpoints.
 */

import { getOrchestrator, type OrchestratorConfig } from '../orchestrator';
import type {
  AgentState,
  AgentContext,
  OrchestrationResult,
  StudentState,
} from '../types';
import {
  getPOMDPModel,
  type StudentObservation,
  type TeachingAction,
} from '../../student';

/**
 * Coach request context (from existing API)
 */
export interface CoachRequestContext {
  userName: string;
  currentCourse: string;
  currentModule?: string;
  currentLesson?: string;
  currentAtom?: string;
  atomType?: string;
  atomContent?: string;
  recentPerformance?: string;
  masteryLevel?: number;
  practiceContext?: string;
  questionId?: string;
  questionText?: string;
  selectedAnswer?: string;
  consecutiveWrong?: number;
  conceptId?: string;
}

/**
 * Coach message format
 */
export interface CoachMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Coach response from agent system
 */
export interface AgentCoachResponse {
  response: string;
  agentUsed: string;
  interventionTier?: number;
  isGrounded: boolean;
  groundingScore: number;
  shouldContinue: boolean;
  suggestedNextAction?: 'quiz' | 'content' | 'review' | 'help';
  stateUpdates?: Partial<StudentState>;
  debug?: {
    agentsUsed: string[];
    totalTimeMs: number;
    errors: string[];
  };
}

/**
 * Process a coach request through the multi-agent system
 */
export async function processCoachRequest(
  userId: string,
  message: string,
  context: CoachRequestContext,
  conversationHistory: CoachMessage[] = [],
  config?: Partial<OrchestratorConfig>
): Promise<AgentCoachResponse> {
  const orchestrator = getOrchestrator(config);

  // Generate session ID from user + conversation context
  const sessionId = generateSessionId(userId, context);

  // Convert coach context to agent context
  const agentContext = convertToAgentContext(context);

  // Initialize student state from context
  initializeStudentState(
    orchestrator,
    sessionId,
    userId,
    context
  );

  // Process through orchestrator
  const result = await orchestrator.processMessage(
    sessionId,
    userId,
    context.currentCourse || 'course-1',
    message,
    agentContext
  );

  // Convert orchestration result to coach response
  return convertToCoachResponse(result);
}

/**
 * Generate consistent session ID
 */
function generateSessionId(userId: string, context: CoachRequestContext): string {
  // Use course + lesson to create a session scope
  const scope = `${context.currentCourse || 'default'}-${context.currentLesson || 'default'}`;
  return `coach-${userId}-${scope}`;
}

/**
 * Convert coach context to agent context
 */
function convertToAgentContext(context: CoachRequestContext): Partial<AgentContext> {
  return {
    courseId: context.currentCourse || 'course-1',
    moduleId: context.currentModule,
    lessonId: context.currentLesson,
    atomId: context.currentAtom || context.conceptId,
    currentActivity: context.atomType
      ? {
          type: mapAtomTypeToActivity(context.atomType),
          contentId: context.currentAtom || '',
          startedAt: new Date(),
          progress: 0,
          questionIndex: context.questionId ? 0 : undefined,
          selectedAnswer: context.selectedAnswer,
        }
      : undefined,
  };
}

/**
 * Map atom type to activity type
 */
function mapAtomTypeToActivity(
  atomType: string
): 'video' | 'quiz' | 'reading' | 'practice' | 'review' {
  switch (atomType.toLowerCase()) {
    case 'video':
      return 'video';
    case 'quiz':
    case 'practice':
    case 'question':
      return 'quiz';
    case 'reading':
    case 'text':
      return 'reading';
    case 'review':
      return 'review';
    default:
      return 'practice';
  }
}

/**
 * Initialize student state from coach context
 */
function initializeStudentState(
  orchestrator: ReturnType<typeof getOrchestrator>,
  sessionId: string,
  userId: string,
  context: CoachRequestContext
): void {
  const existingState = orchestrator.getSessionState(sessionId);

  if (!existingState) {
    // Will be created by orchestrator, but we can pre-populate some state
    return;
  }

  // Update with context-provided state
  const updates: Partial<StudentState> = {};

  if (context.masteryLevel !== undefined) {
    if (context.conceptId) {
      updates.masteryLevels = {
        ...existingState.studentState.masteryLevels,
        [context.conceptId]: context.masteryLevel / 100, // Convert to 0-1
      };
    }
  }

  if (context.consecutiveWrong !== undefined) {
    updates.consecutiveWrong = context.consecutiveWrong;
    updates.consecutiveCorrect = 0;
  }

  if (Object.keys(updates).length > 0) {
    orchestrator.updateStudentState(sessionId, updates);
  }
}

/**
 * Convert orchestration result to coach response
 */
function convertToCoachResponse(result: OrchestrationResult): AgentCoachResponse {
  // Get the final response (last non-director response)
  const finalResponse = result.responses
    .filter((r) => r.agentType !== 'director')
    .pop() || result.responses[result.responses.length - 1];

  if (!finalResponse) {
    return {
      response: "I'm here to help. What would you like to learn about?",
      agentUsed: 'director',
      isGrounded: false,
      groundingScore: 0,
      shouldContinue: true,
      debug: {
        agentsUsed: result.agentsUsed,
        totalTimeMs: result.totalTimeMs,
        errors: result.errors,
      },
    };
  }

  // Determine suggested next action based on final agent
  const suggestedNextAction = determineSuggestedAction(
    finalResponse.agentType,
    finalResponse
  );

  return {
    response: finalResponse.message,
    agentUsed: finalResponse.agentType,
    interventionTier: extractInterventionTier(finalResponse),
    isGrounded: finalResponse.isGrounded,
    groundingScore: finalResponse.groundingScore,
    shouldContinue: !finalResponse.shouldEndSession,
    suggestedNextAction,
    stateUpdates: finalResponse.stateUpdates?.studentState,
    debug: {
      agentsUsed: result.agentsUsed,
      totalTimeMs: result.totalTimeMs,
      errors: result.errors,
    },
  };
}

/**
 * Determine suggested next action from response
 */
function determineSuggestedAction(
  agentType: string,
  response: OrchestrationResult['responses'][0]
): 'quiz' | 'content' | 'review' | 'help' | undefined {
  // Check actions for hints
  for (const action of response.actions) {
    if ('type' in action) {
      if (action.type === 'show_question') return 'quiz';
      if (action.type === 'show_content') return 'content';
      if (action.type === 'show_hint') return 'help';
    }
  }

  // Infer from agent type
  switch (agentType) {
    case 'quiz':
      return 'quiz';
    case 'content':
      return 'content';
    case 'remediation':
      return 'help';
    default:
      return undefined;
  }
}

/**
 * Extract intervention tier from response
 */
function extractInterventionTier(
  response: OrchestrationResult['responses'][0]
): number | undefined {
  if (response.agentType !== 'remediation') return undefined;

  // Check actions for tier info
  for (const action of response.actions) {
    if ('tier' in action && typeof action.tier === 'number') {
      return action.tier;
    }
  }

  // Check state updates
  const studentState = response.stateUpdates?.studentState;
  if (studentState && 'currentInterventionTier' in studentState) {
    return studentState.currentInterventionTier;
  }

  return undefined;
}

/**
 * Get or create a session for streaming responses
 */
export function getCoachSession(
  userId: string,
  context: CoachRequestContext
): {
  sessionId: string;
  state: AgentState | undefined;
} {
  const orchestrator = getOrchestrator();
  const sessionId = generateSessionId(userId, context);
  const state = orchestrator.getSessionState(sessionId);

  return { sessionId, state };
}

/**
 * End a coach session
 */
export function endCoachSession(userId: string, context: CoachRequestContext): void {
  const orchestrator = getOrchestrator();
  const sessionId = generateSessionId(userId, context);
  orchestrator.endSession(sessionId);
}

/**
 * Update coach session state externally (e.g., after quiz answer)
 */
export function updateCoachSessionState(
  userId: string,
  context: CoachRequestContext,
  updates: Partial<StudentState>
): AgentState | null {
  const orchestrator = getOrchestrator();
  const sessionId = generateSessionId(userId, context);
  return orchestrator.updateStudentState(sessionId, updates);
}

// ============================================================================
// POMDP INTEGRATION
// ============================================================================

/**
 * Update POMDP belief based on a quiz observation
 */
export async function updatePOMDPFromQuiz(
  userId: string,
  skillId: string,
  isCorrect: boolean,
  responseTimeMs?: number,
  confidenceLevel?: 'guessing' | 'unsure' | 'confident'
): Promise<void> {
  const model = getPOMDPModel();

  const observation: StudentObservation = {
    isCorrect,
    responseTimeMs,
    confidenceLevel,
  };

  const action: TeachingAction = 'show_quiz';

  await model.updateBelief(userId, skillId, observation, action);
}

/**
 * Update POMDP belief based on content engagement
 */
export async function updatePOMDPFromContent(
  userId: string,
  skillId: string,
  completionPercent: number,
  timeOnContentMs: number,
  requestedHelp?: boolean
): Promise<void> {
  const model = getPOMDPModel();

  const observation: StudentObservation = {
    contentCompletionPercent: completionPercent,
    timeOnContentMs,
    requestedHelp,
  };

  const action: TeachingAction = 'show_content';

  await model.updateBelief(userId, skillId, observation, action);
}

/**
 * Update POMDP belief based on help-seeking behavior
 */
export async function updatePOMDPFromHelpRequest(
  userId: string,
  skillId: string,
  hintViewed?: boolean,
  explanationViewed?: boolean,
  reportedConfusion?: boolean
): Promise<void> {
  const model = getPOMDPModel();

  const observation: StudentObservation = {
    requestedHelp: true,
    hintViewed,
    explanationViewed,
    reportedConfusion,
  };

  // Determine the help action type
  const action: TeachingAction = explanationViewed
    ? 'show_explanation'
    : hintViewed
      ? 'show_hint'
      : 'show_explanation';

  await model.updateBelief(userId, skillId, observation, action);
}

/**
 * Get POMDP-recommended teaching action for a user/skill
 */
export async function getPOMDPRecommendation(
  userId: string,
  skillId: string
): Promise<{
  action: TeachingAction;
  confidence: number;
  reasoning: string;
}> {
  const model = getPOMDPModel();
  const belief = await model.getCurrentBelief(userId, skillId);
  const evaluation = await model.selectAction(belief);

  return {
    action: evaluation.selectedAction,
    confidence: evaluation.confidence,
    reasoning: evaluation.reasoning,
  };
}

/**
 * Get POMDP student state summary for debugging/display
 */
export async function getPOMDPStateSummary(
  userId: string,
  skillId: string
): Promise<{
  masteryLevel: string;
  attention: string;
  confusion: string;
  motivation: string;
  masteryScalar: number;
}> {
  const model = getPOMDPModel();
  const belief = await model.getCurrentBelief(userId, skillId);
  return model.getStudentStateSummary(belief);
}
