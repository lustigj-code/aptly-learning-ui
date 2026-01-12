/**
 * RAG Query Service
 *
 * Handles vector store queries with course/lesson filtering.
 * Returns top-k relevant chunks with similarity scores.
 *
 * Part of Phase 12.3: RAG Retrieval Integration
 */

import { retrievePedagogicalContext, retrieveHintsForQuestion } from './pedagogicalRetriever';
import type { RetrievedChunk, RetrievalQuery, ChunkType, PedagogicalChunk } from './types';

// ============================================
// TYPES
// ============================================

export interface RAGQueryOptions {
  query: string;
  courseId: string;
  lessonId?: string;
  atomId?: string;
  questionId?: string;
  selectedAnswer?: string;
  studentAbility?: number;
  preferStudentFriendly?: boolean;
  topK?: number;
  minScore?: number;
  chunkTypes?: ChunkType[];
}

export interface RAGQueryResult {
  chunks: RetrievedChunk[];
  totalRetrieved: number;
  queryTime: number;
  hasRelevantContent: boolean;
  topScore: number;
  metadata: {
    courseId: string;
    lessonId?: string;
    chunkTypesRetrieved: ChunkType[];
  };
}

// ============================================
// CONFIGURATION
// ============================================

const DEFAULT_TOP_K = 5;
const DEFAULT_MIN_SCORE = 0.4;
const RELEVANCE_THRESHOLD = 0.5;

// ============================================
// MAIN QUERY FUNCTION
// ============================================

/**
 * Query the RAG vector store for relevant content
 *
 * Filters by course/lesson context and returns top-k chunks with scores.
 *
 * @param options - Query options including context filters
 * @returns RAG query result with chunks and metadata
 */
export async function queryRAG(options: RAGQueryOptions): Promise<RAGQueryResult> {
  const startTime = Date.now();

  const {
    query,
    courseId,
    lessonId,
    atomId,
    questionId,
    selectedAnswer,
    studentAbility = 0.5,
    preferStudentFriendly = true,
    topK = DEFAULT_TOP_K,
    minScore = DEFAULT_MIN_SCORE,
    chunkTypes,
  } = options;

  // Build retrieval query
  const retrievalQuery: RetrievalQuery = {
    query,
    courseId,
    lessonId,
    atomId,
    questionId,
    distractorId: selectedAnswer,
    studentAbility,
    preferStudentFriendly,
    topK,
    minScore,
    chunkTypes,
  };

  try {
    // Retrieve pedagogical context
    const chunks = await retrievePedagogicalContext(retrievalQuery);

    const queryTime = Date.now() - startTime;

    // Calculate metadata
    const chunkTypesRetrieved = Array.from(new Set(chunks.map((c) => c.chunk.chunkType)));
    const topScore = chunks.length > 0 ? chunks[0].score : 0;

    return {
      chunks,
      totalRetrieved: chunks.length,
      queryTime,
      hasRelevantContent: chunks.length > 0 && topScore >= RELEVANCE_THRESHOLD,
      topScore,
      metadata: {
        courseId,
        lessonId,
        chunkTypesRetrieved,
      },
    };
  } catch (error) {
    console.error('[RAGQuery] Query failed:', error);

    // Return empty result on error
    return {
      chunks: [],
      totalRetrieved: 0,
      queryTime: Date.now() - startTime,
      hasRelevantContent: false,
      topScore: 0,
      metadata: {
        courseId,
        lessonId,
        chunkTypesRetrieved: [],
      },
    };
  }
}

/**
 * Query specifically for misconception content
 *
 * Used when a student selects a wrong answer.
 */
export async function queryMisconception(
  courseId: string,
  questionId: string,
  selectedAnswer: string,
  studentAbility?: number
): Promise<RAGQueryResult> {
  return queryRAG({
    query: `misconception for answer ${selectedAnswer}`,
    courseId,
    questionId,
    selectedAnswer,
    studentAbility,
    chunkTypes: ['misconception'],
    topK: 3,
    minScore: 0.3,
  });
}

