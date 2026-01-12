/**
 * Instruction Blocking Logic
 *
 * Research-backed interleaving strategy:
 * - Block instruction atoms (reading, video) for initial encoding
 * - Only interleave practice/quiz atoms with reviews
 * - Keep sequential instruction content together for comprehension
 *
 * Based on cognitive load theory:
 * - New information requires focused attention
 * - Interrupting instruction with reviews hurts encoding
 * - Practice is ideal for interleaving (strengthens discrimination)
 *
 * Part of Phase 13.2: Dynamic Queue Assembly
 */

import type { SessionItem } from './sessionBuilder';
import type { InterleavedItem } from '@/lib/sequencing/interleaver';

// ============================================
// TYPES
// ============================================

/**
 * Atom types that should NOT be interleaved with reviews
 * These are "instruction" atoms that require uninterrupted focus
 */
export type InstructionAtomType = 'learn' | 'warmup' | 'cooldown';

/**
 * Atom types that CAN be interleaved with reviews
 * These are "practice" atoms where interleaving improves discrimination
 */
export type PracticeAtomType = 'practice' | 'quiz';

/**
 * Block of consecutive instruction atoms
 */
interface InstructionBlock {
  startIndex: number;
  endIndex: number;
  items: SessionItem[];
}

/**
 * Configuration for instruction blocking
 */
export interface InstructionBlockingConfig {
  /** Keep instruction atoms blocked (sequential) */
  blockInstructions: boolean;
  /** Minimum consecutive instruction atoms to form a block */
  minBlockSize: number;
  /** Maximum reviews to inject between practice items */
  maxReviewsPerPractice: number;
}

export const DEFAULT_BLOCKING_CONFIG: InstructionBlockingConfig = {
  blockInstructions: true,
  minBlockSize: 1,
  maxReviewsPerPractice: 2,
};

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Check if an item is an instruction atom (should not be interleaved)
 */
export function isInstructionAtom(item: SessionItem): boolean {
  // Instruction atoms: new learning content, warmups, cooldowns
  // These should stay in sequence for proper comprehension
  const instructionTypes: InstructionAtomType[] = ['learn', 'warmup', 'cooldown'];
  return instructionTypes.includes(item.type as InstructionAtomType);
}

/**
 * Check if an item is a practice atom (can be interleaved)
 */
export function isPracticeAtom(item: SessionItem): boolean {
  // Practice atoms: practice exercises, quizzes
  // These benefit from interleaving for discrimination learning
  const practiceTypes: PracticeAtomType[] = ['practice', 'quiz'];
  return practiceTypes.includes(item.type as PracticeAtomType);
}

/**
 * Check if an item is a review item
 */
export function isReviewItem(item: SessionItem): boolean {
  return item.type === 'review' || item.isReviewChallenge === true;
}

/**
 * Find blocks of consecutive instruction atoms
 *
 * Used to identify sequences that should stay together.
 */
export function findInstructionBlocks(
  items: SessionItem[],
  config: InstructionBlockingConfig = DEFAULT_BLOCKING_CONFIG
): InstructionBlock[] {
  const blocks: InstructionBlock[] = [];
  let currentBlock: SessionItem[] = [];
  let blockStartIndex = -1;

  items.forEach((item, index) => {
    if (isInstructionAtom(item)) {
      if (currentBlock.length === 0) {
        blockStartIndex = index;
      }
      currentBlock.push(item);
    } else {
      if (currentBlock.length >= config.minBlockSize) {
        blocks.push({
          startIndex: blockStartIndex,
          endIndex: blockStartIndex + currentBlock.length - 1,
          items: [...currentBlock],
        });
      }
      currentBlock = [];
      blockStartIndex = -1;
    }
  });

  // Don't forget the last block
  if (currentBlock.length >= config.minBlockSize) {
    blocks.push({
      startIndex: blockStartIndex,
      endIndex: blockStartIndex + currentBlock.length - 1,
      items: [...currentBlock],
    });
  }

  return blocks;
}

/**
 * Get valid interleaving positions in the queue
 *
 * Returns indices where review items can be inserted without
 * breaking instruction blocks.
 */
export function getValidInterleavingPositions(
  items: SessionItem[],
  config: InstructionBlockingConfig = DEFAULT_BLOCKING_CONFIG
): number[] {
  const validPositions: number[] = [];
  const instructionBlocks = findInstructionBlocks(items, config);

  // Build set of blocked indices
  const blockedIndices = new Set<number>();
  instructionBlocks.forEach(block => {
    // Block all positions within instruction blocks (except after the block)
    for (let i = block.startIndex; i <= block.endIndex; i++) {
      blockedIndices.add(i);
    }
  });

  // Find valid positions (after practice items or between blocks)
  items.forEach((item, index) => {
    // After practice items are great spots for reviews
    if (isPracticeAtom(item)) {
      validPositions.push(index + 1);
    }
    // Between instruction blocks is also valid
    else if (!blockedIndices.has(index) && index > 0) {
      const prevItem = items[index - 1];
      if (isInstructionAtom(prevItem) && !isInstructionAtom(item)) {
        validPositions.push(index);
      }
    }
  });

  // Deduplicate and sort
  return [...new Set(validPositions)].sort((a, b) => a - b);
}

/**
 * Interleave review items while respecting instruction blocks
 *
 * This is the main function that applies instruction blocking rules
 * when inserting FSRS review items into the learning queue.
 */
