/**
 * HuggingFace Provider - FREE Implementation
 * Phase 3: Serving Strategy
 *
 * Uses HuggingFace Inference API (FREE tier: 1000 requests/month)
 * Upgrade Path: Switch to Replicate with single env var change
 */

import type {
  AIProvider,
  AIMessage,
  GenerateOptions,
  GenerateResult,
  EmbeddingResult,
} from './interfaces';

export class HuggingFaceProvider implements AIProvider {
  private apiKey: string;
  private modelId: string;
  private embeddingModelId: string = 'sentence-transformers/all-MiniLM-L6-v2';
  private requestCount: number = 0;
  private readonly FREE_TIER_LIMIT = 1000; // requests per month

  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY || '';
    this.modelId = process.env.HUGGINGFACE_MODEL_ID || 'meta-llama/Meta-Llama-3.1-8B-Instruct';

    if (!this.apiKey) {
      console.warn('⚠️  HUGGINGFACE_API_KEY not set. Get free key at https://huggingface.co/settings/tokens');
    }
  }

  async generate(messages: AIMessage[], options?: GenerateOptions): Promise<GenerateResult> {
    const startTime = Date.now();

    // Check quota
    if (this.requestCount >= this.FREE_TIER_LIMIT) {
      throw new Error('HuggingFace free tier limit reached (1000/month)');
    }

    // Format messages for HuggingFace
    const prompt = this.formatMessagesForHF(messages);

    try {
      const response = await fetch(
        `https://router.huggingface.co/models/${this.modelId}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              max_new_tokens: options?.maxTokens || 512,
              temperature: options?.temperature || 0.7,
              top_p: options?.topP || 0.95,
              return_full_text: false,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HuggingFace API error: ${error}`);
      }

      const data = await response.json();

      // HF returns array of generated texts
      const generated = Array.isArray(data) ? data[0]?.generated_text : data.generated_text;

      this.requestCount++;

      return {
        content: generated || '',
        tokensUsed: {
          prompt: this.estimateTokens(prompt),
          completion: this.estimateTokens(generated),
        },
        model: this.modelId,
        provider: 'huggingface',
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      throw new Error(`HuggingFace generation failed: ${error}`);
    }
  }

  async embed(text: string): Promise<EmbeddingResult> {
    try {
      const response = await fetch(
        `https://router.huggingface.co/models/${this.embeddingModelId}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ inputs: text }),
        }
      );

      if (!response.ok) {
        throw new Error(`HF embedding failed: ${await response.text()}`);
      }

      const embedding = await response.json();

      return {
        embedding: Array.isArray(embedding) ? embedding : embedding.embeddings || [],
        dimensions: 384, // all-MiniLM-L6-v2 produces 384-dim embeddings
        model: this.embeddingModelId,
        provider: 'huggingface',
      };
    } catch (error) {
      throw new Error(`Embedding failed: ${error}`);
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;

    // Check if quota remaining
    const usage = await this.getUsageInfo();
    return usage.requestsRemaining > 0;
  }

  async getUsageInfo() {
    // In production, track in database
    // For now, use in-memory counter
    return {
      requestsUsed: this.requestCount,
      requestsRemaining: this.FREE_TIER_LIMIT - this.requestCount,
      resetsAt: this.getMonthEnd(),
    };
  }

  getMetadata() {
    return {
      name: 'HuggingFace Inference API',
      tier: 'free' as const,
      costPerRequest: 0,
      maxRequestsPerMonth: this.FREE_TIER_LIMIT,
    };
  }

  /**
   * Format messages for HuggingFace chat format
   */
  private formatMessagesForHF(messages: AIMessage[]): string {
    return messages
      .map((msg) => {
        if (msg.role === 'system') {
          return `System: ${msg.content}`;
        }
        if (msg.role === 'user') {
          return `User: ${msg.content}`;
        }
        return `Assistant: ${msg.content}`;
      })
      .join('\n\n');
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil((text?.length || 0) / 4);
  }

  /**
   * Get end of current month
   */
  private getMonthEnd(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  }
}

/**
 * UPGRADE HELPER
 * Drop-in replacement for paid tier
 */
export class ReplicateProvider implements AIProvider {
  // Same interface, different implementation
  // Just change env var: AI_PROVIDER=replicate

  async generate(messages: AIMessage[], options?: GenerateOptions): Promise<GenerateResult> {
    // TODO: Implement when upgrading to paid
    // Uses Replicate's API for unlimited requests
    throw new Error('Replicate provider not yet implemented - set AI_PROVIDER=huggingface');
  }

  async embed(text: string): Promise<EmbeddingResult> {
    throw new Error('Not implemented');
  }

  async isAvailable(): Promise<boolean> {
    return !!process.env.REPLICATE_API_TOKEN;
  }

  async getUsageInfo() {
    return {
      requestsUsed: 0,
      requestsRemaining: Infinity, // Paid tier = unlimited
    };
  }

  getMetadata() {
    return {
      name: 'Replicate',
      tier: 'paid' as const,
      costPerRequest: 0.0002, // Approximate
      maxRequestsPerMonth: Infinity,
    };
  }
}
