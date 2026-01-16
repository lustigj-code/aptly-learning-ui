/**
 * Remediation Agent
 *
 * Specialized agent for providing help, hints, and scaffolding.
 * Integrates with existing Socratic handler and implements the
 * 3-tier intervention system from LearnLM research:
 * - Tier 1: Metacognitive questions
 * - Tier 2: Specific hints
 * - Tier 3: Worked examples (never direct answers)
 *
 * Research shows 93.8% remediation rate vs 64.5% for static hints.
 */

import { AgentBase, DEFAULT_AGENT_CONFIGS } from '../shared/AgentBase';
import {
  AgentConfig,
  AgentRequest,
  AgentResponse,
  AgentState,
  StudentState,
  InterventionAction,
  Citation,
} from '../types';
import {
  handleSocraticMode,
  getSocraticErrorResponse,
  type SocraticRequestContext,
  type SocraticMessage,
} from '@/lib/coach/socraticHandler';

/**
 * Intervention tier levels
 */
export type InterventionTier = 1 | 2 | 3;

/**
 * Help request type
 */
export type HelpType =
  | 'general_question'
  | 'concept_clarification'
  | 'stuck_on_quiz'
  | 'need_example'
  | 'struggling'
  | 'explicit_help';

/**
 * Remediation result
 */
export interface RemediationResult {
  message: string;
  tier: InterventionTier;
  helpType: HelpType;
  conceptId?: string;
  isGrounded: boolean;
  groundingScore: number;
  shouldEscalate: boolean;
  citations: Citation[];
}

/**
 * Intervention state for tracking escalation
 */
export interface InterventionState {
  conceptId: string;
  currentTier: InterventionTier;
  tierHistory: Array<{
    tier: InterventionTier;
    timestamp: Date;
    successful: boolean;
  }>;
  attemptsAtCurrentTier: number;
  lastInterventionAt: Date;
}

/**
 * Remediation Agent - Help, hints, and scaffolding
 */
export class RemediationAgent extends AgentBase {
  private static instance: RemediationAgent | null = null;

  private constructor(config: AgentConfig) {
    super(config);
  }

  /**
   * Get singleton instance
   */
  static getInstance(): RemediationAgent {
    if (!RemediationAgent.instance) {
      const defaultConfig = DEFAULT_AGENT_CONFIGS.remediation;
      RemediationAgent.instance = new RemediationAgent({
        id: 'remediation-agent',
        type: 'remediation',
        name: defaultConfig.name || 'Remediation Agent',
        description: defaultConfig.description || 'Help, hints, and scaffolding',
        model: defaultConfig.model || 'gemini',
        temperature: defaultConfig.temperature || 0.7,
        maxTokens: defaultConfig.maxTokens || 2500,
        systemPrompt: REMEDIATION_SYSTEM_PROMPT,
        tools: ['generate_hint', 'get_rag_context', 'escalate_tier', 'check_understanding'],
      });
    }
    return RemediationAgent.instance;
  }

  /**
   * Register Remediation-specific tools
   */
  protected registerTools(): void {
    super.registerTools();

    // Hint generation tool
    this.registerTool({
      name: 'generate_hint',
      description: 'Generate a hint for the current concept',
      parameters: [
        { name: 'conceptId', type: 'string', description: 'Concept ID', required: true },
        { name: 'tier', type: 'number', description: 'Intervention tier (1-3)', required: true },
        { name: 'context', type: 'string', description: 'Additional context', required: false },
      ],
      handler: async (params) => {
        return this.generateHint(
          params.conceptId as string,
          params.tier as InterventionTier,
          params.context as string | undefined
        );
      },
    });

    // RAG context tool
    this.registerTool({
      name: 'get_rag_context',
      description: 'Get relevant content from RAG for grounded responses',
      parameters: [
        { name: 'query', type: 'string', description: 'Query to search', required: true },
        { name: 'courseId', type: 'string', description: 'Course ID', required: true },
        { name: 'chunkTypes', type: 'array', description: 'Types of chunks to retrieve', required: false },
      ],
      handler: async (params) => {
        // Will integrate with existing RAG system
        return { chunks: [], score: 0 };
      },
    });

    // Tier escalation tool
    this.registerTool({
      name: 'escalate_tier',
      description: 'Escalate to next intervention tier',
      parameters: [
        { name: 'currentTier', type: 'number', description: 'Current tier', required: true },
        { name: 'reason', type: 'string', description: 'Reason for escalation', required: true },
      ],
      handler: async (params) => {
        const current = params.currentTier as InterventionTier;
        const next = Math.min(3, current + 1) as InterventionTier;
        return { previousTier: current, newTier: next, reason: params.reason };
      },
    });

    // Understanding check tool
    this.registerTool({
      name: 'check_understanding',
      description: 'Check if student understood the help provided',
      parameters: [
        { name: 'studentResponse', type: 'string', description: 'Student response', required: true },
        { name: 'conceptId', type: 'string', description: 'Concept being helped with', required: true },
      ],
      handler: async (params) => {
        return this.checkUnderstanding(
          params.studentResponse as string,
          params.conceptId as string
        );
      },
    });
  }

