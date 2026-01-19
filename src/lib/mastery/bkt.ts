/**
 * Bayesian Knowledge Tracing (BKT) Implementation
 *
 * Models learning as a Hidden Markov Model:
 * - Hidden state: Does the learner know this skill? (binary: mastered or not)
 * - Observable: Did they get the question right?
 * - We update P(mastery) after each observation using Bayes' rule
 *
 * Four parameters per skill:
 * - P(L0): Prior probability they already know it (0.0-0.3)
 * - P(T): Probability of learning on each attempt (0.1-0.4)
 * - P(G): Probability of guessing correctly despite not knowing (0.0-0.3)
 * - P(S): Probability of slipping (wrong despite knowing) (0.0-0.2)
 *
 * SCALE CONVENTIONS (ALL VALUES ARE 0-1 PROBABILITIES):
 * - pMastery: 0-1 scale (probability of mastery, e.g., 0.95 = 95% likely mastered)
 * - pL0, pT, pG, pS: 0-1 scale (BKT parameters as probabilities)
 * - threshold: 0-1 scale (mastery threshold, default 0.95)
 *
 * NOTE: BKT uses 0-1 scale while FSRS masteryLevel uses 0-100 scale.
 * Convert with: bktValue * 100 = fsrsScale, or fsrsValue / 100 = bktScale
 */

// ============================================
// TYPES
// ============================================

export interface BKTParameters {
  pL0: number; // Prior probability of initial mastery (0.0-0.3)
  pT: number;  // Probability of learning (transition to mastery) (0.1-0.4)
  pG: number;  // Probability of guessing correctly (0.0-0.3)
  pS: number;  // Probability of slipping (error despite knowing) (0.0-0.2)
}

export interface SkillState {
  skillId: string;
  pMastery: number; // Current P(mastery) - key output
  attempts: number;
  correctCount: number;
  lastAttempt: Date;
  history: SkillHistoryEntry[];
}

export interface SkillHistoryEntry {
  timestamp: Date;
  correct: boolean;
  pMasteryAfter: number;
}

export interface Skill {
  id: string;
  name: string;
  lessonId: string;
  prerequisites: string[]; // skill IDs that must be mastered first
  bktParams: BKTParameters; // parameters for this skill
}

export interface SkillMap {
  skills: Record<string, Skill>;
}

// ============================================
// DEFAULT PARAMETERS
// ============================================

/**
 * Default BKT parameters for a typical skill
 * These are reasonable starting values based on BKT research
 */
export const DEFAULT_BKT_PARAMS: BKTParameters = {
  pL0: 0.1,  // 10% chance they already know it
  pT: 0.3,   // 30% chance of learning per attempt
  pG: 0.25,  // 25% chance of guessing (4-option MCQ baseline)
  pS: 0.1,   // 10% chance of slip
};

/**
 * Parameters for easier skills (foundational concepts)
 */
export const EASY_BKT_PARAMS: BKTParameters = {
  pL0: 0.2,  // Higher prior - more likely to already know
  pT: 0.4,   // Faster learning rate
  pG: 0.25,  // Standard guess rate
  pS: 0.05,  // Lower slip rate
};

/**
 * Parameters for harder skills (advanced concepts)
 */
export const HARD_BKT_PARAMS: BKTParameters = {
  pL0: 0.05, // Lower prior - less likely to already know
  pT: 0.2,   // Slower learning rate
  pG: 0.2,   // Slightly lower guess rate (harder questions)
  pS: 0.15,  // Higher slip rate (more complex)
};

// ============================================================================
// CONTENT-TYPE SPECIFIC PARAMETERS (Research Enhancement)
// ============================================================================

/**
 * Content type for BKT parameter selection
 *
 * Research shows different content types have different learning patterns:
 * - Conceptual: Slow acquisition, hard to guess, stable once learned
 * - Procedural: Medium acquisition, practice-dependent
 * - Factual: Fast acquisition, easy to guess, prone to forgetting
 */
export type ContentType = 'conceptual' | 'procedural' | 'factual';

/**
 * Content-type specific BKT parameters
 *
 * Based on research from ASSISTments and EdNet datasets.
 * Source: Aptly Deep Research (166 sources)
 */
