/**
 * Policy Selector
 *
 * Determines the optimal teaching action given the current belief state.
 * Uses a heuristic policy based on educational best practices.
 *
 * Future: Can be upgraded to learned policy via reinforcement learning.
 */

import {
  FactoredBelief,
  TeachingAction,
  PolicyEvaluation,
  DEFAULT_REWARD_MODEL,
  RewardModel,
  getMostLikelyState,
  masteryBeliefToScalar,
} from './types';
import { getTransitionEffect } from './stateTransitions';
import {
  isLikelyStruggling,
  isLikelyDisengaging,
  isReadyForChallenge,
  getBeliefConfidence,
} from './beliefState';

// ============================================================================
// ACTION VALUE CALCULATION
// ============================================================================

/**
 * Calculate Q-value for an action given belief state
 *
 * Q(b, a) = E[R(s, a)] + γ * E[V(b')]
 *
 * For tractability, we use a simplified value function based on:
 * 1. Immediate reward estimation
 * 2. Expected state transitions
 * 3. Heuristic future value
 */
export function calculateQValue(
  belief: FactoredBelief,
  action: TeachingAction,
  rewards: RewardModel = DEFAULT_REWARD_MODEL
): number {
  // Get expected transition effects
  const effects = getTransitionEffect(action);

  // Get current state estimates
  const masteryScalar = masteryBeliefToScalar(belief.mastery);
  const mostLikelyAttention = getMostLikelyState(belief.attention);
  const mostLikelyConfusion = getMostLikelyState(belief.confusion);
  const mostLikelyMotivation = getMostLikelyState(belief.motivation);

  // Calculate expected immediate reward
  let expectedReward = 0;

  // Mastery gain reward
  expectedReward += effects.masteryGain * rewards.masteryGain * 10;

  // Quiz actions: expected correctness reward
  if (action === 'show_quiz') {
    const pCorrect = estimateCorrectProbability(masteryScalar, mostLikelyAttention);
    expectedReward += pCorrect * rewards.correctAnswer + (1 - pCorrect) * rewards.incorrectAnswer;
  }

  // Review actions
  if (action === 'show_review') {
    expectedReward += rewards.reviewCompleted * 0.8; // Assume high completion rate
  }

  // Engagement maintenance
  if (mostLikelyMotivation === 'engaged' && effects.motivationEffect >= 0) {
    expectedReward += rewards.engagementMaintained;
  }

  // Disengagement penalty avoidance
  if (mostLikelyMotivation === 'disengaged') {
    if (action === 'encourage' || action === 'suggest_break') {
      expectedReward += Math.abs(rewards.disengagementPenalty) * 0.5; // Partial recovery
    }
  }

  // Confusion penalty handling
  if (mostLikelyConfusion === 'confused') {
    if (action === 'show_explanation' || action === 'show_worked_example') {
      expectedReward += Math.abs(rewards.frustrationPenalty) * 0.6; // Alleviates frustration
    }
  }

  // Break bonus
  if (action === 'suggest_break' && mostLikelyAttention === 'fatigued') {
    expectedReward += rewards.breakTakenBonus;
  }

  // Apply attention discount (low attention reduces expected value)
  const attentionMultiplier = getAttentionMultiplier(mostLikelyAttention);
  expectedReward *= attentionMultiplier;

  // Apply confusion discount (confusion makes learning harder)
  const confusionMultiplier = getConfusionMultiplier(mostLikelyConfusion);
  expectedReward *= confusionMultiplier;

  return expectedReward;
}

function estimateCorrectProbability(
  masteryScalar: number,
  attention: string
): number {
  // Base probability from mastery
  let pCorrect = masteryScalar * 0.8 + 0.2; // Min 20% (guessing)

  // Attention affects reliability
  if (attention === 'distracted') pCorrect *= 0.85;
  if (attention === 'fatigued') pCorrect *= 0.9;

  return Math.min(0.98, Math.max(0.2, pCorrect));
}