  /**
   * Main processing method
   */
  async process(request: AgentRequest): Promise<AgentResponse> {
    const startTime = Date.now();
    const { state, context } = request;

    try {
      // Determine help type from intent and message
      const helpType = this.determineHelpType(request);

      // Get current intervention tier from state
      const currentTier = this.getCurrentTier(state.studentState);

      // Extract conversation history from state messages
      const conversationHistory = state.messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-10) // Last 10 messages for context
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

      // Generate remediation response with AI
      const result = await this.generateRemediation(
        request.message,
        helpType,
        currentTier,
        context,
        state.studentState,
        state.userId || 'anonymous',
        conversationHistory
      );

      // Build actions
      const actions = this.buildRemediationActions(result, state.studentState);

      // Determine if we should stay on remediation or move elsewhere
      let nextAgent = undefined;
      if (result.shouldEscalate && currentTier >= 3) {
        // At max tier, might need motivation agent or content adjustment
        nextAgent = 'motivation' as const;
      }

      // Update intervention tracking in state
      const stateUpdates = this.buildStateUpdates(state, result);

      const responseTimeMs = Date.now() - startTime;

      return this.createResponse(request.requestId, result.message, {
        actions,
        citations: result.citations,
        stateUpdates,
        nextAgent,
        responseTimeMs,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResponse(
        request.requestId,
        errorMessage,
        this.getFallbackHelpMessage()
      );
    }
  }

  /**
   * Determine what kind of help the student needs
   */
  private determineHelpType(request: AgentRequest): HelpType {
    const message = request.message.toLowerCase();
    const intent = request.intent?.type;

    // Check explicit help request
    if (intent === 'request_help' || message.includes('help')) {
      return 'explicit_help';
    }

    // Check if struggling (multiple wrong answers)
    if (
      intent === 'struggling' ||
      request.state.studentState.consecutiveWrong >= 2
    ) {
      return 'struggling';
    }

    // Check for example request
    if (message.includes('example') || message.includes('show me')) {
      return 'need_example';
    }

    // Check if stuck on quiz
    if (request.context.currentActivity?.type === 'quiz') {
      return 'stuck_on_quiz';
    }

    // Check for concept clarification
    if (
      message.includes('what is') ||
      message.includes('what does') ||
      message.includes('explain')
    ) {
      return 'concept_clarification';
    }

    // Default to general question
    return 'general_question';
  }

  /**
   * Get current intervention tier from student state
   */
  private getCurrentTier(studentState: StudentState): InterventionTier {
    return studentState.currentInterventionTier || 1;
  }

  /**
   * Generate remediation response
   */
  private async generateRemediation(
    message: string,
    helpType: HelpType,
    tier: InterventionTier,
    context: AgentRequest['context'],
    studentState: StudentState,
    userId: string,
    conversationHistory?: { role: 'user' | 'assistant'; content: string }[]
  ): Promise<RemediationResult> {
    // Get concept from context
    const conceptId = context.atomId || 'general';

    // Determine if we should escalate
    const shouldEscalate = this.shouldEscalateTier(studentState, tier);

    // Generate tier-appropriate response with AI
    const response = await this.generateTierResponse(
      message,
      helpType,
      shouldEscalate ? Math.min(3, tier + 1) as InterventionTier : tier,
      conceptId,
      studentState,
      userId,
      context,
      conversationHistory
    );

    return {
      message: response.message,
      tier: shouldEscalate ? Math.min(3, tier + 1) as InterventionTier : tier,
      helpType,
      conceptId,
      isGrounded: response.isGrounded,
      groundingScore: response.groundingScore,
      shouldEscalate,
      citations: response.citations,
    };
  }

  /**
   * Check if we should escalate to next tier
   */
  private shouldEscalateTier(studentState: StudentState, currentTier: InterventionTier): boolean {
    // Already at max tier
    if (currentTier >= 3) return false;

    // Multiple wrong answers suggests current tier isn't helping
    if (studentState.consecutiveWrong >= 2) return true;

    // Frustration/confusion emotional state
    if (
      studentState.emotionalState === 'frustrated' ||
      studentState.emotionalState === 'confused'
    ) {
      return true;
    }

    return false;
  }

  /**
   * Check if this help type should use direct explanation mode (not Socratic)
   * Socratic mode is for remediation (quiz errors, struggling)
   * Direct mode is for information requests (concept questions, explanations)
   */
  private shouldUseDirectExplanationMode(helpType: HelpType, studentState: StudentState): boolean {
    // Use Socratic mode when student is struggling or got quiz wrong
    if (helpType === 'stuck_on_quiz' && studentState.consecutiveWrong > 0) {
      return false; // Use Socratic for quiz remediation
    }
    if (helpType === 'struggling' && studentState.consecutiveWrong >= 2) {
      return false; // Use Socratic when really struggling
    }

    // Use direct explanation for informational requests
    if (helpType === 'concept_clarification' || helpType === 'general_question') {
      return true; // Direct explanations for "What is X?" questions
    }
    if (helpType === 'need_example') {
      return true; // Provide examples directly when asked
    }

    // Default to direct mode for better user experience
    return true;
  }

  /**
   * Generate tier-appropriate response using AI (Gemini via socraticHandler)
   */
  private async generateTierResponse(
    message: string,
    helpType: HelpType,
    tier: InterventionTier,
    conceptId: string,
    studentState: StudentState,
    userId: string,
    context?: AgentRequest['context'],
    conversationHistory?: { role: 'user' | 'assistant'; content: string }[]
  ): Promise<{
    message: string;
    isGrounded: boolean;
    groundingScore: number;
    citations: Citation[];
  }> {
    // Check if we should use direct explanation mode vs Socratic mode
    const useDirectMode = this.shouldUseDirectExplanationMode(helpType, studentState);

    if (useDirectMode) {
      console.log('[RemediationAgent] Using direct explanation mode for helpType:', helpType);
      return this.generateDirectExplanation(message, helpType, conceptId, userId, context, conversationHistory);
    }

    console.log('[RemediationAgent] Using Socratic mode for helpType:', helpType, 'tier:', tier);

    // Try to use the Socratic handler for AI-powered responses (quiz remediation)
    try {
      // Build context for socratic handler
      const socraticContext: SocraticRequestContext = {
        userName: 'Student',
        currentCourse: context?.courseId || 'default',
        currentModule: context?.moduleId || '',
        currentLesson: context?.lessonId || '',
        currentAtom: context?.atomId || conceptId,
        atomType: context?.currentActivity?.type || 'reading',
        masteryLevel: studentState.masteryLevels?.[conceptId] ?? 50,
        consecutiveWrong: studentState.consecutiveWrong || 0,
        conceptId,
        questionText: context?.currentActivity?.type === 'quiz' ? message : undefined,
        selectedAnswer: context?.currentActivity?.selectedAnswer,
      };

      // Convert conversation history to socratic format
      const socraticHistory: SocraticMessage[] = (conversationHistory || []).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Call the socratic handler (uses Gemini with RAG)
      const result = await handleSocraticMode(
        userId,
        message,
        socraticContext,
        socraticHistory,
        context?.lessonId
      );

      if (result) {
        return {
          message: result.response,
          isGrounded: result.isGrounded,
          groundingScore: result.groundingScore,
          citations: result.sourceCitations.map((c) => ({
            sourceId: c.chunkId || c.lessonId || 'unknown',
            content: c.title,
            relevance: c.relevance,
          })),
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn('[RemediationAgent] Socratic handler threw error, using template fallback:', {
        error: errorMsg,
        userId,
        conceptId,
      });
    }

    // If socraticHandler returned null, also log it
    console.log('[RemediationAgent] AI returned null, using template fallback for tier', tier);

    // Fallback to template responses if AI fails
    const tierResponses = {
      1: this.getTier1Response(message, helpType, conceptId),
      2: this.getTier2Response(message, helpType, conceptId),
      3: this.getTier3Response(message, helpType, conceptId),
    };

    // Always fallback to tier 1 if tier is invalid
    const response = tierResponses[tier] || tierResponses[1];

    return {
      message: response || "I'm here to help! What would you like to know?",
      isGrounded: false,
      groundingScore: 0.5,
      citations: [],
    };
  }

  /**
   * Generate direct explanation using Gemini (for concept questions)
   * This bypasses Socratic questioning and provides helpful explanations
   */
  private async generateDirectExplanation(
    message: string,
    helpType: HelpType,
    conceptId: string,
    userId: string,
    context?: AgentRequest['context'],
    conversationHistory?: { role: 'user' | 'assistant'; content: string }[]
  ): Promise<{
    message: string;
    isGrounded: boolean;
    groundingScore: number;
    citations: Citation[];
  }> {
    try {
      // Use Gemini directly (GOOGLE_GENAI_API_KEY is set, but OPENAI_API_KEY is not)
      const { GoogleGenerativeAI } = await import('@google/generative-ai');

      const apiKey = process.env.GOOGLE_GENAI_API_KEY;
      if (!apiKey) {
        console.error('[RemediationAgent] GOOGLE_GENAI_API_KEY not set');
        throw new Error('Gemini API key not configured');
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      // Build a direct explanation prompt (not Socratic)
      const systemPrompt = `You are Sage, an AI tutor for the Aptly Learning platform specializing in social media marketing and Meta certification.

Your role is to HELP students by providing clear, accurate explanations when they ask questions.

Guidelines:
- When a student asks "What is X?" or "Can you explain Y?", provide a clear, helpful explanation
- Be conversational and friendly, not robotic
- Use examples when helpful
- Keep responses focused and not too long (2-4 paragraphs max)
- If relevant, connect concepts to social media marketing context
- Be encouraging and supportive

Current context:
- Course: ${context?.courseId || 'Social Media Marketing'}
- Lesson: ${context?.lessonId || 'Current Lesson'}

Remember: The student is asking for help understanding something. Be helpful and educational!`;

      // Build conversation for Gemini
      const conversationParts = [
        { text: systemPrompt },
        ...(conversationHistory || []).slice(-6).flatMap((m) => [
          { text: `${m.role === 'user' ? 'Student' : 'Sage'}: ${m.content}` },
        ]),
        { text: `Student: ${message}` },
        { text: 'Sage:' },
      ];

      const startTime = Date.now();
      const result = await model.generateContent(conversationParts.map(p => p.text).join('\n\n'));
      const response = result.response;
      const text = response.text();
      const latencyMs = Date.now() - startTime;

      console.log('[RemediationAgent] Direct explanation generated with Gemini:', {
        responseLength: text.length,
        latencyMs,
      });

      return {
        message: text,
        isGrounded: false,
        groundingScore: 0.5,
        citations: [],
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[RemediationAgent] Direct explanation failed:', errorMsg);

      // Fallback to a helpful template response
      return {
        message: this.getDirectExplanationFallback(message, helpType),
        isGrounded: false,
        groundingScore: 0,
        citations: [],
      };
    }
  }

  /**
   * Fallback for direct explanation when AI fails
   */
  private getDirectExplanationFallback(message: string, helpType: HelpType): string {
    if (helpType === 'concept_clarification') {
      return `That's a great question! Let me help you understand this concept.

In social media marketing, the terms and strategies can sometimes feel overwhelming, but they build on each other in logical ways.

Could you tell me a bit more about what specific aspect you'd like me to clarify? I want to make sure I give you the most helpful explanation.`;
    }

    if (helpType === 'need_example') {
      return `Great idea to look at examples - they really help cement these concepts!

Let me think of a relevant example from the social media marketing world. What specific scenario or platform would be most helpful to see as an example?`;
    }

    return `I'd be happy to help you understand this better!

Could you tell me a bit more about what you're trying to learn? That way I can give you the most useful explanation.`;
  }

  /**
   * Tier 1: Metacognitive questions
   * Guide student to think about their thinking
   */
  private getTier1Response(message: string, helpType: HelpType, conceptId: string): string {
    const metacognitiveQuestions: Record<HelpType, string[]> = {
      general_question: [
        "That's a great question to explore! What comes to mind when you think about this topic?",
        "Before I give you more details, what do you already know about this?",
        "Interesting question! What aspect of this are you most curious about?",
      ],
      concept_clarification: [
        "Let me help you think through this. What part specifically seems unclear?",
        "Good question! What do you think it might mean based on what we've covered?",
        "I want to make sure I understand what's confusing. Can you tell me what you understand so far?",
      ],
      stuck_on_quiz: [
        "I see you're working on this question. What made you consider the options you did?",
        "Let's think through this together. What do you remember about this concept?",
        "Take a moment - what key idea from the lesson might help you here?",
      ],
      need_example: [
        "Examples can definitely help! Before I show one, what kind of situation were you thinking of?",
        "I'd love to give you an example. What context would be most helpful for you?",
        "Sure! First, can you tell me what aspect you want to see demonstrated?",
      ],
      struggling: [
        "I notice this is challenging - that's totally normal! What part feels most confusing right now?",
        "Let's slow down a bit. What do you understand about this so far?",
        "No worries, we'll figure this out together. What's the first thing that comes to mind about this topic?",
      ],
      explicit_help: [
        "I'm here to help! What specifically would be most useful for you right now?",
        "Happy to help! Can you tell me more about where you're getting stuck?",
        "Of course! Let's start by identifying what's clear and what's still fuzzy.",
      ],
    };

    const questions = metacognitiveQuestions[helpType];
    return questions[Math.floor(Math.random() * questions.length)];
  }

  /**
   * Tier 2: Specific hints
   * Provide targeted hints without giving away the answer
   */
  private getTier2Response(message: string, helpType: HelpType, conceptId: string): string {
    const hints: Record<HelpType, string[]> = {
      general_question: [
        "Here's a hint: Think about how this relates to what we learned earlier. The key connection is...",
        "Good thinking! Here's something to consider: This concept builds on the idea that...",
        "Let me point you in the right direction: Focus on the relationship between...",
      ],
      concept_clarification: [
        "Let me break this down: The core idea is... Think about how that applies here.",
        "Here's the key insight: When we talk about this, we're really asking...",
        "Think of it this way: Imagine... How does that relate to what you're learning?",
      ],
      stuck_on_quiz: [
        "Here's a hint: Look for the option that... This is the distinguishing feature.",
        "Think about what we learned regarding... That should help narrow it down.",
        "Consider this: One option mentions... That's a clue about the right direction.",
      ],
      need_example: [
        "Here's a scenario to consider: Imagine you're... What would happen if...?",
        "Think about it like this: If someone wanted to... they would need to...",
        "Consider this real-world application: When professionals deal with...",
      ],
      struggling: [
        "Let's build from what you know. You mentioned... Now think about how that connects to...",
        "Here's a stepping stone: First, let's make sure you're solid on... Does that make sense?",
        "I'll give you a framework: Think of this as having three parts... Start with the first one.",
      ],
      explicit_help: [
        "Here's what I'd suggest focusing on: The key principle is... Apply that here.",
        "Let me give you a hint: When you see this situation, you should ask yourself...",
        "Here's a useful way to think about it: Compare... to... What do you notice?",
      ],
    };

    const hintList = hints[helpType];
    return hintList[Math.floor(Math.random() * hintList.length)];
  }

  /**
   * Tier 3: Worked examples
   * Provide complete example WITHOUT giving direct answer
   */
  private getTier3Response(message: string, helpType: HelpType, conceptId: string): string {
    // Tier 3 always includes a worked example, but never the direct answer
    return `Let me walk you through a similar example step by step:

**Example scenario:** [Similar but different context]

**Step 1:** First, we identify... This is important because...

**Step 2:** Next, we consider... Notice how this relates to...

**Step 3:** Finally, we apply... The key insight here is...

**Applying this to your question:** Now, using this same approach, think about how you would apply these steps to the specific situation you're facing. What's the first thing you'd identify?

Remember, I won't give you the answer directly, but this example shows you exactly how to think through problems like this. Give it a try!`;
  }

  /**
   * Generate a hint for a specific concept
   */
  private async generateHint(
    conceptId: string,
    tier: InterventionTier,
    context?: string
  ): Promise<string> {
    // Will integrate with RAG for concept-specific hints
    return `Here's a hint for ${conceptId} at tier ${tier}...`;
  }

  /**
   * Check if student understood the help
   */
  private async checkUnderstanding(
    studentResponse: string,
    conceptId: string
  ): Promise<{ understood: boolean; confidence: number }> {
    // Analyze response for indicators of understanding
    const positiveIndicators = [
      'oh i see',
      'that makes sense',
      'got it',
      'i understand',
      'now i get it',
      'thanks',
    ];

    const negativeIndicators = [
      'still confused',
      "don't understand",
      "don't get it",
      'what do you mean',
      'huh',
      'still stuck',
    ];

    const lowerResponse = studentResponse.toLowerCase();

    let score = 0.5; // Neutral starting point

    for (const indicator of positiveIndicators) {
      if (lowerResponse.includes(indicator)) {
        score += 0.1;
      }
    }

    for (const indicator of negativeIndicators) {
      if (lowerResponse.includes(indicator)) {
        score -= 0.15;
      }
    }

    return {
      understood: score >= 0.5,
      confidence: Math.max(0, Math.min(1, score)),
    };
  }

  /**
   * Build intervention actions
   */
  private buildRemediationActions(
    result: RemediationResult,
    studentState: StudentState
  ): InterventionAction[] {
    const actions: InterventionAction[] = [];

    if (result.shouldEscalate) {
      actions.push({
        type: 'escalate_tier',
        tier: result.tier,
        conceptId: result.conceptId,
      });
    } else {
      actions.push({
        type: 'show_hint',
        tier: result.tier,
        content: result.message,
        conceptId: result.conceptId,
      });
    }

    return actions;
  }

  /**
   * Build state updates after remediation
   */
  private buildStateUpdates(
    state: AgentState,
    result: RemediationResult
  ): Partial<AgentState> {
    return {
      studentState: {
        ...state.studentState,
        currentInterventionTier: result.tier,
        interventionHistory: [
          ...state.studentState.interventionHistory,
          {
            timestamp: new Date(),
            conceptId: result.conceptId || 'general',
            tier: result.tier,
            successful: !result.shouldEscalate,
            agentUsed: 'remediation',
          },
        ],
      },
    };
  }

  /**
   * Get fallback help message
   */
  private getFallbackHelpMessage(): string {
    const fallbacks = [
      "I'm here to help! Let's take this step by step. What specifically is confusing you?",
      "No worries, learning takes time. What part would you like me to clarify?",
      "Let's figure this out together. Can you tell me what you've tried so far?",
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  /**
   * Build user prompt for LLM
   */
  protected buildUserPrompt(request: AgentRequest): string {
    const { state, context } = request;

    return `
Student needs help.

Context:
- Current concept: ${context.atomId || 'general'}
- Current activity: ${context.currentActivity?.type || 'none'}
- Intervention tier: ${state.studentState.currentInterventionTier}

Student state:
- Consecutive wrong: ${state.studentState.consecutiveWrong}
- Emotional state: ${state.studentState.emotionalState}
- Engagement: ${state.studentState.engagementLevel}

User message: "${request.message}"

Provide ${state.studentState.currentInterventionTier === 1 ? 'a metacognitive question' : state.studentState.currentInterventionTier === 2 ? 'a specific hint' : 'a worked example'} that helps without giving away the answer.
    `.trim();
  }
}

/**
 * Remediation Agent System Prompt
 */
const REMEDIATION_SYSTEM_PROMPT = `You are the Remediation Agent for the Aptly Learning Platform.

Your role is to help struggling students using the 3-tier Socratic intervention system:

**Tier 1 - Metacognitive Questions:**
- Ask questions that help students reflect on their thinking
- Guide them to identify what they know vs. don't know
- Never give direct information, only questions

**Tier 2 - Specific Hints:**
- Provide targeted hints that point toward the answer
- Reference specific concepts or relationships
- Still don't give the direct answer

**Tier 3 - Worked Examples:**
- Show a complete similar example with step-by-step reasoning
- Use a DIFFERENT but analogous problem
- Let the student apply the pattern themselves

**Core Principles:**
- NEVER give direct answers
- Maintain a supportive, encouraging tone
- Acknowledge frustration but redirect to learning
- Use student's own words when possible
- Connect to prior knowledge

**Emotional Awareness:**
- Frustrated students need validation first, then guidance
- Confused students need smaller steps
- Disengaged students need motivation (route to Motivation Agent)

Research shows this approach achieves 93.8% remediation rate vs 64.5% for static hints.
`;

/**
 * Export singleton getter
 */
export function getRemediationAgent(): RemediationAgent {
  return RemediationAgent.getInstance();
}
