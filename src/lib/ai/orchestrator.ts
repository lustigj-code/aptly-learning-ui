/**
 * AI Orchestrator - Smart Provider Management with Fallback
 * Phase 3: Intelligent routing between FREE providers
 *
 * Strategy:
 * 1. Try HuggingFace fine-tuned Sage (1000 req/month FREE)
 * 2. Fall back to Gemini + RAG (15 req/min FREE)
 * 3. Always provide best available response
 *
 * Upgrade: Add paid provider as primary, keep free as fallback
 */

import type { AIMessage, GenerateOptions, GenerateResult, AIOrchestrator } from './providers/interfaces';
import { HuggingFaceProvider } from './providers/huggingface';
import { ChromaDBVectorStore } from './vectordb/chroma';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { LRUCache } from '@/lib/cache/LRUCache';

// ============================================
// RESPONSE CACHE CONFIGURATION
// ============================================

interface CachedResponse {
  result: GenerateResult;
  cachedAt: number;
}

// Cache for AI responses - reduces redundant API calls
// TTL: 5 minutes, Max: 100 entries
const responseCache = new LRUCache<string, CachedResponse>({
  maxSize: 100,
  ttlMs: 5 * 60 * 1000, // 5 minutes
  cleanupIntervalMs: 60 * 1000, // Cleanup every minute
});

/**
 * Generate cache key from messages
 * Includes system context and conversation to ensure context-aware caching
 */
