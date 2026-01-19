/**
 * Content Agent
 *
 * Specialized agent for selecting and sequencing learning content.
 * Integrates with:
 * - Knowledge Graph for prerequisite-aware selection
 * - FSRS for spaced repetition scheduling
 * - Session Builder for content structuring
 * - Difficulty adaptation for optimal challenge level
 */

import { AgentBase, DEFAULT_AGENT_CONFIGS } from '../shared/AgentBase';
import {
  AgentConfig,
  AgentRequest,
  AgentResponse,
  StudentState,
  ContentAction,
} from '../types';

/**
 * Content recommendation from the agent
 */
export interface ContentRecommendation {
  contentId: string;
  contentType: 'video' | 'reading' | 'quiz' | 'practice' | 'review';
  skillId: string;
  reason: string;
  priority: number;
  estimatedMinutes: number;
  difficulty: number;
  metadata?: {
    prerequisitesMet: boolean;
    masteryLevel?: number;
    isReview?: boolean;
    daysOverdue?: number;
  };
}

/**
 * Content selection criteria
 */
export interface ContentCriteria {
  targetSkillId?: string;
  preferredType?: 'video' | 'reading' | 'quiz' | 'practice' | 'mixed';
  maxDifficulty?: number;
  minDifficulty?: number;
  maxMinutes?: number;
  includeReviews?: boolean;
  skipContentIds?: string[];
}

/**
 * Content Agent - Selects and sequences learning content
 */
export class ContentAgent extends AgentBase {
  private static instance: ContentAgent | null = null;

