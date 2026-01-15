/**
 * Agent Integration Module
 *
 * Exports integration adapters for connecting the multi-agent system
 * to existing platform components.
 */

export {
  processCoachRequest,
  getCoachSession,
  endCoachSession,
  updateCoachSessionState,
  type CoachRequestContext,
  type CoachMessage,
  type AgentCoachResponse,
  // POMDP Integration
  updatePOMDPFromQuiz,
  updatePOMDPFromContent,
  updatePOMDPFromHelpRequest,
  getPOMDPRecommendation,
  getPOMDPStateSummary,
} from './coachIntegration';