function getAttentionMultiplier(attention: string): number {
  switch (attention) {
    case 'focused': return 1.0;
    case 'distracted': return 0.7;
    case 'fatigued': return 0.6;
    default: return 0.8;
  }
}

function getConfusionMultiplier(confusion: string): number {
  switch (confusion) {
    case 'clear': return 1.0;
    case 'uncertain': return 0.85;
    case 'confused': return 0.6;
    default: return 0.8;
  }
}

// ============================================================================
// POLICY SELECTION
// ============================================================================

/**
 * Available actions to consider
 */
const AVAILABLE_ACTIONS: TeachingAction[] = [
  'show_content',
  'show_quiz',
  'show_review',
  'show_hint',
  'show_explanation',
  'show_worked_example',
  'encourage',
  'suggest_break',
  'easier_content',
  'harder_content',
];

/**
 * Select optimal action given belief state
 */
export function selectAction(
  belief: FactoredBelief,
  rewards: RewardModel = DEFAULT_REWARD_MODEL
): PolicyEvaluation {
  // Calculate Q-values for all actions
  const qValues: Record<TeachingAction, number> = {} as Record<TeachingAction, number>;
  for (const action of AVAILABLE_ACTIONS) {
    qValues[action] = calculateQValue(belief, action, rewards);
  }

  // Apply heuristic rules (override pure Q-value selection)
  const heuristicAction = applyHeuristicRules(belief);
  if (heuristicAction) {
    // Boost heuristic action's Q-value
    qValues[heuristicAction] += 5;
  }

  // Select action with highest Q-value
  let bestAction: TeachingAction = 'show_content';
  let bestValue = -Infinity;

  for (const [action, value] of Object.entries(qValues)) {
    if (value > bestValue) {
      bestValue = value;
      bestAction = action as TeachingAction;
    }
  }

  // Generate reasoning
  const reasoning = generateReasoning(belief, bestAction);
  const confidence = getBeliefConfidence(belief);

  return {
    selectedAction: bestAction,
    qValues,
    confidence,
    reasoning,
  };
}

/**
 * Apply heuristic rules based on educational best practices
 */
function applyHeuristicRules(belief: FactoredBelief): TeachingAction | null {
  // Rule 1: If strongly confused, provide explanation
  if (belief.confusion.confused > 0.5) {
    return 'show_explanation';
  }

  // Rule 2: If fatigued, suggest break
  if (belief.attention.fatigued > 0.5) {
    return 'suggest_break';
  }

  // Rule 3: If disengaged, encourage
  if (belief.motivation.disengaged > 0.5) {
    return 'encourage';
  }

  // Rule 4: If struggling (low mastery + confused), use worked example
  if (isLikelyStruggling(belief)) {
    if (belief.confusion.confused > 0.3) {
      return 'show_worked_example';
    }
    return 'show_hint';
  }

  // Rule 5: If ready for challenge, increase difficulty
  if (isReadyForChallenge(belief)) {
    return 'harder_content';
  }

  // Rule 6: If about to disengage, intervene
  if (isLikelyDisengaging(belief)) {
    return 'encourage';
  }

  // No strong heuristic - let Q-values decide
  return null;
}

/**
 * Generate human-readable reasoning for the action
 */
function generateReasoning(belief: FactoredBelief, action: TeachingAction): string {
  const mastery = getMostLikelyState(belief.mastery);
  const attention = getMostLikelyState(belief.attention);
  const confusion = getMostLikelyState(belief.confusion);
  const motivation = getMostLikelyState(belief.motivation);

  const parts: string[] = [];

  // Describe current state
  parts.push(`Student appears ${mastery} in mastery`);

  if (confusion !== 'clear') {
    parts.push(`showing ${confusion} understanding`);
  }

  if (attention !== 'focused') {
    parts.push(`with ${attention} attention`);
  }

  if (motivation !== 'engaged') {
    parts.push(`and ${motivation} motivation`);
  }

  // Explain action choice
  const actionReasons: Record<TeachingAction, string> = {
    show_content: 'New content will advance their learning.',
    show_quiz: 'Assessment will reinforce and test understanding.',
    show_review: 'Spaced review will strengthen retention.',
    show_hint: 'A gentle hint will help without giving away the answer.',
    show_explanation: 'A clear explanation will address their confusion.',
    show_worked_example: 'A step-by-step example will scaffold their learning.',
    encourage: 'Encouragement will help maintain engagement.',
    suggest_break: 'A break will help them return refreshed.',
    easier_content: 'Easier content will build confidence.',
    harder_content: 'A challenge will push their abilities.',
  };

  parts.push(actionReasons[action] || 'This action optimizes learning.');

  return parts.join('. ');
}

