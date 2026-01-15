/**
 * POMDP Student Model Types
 *
 * Partially Observable Markov Decision Process (POMDP) for student modeling.
 * We can't observe the student's true knowledge state - we infer it from actions.
 *
 * Components:
 * - State Space: What we're trying to infer (mastery, attention, confusion)
 * - Action Space: Teaching actions available (show content, quiz, hint, etc.)
 * - Observation Space: What we can observe (correct/incorrect, time, behavior)
 * - Belief State: Probability distribution over hidden states
 * - Transition Model: How states change given actions
 * - Observation Model: P(observation | state, action)
 * - Reward Function: What we're optimizing for
 */

// ============================================================================
// STATE SPACE
// ============================================================================

/**
 * Discrete mastery levels (simplified from continuous BKT)
 *
 * Using discrete levels allows for tractable POMDP computation.
 */
export type MasteryLevel = 'novice' | 'beginner' | 'developing' | 'proficient' | 'mastered';

/**
 * Attention state - affects observation reliability
 */
export type AttentionState = 'focused' | 'distracted' | 'fatigued';

/**
 * Confusion state - affects learning rate
 */
export type ConfusionState = 'clear' | 'uncertain' | 'confused';

/**
 * Motivation state - affects engagement
 */
export type MotivationState = 'engaged' | 'neutral' | 'disengaged';

/**
 * Complete hidden state of the student
 *
 * In a full POMDP, we maintain beliefs over all combinations of these states.
 * For tractability, we use a factored representation.
 */
export interface HiddenStudentState {
  mastery: MasteryLevel;
  attention: AttentionState;
  confusion: ConfusionState;
  motivation: MotivationState;
}

/**
 * State space configuration
 */
export const STATE_SPACE = {
  mastery: ['novice', 'beginner', 'developing', 'proficient', 'mastered'] as const,
  attention: ['focused', 'distracted', 'fatigued'] as const,
  confusion: ['clear', 'uncertain', 'confused'] as const,
  motivation: ['engaged', 'neutral', 'disengaged'] as const,
};

// ============================================================================
// ACTION SPACE
// ============================================================================

/**
 * Teaching actions available to the system
 */
export type TeachingAction =
  | 'show_content'        // New learning content
  | 'show_quiz'           // Assessment question
  | 'show_review'         // Spaced repetition review
  | 'show_hint'           // Progressive hint (Tier 1)
  | 'show_explanation'    // Detailed explanation (Tier 2)
  | 'show_worked_example' // Step-by-step example (Tier 3)
  | 'encourage'           // Motivational message
  | 'suggest_break'       // Recommend rest
  | 'easier_content'      // Lower difficulty
  | 'harder_content';     // Higher difficulty

/**
 * Action space with metadata
 */
export const ACTION_SPACE: Record<TeachingAction, ActionMetadata> = {
  show_content: { category: 'learning', costMs: 300000, prerequisites: [] },
  show_quiz: { category: 'assessment', costMs: 60000, prerequisites: [] },
  show_review: { category: 'retention', costMs: 30000, prerequisites: [] },
  show_hint: { category: 'remediation', costMs: 15000, prerequisites: [] },
  show_explanation: { category: 'remediation', costMs: 60000, prerequisites: [] },
  show_worked_example: { category: 'remediation', costMs: 120000, prerequisites: [] },
  encourage: { category: 'motivation', costMs: 5000, prerequisites: [] },
  suggest_break: { category: 'wellbeing', costMs: 0, prerequisites: [] },
  easier_content: { category: 'adaptation', costMs: 300000, prerequisites: [] },
  harder_content: { category: 'adaptation', costMs: 300000, prerequisites: [] },
};

interface ActionMetadata {
  category: 'learning' | 'assessment' | 'retention' | 'remediation' | 'motivation' | 'wellbeing' | 'adaptation';
  costMs: number; // Expected time in milliseconds
  prerequisites: TeachingAction[];
}

// ============================================================================
// OBSERVATION SPACE
// ============================================================================

/**
 * Observable signals from student interactions
 */