export const BKT_BY_CONTENT: Record<ContentType, BKTParameters> = {
  conceptual: {
    pL0: 0.05,  // Concepts rarely pre-known
    pT: 0.20,   // Slower acquisition
    pG: 0.15,   // Harder to guess
    pS: 0.10,   // Stable once learned
  },
  procedural: {
    pL0: 0.10,  // Some prior exposure possible
    pT: 0.30,   // Medium acquisition with practice
    pG: 0.20,   // Standard guess rate
    pS: 0.15,   // More slips under pressure
  },
  factual: {
    pL0: 0.15,  // Facts more likely pre-known
    pT: 0.35,   // Fast memorization
    pG: 0.25,   // Easy to guess (recognition)
    pS: 0.05,   // Few slips if truly known
  },
};

/**
 * Research-backed parameter ranges for validation
 *
 * Parameters outside these ranges may indicate misconfiguration.
 * Source: BKT literature review, Aptly Deep Research
 */
export const BKT_RANGES = {
  pL0: { min: 0.0, max: 0.3, description: 'Initial mastery probability' },
  pT:  { min: 0.1, max: 0.4, description: 'Learning rate per opportunity' },
  pG:  { min: 0.0, max: 0.3, description: 'Guess probability ceiling' },
  pS:  { min: 0.0, max: 0.2, description: 'Slip probability floor' },
};

/**
 * Validate BKT parameters are within research-backed ranges
 */
