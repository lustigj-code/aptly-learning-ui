/**
 * ChromaDB Vector Database - FREE Implementation
 * Phase 3: RAG System
 *
 * Self-hosted vector storage (Cost: $0)
 * Upgrade Path: Switch to Pinecone/Qdrant with same interface
 *
 * NOTE: This is a mock implementation. Install chromadb package for full functionality.
 */

import type { VectorDB } from '../providers/interfaces';

// In-memory storage as fallback when ChromaDB isn't available
type StoredDocument = {
  id: string;
  text: string;
  metadata?: Record<string, unknown>;
};

export class ChromaDBVectorStore implements VectorDB {
  private collections: Map<string, StoredDocument[]> = new Map();
  private isConnected = false;

  constructor(private baseUrl: string = 'http://localhost:8000') {
    console.warn('⚠️ ChromaDB client not available. Using in-memory mock. Install chromadb for production use.');
  }

  /**
   * Add documents to collection
   */
  async addDocuments(
    collectionName: string,
    documents: Array<{
      id: string;
      text: string;
      metadata?: Record<string, unknown>;
    }>
  ): Promise<void> {
    const existing = this.collections.get(collectionName) || [];
    const newDocs = documents.map(d => ({
      id: d.id,
      text: d.text,
      metadata: d.metadata,
    }));
    this.collections.set(collectionName, [...existing, ...newDocs]);
    console.log(`✅ [MOCK] Added ${documents.length} documents to ${collectionName}`);
  }

  /**
   * Search for similar documents (mock: returns keyword matches)
   */
  async search(
    collectionName: string,
    query: string,
    topK: number = 5,
    filter?: Record<string, unknown>
  ): Promise<
    Array<{
      id: string;
      text: string;
      score: number;
      metadata?: Record<string, unknown>;
    }>
  > {
    const docs = this.collections.get(collectionName) || [];
    const queryWords = query.toLowerCase().split(/\s+/);

    // Simple keyword matching as mock for vector search
    const scored = docs
      .filter(doc => {
        if (!filter) return true;
        return Object.entries(filter).every(([key, value]) =>
          doc.metadata?.[key] === value
        );
      })
      .map(doc => {
        const docWords = doc.text.toLowerCase();
        const matchCount = queryWords.filter(w => docWords.includes(w)).length;
        const score = matchCount / queryWords.length;
        return { ...doc, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return scored;
  }

  /**
   * Check if collection exists
   */
  async collectionExists(collectionName: string): Promise<boolean> {
    return this.collections.has(collectionName);
  }

  /**
   * Get collection statistics
   */
  async getStats(collectionName: string): Promise<{
    documentCount: number;
    dimensions: number;
  }> {
    const docs = this.collections.get(collectionName) || [];
    return {
      documentCount: docs.length,
      dimensions: 384, // all-MiniLM-L6-v2 default
    };
  }

  /**
   * Delete collection
   */
  async deleteCollection(name: string): Promise<void> {
    this.collections.delete(name);
  }

  /**
   * List all collections
   */
  async listCollections(): Promise<string[]> {
    return Array.from(this.collections.keys());
  }
}

/**
 * Initialize vector DB with Meta Blueprint content
 */
export async function initializeMetaBlueprintVectorDB() {
  const vectorDB = new ChromaDBVectorStore();

  console.log('🔄 Initializing Meta Blueprint vector database...');

  // Load Meta Blueprint concepts
  const concepts = await loadMetaBlueprintConcepts();

  if (concepts.length === 0) {
    console.warn('⚠️ No concepts found. Run npm run ai:scrape-blueprint first.');
    return vectorDB;
  }

  // Chunk content for better retrieval
  const chunks = concepts.flatMap((concept: { id: string; content: string; title: string; topic: string; difficulty: string; category: string }) => {
    return chunkText(concept.content, 500).map((chunk, index) => ({
      id: `${concept.id}-chunk-${index}`,
      text: chunk,
      metadata: {
        conceptId: concept.id,
        title: concept.title,
        topic: concept.topic,
        difficulty: concept.difficulty,
        category: concept.category,
      },
    }));
  });

  console.log(`📦 Created ${chunks.length} chunks from ${concepts.length} concepts`);

  // Add to vector DB
  await vectorDB.addDocuments('meta_blueprint', chunks);

  console.log('✅ Vector DB initialized!');

  return vectorDB;
}

/**
 * Chunk text into smaller pieces for better retrieval
 */
function chunkText(text: string, chunkSize: number = 500): string[] {
  const sentences = text.split(/[.!?]+\s/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? '. ' : '') + sentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter((c) => c.length > 50); // Skip very short chunks
}

/**
 * Helper to load concepts
 * NOTE: Only works server-side. Returns empty array on client.
 */
async function loadMetaBlueprintConcepts() {
  // Only load on server-side (Node.js environment)
  if (typeof window !== 'undefined') {
    console.warn('⚠️ loadMetaBlueprintConcepts called on client-side. Returning empty array.');
    return [];
  }

  try {
    // Dynamic import to avoid bundling issues
    const fs = await import('node:fs');
    const path = await import('node:path');

    const conceptsPath = path.join(process.cwd(), 'data', 'meta-blueprint', 'concepts.json');

    if (!fs.existsSync(conceptsPath)) {
      console.warn('⚠️ No concepts found. Run npm run ai:scrape-blueprint first.');
      return [];
    }

    const concepts = JSON.parse(fs.readFileSync(conceptsPath, 'utf-8'));
    return concepts;
  } catch (error) {
    console.error('Error loading concepts:', error);
    return [];
  }
}
