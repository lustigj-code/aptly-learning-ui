/**
 * POMDP Student Model
 *
 * Main entry point for the Partially Observable Markov Decision Process
 * student modeling system.
 *
 * This model reasons about:
 * - What the student actually knows (hidden mastery state)
 * - Their current attention and engagement
 * - Whether they're confused or frustrated
 * - The optimal teaching action to take
 *
 * Key methods:
 * - getCurrentBelief: Get probability distribution over student states
 * - updateBelief: Update beliefs based on observations
 * - selectAction: Choose optimal teaching action
 * - getMasteryEstimate: Get BKT-compatible mastery scalar
 */

import {
  FactoredBelief,
  TeachingAction,
  StudentObservation,
  PolicyEvaluation,
  PODMPStudentModel,
  RewardModel,
  DEFAULT_REWARD_MODEL,
  masteryBeliefToScalar,
  getMostLikelyState,
} from './types';

import {
  createInitialBelief,
  createBeliefFromBKT,
  updateBelief as updateBeliefState,
  getOrCreateBelief,
  saveBelief,
  getAllBeliefs,
  isLikelyStruggling,
  isLikelyDisengaging,
  isReadyForChallenge,
  getBeliefConfidence,
} from './beliefState';

import {
  applyAllTransitions,
  applyForgettingTransition,
} from './stateTransitions';

import {
  selectAction as selectOptimalAction,
  selectActionWithExploration,
  calculateQValue,
  evaluatePolicyForCourse,
} from './policySelector';

// ============================================================================
// MAIN POMDP MODEL
// ============================================================================

/**
 * POMDP Student Model implementation
 */
export class PODMPStudentModelImpl implements PODMPStudentModel {
  private rewards: RewardModel;
  private explorationRate: number;

  constructor(config?: {
    rewards?: Partial<RewardModel>;
    explorationRate?: number;
  }) {
    this.rewards = { ...DEFAULT_REWARD_MODEL, ...config?.rewards };
    this.explorationRate = config?.explorationRate ?? 0.05;
  }

  /**
   * Get current belief state for a user-skill pair
   */
  async getCurrentBelief(userId: string, skillId: string): Promise<FactoredBelief> {
    const belief = getOrCreateBelief(userId, skillId);

    // Apply time decay if not recently updated
    const hoursSinceUpdate = (Date.now() - belief.lastUpdated.getTime()) / (1000 * 60 * 60);
    if (hoursSinceUpdate > 24) {
      const decayedBelief = {
        ...belief,
        mastery: applyForgettingTransition(belief.mastery, hoursSinceUpdate),
      };
      saveBelief(userId, decayedBelief);
      return decayedBelief;
    }

    return belief;
  }

  /**
   * Update belief based on observation
   */
  async updateBelief(
    userId: string,
    skillId: string,
    observation: StudentObservation,
    action: TeachingAction
  ): Promise<FactoredBelief> {
    const currentBelief = await this.getCurrentBelief(userId, skillId);

    // Update belief using observation model
    let updatedBelief = updateBeliefState(currentBelief, observation, action);

    // Apply action transitions
    updatedBelief = applyAllTransitions(updatedBelief, action);

    // Save and return
    saveBelief(userId, updatedBelief);
    return updatedBelief;
  }

  /**
   * Select optimal action given belief state
   */
  async selectAction(belief: FactoredBelief): Promise<PolicyEvaluation> {
    // Use exploration during early learning, pure exploitation later
    if (this.explorationRate > 0 && belief.observationCount < 50) {
      return selectActionWithExploration(belief, this.explorationRate, this.rewards);
    }

    return selectOptimalAction(belief, this.rewards);
  }

  /**
   * Get Q-values for all actions
   */
  async getQValues(belief: FactoredBelief): Promise<Record<TeachingAction, number>> {
    const evaluation = await this.selectAction(belief);
    return evaluation.qValues;
  }

  /**
   * Get beliefs for all skills in a course
   */
  async getBeliefsForCourse(
    userId: string,
    _courseId: string
  ): Promise<Map<string, FactoredBelief>> {
    // In production, would filter by courseId
    return getAllBeliefs(userId);
  }

  /**
   * Get BKT-compatible mastery estimate
   */
  getMasteryEstimate(belief: FactoredBelief): number {
    return masteryBeliefToScalar(belief.mastery);
  }

  // ============================================================================
  // CONVENIENCE METHODS
  // ============================================================================

