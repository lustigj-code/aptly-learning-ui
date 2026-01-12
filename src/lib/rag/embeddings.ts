/**
 * Embedding Pipeline for RAG
 *
 * Supports multiple embedding providers:
 * - Google text-embedding-004 (default, 768 dimensions)
 * - OpenAI text-embedding-3-small (1536 dimensions, configurable)
 *
 * Configuration:
 * - Set OPENAI_API_KEY to use OpenAI embeddings
 * - Set EMBEDDING_PROVIDER=openai to prefer OpenAI
 * - Falls back to Google if GOOGLE_GENAI_API_KEY is set
 *
 * Part of Phase 12.1: Content Indexing Pipeline
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// ============================================
// TYPES
// ============================================

export type EmbeddingProvider = 'google' | 'openai';

export type EmbeddingConfig = {
  provider: EmbeddingProvider;
  model: string;
  dimensions: number;
  maxBatchSize: number;
};

// ============================================
// CONFIGURATION
// ============================================

const GOOGLE_MODEL = 'text-embedding-004';
const GOOGLE_DIMENSIONS = 768;
const GOOGLE_MAX_BATCH = 100;

const OPENAI_MODEL = 'text-embedding-3-small';
const OPENAI_DIMENSIONS = 1536; // Can be reduced to 512 or 256 for cost savings
const OPENAI_MAX_BATCH = 2048;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// ============================================
// PROVIDER MANAGEMENT
// ============================================

let googleClient: GoogleGenerativeAI | null = null;

/**
 * Get the active embedding provider based on environment configuration
 */
export function getEmbeddingProvider(): EmbeddingProvider {
  // Check explicit preference first
  const preferred = process.env.EMBEDDING_PROVIDER?.toLowerCase();
  if (preferred === 'openai' && process.env.OPENAI_API_KEY) {
    return 'openai';
  }
  if (preferred === 'google' && process.env.GOOGLE_GENAI_API_KEY) {
    return 'google';
  }

  // Fall back to whatever is configured
  if (process.env.OPENAI_API_KEY) {
    return 'openai';
  }
  if (process.env.GOOGLE_GENAI_API_KEY) {
    return 'google';
  }

  // Default to Google (existing behavior)
  return 'google';
}

/**
 * Get embedding configuration for the active provider
 */
export function getEmbeddingConfig(): EmbeddingConfig {
  const provider = getEmbeddingProvider();

  if (provider === 'openai') {
    return {
      provider: 'openai',
      model: OPENAI_MODEL,
      dimensions: OPENAI_DIMENSIONS,
      maxBatchSize: OPENAI_MAX_BATCH,
    };
  }

  return {
    provider: 'google',
    model: GOOGLE_MODEL,
    dimensions: GOOGLE_DIMENSIONS,
    maxBatchSize: GOOGLE_MAX_BATCH,
  };
}

/**
 * Get Google Generative AI client (lazy initialization)
 */
function getGoogleClient(): GoogleGenerativeAI {
  if (!googleClient) {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_GENAI_API_KEY environment variable is not set');
    }
    googleClient = new GoogleGenerativeAI(apiKey);
  }
  return googleClient;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('rate limit') ||
      message.includes('429') ||
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504') ||
      message.includes('network') ||
      message.includes('timeout')
    );
  }
  return false;
}

// ============================================
// GOOGLE EMBEDDING FUNCTIONS
// ============================================

/**
 * Generate embedding using Google text-embedding-004
 */
async function embedWithGoogle(text: string): Promise<number[]> {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Text must be a non-empty string');
  }

  const ai = getGoogleClient();
  const model = ai.getGenerativeModel({ model: GOOGLE_MODEL });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await model.embedContent(text);
      const vector = result.embedding.values;

      if (!vector || vector.length !== GOOGLE_DIMENSIONS) {
        throw new Error(
          `Expected ${GOOGLE_DIMENSIONS}-dimensional vector, got ${vector?.length ?? 0}`
        );
      }

      return vector;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (isRetryableError(error) && attempt < MAX_RETRIES - 1) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
        console.warn(
          `[Embeddings] Google retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms:`,
          lastError.message
        );
        await sleep(delay);
        continue;
      }
      break;
    }
  }

  throw new Error(`Google embedding failed: ${lastError?.message}`);
}

/**
 * Generate embeddings for multiple texts using Google (batch)
 */