export interface StudentObservation {
  // Quiz/assessment observations
  isCorrect?: boolean;
  responseTimeMs?: number;
  confidenceLevel?: 'guessing' | 'unsure' | 'confident';

  // Content engagement observations
  contentCompletionPercent?: number;
  scrollDepth?: number;
  timeOnContentMs?: number;
  pauseCount?: number;

  // Help-seeking behavior
  requestedHelp?: boolean;
  hintViewed?: boolean;
  explanationViewed?: boolean;

  // Session behavior
  timeSinceLastInteractionMs?: number;
  sessionDurationMs?: number;
  interactionCount?: number;

  // Explicit signals
  reportedConfusion?: boolean;
  skippedContent?: boolean;
}

/**
 * Processed observation features for the model
 */
export interface ObservationFeatures {
  correctness: number;      // 0 = wrong, 1 = correct, NaN if no quiz
  responseSpeed: number;    // Normalized response time
  engagement: number;       // Engagement score 0-1
  helpSeeking: number;      // Help-seeking frequency
  sessionFatigue: number;   // Session fatigue estimate
}

// ============================================================================
// BELIEF STATE
// ============================================================================

/**
 * Belief distribution over a single state dimension
 */
export type BeliefDistribution<T extends string> = Record<T, number>;

/**
 * Factored belief state (independent beliefs over each dimension)
 *
 * This is a simplification of a full joint distribution.
 * Trade-off: Less accurate but much more tractable.
 */
export interface FactoredBelief {
  mastery: BeliefDistribution<MasteryLevel>;
  attention: BeliefDistribution<AttentionState>;
  confusion: BeliefDistribution<ConfusionState>;
  motivation: BeliefDistribution<MotivationState>;

  // Metadata
  skillId: string;
  lastUpdated: Date;
  observationCount: number;
}

/**
 * Initial belief state (uniform or based on priors)
 */
export const INITIAL_MASTERY_BELIEF: BeliefDistribution<MasteryLevel> = {
  novice: 0.5,
  beginner: 0.25,
  developing: 0.15,
  proficient: 0.08,
  mastered: 0.02,
};

export const INITIAL_ATTENTION_BELIEF: BeliefDistribution<AttentionState> = {
  focused: 0.7,
  distracted: 0.2,
  fatigued: 0.1,
};

export const INITIAL_CONFUSION_BELIEF: BeliefDistribution<ConfusionState> = {
  clear: 0.6,
  uncertain: 0.3,
  confused: 0.1,
};

export const INITIAL_MOTIVATION_BELIEF: BeliefDistribution<MotivationState> = {
  engaged: 0.5,
  neutral: 0.4,
  disengaged: 0.1,
};

// ============================================================================
// TRANSITION MODEL
// ============================================================================

/**
 * Transition probabilities P(s' | s, a)
 *
 * How likely is the student to transition from state s to s' given action a?
 */
export interface TransitionModel {
  mastery: TransitionMatrix<MasteryLevel>;
  attention: TransitionMatrix<AttentionState>;
  confusion: TransitionMatrix<ConfusionState>;
  motivation: TransitionMatrix<MotivationState>;
}

export type TransitionMatrix<T extends string> = Record<TeachingAction, Record<T, Record<T, number>>>;

// ============================================================================
// OBSERVATION MODEL
// ============================================================================

/**
 * Observation probabilities P(o | s, a)
 *
 * How likely is an observation given the hidden state and action?
 */
export interface ObservationModel {
  // P(correct | mastery_level, action)
  correctGivenMastery: Record<MasteryLevel, Record<TeachingAction, number>>;

  // P(fast_response | attention_state)
  fastResponseGivenAttention: Record<AttentionState, number>;

  // P(help_request | confusion_state)
  helpRequestGivenConfusion: Record<ConfusionState, number>;

  // P(skip | motivation_state)
  skipGivenMotivation: Record<MotivationState, number>;
}

// ============================================================================
// REWARD MODEL
// ============================================================================

/**
 * Reward configuration for POMDP optimization
 *
 * What are we optimizing for?
 */