// ============================================================================
// EXPLORATION STRATEGIES
// ============================================================================

/**
 * Epsilon-greedy action selection for exploration
 *
 * Used during learning to balance exploitation vs exploration.
 */
export function selectActionWithExploration(
  belief: FactoredBelief,
  epsilon: number = 0.1,
  rewards: RewardModel = DEFAULT_REWARD_MODEL
): PolicyEvaluation {
  // With probability epsilon, explore randomly
  if (Math.random() < epsilon) {
    const randomAction = AVAILABLE_ACTIONS[
      Math.floor(Math.random() * AVAILABLE_ACTIONS.length)
    ];

    const evaluation = selectAction(belief, rewards);
    return {
      ...evaluation,
      selectedAction: randomAction,
      reasoning: `Exploring: ${evaluation.reasoning}`,
    };
  }

  // Otherwise, exploit best action
  return selectAction(belief, rewards);
}

/**
 * Softmax (Boltzmann) action selection
 *
 * Provides smoother exploration than epsilon-greedy.
 */
export function selectActionSoftmax(
  belief: FactoredBelief,
  temperature: number = 1.0,
  rewards: RewardModel = DEFAULT_REWARD_MODEL
): PolicyEvaluation {
  const evaluation = selectAction(belief, rewards);

  // Convert Q-values to probabilities
  const qValues = evaluation.qValues;
  const maxQ = Math.max(...Object.values(qValues));

  const expValues: Record<string, number> = {};
  let sumExp = 0;

  for (const [action, q] of Object.entries(qValues)) {
    const expVal = Math.exp((q - maxQ) / temperature);
    expValues[action] = expVal;
    sumExp += expVal;
  }

  // Sample action according to softmax distribution
  const rand = Math.random();
  let cumulative = 0;
  let selectedAction: TeachingAction = evaluation.selectedAction;

  for (const [action, expVal] of Object.entries(expValues)) {
    cumulative += expVal / sumExp;
    if (rand < cumulative) {
      selectedAction = action as TeachingAction;
      break;
    }
  }

  return {
    ...evaluation,
    selectedAction,
  };
}

// ============================================================================
// BATCH POLICY EVALUATION
// ============================================================================

/**
 * Evaluate policy over multiple skills
 */
export function evaluatePolicyForCourse(
  beliefs: Map<string, FactoredBelief>,
  maxActions: number = 5
): Array<{ skillId: string; action: TeachingAction; priority: number }> {
  const recommendations: Array<{
    skillId: string;
    action: TeachingAction;
    priority: number;
  }> = [];

  for (const [skillId, belief] of beliefs) {
    const evaluation = selectAction(belief);

    // Priority based on Q-value and urgency
    let priority = evaluation.qValues[evaluation.selectedAction];

    // Boost priority if struggling or disengaging
    if (isLikelyStruggling(belief)) priority += 3;
    if (isLikelyDisengaging(belief)) priority += 2;

    // Penalize if already mastered
    if (belief.mastery.mastered > 0.8) priority -= 5;

    recommendations.push({
      skillId,
      action: evaluation.selectedAction,
      priority,
    });
  }

  // Sort by priority and return top actions
  return recommendations
    .sort((a, b) => b.priority - a.priority)
    .slice(0, maxActions);
}
