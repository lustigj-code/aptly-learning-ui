/**
 * Pedagogical Content Indexer
 *
 * Indexes course content with misconception and hint chunks
 * for Socratic RAG retrieval. Supports both Pinecone and Firestore backends.
 *
 * Part of Phase 12.1: Content Indexing Pipeline
 */

import { embedText, embedBatch, getEmbeddingDimensions } from './embeddings';
import {
  upsertVectors,
  deleteVectorsByCourse,
  deleteAllVectors,
  getVectorStats,
  type VectorRecord,
  type VectorMetadata,
} from './vectorStore';
import { chunkAtomPedagogically, getChunkStats } from './pedagogicalChunker';
import { getMisconceptionBank, type MisconceptionEntry } from './misconceptionBank';
import type { PedagogicalChunk, IndexingResult, IndexStats } from './types';
import type { Course, Lesson } from '@/types';

// ============================================
// CONFIGURATION
// ============================================

const MAX_BATCH_SIZE = 100; // Vectors per batch for upsert
const EMBEDDING_BATCH_SIZE = 20; // Texts per embedding batch

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Sleep utility for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
// MAIN INDEXING FUNCTIONS
// ============================================

/**
 * Index a single course with all pedagogical content
 *
 * Creates chunks for:
 * - Content (readings, videos, quiz questions)
 * - Misconceptions (per distractor + misconception bank)
 * - Hints (tiered for interventions)
 * - Examples (worked examples for Tier 3)
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
    // Delete existing chunks for this course (re-index)
    console.log(`[ContentIndexer] Clearing existing chunks for course: ${course.id}`);
    await deleteCoursechunks(course.id);

    // Collect all chunks from all modules/lessons
    const allChunks: PedagogicalChunk[] = [];

    for (const courseModule of course.modules || []) {
      for (const lesson of courseModule.lessons || []) {
        const lessonChunks = extractLessonChunks(lesson, {
          courseId: course.id,
          moduleId: courseModule.id,
        });
        allChunks.push(...lessonChunks);
      }
    }

    // Add misconception bank entries for this course
    const misconceptionBankChunks = getMisconceptionBankChunks(course.id);
    allChunks.push(...misconceptionBankChunks);

    console.log(`[ContentIndexer] Extracted ${allChunks.length} chunks`);

    // Get stats before indexing
    const stats = getChunkStats(allChunks);
    console.log('[ContentIndexer] Chunk breakdown:', stats.byType);

    // Index in batches
    for (let i = 0; i < allChunks.length; i += MAX_BATCH_SIZE) {
      const batch = allChunks.slice(i, i + MAX_BATCH_SIZE);
      const batchNum = Math.floor(i / MAX_BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(allChunks.length / MAX_BATCH_SIZE);

      console.log(`[ContentIndexer] Processing batch ${batchNum}/${totalBatches}`);

      try {
        const result = await indexChunkBatch(batch);

        if (result.success) {
          // Update counts
          for (const chunk of batch) {
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

        if (result.errors.length > 0) {
          errors.push(...result.errors);
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`Batch ${batchNum}: ${msg}`);
        console.error(`[ContentIndexer] Batch error:`, error);
      }

      // Rate limiting pause between batches
      if (i + MAX_BATCH_SIZE < allChunks.length) {
        await sleep(500);
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      `[ContentIndexer] Completed in ${duration}ms. Indexed: ${chunksIndexed} chunks, ${misconceptionsIndexed} misconceptions, ${hintsIndexed} hints, ${examplesIndexed} examples`
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
 * Extract all chunks from a lesson
 */
function extractLessonChunks(
  lesson: Lesson,
  context: { courseId: string; moduleId: string }
): PedagogicalChunk[] {
  const chunks: PedagogicalChunk[] = [];

  for (const atom of lesson.atoms || []) {
    const atomChunks = chunkAtomPedagogically(atom, {
      ...context,
      lessonId: lesson.id,
    });
    chunks.push(...atomChunks);
  }

  return chunks;
}

/**
 * Get misconception bank entries as PedagogicalChunks
 */
function getMisconceptionBankChunks(courseId: string): PedagogicalChunk[] {
  const bank = getMisconceptionBank(courseId);
  const chunks: PedagogicalChunk[] = [];

  bank.forEach((entry, index) => {
    // Create misconception chunk
    chunks.push({
      id: `misconception_bank_${courseId}_${entry.id}`,
      text: formatMisconceptionEntry(entry),
      courseId,
      moduleId: entry.relatedModuleId || 'general',
      lessonId: entry.relatedLessonId || 'general',
      atomId: 'misconception_bank',
      atomType: 'quiz',
      title: `Misconception: ${entry.name}`,
      chunkIndex: index,
      chunkType: 'misconception',
      misconceptionId: entry.id,
      studentFriendly: true,
      skills: entry.relatedSkills,
    });

    // Create example chunk if available
    if (entry.workedExample) {
      chunks.push({
        id: `example_bank_${courseId}_${entry.id}`,
        text: entry.workedExample,
        courseId,
        moduleId: entry.relatedModuleId || 'general',
        lessonId: entry.relatedLessonId || 'general',
        atomId: 'misconception_bank',
        atomType: 'quiz',
        title: `Worked Example: ${entry.name}`,
        chunkIndex: index,
        chunkType: 'example',
        misconceptionId: entry.id,
        studentFriendly: true,
        skills: entry.relatedSkills,
      });
    }
  });

  return chunks;
}

