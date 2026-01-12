/**
 * RAG Types for Socratic Coach
 *
 * Based on LearnLM/Google DeepMind research:
 * - Index "pedagogical logic" not just content
 * - Misconception explanations per distractor
 * - Chunking at atomic teachable unit level
 *
 * Part of Phase 12: Socratic RAG Coach
 */

// ============================================
// CHUNK TYPES
// ============================================

/**
 * Pedagogical chunk types for Socratic retrieval
 *
 * - content: Regular course content (readings, video transcripts)
 * - misconception: Why a wrong answer is wrong (per distractor)
 * - hint: Progressive hints for struggling students
 * - example: Worked examples for Tier 3 interventions
 */
export type ChunkType = 'content' | 'misconception' | 'hint' | 'example';

/**
 * Extended content chunk with pedagogical metadata
 * Builds on existing ContentChunk from contentChunker.ts
 */
export type PedagogicalChunk = {
  id: string;
  text: string;
  courseId: string;
  moduleId: string;
  lessonId: string;
  atomId: string;
  atomType: 'reading' | 'video' | 'quiz' | 'practice';
  title: string;
  chunkIndex: number;

  // Pedagogical extensions (LearnLM research)
  chunkType: ChunkType;
  questionId?: string;          // For quiz-related chunks
  distractorId?: string;        // For misconception chunks (maps to option index)
  distractorText?: string;      // The wrong answer text
  misconceptionId?: string;     // If mapping to a known misconception pattern
  studentFriendly: boolean;     // Simple vs technical explanation
  difficultyLevel?: number;     // 1-5 scale

  // Metadata for retrieval
  skills?: string[];            // Related skills for filtering
  prerequisites?: string[];     // Prerequisite concepts
};

// ============================================
// MISCONCEPTION TYPES
// ============================================

/**
 * Misconception definition for a specific wrong answer
 *
 * LearnLM research: "Index WHY something is wrong, not just what's right"
 */
export type MisconceptionDefinition = {
  id: string;
  questionId: string;
  distractorIndex: number;      // Index of the wrong answer option
  distractorText: string;       // The wrong answer text

  // Explanation content
  misconceptionCategory: string; // e.g., "common_error", "partial_understanding", "confusion"
  studentExplanation: string;   // Student-friendly: "You might think this because..."
  teacherExplanation: string;   // Technical: "This reflects confusion between X and Y"

  // Socratic guidance
  clarifyingQuestion: string;   // Tier 1: "What made you think that?"
  guidingQuestion: string;      // Tier 2: "Consider what happens when..."
  workedExample?: string;       // Tier 3: Similar problem with solution

  // Metadata
  frequency?: number;           // How often students select this distractor
  relatedConcepts: string[];    // Concepts student needs to review
};

/**
 * Question with extended misconception data
 * Extends base Question type with distractor-level info
 */
export type EnrichedQuestion = {
  id: string;
  questionText: string;
  options: {
    id: string;
    text: string;
    isCorrect: boolean;
    misconception?: MisconceptionDefinition;
  }[];
  explanation: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  skills: string[];
  conceptId?: string;
};

// ============================================
// RETRIEVAL TYPES
// ============================================

/**
 * Context for retrieval queries
 * Includes student state for personalized retrieval
 */
export type RetrievalQuery = {
  query: string;
  courseId: string;
  lessonId?: string;
  atomId?: string;
  questionId?: string;
  distractorId?: string;        // If student selected a specific wrong answer

  // Student context for filtering
  studentAbility?: number;      // 0-1 scale for difficulty filtering
  preferStudentFriendly?: boolean;

  // Retrieval options
  chunkTypes?: ChunkType[];     // Filter by chunk type
  topK?: number;
  minScore?: number;
};

/**
 * Retrieved chunk with similarity score
 */
export type RetrievedChunk = {
  chunk: PedagogicalChunk;
  score: number;
  matchReason?: string;         // Why this chunk was retrieved
};

// ============================================
// CONTEXT FORMATTING
// ============================================

/**
 * Formatted context for Socratic prompts
 * Structured for LearnLM-style prompt injection
 */
export type FormattedRAGContext = {
  misconceptions: string;       // Prioritized misconception explanations
  relatedContent: string;       // Course content for context
  hints: string;                // Available hints
  examples: string;             // Worked examples
  totalChunks: number;
  truncated: boolean;
};

// ============================================
// INDEXING TYPES
// ============================================

/**
 * Result of indexing operation
 */
export type IndexingResult = {
  success: boolean;
  chunksIndexed: number;
  misconceptionsIndexed: number;
  hintsIndexed: number;
  examplesIndexed: number;
  errors: string[];
  duration: number;
};

/**
 * Index statistics
 */
export type IndexStats = {
  totalChunks: number;
  byType: Record<ChunkType, number>;
  byCourse: Record<string, number>;
  lastIndexed?: Date;
};