export interface RewardModel {
  // Primary learning reward
  masteryGain: number;           // +10 for mastery level increase
  correctAnswer: number;         // +2 for correct
  incorrectAnswer: number;       // -1 for incorrect (learning opportunity)

  // Engagement rewards
  engagementMaintained: number;  // +1 for staying engaged
  disengagementPenalty: number;  // -5 for disengagement

  // Efficiency
  timeEfficiency: number;        // Reward for faster learning

  // Long-term retention
  reviewCompleted: number;       // +3 for completing review

  // Wellbeing
  frustrationPenalty: number;    // -3 for frustration detection
  breakTakenBonus: number;       // +2 for appropriate break
}

export const DEFAULT_REWARD_MODEL: RewardModel = {
  masteryGain: 10,
  correctAnswer: 2,
  incorrectAnswer: -1,
  engagementMaintained: 1,
  disengagementPenalty: -5,
  timeEfficiency: 0.5,
  reviewCompleted: 3,
  frustrationPenalty: -3,
  breakTakenBonus: 2,
};

// ============================================================================
// POLICY
// ============================================================================

/**
 * Policy: Mapping from belief states to actions
 */
export interface Policy {
  // Given current belief, what action to take?
  selectAction: (belief: FactoredBelief) => TeachingAction;

  // Expected value of taking action in belief state
  qValues: (belief: FactoredBelief) => Record<TeachingAction, number>;
}

/**
 * Policy evaluation result
 */
export interface PolicyEvaluation {
  selectedAction: TeachingAction;
  qValues: Record<TeachingAction, number>;
  confidence: number;
  reasoning: string;
}

// ============================================================================
// STUDENT MODEL INTERFACE
// ============================================================================

/**
 * Complete POMDP Student Model interface
 */
export interface PODMPStudentModel {
  // State estimation
  getCurrentBelief(userId: string, skillId: string): Promise<FactoredBelief>;
  updateBelief(userId: string, skillId: string, observation: StudentObservation, action: TeachingAction): Promise<FactoredBelief>;

  // Policy
  selectAction(belief: FactoredBelief): Promise<PolicyEvaluation>;
  getQValues(belief: FactoredBelief): Promise<Record<TeachingAction, number>>;

  // Batch operations
  getBeliefsForCourse(userId: string, courseId: string): Promise<Map<string, FactoredBelief>>;

  // BKT bridge (for backward compatibility)
  getMasteryEstimate(belief: FactoredBelief): number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Normalize a belief distribution to sum to 1
 */
export function normalizeBelief<T extends string>(
  belief: BeliefDistribution<T>
): BeliefDistribution<T> {
  const values = Object.values(belief) as number[];
  const total = values.reduce((sum: number, p: number) => sum + p, 0);
  if (total === 0) return belief;

  const normalized = {} as BeliefDistribution<T>;
  for (const [state, prob] of Object.entries(belief)) {
    normalized[state as T] = (prob as number) / total;
  }
  return normalized;
}

/**
 * Get most likely state from belief distribution
 */
export function getMostLikelyState<T extends string>(
  belief: BeliefDistribution<T>
): T {
  let maxProb = 0;
  let mostLikely: T | null = null;

  for (const [state, prob] of Object.entries(belief)) {
    if ((prob as number) > maxProb) {
      maxProb = prob as number;
      mostLikely = state as T;
    }
  }

  return mostLikely!;
}

/**
 * Calculate entropy of a belief distribution (uncertainty measure)
 */
export function beliefEntropy<T extends string>(
  belief: BeliefDistribution<T>
): number {
  let entropy = 0;
  for (const prob of Object.values(belief)) {
    const p = prob as number;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }
  return entropy;
}

/**
 * Convert mastery belief to scalar (BKT-compatible)
 */
export function masteryBeliefToScalar(belief: BeliefDistribution<MasteryLevel>): number {
  const weights: Record<MasteryLevel, number> = {
    novice: 0.1,
    beginner: 0.3,
    developing: 0.5,
    proficient: 0.75,
    mastered: 0.95,
  };

  let weighted = 0;
  for (const [level, prob] of Object.entries(belief)) {
    weighted += weights[level as MasteryLevel] * (prob as number);
  }
  return weighted;
}
