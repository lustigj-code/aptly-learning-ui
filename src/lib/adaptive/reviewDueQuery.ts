/**
 * Review Due Query - FSRS-based Review Item Retrieval
 *
 * Phase 13.1: Adaptive Interleaving Algorithm
 *
 * Queries user's mastery records to find items that need review based on
 * FSRS retrievability calculations. Returns prioritized queue sorted by
 * urgency (lowest retrievability first).
 *
 * Key features:
 * - Threshold-based filtering (default < 0.90 retrievability)
 * - Skill-based filtering for contextual relevance
 * - Urgency scoring for prioritization
 */

import type { ConceptMastery, FSRSState } from '../mastery/knowledgeGraph';
import { calculateRetrievability } from '../mastery/fsrs';

// ============================================
// TYPES
// ============================================

/**
 * Review item with calculated urgency metrics
 */
export interface ReviewItem {
  conceptId: string;
  conceptName: string;
  skillId: string;
  retrievability: number;
  urgencyScore: number;
  stability: number;
  elapsedDays: number;
  lastReviewedAt: Date;
  masteryLevel: number;
  fsrsState: FSRSState;
}

/**
 * Configuration for review query
 */
export interface ReviewQueryConfig {
  /** Retrievability threshold below which items need review (default: 0.90) */
  retrievabilityThreshold: number;
  /** Maximum items to return (default: 20) */
  maxItems: number;
  /** Optional skill IDs to filter by (for contextual relevance) */
  relevantSkillIds?: string[];
  /** Optional course ID to filter by */
  courseId?: string;
  /** Minimum stability to consider (filters out very new items) */
  minStability?: number;
}

/**
 * Result from review query
 */
