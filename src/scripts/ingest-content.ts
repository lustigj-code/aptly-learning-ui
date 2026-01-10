#!/usr/bin/env npx tsx
/**
 * Content Ingestion CLI Script
 *
 * Ingests FSM course content into the vector store for RAG retrieval.
 *
 * Run with: npx tsx src/scripts/ingest-content.ts
 * Or: npm run ingest:content
 *
 * Environment variables required:
 * - GOOGLE_GENAI_API_KEY: Google AI API key for embeddings
 * - GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_ADMIN_SDK_JSON: Firebase credentials
 */

import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  COURSES,
  COURSE_1_MODULE_1,
  COURSE_3_MODULE_1,
  AI_WORK_COURSES,
} from '../data/mockData';
import { AI_AT_WORK_MODULES } from '../data/aiAtWorkCourse';
import { chunkLesson, type ContentChunk } from '../lib/ai/contentChunker';
import type { Course, Lesson } from '../types';

// ============================================
// CONFIGURATION
// ============================================

const EMBEDDING_MODEL = 'text-embedding-004';
const EMBEDDING_DIMENSIONS = 768;
const COLLECTION_NAME = 'content_embeddings';
const EMBEDDING_BATCH_SIZE = 20;
const BATCH_DELAY_MS = 500;

// ============================================
// INITIALIZATION
// ============================================

