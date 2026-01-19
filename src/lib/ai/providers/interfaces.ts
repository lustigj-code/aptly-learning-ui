/**
 * AI Provider Interfaces
 * Architecture: Provider Abstraction Pattern
 *
 * Build with interfaces so switching from FREE → PAID is just a config change
 */

export type AIMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type GenerateOptions = {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
};

export type GenerateResult = {
  content: string;
  tokensUsed: {
    prompt: number;
    completion: number;
  };
  model: string;
  provider: string;
  latencyMs: number;
  cached?: boolean;
};

export type EmbeddingResult = {
  embedding: number[];
  dimensions: number;
  model: string;
  provider: string;
};

/**
 * Core AI Provider Interface
 * All providers (free and paid) implement this
 */
export interface AIProvider {
  /**
   * Generate text completion
   */
  generate(messages: AIMessage[], options?: GenerateOptions): Promise<GenerateResult>;

  /**
   * Generate embedding vector
   */
  embed(text: string): Promise<EmbeddingResult>;

  /**
   * Check if provider is available (quota, API key, etc.)
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get current usage/quota info
   */
  getUsageInfo(): Promise<{
    requestsUsed: number;
    requestsRemaining: number;
    resetsAt?: Date;
  }>;

  /**
   * Provider metadata
   */
  getMetadata(): {
    name: string;
    tier: 'free' | 'paid';
    costPerRequest: number;
    maxRequestsPerMonth: number;
  };
}

/**
 * Vector DB Interface
 * ChromaDB (free) and Pinecone (paid) both implement this
 */
export interface VectorDB {
  /**
   * Add documents to collection
   */
  addDocuments(
    collection: string,
    documents: Array<{
      id: string;
      text: string;
      metadata?: Record<string, unknown>;
    }>
  ): Promise<void>;

  /**
   * Search for similar documents
   */
  search(
    collection: string,
    query: string,
    topK?: number,
    filter?: Record<string, unknown>
  ): Promise<
    Array<{
      id: string;
      text: string;
      score: number;
      metadata?: Record<string, unknown>;
    }>
  >;

  /**
   * Check if collection exists
   */
  collectionExists(collection: string): Promise<boolean>;

  /**
   * Get collection stats
   */
  getStats(collection: string): Promise<{
    documentCount: number;
    dimensions: number;
  }>;
}

/**
 * AI Orchestrator Interface
 * Manages multiple providers with fallback logic
 */
export interface AIOrchestrator {
  /**
   * Generate with automatic provider selection and fallback
   */
  generate(messages: AIMessage[], options?: GenerateOptions): Promise<GenerateResult>;

  /**
   * Generate with RAG (retrieval-augmented generation)
   */
  generateWithRAG(
    messages: AIMessage[],
    ragCollection: string,
    options?: GenerateOptions
  ): Promise<GenerateResult & { sources: string[] }>;

  /**
   * Get recommended provider based on current state
   */
  getRecommendedProvider(): Promise<string>;
}

/**
 * Training Data Format
 * Standard format for fine-tuning regardless of model provider
 */
export type TrainingExample = {
  messages: AIMessage[];
  metadata?: {
    concept: string;
    scenario: string;
    difficulty: string;
    quality_score?: number;
  };
};

/**
 * Configuration for switching providers
 */
export type AIConfig = {
  // Primary provider (FREE or PAID)
  primaryProvider: 'huggingface' | 'replicate' | 'gemini' | 'openai';

  // Fallback providers (in order of preference)
  fallbackProviders: string[];

  // Vector DB (FREE or PAID)
  vectorDB: 'chroma' | 'pinecone' | 'qdrant';

  // Feature flags
  features: {
    ragEnabled: boolean;
    multiModalEnabled: boolean;
    predictiveEnabled: boolean;
    cachingEnabled: boolean;
  };

  // Cost limits (safety)
  limits: {
    maxCostPerDay: number;
    maxRequestsPerUser: number;
  };
};

/**
 * Default FREE configuration
 */
export const FREE_AI_CONFIG: AIConfig = {
  primaryProvider: 'huggingface', // FREE tier: 1000 req/month
  fallbackProviders: ['gemini'], // FREE tier: 15 req/min
  vectorDB: 'chroma', // FREE: self-hosted
  features: {
    ragEnabled: true,
    multiModalEnabled: true, // GPT-4V has free tier
    predictiveEnabled: true,
    cachingEnabled: true,
  },
  limits: {
    maxCostPerDay: 0, // Must stay free
    maxRequestsPerUser: 20, // Reasonable limit
  },
};

/**
 * PAID configuration (upgrade path)
 * Just change environment variable to switch
 */
export const PAID_AI_CONFIG: AIConfig = {
  primaryProvider: 'replicate', // PAID: unlimited
  fallbackProviders: ['openai', 'anthropic'],
  vectorDB: 'pinecone', // PAID: managed
  features: {
    ragEnabled: true,
    multiModalEnabled: true,
    predictiveEnabled: true,
    cachingEnabled: true,
  },
  limits: {
    maxCostPerDay: 50,
    maxRequestsPerUser: 100,
  },
};

/**
 * Get configuration based on environment
 */
export function getAIConfig(): AIConfig {
  return process.env.AI_TIER === 'paid' ? PAID_AI_CONFIG : FREE_AI_CONFIG;
}