export function interleaveWithBlocking(
  newItems: SessionItem[],
  reviewItems: InterleavedItem[],
  config: InstructionBlockingConfig = DEFAULT_BLOCKING_CONFIG
): SessionItem[] {
  if (!config.blockInstructions || reviewItems.length === 0) {
    // If blocking is disabled, use simple interleaving
    return simpleInterleave(newItems, reviewItems);
  }

  const result: SessionItem[] = [];
  const validPositions = getValidInterleavingPositions(newItems, config);
  let reviewIndex = 0;
  let positionIndex = 0;
  let order = 0;

  for (let i = 0; i < newItems.length; i++) {
    // Add the new item
    result.push({ ...newItems[i], order: order++ });

    // Check if this position is valid for review insertion
    const currentPosition = i + 1;
    if (
      validPositions[positionIndex] === currentPosition &&
      reviewIndex < reviewItems.length
    ) {
      // Count how many reviews we can insert here
      let reviewsToInsert = 0;
      const maxReviews = isPracticeAtom(newItems[i])
        ? config.maxReviewsPerPractice
        : 1;

      while (
        reviewsToInsert < maxReviews &&
        reviewIndex + reviewsToInsert < reviewItems.length
      ) {
        reviewsToInsert++;
      }

      // Insert reviews
      for (let r = 0; r < reviewsToInsert && reviewIndex < reviewItems.length; r++) {
        const review = reviewItems[reviewIndex];
        result.push({
          type: 'review',
          itemId: review.itemId,
          skillId: review.skillId,
          estimatedMinutes: review.estimatedMinutes,
          reason: review.reason,
          order: order++,
          isReviewChallenge: true,
          metadata: review.metadata,
        });
        reviewIndex++;
      }
      positionIndex++;
    }
  }

  // Add any remaining reviews at the end (before cooldown if present)
  const cooldownIndex = result.findIndex(i => i.type === 'cooldown');
  while (reviewIndex < reviewItems.length) {
    const review = reviewItems[reviewIndex];
    const insertPosition = cooldownIndex > -1 ? cooldownIndex : result.length;

    result.splice(insertPosition, 0, {
      type: 'review',
      itemId: review.itemId,
      skillId: review.skillId,
      estimatedMinutes: review.estimatedMinutes,
      reason: review.reason,
      order: order++,
      isReviewChallenge: true,
      metadata: review.metadata,
    });
    reviewIndex++;
  }

  // Re-number order after insertions
  return result.map((item, idx) => ({ ...item, order: idx }));
}

/**
 * Simple interleave without blocking rules (fallback)
 */
function simpleInterleave(
  newItems: SessionItem[],
  reviewItems: InterleavedItem[]
): SessionItem[] {
  const result: SessionItem[] = [];
  let newIdx = 0;
  let reviewIdx = 0;
  let order = 0;

  // Interleave in 2:1 ratio (2 new, 1 review)
  while (newIdx < newItems.length || reviewIdx < reviewItems.length) {
    // Add 2 new items
    for (let i = 0; i < 2 && newIdx < newItems.length; i++) {
      result.push({ ...newItems[newIdx], order: order++ });
      newIdx++;
    }

    // Add 1 review
    if (reviewIdx < reviewItems.length) {
      const review = reviewItems[reviewIdx];
      result.push({
        type: 'review',
        itemId: review.itemId,
        skillId: review.skillId,
        estimatedMinutes: review.estimatedMinutes,
        reason: review.reason,
        order: order++,
        isReviewChallenge: true,
        metadata: review.metadata,
      });
      reviewIdx++;
    }
  }

  return result;
}

/**
 * Analyze queue for instruction blocking violations
 *
 * Returns issues if reviews are incorrectly placed within instruction blocks.
 * Useful for debugging and validation.
 */
export function analyzeBlockingViolations(
  items: SessionItem[],
  config: InstructionBlockingConfig = DEFAULT_BLOCKING_CONFIG
): { hasViolations: boolean; violations: string[] } {
  const violations: string[] = [];
  const blocks = findInstructionBlocks(items.filter(i => !isReviewItem(i)), config);

  blocks.forEach((block, blockIdx) => {
    // Check if any review items are within this block's span
    const blockItems = items.slice(block.startIndex, block.endIndex + 1);
    const reviewsInBlock = blockItems.filter(isReviewItem);

    if (reviewsInBlock.length > 0) {
      violations.push(
        `Block ${blockIdx + 1} (items ${block.startIndex}-${block.endIndex}) contains ${reviewsInBlock.length} review item(s)`
      );
    }
  });

  return {
    hasViolations: violations.length > 0,
    violations,
  };
}

/**
 * Get queue stats for display
 */
export function getQueueStats(items: SessionItem[]): {
  totalItems: number;
  instructionItems: number;
  practiceItems: number;
  reviewItems: number;
  instructionBlocks: number;
  estimatedMinutes: number;
} {
  const instructionItems = items.filter(isInstructionAtom).length;
  const practiceItems = items.filter(isPracticeAtom).length;
  const reviewItems = items.filter(isReviewItem).length;
  const blocks = findInstructionBlocks(items);

  return {
    totalItems: items.length,
    instructionItems,
    practiceItems,
    reviewItems,
    instructionBlocks: blocks.length,
    estimatedMinutes: items.reduce((sum, i) => sum + i.estimatedMinutes, 0),
  };
}

// ============================================
// EXPORTS
// ============================================

export type { InstructionBlock };
