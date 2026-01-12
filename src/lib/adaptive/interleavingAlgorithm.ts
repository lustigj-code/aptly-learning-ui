/**
 * Interleaving Algorithm - Dynamic Review Mixing
 *
 * Phase 13.1: Adaptive Interleaving Algorithm
 *
 * Creates optimized learning sessions by interleaving review items
 * with new learning content based on FSRS retrievability and
 * semantic similarity.
 *
 * Key features:
 * - Configurable interleaving ratio
 * - Semantic similarity filtering
 * - Minimum new items before reviews
 * - Max reviews per session limit
 * - Review challenge badges
 */

import type { SessionItem } from './sessionBuilder';
import type { ReviewItem } from './reviewDueQuery';
import type { ScoredReviewItem, SimilarityConfig } from './semanticSimilarity';
import {
  scoreReviewItemsBySimilarity,
  filterBySimilarity,
  type ContentRepresentation,
} from './semanticSimilarity';

// ============================================
// TYPES
// ============================================

/**
 * Configuration for the interleaving algorithm
 */
export interface InterleavingConfig {
  /** Maximum review items per session (default: 5) */
  maxReviewsPerSession: number;
  /** Minimum new items before first review (default: 2) */
  minNewItemsFirst: number;
  /** Ratio of reviews to total items (default: 0.3 = 30%) */
  interleavingRatio: number;
  /** Minimum similarity threshold for reviews (default: 0.5) */
  similarityThreshold: number;
  /** Whether to require semantic similarity (default: true) */
  requireSimilarity: boolean;
  /** Minimum spacing between reviews (default: 2 items) */
  minSpacingBetweenReviews: number;
}

/**
 * Extended session item with interleaving metadata
 */
export interface InterleavedSessionItem extends SessionItem {
  /** True if this is an FSRS-injected review */
  isReviewChallenge: boolean;
  /** Metadata for UI display and analytics */
  metadata: {
    retrievability?: number;
    similarity?: number;
    urgency?: number;
    originalPosition?: number;
  };
}

/**
 * Result from interleaving algorithm
 */
