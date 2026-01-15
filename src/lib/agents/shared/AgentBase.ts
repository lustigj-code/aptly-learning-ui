/**
 * Base Agent Class
 *
 * Abstract base class that all agents extend.
 * Provides common functionality for state management, tool execution, and response generation.
 */

import {
  AgentConfig,
  AgentState,
  AgentContext,
  AgentRequest,
  AgentResponse,
  AgentAction,
  AgentTool,
  AgentType,
  Citation,
} from '../types';

/**
 * Abstract base class for all agents
 */
export abstract class AgentBase {
  protected config: AgentConfig;
  protected tools: Map<string, AgentTool>;

  constructor(config: AgentConfig) {
    this.config = config;
    this.tools = new Map();
    this.registerTools();
  }

  /**
   * Get the agent type
   */
  get type(): AgentType {
    return this.config.type;
  }

  /**
   * Get the agent name
   */
  get name(): string {
    return this.config.name;
  }

  /**
   * Main processing method - must be implemented by each agent
   */
  abstract process(request: AgentRequest): Promise<AgentResponse>;

  /**
   * Register tools available to this agent
   * Override in subclasses to add agent-specific tools
   */
  protected registerTools(): void {
    // Base tools available to all agents
    this.registerTool({
      name: 'log_metric',
      description: 'Log a metric for tracking',
      parameters: [
        { name: 'metric', type: 'string', description: 'Metric name', required: true },
        { name: 'value', type: 'number', description: 'Metric value', required: true },
      ],
      handler: async (params) => {
        console.log(`[${this.name}] Metric: ${params.metric} = ${params.value}`);
        return { logged: true };
      },
    });
  }

  /**
   * Register a tool for this agent
   */
  protected registerTool(tool: AgentTool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Execute a tool by name
   */
  protected async executeTool(
    toolName: string,
    params: Record<string, unknown>,
    state: AgentState
  ): Promise<unknown> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }
    return tool.handler(params, state);
  }

  /**
   * Build the system prompt for this agent
   * Can be overridden to customize prompt building
   */
  protected buildSystemPrompt(context: AgentContext): string {
    return this.config.systemPrompt;
  }

  /**
   * Build the user prompt from context
   * Should be overridden by each agent
   */
  protected abstract buildUserPrompt(request: AgentRequest): string;

  /**
   * Parse actions from the model response
   * Override in subclasses for agent-specific action parsing
   */
  protected parseActions(response: string): AgentAction[] {
    return [];
  }

  /**
   * Calculate grounding score based on citations
   */
  protected calculateGroundingScore(
    response: string,
    citations: Citation[]
  ): number {
    if (citations.length === 0) return 0;

    // Simple calculation: average relevance of citations
    const avgRelevance =
      citations.reduce((sum, c) => sum + c.relevance, 0) / citations.length;

    // Check how much of the response is covered by citations
    const responseLower = response.toLowerCase();
    let coveredChars = 0;

    for (const citation of citations) {
      const citationWords = citation.content.toLowerCase().split(/\s+/);
      for (const word of citationWords) {
        if (word.length > 3 && responseLower.includes(word)) {
          coveredChars += word.length;
        }
      }
    }

    const coverage = Math.min(1, coveredChars / response.length);

    // Combined score
    return avgRelevance * 0.6 + coverage * 0.4;
  }

  /**
   * Create a standard response object
   */
  protected createResponse(
    requestId: string,
    message: string,
    options: {
      actions?: AgentAction[];
      citations?: Citation[];
      stateUpdates?: Partial<AgentState>;
      nextAgent?: AgentType;
      shouldEndSession?: boolean;
      tokensUsed?: number;
      responseTimeMs?: number;
    } = {}
  ): AgentResponse {
    const citations = options.citations || [];
    const groundingScore = this.calculateGroundingScore(message, citations);

    return {
      requestId,
      agentType: this.type,
      timestamp: new Date(),
      message,
      actions: options.actions || [],
      isGrounded: groundingScore >= 0.5,
      groundingScore,
      citations,
      stateUpdates: options.stateUpdates || {},
      nextAgent: options.nextAgent,
      shouldEndSession: options.shouldEndSession,
      tokensUsed: options.tokensUsed || 0,
      responseTimeMs: options.responseTimeMs || 0,
    };
  }

  /**
   * Create an error response
   */
  protected createErrorResponse(
    requestId: string,
    error: string,
    fallbackMessage: string
  ): AgentResponse {
    console.error(`[${this.name}] Error: ${error}`);

    return {
      requestId,
      agentType: this.type,
      timestamp: new Date(),
      message: fallbackMessage,
      actions: [],
      isGrounded: false,
      groundingScore: 0,
      citations: [],
      stateUpdates: {},
      tokensUsed: 0,
      responseTimeMs: 0,
    };
  }

  /**
   * Log agent activity
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: unknown): void {
    const prefix = `[${this.name}]`;
    switch (level) {
      case 'info':
        console.log(prefix, message, data || '');
        break;
      case 'warn':
        console.warn(prefix, message, data || '');
        break;
      case 'error':
        console.error(prefix, message, data || '');
        break;
    }
  }

  /**
   * Get available tools for this agent
   */
  getAvailableTools(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get agent configuration
   */
  getConfig(): AgentConfig {
    return { ...this.config };
  }
}

/**
 * Default agent configurations
 */
export const DEFAULT_AGENT_CONFIGS: Record<AgentType, Partial<AgentConfig>> = {
  director: {
    name: 'Director Agent',
    description: 'Central coordinator that routes requests to specialized agents',
    model: 'gemini-flash',
    temperature: 0.3,
    maxTokens: 1000,
  },
  content: {
    name: 'Content Agent',
    description: 'Selects and sequences learning content optimally',
    model: 'gemini-flash',
    temperature: 0.2,
    maxTokens: 1500,
  },
  quiz: {
    name: 'Quiz Agent',
    description: 'Generates questions and evaluates answers',
    model: 'gemini-flash',
    temperature: 0.4,
    maxTokens: 2000,
  },
  remediation: {
    name: 'Remediation Agent',
    description: 'Provides Socratic hints and scaffolding',
    model: 'gemini',
    temperature: 0.7,
    maxTokens: 2500,
  },
  summary: {
    name: 'Summary Agent',
    description: 'Creates session summaries and progress reports',
    model: 'gemini-flash',
    temperature: 0.3,
    maxTokens: 1500,
  },
  motivation: {
    name: 'Motivation Agent',
    description: 'Detects disengagement and re-engages students',
    model: 'gemini-flash',
    temperature: 0.8,
    maxTokens: 1000,
  },
};
