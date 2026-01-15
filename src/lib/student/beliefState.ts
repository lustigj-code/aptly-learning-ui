/**
 * Belief State Manager
 *
 * Manages probability distributions over hidden student states.
 * Uses Bayesian updates to refine beliefs based on observations.
 *
 * Key operations:
 * - Create initial belief states
 * - Update beliefs given observations (Bayesian inference)
 * - Persist and retrieve belief states
 */

import {
  FactoredBelief,
  BeliefDistribution,
  MasteryLevel,
  AttentionState,
  ConfusionState,
  MotivationState,
  TeachingAction,
  StudentObservation,
  ObservationFeatures,
  INITIAL_MASTERY_BELIEF,
  INITIAL_ATTENTION_BELIEF,
  INITIAL_CONFUSION_BELIEF,
  INITIAL_MOTIVATION_BELIEF,
  STATE_SPACE,
  normalizeBelief,
  beliefEntropy,
} from './types';

// ============================================================================
// BELIEF STATE CREATION
// ============================================================================

/**
 * Create a new belief state for a skill
 */
export function createInitialBelief(skillId: string): FactoredBelief {
  return {
    mastery: { ...INITIAL_MASTERY_BELIEF },
    attention: { ...INITIAL_ATTENTION_BELIEF },
    confusion: { ...INITIAL_CONFUSION_BELIEF },
    motivation: { ...INITIAL_MOTIVATION_BELIEF },
    skillId,
    lastUpdated: new Date(),
    observationCount: 0,
  };
}

/**
 * Create belief from BKT state (for migration/interoperability)
 */
export function createBeliefFromBKT(
  skillId: string,
  pMastery: number
): FactoredBelief {
  // Map continuous BKT mastery to discrete levels
  const masteryBelief = scalarToMasteryBelief(pMastery);

  return {
    mastery: masteryBelief,
    attention: { ...INITIAL_ATTENTION_BELIEF },
    confusion: { ...INITIAL_CONFUSION_BELIEF },
    motivation: { ...INITIAL_MOTIVATION_BELIEF },
    skillId,
    lastUpdated: new Date(),
    observationCount: 0,
  };
}

/**
 * Convert scalar mastery (0-1) to belief distribution
 */
function scalarToMasteryBelief(pMastery: number): BeliefDistribution<MasteryLevel> {
  // Use a soft assignment based on mastery level
  // Higher mastery concentrates probability on higher levels
  const belief: BeliefDistribution<MasteryLevel> = {
    novice: 0,
    beginner: 0,
    developing: 0,
    proficient: 0,
    mastered: 0,
  };

  // Boundaries for levels
  const boundaries = [
    { level: 'novice' as const, center: 0.1, width: 0.15 },
    { level: 'beginner' as const, center: 0.3, width: 0.15 },
    { level: 'developing' as const, center: 0.5, width: 0.15 },
    { level: 'proficient' as const, center: 0.75, width: 0.15 },
    { level: 'mastered' as const, center: 0.95, width: 0.1 },
  ];

  for (const { level, center, width } of boundaries) {
    // Gaussian-like assignment
    const distance = Math.abs(pMastery - center);
    belief[level] = Math.exp(-(distance * distance) / (2 * width * width));
  }

  return normalizeBelief(belief);
}

// ============================================================================
// OBSERVATION PROCESSING
// ============================================================================

/**
 * Extract features from raw observation
 */
export function processObservation(obs: StudentObservation): ObservationFeatures {
  return {
    correctness: obs.isCorrect === undefined ? NaN : obs.isCorrect ? 1 : 0,
    responseSpeed: normalizeResponseTime(obs.responseTimeMs),
    engagement: calculateEngagement(obs),
    helpSeeking: calculateHelpSeeking(obs),
    sessionFatigue: calculateSessionFatigue(obs),
  };
}