  /**
   * Check if student needs help
   */
  needsIntervention(belief: FactoredBelief): {
    needed: boolean;
    type: 'struggling' | 'disengaging' | 'none';
    urgency: number;
  } {
    if (isLikelyStruggling(belief)) {
      return {
        needed: true,
        type: 'struggling',
        urgency: belief.confusion.confused,
      };
    }

    if (isLikelyDisengaging(belief)) {
      return {
        needed: true,
        type: 'disengaging',
        urgency: belief.motivation.disengaged,
      };
    }

    return { needed: false, type: 'none', urgency: 0 };
  }

  /**
   * Get recommended next actions for a course
   */
  async getRecommendedActions(
    userId: string,
    courseId: string,
    maxActions: number = 5
  ): Promise<
    Array<{
      skillId: string;
      action: TeachingAction;
      priority: number;
    }>
  > {
    const beliefs = await this.getBeliefsForCourse(userId, courseId);
    return evaluatePolicyForCourse(beliefs, maxActions);
  }

  /**
   * Get summary of student state
   */
  getStudentStateSummary(belief: FactoredBelief): {
    masteryLevel: string;
    attention: string;
    confusion: string;
    motivation: string;
    confidence: number;
    masteryScalar: number;
  } {
    return {
      masteryLevel: getMostLikelyState(belief.mastery),
      attention: getMostLikelyState(belief.attention),
      confusion: getMostLikelyState(belief.confusion),
      motivation: getMostLikelyState(belief.motivation),
      confidence: getBeliefConfidence(belief),
      masteryScalar: masteryBeliefToScalar(belief.mastery),
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let modelInstance: PODMPStudentModelImpl | null = null;

/**
 * Get POMDP model singleton
 */
export function getPOMDPModel(config?: {
  rewards?: Partial<RewardModel>;
  explorationRate?: number;
}): PODMPStudentModelImpl {
  if (!modelInstance) {
    modelInstance = new PODMPStudentModelImpl(config);
  }
  return modelInstance;
}

/**
 * Reset model instance (for testing)
 */
export function resetPOMDPModel(): void {
  modelInstance = null;
}

// ============================================================================
// BKT BRIDGE FUNCTIONS
// ============================================================================

/**
 * Import BKT state into POMDP model
 *
 * Allows gradual migration from BKT to POMDP.
 */
export function importFromBKT(
  userId: string,
  skillId: string,
  bktMastery: number
): FactoredBelief {
  const belief = createBeliefFromBKT(skillId, bktMastery);
  saveBelief(userId, belief);
  return belief;
}

/**
 * Export POMDP belief to BKT-compatible format
 */
export function exportToBKT(belief: FactoredBelief): {
  skillId: string;
  pMastery: number;
  confidence: number;
} {
  return {
    skillId: belief.skillId,
    pMastery: masteryBeliefToScalar(belief.mastery),
    confidence: getBeliefConfidence(belief),
  };
}

// ============================================================================
// ACTION MAPPING TO AGENTS
// ============================================================================

/**
 * Map POMDP teaching actions to agent types
 */
export function getAgentForAction(
  action: TeachingAction
): 'content' | 'quiz' | 'remediation' | 'motivation' | 'director' {
  const mapping: Record<TeachingAction, 'content' | 'quiz' | 'remediation' | 'motivation' | 'director'> = {
    show_content: 'content',
    show_quiz: 'quiz',
    show_review: 'content',
    show_hint: 'remediation',
    show_explanation: 'remediation',
    show_worked_example: 'remediation',
    encourage: 'motivation',
    suggest_break: 'motivation',
    easier_content: 'content',
    harder_content: 'content',
  };

  return mapping[action] || 'director';
}

/**
 * Convert agent intent to teaching action
 */
export function intentToTeachingAction(
  intentType: string
): TeachingAction | null {
  const mapping: Record<string, TeachingAction> = {
    need_content: 'show_content',
    content_request: 'show_content',
    quiz_answer: 'show_quiz',
    request_help: 'show_hint',
    ask_question: 'show_explanation',
    struggling: 'show_worked_example',
    review_request: 'show_review',
    skip_request: 'show_content',
    disengaged: 'encourage',
    session_complete: 'suggest_break',
  };

  return mapping[intentType] || null;
}

// Re-export types for convenience
export {
  createInitialBelief,
  createBeliefFromBKT,
  isLikelyStruggling,
  isLikelyDisengaging,
  isReadyForChallenge,
  getBeliefConfidence,
};

export type {
  FactoredBelief,
  TeachingAction,
  StudentObservation,
  PolicyEvaluation,
  RewardModel,
};