/**
 * Query for hints related to a question
 *
 * Returns hints in tier order (1, 2, 3).
 */
export async function queryHints(
  courseId: string,
  questionId: string
): Promise<{
  hints: PedagogicalChunk[];
  tiers: number[];
}> {
  try {
    const hints = await retrieveHintsForQuestion(questionId, courseId);

    return {
      hints,
      tiers: hints.map((h) => h.chunkIndex + 1),
    };
  } catch (error) {
    console.error('[RAGQuery] Hint query failed:', error);
    return {
      hints: [],
      tiers: [],
    };
  }
}

/**
 * Query for content related to a concept
 *
 * Used for general help requests.
 */
export async function queryContent(
  query: string,
  courseId: string,
  lessonId?: string,
  options?: {
    topK?: number;
    preferStudentFriendly?: boolean;
  }
): Promise<RAGQueryResult> {
  return queryRAG({
    query,
    courseId,
    lessonId,
    topK: options?.topK ?? DEFAULT_TOP_K,
    preferStudentFriendly: options?.preferStudentFriendly ?? true,
    chunkTypes: ['content'],
  });
}

/**
 * Query for examples related to a concept
 *
 * Used for Tier 3 interventions (worked examples).
 */
export async function queryExamples(
  query: string,
  courseId: string,
  lessonId?: string
): Promise<RAGQueryResult> {
  return queryRAG({
    query,
    courseId,
    lessonId,
    chunkTypes: ['example'],
    topK: 3,
    minScore: 0.4,
  });
}

/**
 * Multi-type query for comprehensive context
 *
 * Retrieves a mix of content types based on student situation.
 */
export async function queryComprehensive(
  query: string,
  courseId: string,
  options: {
    lessonId?: string;
    questionId?: string;
    selectedAnswer?: string;
    studentAbility?: number;
    isStruggling?: boolean;
  }
): Promise<RAGQueryResult> {
  const { isStruggling = false, ...restOptions } = options;

  // Determine chunk types based on student state
  let chunkTypes: ChunkType[];
  if (options.selectedAnswer) {
    // Wrong answer scenario - prioritize misconceptions
    chunkTypes = ['misconception', 'hint', 'content'];
  } else if (isStruggling) {
    // Struggling student - include hints and examples
    chunkTypes = ['hint', 'content', 'example'];
  } else {
    // General query - focus on content
    chunkTypes = ['content', 'hint'];
  }

  return queryRAG({
    query,
    courseId,
    ...restOptions,
    chunkTypes,
    topK: 5,
  });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Filter chunks by minimum score
 */
export function filterByScore(
  chunks: RetrievedChunk[],
  minScore: number
): RetrievedChunk[] {
  return chunks.filter((c) => c.score >= minScore);
}

/**
 * Filter chunks by type
 */
export function filterByType(
  chunks: RetrievedChunk[],
  types: ChunkType[]
): RetrievedChunk[] {
  return chunks.filter((c) => types.includes(c.chunk.chunkType));
}

/**
 * Get the best misconception chunk if available
 */
export function getBestMisconception(
  chunks: RetrievedChunk[]
): RetrievedChunk | null {
  const misconceptions = filterByType(chunks, ['misconception']);
  return misconceptions.length > 0 ? misconceptions[0] : null;
}

/**
 * Get hint for a specific tier
 */
export function getHintForTier(
  chunks: RetrievedChunk[],
  tier: 1 | 2 | 3
): RetrievedChunk | null {
  const hints = filterByType(chunks, ['hint']);
  // chunkIndex is 0-based, tier is 1-based
  return hints.find((h) => h.chunk.chunkIndex === tier - 1) || null;
}

/**
 * Check if retrieved content is sufficient for grounding
 */
export function hasGroundingContent(result: RAGQueryResult): boolean {
  return (
    result.hasRelevantContent &&
    result.chunks.some((c) => c.score >= RELEVANCE_THRESHOLD)
  );
}