function normalizeResponseTime(timeMs?: number): number {
  if (timeMs === undefined) return 0.5;

  // Normalize: <5s = fast (1.0), 5-30s = medium (0.5), >30s = slow (0.0)
  if (timeMs < 5000) return 1.0;
  if (timeMs > 30000) return 0.0;
  return 1.0 - (timeMs - 5000) / 25000;
}

function calculateEngagement(obs: StudentObservation): number {
  let score = 0.5;
  let factors = 0;

  if (obs.contentCompletionPercent !== undefined) {
    score += obs.contentCompletionPercent / 100;
    factors++;
  }

  if (obs.scrollDepth !== undefined) {
    score += obs.scrollDepth;
    factors++;
  }

  if (obs.skippedContent) {
    score -= 0.3;
  }

  return factors > 0 ? Math.max(0, Math.min(1, score / factors)) : 0.5;
}

function calculateHelpSeeking(obs: StudentObservation): number {
  let score = 0;

  if (obs.requestedHelp) score += 0.4;
  if (obs.hintViewed) score += 0.3;
  if (obs.explanationViewed) score += 0.3;

  return Math.min(1, score);
}

function calculateSessionFatigue(obs: StudentObservation): number {
  let fatigue = 0;

  // Time-based fatigue
  if (obs.sessionDurationMs !== undefined) {
    // Fatigue increases after 20 minutes
    const minutes = obs.sessionDurationMs / 60000;
    if (minutes > 20) {
      fatigue += Math.min(0.5, (minutes - 20) / 40);
    }
  }

  // Interaction-based fatigue
  if (obs.interactionCount !== undefined && obs.interactionCount > 30) {
    fatigue += Math.min(0.3, (obs.interactionCount - 30) / 50);
  }

  // Pause-based fatigue indicator
  if (obs.pauseCount !== undefined && obs.pauseCount > 3) {
    fatigue += 0.2;
  }

  return Math.min(1, fatigue);
}

// ============================================================================
// BAYESIAN BELIEF UPDATE
// ============================================================================

/**
 * Update belief state given an observation
 *
 * Uses Bayes' rule: P(s|o) ∝ P(o|s) * P(s)
 */
export function updateBelief(
  currentBelief: FactoredBelief,
  observation: StudentObservation,
  action: TeachingAction
): FactoredBelief {
  const features = processObservation(observation);

  return {
    mastery: updateMasteryBelief(currentBelief.mastery, features, action),
    attention: updateAttentionBelief(currentBelief.attention, features),
    confusion: updateConfusionBelief(currentBelief.confusion, features, action),
    motivation: updateMotivationBelief(currentBelief.motivation, features),
    skillId: currentBelief.skillId,
    lastUpdated: new Date(),
    observationCount: currentBelief.observationCount + 1,
  };
}

/**
 * Update mastery belief using observation likelihood
 */
function updateMasteryBelief(
  prior: BeliefDistribution<MasteryLevel>,
  features: ObservationFeatures,
  action: TeachingAction
): BeliefDistribution<MasteryLevel> {
  if (isNaN(features.correctness)) {
    // No quiz observation - apply learning transition only
    return applyLearningTransition(prior, action);
  }

  const posterior: BeliefDistribution<MasteryLevel> = { ...prior };

  // Observation likelihood P(correct | mastery_level)
  const correctLikelihood: Record<MasteryLevel, number> = {
    novice: 0.25,      // Guessing
    beginner: 0.4,
    developing: 0.6,
    proficient: 0.8,
    mastered: 0.95,
  };

  // Bayes update
  for (const level of STATE_SPACE.mastery) {
    const pCorrect = correctLikelihood[level];
    const likelihood = features.correctness === 1 ? pCorrect : (1 - pCorrect);
    posterior[level] = prior[level] * likelihood;
  }

  // Normalize and apply learning transition
  const normalized = normalizeBelief(posterior);
  return applyLearningTransition(normalized, action);
}

/**
 * Apply learning transition (mastery can increase after learning actions)
 */