async function embedBatchWithGoogle(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];

  // Google doesn't have a true batch API, so we process individually
  // but in parallel with rate limiting
  const PARALLEL_LIMIT = 5;

  for (let i = 0; i < texts.length; i += PARALLEL_LIMIT) {
    const batch = texts.slice(i, i + PARALLEL_LIMIT);
    const promises = batch.map((text) => embedWithGoogle(text));

    try {
      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
    } catch {
      // Fall back to sequential if parallel fails
      for (const text of batch) {
        try {
          const embedding = await embedWithGoogle(text);
          results.push(embedding);
        } catch (individualError) {
          throw new Error(
            `Google embedding failed for text "${text.substring(0, 50)}...": ${
              individualError instanceof Error ? individualError.message : individualError
            }`
          );
        }
      }
    }

    // Rate limiting pause between parallel batches
    if (i + PARALLEL_LIMIT < texts.length) {
      await sleep(100);
    }
  }

  return results;
}

// ============================================
// OPENAI EMBEDDING FUNCTIONS
// ============================================

/**
 * Generate embedding using OpenAI text-embedding-3-small
 */
async function embedWithOpenAI(text: string): Promise<number[]> {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Text must be a non-empty string');
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: text,
          model: OPENAI_MODEL,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OpenAI API error ${response.status}: ${errorBody}`);
      }

      const data = await response.json();
      const embedding = data.data?.[0]?.embedding;

      if (!embedding || !Array.isArray(embedding)) {
        throw new Error('Invalid embedding response from OpenAI');
      }

      return embedding;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (isRetryableError(error) && attempt < MAX_RETRIES - 1) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
        console.warn(
          `[Embeddings] OpenAI retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms:`,
          lastError.message
        );
        await sleep(delay);
        continue;
      }
      break;
    }
  }

  throw new Error(`OpenAI embedding failed: ${lastError?.message}`);
}

/**
 * Generate embeddings for multiple texts using OpenAI (true batch API)
 */
async function embedBatchWithOpenAI(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  const results: number[][] = [];
  const BATCH_SIZE = Math.min(OPENAI_MAX_BATCH, 100); // Keep reasonable batch size

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: batch,
            model: OPENAI_MODEL,
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`OpenAI API error ${response.status}: ${errorBody}`);
        }

        const data = await response.json();

        if (!data.data || !Array.isArray(data.data)) {
          throw new Error('Invalid batch embedding response from OpenAI');
        }

        // Sort by index to ensure correct order
        const sorted = data.data.sort(
          (a: { index: number }, b: { index: number }) => a.index - b.index
        );
        const embeddings = sorted.map(
          (item: { embedding: number[] }) => item.embedding
        );

        results.push(...embeddings);
        break;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (isRetryableError(error) && attempt < MAX_RETRIES - 1) {
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
          console.warn(
            `[Embeddings] OpenAI batch retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms:`,
            lastError.message
          );
          await sleep(delay);
          continue;
        }

        throw new Error(`OpenAI batch embedding failed: ${lastError?.message}`);
      }
    }

    // Rate limiting pause between batches
    if (i + BATCH_SIZE < texts.length) {
      await sleep(200);
    }
  }

  return results;
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Generate embedding for a single text
 *
 * Uses the configured provider (Google or OpenAI)
 */
export async function embedText(text: string): Promise<number[]> {
  const provider = getEmbeddingProvider();

  if (provider === 'openai') {
    return embedWithOpenAI(text);
  }

  return embedWithGoogle(text);
}

/**
 * Generate embeddings for multiple texts (batch)
 *
 * Uses the configured provider (Google or OpenAI)
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (!Array.isArray(texts) || texts.length === 0) {
    throw new Error('Texts must be a non-empty array');
  }

  // Validate each text
  for (let i = 0; i < texts.length; i++) {
    if (!texts[i] || typeof texts[i] !== 'string' || texts[i].trim().length === 0) {
      throw new Error(`Text at index ${i} must be a non-empty string`);
    }
  }

  const provider = getEmbeddingProvider();

  if (provider === 'openai') {
    return embedBatchWithOpenAI(texts);
  }

  return embedBatchWithGoogle(texts);
}

/**
 * Chunk text for embedding if it exceeds token limits
 *
 * Rough estimation: 1 token ~= 4 characters
 * Most embedding models have 8192 token limit
 */
export function chunkTextForEmbedding(
  text: string,
  maxTokens: number = 500
): string[] {
  const maxChars = maxTokens * 4;

  if (text.length <= maxChars) {
    return [text];
  }

  const chunks: string[] = [];
  const words = text.split(/\s+/);
  let currentChunk = '';

  for (const word of words) {
    if ((currentChunk + ' ' + word).length > maxChars && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = word;
    } else {
      currentChunk = currentChunk ? currentChunk + ' ' + word : word;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Check if embedding service is properly configured
 */
export function isEmbeddingConfigured(): boolean {
  return !!(process.env.GOOGLE_GENAI_API_KEY || process.env.OPENAI_API_KEY);
}

/**
 * Get embedding dimensions for the current provider
 */
export function getEmbeddingDimensions(): number {
  const config = getEmbeddingConfig();
  return config.dimensions;
}
