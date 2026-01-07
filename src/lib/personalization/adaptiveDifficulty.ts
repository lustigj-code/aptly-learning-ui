/**
 * Adaptive Difficulty System
 *
 * Adjusts content difficulty based on user performance.
 * Implements Zone of Proximal Development (ZPD) principles.
 */

// ============================================
// TYPES
// ============================================

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

export type PerformanceWindow = {
  scores: number[];
  timeStamps: Date[];
  difficulties: DifficultyLevel[];
};

export type DifficultyState = {
  currentLevel: DifficultyLevel;
  targetLevel: DifficultyLevel;
  performanceWindow: PerformanceWindow;
  consecutiveSuccesses: number;
  consecutiveFailures: number;
  confidenceScore: number; // 0-1, how confident we are in the current level
  lastAdjustment: Date;
  adjustmentHistory: AdjustmentEvent[];
};

export type AdjustmentEvent = {
  timestamp: Date;
  fromLevel: DifficultyLevel;
  toLevel: DifficultyLevel;
  reason: string;
  performanceMetrics: {
    averageScore: number;
    successRate: number;
    averageTime: number;
  };
};

export type DifficultyAdjustment = {
  recommendedLevel: DifficultyLevel;
  adjustment: 'increase' | 'decrease' | 'maintain';
  reason: string;
  confidence: number;
};

// ============================================
// CONSTANTS
// ============================================

const WINDOW_SIZE = 10; // Number of recent attempts to consider
const SUCCESS_THRESHOLD = 75; // Score considered successful
const MASTERY_THRESHOLD = 90; // Score indicating mastery
const STRUGGLE_THRESHOLD = 50; // Score indicating struggle

const CONSECUTIVE_FOR_INCREASE = 3; // Successes needed to increase difficulty
const CONSECUTIVE_FOR_DECREASE = 2; // Failures needed to decrease difficulty

const MINIMUM_ATTEMPTS_FOR_ADJUSTMENT = 3;
const COOLDOWN_MINUTES = 30; // Minimum time between adjustments

// ============================================
// DIFFICULTY CALCULATION
// ============================================

/**
 * Calculate recommended difficulty adjustment
 */
export function calculateDifficultyAdjustment(
  state: DifficultyState
): DifficultyAdjustment {
  const { performanceWindow, currentLevel, consecutiveSuccesses, consecutiveFailures, lastAdjustment } = state;

  // Check cooldown
  const minutesSinceLastAdjustment = (Date.now() - lastAdjustment.getTime()) / (60 * 1000);
  if (minutesSinceLastAdjustment < COOLDOWN_MINUTES && state.adjustmentHistory.length > 0) {
    return {
      recommendedLevel: currentLevel,
      adjustment: 'maintain',
      reason: 'Waiting for more data (cooldown period)',
      confidence: 0.5,
    };
  }

  // Not enough data
  if (performanceWindow.scores.length < MINIMUM_ATTEMPTS_FOR_ADJUSTMENT) {
    return {
      recommendedLevel: currentLevel,
      adjustment: 'maintain',
      reason: 'Need more attempts to adjust difficulty',
      confidence: 0.3,
    };
  }

  // Calculate metrics
  const recentScores = performanceWindow.scores.slice(-WINDOW_SIZE);
  const averageScore = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
  const successRate = recentScores.filter(s => s >= SUCCESS_THRESHOLD).length / recentScores.length;
  const masteryRate = recentScores.filter(s => s >= MASTERY_THRESHOLD).length / recentScores.length;
  const struggleRate = recentScores.filter(s => s < STRUGGLE_THRESHOLD).length / recentScores.length;

  // Check for consecutive patterns
  if (consecutiveSuccesses >= CONSECUTIVE_FOR_INCREASE && masteryRate >= 0.5) {
    if (currentLevel < 5) {
      return {
        recommendedLevel: (currentLevel + 1) as DifficultyLevel,
        adjustment: 'increase',
        reason: `Strong performance (${Math.round(averageScore)}% avg, ${consecutiveSuccesses} in a row). Ready for more challenge!`,
        confidence: Math.min(0.9, 0.6 + masteryRate * 0.3),
      };
    }
  }

  if (consecutiveFailures >= CONSECUTIVE_FOR_DECREASE || struggleRate >= 0.5) {
    if (currentLevel > 1) {
      return {
        recommendedLevel: (currentLevel - 1) as DifficultyLevel,
        adjustment: 'decrease',
        reason: `Let's reinforce the fundamentals (${Math.round(averageScore)}% avg). Building a stronger foundation first.`,
        confidence: Math.min(0.85, 0.5 + struggleRate * 0.35),
      };
    }
  }

  // Optimal zone - maintain
  if (successRate >= 0.6 && successRate <= 0.85) {
    return {
      recommendedLevel: currentLevel,
      adjustment: 'maintain',
      reason: `You're in the optimal learning zone (${Math.round(successRate * 100)}% success rate)`,
      confidence: 0.8,
    };
  }

  // Edge cases - gradual adjustment
  if (successRate > 0.85 && currentLevel < 5) {
    return {
      recommendedLevel: (currentLevel + 1) as DifficultyLevel,
      adjustment: 'increase',
      reason: `High success rate (${Math.round(successRate * 100)}%). Time to push a bit harder.`,
      confidence: 0.7,
    };
  }

  if (successRate < 0.4 && currentLevel > 1) {
    return {
      recommendedLevel: (currentLevel - 1) as DifficultyLevel,
      adjustment: 'decrease',
      reason: `Let's step back and strengthen these concepts (${Math.round(successRate * 100)}% success)`,
      confidence: 0.7,
    };
  }

  return {
    recommendedLevel: currentLevel,
    adjustment: 'maintain',
    reason: 'Current difficulty level is appropriate',
    confidence: 0.6,
  };
}

