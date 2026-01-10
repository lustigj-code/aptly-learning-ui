/**
 * Vector Store
 * Stores content embeddings in Firestore using native vector support
 *
 * Part of Phase 02: RAG Knowledge Base
 *
 * Uses Firestore's FieldValue.vector() for efficient vector storage.
 * Requires creating a vector index in Firebase console:
 *   - Collection: content_embeddings
 *   - Field: embedding
 *   - Dimension: 768
 *   - Distance measure: COSINE
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  writeBatch,
  Timestamp,
  vector,
  VectorValue,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { ContentChunk } from './contentChunker';

// ============================================
// TYPES
// ============================================

export type EmbeddedChunk = {
  id: string;
  text: string;
  embedding: VectorValue; // VectorValue for storage
  courseId: string;
  moduleId: string;
  lessonId: string;
  atomId: string;
  atomType: string;
  title: string;
  chunkIndex: number;
  createdAt: Timestamp;
};

export type StoredChunk = Omit<EmbeddedChunk, 'embedding'> & {
  embedding: number[];
};

// ============================================
// CONFIGURATION
// ============================================

const COLLECTION_NAME = 'content_embeddings';
const MAX_BATCH_SIZE = 500; // Firestore batch limit

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
 * Check if a chunk already exists in the store
 */
export async function chunkExists(chunkId: string): Promise<boolean> {
  const firestore = getDb();
  const docRef = doc(firestore, COLLECTION_NAME, chunkId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists();
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Store a single embedding in Firestore
 *
 * @param chunk - The content chunk to store
 * @param embedding - The embedding vector (768 dimensions)
 * @returns Promise that resolves when stored
 */
export async function storeEmbedding(
  chunk: ContentChunk,
  embedding: number[]
): Promise<void> {
  const firestore = getDb();

  // Validate embedding dimensions
  if (embedding.length !== 768) {
    throw new Error(`Expected 768-dimensional vector, got ${embedding.length}`);
  }

  const docRef = doc(firestore, COLLECTION_NAME, chunk.id);

  const data: EmbeddedChunk = {
    id: chunk.id,
    text: chunk.text,
    embedding: vector(embedding),
    courseId: chunk.courseId,
    moduleId: chunk.moduleId,
    lessonId: chunk.lessonId,
    atomId: chunk.atomId,
    atomType: chunk.atomType,
    title: chunk.title,
    chunkIndex: chunk.chunkIndex,
    createdAt: Timestamp.now(),
  };

  await setDoc(docRef, data);
}

/**
 * Store multiple embeddings in Firestore using batch writes
 * Handles large numbers of chunks by splitting into batches of MAX_BATCH_SIZE
 *
 * @param chunks - Array of content chunks to store
 * @param embeddings - Array of embedding vectors (must match chunks length)
 * @returns Promise that resolves when all stored
 */
export async function storeEmbeddings(
  chunks: ContentChunk[],
  embeddings: number[][]
): Promise<{ stored: number; skipped: number }> {
  const firestore = getDb();

  if (chunks.length !== embeddings.length) {
    throw new Error(
      `Chunks and embeddings length mismatch: ${chunks.length} vs ${embeddings.length}`
    );
  }

  if (chunks.length === 0) {
    return { stored: 0, skipped: 0 };
  }

  let stored = 0;
  let skipped = 0;

  // Process in batches
  for (let i = 0; i < chunks.length; i += MAX_BATCH_SIZE) {
    const batchChunks = chunks.slice(i, i + MAX_BATCH_SIZE);
    const batchEmbeddings = embeddings.slice(i, i + MAX_BATCH_SIZE);

    // Check which chunks already exist (for idempotency)
    const existsChecks = await Promise.all(
      batchChunks.map((chunk) => chunkExists(chunk.id))
    );

    // Filter to only new chunks
    const newChunks: ContentChunk[] = [];
    const newEmbeddings: number[][] = [];

    for (let j = 0; j < batchChunks.length; j++) {
      if (existsChecks[j]) {
        skipped++;
      } else {
        newChunks.push(batchChunks[j]);
        newEmbeddings.push(batchEmbeddings[j]);
      }
    }

    if (newChunks.length === 0) {
      continue;
    }

    // Create batch write
    const batch = writeBatch(firestore);
    const now = Timestamp.now();

    for (let j = 0; j < newChunks.length; j++) {
      const chunk = newChunks[j];
      const embedding = newEmbeddings[j];

      // Validate embedding dimensions
      if (embedding.length !== 768) {
        throw new Error(
          `Expected 768-dimensional vector for chunk ${chunk.id}, got ${embedding.length}`
        );
      }

      const docRef = doc(firestore, COLLECTION_NAME, chunk.id);

      const data: EmbeddedChunk = {
        id: chunk.id,
        text: chunk.text,
        embedding: vector(embedding),
        courseId: chunk.courseId,
        moduleId: chunk.moduleId,
        lessonId: chunk.lessonId,
        atomId: chunk.atomId,
        atomType: chunk.atomType,
        title: chunk.title,
        chunkIndex: chunk.chunkIndex,
        createdAt: now,
      };

      batch.set(docRef, data);
    }

    await batch.commit();
    stored += newChunks.length;
  }

  return { stored, skipped };
}

/**
 * Get an embedding by chunk ID
 *
 * @param chunkId - The chunk ID to retrieve
 * @returns The stored chunk or null if not found
 */
export async function getEmbedding(chunkId: string): Promise<StoredChunk | null> {
  const firestore = getDb();
  const docRef = doc(firestore, COLLECTION_NAME, chunkId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const data = docSnap.data() as StoredChunk;
  return data;
}

/**
 * Get the vector store configuration
 * Useful for debugging and documentation
 */
export function getVectorStoreConfig(): {
  collection: string;
  dimensions: number;
  distanceMeasure: string;
  maxBatchSize: number;
} {
  return {
    collection: COLLECTION_NAME,
    dimensions: 768,
    distanceMeasure: 'COSINE',
    maxBatchSize: MAX_BATCH_SIZE,
  };
}

/**
 * Instructions for creating the vector index in Firebase console
 * This must be done manually in the Firebase console.
 */
export const VECTOR_INDEX_INSTRUCTIONS = `
To enable vector search, create a vector index in Firebase console:

1. Go to Firebase Console > Firestore Database
2. Click on "Indexes" tab
3. Click "Create Index" (or "Add Index" for composite indexes)
4. Select "Vector" as the index type
5. Configure:
   - Collection: content_embeddings
   - Field: embedding
   - Dimension: 768
   - Distance measure: COSINE
6. Click "Create"

The index may take a few minutes to build.

Note: Vector search queries will fail until the index is created.
`;
