/**
 * RAG Coordinator
 *
 * Provides a unified interface for all RAG (Retrieval Augmented Generation)
 * operations in the coach system. Abstracts away the complexity of
 * different RAG query types and context building.
 *
 * Part of Phase 12.3: RAG Retrieval Integration
 */

import {
  queryComprehensive,
  queryMisconception,
  queryHints,
  queryContent,
  getBestMisconception,
  getHintForTier,
} from '@/lib/rag/ragQuery';
import type { RetrievedChunk, ChunkType } from '@/lib/rag/types';
import { buildContext, type BuiltContext, type LearnerState } from '@/lib/rag/contextBuilder';

// ============================================
// TYPES
// ============================================

export interface RAGContext {
  relevantContent: string[];
  sourceReferences: SourceReference[];
  confidenceScore: number;
  queryTimeMs: number;
}

export interface SourceReference {
  chunkId: string;
  title: string;
  lessonId?: string;
  chunkType: ChunkType;
  relevanceScore: number;
}

export interface CoachingContextOptions {
  courseId: string;
  lessonId?: string;
  questionId?: string;
  selectedAnswer?: string;
  conceptId?: string;
  masteryLevel?: number;
  isStruggling?: boolean;
  maxResults?: number;
}

export interface MisconceptionResult {
  found: boolean;
  explanation?: string;
  sourceChunk?: RetrievedChunk;
}

export interface HintResult {
  tier: 1 | 2 | 3;
  hint: string;
  sourceChunk?: RetrievedChunk;
}

// ============================================
// MAIN COORDINATOR FUNCTIONS
// ============================================

/**
 * Get comprehensive coaching context for a user query
 *
 * Retrieves relevant content from the RAG system and formats it
 * for use in coach prompts.
 *
 * @param query - User's question or message
 * @param options - Query options (course, lesson, etc.)
 * @returns Formatted RAG context
 */
