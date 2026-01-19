/**
 * State Transition Model
 *
 * Defines how student states change in response to teaching actions.
 * P(s' | s, a) - Probability of transitioning to state s' from s given action a.
 *
 * These transition probabilities are based on:
 * 1. Learning science research
 * 2. Educational psychology principles
 * 3. Empirical observations from adaptive learning systems
 */

import {
  MasteryLevel,
  AttentionState,
  ConfusionState,
  MotivationState,
  TeachingAction,
  BeliefDistribution,
  STATE_SPACE,
  normalizeBelief,
} from './types';

// ============================================================================
// MASTERY TRANSITIONS
// ============================================================================

/**
 * Mastery transition rates per action
 *
 * These define P(level_up | action) for each teaching action.
 * Based on Zone of Proximal Development theory.
 */
const MASTERY_TRANSITION_RATES: Partial<Record<TeachingAction, number>> = {
  // Primary learning actions
  show_content: 0.15,           // New content has moderate learning potential
  show_quiz: 0.08,              // Practice testing has learning benefits
  show_review: 0.05,            // Review strengthens but doesn't advance much

  // Remediation actions
  show_hint: 0.03,              // Hints help but don't teach deeply
  show_explanation: 0.12,       // Explanations can accelerate learning
  show_worked_example: 0.18,    // Worked examples are highly effective

  // Adaptive actions
  easier_content: 0.10,         // Right difficulty = better learning
  harder_content: 0.05,         // Challenge can lead to learning if not too hard
};

/**
 * Apply mastery transition given action
 */
export function applyMasteryTransition(
  belief: BeliefDistribution<MasteryLevel>,
  action: TeachingAction
): BeliefDistribution<MasteryLevel> {
  const rate = MASTERY_TRANSITION_RATES[action] || 0;
  if (rate === 0) return belief;

  const levels = STATE_SPACE.mastery;
  const result: BeliefDistribution<MasteryLevel> = { ...belief };

  // Shift probability mass upward (learning)
  for (let i = 0; i < levels.length - 1; i++) {
    const current = levels[i];
    const next = levels[i + 1];

    const transitionMass = belief[current] * rate;
    result[current] -= transitionMass;
    result[next] += transitionMass;
  }

  return normalizeBelief(result);
}

/**
 * Apply forgetting transition (time decay)
 *
 * @param hoursElapsed - Hours since last interaction
 * @param halfLifeHours - Half-life for forgetting (default 168 = 1 week)
 */
export function applyForgettingTransition(
  belief: BeliefDistribution<MasteryLevel>,
  hoursElapsed: number,
  halfLifeHours: number = 168
): BeliefDistribution<MasteryLevel> {
  if (hoursElapsed <= 0) return belief;

  // Exponential decay rate
  const decayRate = 1 - Math.pow(0.5, hoursElapsed / halfLifeHours);
  // Cap decay for reasonable behavior
  const cappedDecay = Math.min(0.3, decayRate);

  const levels = STATE_SPACE.mastery;
  const result: BeliefDistribution<MasteryLevel> = { ...belief };

  // Shift probability mass downward (forgetting)
  for (let i = levels.length - 1; i > 0; i--) {
    const current = levels[i];
    const prev = levels[i - 1];

    // Higher levels decay less (mastered knowledge is more stable)
    const levelFactor = 1 - i * 0.15; // mastered decays least
    const transitionMass = belief[current] * cappedDecay * Math.max(0.3, levelFactor);

    result[current] -= transitionMass;
    result[prev] += transitionMass;
  }

  return normalizeBelief(result);
}

// ============================================================================
// ATTENTION TRANSITIONS
// ============================================================================

/**
 * Attention transition probabilities
 *
 * Different actions affect attention differently.
 */
interface AttentionTransitionEffect {
  toFocused: number;
  toDistracted: number;
  toFatigued: number;
}

const ATTENTION_EFFECTS: Partial<Record<TeachingAction, AttentionTransitionEffect>> = {
  show_content: { toFocused: 0.1, toDistracted: 0.05, toFatigued: 0.02 },
  show_quiz: { toFocused: 0.2, toDistracted: 0.0, toFatigued: 0.05 },
  show_hint: { toFocused: 0.1, toDistracted: 0.0, toFatigued: 0.0 },
  encourage: { toFocused: 0.15, toDistracted: -0.1, toFatigued: -0.05 },
  suggest_break: { toFocused: 0.3, toDistracted: -0.2, toFatigued: -0.4 },
};

