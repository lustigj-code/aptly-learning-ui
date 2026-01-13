/**
 * Auto Indexer for RAG
 *
 * Provides automatic indexing functions for course content changes.
 * Keeps the RAG vector store in sync with content updates.
 *
 * Part of Phase 12.5: RAG Auto-Indexing
 */

import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { chunkAtomPedagogically, getChunkStats } from './pedagogicalChunker';
import { embedText, embedBatch, isEmbeddingConfigured } from './embeddings';
import {
  upsertVectors,
  deleteVectorsByCourse,
  isVectorStoreConfigured,
  type VectorRecord,
  type VectorMetadata,
} from './vectorStore';
import type { PedagogicalChunk } from './types';
import type { Atom, Course, Lesson } from '@/types';

// ============================================
// TYPES
// ============================================

export type AutoIndexResult = {
  success: boolean;
  chunksIndexed: number;
  chunksRemoved: number;
  errors: string[];
  duration: number;
};

export type IndexRecord = {
  contentId: string;
  contentType: 'atom' | 'lesson' | 'course';
  courseId: string;
  moduleId?: string;
  lessonId?: string;
  atomId?: string;
  indexedAt: Date;
  chunksCount: number;
  checksum?: string;
};

// ============================================
// CONFIGURATION
// ============================================

const INDEX_METADATA_COLLECTION = 'rag_index_metadata';
const EMBEDDING_BATCH_SIZE = 20;

// ============================================
// HELPER FUNCTIONS
// ============================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a simple checksum for content to detect changes
 */
