/**
 * Student Model Module
 *
 * POMDP-based student modeling for adaptive learning.
 *
 * Key exports:
 * - getPOMDPModel: Get the POMDP model singleton
 * - FactoredBelief: Type for belief state
 * - TeachingAction: Available teaching actions
 *
 * Example usage:
 * ```typescript
 * import { getPOMDPModel } from '@/lib/student';
 *
 * const model = getPOMDPModel();
 * const belief = await model.getCurrentBelief(userId, skillId);
 * const action = await model.selectAction(belief);
 * ```
 */

// Main model
export {
  PODMPStudentModelImpl,
  getPOMDPModel,
  resetPOMDPModel,
  importFromBKT,
  exportToBKT,
  getAgentForAction,
  intentToTeachingAction,
  createInitialBelief,
  createBeliefFromBKT,
  isLikelyStruggling,
  isLikelyDisengaging,
  isReadyForChallenge,
  getBeliefConfidence,
} from './pomdpModel';

// Types
export type {
  FactoredBelief,
  TeachingAction,
  StudentObservation,
  PolicyEvaluation,
  RewardModel,
  PODMPStudentModel,
  MasteryLevel,
  AttentionState,
  ConfusionState,
  MotivationState,
  HiddenStudentState,
  BeliefDistribution,
  ObservationFeatures,
} from './types';

// Type constants and utilities
export {
  STATE_SPACE,
  ACTION_SPACE,
  DEFAULT_REWARD_MODEL,
  INITIAL_MASTERY_BELIEF,
  INITIAL_ATTENTION_BELIEF,
  INITIAL_CONFUSION_BELIEF,
  INITIAL_MOTIVATION_BELIEF,
  normalizeBelief,
  getMostLikelyState,
  beliefEntropy,
  masteryBeliefToScalar,
} from './types';

// Belief state management
export {
  updateBelief,
  processObservation,
  getOrCreateBelief,
  saveBelief,
  getAllBeliefs,
  clearBeliefCache,
} from './beliefState';

// State transitions
export {
  applyMasteryTransition,
  applyForgettingTransition,
  applyAttentionTransition,
  applyAttentionDecay,
  applyConfusionTransition,
  applyMotivationTransition,
  applySuccessBoost,
  applyFailurePenalty,
  applyAllTransitions,
  getTransitionEffect,
} from './stateTransitions';

// Policy selection
export {
  calculateQValue,
  selectAction,
  selectActionWithExploration,
  selectActionSoftmax,
  evaluatePolicyForCourse,
} from './policySelector';
