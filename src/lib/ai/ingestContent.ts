/**
 * Content Ingestion Service
 * Processes course content through the embedding pipeline and stores in vector database
 *
 * Part of Phase 02: RAG Knowledge Base
 *
 * Ingests FSM course content:
 * 1. Fetches all modules, lessons, atoms for a course
 * 2. Uses contentChunker to create chunks
 * 3. Uses embeddingService to embed each chunk
 * 4. Uses vectorStore to store embeddings
 */

import type { Course, Lesson } from '@/types';
import { chunkLesson, type ContentChunk } from './contentChunker';
import { embedBatch, getEmbeddingConfig } from './embeddingService';
import { storeEmbeddings, chunkExists, getVectorStoreConfig } from './vectorStore';

// ============================================
// TYPES
// ============================================

export type IngestionResult = {
  courseId: string;
  courseName: string;
  chunksProcessed: number;
  chunksStored: number;
  chunksSkipped: number;
  errors: string[];
  duration: number;
};

export type IngestionProgress = {
  phase: 'chunking' | 'embedding' | 'storing';
  current: number;
  total: number;
  message: string;
};

// ============================================
// CONFIGURATION
// ============================================

const EMBEDDING_BATCH_SIZE = 20; // Conservative batch size to avoid rate limits
const BATCH_DELAY_MS = 500; // Delay between embedding batches

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract all lessons from a course (traversing modules)
 */
function extractLessonsFromCourse(course: Course): {
  lesson: Lesson;
  courseId: string;
  moduleId: string;
}[] {
  const result: { lesson: Lesson; courseId: string; moduleId: string }[] = [];

  for (const mod of course.modules || []) {
    for (const lesson of mod.lessons || []) {
      result.push({
        lesson,
        courseId: course.id,
        moduleId: mod.id,
      });
    }
  }

  return result;
}

/**
 * Log progress to console
 */
