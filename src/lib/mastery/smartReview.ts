/**
 * Smart Review Scheduling with ML Predictions
 *
 * Enhances FSRS review scheduling with:
 * - Priority calculation combining retrievability and mastery
 * - Optimal review time prediction based on historical performance
 * - Review batch creation for efficient sessions
 * - 7-day forecast for workload planning
 */

import type { FSRSState, ConceptMastery } from './knowledgeGraph';
import { calculateRetrievability } from './fsrs';

// ============================================
// TYPES
// ============================================

/**
 * Enhanced review item with ML-based priority scoring
 */
export interface SmartReviewItem {
  skillId: string;
  skillName: string;
  fsrsState: FSRSState;
  retrievability: number;
  pMastery: number;
  priority: number;
  optimalReviewTime: Date;
  reasoning: string;
}

/**
 * Optimized batch of review items
 */
export interface ReviewBatch {
  items: SmartReviewItem[];
  estimatedDurationMinutes: number;
  expectedRetentionGain: number;
  batchReasoning: string;
}

/**
 * Forecast for a single day
 */
export interface ReviewForecast {
  date: Date;
  dueCount: number;
  estimatedMinutes: number;
  skills: string[];
}

/**
 * Optimal time analysis result
 */
export interface OptimalTimeResult {
  hour: number;
  confidence: number;
  reasoning: string;
}

// ============================================
// CONSTANTS
// ============================================

/** Average time per review item in minutes */
const MINUTES_PER_REVIEW = 2;

/** Priority weights */
const PRIORITY_WEIGHTS = {
  retrievability: 0.6,
  mastery: 0.4,
};

/** Stability threshold for being "due" */
const RETRIEVABILITY_THRESHOLD = 0.90;

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Calculate review priority for a single item
 *
 * Priority = (1 - retrievability) * 0.6 + (1 - pMastery) * 0.4
 * Higher priority = more urgent to review
 *
 * @param skillId - The skill/concept ID
 * @param skillName - Display name for the skill
 * @param fsrsState - Current FSRS state
 * @param masteryLevel - Current mastery level (0-100)
 * @param lastReviewedAt - When last reviewed
 */
export function calculateReviewPriority(
  skillId: string,
  skillName: string,
  fsrsState: FSRSState,
  masteryLevel: number,
  lastReviewedAt: Date
): SmartReviewItem {
  const now = new Date();
  const elapsedDays = (now.getTime() - lastReviewedAt.getTime()) / (24 * 60 * 60 * 1000);

  // Calculate retrievability (probability of recall)
  const retrievability =
    fsrsState.stability > 0 ? calculateRetrievability(fsrsState.stability, elapsedDays) : 0;

  // Normalize mastery to 0-1 scale
  const pMastery = masteryLevel / 100;

  // Calculate priority score
  // Higher priority = more urgent (lower retrievability, lower mastery)
  const priority =
    (1 - retrievability) * PRIORITY_WEIGHTS.retrievability +
    (1 - pMastery) * PRIORITY_WEIGHTS.mastery;

  // Calculate optimal review time (when retrievability hits threshold)
  const optimalReviewTime = calculateOptimalReviewTimeForItem(
    fsrsState.stability,
    lastReviewedAt
  );

  // Generate reasoning
  const reasoning = generatePriorityReasoning(retrievability, pMastery, fsrsState);

  return {
    skillId,
    skillName,
    fsrsState,
    retrievability,
    pMastery,
    priority,
    optimalReviewTime,
    reasoning,
  };
}

/**
 * Calculate when an item should optimally be reviewed
 * Based on when retrievability will hit the threshold
 */
function calculateOptimalReviewTimeForItem(stability: number, lastReviewedAt: Date): Date {
  if (stability <= 0) {
    return new Date(); // Review immediately
  }

  // Solve for t where R(t) = RETRIEVABILITY_THRESHOLD
  // R(t) = (1 + t/(9*S))^(-1) = threshold
  // t = 9 * S * (threshold^(-1) - 1)
  const daysUntilThreshold = 9 * stability * (Math.pow(RETRIEVABILITY_THRESHOLD, -1) - 1);
  const optimalTime = new Date(
    lastReviewedAt.getTime() + daysUntilThreshold * 24 * 60 * 60 * 1000
  );

  return optimalTime;
}

/**
 * Generate human-readable reasoning for priority
 */
