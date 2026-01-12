/**
 * Vector Store for RAG
 *
 * Supports both Pinecone and Firestore as vector backends.
 * Pinecone offers better performance at scale, Firestore works without external dependencies.
 *
 * Configuration:
 * - Set PINECONE_API_KEY and PINECONE_INDEX to use Pinecone
 * - Falls back to Firestore if Pinecone is not configured
 *
 * Part of Phase 12.1: Content Indexing Pipeline
 */

import { Pinecone, type Index, type RecordMetadata } from '@pinecone-database/pinecone';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  writeBatch,
  Timestamp,
  vector,
  limit,
  getCountFromServer,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { ChunkType } from './types';

// ============================================
// TYPES
// ============================================

export type VectorStoreProvider = 'pinecone' | 'firestore';

export type VectorMetadata = {
  courseId: string;
  moduleId: string;
  lessonId: string;
  atomId: string;
  atomType: string;
  chunkType: ChunkType;
  title: string;
  chunkIndex: number;
  questionId?: string;
  distractorId?: string;
  distractorText?: string;
  skills?: string[];
  studentFriendly?: boolean;
};

export type VectorRecord = {
  id: string;
  values: number[];
  metadata: VectorMetadata;
  text: string;
};

export type VectorSearchResult = {
  id: string;
  score: number;
  metadata: VectorMetadata;
  text: string;
};

export type IndexStats = {
  provider: VectorStoreProvider;
  totalVectors: number;
  byChunkType: Record<ChunkType, number>;
  byCourse: Record<string, number>;
  lastUpdated?: Date;
  indexName?: string;
  dimension?: number;
};

// ============================================
// CONFIGURATION
// ============================================

const FIRESTORE_COLLECTION = 'pedagogical_chunks';
const EMBEDDING_DIMENSION = 768; // Default for Google text-embedding-004
const DEFAULT_NAMESPACE = 'aptly-learning';

// ============================================
// PROVIDER DETECTION
// ============================================

let pineconeClient: Pinecone | null = null;
let pineconeIndex: Index<RecordMetadata> | null = null;

/**
 * Get the current vector store provider based on environment configuration
 */
export function getVectorStoreProvider(): VectorStoreProvider {
  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX;

  if (apiKey && indexName) {
    return 'pinecone';
  }
  return 'firestore';
}

/**
 * Initialize Pinecone client (lazy initialization)
 */
function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) {
      throw new Error('PINECONE_API_KEY environment variable is not set');
    }
    pineconeClient = new Pinecone({ apiKey });
  }
  return pineconeClient;
}

/**
 * Get Pinecone index
 */
function getPineconeIndex(): Index<RecordMetadata> {
  if (!pineconeIndex) {
    const indexName = process.env.PINECONE_INDEX;
    if (!indexName) {
      throw new Error('PINECONE_INDEX environment variable is not set');
    }
    const client = getPineconeClient();
    pineconeIndex = client.index(indexName);
  }
  return pineconeIndex;
}

/**
 * Get Firestore instance
 */
function getDb() {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  return db;
}

// ============================================
// UPSERT OPERATIONS
// ============================================

/**
 * Upsert a single vector record
 */
export async function upsertVector(
  id: string,
  embedding: number[],
  text: string,
  metadata: VectorMetadata
): Promise<void> {
  const provider = getVectorStoreProvider();

  if (provider === 'pinecone') {
    await upsertToPinecone(id, embedding, text, metadata);
  } else {
    await upsertToFirestore(id, embedding, text, metadata);
  }
}

/**
 * Upsert multiple vector records (batch operation)
 */
export async function upsertVectors(
  records: VectorRecord[]
): Promise<{ upserted: number; errors: string[] }> {
  const provider = getVectorStoreProvider();
  const errors: string[] = [];
  let upserted = 0;

  if (provider === 'pinecone') {
    // Pinecone batch upsert (max 100 vectors per batch)
    const BATCH_SIZE = 100;
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      try {
        await upsertBatchToPinecone(batch);
        upserted += batch.length;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`Pinecone batch ${i / BATCH_SIZE}: ${msg}`);
      }
    }
  } else {
    // Firestore batch upsert (max 500 per batch)
    const BATCH_SIZE = 400;
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      try {
        await upsertBatchToFirestore(batch);
        upserted += batch.length;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`Firestore batch ${i / BATCH_SIZE}: ${msg}`);
      }
    }
  }

  return { upserted, errors };
}

