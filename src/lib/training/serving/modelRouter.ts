/**
 * Model Router for Sage Tutor
 *
 * Intelligent routing between:
 * 1. Fine-tuned Sage model (Modal/vLLM)
 * 2. OpenAI GPT-4 (fallback)
 * 3. OpenAI GPT-3.5 (cost-effective fallback)
 *
 * Features:
 * - Automatic failover
 * - A/B testing support
 * - Latency-based routing
 * - Cost optimization
 */

// Simple hash function for consistent variant assignment
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Simple variant assignment for A/B testing
function assignModelVariant(
  userId: string,
  testId: string,
  variants: Array<{ id: string; weight: number }>,
): { id: string } {
  const hash = simpleHash(userId + testId);
  const normalized = (hash % 1000) / 1000;

  let cumulative = 0;
  for (const variant of variants) {
    cumulative += variant.weight;
    if (normalized < cumulative) {
      return { id: variant.id };
    }
  }

  return { id: variants[variants.length - 1].id };
}

// ============================================
// TYPES
// ============================================

export type ModelProvider = 'sage' | 'openai-gpt4' | 'openai-gpt35';

export type ModelConfig = {
  provider: ModelProvider;
  endpoint: string;
  apiKey?: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
  costPer1kTokens: number;
};

export type RouterConfig = {
  // Primary model (fine-tuned Sage)
  primary: ModelConfig;

  // Fallback models in priority order
  fallbacks: ModelConfig[];

  // A/B testing configuration
  abTest?: {
    enabled: boolean;
    testId: string;
    variants: {
      id: string;
      weight: number;
      config: ModelConfig;
    }[];
  };

  // Routing settings
  maxRetries: number;
  retryDelayMs: number;
  healthCheckIntervalMs: number;

  // Circuit breaker
  circuitBreaker: {
    enabled: boolean;
    failureThreshold: number;
    resetTimeMs: number;
  };
};

export type GenerateRequest = {
  messages: Array<{ role: string; content: string }>;
  maxTokens?: number;
  temperature?: number;
  userId?: string;
  sessionId?: string;
};

export type GenerateResponse = {
  content: string;
  model: ModelProvider;
  variant?: string;
  latencyMs: number;
  tokensUsed: {
    prompt: number;
    completion: number;
  };
  estimatedCost: number;
};

export type HealthStatus = {
  provider: ModelProvider;
  healthy: boolean;
  latencyMs?: number;
  lastChecked: Date;
  consecutiveFailures: number;
};

// ============================================
// DEFAULT CONFIGURATION
// ============================================

const SAGE_ENDPOINT = process.env.SAGE_MODEL_ENDPOINT || 'https://your-username--sage-tutor-serve-generate.modal.run';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

export const DEFAULT_ROUTER_CONFIG: RouterConfig = {
  primary: {
    provider: 'sage',
    endpoint: SAGE_ENDPOINT,
    maxTokens: 512,
    temperature: 0.7,
    timeout: 30000,
    costPer1kTokens: 0.0001, // Very cheap (self-hosted)
  },

  fallbacks: [
    {
      provider: 'openai-gpt4',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      apiKey: OPENAI_API_KEY,
      maxTokens: 512,
      temperature: 0.7,
      timeout: 60000,
      costPer1kTokens: 0.03,
    },
    {
      provider: 'openai-gpt35',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      apiKey: OPENAI_API_KEY,
      maxTokens: 512,
      temperature: 0.7,
      timeout: 30000,
      costPer1kTokens: 0.002,
    },
  ],

  maxRetries: 2,
  retryDelayMs: 1000,
  healthCheckIntervalMs: 60000,

  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    resetTimeMs: 300000, // 5 minutes
  },
};

// ============================================
// SAGE MODEL CLIENT
// ============================================

