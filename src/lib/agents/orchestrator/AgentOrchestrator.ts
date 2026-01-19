/**
 * Agent Orchestrator
 *
 * Central coordinator for the multi-agent system.
 * Implements LangGraph-style stateful workflows:
 * - Manages conversation state across agent calls
 * - Handles routing between agents
 * - Implements conditional transitions
 * - Provides error recovery and fallbacks
 *
 * This is the main entry point for all agent interactions.
 */

import {
  AgentType,
  AgentState,
  AgentContext,
  AgentRequest,
  AgentResponse,
  AgentMessage,
  StudentState,
  OrchestrationResult,
  Workflow,
} from '../types';
import { AgentBase } from '../shared/AgentBase';
import { getDirectorAgent } from '../director';
import { getContentAgent } from '../content';
import { getQuizAgent } from '../quiz';
import { getRemediationAgent } from '../remediation';

/**
 * Agent registry for looking up agents by type
 */
type AgentRegistry = {
  [K in AgentType]?: () => AgentBase;
};

/**
 * Orchestrator configuration
 */
export interface OrchestratorConfig {
  maxSteps: number;
  maxTokensPerSession: number;
  timeoutMs: number;
  enableFallbacks: boolean;
  enableMetrics: boolean;
}

/**
 * Default orchestrator config
 */
const DEFAULT_CONFIG: OrchestratorConfig = {
  maxSteps: 10,
  maxTokensPerSession: 50000,
  timeoutMs: 30000,
  enableFallbacks: true,
  enableMetrics: true,
};

/**
 * Agent Orchestrator - Coordinates the multi-agent system
 */
export class AgentOrchestrator {
  private config: OrchestratorConfig;
  private agentRegistry: AgentRegistry;
  private sessionStates: Map<string, AgentState>;

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionStates = new Map();