// ============================================
// PINECONE OPERATIONS
// ============================================

async function upsertToPinecone(
  id: string,
  embedding: number[],
  text: string,
  metadata: VectorMetadata
): Promise<void> {
  const index = getPineconeIndex();

  await index.namespace(DEFAULT_NAMESPACE).upsert([
    {
      id,
      values: embedding,
      metadata: {
        ...metadata,
        text, // Include text in metadata for retrieval
        skills: metadata.skills?.join(',') || '',
      },
    },
  ]);
}

async function upsertBatchToPinecone(records: VectorRecord[]): Promise<void> {
  const index = getPineconeIndex();

  const vectors = records.map((record) => ({
    id: record.id,
    values: record.values,
    metadata: {
      ...record.metadata,
      text: record.text,
      skills: record.metadata.skills?.join(',') || '',
    },
  }));

  await index.namespace(DEFAULT_NAMESPACE).upsert(vectors);
}

// ============================================
// FIRESTORE OPERATIONS
// ============================================

async function upsertToFirestore(
  id: string,
  embedding: number[],
  text: string,
  metadata: VectorMetadata
): Promise<void> {
  const firestore = getDb();
  const docRef = doc(firestore, FIRESTORE_COLLECTION, id);

  await setDoc(docRef, {
    id,
    embedding: vector(embedding),
    text,
    ...metadata,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

async function upsertBatchToFirestore(records: VectorRecord[]): Promise<void> {
  const firestore = getDb();
  const batch = writeBatch(firestore);
  const now = Timestamp.now();

  for (const record of records) {
    const docRef = doc(firestore, FIRESTORE_COLLECTION, record.id);
    batch.set(docRef, {
      id: record.id,
      embedding: vector(record.values),
      text: record.text,
      ...record.metadata,
      createdAt: now,
      updatedAt: now,
    });
  }

  await batch.commit();
}

// ============================================
// SEARCH OPERATIONS
// ============================================

/**
 * Search for similar vectors
 */
export async function searchVectors(
  queryEmbedding: number[],
  options: {
    topK?: number;
    filter?: {
      courseId?: string;
      lessonId?: string;
      chunkTypes?: ChunkType[];
    };
    minScore?: number;
  } = {}
): Promise<VectorSearchResult[]> {
  const provider = getVectorStoreProvider();
  const { topK = 10, filter, minScore = 0.5 } = options;

  if (provider === 'pinecone') {
    return searchPinecone(queryEmbedding, topK, filter, minScore);
  } else {
    return searchFirestore(queryEmbedding, topK, filter, minScore);
  }
}

async function searchPinecone(
  queryEmbedding: number[],
  topK: number,
  filter?: {
    courseId?: string;
    lessonId?: string;
    chunkTypes?: ChunkType[];
  },
  minScore: number = 0.5
): Promise<VectorSearchResult[]> {
  const index = getPineconeIndex();

  // Build Pinecone filter
  const pineconeFilter: Record<string, unknown> = {};
  if (filter?.courseId) {
    pineconeFilter.courseId = { $eq: filter.courseId };
  }
  if (filter?.lessonId) {
    pineconeFilter.lessonId = { $eq: filter.lessonId };
  }
  if (filter?.chunkTypes && filter.chunkTypes.length > 0) {
    pineconeFilter.chunkType = { $in: filter.chunkTypes };
  }

  const queryResponse = await index.namespace(DEFAULT_NAMESPACE).query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
    filter: Object.keys(pineconeFilter).length > 0 ? pineconeFilter : undefined,
  });

  return (queryResponse.matches || [])
    .filter((match) => (match.score || 0) >= minScore)
    .map((match) => ({
      id: match.id,
      score: match.score || 0,
      metadata: {
        courseId: String(match.metadata?.courseId || ''),
        moduleId: String(match.metadata?.moduleId || ''),
        lessonId: String(match.metadata?.lessonId || ''),
        atomId: String(match.metadata?.atomId || ''),
        atomType: String(match.metadata?.atomType || 'reading'),
        chunkType: (match.metadata?.chunkType as ChunkType) || 'content',
        title: String(match.metadata?.title || ''),
        chunkIndex: Number(match.metadata?.chunkIndex || 0),
        questionId: match.metadata?.questionId as string | undefined,
        distractorId: match.metadata?.distractorId as string | undefined,
        distractorText: match.metadata?.distractorText as string | undefined,
        skills: match.metadata?.skills
          ? String(match.metadata.skills).split(',').filter(Boolean)
          : undefined,
        studentFriendly: match.metadata?.studentFriendly as boolean | undefined,
      },
      text: String(match.metadata?.text || ''),
    }));
}

async function searchFirestore(
  queryEmbedding: number[],
  topK: number,
  filter?: {
    courseId?: string;
    lessonId?: string;
    chunkTypes?: ChunkType[];
  },
  minScore: number = 0.5
): Promise<VectorSearchResult[]> {
  const firestore = getDb();
  const collRef = collection(firestore, FIRESTORE_COLLECTION);

  // Build Firestore query
  let q = query(collRef, limit(100)); // Fetch more for client-side filtering

  if (filter?.courseId) {
    q = query(collRef, where('courseId', '==', filter.courseId), limit(100));
  }
  if (filter?.lessonId) {
    q = query(
      collRef,
      where('courseId', '==', filter.courseId || ''),
      where('lessonId', '==', filter.lessonId),
      limit(100)
    );
  }

  const snapshot = await getDocs(q);
  const results: VectorSearchResult[] = [];

  snapshot.forEach((doc) => {
    const data = doc.data();

    // Filter by chunk type if specified
    if (filter?.chunkTypes && filter.chunkTypes.length > 0) {
      const chunkType = data.chunkType || 'content';
      if (!filter.chunkTypes.includes(chunkType as ChunkType)) {
        return;
      }
    }

    // Extract embedding
    let storedEmbedding: number[] | null = null;
    if (Array.isArray(data.embedding)) {
      storedEmbedding = data.embedding;
    } else if (data.embedding?._values) {
      storedEmbedding = Array.from(data.embedding._values);
    } else if (data.embedding?.toArray) {
      storedEmbedding = data.embedding.toArray();
    }

    if (!storedEmbedding) return;

    // Calculate cosine similarity
    const score = cosineSimilarity(queryEmbedding, storedEmbedding);

    if (score >= minScore) {
      results.push({
        id: doc.id,
        score,
        metadata: {
          courseId: data.courseId || '',
          moduleId: data.moduleId || '',
          lessonId: data.lessonId || '',
          atomId: data.atomId || '',
          atomType: data.atomType || 'reading',
          chunkType: data.chunkType || 'content',
          title: data.title || '',
          chunkIndex: data.chunkIndex || 0,
          questionId: data.questionId,
          distractorId: data.distractorId,
          distractorText: data.distractorText,
          skills: data.skills,
          studentFriendly: data.studentFriendly,
        },
        text: data.text || '',
      });
    }
  });

  // Sort by score and return top K
  return results.sort((a, b) => b.score - a.score).slice(0, topK);
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
// DELETE OPERATIONS
// ============================================

/**
 * Delete all vectors for a specific course
 */
export async function deleteVectorsByCourse(
  courseId: string
): Promise<number> {
  const provider = getVectorStoreProvider();

  if (provider === 'pinecone') {
    return deleteFromPineconeByCourse(courseId);
  } else {
    return deleteFromFirestoreByCourse(courseId);
  }
}

/**
 * Delete all vectors (clear index)
 */
export async function deleteAllVectors(): Promise<number> {
  const provider = getVectorStoreProvider();

  if (provider === 'pinecone') {
    return deleteAllFromPinecone();
  } else {
    return deleteAllFromFirestore();
  }
}

async function deleteFromPineconeByCourse(courseId: string): Promise<number> {
  const index = getPineconeIndex();

  // Pinecone doesn't directly support delete by metadata filter in all tiers
  // We need to query first, then delete by IDs
  const queryResponse = await index.namespace(DEFAULT_NAMESPACE).query({
    vector: new Array(EMBEDDING_DIMENSION).fill(0), // Dummy vector
    topK: 10000,
    filter: { courseId: { $eq: courseId } },
    includeMetadata: false,
  });

  const ids = (queryResponse.matches || []).map((m) => m.id);

  if (ids.length === 0) return 0;

  // Delete in batches of 1000
  const BATCH_SIZE = 1000;
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    await index.namespace(DEFAULT_NAMESPACE).deleteMany(batch);
  }

  return ids.length;
}

async function deleteAllFromPinecone(): Promise<number> {
  const index = getPineconeIndex();

  // Delete all vectors in the namespace
  await index.namespace(DEFAULT_NAMESPACE).deleteAll();

  // Return approximate count (actual count not available after deleteAll)
  return -1; // Indicates all deleted but count unknown
}

async function deleteFromFirestoreByCourse(courseId: string): Promise<number> {
  const firestore = getDb();
  const collRef = collection(firestore, FIRESTORE_COLLECTION);

  const q = query(collRef, where('courseId', '==', courseId));
  const snapshot = await getDocs(q);

  let deleted = 0;
  const BATCH_SIZE = 400;

  // Delete in batches
  const docs = snapshot.docs;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(firestore);
    const batchDocs = docs.slice(i, i + BATCH_SIZE);

    for (const docSnap of batchDocs) {
      batch.delete(docSnap.ref);
    }

    await batch.commit();
    deleted += batchDocs.length;
  }

  return deleted;
}

