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
  indexAllCourses,
  indexSingleChunk,
  getIndexStats,
  deleteCoursechunks,
  clearAllChunks,
  verifyIndex,
} from './contentIndexer';

// Vector Store (Phase 12.1)
export type {
  VectorStoreProvider,
  VectorMetadata,
  VectorRecord,
  VectorSearchResult,
  IndexStats as VectorIndexStats,
} from './vectorStore';

export {
  getVectorStoreProvider,
  getVectorStoreConfig,
  isVectorStoreConfigured,
  upsertVector,
  upsertVectors,
  searchVectors,
  deleteVectorsByCourse,
  deleteAllVectors,
  getVectorStats,
} from './vectorStore';

// Embeddings (Phase 12.1)
export type {
  EmbeddingProvider,
  EmbeddingConfig,
} from './embeddings';

export {
  embedText,
  embedBatch,
  chunkTextForEmbedding,
  getEmbeddingProvider,
  getEmbeddingConfig,
  getEmbeddingDimensions,
  isEmbeddingConfigured,
} from './embeddings';

// Misconception Bank (Phase 12.1)
export type { MisconceptionEntry, MisconceptionCategory } from './misconceptionBank';
export {
  getMisconceptionBank,
  getAllMisconceptions,
  getMisconceptionById,
  getMisconceptionsByCategory,
  getMisconceptionsBySkill,
  getMisconceptionBankStats,
} from './misconceptionBank';

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

// Phase 12.3: RAG Query Service
export type {
  RAGQueryOptions,
  RAGQueryResult,
} from './ragQuery';

export {
  queryRAG,
  queryMisconception,
  queryHints,
  queryContent,
  queryExamples,
  queryComprehensive,
  filterByScore,
  filterByType,
  getBestMisconception,
  getHintForTier,
  hasGroundingContent,
} from './ragQuery';

// Phase 12.3: Context Builder
export type {
  LearnerState,
  RAGContext,
  BuiltContext,
  SourceCitation,
} from './contextBuilder';

export {
  buildContext,
  buildMinimalContext,
  buildMisconceptionContext,
  ragContextToChunks,
  MAX_CONTEXT_TOKENS,
  MAX_CONTEXT_CHARS,
  CHARS_PER_TOKEN,
  BUDGET_ALLOCATION,
} from './contextBuilder';

// Phase 12.5: Auto-Indexing
export type {
  AutoIndexResult,
  IndexRecord,
} from './autoIndexer';

export {
  indexAtom,
  indexLesson,
  indexCourseAuto,
  removeFromIndex,
  incrementalIndex,
  needsReindex,
  getIndexingStatus,
  getIndexRecord,
} from './autoIndexer';

// Phase 12.5: Background Indexer
export type {
  BackgroundIndexResult,
  ReindexSchedule,
} from './backgroundIndexer';

export {
  runBackgroundReindex,
  forceReindexCourse,
  forceReindexAll,
  getCoursesNeedingReindex,
  getBackgroundIndexerStats,
} from './backgroundIndexer';
