/**
 * Director Agent
 *
 * Central coordinator that routes requests to specialized agents.
 * Responsible for:
 * - Intent classification
 * - Agent routing decisions
 * - Multi-step workflow orchestration
 * - State management across agent interactions
 */

import { AgentBase, DEFAULT_AGENT_CONFIGS } from '../shared/AgentBase';
import {
  AgentConfig,
  AgentRequest,
  AgentResponse,
  AgentState,
  AgentType,
  IntentClassification,
  IntentType,
  RoutingDecision,
  StudentState,
} from '../types';
import {
  getPOMDPModel,
  isLikelyStruggling,
  isLikelyDisengaging,
  getMostLikelyState,
  masteryBeliefToScalar,
  getAgentForAction,
  type FactoredBelief,
  type TeachingAction,
} from '../../student';

/**
 * Director Agent - The central brain of the multi-agent system
 */
export class DirectorAgent extends AgentBase {
  private static instance: DirectorAgent | null = null;

  private constructor(config: AgentConfig) {
    super(config);
  }

  /**
   * Get singleton instance of Director Agent
   */
  static getInstance(): DirectorAgent {
    if (!DirectorAgent.instance) {
      const defaultConfig = DEFAULT_AGENT_CONFIGS.director;
      DirectorAgent.instance = new DirectorAgent({
        id: 'director-agent',
        type: 'director',
        name: defaultConfig.name || 'Director Agent',
        description: defaultConfig.description || 'Central coordinator',
        model: defaultConfig.model || 'gemini-flash',
        temperature: defaultConfig.temperature || 0.3,
        maxTokens: defaultConfig.maxTokens || 1000,
        systemPrompt: DIRECTOR_SYSTEM_PROMPT,
        tools: ['classify_intent', 'route_to_agent', 'get_student_state'],
      });
    }
    return DirectorAgent.instance;
  }

  /**
   * Register Director-specific tools
   */
  protected registerTools(): void {
    super.registerTools();

    // Intent classification tool
    this.registerTool({
      name: 'classify_intent',
      description: 'Classify the intent of a user message',
      parameters: [
        { name: 'message', type: 'string', description: 'User message', required: true },
        { name: 'context', type: 'object', description: 'Current context', required: false },
      ],
      handler: async (params) => {
        const message = params.message as string;
        const context = params.context as Record<string, unknown> | undefined;
        return this.classifyIntent(message, context);
      },
    });

    // Agent routing tool
    this.registerTool({
      name: 'route_to_agent',
      description: 'Route request to appropriate specialist agent',
      parameters: [
        { name: 'intent', type: 'object', description: 'Classified intent', required: true },
        { name: 'state', type: 'object', description: 'Current state', required: true },
      ],
      handler: async (params) => {
        const intent = params.intent as IntentClassification;
        const state = params.state as AgentState;
        return this.routeToAgent(intent, state);
      },
    });

    // Student state tool
    this.registerTool({
      name: 'get_student_state',
      description: 'Get current student state from POMDP belief',
      parameters: [
        { name: 'userId', type: 'string', description: 'User ID', required: true },
        { name: 'skillId', type: 'string', description: 'Skill ID', required: false },
      ],
      handler: async (params) => {
        return this.getStudentStateSnapshot(
          params.userId as string,
          params.skillId as string | undefined
        );
      },
    });
  }