/**
 * Apply attention transition given action
 */
export function applyAttentionTransition(
  belief: BeliefDistribution<AttentionState>,
  action: TeachingAction
): BeliefDistribution<AttentionState> {
  const effect = ATTENTION_EFFECTS[action];
  if (!effect) return belief;

  const result: BeliefDistribution<AttentionState> = {
    focused: Math.max(0.05, belief.focused * (1 + effect.toFocused)),
    distracted: Math.max(0.05, belief.distracted * (1 + effect.toDistracted)),
    fatigued: Math.max(0.05, belief.fatigued * (1 + effect.toFatigued)),
  };

  return normalizeBelief(result);
}

/**
 * Apply time-based attention decay
 *
 * Attention naturally degrades during a session.
 */
export function applyAttentionDecay(
  belief: BeliefDistribution<AttentionState>,
  sessionMinutes: number
): BeliefDistribution<AttentionState> {
  // Attention decay accelerates after 20 minutes
  const decayFactor = sessionMinutes > 20
    ? 0.02 * (sessionMinutes - 20) / 10
    : 0;

  if (decayFactor <= 0) return belief;

  const result: BeliefDistribution<AttentionState> = {
    focused: Math.max(0.1, belief.focused * (1 - decayFactor)),
    distracted: belief.distracted * (1 + decayFactor * 0.5),
    fatigued: belief.fatigued * (1 + decayFactor * 0.5),
  };

  return normalizeBelief(result);
}

// ============================================================================
// CONFUSION TRANSITIONS
// ============================================================================

/**
 * Confusion transition effects per action
 */
interface ConfusionTransitionEffect {
  toClear: number;
  toUncertain: number;
  toConfused: number;
}

const CONFUSION_EFFECTS: Partial<Record<TeachingAction, ConfusionTransitionEffect>> = {
  // Remediation helps clear confusion
  show_hint: { toClear: 0.15, toUncertain: 0.0, toConfused: -0.1 },
  show_explanation: { toClear: 0.25, toUncertain: -0.1, toConfused: -0.2 },
  show_worked_example: { toClear: 0.35, toUncertain: -0.15, toConfused: -0.25 },

  // New content can increase confusion if struggling
  show_content: { toClear: 0.05, toUncertain: 0.05, toConfused: 0.03 },
  harder_content: { toClear: 0.0, toUncertain: 0.1, toConfused: 0.15 },

  // Easier content helps
  easier_content: { toClear: 0.15, toUncertain: -0.05, toConfused: -0.1 },

  // Review reinforces understanding
  show_review: { toClear: 0.1, toUncertain: -0.05, toConfused: -0.05 },
};

/**
 * Apply confusion transition given action
 */
export function applyConfusionTransition(
  belief: BeliefDistribution<ConfusionState>,
  action: TeachingAction
): BeliefDistribution<ConfusionState> {
  const effect = CONFUSION_EFFECTS[action];
  if (!effect) return belief;

  const result: BeliefDistribution<ConfusionState> = {
    clear: Math.max(0.05, belief.clear * (1 + effect.toClear)),
    uncertain: Math.max(0.05, belief.uncertain * (1 + effect.toUncertain)),
    confused: Math.max(0.05, belief.confused * (1 + effect.toConfused)),
  };

  return normalizeBelief(result);
}

// ============================================================================
// MOTIVATION TRANSITIONS
// ============================================================================

/**
 * Motivation transition effects per action
 */
interface MotivationTransitionEffect {
  toEngaged: number;
  toNeutral: number;
  toDisengaged: number;
}

const MOTIVATION_EFFECTS: Partial<Record<TeachingAction, MotivationTransitionEffect>> = {
  // Encouragement boosts motivation
  encourage: { toEngaged: 0.25, toNeutral: 0.0, toDisengaged: -0.2 },

  // Break helps reset
  suggest_break: { toEngaged: 0.2, toNeutral: 0.1, toDisengaged: -0.3 },

  // Appropriate challenge keeps engaged
  harder_content: { toEngaged: 0.1, toNeutral: -0.05, toDisengaged: 0.0 },
  easier_content: { toEngaged: 0.05, toNeutral: 0.0, toDisengaged: -0.05 },

  // Success helps motivation
  show_quiz: { toEngaged: 0.05, toNeutral: 0.0, toDisengaged: 0.0 },

  // Long content can tire
  show_content: { toEngaged: 0.0, toNeutral: 0.02, toDisengaged: 0.01 },
};

