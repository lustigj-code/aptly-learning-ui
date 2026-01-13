/**
 * Difficulty Selector - Adaptive Content Difficulty Selection
 *
 * Implements dynamic difficulty selection based on mastery predictions
 * to keep learners in their Zone of Proximal Development (ZPD).
 *
 * Key Features:
 * - Maps mastery predictions to optimal difficulty levels
 * - Selects items that match the learner's current capability
 * - Adjusts difficulty based on recent performance
 * - Provides visual difficulty labels for UI
 *
 * Research: Vygotsky's ZPD suggests ~75% success rate is optimal for learning
 */

import { predictMastery } from '@/lib/ml/hybridModel';
import type { HybridPrediction } from '@/lib/ml/hybridModelTypes';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Configuration for difficulty selection algorithm
 */
export interface DifficultyConfig {
  /** Minimum difficulty level (0.0 = easiest) */
  minDifficulty: number;
  /** Maximum difficulty level (1.0 = hardest) */
  maxDifficulty: number;
  /** Target success rate - ZPD sweet spot (default: 0.75) */
  targetSuccessRate: number;
  /** Bandwidth around optimal difficulty for item selection */
  difficultyBandwidth: number;
  /** Weight for randomization to add variety (0-1) */
  randomizationWeight: number;
}

/**
 * Default difficulty configuration based on research
 */
export const DEFAULT_DIFFICULTY_CONFIG: DifficultyConfig = {
  minDifficulty: 0.0,
  maxDifficulty: 1.0,
  targetSuccessRate: 0.75, // ZPD sweet spot
  difficultyBandwidth: 0.15, // +/- 15% around optimal
  randomizationWeight: 0.1, // 10% randomization for variety
};

/**
 * Represents an item with difficulty metadata
 */
export interface ItemDifficulty {
  /** Unique item identifier */
  itemId: string;
  /** Difficulty level (0.0 = easy, 1.0 = hard) */
  difficulty: number;
  /** Associated skill ID */
  skillId: string;
  /** Item type (optional) */
  type?: 'quiz' | 'practice' | 'lesson';
  /** Estimated time in minutes (optional) */
  estimatedMinutes?: number;
}

/**
 * Result of difficulty-based item selection
 */
export interface DifficultySelection {
  /** Selected items in order of relevance */
  selectedItems: ItemDifficulty[];
  /** Calculated optimal difficulty for this user/skill */
  optimalDifficulty: number;
  /** Human-readable explanation of selection */
  reasoning: string;
  /** Mastery prediction used for selection */
  masteryPrediction?: HybridPrediction;
}

/**
 * Difficulty label for UI display
 */
export interface DifficultyLabel {
  /** Text label (e.g., "Easy", "Moderate") */
  label: string;
  /** Color for UI (Tailwind class or hex) */
  color: string;
  /** Icon name (Lucide icon) */
  icon: string;
  /** Numeric difficulty (0-1) */
  value: number;
}

// ============================================================================
// DIFFICULTY CALCULATION
// ============================================================================

/**
 * Calculate optimal difficulty based on mastery prediction
 *
 * Maps mastery probability to difficulty level where the learner
 * has approximately targetSuccessRate probability of success.
 *
 * Logic:
 * - Low mastery (0.0-0.3) -> Easier content (difficulty 0.2-0.4)
 * - Medium mastery (0.3-0.7) -> Moderate content (difficulty 0.4-0.6)
 * - High mastery (0.7-1.0) -> Challenging content (difficulty 0.6-0.9)
 *
 * @param userId - User identifier
 * @param skillId - Skill to get optimal difficulty for
 * @param config - Optional configuration overrides
 * @returns Optimal difficulty level (0-1)
 */
export async function getOptimalDifficulty(
  userId: string,
  skillId: string,
  config: Partial<DifficultyConfig> = {}
): Promise<number> {
  const cfg = { ...DEFAULT_DIFFICULTY_CONFIG, ...config };

  try {
    // Get mastery prediction from hybrid model
    const prediction = await predictMastery(userId, skillId);
    const mastery = prediction.masteryProbability;

    // Map mastery to optimal difficulty
    // Higher mastery = can handle harder content
    // Formula: optimal = mastery * (1 - targetSuccessRate) + (1 - mastery) * targetSuccessRate
    // Simplified: slightly above current mastery for ZPD
    const optimalDifficulty = calculateOptimalFromMastery(mastery, cfg.targetSuccessRate);

    // Clamp to configured bounds
    return Math.max(cfg.minDifficulty, Math.min(cfg.maxDifficulty, optimalDifficulty));
  } catch (error) {
    console.error('[DifficultySelector] Error getting mastery prediction:', error);
    // Default to moderate difficulty on error
    return 0.5;
  }
}

