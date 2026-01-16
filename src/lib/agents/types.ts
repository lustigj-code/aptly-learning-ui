/**
 * Multi-Agent System Types
 *
 * Core types for the agent orchestration system.
 * Agents work together to provide personalized, adaptive learning experiences.
 */

// ============================================
// AGENT IDENTITY
// ============================================

/**
 * Available agent types in the system
 */
export type AgentType =
  | 'director'     // Central coordinator
  | 'content'      // Content selection and sequencing
  | 'quiz'         // Assessment generation and evaluation
  | 'remediation'  // Help, hints, and scaffolding
  | 'summary'      // Session summaries and progress reports
  | 'motivation';  // Engagement and re-engagement

/**
 * Agent configuration
 */
export interface AgentConfig {
  id: string;
  type: AgentType;
  name: string;
  description: string;
  model: 'gemini' | 'gemini-flash' | 'gpt-4';
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  tools: string[]; // Available tool names for this agent
}

// ============================================
// AGENT STATE
// ============================================

/**
 * State shared across all agents during a session
 */
export interface AgentState {
  // Session info
  sessionId: string;
  userId: string;
  courseId: string;
  startedAt: Date;

  // Student state
  studentState: StudentState;

  // Current context
  currentContext: AgentContext;

  // Message history (for context)
  messages: AgentMessage[];

  // Routing decisions
  routingHistory: RoutingDecision[];

  // Agent-specific state
  agentStates: Record<AgentType, Record<string, unknown>>;
}

/**
 * Student state (from POMDP belief)
 */
export interface StudentState {
  // From existing BKT
  masteryLevels: Record<string, number>;
  skillStates: Record<string, SkillState>;

  // Current session
  sessionProgress: number;
  consecutiveCorrect: number;
  consecutiveWrong: number;
  timeOnTask: number;

  // Engagement signals
  engagementLevel: 'high' | 'medium' | 'low';
  emotionalState: 'frustrated' | 'confused' | 'engaged' | 'neutral';

  // Intervention tracking
  currentInterventionTier: 1 | 2 | 3;
  interventionHistory: InterventionEvent[];
}

/**
 * Skill state from BKT
 */
export interface SkillState {
  skillId: string;
  pMastery: number;
  pGuess: number;
  pSlip: number;
  pTransit: number;
  lastUpdated: Date;
}

/**
 * Intervention event record
 */
export interface InterventionEvent {
  timestamp: Date;
  conceptId: string;
  tier: 1 | 2 | 3;
  successful: boolean;
  agentUsed: AgentType;
}

// ============================================
// AGENT CONTEXT
// ============================================

/**
 * Context passed to agents for decision making
 */
export interface AgentContext {
  // Current activity
  currentActivity?: CurrentActivity;

  // Learning context
  courseId: string;
  moduleId?: string;
  lessonId?: string;
  atomId?: string;

  // User request
  userMessage?: string;
  intentType?: IntentType;

  // RAG context (if retrieved)
  ragContext?: RAGContext;

  // Previous agent response (if chained)
  previousAgentResponse?: AgentResponse;

  // Phase 2: Immediate context for real-time awareness
  immediateContext?: {
    questionId: string;
    questionText: string;
    selectedAnswer: string;
    wasCorrect: boolean;
    attemptNumber: number;
  };
}

/**
 * Current learning activity
 */
export interface CurrentActivity {
  type: 'video' | 'quiz' | 'reading' | 'practice' | 'review';
  contentId: string;
  startedAt: Date;
  progress: number;

  // Quiz-specific
  questionIndex?: number;
  selectedAnswer?: string;
  isCorrect?: boolean;
}

/**
 * RAG context from retrieval
 */
export interface RAGContext {
  chunks: RAGChunk[];
  confidenceScore: number;
  queryTimeMs: number;
}

/**
 * Single RAG chunk
 */
export interface RAGChunk {
  content: string;
  type: 'content' | 'hint' | 'misconception' | 'example';
  relevanceScore: number;
  sourceId: string;
  metadata: Record<string, unknown>;
}

// ============================================
// INTENT CLASSIFICATION
// ============================================

/**
 * Types of user intents the Director Agent classifies
 */
export type IntentType =
  | 'need_content'        // Student needs next content
  | 'quiz_answer'         // Student answered a quiz question
  | 'ask_question'        // Student asks a question
  | 'request_help'        // Student explicitly asks for help
  | 'struggling'          // Detected struggle (implicit)
  | 'session_complete'    // Session finished
  | 'disengaged'          // Engagement dropped
  | 'skip_request'        // Student wants to skip
  | 'review_request'      // Student wants to review
  | 'general_chat';       // General conversation

/**
 * Intent classification result
 */
export interface IntentClassification {
  type: IntentType;
  confidence: number;
  extractedEntities: Record<string, string>;
  suggestedAgent: AgentType;
  reasoning: string;
}