/**
 * Format misconception entry for embedding
 */
function formatMisconceptionEntry(entry: MisconceptionEntry): string {
  return `Misconception: ${entry.name}
Category: ${entry.category}

Student-friendly explanation:
${entry.studentExplanation}

Technical explanation:
${entry.technicalExplanation}

Socratic questions to ask:
${entry.socraticQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Related concepts: ${entry.relatedSkills?.join(', ') || 'General'}`;
}

/**
 * Index a batch of chunks with embeddings
 */
async function indexChunkBatch(
  chunks: PedagogicalChunk[]
): Promise<{ success: boolean; count: number; errors: string[] }> {
  const errors: string[] = [];
  const embeddingDim = getEmbeddingDimensions();

  // Generate embeddings in smaller sub-batches
  const embeddings: number[][] = [];

  for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
    const subBatch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
    const texts = subBatch.map((c) => c.text);

    try {
      const subEmbeddings = await embedBatch(texts);
      embeddings.push(...subEmbeddings);
    } catch (error) {
      console.error('[ContentIndexer] Batch embedding error:', error);
      // Fall back to individual embedding
      for (const text of texts) {
        try {
          const embedding = await embedText(text);
          embeddings.push(embedding);
        } catch (embError) {
          // Use zero vector for failed embeddings
          embeddings.push(new Array(embeddingDim).fill(0));
          errors.push(
            `Embedding failed for text "${text.substring(0, 50)}...": ${
              embError instanceof Error ? embError.message : embError
            }`
          );
        }
      }
    }

    // Small pause between embedding batches
    if (i + EMBEDDING_BATCH_SIZE < chunks.length) {
      await sleep(100);
    }
  }

  // Convert to VectorRecords and upsert
  const records: VectorRecord[] = chunks.map((chunk, i) =>
    chunkToVectorRecord(chunk, embeddings[i])
  );

  const result = await upsertVectors(records);

  if (result.errors.length > 0) {
    errors.push(...result.errors);
  }

  return {
    success: result.upserted === chunks.length && errors.length === 0,
    count: result.upserted,
    errors,
  };
}

/**
 * Index a single chunk (for updates)
 */
export async function indexSingleChunk(chunk: PedagogicalChunk): Promise<boolean> {
  try {
    const embedding = await embedText(chunk.text);
    const record = chunkToVectorRecord(chunk, embedding);

    const result = await upsertVectors([record]);
    return result.upserted === 1;
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
  const stats = await getVectorStats(courseId);

  return {
    totalChunks: stats.totalVectors,
    byType: stats.byChunkType,
    byCourse: stats.byCourse,
    lastIndexed: stats.lastUpdated,
  };
}

/**
 * Delete all chunks for a course (for re-indexing)
 */
export async function deleteCoursechunks(courseId: string): Promise<number> {
  console.log(`[ContentIndexer] Deleting chunks for course: ${courseId}`);
  const deleted = await deleteVectorsByCourse(courseId);
  console.log(`[ContentIndexer] Deleted ${deleted} chunks for course: ${courseId}`);
  return deleted;
}

/**
 * Delete all indexed content (clear entire index)
 */
export async function clearAllChunks(): Promise<number> {
  console.log('[ContentIndexer] Clearing all indexed content');
  const deleted = await deleteAllVectors();
  console.log(`[ContentIndexer] Deleted ${deleted === -1 ? 'all' : deleted} chunks`);
  return deleted;
}

/**
 * Verify index integrity
 */
export async function verifyIndex(courseId: string): Promise<{
  valid: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  try {
    const stats = await getIndexStats(courseId);

    if (stats.totalChunks === 0) {
      issues.push(`No chunks found for course: ${courseId}`);
    }

    if (stats.byType.content === 0) {
      issues.push('No content chunks indexed');
    }

    // Check for misconceptions (optional but recommended)
    if (stats.byType.misconception === 0) {
      issues.push('Warning: No misconception chunks indexed (recommended for Socratic coaching)');
    }

    return {
      valid: issues.filter((i) => !i.startsWith('Warning')).length === 0,
      issues,
    };
  } catch (error) {
    issues.push(
      `Verification failed: ${error instanceof Error ? error.message : String(error)}`
    );
    return { valid: false, issues };
  }
}

/**
 * Index all courses from the registry
 */
export async function indexAllCourses(
  courses: Course[]
): Promise<{
  totalIndexed: number;
  courseResults: Record<string, IndexingResult>;
}> {
  const courseResults: Record<string, IndexingResult> = {};
  let totalIndexed = 0;

  for (const course of courses) {
    console.log(`\n[ContentIndexer] ========== Indexing: ${course.title} ==========`);
    const result = await indexCourse(course);
    courseResults[course.id] = result;
    totalIndexed += result.chunksIndexed;
  }

  console.log(`\n[ContentIndexer] ========== Summary ==========`);
  console.log(`Total chunks indexed across all courses: ${totalIndexed}`);

  return { totalIndexed, courseResults };
}