/**
 * Apply difficulty adjustment and update state
 */
export function applyDifficultyAdjustment(
  state: DifficultyState,
  adjustment: DifficultyAdjustment
): DifficultyState {
  if (adjustment.adjustment === 'maintain') {
    return state;
  }

  const recentScores = state.performanceWindow.scores.slice(-WINDOW_SIZE);
  const averageScore = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
  const successRate = recentScores.filter(s => s >= SUCCESS_THRESHOLD).length / recentScores.length;

  const event: AdjustmentEvent = {
    timestamp: new Date(),
    fromLevel: state.currentLevel,
    toLevel: adjustment.recommendedLevel,
    reason: adjustment.reason,
    performanceMetrics: {
      averageScore,
      successRate,
      averageTime: 0, // Would need time tracking
    },
  };

  return {
    ...state,
    currentLevel: adjustment.recommendedLevel,
    targetLevel: adjustment.recommendedLevel,
    consecutiveSuccesses: 0,
    consecutiveFailures: 0,
    confidenceScore: adjustment.confidence,
    lastAdjustment: new Date(),
    adjustmentHistory: [...state.adjustmentHistory.slice(-20), event],
  };
}

// ============================================
// STATE UPDATES
// ============================================

/**
 * Record a new performance result
 */
export function recordPerformance(
  state: DifficultyState,
  score: number,
  difficulty: DifficultyLevel
): DifficultyState {
  const isSuccess = score >= SUCCESS_THRESHOLD;
  const isFailure = score < STRUGGLE_THRESHOLD;

  const newWindow: PerformanceWindow = {
    scores: [...state.performanceWindow.scores.slice(-(WINDOW_SIZE - 1)), score],
    timeStamps: [...state.performanceWindow.timeStamps.slice(-(WINDOW_SIZE - 1)), new Date()],
    difficulties: [...state.performanceWindow.difficulties.slice(-(WINDOW_SIZE - 1)), difficulty],
  };

  return {
    ...state,
    performanceWindow: newWindow,
    consecutiveSuccesses: isSuccess ? state.consecutiveSuccesses + 1 : 0,
    consecutiveFailures: isFailure ? state.consecutiveFailures + 1 : 0,
  };
}

/**
 * Create initial difficulty state
 */
export function createInitialDifficultyState(
  experienceLevel: 'beginner' | 'intermediate' | 'advanced'
): DifficultyState {
  const startingLevel: DifficultyLevel =
    experienceLevel === 'advanced' ? 4 :
    experienceLevel === 'intermediate' ? 3 : 2;

  return {
    currentLevel: startingLevel,
    targetLevel: startingLevel,
    performanceWindow: {
      scores: [],
      timeStamps: [],
      difficulties: [],
    },
    consecutiveSuccesses: 0,
    consecutiveFailures: 0,
    confidenceScore: 0.5,
    lastAdjustment: new Date(),
    adjustmentHistory: [],
  };
}

// ============================================
// CONTENT SELECTION
// ============================================

/**
 * Select appropriate content based on difficulty level
 */
export function selectContentForDifficulty<T extends { difficulty: DifficultyLevel }>(
  items: T[],
  targetDifficulty: DifficultyLevel,
  options: {
    allowOneBelow?: boolean;
    allowOneAbove?: boolean;
    preferExact?: boolean;
  } = {}
): T[] {
  const { allowOneBelow = true, allowOneAbove = true, preferExact = true } = options;

  // Get exact matches first
  const exactMatches = items.filter(item => item.difficulty === targetDifficulty);

  if (exactMatches.length > 0 && preferExact) {
    return exactMatches;
  }

  // Expand search if needed
  const expandedMatches = items.filter(item => {
    if (item.difficulty === targetDifficulty) return true;
    if (allowOneBelow && item.difficulty === targetDifficulty - 1) return true;
    if (allowOneAbove && item.difficulty === targetDifficulty + 1) return true;
    return false;
  });

  if (expandedMatches.length > 0) {
    // Sort by closeness to target
    return expandedMatches.sort((a, b) =>
      Math.abs(a.difficulty - targetDifficulty) - Math.abs(b.difficulty - targetDifficulty)
    );
  }

  // Return all if nothing matches
  return items;
}

/**
 * Get difficulty level description for UI
 */
export function getDifficultyDescription(level: DifficultyLevel): {
  label: string;
  description: string;
  color: string;
} {
  const descriptions: Record<DifficultyLevel, { label: string; description: string; color: string }> = {
    1: {
      label: 'Foundation',
      description: 'Core concepts with step-by-step guidance',
      color: '#38B2AC', // teal
    },
    2: {
      label: 'Developing',
      description: 'Building on basics with more independence',
      color: '#48BB78', // green
    },
    3: {
      label: 'Proficient',
      description: 'Applying concepts to real scenarios',
      color: '#ECC94B', // yellow
    },
    4: {
      label: 'Advanced',
      description: 'Complex problems requiring deeper analysis',
      color: '#ED8936', // orange
    },
    5: {
      label: 'Expert',
      description: 'Challenging edge cases and advanced strategies',
      color: '#E53E3E', // red
    },
  };

  return descriptions[level];
}