  /**
   * Main processing method - routes requests through the multi-agent system
   */
  async process(request: AgentRequest): Promise<AgentResponse> {
    const startTime = Date.now();
    const { state, context } = request;

    try {
      // Step 1: Classify intent
      const intent = await this.classifyIntent(
        request.message,
        context as unknown as Record<string, unknown>
      );

      // Step 2: Determine routing
      const routing = this.routeToAgent(intent, state);

      // Step 3: Create routing decision record
      const routingDecision: RoutingDecision = {
        timestamp: new Date(),
        intent,
        selectedAgent: routing.agent,
        reason: routing.reason,
        studentStateSnapshot: this.createStateSnapshot(state.studentState),
      };

      // Step 4: Build response with routing information
      const responseTimeMs = Date.now() - startTime;

      return this.createResponse(request.requestId, this.buildRoutingMessage(routing), {
        nextAgent: routing.agent,
        stateUpdates: {
          routingHistory: [...state.routingHistory, routingDecision],
        },
        actions: [
          {
            type: 'update_state',
            updates: {
              lastIntent: intent,
              lastRouting: routingDecision,
            },
          },
        ],
        responseTimeMs,
        tokensUsed: 0, // Will be populated when LLM is called
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResponse(
        request.requestId,
        errorMessage,
        "I'm having trouble processing your request. Let me try a different approach."
      );
    }
  }

  /**
   * Classify the intent of a user message
   */
  private async classifyIntent(
    message: string,
    context?: Record<string, unknown>
  ): Promise<IntentClassification> {
    const lowerMessage = message.toLowerCase();

    // Rule-based classification (will be enhanced with LLM)
    const intentPatterns: Array<{
      patterns: RegExp[];
      intent: IntentType;
      agent: AgentType;
    }> = [
      {
        patterns: [/^[a-d]$/i, /answer is/i, /i think it'?s/i, /my answer/i],
        intent: 'quiz_answer',
        agent: 'quiz',
      },
      {
        patterns: [/help/i, /don'?t understand/i, /confused/i, /explain/i, /what does .* mean/i],
        intent: 'request_help',
        agent: 'remediation',
      },
      {
        patterns: [/\?$/, /how do/i, /what is/i, /why does/i, /can you tell/i],
        intent: 'ask_question',
        agent: 'remediation',
      },
      {
        patterns: [/skip/i, /next/i, /move on/i, /different/i],
        intent: 'skip_request',
        agent: 'content',
      },
      {
        patterns: [/review/i, /go back/i, /again/i, /repeat/i],
        intent: 'review_request',
        agent: 'content',
      },
      {
        patterns: [/done/i, /finish/i, /end session/i, /stop/i, /quit/i],
        intent: 'session_complete',
        agent: 'summary',
      },
      {
        patterns: [/hi/i, /hello/i, /hey/i, /thanks/i, /thank you/i],
        intent: 'general_chat',
        agent: 'director',
      },
    ];

    // Check patterns
    for (const { patterns, intent, agent } of intentPatterns) {
      for (const pattern of patterns) {
        if (pattern.test(lowerMessage)) {
          return {
            type: intent,
            confidence: 0.8,
            extractedEntities: this.extractEntities(message),
            suggestedAgent: agent,
            reasoning: `Matched pattern for ${intent}`,
          };
        }
      }
    }

    // Check context for implicit intents
    if (context?.currentActivity) {
      const activity = context.currentActivity as { type: string; isCorrect?: boolean };

      // If in quiz and just answered wrong, might be struggling
      if (activity.type === 'quiz' && activity.isCorrect === false) {
        return {
          type: 'struggling',
          confidence: 0.7,
          extractedEntities: {},
          suggestedAgent: 'remediation',
          reasoning: 'Student answered incorrectly, may need help',
        };
      }
    }

    // Default: need content
    return {
      type: 'need_content',
      confidence: 0.5,
      extractedEntities: this.extractEntities(message),
      suggestedAgent: 'content',
      reasoning: 'No specific intent detected, defaulting to content',
    };
  }

  /**
   * Determine which agent to route to based on intent and state
   */
  private routeToAgent(
    intent: IntentClassification,
    state: AgentState
  ): { agent: AgentType; reason: string; priority: number } {
    const studentState = state.studentState;

    // High priority overrides based on student state
    if (this.shouldOverrideForEngagement(studentState)) {
      return {
        agent: 'motivation',
        reason: 'Student engagement is low, prioritizing re-engagement',
        priority: 100,
      };
    }

    if (this.shouldOverrideForStruggling(studentState, intent)) {
      return {
        agent: 'remediation',
        reason: `Student has ${studentState.consecutiveWrong} consecutive wrong answers`,
        priority: 90,
      };
    }

    // Route based on intent
    const routingMap: Record<IntentType, { agent: AgentType; reason: string }> = {
      need_content: {
        agent: 'content',
        reason: 'Student needs next learning content',
      },
      quiz_answer: {
        agent: 'quiz',
        reason: 'Student submitted a quiz answer',
      },
      ask_question: {
        agent: 'remediation',
        reason: 'Student asked a question',
      },
      request_help: {
        agent: 'remediation',
        reason: 'Student explicitly requested help',
      },
      struggling: {
        agent: 'remediation',
        reason: 'Detected student struggling',
      },
      session_complete: {
        agent: 'summary',
        reason: 'Session is ending',
      },
      disengaged: {
        agent: 'motivation',
        reason: 'Student appears disengaged',
      },
      skip_request: {
        agent: 'content',
        reason: 'Student wants to skip current content',
      },
      review_request: {
        agent: 'content',
        reason: 'Student wants to review',
      },
      general_chat: {
        agent: 'remediation',
        reason: 'Conversational response from AI tutor',
      },
    };

    const routing = routingMap[intent.type];
    return {
      ...routing,
      priority: 50,
    };
  }

  /**
   * Check if we should override routing due to low engagement
   */
  private shouldOverrideForEngagement(studentState: StudentState): boolean {
    return (
      studentState.engagementLevel === 'low' ||
      studentState.emotionalState === 'frustrated'
    );
  }

  /**
   * Check if we should override routing due to struggling
   */
  private shouldOverrideForStruggling(
    studentState: StudentState,
    intent: IntentClassification
  ): boolean {
    // Don't override if already going to remediation
    if (intent.suggestedAgent === 'remediation') {
      return false;
    }

    // Override if consecutive wrong answers
    return studentState.consecutiveWrong >= 2;
  }

  /**
   * Get POMDP-recommended routing for a user/skill
   *
   * Uses POMDP's policy selector to determine the optimal teaching action,
   * then maps that to an agent type.
   */
  async getPOMDPRecommendedRouting(
    userId: string,
    skillId: string
  ): Promise<{ agent: AgentType; action: TeachingAction; confidence: number; reasoning: string }> {
    const model = getPOMDPModel();
    const belief = await model.getCurrentBelief(userId, skillId);
    const evaluation = await model.selectAction(belief);

    // Map POMDP teaching action to agent type
    const agentType = getAgentForAction(evaluation.selectedAction);

    return {
      agent: agentType,
      action: evaluation.selectedAction,
      confidence: evaluation.confidence,
      reasoning: evaluation.reasoning,
    };
  }

  /**
   * Check if POMDP detects student is struggling (via belief state)
   */
  async isPOMDPStruggling(userId: string, skillId: string): Promise<boolean> {
    const model = getPOMDPModel();
    const belief = await model.getCurrentBelief(userId, skillId);
    return isLikelyStruggling(belief);
  }

  /**
   * Check if POMDP detects student is disengaging (via belief state)
   */
  async isPOMDPDisengaging(userId: string, skillId: string): Promise<boolean> {
    const model = getPOMDPModel();
    const belief = await model.getCurrentBelief(userId, skillId);
    return isLikelyDisengaging(belief);
  }

  /**
   * Extract entities from user message
   */
  private extractEntities(message: string): Record<string, string> {
    const entities: Record<string, string> = {};

    // Extract concept mentions (will be enhanced with NER)
    const conceptPatterns = [
      /about\s+(\w+)/i,
      /understand\s+(\w+)/i,
      /what\s+is\s+(\w+)/i,
      /explain\s+(\w+)/i,
    ];

    for (const pattern of conceptPatterns) {
      const match = message.match(pattern);
      if (match) {
        entities.concept = match[1];
        break;
      }
    }

    // Extract answer choices
    const answerMatch = message.match(/^([a-d])$/i);
    if (answerMatch) {
      entities.answer = answerMatch[1].toUpperCase();
    }

    return entities;
  }

  /**
   * Get a snapshot of student state from POMDP belief
   */
  private async getStudentStateSnapshot(
    userId: string,
    skillId?: string
  ): Promise<Partial<StudentState>> {
    const model = getPOMDPModel();

    // Get belief for current skill (or use a default placeholder)
    const actualSkillId = skillId || 'current-skill';
    const belief = await model.getCurrentBelief(userId, actualSkillId);

    // Convert POMDP belief to StudentState format
    return this.beliefToStudentState(belief);
  }

  /**
   * Convert POMDP factored belief to StudentState interface
   */
  private beliefToStudentState(belief: FactoredBelief): Partial<StudentState> {
    // Map POMDP motivation belief to engagement level
    const engagementLevel = this.mapMotivationToEngagement(belief);

    // Map POMDP confusion belief to emotional state
    const emotionalState = this.mapConfusionToEmotional(belief);

    // Determine intervention tier from confusion level
    const currentInterventionTier = this.determineInterventionTier(belief);

    // Get mastery as scalar for backward compatibility
    const masteryScalar = masteryBeliefToScalar(belief.mastery);

    return {
      engagementLevel,
      emotionalState,
      currentInterventionTier,
      masteryLevels: { [belief.skillId]: masteryScalar },
    };
  }

  /**
   * Map POMDP motivation belief to engagement level
   */
  private mapMotivationToEngagement(
    belief: FactoredBelief
  ): 'high' | 'medium' | 'low' {
    const motivation = getMostLikelyState(belief.motivation);

    switch (motivation) {
      case 'engaged':
        return 'high';
      case 'neutral':
        return 'medium';
      case 'disengaged':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Map POMDP confusion and motivation to emotional state
   */
  private mapConfusionToEmotional(
    belief: FactoredBelief
  ): 'frustrated' | 'confused' | 'engaged' | 'neutral' {
    const confusion = getMostLikelyState(belief.confusion);
    const motivation = getMostLikelyState(belief.motivation);

    // High confusion + disengaged = frustrated
    if (confusion === 'confused' && motivation === 'disengaged') {
      return 'frustrated';
    }

    // Any confusion = confused
    if (confusion === 'confused' || confusion === 'uncertain') {
      return 'confused';
    }

    // Engaged motivation = engaged
    if (motivation === 'engaged') {
      return 'engaged';
    }

    return 'neutral';
  }

  /**
   * Determine intervention tier from POMDP belief
   */
  private determineInterventionTier(belief: FactoredBelief): 1 | 2 | 3 {
    // Tier 3: Highly confused or struggling
    if (isLikelyStruggling(belief) && belief.confusion.confused > 0.4) {
      return 3;
    }

    // Tier 2: Moderately confused
    if (belief.confusion.confused > 0.3 || belief.confusion.uncertain > 0.5) {
      return 2;
    }

    // Tier 1: Default
    return 1;
  }

  /**
   * Create a snapshot of student state for routing decision
   */
  private createStateSnapshot(studentState: StudentState): Partial<StudentState> {
    return {
      masteryLevels: { ...studentState.masteryLevels },
      engagementLevel: studentState.engagementLevel,
      emotionalState: studentState.emotionalState,
      consecutiveCorrect: studentState.consecutiveCorrect,
      consecutiveWrong: studentState.consecutiveWrong,
      currentInterventionTier: studentState.currentInterventionTier,
    };
  }

  /**
   * Build a user-facing message about routing
   */
  private buildRoutingMessage(routing: {
    agent: AgentType;
    reason: string;
    priority: number;
  }): string {
    // This is internal - specialist agents will provide the actual user-facing response
    return `Routing to ${routing.agent}: ${routing.reason}`;
  }

  /**
   * Build user prompt for LLM (when we add LLM-based classification)
   */
  protected buildUserPrompt(request: AgentRequest): string {
    return `
Student message: "${request.message}"

Current context:
- Course: ${request.context.courseId}
- Module: ${request.context.moduleId || 'none'}
- Current activity: ${request.context.currentActivity?.type || 'none'}

Student state:
- Engagement: ${request.state.studentState.engagementLevel}
- Emotional state: ${request.state.studentState.emotionalState}
- Consecutive correct: ${request.state.studentState.consecutiveCorrect}
- Consecutive wrong: ${request.state.studentState.consecutiveWrong}

Classify the intent and suggest which agent should handle this request.
    `.trim();
  }
}

/**
 * Director Agent System Prompt
 */
const DIRECTOR_SYSTEM_PROMPT = `You are the Director Agent for the Aptly Learning Platform.

Your role is to:
1. Understand what the student needs from their message and context
2. Route them to the right specialist agent
3. Coordinate multi-step learning workflows
4. Ensure a smooth, personalized learning experience

Available specialist agents:
- Content Agent: Selects and sequences learning content
- Quiz Agent: Generates questions and evaluates answers
- Remediation Agent: Provides help, hints, and explanations
- Summary Agent: Creates session summaries and progress reports
- Motivation Agent: Re-engages students and provides encouragement

When classifying intents, consider:
- Explicit requests (help, explain, skip)
- Implicit signals (struggling, disengagement)
- Context (current activity, recent performance)
- Student state (mastery, engagement, emotions)

Always prioritize student wellbeing and learning outcomes over strict routing rules.
`;

/**
 * Export singleton getter
 */
export function getDirectorAgent(): DirectorAgent {
  return DirectorAgent.getInstance();
}