export interface ReviewQueryResult {
  /** Prioritized review items */
  items: ReviewItem[];
  /** Total count of items below threshold (before limit) */
  totalDueCount: number;
  /** Average retrievability of due items */
  averageRetrievability: number;
  /** Urgency summary */
  urgencyBreakdown: {
    critical: number; // R < 0.50
    high: number; // R < 0.70
    medium: number; // R < 0.85
    low: number; // R < 0.90
  };
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

export const DEFAULT_REVIEW_QUERY_CONFIG: ReviewQueryConfig = {
  retrievabilityThreshold: 0.90,
  maxItems: 20,
  minStability: 0.1, // Filter out items never properly learned
};

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Query for items due for review based on FSRS retrievability
 *
 * Returns items sorted by urgency (lowest retrievability first).
 * Optionally filters by relevant skills for contextual interleaving.
 *
 * @param masteryRecords - User's concept mastery records
 * @param conceptNames - Map of concept IDs to names
 * @param skillMapping - Map of concept IDs to skill IDs
 * @param config - Query configuration
 */
export function queryDueReviews(
  masteryRecords: ConceptMastery[],
  conceptNames: Record<string, string>,
  skillMapping: Record<string, string>,
  config: Partial<ReviewQueryConfig> = {}
): ReviewQueryResult {
  const finalConfig: ReviewQueryConfig = {
    ...DEFAULT_REVIEW_QUERY_CONFIG,
    ...config,
  };

  const now = new Date();
  const { retrievabilityThreshold, maxItems, relevantSkillIds, minStability } = finalConfig;

  // Calculate retrievability for all records
  const itemsWithRetrievability = masteryRecords
    .map((record) => {
      const { stability } = record.fsrsState;
      const elapsedDays =
        (now.getTime() - record.lastReviewedAt.getTime()) / (24 * 60 * 60 * 1000);
      const retrievability =
        stability > 0 ? calculateRetrievability(stability, elapsedDays) : 0;

      return {
        ...record,
        retrievability,
        elapsedDays,
        skillId: skillMapping[record.conceptId] || record.conceptId,
        conceptName: conceptNames[record.conceptId] || record.conceptId,
      };
    })
    .filter((item) => {
      // Filter by threshold
      if (item.retrievability >= retrievabilityThreshold) return false;
      if (item.retrievability <= 0) return false;

      // Filter by minimum stability (skip items never properly learned)
      if (minStability && item.fsrsState.stability < minStability) return false;

      // Filter by relevant skills if specified
      if (relevantSkillIds && relevantSkillIds.length > 0) {
        if (!relevantSkillIds.includes(item.skillId)) return false;
      }

      return true;
    });

  // Calculate urgency breakdown before sorting/limiting
  const urgencyBreakdown = {
    critical: itemsWithRetrievability.filter((i) => i.retrievability < 0.5).length,
    high: itemsWithRetrievability.filter(
      (i) => i.retrievability >= 0.5 && i.retrievability < 0.7
    ).length,
    medium: itemsWithRetrievability.filter(
      (i) => i.retrievability >= 0.7 && i.retrievability < 0.85
    ).length,
    low: itemsWithRetrievability.filter(
      (i) => i.retrievability >= 0.85 && i.retrievability < 0.9
    ).length,
  };

  // Calculate average retrievability
  const totalRetrievability = itemsWithRetrievability.reduce(
    (sum, i) => sum + i.retrievability,
    0
  );
  const averageRetrievability =
    itemsWithRetrievability.length > 0
      ? totalRetrievability / itemsWithRetrievability.length
      : 0;

  // Sort by urgency (lowest retrievability first)
  const sortedItems = itemsWithRetrievability
    .map((item) => ({
      conceptId: item.conceptId,
      conceptName: item.conceptName,
      skillId: item.skillId,
      retrievability: item.retrievability,
      urgencyScore: calculateUrgencyScore(item.retrievability, item.fsrsState),
      stability: item.fsrsState.stability,
      elapsedDays: item.elapsedDays,
      lastReviewedAt: item.lastReviewedAt,
      masteryLevel: item.masteryLevel,
      fsrsState: item.fsrsState,
    }))
    .sort((a, b) => {
      // Primary: higher urgency first
      const urgencyDiff = b.urgencyScore - a.urgencyScore;
      if (Math.abs(urgencyDiff) > 0.1) return urgencyDiff;

      // Secondary: lower retrievability first
      return a.retrievability - b.retrievability;
    })
    .slice(0, maxItems);

  return {
    items: sortedItems,
    totalDueCount: itemsWithRetrievability.length,
    averageRetrievability,
    urgencyBreakdown,
  };
}

/**
 * Calculate urgency score for prioritization
 *
 * Combines retrievability with stability and difficulty to create
 * a composite urgency score. Higher score = more urgent.
 *
 * Factors:
 * - Lower retrievability = higher urgency
 * - Lower stability = higher urgency (more fragile memory)
 * - Higher difficulty = higher urgency (harder to relearn)
 */
export function calculateUrgencyScore(
  retrievability: number,
  fsrsState: FSRSState
): number {
  // Base urgency from retrievability (inverted, scaled 0-1)
  const retrievabilityUrgency = Math.max(0, 1 - retrievability);

  // Stability factor (lower stability = higher urgency)
  // Normalized with soft cap at 30 days stability
  const stabilityUrgency =
    fsrsState.stability > 0 ? Math.max(0, 1 - fsrsState.stability / 30) : 1;

  // Difficulty factor (higher difficulty = higher urgency)
  // FSRS difficulty is 1-10 scale
  const difficultyUrgency = (fsrsState.difficulty - 1) / 9;

  // Combine with weights
  const urgencyScore =
    retrievabilityUrgency * 0.6 + // Primary factor
    stabilityUrgency * 0.25 + // Secondary factor
    difficultyUrgency * 0.15; // Tertiary factor

  return Math.min(1, Math.max(0, urgencyScore));
}

/**
 * Filter review items by course/lesson relevance
 *
 * Used to select reviews that are semantically related to current learning
 * context. Returns items with skills that match the current lesson.
 *
 * @param items - Review items to filter
 * @param currentLessonSkillIds - Skill IDs from current lesson
 * @param relatedSkillIds - Skills related to current lesson (from knowledge graph)
 */
export function filterByRelevance(
  items: ReviewItem[],
  currentLessonSkillIds: string[],
  relatedSkillIds: string[] = []
): { direct: ReviewItem[]; related: ReviewItem[]; other: ReviewItem[] } {
  const directSet = new Set(currentLessonSkillIds);
  const relatedSet = new Set(relatedSkillIds);

  const direct: ReviewItem[] = [];
  const related: ReviewItem[] = [];
  const other: ReviewItem[] = [];

  for (const item of items) {
    if (directSet.has(item.skillId)) {
      direct.push(item);
    } else if (relatedSet.has(item.skillId)) {
      related.push(item);
    } else {
      other.push(item);
    }
  }

  return { direct, related, other };
}

/**
 * Get the most urgent review items for a session
 *
 * Convenience function that combines querying and relevance filtering.
 *
 * @param masteryRecords - User's concept mastery records
 * @param conceptNames - Map of concept IDs to names
 * @param skillMapping - Map of concept IDs to skill IDs
 * @param currentLessonSkillIds - Skills in current lesson
 * @param maxItems - Maximum items to return
 */
export function getUrgentReviewsForSession(
  masteryRecords: ConceptMastery[],
  conceptNames: Record<string, string>,
  skillMapping: Record<string, string>,
  currentLessonSkillIds: string[],
  maxItems: number = 5
): ReviewItem[] {
  // Query all due reviews
  const queryResult = queryDueReviews(masteryRecords, conceptNames, skillMapping, {
    maxItems: maxItems * 4, // Get more than needed for filtering
  });

  // Filter by relevance
  const { direct, related, other } = filterByRelevance(
    queryResult.items,
    currentLessonSkillIds
  );

  // Prioritize: direct matches > related > other
  const result: ReviewItem[] = [];

  // Add direct matches first (up to limit)
  for (const item of direct) {
    if (result.length >= maxItems) break;
    result.push(item);
  }

  // Add related matches
  for (const item of related) {
    if (result.length >= maxItems) break;
    result.push(item);
  }

  // Fill remaining with other urgent items
  for (const item of other) {
    if (result.length >= maxItems) break;
    result.push(item);
  }

  return result;
}

/**
 * Check if user has pending reviews that should be addressed
 *
 * Returns true if there are items with retrievability below
 * critical threshold (0.70) that need immediate attention.
 */
export function hasCriticalReviews(masteryRecords: ConceptMastery[]): boolean {
  const now = new Date();

  for (const record of masteryRecords) {
    const { stability } = record.fsrsState;
    if (stability <= 0) continue;

    const elapsedDays =
      (now.getTime() - record.lastReviewedAt.getTime()) / (24 * 60 * 60 * 1000);
    const retrievability = calculateRetrievability(stability, elapsedDays);

    if (retrievability < 0.70 && retrievability > 0) {
      return true;
    }
  }

  return false;
}

/**
 * Get review statistics for dashboard display
 */
export function getReviewStats(masteryRecords: ConceptMastery[]): {
  dueNow: number;
  dueSoon: number;
  healthy: number;
  averageRetrievability: number;
} {
  const now = new Date();

  let dueNow = 0;
  let dueSoon = 0;
  let healthy = 0;
  let totalRetrievability = 0;
  let count = 0;

  for (const record of masteryRecords) {
    const { stability } = record.fsrsState;
    if (stability <= 0) continue;

    const elapsedDays =
      (now.getTime() - record.lastReviewedAt.getTime()) / (24 * 60 * 60 * 1000);
    const retrievability = calculateRetrievability(stability, elapsedDays);

    totalRetrievability += retrievability;
    count++;

    if (retrievability < 0.70) {
      dueNow++;
    } else if (retrievability < 0.90) {
      dueSoon++;
    } else {
      healthy++;
    }
  }

  return {
    dueNow,
    dueSoon,
    healthy,
    averageRetrievability: count > 0 ? totalRetrievability / count : 0,
  };
}
