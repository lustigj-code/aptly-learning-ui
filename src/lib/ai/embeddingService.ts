/**
 * Embedding Service
 * Uses Google's text-embedding-004 model for generating embeddings
 *
 * Part of Phase 02: RAG Knowledge Base
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// ============================================
// TYPES
// ============================================

export type Embedding = {
  text: string;
  vector: number[];
  metadata?: Record<string, string>;
};

// ============================================
// CONFIGURATION
// ============================================

const EMBEDDING_MODEL = 'text-embedding-004';
const EMBEDDING_DIMENSIONS = 768; // text-embedding-004 produces 768-dimensional vectors
const MAX_BATCH_SIZE = 100; // Google's API limit
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Initialize Gemini client (lazy initialization)
let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_GENAI_API_KEY environment variable is not set');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
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
 * Check if an error is retryable (transient)
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    // Retry on rate limits, server errors, or network issues
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
// MAIN FUNCTIONS
// ============================================

/**
 * Generate an embedding for a single text string
 *
 * @param text - The text to embed (non-empty string)
 * @returns Promise resolving to a 768-dimensional vector
 * @throws Error if text is empty or API call fails
 */
export async function embedText(text: string): Promise<number[]> {
  // Validate input
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Text must be a non-empty string');
  }

  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: EMBEDDING_MODEL });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await model.embedContent(text);
      const vector = result.embedding.values;

      // Validate response
      if (!vector || vector.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(
          `Expected ${EMBEDDING_DIMENSIONS}-dimensional vector, got ${vector?.length ?? 0}`
        );
      }

      return vector;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Only retry on transient errors
      if (isRetryableError(error) && attempt < MAX_RETRIES - 1) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt); // Exponential backoff
        console.warn(
          `[EmbeddingService] Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms:`,
          lastError.message
        );
        await sleep(delay);
        continue;
      }

      // Non-retryable error or max retries reached
      break;
    }
  }

  throw new Error(`Failed to generate embedding: ${lastError?.message}`);
}

/**
 * Generate embeddings for multiple texts in batch
 * Handles rate limiting by processing in chunks of MAX_BATCH_SIZE
 *
 * @param texts - Array of texts to embed
 * @returns Promise resolving to array of 768-dimensional vectors
 * @throws Error if any text is empty or batch processing fails
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  // Validate input
  if (!Array.isArray(texts) || texts.length === 0) {
    throw new Error('Texts must be a non-empty array');
  }

  // Validate each text
  for (let i = 0; i < texts.length; i++) {
    if (!texts[i] || typeof texts[i] !== 'string' || texts[i].trim().length === 0) {
      throw new Error(`Text at index ${i} must be a non-empty string`);
    }
  }

  const results: number[][] = [];

  // Process in batches to respect API limits
  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    const batch = texts.slice(i, i + MAX_BATCH_SIZE);

    // Process batch items in parallel
    const batchPromises = batch.map((text) => embedText(text));

    try {
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    } catch (error) {
      // If batch processing fails, try one at a time with error info
      console.warn(
        `[EmbeddingService] Batch processing failed, trying individually:`,
        error instanceof Error ? error.message : error
      );

      for (const text of batch) {
        try {
          const vector = await embedText(text);
          results.push(vector);
        } catch (individualError) {
          throw new Error(
            `Failed to embed text "${text.substring(0, 50)}...": ${
              individualError instanceof Error ? individualError.message : individualError
            }`
          );
        }
      }
    }
  }

  return results;
}

/**
 * Create an Embedding object with text, vector, and optional metadata
 * Convenience function for building embeddings to store
 *
 * @param text - The original text
 * @param metadata - Optional metadata to associate with the embedding
 * @returns Promise resolving to an Embedding object
 */
export async function createEmbedding(
  text: string,
  metadata?: Record<string, string>
): Promise<Embedding> {
  const vector = await embedText(text);
  return {
    text,
    vector,
    metadata,
  };
}

/**
 * Get the embedding model configuration
 * Useful for debugging and documentation
 */
export function getEmbeddingConfig(): {
  model: string;
  dimensions: number;
  maxBatchSize: number;
} {
  return {
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    maxBatchSize: MAX_BATCH_SIZE,
  };
}