async function callSageModel(
  config: ModelConfig,
  request: GenerateRequest,
): Promise<GenerateResponse> {
  const startTime = Date.now();

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: request.messages,
      max_tokens: request.maxTokens || config.maxTokens,
      temperature: request.temperature || config.temperature,
    }),
    signal: AbortSignal.timeout(config.timeout),
  });

  if (!response.ok) {
    throw new Error(`Sage model error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const latencyMs = Date.now() - startTime;

  const tokensUsed = {
    prompt: data.usage?.prompt_tokens || 0,
    completion: data.usage?.completion_tokens || 0,
  };

  return {
    content: data.content,
    model: 'sage',
    latencyMs,
    tokensUsed,
    estimatedCost: ((tokensUsed.prompt + tokensUsed.completion) / 1000) * config.costPer1kTokens,
  };
}

// ============================================
// OPENAI CLIENT
// ============================================

const SAGE_SYSTEM_PROMPT = `You are Sage, a warm and insightful AI tutor created by Aptly Learning. Your teaching philosophy centers on the Socratic method - guiding students to discover knowledge through thoughtful questions rather than direct answers.

Core Teaching Principles:
1. NEVER give direct answers immediately - always start with a guiding question
2. Break complex problems into smaller, manageable pieces
3. Celebrate small wins and correct steps
4. When students struggle, provide increasingly specific hints
5. Connect new concepts to what students already know
6. Use analogies and real-world examples
7. Encourage metacognition - help students understand HOW they learn

Your Personality:
- Warm, patient, and encouraging
- Genuinely curious about the student's thought process
- Uses light humor when appropriate
- Speaks naturally, not formally
- Celebrates effort, not just correct answers`;

async function callOpenAI(
  config: ModelConfig,
  request: GenerateRequest,
): Promise<GenerateResponse> {
  const startTime = Date.now();

  const model = config.provider === 'openai-gpt4' ? 'gpt-4-turbo' : 'gpt-3.5-turbo';

  // Add system prompt for OpenAI (not needed for fine-tuned Sage)
  const messages = [
    { role: 'system', content: SAGE_SYSTEM_PROMPT },
    ...request.messages,
  ];

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: request.maxTokens || config.maxTokens,
      temperature: request.temperature || config.temperature,
    }),
    signal: AbortSignal.timeout(config.timeout),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI error: ${response.status} ${error}`);
  }

  const data = await response.json();
  const latencyMs = Date.now() - startTime;

  const tokensUsed = {
    prompt: data.usage?.prompt_tokens || 0,
    completion: data.usage?.completion_tokens || 0,
  };

  return {
    content: data.choices[0].message.content,
    model: config.provider,
    latencyMs,
    tokensUsed,
    estimatedCost: ((tokensUsed.prompt + tokensUsed.completion) / 1000) * config.costPer1kTokens,
  };
}

// ============================================
// MODEL ROUTER
// ============================================

export class ModelRouter {
  private config: RouterConfig;
  private healthStatus: Map<ModelProvider, HealthStatus> = new Map();
  private circuitBreakerOpen: Map<ModelProvider, boolean> = new Map();
  private circuitBreakerResetTime: Map<ModelProvider, Date> = new Map();

  constructor(config: RouterConfig = DEFAULT_ROUTER_CONFIG) {
    this.config = config;
    this.initializeHealthStatus();
  }

  private initializeHealthStatus(): void {
    const allConfigs = [this.config.primary, ...this.config.fallbacks];
    for (const config of allConfigs) {
      this.healthStatus.set(config.provider, {
        provider: config.provider,
        healthy: true,
        lastChecked: new Date(),
        consecutiveFailures: 0,
      });
      this.circuitBreakerOpen.set(config.provider, false);
    }
  }

  /**
   * Generate a response using the best available model.
   */
  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    // Check for A/B test
    if (this.config.abTest?.enabled && request.userId) {
      return this.generateWithABTest(request);
    }

    // Try primary model first
    const primaryResult = await this.tryModel(this.config.primary, request);
    if (primaryResult) {
      return primaryResult;
    }

    // Try fallbacks
    for (const fallback of this.config.fallbacks) {
      const fallbackResult = await this.tryModel(fallback, request);
      if (fallbackResult) {
        console.warn(`[ModelRouter] Using fallback: ${fallback.provider}`);
        return fallbackResult;
      }
    }