function generatePriorityReasoning(
  retrievability: number,
  pMastery: number,
  fsrsState: FSRSState
): string {
  const parts: string[] = [];

  // Retrievability assessment
  if (retrievability < 0.5) {
    parts.push('Memory is fading quickly');
  } else if (retrievability < 0.7) {
    parts.push('Memory needs reinforcement');
  } else if (retrievability < 0.9) {
    parts.push('Due for review soon');
  } else {
    parts.push('Memory is stable');
  }

  // Mastery assessment
  if (pMastery < 0.5) {
    parts.push('needs more practice');
  } else if (pMastery < 0.8) {
    parts.push('making progress');
  } else {
    parts.push('well understood');
  }

  // Stability assessment
  if (fsrsState.stability < 1) {
    parts.push('recently learned');
  } else if (fsrsState.stability < 7) {
    parts.push('building familiarity');
  } else if (fsrsState.stability < 30) {
    parts.push('becoming long-term memory');
  } else {
    parts.push('strongly retained');
  }

  return parts.join(' - ');
}

/**
 * Create an optimized review batch from due items
 *
 * Sorts by priority and groups related concepts for efficient learning.
 *
 * @param items - Smart review items to batch
 * @param maxMinutes - Maximum session duration
 */
export function createReviewBatch(
  items: SmartReviewItem[],
  maxMinutes: number = 20
): ReviewBatch {
  // Sort by priority (highest first)
  const sortedItems = [...items].sort((a, b) => b.priority - a.priority);

  // Calculate how many items fit in the time limit
  const maxItems = Math.floor(maxMinutes / MINUTES_PER_REVIEW);
  const selectedItems = sortedItems.slice(0, maxItems);

  // Calculate expected retention gain
  const avgRetrievability =
    selectedItems.length > 0
      ? selectedItems.reduce((sum, item) => sum + item.retrievability, 0) / selectedItems.length
      : 1;

  // Expected retention gain: boost average retrievability back to ~95%
  const expectedRetentionGain = (0.95 - avgRetrievability) * selectedItems.length * 100;

  // Generate batch reasoning
  const urgentCount = selectedItems.filter((i) => i.retrievability < 0.7).length;
  const lowMasteryCount = selectedItems.filter((i) => i.pMastery < 0.5).length;

  let batchReasoning = `${selectedItems.length} items selected for review.`;
  if (urgentCount > 0) {
    batchReasoning += ` ${urgentCount} need urgent attention.`;
  }
  if (lowMasteryCount > 0) {
    batchReasoning += ` ${lowMasteryCount} need more practice.`;
  }
  if (selectedItems.length > 0 && avgRetrievability > 0.8) {
    batchReasoning += ' Most items are in good shape.';
  }

  return {
    items: selectedItems,
    estimatedDurationMinutes: selectedItems.length * MINUTES_PER_REVIEW,
    expectedRetentionGain: Math.max(0, expectedRetentionGain),
    batchReasoning,
  };
}

/**
 * Find optimal review time based on historical performance
 *
 * Analyzes when the user performs best (by hour of day).
 * Returns the best hour with confidence score.
 *
 * @param masteryHistory - Historical mastery events
 */
export function findOptimalReviewTime(
  masteryHistory: Array<{
    timestamp: Date;
    score: number;
    correct: boolean;
  }>
): OptimalTimeResult {
  // Default if no history
  if (masteryHistory.length < 5) {
    return {
      hour: 10, // Default to 10 AM
      confidence: 0.3,
      reasoning: 'Not enough data yet. Defaulting to morning review time.',
    };
  }

  // Group scores by hour
  const hourlyScores: Record<number, number[]> = {};
  for (let h = 0; h < 24; h++) {
    hourlyScores[h] = [];
  }

  for (const event of masteryHistory) {
    const hour = new Date(event.timestamp).getHours();
    hourlyScores[hour].push(event.score);
  }

  // Calculate average score per hour
  const hourlyAverages: Array<{ hour: number; avg: number; count: number }> = [];
  for (let h = 0; h < 24; h++) {
    const scores = hourlyScores[h];
    if (scores.length > 0) {
      const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      hourlyAverages.push({ hour: h, avg, count: scores.length });
    }
  }

  // Find best hour
  if (hourlyAverages.length === 0) {
    return {
      hour: 10,
      confidence: 0.3,
      reasoning: 'No hourly data available. Defaulting to morning review time.',
    };
  }

  const bestHour = hourlyAverages.reduce((best, current) =>
    current.avg > best.avg ? current : best
  );

  // Calculate confidence based on sample size and consistency
  const countConfidence = Math.min(1, bestHour.count / 10); // More samples = higher confidence
  const performanceConfidence = bestHour.avg / 100; // Higher avg score = higher confidence
  const confidence = (countConfidence + performanceConfidence) / 2;

  // Format hour for display
  const formattedHour =
    bestHour.hour === 0
      ? '12 AM'
      : bestHour.hour < 12
        ? `${bestHour.hour} AM`
        : bestHour.hour === 12
          ? '12 PM'
          : `${bestHour.hour - 12} PM`;

  return {
    hour: bestHour.hour,
    confidence,
    reasoning: `You perform best around ${formattedHour} with ${Math.round(bestHour.avg)}% average score.`,
  };
}