    // Register available agents
    this.agentRegistry = {
      director: getDirectorAgent,
      content: getContentAgent,
      quiz: getQuizAgent,
      remediation: getRemediationAgent,
      // Summary and Motivation agents will be added later
    };
  }

  /**
   * Process a user message through the multi-agent system
   */
  async processMessage(
    sessionId: string,
    userId: string,
    courseId: string,
    message: string,
    context?: Partial<AgentContext>
  ): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const responses: AgentResponse[] = [];
    const agentsUsed: AgentType[] = [];
    const errors: string[] = [];

    try {
      // Get or create session state
      let state = this.getOrCreateSessionState(sessionId, userId, courseId);

      // Add user message to history
      state = this.addMessage(state, {
        role: 'user',
        content: message,
        timestamp: new Date(),
      });

      // Build initial context
      const fullContext: AgentContext = {
        courseId,
        ...context,
        userMessage: message,
      };

      // Create initial request (always starts with Director)
      let currentRequest: AgentRequest = {
        requestId: this.generateRequestId(),
        toAgent: 'director',
        state,
        context: fullContext,
        message,
      };

      // Process through agent chain
      let stepCount = 0;
      let totalTokens = 0;

      while (stepCount < this.config.maxSteps) {
        stepCount++;

        // Get the target agent
        const agent = this.getAgent(currentRequest.toAgent);
        if (!agent) {
          errors.push(`Agent not found: ${currentRequest.toAgent}`);
          // Add fallback response instead of just breaking with no response
          if (this.config.enableFallbacks) {
            const fallbackResponse = this.createFallbackResponse(currentRequest, 'Agent not found');
            responses.push(fallbackResponse);
          }
          break;
        }

        agentsUsed.push(currentRequest.toAgent);

        // Process request
        try {
          const response = await this.processWithTimeout(
            agent.process(currentRequest),
            this.config.timeoutMs
          );

          responses.push(response);
          totalTokens += response.tokensUsed;

          // Update state from response
          state = this.applyStateUpdates(state, response);

          // Add assistant message to history
          state = this.addMessage(state, {
            role: 'assistant',
            content: response.message,
            timestamp: new Date(),
            agentType: response.agentType,
          });

          // Check if we should continue to another agent
          if (response.nextAgent && response.nextAgent !== currentRequest.toAgent) {
            currentRequest = {
              requestId: this.generateRequestId(),
              fromAgent: currentRequest.toAgent,
              toAgent: response.nextAgent,
              state,
              context: {
                ...fullContext,
                previousAgentResponse: response,
              },
              message,
              intent: currentRequest.intent,
            };
          } else {
            // No more routing, we're done
            break;
          }

          // Check token budget
          if (totalTokens >= this.config.maxTokensPerSession) {
            errors.push('Session token limit reached');
            break;
          }
        } catch (agentError) {
          const errorMsg = agentError instanceof Error ? agentError.message : 'Agent error';
          errors.push(`${currentRequest.toAgent}: ${errorMsg}`);

          if (this.config.enableFallbacks) {
            const fallbackResponse = this.createFallbackResponse(currentRequest, errorMsg);
            responses.push(fallbackResponse);
          }
          break;
        }
      }

      // Save updated state
      this.sessionStates.set(sessionId, state);

      const totalTimeMs = Date.now() - startTime;

      return {
        success: errors.length === 0,
        responses,
        finalState: state,
        totalTokens,
        totalTimeMs,
        agentsUsed,
        errors,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Orchestration error';
      errors.push(errorMsg);

      return {
        success: false,
        responses,
        finalState: this.getOrCreateSessionState(sessionId, userId, courseId),
        totalTokens: 0,
        totalTimeMs: Date.now() - startTime,
        agentsUsed,
        errors,
      };
    }
  }

  /**
   * Execute a predefined workflow
   */
  async executeWorkflow(
    sessionId: string,
    userId: string,
    courseId: string,
    workflow: Workflow,
    initialMessage: string
  ): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const responses: AgentResponse[] = [];
    const agentsUsed: AgentType[] = [];
    const errors: string[] = [];

    let state = this.getOrCreateSessionState(sessionId, userId, courseId);
    let totalTokens = 0;

    for (const step of workflow.steps) {
      // Check step condition
      if (step.condition && !step.condition(state)) {
        continue;
      }

      // Get agent
      const agent = this.getAgent(step.agent);
      if (!agent) {
        if (step.onError === 'abort') {
          errors.push(`Agent not found: ${step.agent}`);
          break;
        }
        continue;
      }

      agentsUsed.push(step.agent);

      // Create request
      const request: AgentRequest = {
        requestId: this.generateRequestId(),
        toAgent: step.agent,
        state,
        context: {
          courseId,
          userMessage: initialMessage,
        },
        message: initialMessage,
      };

      // Execute with retries
      let retries = 0;
      let response: AgentResponse | null = null;

      while (retries <= (step.maxRetries || 0)) {
        try {
          response = await this.processWithTimeout(
            agent.process(request),
            workflow.timeout
          );
          break;
        } catch (error) {
          retries++;
          if (retries > (step.maxRetries || 0)) {
            const errorMsg = error instanceof Error ? error.message : 'Step error';
            errors.push(`${step.agent}: ${errorMsg}`);

            // Handle error based on strategy
            if (step.onError === 'abort') {
              break;
            } else if (step.onError === 'fallback' && step.fallbackAgent) {
              const fallbackAgent = this.getAgent(step.fallbackAgent);
              if (fallbackAgent) {
                try {
                  response = await fallbackAgent.process(request);
                } catch {
                  // Fallback also failed, continue to next step
                }
              }
            }
          }
        }
      }

      if (response) {
        responses.push(response);
        totalTokens += response.tokensUsed;

        // Apply state transform if defined
        if (step.transform) {
          state = step.transform(state, response);
        } else {
          state = this.applyStateUpdates(state, response);
        }
      }

      // Check workflow limits
      if (totalTokens >= this.config.maxTokensPerSession) {
        break;
      }
    }

    this.sessionStates.set(sessionId, state);

    return {
      success: errors.length === 0,
      responses,
      finalState: state,
      totalTokens,
      totalTimeMs: Date.now() - startTime,
      agentsUsed,
      errors,
    };
  }

  /**
   * Get or create session state
   */
  private getOrCreateSessionState(
    sessionId: string,
    userId: string,
    courseId: string
  ): AgentState {
    const existing = this.sessionStates.get(sessionId);
    if (existing) {
      return existing;
    }

    // Create new state
    const newState: AgentState = {
      sessionId,
      userId,
      courseId,
      startedAt: new Date(),
      studentState: this.createInitialStudentState(),
      currentContext: {
        courseId,
      },
      messages: [],
      routingHistory: [],
      agentStates: {
        director: {},
        content: {},
        quiz: {},
        remediation: {},
        summary: {},
        motivation: {},
      },
    };

    this.sessionStates.set(sessionId, newState);
    return newState;
  }

  /**
   * Create initial student state
   */
  private createInitialStudentState(): StudentState {
    return {
      masteryLevels: {},
      skillStates: {},
      sessionProgress: 0,
      consecutiveCorrect: 0,
      consecutiveWrong: 0,
      timeOnTask: 0,
      engagementLevel: 'medium',
      emotionalState: 'neutral',
      currentInterventionTier: 1,
      interventionHistory: [],
    };
  }

  /**
   * Add message to state history
   */
  private addMessage(state: AgentState, message: AgentMessage): AgentState {
    return {
      ...state,
      messages: [...state.messages.slice(-49), message], // Keep last 50
    };
  }

  /**
   * Apply state updates from response
   */
  private applyStateUpdates(state: AgentState, response: AgentResponse): AgentState {
    if (!response.stateUpdates || Object.keys(response.stateUpdates).length === 0) {
      return state;
    }

    return {
      ...state,
      ...response.stateUpdates,
      studentState: response.stateUpdates.studentState
        ? { ...state.studentState, ...response.stateUpdates.studentState }
        : state.studentState,
      currentContext: response.stateUpdates.currentContext
        ? { ...state.currentContext, ...response.stateUpdates.currentContext }
        : state.currentContext,
    };
  }

  /**
   * Get agent by type
   */
  private getAgent(type: AgentType): AgentBase | null {
    const factory = this.agentRegistry[type];
    return factory ? factory() : null;
  }

  /**
   * Process with timeout
   */
  private processWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Agent timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Create fallback response when agent fails
   */
  private createFallbackResponse(
    request: AgentRequest,
    _error: string
  ): AgentResponse {
    return {
      requestId: request.requestId,
      agentType: request.toAgent,
      timestamp: new Date(),
      message: this.getFallbackMessage(request.toAgent),
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
   * Get agent-specific fallback message
   */
  private getFallbackMessage(agentType: AgentType): string {
    const fallbacks: Record<AgentType, string> = {
      director: "I'm processing your request. One moment please...",
      content: "Let me find the right content for you...",
      quiz: "Let me prepare a question for you...",
      remediation: "I'm here to help. Can you tell me more about what's confusing?",
      summary: "Let me gather your progress information...",
      motivation: "Keep going - you're doing great!",
    };
    return fallbacks[agentType] || "Processing your request...";
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get session state (for external access)
   */
  getSessionState(sessionId: string): AgentState | undefined {
    return this.sessionStates.get(sessionId);
  }

  /**
   * Update student state (for external updates like quiz answers)
   */
  updateStudentState(
    sessionId: string,
    updates: Partial<StudentState>
  ): AgentState | null {
    const state = this.sessionStates.get(sessionId);
    if (!state) return null;

    const updatedState: AgentState = {
      ...state,
      studentState: {
        ...state.studentState,
        ...updates,
      },
    };

    this.sessionStates.set(sessionId, updatedState);
    return updatedState;
  }

  /**
   * End session and clean up
   */
  endSession(sessionId: string): void {
    this.sessionStates.delete(sessionId);
  }

  /**
   * Get all active sessions (for monitoring)
   */
  getActiveSessions(): string[] {
    return Array.from(this.sessionStates.keys());
  }
}

/**
 * Singleton orchestrator instance
 */
let orchestratorInstance: AgentOrchestrator | null = null;

/**
 * Get orchestrator singleton
 */
export function getOrchestrator(config?: Partial<OrchestratorConfig>): AgentOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new AgentOrchestrator(config);
  }
  return orchestratorInstance;
}

/**
 * Reset orchestrator (for testing)
 */
export function resetOrchestrator(): void {
  orchestratorInstance = null;
}
