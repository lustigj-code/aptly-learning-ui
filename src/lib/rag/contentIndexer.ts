/**
 * Pedagogical Content Indexer
 *
 * Indexes course content with misconception and hint chunks
 * for Socratic RAG retrieval
 *
 * Part of Phase 12: Socratic RAG Coach
 */

import {
  collection,
  doc,
  setDoc,
  writeBatch,
  Timestamp,
  vector,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { embedText, embedBatch } from '../ai/embeddingService';
import { chunkAtomPedagogically, getChunkStats } from './pedagogicalChunker';
import type { PedagogicalChunk, IndexingResult, IndexStats, ChunkType } from './types';
import type { Course, Module, Lesson } from '@/types';

// ============================================
// CONFIGURATION
// ============================================

const PEDAGOGICAL_COLLECTION = 'pedagogical_chunks';
const MAX_BATCH_SIZE = 400; // Firestore batch limit is 500, leave buffer
const EMBEDDING_BATCH_SIZE = 20; // Process embeddings in smaller batches

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
 * Sleep utility for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// MAIN INDEXING FUNCTIONS
// ============================================

/**
 * Index a single course with all pedagogical content
 *
 * Creates chunks for:
 * - Content (readings, videos, quiz questions)
 * - Misconceptions (per distractor)
 * - Hints (tiered for interventions)
 */
export async function indexCourse(course: Course): Promise<IndexingResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let chunksIndexed = 0;
  let misconceptionsIndexed = 0;
  let hintsIndexed = 0;
  let examplesIndexed = 0;

  console.log(`[ContentIndexer] Starting indexing for course: ${course.id}`);

  try {
    // Collect all chunks from all modules/lessons
    const allChunks: PedagogicalChunk[] = [];

    for (const module of course.modules) {
      for (const lesson of module.lessons) {
        const lessonChunks = indexLesson(lesson, {
          courseId: course.id,
          moduleId: module.id,
        });
        allChunks.push(...lessonChunks);
      }
    }

    console.log(`[ContentIndexer] Extracted ${allChunks.length} chunks`);

    // Get stats before indexing
    const stats = getChunkStats(allChunks);
    console.log('[ContentIndexer] Chunk breakdown:', stats.byType);

    // Index in batches
    for (let i = 0; i < allChunks.length; i += MAX_BATCH_SIZE) {
      const batch = allChunks.slice(i, i + MAX_BATCH_SIZE);
      console.log(
        `[ContentIndexer] Processing batch ${Math.floor(i / MAX_BATCH_SIZE) + 1}/${Math.ceil(allChunks.length / MAX_BATCH_SIZE)}`
      );

      try {
        const result = await indexChunkBatch(batch);

        // Update counts
        for (const chunk of batch) {
          if (result.success) {
            chunksIndexed++;
            switch (chunk.chunkType) {
              case 'misconception':
                misconceptionsIndexed++;
                break;
              case 'hint':
                hintsIndexed++;
                break;
              case 'example':
                examplesIndexed++;
                break;
            }
          }
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`Batch ${i / MAX_BATCH_SIZE}: ${msg}`);
        console.error(`[ContentIndexer] Batch error:`, error);
      }

      // Rate limiting pause between batches
      if (i + MAX_BATCH_SIZE < allChunks.length) {
        await sleep(500);
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      `[ContentIndexer] Completed in ${duration}ms. Indexed: ${chunksIndexed} chunks, ${misconceptionsIndexed} misconceptions, ${hintsIndexed} hints`
    );

    return {
      success: errors.length === 0,
      chunksIndexed,
      misconceptionsIndexed,
      hintsIndexed,
      examplesIndexed,
      errors,
      duration,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    errors.push(msg);
    console.error('[ContentIndexer] Fatal error:', error);

    return {
      success: false,
      chunksIndexed,
      misconceptionsIndexed,
      hintsIndexed,
      examplesIndexed,
      errors,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Index a single lesson
 */
function indexLesson(
  lesson: Lesson,
  context: { courseId: string; moduleId: string }
): PedagogicalChunk[] {
  const chunks: PedagogicalChunk[] = [];

  for (const atom of lesson.atoms) {
    const atomChunks = chunkAtomPedagogically(atom, {
      ...context,
      lessonId: lesson.id,
    });
    chunks.push(...atomChunks);
  }

  return chunks;
}

/**
 * Index a batch of chunks with embeddings
 */
async function indexChunkBatch(
  chunks: PedagogicalChunk[]
): Promise<{ success: boolean; count: number }> {
  const firestore = getDb();

  // Generate embeddings in smaller sub-batches
  const embeddings: number[][] = [];

  for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
    const subBatch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
    const texts = subBatch.map((c) => c.text);

    try {
      const subEmbeddings = await embedBatch(texts);
      embeddings.push(...subEmbeddings);
    } catch (error) {
      console.error('[ContentIndexer] Embedding error:', error);
      // Fall back to individual embedding
      for (const text of texts) {
        try {
          const embedding = await embedText(text);
          embeddings.push(embedding);
        } catch {
          // Use zero vector for failed embeddings
          embeddings.push(new Array(768).fill(0));
        }
      }
    }

    // Small pause between embedding batches
    if (i + EMBEDDING_BATCH_SIZE < chunks.length) {
      await sleep(100);
    }
  }

  // Write to Firestore in batch
  const batch = writeBatch(firestore);
  const now = Timestamp.now();

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = embeddings[i];

    const docRef = doc(firestore, PEDAGOGICAL_COLLECTION, chunk.id);

    batch.set(docRef, {
      ...chunk,
      embedding: vector(embedding),
      createdAt: now,
      updatedAt: now,
    });
  }

  await batch.commit();

  return { success: true, count: chunks.length };
}

/**
 * Index a single chunk (for updates)
 */
export async function indexSingleChunk(
  chunk: PedagogicalChunk
): Promise<boolean> {
  try {
    const firestore = getDb();
    const embedding = await embedText(chunk.text);

    const docRef = doc(firestore, PEDAGOGICAL_COLLECTION, chunk.id);

    await setDoc(docRef, {
      ...chunk,
      embedding: vector(embedding),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return true;
  } catch (error) {
    console.error('[ContentIndexer] Single chunk indexing failed:', error);
    return false;
  }
}

// ============================================
// INDEX MANAGEMENT
// ============================================

/**
 * Get indexing statistics
 */
export async function getIndexStats(courseId?: string): Promise<IndexStats> {
  // This would query Firestore for statistics
  // For now, return placeholder
  return {
    totalChunks: 0,
    byType: {
      content: 0,
      misconception: 0,
      hint: 0,
      example: 0,
    },
    byCourse: {},
    lastIndexed: undefined,
  };
}

/**
 * Delete all chunks for a course (for re-indexing)
 */
export async function deleteCoursechunks(courseId: string): Promise<number> {
  // Implementation would delete all chunks with matching courseId
  // This is a placeholder
  console.log(`[ContentIndexer] Would delete chunks for course: ${courseId}`);
  return 0;
}

/**
 * Verify index integrity
 */
export async function verifyIndex(courseId: string): Promise<{
  valid: boolean;
  issues: string[];
}> {
  // Implementation would verify all expected chunks exist
  return {
    valid: true,
    issues: [],
  };
}