  private constructor(config: AgentConfig) {
    super(config);
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ContentAgent {
    if (!ContentAgent.instance) {
      const defaultConfig = DEFAULT_AGENT_CONFIGS.content;
      ContentAgent.instance = new ContentAgent({
        id: 'content-agent',
        type: 'content',
        name: defaultConfig.name || 'Content Agent',
        description: defaultConfig.description || 'Content selection and sequencing',
        model: defaultConfig.model || 'gemini-flash',
        temperature: defaultConfig.temperature || 0.2,
        maxTokens: defaultConfig.maxTokens || 1500,
        systemPrompt: CONTENT_SYSTEM_PROMPT,
        tools: [
          'query_knowledge_graph',
          'check_prerequisites',
          'get_fsrs_schedule',
          'select_content',
        ],
      });
    }
    return ContentAgent.instance;
  }

  /**
   * Register Content-specific tools
   */
  protected registerTools(): void {
    super.registerTools();

    // Knowledge graph query tool
    this.registerTool({
      name: 'query_knowledge_graph',
      description: 'Query the knowledge graph for concepts and relationships',
      parameters: [
        { name: 'courseId', type: 'string', description: 'Course ID', required: true },
        { name: 'conceptId', type: 'string', description: 'Concept ID to query', required: false },
        { name: 'query', type: 'string', description: 'Search query', required: false },
      ],
      handler: async (_params) => {
        // Will integrate with KnowledgeGraphService
        return { concepts: [], edges: [] };
      },
    });

    // Prerequisite check tool
    this.registerTool({
      name: 'check_prerequisites',
      description: 'Check if prerequisites are met for a concept',
      parameters: [
        { name: 'courseId', type: 'string', description: 'Course ID', required: true },
        { name: 'conceptId', type: 'string', description: 'Concept to check', required: true },
        { name: 'masteryLevels', type: 'object', description: 'User mastery levels', required: true },
      ],
      handler: async (_params) => {
        // Will integrate with graphTraversal
        return {
          met: true,
          blocking: [],
          progress: { met: 0, total: 0 },
        };
      },
    });

    // FSRS schedule tool
    this.registerTool({
      name: 'get_fsrs_schedule',
      description: 'Get FSRS-based review schedule',
      parameters: [
        { name: 'userId', type: 'string', description: 'User ID', required: true },
        { name: 'courseId', type: 'string', description: 'Course ID', required: true },
      ],
      handler: async (_params) => {
        // Will integrate with FSRS module
        return { dueReviews: [], overdueReviews: [] };
      },
    });

    // Content selection tool
    this.registerTool({
      name: 'select_content',
      description: 'Select optimal content based on criteria',
      parameters: [
        { name: 'courseId', type: 'string', description: 'Course ID', required: true },
        { name: 'criteria', type: 'object', description: 'Selection criteria', required: true },
        { name: 'studentState', type: 'object', description: 'Current student state', required: true },
      ],
      handler: async (params, state) => {
        const criteria = params.criteria as ContentCriteria;
        return this.selectOptimalContent(
          params.courseId as string,
          criteria,
          state.studentState
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
      // Determine what content action is needed
      const contentAction = this.determineContentAction(request);

      // Get content recommendations
      const recommendations = await this.getContentRecommendations(
        context.courseId,
        state.studentState,
        contentAction
      );

      // Build response message
      const responseMessage = this.buildContentMessage(
        contentAction,
        recommendations,
        state.studentState
      );

      // Create actions based on recommendations
      const actions = this.buildContentActions(recommendations);

      const responseTimeMs = Date.now() - startTime;

      return this.createResponse(request.requestId, responseMessage, {
        actions,
        stateUpdates: {
          currentContext: {
            ...context,
            atomId: recommendations[0]?.contentId,
          },
        },
        responseTimeMs,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResponse(
        request.requestId,
        errorMessage,
        "Let me find something else for you to work on."
      );
    }
  }

  /**
   * Determine what content action is needed based on intent
   */
  private determineContentAction(
    request: AgentRequest
  ): 'next' | 'skip' | 'review' | 'easier' | 'harder' {
    const intent = request.intent?.type;
    const message = request.message.toLowerCase();

    if (intent === 'skip_request' || message.includes('skip')) {
      return 'skip';
    }
    if (intent === 'review_request' || message.includes('review')) {
      return 'review';
    }
    if (message.includes('easier') || message.includes('too hard')) {
      return 'easier';
    }
    if (message.includes('harder') || message.includes('too easy')) {
      return 'harder';
    }

    return 'next';
  }

  /**
   * Get content recommendations based on action and state
   */
  private async getContentRecommendations(
    courseId: string,
    studentState: StudentState,
    action: 'next' | 'skip' | 'review' | 'easier' | 'harder'
  ): Promise<ContentRecommendation[]> {
    const recommendations: ContentRecommendation[] = [];

    switch (action) {
      case 'review':
        // Get FSRS-scheduled reviews
        recommendations.push(...(await this.getReviewContent(courseId, studentState)));
        break;

      case 'skip':
        // Get alternative content
        recommendations.push(...(await this.getAlternativeContent(courseId, studentState)));
        break;

      case 'easier':
        // Get lower difficulty content
        recommendations.push(
          ...(await this.getContentByDifficulty(courseId, studentState, 'lower'))
        );
        break;

      case 'harder':
        // Get higher difficulty content
        recommendations.push(
          ...(await this.getContentByDifficulty(courseId, studentState, 'higher'))
        );
        break;

      case 'next':
      default:
        // Get next optimal content
        recommendations.push(...(await this.getNextContent(courseId, studentState)));
        break;
    }

    // Sort by priority
    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get next optimal content based on learning state
   */
  private async getNextContent(
    courseId: string,
    studentState: StudentState
  ): Promise<ContentRecommendation[]> {
    const recommendations: ContentRecommendation[] = [];

    // Priority 1: Check for urgent reviews (overdue FSRS items)
    // TODO: Integrate with FSRS service

    // Priority 2: Continue current learning path
    // TODO: Integrate with knowledge graph

    // Priority 3: Next concept in sequence
    // For now, return placeholder
    recommendations.push({
      contentId: `next-content-${Date.now()}`,
      contentType: 'video',
      skillId: 'placeholder-skill',
      reason: 'Next concept in your learning path',
      priority: 50,
      estimatedMinutes: 10,
      difficulty: this.calculateOptimalDifficulty(studentState),
      metadata: {
        prerequisitesMet: true,
      },
    });

    return recommendations;
  }

  /**
   * Get content scheduled for review
   */
  private async getReviewContent(
    courseId: string,
    studentState: StudentState
  ): Promise<ContentRecommendation[]> {
    const recommendations: ContentRecommendation[] = [];

    // TODO: Integrate with FSRS service to get due reviews
    // For now, return placeholder based on mastery levels
    for (const [skillId, mastery] of Object.entries(studentState.masteryLevels)) {
      if (mastery > 0.3 && mastery < 0.8) {
        recommendations.push({
          contentId: `review-${skillId}`,
          contentType: 'review',
          skillId,
          reason: `Review to strengthen your understanding`,
          priority: 70,
          estimatedMinutes: 5,
          difficulty: mastery,
          metadata: {
            prerequisitesMet: true,
            masteryLevel: mastery,
            isReview: true,
          },
        });
      }
    }

    return recommendations;
  }

  /**
   * Get alternative content when student skips
   */
  private async getAlternativeContent(
    courseId: string,
    studentState: StudentState
  ): Promise<ContentRecommendation[]> {
    const recommendations: ContentRecommendation[] = [];

    // Provide different content type or different topic at same level
    recommendations.push({
      contentId: `alt-content-${Date.now()}`,
      contentType: 'reading', // Alternative format
      skillId: 'placeholder-skill',
      reason: 'Here\'s something different that covers similar concepts',
      priority: 60,
      estimatedMinutes: 8,
      difficulty: this.calculateOptimalDifficulty(studentState),
      metadata: {
        prerequisitesMet: true,
      },
    });

    return recommendations;
  }

  /**
   * Get content adjusted for difficulty
   */
  private async getContentByDifficulty(
    courseId: string,
    studentState: StudentState,
    direction: 'lower' | 'higher'
  ): Promise<ContentRecommendation[]> {
    const currentDifficulty = this.calculateOptimalDifficulty(studentState);
    const adjustment = direction === 'lower' ? -0.2 : 0.2;
    const targetDifficulty = Math.max(0.1, Math.min(1.0, currentDifficulty + adjustment));

    return [
      {
        contentId: `difficulty-adjusted-${Date.now()}`,
        contentType: 'practice',
        skillId: 'placeholder-skill',
        reason:
          direction === 'lower'
            ? "Let's try something a bit easier"
            : "Here's a challenge for you",
        priority: 65,
        estimatedMinutes: 7,
        difficulty: targetDifficulty,
        metadata: {
          prerequisitesMet: true,
        },
      },
    ];
  }

  /**
   * Calculate optimal difficulty based on student state
   * Uses Vygotsky's Zone of Proximal Development principle
   */
  private calculateOptimalDifficulty(studentState: StudentState): number {
    // Get average mastery
    const masteryValues = Object.values(studentState.masteryLevels);
    const avgMastery =
      masteryValues.length > 0
        ? masteryValues.reduce((a, b) => a + b, 0) / masteryValues.length
        : 0.5;

    // Adjust based on recent performance
    let adjustment = 0;
    if (studentState.consecutiveCorrect >= 3) {
      adjustment = 0.1; // Increase difficulty
    } else if (studentState.consecutiveWrong >= 2) {
      adjustment = -0.1; // Decrease difficulty
    }

    // Optimal is slightly above current level (Zone of Proximal Development)
    const optimal = avgMastery + 0.15 + adjustment;

    return Math.max(0.1, Math.min(1.0, optimal));
  }

  /**
   * Build user-facing message about content
   */
  private buildContentMessage(
    _action: string,
    recommendations: ContentRecommendation[],
    _studentState: StudentState
  ): string {
    if (recommendations.length === 0) {
      return "I'm preparing your next learning activity. One moment...";
    }

    const top = recommendations[0];
    const typeLabels: Record<string, string> = {
      video: 'video lesson',
      reading: 'reading',
      quiz: 'quick quiz',
      practice: 'practice activity',
      review: 'review session',
    };

    const typeLabel = typeLabels[top.contentType] || 'activity';

    switch (action) {
      case 'skip':
        return `No problem! Here's a ${typeLabel} instead. ${top.reason}`;
      case 'review':
        return `Great idea to review! ${top.reason}`;
      case 'easier':
        return `${top.reason}. This should help build your confidence.`;
      case 'harder':
        return `${top.reason}. Let's see what you can do!`;
      default:
        return `Up next: ${typeLabel}. ${top.reason}`;
    }
  }

  /**
   * Build content actions for the orchestrator
   */
  private buildContentActions(recommendations: ContentRecommendation[]): ContentAction[] {
    return recommendations.slice(0, 3).map((rec) => ({
      type: 'show_content' as const,
      contentId: rec.contentId,
      contentType: rec.contentType,
      reason: rec.reason,
    }));
  }

  /**
   * Select optimal content based on criteria (for tool use)
   */
  private async selectOptimalContent(
    courseId: string,
    criteria: ContentCriteria,
    studentState: StudentState
  ): Promise<ContentRecommendation[]> {
    // Combine all factors to select content
    const recommendations: ContentRecommendation[] = [];

    // Apply criteria filters
    const minDiff = criteria.minDifficulty ?? 0;
    const maxDiff = criteria.maxDifficulty ?? 1;
    const optimalDiff = this.calculateOptimalDifficulty(studentState);

    // Get content within difficulty range
    // TODO: Query actual content database
    // Map 'mixed' to a default content type
    const contentType = criteria.preferredType === 'mixed' || !criteria.preferredType
      ? 'video' // Default to video for mixed
      : criteria.preferredType;

    recommendations.push({
      contentId: `selected-${Date.now()}`,
      contentType,
      skillId: criteria.targetSkillId || 'general',
      reason: 'Selected based on your current progress',
      priority: 80,
      estimatedMinutes: criteria.maxMinutes || 10,
      difficulty: Math.max(minDiff, Math.min(maxDiff, optimalDiff)),
      metadata: {
        prerequisitesMet: true,
        masteryLevel: studentState.masteryLevels[criteria.targetSkillId || ''] ?? 0,
      },
    });

    return recommendations;
  }

  /**
   * Build user prompt for LLM-based content selection
   */
  protected buildUserPrompt(request: AgentRequest): string {
    const { state, context } = request;

    return `
Student needs content recommendation.

Current context:
- Course: ${context.courseId}
- Module: ${context.moduleId || 'not specified'}
- Current activity: ${context.currentActivity?.type || 'none'}

Student state:
- Session progress: ${state.studentState.sessionProgress}%
- Consecutive correct: ${state.studentState.consecutiveCorrect}
- Consecutive wrong: ${state.studentState.consecutiveWrong}
- Engagement: ${state.studentState.engagementLevel}

User message: "${request.message}"

Select the most appropriate content considering:
1. Knowledge graph prerequisites
2. FSRS review schedule
3. Student's current engagement level
4. Difficulty calibration for optimal challenge
    `.trim();
  }
}

/**
 * Content Agent System Prompt
 */
const CONTENT_SYSTEM_PROMPT = `You are the Content Agent for the Aptly Learning Platform.

Your role is to select and sequence learning content optimally for each student.

Core responsibilities:
1. Select content that matches the student's current level
2. Ensure prerequisites are met before introducing new concepts
3. Interleave reviews (FSRS-scheduled) with new learning
4. Adapt difficulty to maintain optimal challenge (Zone of Proximal Development)
5. Vary content types to maintain engagement

Selection principles:
- Never show content for which prerequisites aren't met
- Prioritize urgent reviews (overdue FSRS items)
- Balance new learning with review
- Adjust difficulty based on recent performance
- Consider student preferences (video vs reading)

When students skip content:
- Offer alternative content at similar level
- Note the skip for future preference learning
- Don't force completion of skipped items

When students struggle:
- Suggest easier content or prerequisites
- Don't recommend new content until mastery improves
`;

/**
 * Export singleton getter
 */
export function getContentAgent(): ContentAgent {
  return ContentAgent.getInstance();
}