export async function getCoachingContext(
  query: string,
  options: CoachingContextOptions
): Promise<RAGContext> {
  const startTime = Date.now();

  try {
    const result = await queryComprehensive(query, options.courseId, {
      lessonId: options.lessonId,
      questionId: options.questionId,
      selectedAnswer: options.selectedAnswer,
      studentAbility: options.masteryLevel ? options.masteryLevel / 100 : 0.5,
      isStruggling: options.isStruggling ?? false,
    });

    const queryTimeMs = Date.now() - startTime;

    return {
      relevantContent: result.chunks.map((c) => c.chunk.text),
      sourceReferences: result.chunks.map((c) => ({
        chunkId: c.chunk.id,
        title: c.chunk.title || 'Course Content',
        lessonId: c.chunk.lessonId,
        chunkType: c.chunk.chunkType,
        relevanceScore: c.score,
      })),
      confidenceScore: calculateConfidenceScore(result.chunks),
      queryTimeMs,
    };
  } catch (error) {
    console.error('[RAGCoordinator] Error getting coaching context:', error);

    return {
      relevantContent: [],
      sourceReferences: [],
      confidenceScore: 0,
      queryTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Get misconception explanation for a wrong answer
 *
 * @param query - User's question or context
 * @param courseId - Course identifier
 * @param selectedAnswer - The incorrect answer selected
 * @returns Misconception explanation if found
 */
export async function getMisconceptionContext(
  query: string,
  courseId: string,
  selectedAnswer: string
): Promise<MisconceptionResult> {
  try {
    // queryMisconception expects: courseId, questionId, selectedAnswer, studentAbility
    // Use query as questionId for now
    const result = await queryMisconception(courseId, query, selectedAnswer);

    const bestMisconception = getBestMisconception(result.chunks);

    if (!bestMisconception) {
      return { found: false };
    }

    return {
      found: true,
      explanation: bestMisconception.chunk.text,
      sourceChunk: bestMisconception,
    };
  } catch (error) {
    console.error('[RAGCoordinator] Error getting misconception:', error);
    return { found: false };
  }
}

/**
 * Get hint for current intervention tier
 *
 * @param query - User's question or context
 * @param courseId - Course identifier
 * @param tier - Current intervention tier (1-3)
 * @returns Appropriate hint for the tier
 */
export async function getHintForContext(
  query: string,
  courseId: string,
  tier: 1 | 2 | 3
): Promise<HintResult> {
  try {
    // queryHints expects: courseId, questionId
    const result = await queryHints(courseId, query);

    // Convert hints to RetrievedChunk format for getHintForTier
    const chunks: RetrievedChunk[] = result.hints.map((hint, index) => ({
      chunk: hint,
      score: 1 - (index * 0.1),
    }));

    const hint = getHintForTier(chunks, tier);

    if (!hint) {
      return {
        tier,
        hint: getDefaultHint(tier),
      };
    }

    return {
      tier,
      hint: hint.chunk.text,
      sourceChunk: hint,
    };
  } catch (error) {
    console.error('[RAGCoordinator] Error getting hint:', error);
    return {
      tier,
      hint: getDefaultHint(tier),
    };
  }
}

/**
 * Get content for building context in coach prompts
 *
 * @param query - User's question or context
 * @param courseId - Course identifier
 * @param lessonId - Optional lesson filter
 * @param maxChunks - Maximum chunks to retrieve
 * @returns Retrieved content chunks
 */
export async function getContentContext(
  query: string,
  courseId: string,
  lessonId?: string,
  maxChunks: number = 5
): Promise<RetrievedChunk[]> {
  try {
    const result = await queryContent(query, courseId, lessonId, {
      topK: maxChunks,
    });

    return result.chunks;
  } catch (error) {
    console.error('[RAGCoordinator] Error getting content context:', error);
    return [];
  }
}

// ============================================
// CONTEXT BUILDING
// ============================================

/**
 * Build complete context for Socratic coaching
 *
 * Combines RAG retrieval with learner state to produce
 * a formatted context string for the coach prompt.
 *
 * @param chunks - Retrieved RAG chunks
 * @param learnerState - Current learner state
 * @param interventionTier - Current intervention tier
 * @returns Built context with metadata
 */
export function buildCoachingPromptContext(
  chunks: RetrievedChunk[],
  learnerState: LearnerState,
  interventionTier: 1 | 2 | 3
): BuiltContext {
  return buildContext(chunks, learnerState, interventionTier);
}

// ============================================
// HELPERS
// ============================================

/**
 * Calculate confidence score from retrieved chunks
 */
function calculateConfidenceScore(chunks: RetrievedChunk[]): number {
  if (chunks.length === 0) return 0;

  const avgScore = chunks.reduce((sum, c) => sum + c.score, 0) / chunks.length;
  const hasHighConfidence = chunks.some((c) => c.score > 0.8);
  const hasMisconception = chunks.some((c) => c.chunk.chunkType === 'misconception');

  let confidence = avgScore;

  // Boost if we have high-confidence matches
  if (hasHighConfidence) {
    confidence = Math.min(1, confidence + 0.1);
  }

  // Boost if we found relevant misconceptions
  if (hasMisconception) {
    confidence = Math.min(1, confidence + 0.05);
  }

  return Math.round(confidence * 100) / 100;
}

/**
 * Get default hint when RAG doesn't return results
 */
function getDefaultHint(tier: 1 | 2 | 3): string {
  switch (tier) {
    case 1:
      return "What's your current thinking on this? Walk me through your reasoning.";
    case 2:
      return "Let's focus on the key concept here. What do you think is most important?";
    case 3:
      return "Let me show you a similar example to help clarify the approach.";
    default:
      return "Let's think about this together. What do you already know?";
  }
}

/**
 * Format source references for citation display
 */
export function formatSourceReferences(refs: SourceReference[]): string {
  if (refs.length === 0) return '';

  return refs
    .slice(0, 3)
    .map((ref, i) => `[${i + 1}] ${ref.title}`)
    .join('\n');
}

/**
 * Check if RAG context is sufficient for grounded response
 */
export function hasAdequateContext(context: RAGContext): boolean {
  return (
    context.relevantContent.length > 0 &&
    context.confidenceScore >= 0.3
  );
}

/**
 * Get RAG statistics for debugging/monitoring
 */
export function getRAGStats(context: RAGContext): {
  chunksRetrieved: number;
  avgRelevance: number;
  topChunkType: ChunkType | null;
  queryTimeMs: number;
} {
  const avgRelevance =
    context.sourceReferences.length > 0
      ? context.sourceReferences.reduce((sum, r) => sum + r.relevanceScore, 0) /
        context.sourceReferences.length
      : 0;

  const chunkTypeCounts = new Map<ChunkType, number>();
  for (const ref of context.sourceReferences) {
    chunkTypeCounts.set(ref.chunkType, (chunkTypeCounts.get(ref.chunkType) || 0) + 1);
  }

  let topChunkType: ChunkType | null = null;
  let maxCount = 0;
  for (const [type, count] of chunkTypeCounts) {
    if (count > maxCount) {
      maxCount = count;
      topChunkType = type;
    }
  }

  return {
    chunksRetrieved: context.sourceReferences.length,
    avgRelevance: Math.round(avgRelevance * 100) / 100,
    topChunkType,
    queryTimeMs: context.queryTimeMs,
  };
}