    throw new Error('All models failed. Unable to generate response.');
  }

  /**
   * Generate with A/B testing.
   */
  private async generateWithABTest(request: GenerateRequest): Promise<GenerateResponse> {
    const { abTest } = this.config;
    if (!abTest || !request.userId) {
      return this.generate({ ...request, userId: undefined });
    }

    // Assign variant based on user ID
    const variant = assignModelVariant(
      request.userId,
      abTest.testId,
      abTest.variants.map(v => ({ id: v.id, weight: v.weight })),
    );

    // Find variant config
    const variantConfig = abTest.variants.find(v => v.id === variant.id);
    if (!variantConfig) {
      // Fall back to primary
      return this.generate({ ...request, userId: undefined });
    }

    // Try variant model
    const result = await this.tryModel(variantConfig.config, request);
    if (result) {
      return { ...result, variant: variant.id };
    }

    // Fall back to primary if variant fails
    console.warn(`[ModelRouter] A/B variant ${variant.id} failed, using primary`);
    const primaryResult = await this.generate({ ...request, userId: undefined });
    return { ...primaryResult, variant: 'fallback' };
  }

  /**
   * Try to call a specific model with retries.
   */
  private async tryModel(
    config: ModelConfig,
    request: GenerateRequest,
  ): Promise<GenerateResponse | null> {
    // Check circuit breaker
    if (this.isCircuitOpen(config.provider)) {
      console.log(`[ModelRouter] Circuit breaker open for ${config.provider}`);
      return null;
    }

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const result = await this.callModel(config, request);

        // Success - reset failure count
        this.recordSuccess(config.provider);

        return result;
      } catch (error) {
        console.error(`[ModelRouter] ${config.provider} attempt ${attempt + 1} failed:`, error);

        // Record failure
        this.recordFailure(config.provider);

        // Wait before retry
        if (attempt < this.config.maxRetries) {
          await this.delay(this.config.retryDelayMs * (attempt + 1));
        }
      }
    }

    return null;
  }

  /**
   * Call the appropriate model based on provider.
   */
  private async callModel(
    config: ModelConfig,
    request: GenerateRequest,
  ): Promise<GenerateResponse> {
    switch (config.provider) {
      case 'sage':
        return callSageModel(config, request);
      case 'openai-gpt4':
      case 'openai-gpt35':
        return callOpenAI(config, request);
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  }

  /**
   * Check if circuit breaker is open for a provider.
   */
  private isCircuitOpen(provider: ModelProvider): boolean {
    if (!this.config.circuitBreaker.enabled) {
      return false;
    }

    const isOpen = this.circuitBreakerOpen.get(provider) || false;
    if (!isOpen) {
      return false;
    }

    // Check if it's time to reset
    const resetTime = this.circuitBreakerResetTime.get(provider);
    if (resetTime && new Date() > resetTime) {
      this.circuitBreakerOpen.set(provider, false);
      console.log(`[ModelRouter] Circuit breaker reset for ${provider}`);
      return false;
    }

    return true;
  }

  /**
   * Record a successful call.
   */
  private recordSuccess(provider: ModelProvider): void {
    const status = this.healthStatus.get(provider);
    if (status) {
      status.healthy = true;
      status.consecutiveFailures = 0;
      status.lastChecked = new Date();
    }
  }

  /**
   * Record a failed call.
   */
  private recordFailure(provider: ModelProvider): void {
    const status = this.healthStatus.get(provider);
    if (status) {
      status.consecutiveFailures++;
      status.lastChecked = new Date();

      // Check if we should open circuit breaker
      if (
        this.config.circuitBreaker.enabled &&
        status.consecutiveFailures >= this.config.circuitBreaker.failureThreshold
      ) {
        this.circuitBreakerOpen.set(provider, true);
        this.circuitBreakerResetTime.set(
          provider,
          new Date(Date.now() + this.config.circuitBreaker.resetTimeMs)
        );
        status.healthy = false;
        console.warn(`[ModelRouter] Circuit breaker opened for ${provider}`);
      }
    }
  }

  /**
   * Get health status for all providers.
   */
  getHealthStatus(): HealthStatus[] {
    return Array.from(this.healthStatus.values());
  }

  /**
   * Run health checks on all providers.
   */
  async runHealthChecks(): Promise<HealthStatus[]> {
    const results: HealthStatus[] = [];

    const allConfigs = [this.config.primary, ...this.config.fallbacks];

    for (const config of allConfigs) {
      try {
        const startTime = Date.now();

        // Simple health check request
        await this.callModel(config, {
          messages: [{ role: 'user', content: 'Hello' }],
          maxTokens: 10,
        });

        const latencyMs = Date.now() - startTime;

        const status: HealthStatus = {
          provider: config.provider,
          healthy: true,
          latencyMs,
          lastChecked: new Date(),
          consecutiveFailures: 0,
        };

        this.healthStatus.set(config.provider, status);
        results.push(status);
      } catch {
        const status: HealthStatus = {
          provider: config.provider,
          healthy: false,
          lastChecked: new Date(),
          consecutiveFailures: (this.healthStatus.get(config.provider)?.consecutiveFailures || 0) + 1,
        };

        this.healthStatus.set(config.provider, status);
        results.push(status);
      }
    }

    return results;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let routerInstance: ModelRouter | null = null;

export function getModelRouter(): ModelRouter {
  if (!routerInstance) {
    routerInstance = new ModelRouter();
  }
  return routerInstance;
}

export function resetModelRouter(): void {
  routerInstance = null;
}