/**
 * Calculate optimal difficulty from mastery level
 *
 * Uses a mapping that:
 * - Keeps low mastery learners in their comfort zone (easier content)
 * - Challenges high mastery learners with harder content
 * - Targets the ZPD where success rate is around 75%
 */
function calculateOptimalFromMastery(
  mastery: number,
  targetSuccessRate: number
): number {
  // The relationship: P(success) = mastery * (1 - difficulty) + (1 - mastery) * 0.25
  // Solving for difficulty where P(success) = targetSuccessRate:
  // targetSuccessRate = mastery - mastery * difficulty + 0.25 - 0.25 * mastery
  // targetSuccessRate = 0.75 * mastery + 0.25 - mastery * difficulty
  // difficulty = (0.75 * mastery + 0.25 - targetSuccessRate) / mastery

  // Simplified heuristic approach:
  // - At 0% mastery, optimal difficulty = 0.2 (easy)
  // - At 50% mastery, optimal difficulty = 0.5 (moderate)
  // - At 100% mastery, optimal difficulty = 0.85 (challenging but not impossible)

  const baseMapping = mastery * 0.65 + 0.2; // Maps 0-1 mastery to 0.2-0.85 difficulty

  // Adjust based on target success rate
  // Higher target success rate = easier content
  const successRateAdjustment = (0.75 - targetSuccessRate) * 0.3;

  return Math.max(0, Math.min(1, baseMapping + successRateAdjustment));
}

// ============================================================================
// ITEM SELECTION
// ============================================================================

/**
 * Select items by difficulty for a user and skill
 *
 * Scores available items by their proximity to the optimal difficulty
 * and selects the best matches.
 *
 * @param userId - User identifier
 * @param skillId - Skill to select items for
 * @param availableItems - Pool of items to select from
 * @param count - Number of items to select
 * @param config - Optional configuration overrides
 * @returns Selection result with items and reasoning
 */
export async function selectItemsByDifficulty(
  userId: string,
  skillId: string,
  availableItems: ItemDifficulty[],
  count: number,
  config: Partial<DifficultyConfig> = {}
): Promise<DifficultySelection> {
  const cfg = { ...DEFAULT_DIFFICULTY_CONFIG, ...config };

  if (availableItems.length === 0) {
    return {
      selectedItems: [],
      optimalDifficulty: 0.5,
      reasoning: 'No items available for selection',
    };
  }

  // Get mastery prediction and optimal difficulty
  let prediction: HybridPrediction | undefined;
  let optimalDifficulty: number;

  try {
    prediction = await predictMastery(userId, skillId);
    optimalDifficulty = calculateOptimalFromMastery(
      prediction.masteryProbability,
      cfg.targetSuccessRate
    );
  } catch (error) {
    console.error('[DifficultySelector] Error getting prediction:', error);
    optimalDifficulty = 0.5;
  }

  // Score each item by proximity to optimal difficulty
  const scoredItems = availableItems.map((item) => {
    const distance = Math.abs(item.difficulty - optimalDifficulty);
    const proximityScore = 1 - distance / cfg.difficultyBandwidth;
    const randomFactor = Math.random() * cfg.randomizationWeight;

    return {
      item,
      score: Math.max(0, proximityScore) + randomFactor,
    };
  });

  // Sort by score (highest first) and take top N
  scoredItems.sort((a, b) => b.score - a.score);
  const selectedItems = scoredItems.slice(0, count).map((s) => s.item);

  // Generate reasoning
  const masteryPercent = prediction
    ? Math.round(prediction.masteryProbability * 100)
    : 'unknown';
  const difficultyPercent = Math.round(optimalDifficulty * 100);
  const reasoning = `Selected ${selectedItems.length} items at ~${difficultyPercent}% difficulty (mastery: ${masteryPercent}%)`;

  return {
    selectedItems,
    optimalDifficulty,
    reasoning,
    masteryPrediction: prediction,
  };
}

// ============================================================================
// PERFORMANCE-BASED ADJUSTMENT
// ============================================================================