function generateCacheKey(messages: AIMessage[]): string {
  // Create a hash of the messages for caching
  const relevantContent = messages.map(m => `${m.role}:${m.content.slice(0, 200)}`).join('|');
  // Simple hash function for cache key
  let hash = 0;
  for (let i = 0; i < relevantContent.length; i++) {
    const char = relevantContent.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `sage_${Math.abs(hash).toString(36)}`;
}

export class SageAIOrchestrator implements AIOrchestrator {
  private huggingFace: HuggingFaceProvider;
  private gemini: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;
  private vectorDB: ChromaDBVectorStore;
  private requestLog: Map<string, number> = new Map();

  constructor() {
    this.huggingFace = new HuggingFaceProvider();
    this.vectorDB = new ChromaDBVectorStore();

    // Gemini fallback
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);
      this.gemini = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    }
  }

  /**
   * Generate with automatic provider selection, caching, and fallback
   */
  async generate(messages: AIMessage[], options?: GenerateOptions): Promise<GenerateResult> {
    const startTime = Date.now();

    // Check cache first (only for non-streaming requests)
    if (!options?.stream) {
      const cacheKey = generateCacheKey(messages);
      const cached = responseCache.get(cacheKey);
      if (cached) {
        console.log('💾 Using cached Sage response');
        this.logRequest('cache');
        return {
          ...cached.result,
          latencyMs: Date.now() - startTime,
        };
      }
    }

    let result: GenerateResult;

    // Strategy 1: Try fine-tuned HuggingFace model first (FREE tier: 1000/month)
    try {
      const hfAvailable = await this.huggingFace.isAvailable();

      if (hfAvailable) {
        console.log('🎯 Using fine-tuned Sage (HuggingFace)');
        result = await this.huggingFace.generate(messages, options);
        this.logRequest('huggingface');
      } else {
        console.log('⚠️  HuggingFace quota exhausted, falling back to Gemini');
        console.log('🎯 Using Gemini fallback');
        result = await this.generateWithGemini(messages, options);
        this.logRequest('gemini');
      }
    } catch (error) {
      console.log(`⚠️  HuggingFace failed: ${error}, falling back to Gemini`);
      console.log('🎯 Using Gemini fallback');
      result = await this.generateWithGemini(messages, options);
      this.logRequest('gemini');
    }

    // Cache the response (only for non-streaming, successful responses)
    if (!options?.stream && result.content) {
      const cacheKey = generateCacheKey(messages);
      responseCache.set(cacheKey, { result, cachedAt: Date.now() });
    }

    return {
      ...result,
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * Generate with RAG (retrieval-augmented generation)
   */
  async generateWithRAG(
    messages: AIMessage[],
    ragCollection: string = 'meta_blueprint',
    options?: GenerateOptions
  ): Promise<GenerateResult & { sources: string[] }> {
    const startTime = Date.now();

    // Extract user's last message for retrieval
    const userMessage = messages.filter((m) => m.role === 'user').pop();

    if (!userMessage) {
      throw new Error('No user message found for RAG retrieval');
    }

    // Retrieve relevant knowledge
    const retrievedChunks = await this.vectorDB.search(ragCollection, userMessage.content, 5);

    console.log(`📚 Retrieved ${retrievedChunks.length} relevant chunks`);

    // Inject retrieved knowledge into system message
    const ragContext = retrievedChunks.map((chunk) => chunk.text).join('\n\n');

    const enhancedMessages = [...messages];
    const systemMessage = enhancedMessages.find((m) => m.role === 'system');

    if (systemMessage) {
      systemMessage.content += `\n\nDomain Knowledge:\n${ragContext}`;
    } else {
      enhancedMessages.unshift({
        role: 'system',
        content: `Domain Knowledge:\n${ragContext}`,
      });
    }

    // Generate with enhanced context
    const result = await this.generate(enhancedMessages, options);

    return {
      ...result,
      sources: retrievedChunks.map((c) => c.id),
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * Get recommended provider based on current quota/state
   */
  async getRecommendedProvider(): Promise<string> {
    const hfAvailable = await this.huggingFace.isAvailable();

    if (hfAvailable) {
      const usage = await this.huggingFace.getUsageInfo();
      return `huggingface (${usage.requestsRemaining} requests remaining this month)`;
    }

    return 'gemini (fallback - unlimited in free tier with rate limits)';
  }

  /**
   * Generate with Gemini (fallback)
   */
  private async generateWithGemini(
    messages: AIMessage[],
    _options?: GenerateOptions
  ): Promise<GenerateResult> {
    if (!this.gemini) {
      throw new Error('Gemini not configured - set GOOGLE_GENAI_API_KEY');
    }

    // Format messages for Gemini
    const prompt = messages.map((m) => `${m.role}: ${m.content}`).join('\n\n');

    const result = await this.gemini.generateContent(prompt);
    const response = result.response.text();

    // Estimate tokens
    const promptTokens = Math.ceil(prompt.length / 4);
    const completionTokens = Math.ceil(response.length / 4);

    return {
      content: response,
      tokensUsed: {
        prompt: promptTokens,
        completion: completionTokens,
      },
      model: 'gemini-2.0-flash-exp',
      provider: 'gemini',
      latencyMs: 0, // Will be set by caller
    };
  }

  /**
   * Log request for usage tracking
   */
  private logRequest(provider: string) {
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM
    const key = `${provider}-${month}`;

    const current = this.requestLog.get(key) || 0;
    this.requestLog.set(key, current + 1);

    // In production, store in database/Redis
    console.log(`📊 ${provider} requests this month: ${current + 1}`);
  }

  /**
   * Get usage statistics including cache performance
   */
  async getUsageStats() {
    const month = new Date().toISOString().slice(0, 7);
    const cacheStats = responseCache.getStats();

    return {
      huggingface: this.requestLog.get(`huggingface-${month}`) || 0,
      gemini: this.requestLog.get(`gemini-${month}`) || 0,
      cache: {
        hits: this.requestLog.get(`cache-${month}`) || 0,
        size: cacheStats.size,
        maxSize: cacheStats.maxSize,
      },
      month,
    };
  }

  /**
   * Clear the response cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    responseCache.clear();
    console.log('🗑️ Sage response cache cleared');
  }
}

/**
 * Singleton instance
 */
let orchestratorInstance: SageAIOrchestrator | null = null;

export function getAIOrchestrator(): SageAIOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new SageAIOrchestrator();
  }
  return orchestratorInstance;
}

/**
 * UPGRADE PATH EXAMPLE
 *
 * To switch to paid Pinecone + Replicate:
 *
 * 1. Add env vars:
 *    AI_PROVIDER=replicate
 *    PINECONE_API_KEY=xxx
 *    REPLICATE_API_TOKEN=xxx
 *
 * 2. Change constructor:
 *    this.vectorDB = process.env.AI_TIER === 'paid'
 *      ? new PineconeVectorStore()
 *      : new ChromaDBVectorStore()
 *
 *    this.primary = process.env.AI_TIER === 'paid'
 *      ? new ReplicateProvider()
 *      : new HuggingFaceProvider()
 *
 * 3. Everything else works identically (same interface)
 */