function generateContentChecksum(content: unknown): string {
  const str = JSON.stringify(content);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

/**
 * Convert PedagogicalChunk to VectorRecord
 */
function chunkToVectorRecord(
  chunk: PedagogicalChunk,
  embedding: number[]
): VectorRecord {
  const metadata: VectorMetadata = {
    courseId: chunk.courseId,
    moduleId: chunk.moduleId,
    lessonId: chunk.lessonId,
    atomId: chunk.atomId,
    atomType: chunk.atomType,
    chunkType: chunk.chunkType,
    title: chunk.title,
    chunkIndex: chunk.chunkIndex,
    questionId: chunk.questionId,
    distractorId: chunk.distractorId,
    distractorText: chunk.distractorText,
    skills: chunk.skills,
    studentFriendly: chunk.studentFriendly,
  };

  return {
    id: chunk.id,
    values: embedding,
    metadata,
    text: chunk.text,
  };
}

// ============================================
// INDEX RECORD MANAGEMENT
// ============================================

/**
 * Get index record for a content item
 */
export async function getIndexRecord(contentId: string): Promise<IndexRecord | null> {
  try {
    const doc = await adminDb.collection(INDEX_METADATA_COLLECTION).doc(contentId).get();
    if (!doc.exists) return null;

    const data = doc.data();
    if (!data) return null;

    return {
      contentId: data.contentId,
      contentType: data.contentType,
      courseId: data.courseId,
      moduleId: data.moduleId,
      lessonId: data.lessonId,
      atomId: data.atomId,
      indexedAt: data.indexedAt?.toDate() || new Date(0),
      chunksCount: data.chunksCount || 0,
      checksum: data.checksum,
    };
  } catch (error) {
    console.error(`[AutoIndexer] Error getting index record for ${contentId}:`, error);
    return null;
  }
}

/**
 * Save index record for a content item
 */
async function saveIndexRecord(record: IndexRecord): Promise<void> {
  try {
    await adminDb.collection(INDEX_METADATA_COLLECTION).doc(record.contentId).set({
      ...record,
      indexedAt: Timestamp.fromDate(record.indexedAt),
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error(`[AutoIndexer] Error saving index record for ${record.contentId}:`, error);
  }
}

/**
 * Delete index record for a content item
 */
async function deleteIndexRecord(contentId: string): Promise<void> {
  try {
    await adminDb.collection(INDEX_METADATA_COLLECTION).doc(contentId).delete();
  } catch (error) {
    console.error(`[AutoIndexer] Error deleting index record for ${contentId}:`, error);
  }
}

// ============================================
// CORE INDEXING FUNCTIONS
// ============================================

/**
 * Index a single atom
 *
 * Chunks the atom content and indexes all chunks in the vector store.
 */
export async function indexAtom(
  atom: Atom,
  context: {
    courseId: string;
    moduleId: string;
    lessonId: string;
  }
): Promise<AutoIndexResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let chunksIndexed = 0;

  console.log(`[AutoIndexer] Indexing atom: ${atom.id}`);

  try {
    // Verify services are configured
    if (!isEmbeddingConfigured()) {
      throw new Error('Embedding service not configured');
    }
    if (!isVectorStoreConfigured()) {
      throw new Error('Vector store not configured');
    }

    // Generate chunks for this atom
    const chunks = chunkAtomPedagogically(atom, context);
    const stats = getChunkStats(chunks);

    console.log(`[AutoIndexer] Generated ${chunks.length} chunks for atom ${atom.id}`);
    console.log(`[AutoIndexer] Chunk breakdown:`, stats.byType);

    if (chunks.length === 0) {
      console.log(`[AutoIndexer] No chunks generated for atom ${atom.id}`);
      return {
        success: true,
        chunksIndexed: 0,
        chunksRemoved: 0,
        errors: [],
        duration: Date.now() - startTime,
      };
    }

    // Generate embeddings in batches
    const embeddings: number[][] = [];
    for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
      const texts = batch.map((c) => c.text);

      try {
        const batchEmbeddings = await embedBatch(texts);
        embeddings.push(...batchEmbeddings);
      } catch (error) {
        console.error(`[AutoIndexer] Batch embedding error:`, error);
        // Fall back to individual embedding
        for (const text of texts) {
          try {
            const embedding = await embedText(text);
            embeddings.push(embedding);
          } catch (embError) {
            errors.push(
              `Embedding failed: ${embError instanceof Error ? embError.message : embError}`
            );
            // Use placeholder
            embeddings.push([]);
          }
        }
      }

      // Rate limiting
      if (i + EMBEDDING_BATCH_SIZE < chunks.length) {
        await sleep(100);
      }
    }

    // Filter out chunks with failed embeddings
    const validRecords: VectorRecord[] = [];
    for (let i = 0; i < chunks.length; i++) {
      if (embeddings[i] && embeddings[i].length > 0) {
        validRecords.push(chunkToVectorRecord(chunks[i], embeddings[i]));
      }
    }

    // Upsert vectors
    if (validRecords.length > 0) {
      const result = await upsertVectors(validRecords);
      chunksIndexed = result.upserted;
      if (result.errors.length > 0) {
        errors.push(...result.errors);
      }
    }

    // Save index record
    const checksum = generateContentChecksum(atom.content);
    await saveIndexRecord({
      contentId: `atom_${atom.id}`,
      contentType: 'atom',
      courseId: context.courseId,
      moduleId: context.moduleId,
      lessonId: context.lessonId,
      atomId: atom.id,
      indexedAt: new Date(),
      chunksCount: chunksIndexed,
      checksum,
    });

    console.log(`[AutoIndexer] Successfully indexed ${chunksIndexed} chunks for atom ${atom.id}`);

    return {
      success: errors.length === 0,
      chunksIndexed,
      chunksRemoved: 0,
      errors,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    errors.push(msg);
    console.error(`[AutoIndexer] Error indexing atom ${atom.id}:`, error);

    return {
      success: false,
      chunksIndexed,
      chunksRemoved: 0,
      errors,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Index all atoms in a lesson
 */
export async function indexLesson(
  lesson: Lesson,
  context: {
    courseId: string;
    moduleId: string;
  }
): Promise<AutoIndexResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let totalChunksIndexed = 0;

  console.log(`[AutoIndexer] Indexing lesson: ${lesson.id}`);

  try {
    for (const atom of lesson.atoms || []) {
      const result = await indexAtom(atom, {
        ...context,
        lessonId: lesson.id,
      });

      totalChunksIndexed += result.chunksIndexed;
      errors.push(...result.errors);
    }

    // Save lesson index record
    await saveIndexRecord({
      contentId: `lesson_${lesson.id}`,
      contentType: 'lesson',
      courseId: context.courseId,
      moduleId: context.moduleId,
      lessonId: lesson.id,
      indexedAt: new Date(),
      chunksCount: totalChunksIndexed,
    });

    console.log(`[AutoIndexer] Indexed lesson ${lesson.id}: ${totalChunksIndexed} total chunks`);

    return {
      success: errors.length === 0,
      chunksIndexed: totalChunksIndexed,
      chunksRemoved: 0,
      errors,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    errors.push(msg);
    console.error(`[AutoIndexer] Error indexing lesson ${lesson.id}:`, error);

    return {
      success: false,
      chunksIndexed: totalChunksIndexed,
      chunksRemoved: 0,
      errors,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Index all content in a course
 */
export async function indexCourseAuto(course: Course): Promise<AutoIndexResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let totalChunksIndexed = 0;

  console.log(`[AutoIndexer] Starting auto-index for course: ${course.id}`);

  try {
    // Verify services are configured
    if (!isEmbeddingConfigured()) {
      throw new Error('Embedding service not configured');
    }
    if (!isVectorStoreConfigured()) {
      throw new Error('Vector store not configured');
    }

    // Index all modules/lessons/atoms
    for (const courseModule of course.modules || []) {
      for (const lesson of courseModule.lessons || []) {
        const result = await indexLesson(lesson, {
          courseId: course.id,
          moduleId: courseModule.id,
        });

        totalChunksIndexed += result.chunksIndexed;
        errors.push(...result.errors);
      }
    }

    // Save course index record
    await saveIndexRecord({
      contentId: `course_${course.id}`,
      contentType: 'course',
      courseId: course.id,
      indexedAt: new Date(),
      chunksCount: totalChunksIndexed,
    });

    const duration = Date.now() - startTime;
    console.log(
      `[AutoIndexer] Completed course ${course.id} in ${duration}ms. Total chunks: ${totalChunksIndexed}`
    );

    return {
      success: errors.length === 0,
      chunksIndexed: totalChunksIndexed,
      chunksRemoved: 0,
      errors,
      duration,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    errors.push(msg);
    console.error(`[AutoIndexer] Error indexing course ${course.id}:`, error);

    return {
      success: false,
      chunksIndexed: totalChunksIndexed,
      chunksRemoved: 0,
      errors,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Remove content from the index
 *
 * Deletes all vectors associated with the given content ID
 */
export async function removeFromIndex(
  contentId: string,
  contentType: 'atom' | 'lesson' | 'course'
): Promise<AutoIndexResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let chunksRemoved = 0;

  console.log(`[AutoIndexer] Removing from index: ${contentType} ${contentId}`);

  try {
    if (!isVectorStoreConfigured()) {
      throw new Error('Vector store not configured');
    }

    // For course, delete all course vectors
    if (contentType === 'course') {
      chunksRemoved = await deleteVectorsByCourse(contentId);
    }

    // Delete index record
    await deleteIndexRecord(`${contentType}_${contentId}`);

    console.log(`[AutoIndexer] Removed ${chunksRemoved} chunks for ${contentType} ${contentId}`);

    return {
      success: true,
      chunksIndexed: 0,
      chunksRemoved,
      errors,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    errors.push(msg);
    console.error(`[AutoIndexer] Error removing ${contentType} ${contentId}:`, error);

    return {
      success: false,
      chunksIndexed: 0,
      chunksRemoved,
      errors,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Check if content needs re-indexing
 *
 * Compares content checksum with stored checksum
 */
export async function needsReindex(
  contentId: string,
  content: unknown,
  contentType: 'atom' | 'lesson' | 'course'
): Promise<boolean> {
  try {
    const record = await getIndexRecord(`${contentType}_${contentId}`);

    // Never indexed
    if (!record) {
      return true;
    }

    // Check checksum if available
    if (record.checksum) {
      const currentChecksum = generateContentChecksum(content);
      if (currentChecksum !== record.checksum) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error(`[AutoIndexer] Error checking reindex for ${contentId}:`, error);
    // If in doubt, reindex
    return true;
  }
}

/**
 * Incremental index - only index changed content since a given date
 */
export async function incrementalIndex(
  course: Course,
  since: Date
): Promise<AutoIndexResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let totalChunksIndexed = 0;

  console.log(`[AutoIndexer] Incremental index for course ${course.id} since ${since.toISOString()}`);

  try {
    // Get all atoms that need re-indexing
    for (const courseModule of course.modules || []) {
      for (const lesson of courseModule.lessons || []) {
        for (const atom of lesson.atoms || []) {
          const needsUpdate = await needsReindex(atom.id, atom.content, 'atom');

          if (needsUpdate) {
            const result = await indexAtom(atom, {
              courseId: course.id,
              moduleId: courseModule.id,
              lessonId: lesson.id,
            });

            totalChunksIndexed += result.chunksIndexed;
            errors.push(...result.errors);
          }
        }
      }
    }

    // Update course index record
    await saveIndexRecord({
      contentId: `course_${course.id}`,
      contentType: 'course',
      courseId: course.id,
      indexedAt: new Date(),
      chunksCount: totalChunksIndexed,
    });

    const duration = Date.now() - startTime;
    console.log(
      `[AutoIndexer] Incremental index completed in ${duration}ms. Chunks: ${totalChunksIndexed}`
    );

    return {
      success: errors.length === 0,
      chunksIndexed: totalChunksIndexed,
      chunksRemoved: 0,
      errors,
      duration,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    errors.push(msg);
    console.error(`[AutoIndexer] Error in incremental index:`, error);

    return {
      success: false,
      chunksIndexed: totalChunksIndexed,
      chunksRemoved: 0,
      errors,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Get indexing status for all courses
 */
export async function getIndexingStatus(): Promise<{
  totalDocuments: number;
  totalChunks: number;
  lastFullIndex: Date | null;
  pendingUpdates: number;
  courseStatuses: Array<{
    courseId: string;
    lastIndexed: Date | null;
    chunksCount: number;
    needsReindex: boolean;
  }>;
}> {
  try {
    const snapshot = await adminDb
      .collection(INDEX_METADATA_COLLECTION)
      .where('contentType', '==', 'course')
      .get();

    let totalChunks = 0;
    let lastFullIndex: Date | null = null;
    const courseStatuses: Array<{
      courseId: string;
      lastIndexed: Date | null;
      chunksCount: number;
      needsReindex: boolean;
    }> = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const indexedAt = data.indexedAt?.toDate() || null;

      totalChunks += data.chunksCount || 0;

      if (!lastFullIndex || (indexedAt && indexedAt > lastFullIndex)) {
        lastFullIndex = indexedAt;
      }

      courseStatuses.push({
        courseId: data.courseId,
        lastIndexed: indexedAt,
        chunksCount: data.chunksCount || 0,
        needsReindex: false, // Would need to check each course
      });
    });

    // Calculate pending updates (courses not indexed in 24h)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const pendingUpdates = courseStatuses.filter(
      (s) => !s.lastIndexed || s.lastIndexed < twentyFourHoursAgo
    ).length;

    return {
      totalDocuments: snapshot.size,
      totalChunks,
      lastFullIndex,
      pendingUpdates,
      courseStatuses,
    };
  } catch (error) {
    console.error('[AutoIndexer] Error getting indexing status:', error);
    return {
      totalDocuments: 0,
      totalChunks: 0,
      lastFullIndex: null,
      pendingUpdates: 0,
      courseStatuses: [],
    };
  }
}