function initializeFirebase(): admin.firestore.Firestore {
  if (admin.apps.length === 0) {
    if (process.env.FIREBASE_ADMIN_SDK_JSON) {
      let credential: Record<string, unknown>;
      try {
        const decodedJson = Buffer.from(
          process.env.FIREBASE_ADMIN_SDK_JSON,
          'base64'
        ).toString('utf-8');
        credential = JSON.parse(decodedJson) as Record<string, unknown>;
      } catch {
        credential = JSON.parse(
          process.env.FIREBASE_ADMIN_SDK_JSON
        ) as Record<string, unknown>;
      }

      admin.initializeApp({
        credential: admin.credential.cert(credential as admin.ServiceAccount),
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    } else {
      console.error(
        'ERROR: Firebase credentials not found. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_ADMIN_SDK_JSON.'
      );
      process.exit(1);
    }
  }

  return admin.firestore();
}

function initializeGenAI(): GoogleGenerativeAI {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    console.error('ERROR: GOOGLE_GENAI_API_KEY environment variable not set.');
    process.exit(1);
  }
  return new GoogleGenerativeAI(apiKey);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function embedText(genAI: GoogleGenerativeAI, text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

async function embedBatch(
  genAI: GoogleGenerativeAI,
  texts: string[]
): Promise<number[][]> {
  const results: number[][] = [];

  for (const text of texts) {
    const vector = await embedText(genAI, text);
    results.push(vector);
  }

  return results;
}

async function chunkExists(
  db: admin.firestore.Firestore,
  chunkId: string
): Promise<boolean> {
  const doc = await db.collection(COLLECTION_NAME).doc(chunkId).get();
  return doc.exists;
}

function extractLessonsFromCourse(course: Course): {
  lesson: Lesson;
  courseId: string;
  moduleId: string;
}[] {
  const result: { lesson: Lesson; courseId: string; moduleId: string }[] = [];

  for (const module of course.modules || []) {
    for (const lesson of module.lessons || []) {
      result.push({
        lesson,
        courseId: course.id,
        moduleId: module.id,
      });
    }
  }

  return result;
}

// ============================================
// MAIN INGESTION FUNCTION
// ============================================

async function ingestCourse(
  db: admin.firestore.Firestore,
  genAI: GoogleGenerativeAI,
  course: Course
): Promise<{
  chunksProcessed: number;
  chunksStored: number;
  chunksSkipped: number;
  errors: string[];
}> {
  const errors: string[] = [];

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Ingesting: ${course.title}`);
  console.log(`${'='.repeat(60)}\n`);

  // Phase 1: Chunk all content
  const allChunks: ContentChunk[] = [];
  const lessons = extractLessonsFromCourse(course);

  if (lessons.length === 0) {
    console.log(`  No lessons found in course ${course.id}`);
    return { chunksProcessed: 0, chunksStored: 0, chunksSkipped: 0, errors: ['No lessons'] };
  }

  console.log(`  Found ${lessons.length} lessons`);

  for (const { lesson, courseId, moduleId } of lessons) {
    try {
      const chunks = chunkLesson(lesson, { courseId, moduleId });
      allChunks.push(...chunks);
      console.log(`    - "${lesson.title}": ${chunks.length} chunks`);
    } catch (error) {
      const msg = `Failed to chunk lesson ${lesson.id}: ${error}`;
      errors.push(msg);
      console.error(`    ERROR: ${msg}`);
    }
  }

  if (allChunks.length === 0) {
    return { chunksProcessed: 0, chunksStored: 0, chunksSkipped: 0, errors };
  }

  console.log(`\n  Total chunks: ${allChunks.length}`);

  // Phase 2: Filter existing chunks
  console.log(`  Checking for existing chunks...`);
  const newChunks: ContentChunk[] = [];

  for (const chunk of allChunks) {
    const exists = await chunkExists(db, chunk.id);
    if (!exists) {
      newChunks.push(chunk);
    }
  }

  const skipped = allChunks.length - newChunks.length;
  console.log(`    Skipping ${skipped} existing chunks`);
  console.log(`    Processing ${newChunks.length} new chunks`);

  if (newChunks.length === 0) {
    return {
      chunksProcessed: allChunks.length,
      chunksStored: 0,
      chunksSkipped: skipped,
      errors,
    };
  }

  // Phase 3: Embed and store in batches
  console.log(`\n  Embedding and storing...`);
  let stored = 0;

  for (let i = 0; i < newChunks.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = newChunks.slice(i, i + EMBEDDING_BATCH_SIZE);
    const batchNum = Math.floor(i / EMBEDDING_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(newChunks.length / EMBEDDING_BATCH_SIZE);

    process.stdout.write(`    Batch ${batchNum}/${totalBatches}... `);

    try {
      // Generate embeddings
      const texts = batch.map((c) => c.text);
      const embeddings = await embedBatch(genAI, texts);

      // Store in Firestore
      const writeBatch = db.batch();

      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j];
        const embedding = embeddings[j];

        const docRef = db.collection(COLLECTION_NAME).doc(chunk.id);
        writeBatch.set(docRef, {
          id: chunk.id,
          text: chunk.text,
          embedding: admin.firestore.FieldValue.vector(embedding),
          courseId: chunk.courseId,
          moduleId: chunk.moduleId,
          lessonId: chunk.lessonId,
          atomId: chunk.atomId,
          atomType: chunk.atomType,
          title: chunk.title,
          chunkIndex: chunk.chunkIndex,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      await writeBatch.commit();
      stored += batch.length;
      console.log(`stored ${batch.length} chunks`);
    } catch (error) {
      const msg = `Batch ${batchNum} failed: ${error}`;
      errors.push(msg);
      console.log(`FAILED: ${error}`);
    }

    // Rate limiting
    if (i + EMBEDDING_BATCH_SIZE < newChunks.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  return {
    chunksProcessed: allChunks.length,
    chunksStored: stored,
    chunksSkipped: skipped,
    errors,
  };
}

// ============================================
// MAIN ENTRY POINT
// ============================================

async function main() {
  console.log('\n' + '#'.repeat(60));
  console.log('FSM CONTENT INGESTION PIPELINE');
  console.log('#'.repeat(60));

  const startTime = Date.now();

  // Initialize services
  console.log('\nInitializing services...');
  const db = initializeFirebase();
  const genAI = initializeGenAI();
  console.log('  Firebase: OK');
  console.log('  Google AI: OK');

  // Prepare courses with full module data
  const coursesToIngest: Course[] = [];

  // Add FSM courses with their modules
  for (const course of COURSES) {
    const courseWithModules = { ...course };

    if (course.id === 'course-1') {
      courseWithModules.modules = [COURSE_1_MODULE_1];
    } else if (course.id === 'course-3') {
      courseWithModules.modules = [COURSE_3_MODULE_1];
    }

    if (courseWithModules.modules && courseWithModules.modules.length > 0) {
      coursesToIngest.push(courseWithModules);
    }
  }

  // Add AI at Work course with all modules
  if (AI_WORK_COURSES.length > 0) {
    const aiWorkCourse = {
      ...AI_WORK_COURSES[0],
      modules: AI_AT_WORK_MODULES,
    };
    coursesToIngest.push(aiWorkCourse);
  }

  console.log(`\nCourses to ingest: ${coursesToIngest.length}`);
  for (const course of coursesToIngest) {
    const moduleCount = course.modules?.length || 0;
    const lessonCount = course.modules?.reduce(
      (sum, m) => sum + (m.lessons?.length || 0),
      0
    ) || 0;
    console.log(`  - ${course.title}: ${moduleCount} modules, ${lessonCount} lessons`);
  }

  // Ingest all courses
  let totalProcessed = 0;
  let totalStored = 0;
  let totalSkipped = 0;
  let totalErrors: string[] = [];

  for (const course of coursesToIngest) {
    const result = await ingestCourse(db, genAI, course);
    totalProcessed += result.chunksProcessed;
    totalStored += result.chunksStored;
    totalSkipped += result.chunksSkipped;
    totalErrors = totalErrors.concat(result.errors);
  }

  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n' + '#'.repeat(60));
  console.log('INGESTION COMPLETE');
  console.log('#'.repeat(60));
  console.log(`  Duration: ${duration}s`);
  console.log(`  Chunks processed: ${totalProcessed}`);
  console.log(`  Chunks stored: ${totalStored}`);
  console.log(`  Chunks skipped: ${totalSkipped}`);
  console.log(`  Errors: ${totalErrors.length}`);

  if (totalErrors.length > 0) {
    console.log('\nErrors encountered:');
    for (const error of totalErrors) {
      console.log(`  - ${error}`);
    }
  }

  console.log('\n' + '#'.repeat(60) + '\n');

  // Print vector index instructions if chunks were stored
  if (totalStored > 0) {
    console.log('IMPORTANT: Create a vector index in Firebase Console:');
    console.log('  1. Go to Firebase Console > Firestore Database');
    console.log('  2. Click on "Indexes" tab');
    console.log('  3. Create a Vector Index:');
    console.log(`     - Collection: ${COLLECTION_NAME}`);
    console.log('     - Field: embedding');
    console.log(`     - Dimension: ${EMBEDDING_DIMENSIONS}`);
    console.log('     - Distance: COSINE');
    console.log('  4. Wait for index to build before running similarity searches\n');
  }

  process.exit(totalErrors.length > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