// ============================================
// ROUTING
// ============================================

/**
 * Routing decision from Director Agent
 */
export interface RoutingDecision {
  timestamp: Date;
  intent: IntentClassification;
  selectedAgent: AgentType;
  reason: string;
  studentStateSnapshot: Partial<StudentState>;
}

// ============================================
// AGENT COMMUNICATION
// ============================================

/**
 * Message in agent context
 */
export interface AgentMessage {
  role: 'user' | 'assistant' | 'system' | 'agent';
  content: string;
  timestamp: Date;
  agentType?: AgentType;
  metadata?: Record<string, unknown>;
}

/**
 * Request to an agent
 */
export interface AgentRequest {
  // Routing info
  requestId: string;
  fromAgent?: AgentType;
  toAgent: AgentType;

  // Context
  state: AgentState;
  context: AgentContext;

  // The actual request
  message: string;
  intent?: IntentClassification;

  // Constraints
  maxResponseTime?: number;
  requireGrounding?: boolean;
}

/**
 * Response from an agent
 */
export interface AgentResponse {
  // Identity
  requestId: string;
  agentType: AgentType;
  timestamp: Date;

  // Response content
  message: string;
  actions: AgentAction[];

  // Grounding
  isGrounded: boolean;
  groundingScore: number;
  citations: Citation[];

  // State updates
  stateUpdates: Partial<AgentState>;

  // Routing suggestion
  nextAgent?: AgentType;
  shouldEndSession?: boolean;

  // Metadata
  tokensUsed: number;
  responseTimeMs: number;
}

/**
 * Citation from RAG
 */
export interface Citation {
  sourceId: string;
  content: string;
  relevance: number;
}

// ============================================
// AGENT ACTIONS
// ============================================

/**
 * Actions an agent can take
 */
export type AgentAction =
  | ContentAction
  | QuizAction
  | InterventionAction
  | NavigationAction
  | CelebrationAction
  | StateUpdateAction;

/**
 * Content-related actions
 */
export interface ContentAction {
  type: 'show_content' | 'preload_content' | 'skip_content';
  contentId: string;
  contentType: 'video' | 'reading' | 'quiz' | 'practice' | 'review';
  reason: string;
}

/**
 * Quiz-related actions
 */
export interface QuizAction {
  type: 'show_question' | 'evaluate_answer' | 'show_feedback' | 'update_bkt';
  questionId?: string;
  answer?: string;
  isCorrect?: boolean;
  feedback?: string;
  bktUpdates?: Record<string, number>;
}

/**
 * Intervention actions (hints, scaffolding)
 */
export interface InterventionAction {
  type: 'show_hint' | 'escalate_tier' | 'show_example' | 'reset_intervention';
  tier: 1 | 2 | 3;
  content?: string;
  conceptId?: string;
}

/**
 * Navigation actions
 */
export interface NavigationAction {
  type: 'navigate' | 'go_back' | 'skip_ahead';
  destination: string;
  reason: string;
}

/**
 * Celebration actions
 */
export interface CelebrationAction {
  type: 'celebrate' | 'milestone' | 'streak' | 'level_up';
  celebrationType: string;
  xpAwarded?: number;
  badgeId?: string;
}

/**
 * State update actions
 */
export interface StateUpdateAction {
  type: 'update_state';
  updates: Record<string, unknown>;
}

// ============================================
// TOOL DEFINITIONS
// ============================================

/**
 * Tool available to agents
 */
export interface AgentTool {
  name: string;
  description: string;
  parameters: ToolParameter[];
  handler: (params: Record<string, unknown>, state: AgentState) => Promise<unknown>;
}

/**
 * Tool parameter definition
 */
export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: unknown;
}

// ============================================
// ORCHESTRATION
// ============================================

/**
 * Session orchestration result
 */
export interface OrchestrationResult {
  success: boolean;
  responses: AgentResponse[];
  finalState: AgentState;
  totalTokens: number;
  totalTimeMs: number;
  agentsUsed: AgentType[];
  errors: string[];
}

/**
 * Workflow step in orchestration
 */
export interface WorkflowStep {
  agent: AgentType;
  condition?: (state: AgentState) => boolean;
  transform?: (state: AgentState, response: AgentResponse) => AgentState;
  onError?: 'retry' | 'fallback' | 'abort';
  fallbackAgent?: AgentType;
  maxRetries?: number;
}

/**
 * Workflow definition
 */
export interface Workflow {
  name: string;
  description: string;
  steps: WorkflowStep[];
  maxSteps: number;
  timeout: number;
}

// ============================================
// METRICS
// ============================================

/**
 * Agent performance metrics
 */
export interface AgentMetrics {
  agentType: AgentType;
  totalRequests: number;
  successRate: number;
  averageResponseTime: number;
  averageGroundingScore: number;
  tokenUsage: number;
  errorRate: number;
}