function applyLearningTransition(
  belief: BeliefDistribution<MasteryLevel>,
  action: TeachingAction
): BeliefDistribution<MasteryLevel> {
  // Learning rate depends on action
  const learningRates: Partial<Record<TeachingAction, number>> = {
    show_content: 0.1,
    show_explanation: 0.15,
    show_worked_example: 0.2,
    show_quiz: 0.05, // Small learning from practice
    show_review: 0.03,
  };

  const rate = learningRates[action] || 0;
  if (rate === 0) return belief;

  // Shift probability mass upward
  const levels = STATE_SPACE.mastery;
  const shifted: BeliefDistribution<MasteryLevel> = { ...belief };

  for (let i = 0; i < levels.length - 1; i++) {
    const currentLevel = levels[i];
    const nextLevel = levels[i + 1];

    const transition = belief[currentLevel] * rate;
    shifted[currentLevel] -= transition;
    shifted[nextLevel] += transition;
  }

  return normalizeBelief(shifted);
}

/**
 * Update attention belief
 */
function updateAttentionBelief(
  prior: BeliefDistribution<AttentionState>,
  features: ObservationFeatures
): BeliefDistribution<AttentionState> {
  const posterior: BeliefDistribution<AttentionState> = { ...prior };

  // Fast response suggests focused attention
  if (features.responseSpeed > 0.7) {
    posterior.focused *= 1.3;
    posterior.distracted *= 0.8;
  } else if (features.responseSpeed < 0.3) {
    posterior.focused *= 0.8;
    posterior.distracted *= 1.2;
    posterior.fatigued *= 1.1;
  }

  // High engagement suggests focus
  if (features.engagement > 0.7) {
    posterior.focused *= 1.2;
  } else if (features.engagement < 0.3) {
    posterior.distracted *= 1.2;
  }

  // Session fatigue
  if (features.sessionFatigue > 0.5) {
    posterior.fatigued *= 1.5;
    posterior.focused *= 0.7;
  }

  return normalizeBelief(posterior);
}

/**
 * Update confusion belief
 */
function updateConfusionBelief(
  prior: BeliefDistribution<ConfusionState>,
  features: ObservationFeatures,
  action: TeachingAction
): BeliefDistribution<ConfusionState> {
  const posterior: BeliefDistribution<ConfusionState> = { ...prior };

  // Help-seeking suggests confusion
  if (features.helpSeeking > 0.5) {
    posterior.confused *= 1.4;
    posterior.uncertain *= 1.2;
    posterior.clear *= 0.7;
  }

  // Correct answer reduces confusion belief
  if (!isNaN(features.correctness)) {
    if (features.correctness === 1) {
      posterior.clear *= 1.3;
      posterior.confused *= 0.7;
    } else {
      posterior.confused *= 1.2;
      posterior.clear *= 0.9;
    }
  }

  // Explanations help clear confusion
  if (action === 'show_explanation' || action === 'show_worked_example') {
    posterior.clear *= 1.2;
    posterior.confused *= 0.8;
  }

  return normalizeBelief(posterior);
}

/**
 * Update motivation belief
 */
function updateMotivationBelief(
  prior: BeliefDistribution<MotivationState>,
  features: ObservationFeatures
): BeliefDistribution<MotivationState> {
  const posterior: BeliefDistribution<MotivationState> = { ...prior };

  // Engagement signals motivation
  if (features.engagement > 0.7) {
    posterior.engaged *= 1.3;
    posterior.disengaged *= 0.7;
  } else if (features.engagement < 0.3) {
    posterior.disengaged *= 1.4;
    posterior.engaged *= 0.7;
  }

  // Correct answers boost motivation
  if (!isNaN(features.correctness)) {
    if (features.correctness === 1) {
      posterior.engaged *= 1.1;
      posterior.disengaged *= 0.9;
    } else {
      // Wrong answers can hurt motivation
      posterior.engaged *= 0.95;
      posterior.neutral *= 1.05;
    }
  }

  // Session fatigue affects motivation
  if (features.sessionFatigue > 0.6) {
    posterior.disengaged *= 1.3;
    posterior.engaged *= 0.8;
  }

  return normalizeBelief(posterior);
}

