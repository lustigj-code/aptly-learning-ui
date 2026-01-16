/**
 * Model Router for Sage Tutor
 *
 * Intelligent routing between:
 * 1. Fine-tuned Sage model (Modal/vLLM) - Primary
 * 2. Google Gemini (fallback)
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

export type ModelProvider = 'sage' | 'gemini' | 'gemini-tuned' | 'openai-gpt4' | 'openai-gpt35';

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

// Modal endpoint for fine-tuned Sage model (optional)
const SAGE_ENDPOINT = process.env.SAGE_MODEL_ENDPOINT || '';
const GOOGLE_GENAI_API_KEY = process.env.GOOGLE_GENAI_API_KEY || '';

// Tuned Gemini model configuration
const USE_TUNED_GEMINI = process.env.USE_TUNED_GEMINI === 'true';
const TUNED_GEMINI_ENDPOINT = process.env.GEMINI_TUNED_MODEL || 'projects/961528290184/locations/us-central1/models/6672424796065628160';

// Build primary config - prefer tuned Gemini when enabled, then Modal Sage, then base Gemini
const buildPrimaryConfig = (): ModelConfig => {
  // If tuned Gemini is enabled, use it as primary
  if (USE_TUNED_GEMINI) {
    console.log('[ModelRouter] Primary: Tuned Gemini (sage-tutor-v3)');
    return {
      provider: 'gemini-tuned',
      endpoint: TUNED_GEMINI_ENDPOINT,
      apiKey: GOOGLE_GENAI_API_KEY,
      maxTokens: 512,
      temperature: 0.7,
      timeout: 60000,
      costPer1kTokens: 0.0001,
    };
  }

  // If Modal Sage endpoint is configured, use it as primary
  if (SAGE_ENDPOINT) {
    console.log('[ModelRouter] Primary: Modal Sage');
    return {
      provider: 'sage',
      endpoint: SAGE_ENDPOINT,
      maxTokens: 512,
      temperature: 0.7,
      timeout: 90000,
      costPer1kTokens: 0.0001,
    };
  }

  // Default to base Gemini
  console.log('[ModelRouter] Primary: Base Gemini (gemini-2.0-flash-exp)');
  return {
    provider: 'gemini',
    endpoint: 'gemini-2.0-flash-exp',
    apiKey: GOOGLE_GENAI_API_KEY,
    maxTokens: 512,
    temperature: 0.7,
    timeout: 60000,
    costPer1kTokens: 0.000075,
  };
};

// Build fallbacks array
const buildFallbacks = (): ModelConfig[] => {
  const fallbacks: ModelConfig[] = [];

  // Always add base Gemini as a fallback when tuned Gemini is primary
  // This ensures we have a backup even when tuned model authentication fails
  if (USE_TUNED_GEMINI) {
    console.log('[ModelRouter] Adding base Gemini as fallback');
    fallbacks.push({
      provider: 'gemini',
      endpoint: 'gemini-2.0-flash-exp',
      apiKey: GOOGLE_GENAI_API_KEY,
      maxTokens: 512,
      temperature: 0.7,
      timeout: 60000,
      costPer1kTokens: 0.000075,
    });
  }

  return fallbacks;
};

export const DEFAULT_ROUTER_CONFIG: RouterConfig = {
  primary: buildPrimaryConfig(),

  fallbacks: buildFallbacks(),

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
// SAGE MODEL CLIENT (Modal)
// ============================================

async function callSageModel(
  config: ModelConfig,
  request: GenerateRequest,
): Promise<GenerateResponse> {
  const startTime = Date.now();

  console.log('[ModelRouter] Calling Sage model:', {
    endpoint: config.endpoint,
    messageCount: request.messages.length,
    timeout: config.timeout,
  });

  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: request.messages.map(m => ({ role: m.role, content: m.content })),
        max_tokens: request.maxTokens || config.maxTokens,
        temperature: request.temperature || config.temperature,
      }),
      signal: AbortSignal.timeout(config.timeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ModelRouter] Sage model HTTP error:', response.status, errorText);
      throw new Error(`Sage model error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const latencyMs = Date.now() - startTime;

    console.log('[ModelRouter] Sage model success:', {
      latencyMs,
      contentLength: data.content?.length || 0,
    });

    const tokensUsed = {
      prompt: data.usage?.prompt_tokens || 0,
      completion: data.usage?.completion_tokens || 0,
    };

    return {
      content: data.content || '',
      model: 'sage',
      latencyMs,
      tokensUsed,
      estimatedCost: ((tokensUsed.prompt + tokensUsed.completion) / 1000) * config.costPer1kTokens,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[ModelRouter] Sage model failed:', {
      error: errorMsg,
      latencyMs: Date.now() - startTime,
    });
    throw error;
  }
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
// GEMINI CLIENT
// ============================================

async function callGemini(
  config: ModelConfig,
  request: GenerateRequest,
): Promise<GenerateResponse> {
  const startTime = Date.now();

  console.log('[ModelRouter] Calling Gemini model:', {
    model: config.endpoint,
    messageCount: request.messages.length,
  });

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(config.apiKey || '');
    const model = genAI.getGenerativeModel({ model: config.endpoint });

    // Build the conversation with system prompt
    // Gemini uses a different format - system goes first as user message
    const contents = [];

    // Add system prompt as first exchange
    contents.push({
      role: 'user',
      parts: [{ text: SAGE_SYSTEM_PROMPT + '\n\nPlease respond as Sage from now on.' }],
    });
    contents.push({
      role: 'model',
      parts: [{ text: 'I understand. I am Sage, your AI tutor. I will guide you using the Socratic method. How can I help you today?' }],
    });

    // Add conversation history
    for (const msg of request.messages) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }

    const result = await model.generateContent({
      contents,
      generationConfig: {
        maxOutputTokens: request.maxTokens || config.maxTokens,
        temperature: request.temperature || config.temperature,
      },
    });

    const response = result.response;
    const latencyMs = Date.now() - startTime;

    console.log('[ModelRouter] Gemini model success:', {
      latencyMs,
      contentLength: response.text()?.length || 0,
    });

    return {
      content: response.text(),
      model: 'gemini',
      latencyMs,
      tokensUsed: { prompt: 0, completion: 0 }, // Gemini doesn't return token counts easily
      estimatedCost: 0,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[ModelRouter] Gemini model failed:', {
      error: errorMsg,
      latencyMs: Date.now() - startTime,
    });
    throw error;
  }
}

// ============================================
// TUNED GEMINI CLIENT (Vertex AI)
// ============================================

// Tuned model from Vertex AI (sage-tutor-v3)
const TUNED_MODEL_NAME = process.env.GEMINI_TUNED_MODEL || 'projects/961528290184/locations/us-central1/models/6672424796065628160';
const VERTEX_AI_LOCATION = 'us-central1';

async function callGeminiTuned(
  config: ModelConfig,
  request: GenerateRequest,
): Promise<GenerateResponse> {
  const startTime = Date.now();

  console.log('[ModelRouter] Calling tuned Gemini model:', {
    model: config.endpoint,
    messageCount: request.messages.length,
  });

  try {
    // For tuned Vertex AI models, we use the predict endpoint
    // The model endpoint format: projects/{project}/locations/{location}/models/{model}
    const modelPath = config.endpoint || TUNED_MODEL_NAME;

    // Try to get access token: first from env, then from ADC
    let accessToken = process.env.GOOGLE_ACCESS_TOKEN;

    if (!accessToken) {
      // Try to get token from Application Default Credentials (ADC)
      try {
        const { GoogleAuth } = await import('google-auth-library');
        const auth = new GoogleAuth({
          scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        });
        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();
        accessToken = tokenResponse.token || undefined;
        console.log('[ModelRouter] Got access token from ADC');
      } catch (authError) {
        console.log('[ModelRouter] ADC auth failed:', authError instanceof Error ? authError.message : 'unknown');
      }
    }

    if (!accessToken) {
      // No access token available - throw to trigger fallback to base Gemini
      console.log('[ModelRouter] No access token available, falling back...');
      throw new Error('No access token for tuned model');
    }

    // Use Vertex AI REST API with access token
    // For tuned models, use the full model resource name directly
    // Format: projects/{project}/locations/{location}/models/{model}
    const endpoint = `https://${VERTEX_AI_LOCATION}-aiplatform.googleapis.com/v1/${modelPath}:generateContent`;
    console.log('[ModelRouter] Tuned model endpoint:', endpoint);

    // Build request body
    const contents = request.messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          maxOutputTokens: request.maxTokens || config.maxTokens,
          temperature: request.temperature || config.temperature,
        },
      }),
      signal: AbortSignal.timeout(config.timeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ModelRouter] Tuned Gemini HTTP error:', response.status, errorText);
      throw new Error(`Tuned Gemini error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const latencyMs = Date.now() - startTime;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    console.log('[ModelRouter] Tuned Gemini (REST) success:', {
      latencyMs,
      contentLength: text.length,
    });

    return {
      content: text,
      model: 'gemini-tuned',
      latencyMs,
      tokensUsed: { prompt: 0, completion: 0 },
      estimatedCost: 0,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[ModelRouter] Tuned Gemini model failed:', {
      error: errorMsg,
      latencyMs: Date.now() - startTime,
    });
    throw error;
  }
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
      case 'gemini':
        return callGemini(config, request);
      case 'gemini-tuned':
        return callGeminiTuned(config, request);
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