/**
 * Adjust difficulty based on recent performance
 *
 * Uses recent accuracy and response time to fine-tune difficulty.
 * Faster correct answers = increase difficulty
 * Slow or incorrect answers = decrease difficulty
 *
 * @param currentDifficulty - Current difficulty level
 * @param recentAccuracy - Recent accuracy (0-1)
 * @param recentResponseTime - Recent average response time (ms)
 * @param avgResponseTime - Expected average response time (ms)
 * @returns Adjusted difficulty level
 */
export function adjustDifficultyFromPerformance(
  currentDifficulty: number,
  recentAccuracy: number,
  recentResponseTime: number,
  avgResponseTime: number
): number {
  // Calculate accuracy adjustment
  // Above 85% accuracy = increase difficulty
  // Below 60% accuracy = decrease difficulty
  let accuracyAdjustment = 0;
  if (recentAccuracy > 0.85) {
    accuracyAdjustment = (recentAccuracy - 0.75) * 0.2; // Up to +0.05
  } else if (recentAccuracy < 0.6) {
    accuracyAdjustment = (recentAccuracy - 0.75) * 0.2; // Down to -0.03
  }

  // Calculate response time adjustment
  // Faster than average = can handle harder content
  // Slower than average = might need easier content
  let timeAdjustment = 0;
  if (avgResponseTime > 0 && recentResponseTime > 0) {
    const timeRatio = recentResponseTime / avgResponseTime;
    if (timeRatio < 0.7) {
      // Fast responses - increase difficulty slightly
      timeAdjustment = 0.05;
    } else if (timeRatio > 1.5) {
      // Slow responses - decrease difficulty slightly
      timeAdjustment = -0.05;
    }
  }

  // Apply adjustments
  const adjusted = currentDifficulty + accuracyAdjustment + timeAdjustment;

  // Clamp to valid range
  return Math.max(0, Math.min(1, adjusted));
}

// ============================================================================
// UI HELPERS
// ============================================================================

/**
 * Difficulty level thresholds for labeling
 */
const DIFFICULTY_THRESHOLDS = {
  easy: 0.25,
  moderate: 0.45,
  challenging: 0.65,
  hard: 0.85,
  expert: 1.0,
};

/**
 * Get difficulty label for UI display
 *
 * Returns a human-readable label with color and icon
 * based on the numeric difficulty level.
 *
 * @param difficulty - Numeric difficulty (0-1)
 * @returns Label object with text, color, and icon
 */
export function getDifficultyLabel(difficulty: number): DifficultyLabel {
  if (difficulty < DIFFICULTY_THRESHOLDS.easy) {
    return {
      label: 'Easy',
      color: 'text-success bg-success/10',
      icon: 'Leaf',
      value: difficulty,
    };
  }

  if (difficulty < DIFFICULTY_THRESHOLDS.moderate) {
    return {
      label: 'Moderate',
      color: 'text-teal bg-teal/10',
      icon: 'Gauge',
      value: difficulty,
    };
  }

  if (difficulty < DIFFICULTY_THRESHOLDS.challenging) {
    return {
      label: 'Challenging',
      color: 'text-yellow bg-yellow/10',
      icon: 'Target',
      value: difficulty,
    };
  }

  if (difficulty < DIFFICULTY_THRESHOLDS.hard) {
    return {
      label: 'Hard',
      color: 'text-orange bg-orange/10',
      icon: 'Flame',
      value: difficulty,
    };
  }

  return {
    label: 'Expert',
    color: 'text-error bg-error/10',
    icon: 'Trophy',
    value: difficulty,
  };
}

/**
 * Get all difficulty levels for display
 *
 * Useful for filters or legends in the UI.
 */
export function getAllDifficultyLevels(): DifficultyLabel[] {
  return [
    getDifficultyLabel(0.1),
    getDifficultyLabel(0.35),
    getDifficultyLabel(0.55),
    getDifficultyLabel(0.75),
    getDifficultyLabel(0.95),
  ];
}

/**
 * Normalize difficulty from various scales to 0-1
 *
 * Handles common difficulty scales:
 * - 1-5 scale (e.g., from question.difficulty)
 * - 0-100 scale (percentage)
 * - Already 0-1 scale
 */
export function normalizeDifficulty(
  value: number,
  scale: '1-5' | '0-100' | '0-1' = '0-1'
): number {
  switch (scale) {
    case '1-5':
      return (value - 1) / 4; // Maps 1-5 to 0-1
    case '0-100':
      return value / 100;
    case '0-1':
    default:
      return Math.max(0, Math.min(1, value));
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  calculateOptimalFromMastery,
  DIFFICULTY_THRESHOLDS,
};