async function deleteAllFromFirestore(): Promise<number> {
  const firestore = getDb();
  const collRef = collection(firestore, FIRESTORE_COLLECTION);

  const snapshot = await getDocs(query(collRef, limit(10000)));
  let deleted = 0;
  const BATCH_SIZE = 400;

  const docs = snapshot.docs;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(firestore);
    const batchDocs = docs.slice(i, i + BATCH_SIZE);

    for (const docSnap of batchDocs) {
      batch.delete(docSnap.ref);
    }

    await batch.commit();
    deleted += batchDocs.length;
  }

  return deleted;
}

// ============================================
// STATS OPERATIONS
// ============================================

/**
 * Get index statistics
 */
export async function getVectorStats(courseId?: string): Promise<IndexStats> {
  const provider = getVectorStoreProvider();

  if (provider === 'pinecone') {
    return getPineconeStats(courseId);
  } else {
    return getFirestoreStats(courseId);
  }
}

async function getPineconeStats(_courseId?: string): Promise<IndexStats> {
  const index = getPineconeIndex();

  const stats = await index.describeIndexStats();

  // For detailed breakdown, we'd need to query by courseId
  // For now, return basic stats (courseId filtering not yet implemented for Pinecone)
  const totalVectors = stats.totalRecordCount || 0;

  return {
    provider: 'pinecone',
    totalVectors,
    byChunkType: {
      content: 0,
      misconception: 0,
      hint: 0,
      example: 0,
    },
    byCourse: {},
    indexName: process.env.PINECONE_INDEX,
    dimension: stats.dimension,
  };
}

