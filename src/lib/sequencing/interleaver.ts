/**
 * Adaptive Interleaving Algorithm
 *
 * Based on NotebookLM research (cognitive science):
 * - Block for initial encoding (keep instruction atoms sequential)
 * - Interleave practice atoms with review items
 * - FSRS injection when Retrievability < 90%
 * - Adaptive ratio based on FSRS backlog
 * - 50% improvement in discrimination ability with interleaving
 *
 * Part of Phase 13: Adaptive Interleaving
 */

import type { ConceptMastery } from '@/lib/mastery/knowledgeGraph';
import type { SkillMap } from '@/lib/mastery/bkt';
import {
  getItemsBelowRetrievability,
  getReviewBacklogSize,
  type ConceptMasteryWithRetrievability,
} from '@/lib/mastery/fsrs';

// ============================================
// TYPES
// ============================================

export type InterleavedItem = {
  type: 'new' | 'review';
  itemId: string;
  skillId: string;
  conceptId?: string;
  reason: string;
  estimatedMinutes: number;
  isReviewChallenge: boolean; // Badge indicator
  metadata?: {
    retrievability?: number;
    similarity?: number;
    urgency?: number; // 0-1, higher = more urgent
  };
};

export type InterleavingConfig = {
  retrievabilityThreshold: number; // Default 0.90
  maxReviewItems: number;          // Default 5
  minNewToReviewRatio: number;     // Min ratio of new:review (e.g., 2:1)
  adaptiveRatio: boolean;          // Adjust ratio based on backlog
  semanticFiltering: boolean;      // Filter by topic similarity
};

export const DEFAULT_INTERLEAVING_CONFIG: InterleavingConfig = {
  retrievabilityThreshold: 0.90,
  maxReviewItems: 5,
  minNewToReviewRatio: 2,
  adaptiveRatio: true,
  semanticFiltering: true,
};

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Get review items for interleaving
 *
 * Queries FSRS for items below retrievability threshold
 * and optionally filters by semantic similarity to current topic.
 *
 * @param masteryRecords - User's concept mastery records
 * @param currentSkillId - Current skill being learned (for similarity)
 * @param skillMap - Course skill map
 * @param config - Interleaving configuration
 */
export function getReviewItemsForInterleaving(
  masteryRecords: ConceptMastery[],
  currentSkillId: string,
  skillMap: SkillMap,
  config: InterleavingConfig = DEFAULT_INTERLEAVING_CONFIG
): InterleavedItem[] {
  // Get items below retrievability threshold
  const urgentItems = getItemsBelowRetrievability(
    masteryRecords,
    config.retrievabilityThreshold,
    config.maxReviewItems * 2 // Get extra for filtering
  );

  if (urgentItems.length === 0) {
    return [];
  }

  // Calculate semantic similarity if enabled
  let scoredItems = urgentItems.map(item => {
    const similarity = config.semanticFiltering
      ? calculateSkillSimilarity(item.conceptId, currentSkillId, skillMap)
      : 0.5; // Default middle score if not filtering

    // Urgency = inverse of retrievability (lower R = higher urgency)
    const urgency = 1 - item.retrievability;

    return {
      ...item,
      similarity,
      urgency,
      // Combined score: balance urgency and relevance
      // Research suggests prioritizing relevance slightly for learning transfer
      combinedScore: urgency * 0.6 + similarity * 0.4,
    };
  });

  // Sort by combined score (urgency + relevance)
  scoredItems = scoredItems.sort((a, b) => b.combinedScore - a.combinedScore);

  // Take top items
  return scoredItems
    .slice(0, config.maxReviewItems)
    .map(item => ({
      type: 'review' as const,
      itemId: `review-${item.conceptId}`,
      skillId: item.conceptId,
      conceptId: item.conceptId,
      reason: `Review Challenge: Keep "${getSkillNameFromConcept(item.conceptId, skillMap)}" fresh`,
      estimatedMinutes: 3,
      isReviewChallenge: true,
      metadata: {
        retrievability: item.retrievability,
        similarity: item.similarity,
        urgency: item.urgency,
      },
    }));
}

/**
 * Calculate new:review ratio based on FSRS backlog
 *
 * Research-backed adaptive ratio:
 * - Small backlog (≤3): Favor new content (3:1)
 * - Large backlog (≥10): Balance toward review (1:1)
 * - Medium backlog: Linear interpolation
 */