export function validateBKTParams(params: BKTParameters): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  for (const [key, range] of Object.entries(BKT_RANGES)) {
    const value = params[key as keyof BKTParameters];
    if (value < range.min || value > range.max) {
      errors.push(
        `${key} (${value}) outside valid range [${range.min}, ${range.max}]: ${range.description}`
      );
    }
  }

  // Additional constraint: P(G) + P(S) should be < 0.5 for identifiability
  if (params.pG + params.pS >= 0.5) {
    errors.push(
      `P(G) + P(S) = ${params.pG + params.pS} >= 0.5: Model may be unidentifiable`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get BKT parameters for a skill based on content type
 */
export function getParamsForContentType(
  contentType: ContentType
): BKTParameters {
  return BKT_BY_CONTENT[contentType] || DEFAULT_BKT_PARAMS;
}

/**
 * Detect content type from skill metadata (heuristic)
 */
export function inferContentType(skillName: string, skillDescription?: string): ContentType {
  const text = `${skillName} ${skillDescription || ''}`.toLowerCase();

  // Conceptual indicators
  if (
    text.includes('understand') ||
    text.includes('concept') ||
    text.includes('theory') ||
    text.includes('principle') ||
    text.includes('relationship')
  ) {
    return 'conceptual';
  }

  // Procedural indicators
  if (
    text.includes('apply') ||
    text.includes('calculate') ||
    text.includes('perform') ||
    text.includes('procedure') ||
    text.includes('step')
  ) {
    return 'procedural';
  }

  // Factual indicators
  if (
    text.includes('define') ||
    text.includes('identify') ||
    text.includes('name') ||
    text.includes('list') ||
    text.includes('recall')
  ) {
    return 'factual';
  }

  // Default to procedural (middle ground)
  return 'procedural';
}

// ============================================
// MASTERY THRESHOLD
// ============================================

/**
 * Default threshold for considering a skill "mastered"
 * A skill is mastered when P(mastery) >= 0.95 (95%)
 */
export const DEFAULT_MASTERY_THRESHOLD = 0.95;

// ============================================
// CORE BKT FUNCTIONS
// ============================================

/**
 * Update mastery after an attempt using Bayes' rule
 *
 * The update formula:
 * If correct:
 *   P(L|correct) = P(L) * (1 - P(S)) / P(correct)
 *   where P(correct) = P(L) * (1 - P(S)) + (1 - P(L)) * P(G)
 *
 * If incorrect:
 *   P(L|incorrect) = P(L) * P(S) / P(incorrect)
 *   where P(incorrect) = P(L) * P(S) + (1 - P(L)) * (1 - P(G))
 *
 * After observation update, apply learning:
 *   P(L_new) = P(L|observation) + (1 - P(L|observation)) * P(T)
 */
export function updateMastery(
  currentState: SkillState,
  correct: boolean,
  params: BKTParameters = DEFAULT_BKT_PARAMS
): SkillState {
  const { pT, pG, pS } = params;
  const pL = currentState.pMastery;

  let pLGivenObs: number;

  if (correct) {
    // Bayes update for correct answer
    const pCorrect = pL * (1 - pS) + (1 - pL) * pG;
    // Avoid division by zero
    if (pCorrect <= 0) {
      pLGivenObs = pL;
    } else {
      pLGivenObs = (pL * (1 - pS)) / pCorrect;
    }
  } else {
    // Bayes update for incorrect answer
    const pIncorrect = pL * pS + (1 - pL) * (1 - pG);
    // Avoid division by zero
    if (pIncorrect <= 0) {
      pLGivenObs = pL;
    } else {
      pLGivenObs = (pL * pS) / pIncorrect;
    }
  }

  // Apply learning: even if you got it wrong, you might have learned
  const pLNew = pLGivenObs + (1 - pLGivenObs) * pT;

  // Clamp to valid probability range
  const clampedPMastery = Math.max(0, Math.min(1, pLNew));

  const now = new Date();

  return {
    ...currentState,
    pMastery: clampedPMastery,
    attempts: currentState.attempts + 1,
    correctCount: currentState.correctCount + (correct ? 1 : 0),
    lastAttempt: now,
    history: [
      ...currentState.history.slice(-19), // Keep last 20 entries
      {
        timestamp: now,
        correct,
        pMasteryAfter: clampedPMastery,
      },
    ],
  };
}

/**
 * Predict probability of correct answer given current state
 *
 * P(correct) = P(L) * (1 - P(S)) + (1 - P(L)) * P(G)
 */
export function predictCorrect(
  pMastery: number,
  params: BKTParameters = DEFAULT_BKT_PARAMS
): number {
  const { pG, pS } = params;
  return pMastery * (1 - pS) + (1 - pMastery) * pG;
}

/**
 * Check if skill is considered "mastered"
 * Default threshold is 95% (P(mastery) >= 0.95)
 */
export function isMastered(
  state: SkillState,
  threshold: number = DEFAULT_MASTERY_THRESHOLD
): boolean {
  return state.pMastery >= threshold;
}

/**
 * Check if a skill is unlocked (all prerequisites are mastered)
 */
export function isSkillUnlocked(
  skillId: string,
  skillMap: SkillMap,
  allStates: Record<string, SkillState>,
  threshold: number = DEFAULT_MASTERY_THRESHOLD
): boolean {
  const skill = skillMap.skills[skillId];
  if (!skill) return false;

  // No prerequisites = always unlocked
  if (skill.prerequisites.length === 0) return true;

  // Check all prerequisites are mastered
  return skill.prerequisites.every((prereqId) => {
    const prereqState = allStates[prereqId];
    return prereqState && isMastered(prereqState, threshold);
  });
}

/**
 * Get all skills ready to learn (prerequisites mastered, skill not yet mastered)
 */
export function getReadySkills(
  skillMap: SkillMap,
  allStates: Record<string, SkillState>,
  threshold: number = DEFAULT_MASTERY_THRESHOLD
): string[] {
  const ready: string[] = [];

  for (const skillId of Object.keys(skillMap.skills)) {
    const state = allStates[skillId];
    const currentPMastery = state?.pMastery ?? 0;

    // Skip if already mastered
    if (currentPMastery >= threshold) continue;

    // Check if unlocked
    if (isSkillUnlocked(skillId, skillMap, allStates, threshold)) {
      ready.push(skillId);
    }
  }

  return ready;
}

/**
 * Get all skills that are currently mastered
 */
export function getMasteredSkills(
  allStates: Record<string, SkillState>,
  threshold: number = DEFAULT_MASTERY_THRESHOLD
): string[] {
  return Object.entries(allStates)
    .filter(([, state]) => state.pMastery >= threshold)
    .map(([skillId]) => skillId);
}

/**
 * Create initial state for a new skill
 */
export function createInitialState(
  skillId: string,
  params: BKTParameters = DEFAULT_BKT_PARAMS
): SkillState {
  return {
    skillId,
    pMastery: params.pL0, // Start with prior probability
    attempts: 0,
    correctCount: 0,
    lastAttempt: new Date(),
    history: [],
  };
}

/**
 * Get skills in order of learning priority (zone of proximal development)
 * Prioritizes skills that are:
 * 1. Close to mastery (0.6-0.95) - almost there!
 * 2. Ready to learn (unlocked but low mastery)
 */
export function getSkillsByPriority(
  skillMap: SkillMap,
  allStates: Record<string, SkillState>,
  threshold: number = DEFAULT_MASTERY_THRESHOLD
): { almostMastered: string[]; readyToLearn: string[]; locked: string[] } {
  const almostMastered: string[] = [];
  const readyToLearn: string[] = [];
  const locked: string[] = [];

  for (const skillId of Object.keys(skillMap.skills)) {
    const state = allStates[skillId];
    const pMastery = state?.pMastery ?? 0;

    // Already mastered - skip
    if (pMastery >= threshold) continue;

    // Check if unlocked
    const unlocked = isSkillUnlocked(skillId, skillMap, allStates, threshold);

    if (!unlocked) {
      locked.push(skillId);
    } else if (pMastery >= 0.6) {
      // Close to mastery - high priority
      almostMastered.push(skillId);
    } else {
      // Ready to learn - normal priority
      readyToLearn.push(skillId);
    }
  }

  // Sort almostMastered by pMastery descending (closest to mastery first)
  almostMastered.sort((a, b) => {
    const aState = allStates[a];
    const bState = allStates[b];
    return (bState?.pMastery ?? 0) - (aState?.pMastery ?? 0);
  });

  return { almostMastered, readyToLearn, locked };
}

/**
 * Calculate how many more correct answers needed to reach mastery
 * This is an approximation based on BKT dynamics
 *
 * @param currentPMastery - Current mastery probability (0-1 scale)
 * @param params - BKT parameters
 * @param threshold - Mastery threshold (0-1 scale, default 0.95)
 * @returns Estimated number of correct attempts needed
 */
export function estimateAttemptsToMastery(
  currentPMastery: number,
  params: BKTParameters = DEFAULT_BKT_PARAMS,
  threshold: number = DEFAULT_MASTERY_THRESHOLD
): number {
  if (currentPMastery >= threshold) return 0;

  let pMastery = currentPMastery;
  let attempts = 0;
  const maxIterations = 100; // Safety limit

  while (pMastery < threshold && attempts < maxIterations) {
    // Simulate a correct answer
    const pCorrect = pMastery * (1 - params.pS) + (1 - pMastery) * params.pG;
    // Guard against division by zero (can happen with extreme params)
    if (pCorrect <= 0) {
      // Cannot make progress with these parameters
      return maxIterations;
    }
    const pLGivenCorrect = (pMastery * (1 - params.pS)) / pCorrect;
    pMastery = pLGivenCorrect + (1 - pLGivenCorrect) * params.pT;
    attempts++;
  }

  return attempts;
}

/**
 * Format mastery as percentage string
 */
export function formatMasteryPercent(pMastery: number): string {
  return `${Math.round(pMastery * 100)}%`;
}

/**
 * Get mastery level description
 */
export function getMasteryLevel(pMastery: number): 'novice' | 'learning' | 'proficient' | 'mastered' {
  if (pMastery >= 0.95) return 'mastered';
  if (pMastery >= 0.7) return 'proficient';
  if (pMastery >= 0.3) return 'learning';
  return 'novice';
}

/**
 * Simple validation check (convenience wrapper)
 * For detailed errors, use the validateBKTParams function that returns { valid, errors }
 */
export function isValidBKTParams(params: BKTParameters): boolean {
  const { pL0, pT, pG, pS } = params;

  return (
    pL0 >= 0 && pL0 <= 1 &&
    pT >= 0 && pT <= 1 &&
    pG >= 0 && pG <= 1 &&
    pS >= 0 && pS <= 1 &&
    // Additional constraints from BKT literature
    pG + pS <= 1 // Guessing + slipping shouldn't exceed 1
  );
}