export interface InterleavingResult {
  /** Final interleaved queue */
  items: InterleavedSessionItem[];
  /** Statistics about the interleaving */
  stats: {
    totalItems: number;
    newItems: number;
    reviewItems: number;
    interleavingRatio: number;
    averageSimilarity: number;
    reviewsSkippedLowSimilarity: number;
    reviewsSkippedMaxLimit: number;
  };
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

export const DEFAULT_INTERLEAVING_CONFIG: InterleavingConfig = {
  maxReviewsPerSession: 5,
  minNewItemsFirst: 2,
  interleavingRatio: 0.3, // 30% reviews
  similarityThreshold: 0.5,
  requireSimilarity: true,
  minSpacingBetweenReviews: 2,
};

// ============================================
// CORE ALGORITHM
// ============================================

/**
 * Create an interleaved queue of new and review items
 *
 * This is the main entry point for the interleaving algorithm.
 * It combines new learning items with semantically-related review
 * items based on FSRS urgency and configurable ratios.
 *
 * @param newItems - New learning content items
 * @param dueReviews - Review items from FSRS query
 * @param lessonContent - Content representation for similarity matching
 * @param reviewContents - Map of concept IDs to content representations
 * @param config - Interleaving configuration
 */
export function createInterleavedQueue(
  newItems: SessionItem[],
  dueReviews: ReviewItem[],
  lessonContent: ContentRepresentation,
  reviewContents: Map<string, ContentRepresentation>,
  config: Partial<InterleavingConfig> = {}
): InterleavingResult {
  const finalConfig: InterleavingConfig = {
    ...DEFAULT_INTERLEAVING_CONFIG,
    ...config,
  };

  const {
    maxReviewsPerSession,
    minNewItemsFirst,
    interleavingRatio,
    similarityThreshold,
    requireSimilarity,
    minSpacingBetweenReviews,
  } = finalConfig;

  // Step 1: Score reviews by semantic similarity
  const similarityConfig: Partial<SimilarityConfig> = {
    minThreshold: similarityThreshold,
  };

  const scoredReviews = scoreReviewItemsBySimilarity(
    lessonContent,
    dueReviews,
    reviewContents,
    similarityConfig
  );

  // Step 2: Filter by similarity threshold if required
  let eligibleReviews: ScoredReviewItem[];
  let reviewsSkippedLowSimilarity = 0;

  if (requireSimilarity) {
    eligibleReviews = filterBySimilarity(scoredReviews, similarityThreshold);
    reviewsSkippedLowSimilarity = scoredReviews.length - eligibleReviews.length;
  } else {
    eligibleReviews = scoredReviews;
  }

  // Step 3: Calculate target number of reviews
  const totalTargetItems = newItems.length + Math.min(eligibleReviews.length, maxReviewsPerSession);
  const targetReviewCount = Math.min(
    maxReviewsPerSession,
    Math.floor(totalTargetItems * interleavingRatio),
    eligibleReviews.length
  );

  const reviewsSkippedMaxLimit = Math.max(0, eligibleReviews.length - targetReviewCount);

  // Step 4: Select top reviews by combined urgency and similarity
  const selectedReviews = selectTopReviews(eligibleReviews, targetReviewCount);

  // Step 5: Interleave reviews with new items
  const interleavedItems = interleaveItems(
    newItems,
    selectedReviews,
    minNewItemsFirst,
    minSpacingBetweenReviews
  );

  // Step 6: Calculate statistics
  const reviewItemCount = interleavedItems.filter((i) => i.isReviewChallenge).length;
  const avgSimilarity =
    selectedReviews.length > 0
      ? selectedReviews.reduce((sum, r) => sum + r.similarity, 0) / selectedReviews.length
      : 0;

  return {
    items: interleavedItems,
    stats: {
      totalItems: interleavedItems.length,
      newItems: interleavedItems.length - reviewItemCount,
      reviewItems: reviewItemCount,
      interleavingRatio: interleavedItems.length > 0 ? reviewItemCount / interleavedItems.length : 0,
      averageSimilarity: avgSimilarity,
      reviewsSkippedLowSimilarity,
      reviewsSkippedMaxLimit,
    },
  };
}

/**
 * Select top reviews by combined urgency and similarity score
 */
function selectTopReviews(
  reviews: ScoredReviewItem[],
  count: number
): ScoredReviewItem[] {
  // Sort by combined score: urgency (60%) + similarity (40%)
  const sorted = [...reviews].sort((a, b) => {
    const aScore = a.urgencyScore * 0.6 + a.similarity * 0.4;
    const bScore = b.urgencyScore * 0.6 + b.similarity * 0.4;
    return bScore - aScore;
  });

  return sorted.slice(0, count);
}

/**
 * Interleave review items into new items queue
 *
 * Ensures:
 * - Minimum new items appear first
 * - Minimum spacing between reviews
 * - Reviews distributed evenly through session
 */
function interleaveItems(
  newItems: SessionItem[],
  reviews: ScoredReviewItem[],
  minNewFirst: number,
  minSpacing: number
): InterleavedSessionItem[] {
  const result: InterleavedSessionItem[] = [];

  if (reviews.length === 0) {
    // No reviews - return new items with metadata
    return newItems.map((item, index) => ({
      ...item,
      order: index,
      isReviewChallenge: false,
      metadata: {},
    }));
  }

  // Calculate insertion points for reviews
  const insertionPoints = calculateInsertionPoints(
    newItems.length,
    reviews.length,
    minNewFirst,
    minSpacing
  );

  // Track which reviews have been inserted
  let reviewIndex = 0;
  let newItemIndex = 0;
  let order = 0;

  // Process items in order
  for (let position = 0; position <= newItems.length + reviews.length; position++) {
    // Check if we should insert a review at this position
    if (insertionPoints.has(position) && reviewIndex < reviews.length) {
      const review = reviews[reviewIndex];
      result.push(convertReviewToSessionItem(review, order++));
      reviewIndex++;
    }

    // Insert next new item if available
    if (newItemIndex < newItems.length) {
      const newItem = newItems[newItemIndex];
      result.push({
        ...newItem,
        order: order++,
        isReviewChallenge: false,
        metadata: {},
      });
      newItemIndex++;
    }
  }

  // Add any remaining reviews at the end
  while (reviewIndex < reviews.length) {
    const review = reviews[reviewIndex];
    result.push(convertReviewToSessionItem(review, order++));
    reviewIndex++;
  }

  return result;
}

/**
 * Calculate optimal positions to insert reviews
 */
function calculateInsertionPoints(
  newItemCount: number,
  reviewCount: number,
  minNewFirst: number,
  minSpacing: number
): Set<number> {
  const points = new Set<number>();

  if (reviewCount === 0 || newItemCount === 0) {
    return points;
  }

  // Available positions after minNewFirst items
  const availableStart = minNewFirst;
  const totalLength = newItemCount + reviewCount;

  if (reviewCount === 1) {
    // Single review: place in middle after minNewFirst
    const midpoint = Math.max(availableStart, Math.floor(newItemCount / 2));
    points.add(midpoint);
    return points;
  }

  // Multiple reviews: distribute evenly
  const spacing = Math.max(minSpacing, Math.floor((totalLength - availableStart) / (reviewCount + 1)));

  let currentPos = availableStart;
  for (let i = 0; i < reviewCount; i++) {
    points.add(currentPos);
    currentPos += spacing + 1; // +1 because we're interleaving
  }

  return points;
}

/**
 * Convert a scored review item to a session item
 */
function convertReviewToSessionItem(
  review: ScoredReviewItem,
  order: number
): InterleavedSessionItem {
  return {
    type: 'review',
    itemId: review.conceptId,
    skillId: review.skillId,
    estimatedMinutes: 3, // Reviews are typically quick
    reason: `Review Challenge: Reinforce "${review.conceptName}"`,
    order,
    isReviewChallenge: true,
    metadata: {
      retrievability: review.retrievability,
      similarity: review.similarity,
      urgency: review.urgencyScore,
    },
  };
}

// ============================================
// SIMPLIFIED API
// ============================================

/**
 * Simple interleaving without semantic similarity
 *
 * Use this when embeddings/content representations are not available.
 * Falls back to urgency-only based interleaving.
 *
 * @param newItems - New learning content items
 * @param dueReviews - Review items from FSRS query
 * @param config - Interleaving configuration (partial)
 */
export function createSimpleInterleavedQueue(
  newItems: SessionItem[],
  dueReviews: ReviewItem[],
  config: Partial<InterleavingConfig> = {}
): InterleavingResult {
  const finalConfig: InterleavingConfig = {
    ...DEFAULT_INTERLEAVING_CONFIG,
    ...config,
    requireSimilarity: false, // Disable similarity requirement
  };

  const {
    maxReviewsPerSession,
    minNewItemsFirst,
    interleavingRatio,
    minSpacingBetweenReviews,
  } = finalConfig;

  // Calculate target review count
  const totalTargetItems = newItems.length + Math.min(dueReviews.length, maxReviewsPerSession);
  const targetReviewCount = Math.min(
    maxReviewsPerSession,
    Math.floor(totalTargetItems * interleavingRatio),
    dueReviews.length
  );

  // Select top reviews by urgency only
  const sortedReviews = [...dueReviews]
    .sort((a, b) => b.urgencyScore - a.urgencyScore)
    .slice(0, targetReviewCount);

  // Convert to scored format (with 0 similarity)
  const scoredReviews: ScoredReviewItem[] = sortedReviews.map((r) => ({
    ...r,
    similarity: 0,
    matchDetails: {},
  }));

  // Interleave
  const interleavedItems = interleaveItems(
    newItems,
    scoredReviews,
    minNewItemsFirst,
    minSpacingBetweenReviews
  );

  const reviewItemCount = interleavedItems.filter((i) => i.isReviewChallenge).length;

  return {
    items: interleavedItems,
    stats: {
      totalItems: interleavedItems.length,
      newItems: interleavedItems.length - reviewItemCount,
      reviewItems: reviewItemCount,
      interleavingRatio: interleavedItems.length > 0 ? reviewItemCount / interleavedItems.length : 0,
      averageSimilarity: 0,
      reviewsSkippedLowSimilarity: 0,
      reviewsSkippedMaxLimit: Math.max(0, dueReviews.length - targetReviewCount),
    },
  };
}

// ============================================
// ADAPTIVE CONFIGURATION
// ============================================

/**
 * Calculate adaptive interleaving config based on user state
 *
 * Adjusts interleaving ratio based on:
 * - Review backlog size
 * - Average retrievability
 * - Session duration
 */
export function getAdaptiveConfig(
  reviewBacklogSize: number,
  averageRetrievability: number,
  sessionMinutes: number
): Partial<InterleavingConfig> {
  // Base configuration
  const config: Partial<InterleavingConfig> = {};

  // Adjust ratio based on backlog (more reviews if larger backlog)
  if (reviewBacklogSize > 20) {
    config.interleavingRatio = 0.4; // 40% reviews
    config.maxReviewsPerSession = 7;
  } else if (reviewBacklogSize > 10) {
    config.interleavingRatio = 0.35;
    config.maxReviewsPerSession = 6;
  } else if (reviewBacklogSize < 3) {
    config.interleavingRatio = 0.2; // 20% reviews
    config.maxReviewsPerSession = 3;
  }

  // Adjust based on average retrievability (more reviews if lower)
  if (averageRetrievability < 0.6) {
    config.interleavingRatio = Math.min(0.5, (config.interleavingRatio || 0.3) + 0.1);
    config.minNewItemsFirst = 1; // Start with reviews sooner
  }

  // Adjust max reviews based on session length
  if (sessionMinutes <= 15) {
    config.maxReviewsPerSession = Math.min(config.maxReviewsPerSession || 5, 3);
  } else if (sessionMinutes >= 45) {
    config.maxReviewsPerSession = Math.min((config.maxReviewsPerSession || 5) + 2, 10);
  }

  return config;
}

/**
 * Validate interleaving result for quality
 *
 * Returns issues if the interleaving has problems.
 */
export function validateInterleaving(
  result: InterleavingResult,
  config: InterleavingConfig
): string[] {
  const issues: string[] = [];

  // Check if ratio is within bounds
  if (result.stats.interleavingRatio > config.interleavingRatio + 0.1) {
    issues.push(
      `Review ratio (${(result.stats.interleavingRatio * 100).toFixed(0)}%) exceeds target (${(config.interleavingRatio * 100).toFixed(0)}%)`
    );
  }

  // Check if too many reviews
  if (result.stats.reviewItems > config.maxReviewsPerSession) {
    issues.push(
      `Too many reviews (${result.stats.reviewItems}) exceeds max (${config.maxReviewsPerSession})`
    );
  }

  // Check if new items appear first
  const firstReviewIndex = result.items.findIndex((i) => i.isReviewChallenge);
  if (firstReviewIndex >= 0 && firstReviewIndex < config.minNewItemsFirst) {
    issues.push(
      `Reviews start too early (position ${firstReviewIndex}, min is ${config.minNewItemsFirst})`
    );
  }

  return issues;
}