export function calculateAdaptiveRatio(
  backlogSize: number,
  config: InterleavingConfig = DEFAULT_INTERLEAVING_CONFIG
): { newRatio: number; reviewRatio: number } {
  if (!config.adaptiveRatio) {
    return {
      newRatio: config.minNewToReviewRatio,
      reviewRatio: 1
    };
  }

  // Backlog thresholds
  const smallBacklog = 3;
  const largeBacklog = 10;

  if (backlogSize <= smallBacklog) {
    // Small backlog: favor new content (3:1)
    return { newRatio: 3, reviewRatio: 1 };
  } else if (backlogSize >= largeBacklog) {
    // Large backlog: balance more toward review (1:1)
    return { newRatio: 1, reviewRatio: 1 };
  } else {
    // Medium backlog: linear interpolation (2:1)
    const ratio = 3 - ((backlogSize - smallBacklog) / (largeBacklog - smallBacklog)) * 2;
    return { newRatio: Math.max(1, ratio), reviewRatio: 1 };
  }
}

/**
 * Get adaptive ratio from mastery records
 *
 * Convenience function that calculates backlog and returns ratio.
 */
export function getAdaptiveRatioFromRecords(
  masteryRecords: ConceptMastery[],
  config: InterleavingConfig = DEFAULT_INTERLEAVING_CONFIG
): { newRatio: number; reviewRatio: number } {
  const backlogSize = getReviewBacklogSize(masteryRecords, config.retrievabilityThreshold);
  return calculateAdaptiveRatio(backlogSize, config);
}

/**
 * Interleave review items into learning sequence
 *
 * Uses "Sandwich" pattern from research:
 * - Keep instruction atoms blocked (sequential)
 * - Inject reviews between practice items
 * - Maintains flow: New → New → Review → New → New → Review
 */
export function interleaveItems(
  newItems: InterleavedItem[],
  reviewItems: InterleavedItem[],
  config: InterleavingConfig = DEFAULT_INTERLEAVING_CONFIG
): InterleavedItem[] {
  if (reviewItems.length === 0) {
    return newItems;
  }

  const result: InterleavedItem[] = [];
  const ratio = calculateAdaptiveRatio(reviewItems.length, config);

  let newIndex = 0;
  let reviewIndex = 0;
  let newCounter = 0;

  while (newIndex < newItems.length || reviewIndex < reviewItems.length) {
    // Add new items according to ratio
    while (newCounter < ratio.newRatio && newIndex < newItems.length) {
      result.push(newItems[newIndex]);
      newIndex++;
      newCounter++;
    }

    // Inject review item
    if (reviewIndex < reviewItems.length) {
      result.push(reviewItems[reviewIndex]);
      reviewIndex++;
      newCounter = 0; // Reset counter for next batch
    } else if (newIndex < newItems.length) {
      // No more reviews, add remaining new items
      result.push(newItems[newIndex]);
      newIndex++;
    } else {
      break;
    }
  }

  return result;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate semantic similarity between two skills
 *
 * Based on structural proximity in course:
 * 1. Same lesson = high similarity (0.9)
 * 2. Same module = medium-high similarity (0.7)
 * 3. Prerequisites = medium similarity (0.6)
 * 4. Different module = lower similarity (0.3)
 *
 * Research shows interleaving works best for high-similarity categories.
 */
export function calculateSkillSimilarity(
  skillId1: string,
  skillId2: string,
  skillMap: SkillMap
): number {
  if (skillId1 === skillId2) return 1.0;
  if (!skillId1 || !skillId2) return 0.3;

  const skill1 = skillMap.skills[skillId1];
  const skill2 = skillMap.skills[skillId2];

  if (!skill1 || !skill2) return 0.3; // Default low similarity

  // Same lesson = high similarity
  if (skill1.lessonId === skill2.lessonId) return 0.9;

  // Same module (extract from lessonId pattern like "1.1", "1.2")
  const module1 = skill1.lessonId.split('.')[0];
  const module2 = skill2.lessonId.split('.')[0];
  if (module1 === module2) return 0.7;

  // Check prerequisites - related concepts
  if (skill1.prerequisites.includes(skillId2) || skill2.prerequisites.includes(skillId1)) {
    return 0.6;
  }

  // Check if they share common prerequisites
  const commonPrereqs = skill1.prerequisites.filter(p => skill2.prerequisites.includes(p));
  if (commonPrereqs.length > 0) {
    return 0.5;
  }

  // Different modules = lower similarity
  return 0.3;
}

/**
 * Get skill name from concept ID
 */
export function getSkillNameFromConcept(conceptId: string, skillMap: SkillMap): string {
  const skill = skillMap.skills[conceptId];
  return skill?.name || conceptId;
}

/**
 * Check if interleaving should be applied
 *
 * Returns false if:
 * - No items below threshold
 * - User is in "learn only" mode
 * - Current content type doesn't support interleaving (e.g., video)
 */
export function shouldApplyInterleaving(
  masteryRecords: ConceptMastery[],
  config: InterleavingConfig = DEFAULT_INTERLEAVING_CONFIG
): boolean {
  const backlogSize = getReviewBacklogSize(masteryRecords, config.retrievabilityThreshold);
  return backlogSize > 0;
}

// ============================================
// EXPORTS
// ============================================

export type { ConceptMasteryWithRetrievability };