// ============================================================================
// BELIEF ANALYSIS
// ============================================================================

/**
 * Check if student is likely struggling
 */
export function isLikelyStruggling(belief: FactoredBelief): boolean {
  return (
    belief.confusion.confused > 0.4 ||
    belief.mastery.novice > 0.4 ||
    (belief.mastery.novice + belief.mastery.beginner) > 0.6
  );
}

/**
 * Check if student is likely disengaging
 */
export function isLikelyDisengaging(belief: FactoredBelief): boolean {
  return (
    belief.motivation.disengaged > 0.4 ||
    belief.attention.fatigued > 0.4 ||
    belief.attention.distracted > 0.5
  );
}

/**
 * Check if student is ready for a challenge
 */
export function isReadyForChallenge(belief: FactoredBelief): boolean {
  return (
    belief.mastery.proficient > 0.3 ||
    belief.mastery.mastered > 0.2
  ) && (
    belief.motivation.engaged > 0.4 &&
    belief.attention.focused > 0.4
  );
}

/**
 * Get overall confidence in the belief state
 *
 * Lower entropy = more confident
 */
export function getBeliefConfidence(belief: FactoredBelief): number {
  // Calculate average entropy across dimensions
  const masteryEntropy = beliefEntropy(belief.mastery);
  const attentionEntropy = beliefEntropy(belief.attention);
  const confusionEntropy = beliefEntropy(belief.confusion);
  const motivationEntropy = beliefEntropy(belief.motivation);

  // Max entropy for each dimension
  const maxMasteryEntropy = Math.log2(5); // 5 levels
  const maxAttentionEntropy = Math.log2(3); // 3 states
  const maxConfusionEntropy = Math.log2(3);
  const maxMotivationEntropy = Math.log2(3);

  // Normalize and average
  const normalizedMastery = 1 - masteryEntropy / maxMasteryEntropy;
  const normalizedAttention = 1 - attentionEntropy / maxAttentionEntropy;
  const normalizedConfusion = 1 - confusionEntropy / maxConfusionEntropy;
  const normalizedMotivation = 1 - motivationEntropy / maxMotivationEntropy;

  // Weight mastery more heavily
  return (
    normalizedMastery * 0.4 +
    normalizedAttention * 0.2 +
    normalizedConfusion * 0.2 +
    normalizedMotivation * 0.2
  );
}

// ============================================================================
// IN-MEMORY STORAGE (Production would use Firestore)
// ============================================================================

const beliefCache = new Map<string, FactoredBelief>();

/**
 * Get or create belief for a user-skill pair
 */
export function getOrCreateBelief(userId: string, skillId: string): FactoredBelief {
  const key = `${userId}:${skillId}`;
  let belief = beliefCache.get(key);

  if (!belief) {
    belief = createInitialBelief(skillId);
    beliefCache.set(key, belief);
  }

  return belief;
}

/**
 * Save updated belief
 */
export function saveBelief(userId: string, belief: FactoredBelief): void {
  const key = `${userId}:${belief.skillId}`;
  beliefCache.set(key, belief);
}

/**
 * Get all beliefs for a user
 */
export function getAllBeliefs(userId: string): Map<string, FactoredBelief> {
  const userBeliefs = new Map<string, FactoredBelief>();

  for (const [key, belief] of beliefCache.entries()) {
    if (key.startsWith(`${userId}:`)) {
      userBeliefs.set(belief.skillId, belief);
    }
  }

  return userBeliefs;
}

/**
 * Clear cache (for testing)
 */
export function clearBeliefCache(): void {
  beliefCache.clear();
}
