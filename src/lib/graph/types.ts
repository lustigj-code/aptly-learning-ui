/**
 * Knowledge Graph Types
 *
 * Core types for the auto-expanding knowledge graph system.
 * This replaces the static hardcoded graph with a Firestore-backed dynamic system.
 */

// ============================================
// CORE TYPES
// ============================================

/**
 * Unique identifier for concepts
 */
export type ConceptId = string;

/**
 * A single concept (node) in the knowledge graph
 */
export interface Concept {
  id: ConceptId;
  name: string;
  description: string;
  category: string;
  difficulty: 1 | 2 | 3 | 4 | 5;

  // Relationships
  prerequisites: ConceptId[];
  relatedConcepts: ConceptId[];

  // Learning configuration
  masteryThreshold: number; // 0-100, minimum to consider "mastered"
  decayRate: number; // Days until 50% decay

  // Content links
  atomIds: string[];
  sourceContentIds: string[]; // IDs of content this was extracted from

  // Search and matching
  keyTerms: string[];
  aliases: string[]; // Alternative names for deduplication

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: 'manual' | 'ai_extraction';
  confidence: number; // 0-1, AI's confidence in this concept (1.0 for manual)
}

/**
 * Default values for new concepts
 */
export const DEFAULT_CONCEPT: Omit<Concept, 'id' | 'name' | 'description' | 'createdAt' | 'updatedAt'> = {
  category: 'general',
  difficulty: 2,
  prerequisites: [],
  relatedConcepts: [],
  masteryThreshold: 75,
  decayRate: 21,
  atomIds: [],
  sourceContentIds: [],
  keyTerms: [],
  aliases: [],
  createdBy: 'manual',
  confidence: 1.0,
};

/**
 * An edge (relationship) between two concepts
 */
export interface ConceptEdge {
  id: string;
  from: ConceptId;
  to: ConceptId;
  relationship: EdgeRelationship;
  strength: number; // 0-1, how strongly connected
  createdAt: Date;
  createdBy: 'manual' | 'ai_extraction';
  confidence: number; // 0-1, AI's confidence in this relationship
}

/**
 * Types of relationships between concepts
 */
export type EdgeRelationship =
  | 'prerequisite'  // Must know A before B
  | 'related'       // Conceptually similar
  | 'builds_on'     // B extends A
  | 'contrasts'     // A and B are contrasting ideas
  | 'example_of';   // A is an example of B

/**
 * Category for organizing concepts visually
 */
export interface ConceptCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  conceptIds: ConceptId[];
  courseId: string;
}

/**
 * The full knowledge graph for a course (Firestore structure)
 */
export interface KnowledgeGraph {
  courseId: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  conceptCount: number;
  edgeCount: number;
}

// ============================================
// USER MASTERY TYPES
// ============================================

/**
 * User's mastery of a specific concept
 */
export interface ConceptMastery {
  id: string; // Format: {userId}_{conceptId}
  conceptId: ConceptId;
  userId: string;
  masteryLevel: number; // 0-100
  lastReviewedAt: Date;
  lastQuizScore: number;
  reviewCount: number;
  correctStreak: number;
  incorrectStreak: number;
  fsrsState: FSRSState;
  nextReviewAt: Date;
  history: MasteryEvent[];
}

/**
 * FSRS (Free Spaced Repetition Scheduler) state
 */
export interface FSRSState {
  stability: number; // Days until 90% retention
  difficulty: number; // 0-10, item difficulty for this user
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: 'new' | 'learning' | 'review' | 'relearning';
}

/**
 * A single mastery event (quiz, review, etc.)
 */
export interface MasteryEvent {
  timestamp: Date;
  eventType: 'quiz' | 'review' | 'practice' | 'lesson_complete';
  score: number;
  timeSpentSeconds: number;
  correct: boolean;
}

// ============================================
// GRAPH OPERATIONS TYPES
// ============================================

/**
 * Node status for visualization
 */
export type NodeStatus =
  | 'locked'       // Prerequisites not met
  | 'available'    // Ready to learn
  | 'active'       // Currently learning
  | 'mastered'     // Mastery threshold reached
  | 'needs_review';// Mastery decayed, needs review

/**
 * Processed node for visualization
 */
export interface GraphNode {
  concept: Concept;
  status: NodeStatus;
  masteryLevel: number;
  isUnlocked: boolean;
  prerequisitesMet: number;
  prerequisitesTotal: number;
}

/**
 * Result of a graph traversal operation
 */
export interface TraversalResult {
  path: ConceptId[];
  totalDistance: number;
  visitedNodes: Set<ConceptId>;
}

/**
 * Options for graph queries
 */
export interface GraphQueryOptions {
  courseId: string;
  includeRelated?: boolean;
  maxDepth?: number;
  filterByCategory?: string;
  filterByDifficulty?: [number, number]; // [min, max]
}

// ============================================
// INGESTION TYPES (for auto-expansion)
// ============================================

/**
 * A concept extracted by AI from content
 */
export interface ExtractedConcept {
  name: string;
  description: string;
  suggestedCategory: string;
  suggestedDifficulty: 1 | 2 | 3 | 4 | 5;
  suggestedPrerequisites: string[]; // Names, not IDs - will be matched
  keyTerms: string[];
  confidence: number;
  sourceContentId: string;
}

/**
 * A relationship extracted by AI
 */
export interface ExtractedRelationship {
  fromConceptName: string;
  toConceptName: string;
  relationship: EdgeRelationship;
  confidence: number;
  reasoning: string;
}

/**
 * Result of concept extraction from content
 */
export interface ExtractionResult {
  concepts: ExtractedConcept[];
  relationships: ExtractedRelationship[];
  warnings: string[];
}

/**
 * Result of merging concepts
 */
export interface MergeResult {
  merged: boolean;
  existingConceptId?: ConceptId;
  newConceptId?: ConceptId;
  confidence: number;
  reason: string;
}

// ============================================
// FIRESTORE COLLECTION NAMES
// ============================================

export const COLLECTIONS = {
  GRAPHS: 'knowledge_graphs',
  CONCEPTS: 'concepts',
  EDGES: 'edges',
  CATEGORIES: 'categories',
  MASTERY: 'concept_mastery',
} as const;

/**
 * Firestore paths helper
 */
export const PATHS = {
  graph: (courseId: string) => `${COLLECTIONS.GRAPHS}/${courseId}`,
  concepts: (courseId: string) => `${COLLECTIONS.GRAPHS}/${courseId}/${COLLECTIONS.CONCEPTS}`,
  concept: (courseId: string, conceptId: string) =>
    `${COLLECTIONS.GRAPHS}/${courseId}/${COLLECTIONS.CONCEPTS}/${conceptId}`,
  edges: (courseId: string) => `${COLLECTIONS.GRAPHS}/${courseId}/${COLLECTIONS.EDGES}`,
  edge: (courseId: string, edgeId: string) =>
    `${COLLECTIONS.GRAPHS}/${courseId}/${COLLECTIONS.EDGES}/${edgeId}`,
  categories: (courseId: string) => `${COLLECTIONS.GRAPHS}/${courseId}/${COLLECTIONS.CATEGORIES}`,
  mastery: (userId: string, conceptId: string) =>
    `${COLLECTIONS.MASTERY}/${userId}_${conceptId}`,
} as const;
