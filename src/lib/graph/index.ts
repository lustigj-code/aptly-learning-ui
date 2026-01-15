/**
 * Knowledge Graph Module
 *
 * Auto-expanding knowledge graph system for the Mindless Learning Platform.
 * Replaces the static hardcoded graph with a Firestore-backed dynamic system.
 */

// Types
export * from './types';

// Core service (CRUD operations)
export {
  // Graph operations
  createGraph,
  getGraph,
  updateGraphStats,
  // Concept operations
  addConcept,
  getConcept,
  getAllConcepts,
  getConceptsByCategory,
  getConceptsByDifficulty,
  updateConcept,
  deleteConcept,
  searchConcepts,
  findConceptByName,
  // Edge operations
  addEdge,
  getAllEdges,
  getEdgesForConcept,
  getPrerequisiteEdges,
  deleteEdge,
  // Category operations
  addCategory,
  getAllCategories,
  updateCategory,
  // Mastery operations
  getConceptMastery,
  getUserMastery,
  updateConceptMastery,
  // Batch operations
  importConcepts,
  importEdges,
  // Helpers
  generateConceptId,
} from './KnowledgeGraphService';

// Graph traversal (path finding, analysis)
export {
  // Prerequisites
  getDirectPrerequisites,
  getAllPrerequisites,
  getDependents,
  getAllDependents,
  // Unlock status
  isConceptUnlocked,
  getUnlockStatus,
  // Discovery
  getReadyConcepts,
  getDecayingConcepts,
  getNextReviewConcept,
  // Learning paths
  getLearningPath,
  getShortestPath,
  // Analysis
  topologicalSort,
  getEntryPoints,
  getLeafConcepts,
  getConceptDepth,
  // Visualization
  buildGraphNodes,
  getRelatedWithinHops,
} from './graphTraversal';

// Auto-expansion (for content ingestion)
export {
  expandGraph,
  inferPrerequisites,
  inferCategory,
  validateExtractedConcept,
  validateExtractionResult,
  batchExpandGraph,
  rebuildPrerequisiteEdges,
  type ExpansionResult,
} from './autoExpansion';

// Concept merger (deduplication)
export {
  findSimilarConcepts,
  mergeConcepts,
  shouldMergeConcepts,
  findPotentialDuplicates,
  mergeExistingConcepts,
  addAlias,
  suggestAliases,
  calculateConceptQuality,
  type SimilarityResult,
} from './conceptMerger';

// Migration utilities
export {
  migrateSocialMediaMarketingGraph,
  migrateStaticGraph,
  verifyMigration,
  rollbackMigration,
  runMigration,
  type MigrationResult,
} from './migration';