async function getFirestoreStats(courseId?: string): Promise<IndexStats> {
  const firestore = getDb();
  const collRef = collection(firestore, FIRESTORE_COLLECTION);

  // Get total count
  let totalQuery = query(collRef);
  if (courseId) {
    totalQuery = query(collRef, where('courseId', '==', courseId));
  }

  const countResult = await getCountFromServer(totalQuery);
  const totalVectors = countResult.data().count;

  // For detailed breakdown, query sample data
  const sampleQuery = query(collRef, limit(1000));
  const snapshot = await getDocs(sampleQuery);

  const byChunkType: Record<ChunkType, number> = {
    content: 0,
    misconception: 0,
    hint: 0,
    example: 0,
  };
  const byCourse: Record<string, number> = {};
  let lastUpdated: Date | undefined;

  snapshot.forEach((doc) => {
    const data = doc.data();
    const chunkType = (data.chunkType || 'content') as ChunkType;
    byChunkType[chunkType]++;

    const course = data.courseId || 'unknown';
    byCourse[course] = (byCourse[course] || 0) + 1;

    if (data.updatedAt) {
      const updated = data.updatedAt.toDate();
      if (!lastUpdated || updated > lastUpdated) {
        lastUpdated = updated;
      }
    }
  });

  return {
    provider: 'firestore',
    totalVectors,
    byChunkType,
    byCourse,
    lastUpdated,
    dimension: EMBEDDING_DIMENSION,
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if vector store is properly configured
 */
export function isVectorStoreConfigured(): boolean {
  const provider = getVectorStoreProvider();

  if (provider === 'pinecone') {
    return !!(process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX);
  }

  return !!db;
}

/**
 * Get vector store configuration info
 */
export function getVectorStoreConfig(): {
  provider: VectorStoreProvider;
  configured: boolean;
  indexName?: string;
  collection?: string;
  dimension: number;
} {
  const provider = getVectorStoreProvider();

  return {
    provider,
    configured: isVectorStoreConfigured(),
    indexName: provider === 'pinecone' ? process.env.PINECONE_INDEX : undefined,
    collection: provider === 'firestore' ? FIRESTORE_COLLECTION : undefined,
    dimension: EMBEDDING_DIMENSION,
  };
}