/**
 * Generate 7-day review forecast
 *
 * Predicts how many items will be due each day based on FSRS scheduling.
 *
 * @param masteryRecords - All mastery records for the user
 * @param daysAhead - Number of days to forecast (default 7)
 */
export function getReviewForecast(
  masteryRecords: ConceptMastery[],
  daysAhead: number = 7
): ReviewForecast[] {
  const forecasts: ReviewForecast[] = [];
  const now = new Date();

  // For each day ahead
  for (let d = 0; d < daysAhead; d++) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + d);
    targetDate.setHours(23, 59, 59, 999); // End of day

    const dueSkills: string[] = [];

    for (const record of masteryRecords) {
      const { stability } = record.fsrsState;
      if (stability <= 0) continue;

      // Calculate elapsed days from last review to target date
      const elapsedDays =
        (targetDate.getTime() - record.lastReviewedAt.getTime()) / (24 * 60 * 60 * 1000);

      // Calculate retrievability at target date
      const retrievability = calculateRetrievability(stability, elapsedDays);

      // Item is due if retrievability drops below threshold
      if (retrievability < RETRIEVABILITY_THRESHOLD) {
        dueSkills.push(record.conceptId);
      }
    }

    forecasts.push({
      date: new Date(targetDate),
      dueCount: dueSkills.length,
      estimatedMinutes: dueSkills.length * MINUTES_PER_REVIEW,
      skills: dueSkills,
    });
  }

  return forecasts;
}

/**
 * Get smart review items from mastery records
 *
 * Converts raw mastery records into prioritized smart review items.
 *
 * @param masteryRecords - User's mastery records
 * @param conceptNames - Map of concept IDs to display names
 * @param maxItems - Maximum items to return
 */
export function getSmartReviewItems(
  masteryRecords: ConceptMastery[],
  conceptNames: Record<string, string>,
  maxItems: number = 20
): SmartReviewItem[] {
  const now = new Date();
  const items: SmartReviewItem[] = [];

  for (const record of masteryRecords) {
    const { stability } = record.fsrsState;
    if (stability <= 0) continue;

    // Calculate elapsed days
    const elapsedDays =
      (now.getTime() - record.lastReviewedAt.getTime()) / (24 * 60 * 60 * 1000);

    // Calculate retrievability
    const retrievability = calculateRetrievability(stability, elapsedDays);

    // Only include items that need review (below threshold)
    if (retrievability >= RETRIEVABILITY_THRESHOLD) continue;

    const item = calculateReviewPriority(
      record.conceptId,
      conceptNames[record.conceptId] || record.conceptId,
      record.fsrsState,
      record.masteryLevel,
      record.lastReviewedAt
    );

    items.push(item);
  }

  // Sort by priority and limit
  return items.sort((a, b) => b.priority - a.priority).slice(0, maxItems);
}

/**
 * Estimate session duration for review items
 */
export function estimateSessionDuration(itemCount: number): number {
  return itemCount * MINUTES_PER_REVIEW;
}

/**
 * Calculate workload level for a day
 * - light: 0-2 items
 * - moderate: 3-5 items
 * - heavy: 6+ items
 */
export function getWorkloadLevel(dueCount: number): 'light' | 'moderate' | 'heavy' {
  if (dueCount <= 2) return 'light';
  if (dueCount <= 5) return 'moderate';
  return 'heavy';
}
