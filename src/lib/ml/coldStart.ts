/**
 * Cold-Start Logic for Hybrid Model
 *
 * Manages the transition from BKT-only to hybrid model based on user interaction count.
 * For first 10-20 interactions: use BKT only (hybrid too noisy)
 * After 20+ interactions: gradually transition to hybrid
 *
 * Part of Phase 15.2: Hybrid Model Integration
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ModelWeight {
  bkt: number;    // Weight for BKT model (0-1)
  hybrid: number; // Weight for hybrid model (0-1)
}

export interface ColdStartConfig {
  /** Minimum interactions before considering hybrid (default: 10) */
  coldStartThreshold: number;
  /** Interactions at which hybrid is fully weighted (default: 20) */
  warmUpThreshold: number;
  /** Final BKT weight after warm-up (default: 0.2) */
  finalBktWeight: number;
  /** Transition curve type */
  transitionCurve: 'linear' | 'sigmoid' | 'exponential';
}

export interface ColdStartState {
  userId: string;
  interactionCount: number;
  weights: ModelWeight;
  phase: 'cold_start' | 'warming_up' | 'warm';
  phaseDescription: string;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

export const DEFAULT_COLD_START_CONFIG: ColdStartConfig = {
  coldStartThreshold: 10,  // Pure BKT for first 10 interactions
  warmUpThreshold: 20,     // Full hybrid at 20+ interactions
  finalBktWeight: 0.2,     // Keep 20% BKT for stability
  transitionCurve: 'linear',
};

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Calculate model weights based on interaction count
 *
 * @param interactionCount - Number of interactions for this user
 * @param config - Cold-start configuration
 * @returns Model weights for BKT and hybrid
 *
 * Weight distribution:
 * - 0-10 interactions: { bkt: 1.0, hybrid: 0.0 }
 * - 10-20 interactions: linear interpolation
 * - 20+ interactions: { bkt: 0.2, hybrid: 0.8 }
 */
export function getModelWeight(
  interactionCount: number,
  config: ColdStartConfig = DEFAULT_COLD_START_CONFIG
): ModelWeight {
  const { coldStartThreshold, warmUpThreshold, finalBktWeight, transitionCurve } = config;

  // Phase 1: Cold start - pure BKT
  if (interactionCount < coldStartThreshold) {
    return { bkt: 1.0, hybrid: 0.0 };
  }

  // Phase 3: Warm - mostly hybrid
  if (interactionCount >= warmUpThreshold) {
    return { bkt: finalBktWeight, hybrid: 1 - finalBktWeight };
  }

  // Phase 2: Warming up - interpolation
  const progress = (interactionCount - coldStartThreshold) / (warmUpThreshold - coldStartThreshold);
  const hybridWeight = applyTransitionCurve(progress, transitionCurve) * (1 - finalBktWeight);
  const bktWeight = 1 - hybridWeight;

  return {
    bkt: Math.max(finalBktWeight, Math.min(1, bktWeight)),
    hybrid: Math.max(0, Math.min(1 - finalBktWeight, hybridWeight)),
  };
}

/**
 * Apply transition curve to progress value
 */
function applyTransitionCurve(
  progress: number,
  curve: 'linear' | 'sigmoid' | 'exponential'
): number {
  switch (curve) {
    case 'sigmoid':
      // Smooth S-curve transition
      return 1 / (1 + Math.exp(-10 * (progress - 0.5)));

    case 'exponential':
      // Slow start, fast finish
      return Math.pow(progress, 2);

    case 'linear':
    default:
      return progress;
  }
}

/**
 * Get the current cold-start phase for a user
 *
 * @param interactionCount - Number of interactions
 * @param config - Cold-start configuration
 * @returns Phase information
 */
export function getColdStartPhase(
  interactionCount: number,
  config: ColdStartConfig = DEFAULT_COLD_START_CONFIG
): 'cold_start' | 'warming_up' | 'warm' {
  if (interactionCount < config.coldStartThreshold) {
    return 'cold_start';
  }
  if (interactionCount < config.warmUpThreshold) {
    return 'warming_up';
  }
  return 'warm';
}

/**
 * Get full cold-start state for a user
 *
 * @param userId - User identifier
 * @param interactionCount - Number of interactions
 * @param config - Cold-start configuration
 * @returns Complete cold-start state
 */
export function getColdStartState(
  userId: string,
  interactionCount: number,
  config: ColdStartConfig = DEFAULT_COLD_START_CONFIG
): ColdStartState {
  const weights = getModelWeight(interactionCount, config);
  const phase = getColdStartPhase(interactionCount, config);

  let phaseDescription: string;
  switch (phase) {
    case 'cold_start':
      phaseDescription = `Pure BKT mode (${interactionCount}/${config.coldStartThreshold} interactions to warm-up)`;
      break;
    case 'warming_up':
      const progress = Math.round(
        ((interactionCount - config.coldStartThreshold) /
          (config.warmUpThreshold - config.coldStartThreshold)) * 100
      );
      phaseDescription = `Transitioning to hybrid (${progress}% complete, ${weights.hybrid * 100}% hybrid weight)`;
      break;
    case 'warm':
      phaseDescription = `Full hybrid mode (${Math.round(weights.hybrid * 100)}% hybrid, ${Math.round(weights.bkt * 100)}% BKT)`;
      break;
  }

  return {
    userId,
    interactionCount,
    weights,
    phase,
    phaseDescription,
  };
}

/**
 * Calculate interactions needed to reach warm phase
 *
 * @param currentCount - Current interaction count
 * @param config - Cold-start configuration
 * @returns Number of interactions needed (0 if already warm)
 */
export function interactionsToWarm(
  currentCount: number,
  config: ColdStartConfig = DEFAULT_COLD_START_CONFIG
): number {
  return Math.max(0, config.warmUpThreshold - currentCount);
}

/**
 * Check if user has enough data for hybrid model
 *
 * @param interactionCount - Number of interactions
 * @param config - Cold-start configuration
 * @returns true if hybrid can be used (even partially)
 */
export function canUseHybridModel(
  interactionCount: number,
  config: ColdStartConfig = DEFAULT_COLD_START_CONFIG
): boolean {
  return interactionCount >= config.coldStartThreshold;
}

/**
 * Blend two predictions based on model weights
 *
 * @param bktPrediction - BKT model prediction (0-1)
 * @param hybridPrediction - Hybrid model prediction (0-1)
 * @param weights - Model weights
 * @returns Blended prediction
 */
export function blendPredictions(
  bktPrediction: number,
  hybridPrediction: number,
  weights: ModelWeight
): number {
  // Normalize weights (should already sum to 1, but ensure)
  const totalWeight = weights.bkt + weights.hybrid;
  const normalizedBkt = weights.bkt / totalWeight;
  const normalizedHybrid = weights.hybrid / totalWeight;

  return normalizedBkt * bktPrediction + normalizedHybrid * hybridPrediction;
}

// ============================================================================
// SKILL-SPECIFIC COLD START
// ============================================================================

export interface SkillColdStartState extends ColdStartState {
  skillId: string;
}

/**
 * Get cold-start state for a specific skill
 *
 * Users may have different interaction counts per skill.
 * This allows skill-specific model selection.
 *
 * @param userId - User identifier
 * @param skillId - Skill identifier
 * @param skillInteractionCount - Interactions for this specific skill
 * @param config - Cold-start configuration
 * @returns Skill-specific cold-start state
 */
export function getSkillColdStartState(
  userId: string,
  skillId: string,
  skillInteractionCount: number,
  config: ColdStartConfig = DEFAULT_COLD_START_CONFIG
): SkillColdStartState {
  const baseState = getColdStartState(userId, skillInteractionCount, config);
  return {
    ...baseState,
    skillId,
  };
}

// ============================================================================
// CONFIGURATION HELPERS
// ============================================================================

/**
 * Create a custom cold-start configuration
 *
 * @param overrides - Partial configuration to override defaults
 * @returns Complete configuration
 */
export function createColdStartConfig(
  overrides: Partial<ColdStartConfig>
): ColdStartConfig {
  return {
    ...DEFAULT_COLD_START_CONFIG,
    ...overrides,
  };
}

/**
 * Aggressive configuration - faster transition to hybrid
 */
export const AGGRESSIVE_COLD_START_CONFIG: ColdStartConfig = {
  coldStartThreshold: 5,
  warmUpThreshold: 15,
  finalBktWeight: 0.1,
  transitionCurve: 'exponential',
};

/**
 * Conservative configuration - slower transition, more BKT
 */
export const CONSERVATIVE_COLD_START_CONFIG: ColdStartConfig = {
  coldStartThreshold: 15,
  warmUpThreshold: 30,
  finalBktWeight: 0.3,
  transitionCurve: 'sigmoid',
};
