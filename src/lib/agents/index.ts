/**
 * Multi-Agent System
 *
 * Central export for the agent orchestration system.
 * Agents work together to provide personalized, adaptive learning experiences.
 *
 * Architecture:
 * - Director Agent: Routes requests to specialist agents
 * - Content Agent: Selects and sequences learning content
 * - Quiz Agent: Generates questions and evaluates answers
 * - Remediation Agent: Provides help, hints, and scaffolding
 * - Summary Agent: Creates session summaries (future)
 * - Motivation Agent: Re-engages students (future)
 */

// Types
export * from './types';

// Base infrastructure
export { AgentBase, DEFAULT_AGENT_CONFIGS } from './shared/AgentBase';

// Director Agent
export {
  DirectorAgent,
  getDirectorAgent,
} from './director';
export {
  classifyIntent,
  adjustConfidenceForContext,
  getSuggestedFollowUps,
} from './director/intentClassifier';

// Content Agent
export {
  ContentAgent,
  getContentAgent,
  type ContentRecommendation,
  type ContentCriteria,
} from './content';

// Quiz Agent
export {
  QuizAgent,
  getQuizAgent,
  type QuizQuestion,
  type QuizOption,
  type AnswerEvaluation,
} from './quiz';

// Remediation Agent
export {
  RemediationAgent,
  getRemediationAgent,
  type InterventionTier,
  type HelpType,
  type RemediationResult,
  type InterventionState,
} from './remediation';

// Orchestrator
export {
  AgentOrchestrator,
  getOrchestrator,
  resetOrchestrator,
  type OrchestratorConfig,
} from './orchestrator';

// Integration adapters
export {
  processCoachRequest,
  getCoachSession,
  endCoachSession,
  updateCoachSessionState,
  type CoachRequestContext,
  type CoachMessage,
  type AgentCoachResponse,
} from './integration';

// POMDP Integration (belief state updates)
export {
  updatePOMDPFromQuiz,
  updatePOMDPFromContent,
  updatePOMDPFromHelpRequest,
  getPOMDPRecommendation,
  getPOMDPStateSummary,
} from './integration';
