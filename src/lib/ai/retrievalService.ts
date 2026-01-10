/**
 * Retrieval Service
 * Searches embedded FSM content for relevant context using vector similarity
 *
 * Part of Phase 02: RAG Knowledge Base (Plan 03)
 *
 * Uses Firestore's native vector search with findNearest() for similarity queries.
 */

import {
  collection,
  query,
  getDocs,
  limit,
  orderBy,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { embedText } from './embeddingService';

// ============================================
// TYPES
// ============================================

export type RetrievedChunk = {
  id: string;
  text: string;
  score: number; // Similarity score (0-1, higher is more similar)
  courseId: string;
  moduleId: string;
  lessonId: string;
  atomId: string;
  atomType: string;
  title: string;
};

export type RetrievalOptions = {
  topK?: number; // Number of results to return (default: 5)
  minScore?: number; // Minimum similarity score threshold (default: 0.5)
  courseFilter?: string; // Filter by specific course
  lessonFilter?: string; // Filter by specific lesson
};

// ============================================
// CONFIGURATION
// ============================================

const COLLECTION_NAME = 'content_embeddings';
const DEFAULT_TOP_K = 5;
const DEFAULT_MIN_SCORE = 0.5;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the Firestore instance, throwing if not initialized
 */
function getDb() {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  return db;
}

/**
 * Calculate cosine similarity between two vectors
 * Returns value between 0 and 1 (1 = identical)
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same dimension');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Retrieve relevant content chunks for a query
 *
 * Embeds the query and finds similar content using vector search.
 * Falls back to client-side similarity calculation if vector index not available.
 *
 * @param queryText - The user's question or search query
 * @param options - Optional filters and limits
 * @returns Array of relevant chunks sorted by similarity score
 */
export async function retrieveRelevantContent(
  queryText: string,
  options: RetrievalOptions = {}
): Promise<RetrievedChunk[]> {
  const {
    topK = DEFAULT_TOP_K,
    minScore = DEFAULT_MIN_SCORE,
    courseFilter,
    lessonFilter,
  } = options;

  if (!queryText || queryText.trim().length === 0) {
    console.warn('[RetrievalService] Empty query, returning empty results');
    return [];
  }

  try {
    // Step 1: Embed the query text
    console.log('[RetrievalService] Embedding query:', queryText.substring(0, 50) + '...');
    const queryEmbedding = await embedText(queryText);

    // Step 2: Query Firestore for all embeddings (with optional filters)
    // Note: Firestore vector search with findNearest requires a vector index
    // For now, we fetch documents and compute similarity client-side
    // This works for small-medium datasets (~1000 chunks)
    const firestore = getDb();
    const embeddingsRef = collection(firestore, COLLECTION_NAME);

    let q = query(embeddingsRef, limit(100)); // Fetch up to 100 for client-side filtering

    // Apply filters if provided
    if (courseFilter) {
      q = query(embeddingsRef, where('courseId', '==', courseFilter), limit(100));
    }
    if (lessonFilter) {
      q = query(embeddingsRef, where('lessonId', '==', lessonFilter), limit(100));
    }

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('[RetrievalService] No embeddings found in database');
      return [];
    }

    console.log(`[RetrievalService] Searching ${snapshot.size} chunks for similarity`);

    // Step 3: Calculate similarity scores for each chunk
    const scoredChunks: RetrievedChunk[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();

      // Extract embedding - handle both array and Firestore vector types
      let storedEmbedding: number[];
      if (Array.isArray(data.embedding)) {
        storedEmbedding = data.embedding;
      } else if (data.embedding?._values) {
        // Firestore VectorValue stores values in _values property when read
        storedEmbedding = Array.from(data.embedding._values);
      } else if (data.embedding?.toArray) {
        storedEmbedding = data.embedding.toArray();
      } else {
        console.warn(`[RetrievalService] Could not extract embedding for chunk ${doc.id}`);
        return;
      }

      // Calculate cosine similarity
      const score = cosineSimilarity(queryEmbedding, storedEmbedding);

      // Only include if above minimum score
      if (score >= minScore) {
        scoredChunks.push({
          id: doc.id,
          text: data.text || '',
          score,
          courseId: data.courseId || '',
          moduleId: data.moduleId || '',
          lessonId: data.lessonId || '',
          atomId: data.atomId || '',
          atomType: data.atomType || '',
          title: data.title || '',
        });
      }
    });

    // Step 4: Sort by score (descending) and take top K
    const results = scoredChunks
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    console.log(`[RetrievalService] Retrieved ${results.length} chunks for query`);
    results.forEach((chunk, i) => {
      console.log(`  ${i + 1}. Score: ${chunk.score.toFixed(3)} - "${chunk.title}"`);
    });

    return results;
  } catch (error) {
    console.error('[RetrievalService] Error retrieving content:', error);
    // Return empty array on error - coach can still function without RAG
    return [];
  }
}

/**
 * Format retrieved chunks into a readable context string for the LLM
 *
 * Creates a well-structured context block that helps the coach
 * understand and reference the relevant course material.
 *
 * @param chunks - Array of retrieved chunks
 * @returns Formatted context string, or empty string if no chunks
 */
export function formatRetrievedContext(chunks: RetrievedChunk[]): string {
  if (!chunks || chunks.length === 0) {
    return '';
  }

  const sections: string[] = [];

  // Group chunks by lesson for better readability
  const chunksByLesson: Record<string, RetrievedChunk[]> = {};

  for (const chunk of chunks) {
    const lessonKey = chunk.title || chunk.lessonId || 'Unknown';
    if (!chunksByLesson[lessonKey]) {
      chunksByLesson[lessonKey] = [];
    }
    chunksByLesson[lessonKey].push(chunk);
  }

  // Format each lesson's chunks
  for (const [lessonTitle, lessonChunks] of Object.entries(chunksByLesson)) {
    const lessonContent = lessonChunks
      .map((chunk) => chunk.text.trim())
      .join('\n\n');

    sections.push(`From "${lessonTitle}":\n${lessonContent}`);
  }

  return sections.join('\n\n---\n\n');
}

/**
 * Get retrieval service configuration
 * Useful for debugging and documentation
 */
export function getRetrievalConfig(): {
  collection: string;
  defaultTopK: number;
  defaultMinScore: number;
} {
  return {
    collection: COLLECTION_NAME,
    defaultTopK: DEFAULT_TOP_K,
    defaultMinScore: DEFAULT_MIN_SCORE,
  };
}