/**
 * Apply motivation transition given action
 */
export function applyMotivationTransition(
  belief: BeliefDistribution<MotivationState>,
  action: TeachingAction
): BeliefDistribution<MotivationState> {
  const effect = MOTIVATION_EFFECTS[action];
  if (!effect) return belief;

  const result: BeliefDistribution<MotivationState> = {
    engaged: Math.max(0.05, belief.engaged * (1 + effect.toEngaged)),
    neutral: Math.max(0.05, belief.neutral * (1 + effect.toNeutral)),
    disengaged: Math.max(0.05, belief.disengaged * (1 + effect.toDisengaged)),
  };

  return normalizeBelief(result);
}

/**
 * Apply motivation boost from success
 */
export function applySuccessBoost(
  belief: BeliefDistribution<MotivationState>,
  consecutiveCorrect: number
): BeliefDistribution<MotivationState> {
  if (consecutiveCorrect <= 0) return belief;

  // Success streaks boost motivation
  const boost = Math.min(0.3, consecutiveCorrect * 0.05);

  const result: BeliefDistribution<MotivationState> = {
    engaged: belief.engaged * (1 + boost),
    neutral: belief.neutral * (1 - boost * 0.3),
    disengaged: belief.disengaged * (1 - boost * 0.5),
  };

  return normalizeBelief(result);
}

/**
 * Apply motivation penalty from failure
 */
export function applyFailurePenalty(
  belief: BeliefDistribution<MotivationState>,
  consecutiveWrong: number
): BeliefDistribution<MotivationState> {
  if (consecutiveWrong <= 0) return belief;

  // Wrong streaks hurt motivation
  const penalty = Math.min(0.4, consecutiveWrong * 0.08);

  const result: BeliefDistribution<MotivationState> = {
    engaged: belief.engaged * (1 - penalty),
    neutral: belief.neutral * (1 + penalty * 0.2),
    disengaged: belief.disengaged * (1 + penalty * 0.5),
  };

  return normalizeBelief(result);
}

// ============================================================================
// COMBINED TRANSITION
// ============================================================================

import { FactoredBelief } from './types';

/**
 * Apply all transitions for an action
 */
export function applyAllTransitions(
  belief: FactoredBelief,
  action: TeachingAction,
  context?: {
    sessionMinutes?: number;
    hoursElapsed?: number;
    consecutiveCorrect?: number;
    consecutiveWrong?: number;
  }
): FactoredBelief {
  let mastery = applyMasteryTransition(belief.mastery, action);
  let attention = applyAttentionTransition(belief.attention, action);
  const confusion = applyConfusionTransition(belief.confusion, action);
  let motivation = applyMotivationTransition(belief.motivation, action);

  // Apply context-based transitions
  if (context) {
    if (context.sessionMinutes) {
      attention = applyAttentionDecay(attention, context.sessionMinutes);
    }

    if (context.hoursElapsed) {
      mastery = applyForgettingTransition(mastery, context.hoursElapsed);
    }

    if (context.consecutiveCorrect) {
      motivation = applySuccessBoost(motivation, context.consecutiveCorrect);
    }

    if (context.consecutiveWrong) {
      motivation = applyFailurePenalty(motivation, context.consecutiveWrong);
    }
  }

  return {
    mastery,
    attention,
    confusion,
    motivation,
    skillId: belief.skillId,
    lastUpdated: new Date(),
    observationCount: belief.observationCount,
  };
}

/**
 * Get expected transition effect for planning
 */
export function getTransitionEffect(
  action: TeachingAction
): {
  masteryGain: number;
  attentionEffect: number;
  confusionReduction: number;
  motivationEffect: number;
} {
  const masteryRate = MASTERY_TRANSITION_RATES[action] || 0;
  const attentionEffect = ATTENTION_EFFECTS[action];
  const confusionEffect = CONFUSION_EFFECTS[action];
  const motivationEffect = MOTIVATION_EFFECTS[action];

  return {
    masteryGain: masteryRate,
    attentionEffect: attentionEffect?.toFocused || 0,
    confusionReduction: confusionEffect?.toClear || 0,
    motivationEffect: motivationEffect?.toEngaged || 0,
  };
}
