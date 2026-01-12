/**
 * Pedagogical Retrieval Service
 *
 * Extends base retrieval with LearnLM research-backed features:
 * - Direct misconception lookup by distractor
 * - Chunk type filtering
 * - Student ability-aware retrieval
 *
 * Part of Phase 12: Socratic RAG Coach
 */

import {
  collection,
  query,
  getDocs,
  where,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { embedText } from '../ai/embeddingService';
import type { PedagogicalChunk, RetrievalQuery, RetrievedChunk, ChunkType } from './types';

// ============================================
// CONFIGURATION
// ============================================

const COLLECTION_NAME = 'content_embeddings';
const PEDAGOGICAL_COLLECTION = 'pedagogical_chunks';
const DEFAULT_TOP_K = 5;
const DEFAULT_MIN_SCORE = 0.5;

// ============================================
// HELPER FUNCTIONS
// ============================================

function getDb() {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  return db;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

// ============================================
// MAIN RETRIEVAL FUNCTIONS
// ============================================

/**
 * Retrieve pedagogical context with priority on misconceptions
 *
 * If a distractorId is provided, directly looks up misconception first.
 * Then supplements with related content via semantic search.
 */
export async function retrievePedagogicalContext(
  queryCtx: RetrievalQuery
): Promise<RetrievedChunk[]> {
  const results: RetrievedChunk[] = [];
  const topK = queryCtx.topK || DEFAULT_TOP_K;
  const minScore = queryCtx.minScore || DEFAULT_MIN_SCORE;

  // Priority 1: Direct misconception lookup if distractor is known
  if (queryCtx.questionId && queryCtx.distractorId) {
    const misconception = await retrieveMisconceptionDirect(
      queryCtx.questionId,
      queryCtx.distractorId,
      queryCtx.courseId
    );

    if (misconception) {
      results.push({
        chunk: misconception,
        score: 1.0, // Direct match
        matchReason: 'Direct misconception lookup',
      });
    }
  }

  // Priority 2: Semantic search for additional context
  try {
    const semanticResults = await retrieveBySemanticSimilarity(
      queryCtx.query,
      {
        courseId: queryCtx.courseId,
        lessonId: queryCtx.lessonId,
        chunkTypes: queryCtx.chunkTypes,
        topK: topK - results.length, // Reduce by direct matches
        minScore,
        preferStudentFriendly: queryCtx.preferStudentFriendly,
      }
    );

    // Add semantic results, avoiding duplicates
    for (const result of semanticResults) {
      const isDuplicate = results.some((r) => r.chunk.id === result.chunk.id);
      if (!isDuplicate) {
        results.push(result);
      }
    }
  } catch (error) {
    console.error('[PedagogicalRetriever] Semantic search failed:', error);
    // Continue with direct matches only
  }

  // Sort by score (direct matches first, then by similarity)
  return results.sort((a, b) => b.score - a.score).slice(0, topK);
}

/**
 * Direct lookup of misconception by question and distractor
 *
 * LearnLM research: "When we know which wrong answer was selected,
 * retrieve the specific misconception explanation"
 */
export async function retrieveMisconceptionDirect(
  questionId: string,
  distractorId: string,
  courseId: string
): Promise<PedagogicalChunk | null> {
  try {
    const firestore = getDb();

    // Try pedagogical collection first
    const pedRef = collection(firestore, PEDAGOGICAL_COLLECTION);
    const pedQuery = query(
      pedRef,
      where('courseId', '==', courseId),
      where('questionId', '==', questionId),
      where('distractorId', '==', distractorId),
      where('chunkType', '==', 'misconception'),
      limit(1)
    );

    const pedSnapshot = await getDocs(pedQuery);

    if (!pedSnapshot.empty) {
      const doc = pedSnapshot.docs[0];
      return doc.data() as PedagogicalChunk;
    }

    // Fallback: check content_embeddings collection
    const contentRef = collection(firestore, COLLECTION_NAME);
    const contentQuery = query(
      contentRef,
      where('courseId', '==', courseId),
      where('questionId', '==', questionId),
      where('distractorId', '==', distractorId),
      limit(1)
    );

    const contentSnapshot = await getDocs(contentQuery);

    if (!contentSnapshot.empty) {
      const doc = contentSnapshot.docs[0];
      const data = doc.data();

      // Convert to PedagogicalChunk format
      return {
        id: doc.id,
        text: data.text || '',
        courseId: data.courseId || courseId,
        moduleId: data.moduleId || '',
        lessonId: data.lessonId || '',
        atomId: data.atomId || '',
        atomType: data.atomType || 'quiz',
        title: data.title || '',
        chunkIndex: data.chunkIndex || 0,
        chunkType: 'misconception',
        questionId,
        distractorId,
        studentFriendly: true,
      };
    }

    return null;
  } catch (error) {
    console.error('[PedagogicalRetriever] Direct lookup failed:', error);
    return null;
  }
}

/**
 * Semantic similarity search for pedagogical chunks
 */
async function retrieveBySemanticSimilarity(
  queryText: string,
  options: {
    courseId: string;
    lessonId?: string;
    chunkTypes?: ChunkType[];
    topK: number;
    minScore: number;
    preferStudentFriendly?: boolean;
  }
): Promise<RetrievedChunk[]> {
  if (!queryText || queryText.trim().length === 0) {
    return [];
  }

  const firestore = getDb();

  // Embed the query
  const queryEmbedding = await embedText(queryText);

  // Query both collections
  const collections = [COLLECTION_NAME, PEDAGOGICAL_COLLECTION];
  const allChunks: { chunk: PedagogicalChunk; embedding: number[] }[] = [];

  for (const collName of collections) {
    const collRef = collection(firestore, collName);
    let q = query(collRef, where('courseId', '==', options.courseId), limit(50));

    if (options.lessonId) {
      q = query(
        collRef,
        where('courseId', '==', options.courseId),
        where('lessonId', '==', options.lessonId),
        limit(50)
      );
    }

    const snapshot = await getDocs(q);

    snapshot.forEach((doc) => {
      const data = doc.data();

      // Filter by chunk type if specified
      if (options.chunkTypes && options.chunkTypes.length > 0) {
        const chunkType = data.chunkType || 'content';
        if (!options.chunkTypes.includes(chunkType as ChunkType)) {
          return;
        }
      }

      // Extract embedding
      let embedding: number[] | null = null;
      if (Array.isArray(data.embedding)) {
        embedding = data.embedding;
      } else if (data.embedding?._values) {
        embedding = Array.from(data.embedding._values);
      } else if (data.embedding?.toArray) {
        embedding = data.embedding.toArray();
      }

      if (!embedding) return;

      // Convert to PedagogicalChunk
      const chunk: PedagogicalChunk = {
        id: doc.id,
        text: data.text || '',
        courseId: data.courseId || options.courseId,
        moduleId: data.moduleId || '',
        lessonId: data.lessonId || '',
        atomId: data.atomId || '',
        atomType: data.atomType || 'reading',
        title: data.title || '',
        chunkIndex: data.chunkIndex || 0,
        chunkType: data.chunkType || 'content',
        questionId: data.questionId,
        distractorId: data.distractorId,
        distractorText: data.distractorText,
        studentFriendly: data.studentFriendly ?? true,
        skills: data.skills,
      };

      allChunks.push({ chunk, embedding });
    });
  }

  // Calculate similarity scores
  const scoredChunks: RetrievedChunk[] = [];

  for (const { chunk, embedding } of allChunks) {
    const score = cosineSimilarity(queryEmbedding, embedding);

    if (score >= options.minScore) {
      // Boost misconceptions slightly for Socratic relevance
      const adjustedScore =
        chunk.chunkType === 'misconception' ? score * 1.1 : score;

      scoredChunks.push({
        chunk,
        score: Math.min(adjustedScore, 1.0),
        matchReason: 'Semantic similarity',
      });
    }
  }

  // Sort and return top K
  return scoredChunks
    .sort((a, b) => b.score - a.score)
    .slice(0, options.topK);
}

/**
 * Retrieve hints for a specific question
 *
 * Returns hints in tier order (1, 2, 3) for hierarchical intervention
 */
export async function retrieveHintsForQuestion(
  questionId: string,
  courseId: string
): Promise<PedagogicalChunk[]> {
  try {
    const firestore = getDb();
    const pedRef = collection(firestore, PEDAGOGICAL_COLLECTION);

    const q = query(
      pedRef,
      where('courseId', '==', courseId),
      where('questionId', '==', questionId),
      where('chunkType', '==', 'hint'),
      limit(3)
    );

    const snapshot = await getDocs(q);
    const hints: PedagogicalChunk[] = [];

    snapshot.forEach((doc) => {
      hints.push(doc.data() as PedagogicalChunk);
    });

    // Sort by tier (chunkIndex represents tier)
    return hints.sort((a, b) => a.chunkIndex - b.chunkIndex);
  } catch (error) {
    console.error('[PedagogicalRetriever] Hint retrieval failed:', error);
    return [];
  }
}

/**
 * Get retrieval service configuration
 */
export function getRetrieverConfig(): {
  collections: string[];
  defaultTopK: number;
  defaultMinScore: number;
} {
  return {
    collections: [COLLECTION_NAME, PEDAGOGICAL_COLLECTION],
    defaultTopK: DEFAULT_TOP_K,
    defaultMinScore: DEFAULT_MIN_SCORE,
  };
}