function _logProgress(progress: IngestionProgress): void {
  const percent = Math.round((progress.current / progress.total) * 100);
  console.log(`[${progress.phase.toUpperCase()}] ${percent}% - ${progress.message}`);
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Ingest a single course into the vector store
 *
 * @param course - The course object with modules and lessons populated
 * @param onProgress - Optional callback for progress updates
 * @returns Ingestion result with statistics
 */
export async function ingestCourse(
  course: Course,
  onProgress?: (progress: IngestionProgress) => void
): Promise<IngestionResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Ingesting course: ${course.title}`);
  console.log(`${'='.repeat(60)}\n`);

  // Phase 1: Chunk all content
  const allChunks: ContentChunk[] = [];
  const lessons = extractLessonsFromCourse(course);

  if (lessons.length === 0) {
    console.log(`No lessons found in course ${course.id}`);
    return {
      courseId: course.id,
      courseName: course.title,
      chunksProcessed: 0,
      chunksStored: 0,
      chunksSkipped: 0,
      errors: ['No lessons found in course'],
      duration: Date.now() - startTime,
    };
  }

  console.log(`Found ${lessons.length} lessons to process\n`);

  for (let i = 0; i < lessons.length; i++) {
    const { lesson, courseId, moduleId } = lessons[i];

    onProgress?.({
      phase: 'chunking',
      current: i + 1,
      total: lessons.length,
      message: `Processing lesson: ${lesson.title}`,
    });

    try {
      const lessonChunks = chunkLesson(lesson, { courseId, moduleId });
      allChunks.push(...lessonChunks);
      console.log(`  Lesson "${lesson.title}": ${lessonChunks.length} chunks`);
    } catch (error) {
      const errorMsg = `Failed to chunk lesson ${lesson.id}: ${error instanceof Error ? error.message : error}`;
      errors.push(errorMsg);
      console.error(`  ERROR: ${errorMsg}`);
    }
  }

  if (allChunks.length === 0) {
    console.log(`\nNo chunks generated from course ${course.id}`);
    return {
      courseId: course.id,
      courseName: course.title,
      chunksProcessed: 0,
      chunksStored: 0,
      chunksSkipped: 0,
      errors: errors.length > 0 ? errors : ['No chunks generated'],
      duration: Date.now() - startTime,
    };
  }

  console.log(`\nTotal chunks created: ${allChunks.length}`);

  // Phase 2: Check which chunks already exist (for idempotency)
  console.log(`\nChecking for existing chunks...`);
  const newChunks: ContentChunk[] = [];

  for (const chunk of allChunks) {
    try {
      const exists = await chunkExists(chunk.id);
      if (!exists) {
        newChunks.push(chunk);
      }
    } catch (_error) {
      // If check fails, assume it doesn't exist and try to add
      newChunks.push(chunk);
    }
  }

  const skippedCount = allChunks.length - newChunks.length;
  console.log(`  Existing chunks (skipping): ${skippedCount}`);
  console.log(`  New chunks to embed: ${newChunks.length}`);

  if (newChunks.length === 0) {
    console.log(`\nAll chunks already ingested for course ${course.id}`);
    return {
      courseId: course.id,
      courseName: course.title,
      chunksProcessed: allChunks.length,
      chunksStored: 0,
      chunksSkipped: skippedCount,
      errors,
      duration: Date.now() - startTime,
    };
  }

  // Phase 3: Embed chunks in batches
  console.log(`\nGenerating embeddings...`);
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < newChunks.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = newChunks.slice(i, i + EMBEDDING_BATCH_SIZE);
    const batchNum = Math.floor(i / EMBEDDING_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(newChunks.length / EMBEDDING_BATCH_SIZE);

    onProgress?.({
      phase: 'embedding',
      current: i + batch.length,
      total: newChunks.length,
      message: `Embedding batch ${batchNum}/${totalBatches}`,
    });

    console.log(`  Batch ${batchNum}/${totalBatches}: ${batch.length} chunks`);

    try {
      const texts = batch.map((chunk) => chunk.text);
      const embeddings = await embedBatch(texts);
      allEmbeddings.push(...embeddings);
    } catch (error) {
      const errorMsg = `Failed to embed batch ${batchNum}: ${error instanceof Error ? error.message : error}`;
      errors.push(errorMsg);
      console.error(`  ERROR: ${errorMsg}`);

      // Continue with next batch
      continue;
    }

    // Rate limiting delay
    if (i + EMBEDDING_BATCH_SIZE < newChunks.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  if (allEmbeddings.length === 0) {
    console.log(`\nFailed to generate any embeddings`);
    return {
      courseId: course.id,
      courseName: course.title,
      chunksProcessed: allChunks.length,
      chunksStored: 0,
      chunksSkipped: skippedCount,
      errors,
      duration: Date.now() - startTime,
    };
  }

  // Align chunks and embeddings (in case some batches failed)
  const chunksToStore = newChunks.slice(0, allEmbeddings.length);

  console.log(`\nGenerated ${allEmbeddings.length} embeddings`);

  // Phase 4: Store in vector database
  console.log(`\nStoring in vector database...`);

  onProgress?.({
    phase: 'storing',
    current: 0,
    total: chunksToStore.length,
    message: 'Writing to Firestore...',
  });

  try {
    const { stored, skipped: storeSkipped } = await storeEmbeddings(
      chunksToStore,
      allEmbeddings
    );

    console.log(`  Stored: ${stored} chunks`);
    console.log(`  Already existed: ${storeSkipped} chunks`);

    onProgress?.({
      phase: 'storing',
      current: chunksToStore.length,
      total: chunksToStore.length,
      message: 'Complete',
    });

    const duration = Date.now() - startTime;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Ingestion complete for: ${course.title}`);
    console.log(`  Duration: ${(duration / 1000).toFixed(1)}s`);
    console.log(`  Chunks processed: ${allChunks.length}`);
    console.log(`  Chunks stored: ${stored}`);
    console.log(`  Chunks skipped: ${skippedCount + storeSkipped}`);
    console.log(`  Errors: ${errors.length}`);
    console.log(`${'='.repeat(60)}\n`);

    return {
      courseId: course.id,
      courseName: course.title,
      chunksProcessed: allChunks.length,
      chunksStored: stored,
      chunksSkipped: skippedCount + storeSkipped,
      errors,
      duration,
    };
  } catch (error) {
    const errorMsg = `Failed to store embeddings: ${error instanceof Error ? error.message : error}`;
    errors.push(errorMsg);
    console.error(`  ERROR: ${errorMsg}`);

    return {
      courseId: course.id,
      courseName: course.title,
      chunksProcessed: allChunks.length,
      chunksStored: 0,
      chunksSkipped: skippedCount,
      errors,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Ingest multiple courses
 *
 * @param courses - Array of course objects
 * @param onProgress - Optional callback for progress updates
 * @returns Array of ingestion results
 */
export async function ingestCourses(
  courses: Course[],
  onProgress?: (courseIndex: number, progress: IngestionProgress) => void
): Promise<IngestionResult[]> {
  const results: IngestionResult[] = [];

  console.log(`\n${'#'.repeat(60)}`);
  console.log(`Starting ingestion of ${courses.length} course(s)`);
  console.log(`${'#'.repeat(60)}\n`);

  for (let i = 0; i < courses.length; i++) {
    const course = courses[i];
    console.log(`\nCourse ${i + 1}/${courses.length}: ${course.title}\n`);

    const result = await ingestCourse(course, (progress) => {
      onProgress?.(i, progress);
    });

    results.push(result);
  }

  // Summary
  const totalChunks = results.reduce((sum, r) => sum + r.chunksProcessed, 0);
  const totalStored = results.reduce((sum, r) => sum + r.chunksStored, 0);
  const totalSkipped = results.reduce((sum, r) => sum + r.chunksSkipped, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`\n${'#'.repeat(60)}`);
  console.log(`INGESTION SUMMARY`);
  console.log(`${'#'.repeat(60)}`);
  console.log(`  Courses processed: ${courses.length}`);
  console.log(`  Total chunks: ${totalChunks}`);
  console.log(`  Stored: ${totalStored}`);
  console.log(`  Skipped: ${totalSkipped}`);
  console.log(`  Errors: ${totalErrors}`);
  console.log(`  Duration: ${(totalDuration / 1000).toFixed(1)}s`);
  console.log(`${'#'.repeat(60)}\n`);

  return results;
}

/**
 * Get ingestion configuration info
 */
export function getIngestionConfig(): {
  embeddingBatchSize: number;
  batchDelayMs: number;
  embedding: ReturnType<typeof getEmbeddingConfig>;
  vectorStore: ReturnType<typeof getVectorStoreConfig>;
} {
  return {
    embeddingBatchSize: EMBEDDING_BATCH_SIZE,
    batchDelayMs: BATCH_DELAY_MS,
    embedding: getEmbeddingConfig(),
    vectorStore: getVectorStoreConfig(),
  };
}
