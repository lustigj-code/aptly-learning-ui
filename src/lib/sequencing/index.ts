/**
 * Sequencing Module Index
 *
 * Adaptive content sequencing for learning flow.
 * Uses FSRS-based interleaving to inject review items
 * into the learning sequence when retrievability drops.
 *
 * Part of Phase 13: Adaptive Interleaving
 */

// Types
export type {
  InterleavedItem,
  InterleavingConfig,
  ConceptMasteryWithRetrievability,
} from './interleaver';

// Interleaver
export {
  getReviewItemsForInterleaving,
  calculateAdaptiveRatio,
  getAdaptiveRatioFromRecords,
  interleaveItems,
  calculateSkillSimilarity,
  getSkillNameFromConcept,
  shouldApplyInterleaving,
  DEFAULT_INTERLEAVING_CONFIG,
} from './interleaver';
