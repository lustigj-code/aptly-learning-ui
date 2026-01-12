/**
 * RAG Module Index
 *
 * Socratic RAG Coach for adaptive learning
 *
 * Based on LearnLM/Google DeepMind research:
 * - Misconception indexing per distractor
 * - Tiered hint system (Tier 1 → 2 → 3)
 * - Student-friendly vs technical explanations
 *
 * Part of Phase 12: Socratic RAG Coach
 */

// Types
export type {
  ChunkType,
  PedagogicalChunk,
  MisconceptionDefinition,
  EnrichedQuestion,
  RetrievalQuery,
  RetrievedChunk,
  FormattedRAGContext,
  IndexingResult,
  IndexStats,
} from './types';

// Chunking
export {
  chunkAtomPedagogically,
  extractMisconceptionChunks,
  extractHintChunks,
  extractContentChunks,
  getChunkStats,
} from './pedagogicalChunker';

// Retrieval
export {
  retrievePedagogicalContext,
  retrieveMisconceptionDirect,
  retrieveHintsForQuestion,
  getRetrieverConfig,
} from './pedagogicalRetriever';

// Context Formatting
export {
  formatRAGContext,
  formatMisconceptionForDistractor,
  formatContextForPrompt,
  formatMinimalContext,
} from './contextFormatter';

// Indexing
export {
  indexCourse,
  indexSingleChunk,
  getIndexStats,
  deleteCoursechunks,
  verifyIndex,
} from './contentIndexer';

// Socratic Prompts (LearnLM-style)
export type {
  StudentContext,
  ActivityContext,
} from './socraticPrompts';

export {
  buildSocraticSystemPrompt,
  buildWrongAnswerPrompt,
  buildHelpRequestPrompt,
  buildCorrectAnswerPrompt,
  getSocraticGenerationConfig,
  detectStruggleLevel,
  detectEmotionalState,
} from './socraticPrompts';

// Intervention Manager (Three-Tier Hierarchy)
export type {
  InterventionTier,
  InterventionState,
  InterventionDirective,
} from './interventionManager';

export {
  getInterventionDirective,
  createInterventionState,
  advanceTier,
  resetInterventionState,
  isStillStruggling,
  serializeState,
  deserializeState,
  getTierDescription,
  getInterventionSummary,
} from './interventionManager';
