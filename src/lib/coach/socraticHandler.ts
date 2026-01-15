/**
 * Socratic Handler
 *
 * Handles Socratic mode coaching with RAG-grounded responses.
 * Implements the hierarchical intervention system from LearnLM research:
 * - Tier 1: Metacognitive questions
 * - Tier 2: Specific hints
 * - Tier 3: Worked examples (never direct answers)
 *
 * Research shows 93.8% remediation rate vs 64.5% for static hints.
 *
 * Part of Phase 12.3: RAG Retrieval Integration
 */

import {
  queryComprehensive,
} from '@/lib/rag/ragQuery';
import { getModelRouter } from '@/lib/training/serving/modelRouter';
import type { LearnerState, SourceCitation } from '@/lib/rag/contextBuilder';
import {
  generateGroundedResponse,
  calculateGroundingScore,
  MIN_GROUNDING_SCORE,
} from '@/lib/coach/groundedCoach';
import {
  validateResponse,
  logGroundingMetrics,
  type ValidationResult,
} from '@/lib/coach/responseValidation';
import {
  getOrCreateInterventionState,
  saveInterventionState,
} from '@/lib/coach/interventionStateManager';
import {
  retrievePedagogicalContext,
  formatRAGContext,
  formatContextForPrompt,
  buildSocraticSystemPrompt,
  getSocraticGenerationConfig,
  detectStruggleLevel,
  detectEmotionalState,
  advanceTier,
  isStillStruggling,
  getInterventionDirective,
  type StudentContext,
  type ActivityContext,
} from '@/lib/rag';

// ============================================
// TYPES
// ============================================

export interface SocraticRequestContext {
  userName: string;
  currentCourse: string;
  currentModule: string;
  currentLesson: string;
  currentAtom: string;
  atomType: string;
  atomContent?: string;
  recentPerformance?: string;
  masteryLevel?: number;
  practiceContext?: string;
  questionId?: string;
  questionText?: string;
  selectedAnswer?: string;
  consecutiveWrong?: number;
  conceptId?: string;
}

export interface SocraticMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface EnhancedSocraticResult {
  response: string;
  interventionTier: number;
  isGrounded: boolean;
  groundingScore: number;
  sourceCitations: SourceCitation[];
  validationResult?: ValidationResult;
  ragQueryTime?: number;
}

// ============================================
// CONFIGURATION
// ============================================

// ModelRouter handles Sage (fine-tuned) → OpenAI fallback automatically

// ============================================
// MAIN HANDLER
// ============================================

/**
 * Handle Socratic mode with RAG context and hierarchical interventions
 *
 * @param userId - User's Firebase UID
 * @param message - User's message content
 * @param context - Request context (lesson, question, etc.)
 * @param conversationHistory - Previous conversation turns
 * @param lessonId - Current lesson ID
 * @returns Socratic response with grounding metadata, or null on failure
 */
export async function handleSocraticMode(
  userId: string,
  message: string,
  context: SocraticRequestContext,
  conversationHistory: SocraticMessage[],
  lessonId?: string
): Promise<EnhancedSocraticResult | null> {
  try {
    // Step 1: Query RAG for relevant content
    const ragQueryStart = Date.now();
    const ragResult = await queryComprehensive(
      message,
      context.currentCourse || 'course-1',
      {
        lessonId,
        questionId: context.questionId,
        selectedAnswer: context.selectedAnswer,
        studentAbility: (context.masteryLevel || 50) / 100,
        isStruggling: (context.consecutiveWrong || 0) >= 2,
      }
    );
    const ragQueryTime = Date.now() - ragQueryStart;

    // Step 2: Build learner state from context
    const learnerState: LearnerState = {
      userId,
      currentSkillId: context.conceptId || context.currentAtom,
      currentPMastery: (context.masteryLevel || 50) / 100,
      consecutiveWrong: context.consecutiveWrong || 0,
      emotionalState: detectEmotionalState(message),
      interventionZone: determineInterventionZone(context.masteryLevel || 50),
    };

    // Step 3: Get intervention state from Firestore
    const conceptId = context.conceptId || context.currentAtom || 'general';
    const interventionState = await getOrCreateInterventionState(userId, conceptId);

    // Step 4: Generate grounded response
    const socraticResponse = await generateGroundedResponse(
      message,
      ragResult.chunks,
      learnerState,
      interventionState.currentTier as 1 | 2 | 3,
      {
        lessonTitle: context.currentLesson || 'Current Lesson',
        atomType: (context.atomType || 'reading') as 'video' | 'reading' | 'quiz' | 'practice',
        questionText: context.questionText,
        studentAnswer: context.selectedAnswer,
      },
      conversationHistory
    );

    // Step 5: Validate response for quality
    const validationResult = validateResponse(
      socraticResponse.message,
      ragResult.chunks,
      interventionState.currentTier as 1 | 2 | 3
    );

    // Step 6: Log grounding metrics
    logGroundingMetrics({
      responseId: `${userId}_${Date.now()}`,
      userId,
      groundingScore: socraticResponse.groundingScore,
      isGrounded: socraticResponse.isGrounded,
      sourcesUsed: ragResult.totalRetrieved,
      hallucationDetected: validationResult.flags.some((f) => f.type === 'hallucination'),
      timestamp: new Date(),
    });

    // Step 7: Check if student is still struggling and advance tier
    if (isStillStruggling(message, false)) {
      const newState = advanceTier(interventionState);
      await saveInterventionState(userId, newState);
    }

    // Log warnings if response has issues
    if (validationResult.flags.length > 0) {
      console.warn('[SocraticHandler] Response validation flags:', {
        flags: validationResult.flags.map((f) => f.message),
        suggestions: validationResult.suggestions,
      });
    }

    return {
      response: socraticResponse.message,
      interventionTier: interventionState.currentTier,
      isGrounded: socraticResponse.isGrounded,
      groundingScore: socraticResponse.groundingScore,
      sourceCitations: socraticResponse.sourceCitations,
      validationResult,
      ragQueryTime,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('[SocraticHandler] Main handler failed:', {
      error: errorMsg,
      stack: errorStack,
      userId,
      courseId: context.currentCourse,
    });

    // Attempt fallback with basic RAG
    try {
      console.log('[SocraticHandler] Attempting fallback...');
      return await handleSocraticModeFallback(
        userId,
        message,
        context,
        conversationHistory
      );
    } catch (fallbackError) {
      const fallbackMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      console.error('[SocraticHandler] Fallback also failed:', {
        error: fallbackMsg,
        mainError: errorMsg,
      });
      return null;
    }
  }
}

// ============================================
// FALLBACK HANDLER
// ============================================

/**
 * Fallback Socratic handler when grounded coach fails
 * Works WITHOUT RAG when embedding service is unavailable
 */
async function handleSocraticModeFallback(
  userId: string,
  message: string,
  context: SocraticRequestContext,
  conversationHistory: SocraticMessage[]
): Promise<EnhancedSocraticResult | null> {
  // Build student context for personalized prompts
  const studentContext: StudentContext = {
    name: context.userName || 'Student',
    predictedAbility: (context.masteryLevel || 50) / 100,
    consecutiveWrong: context.consecutiveWrong || 0,
    currentStruggleLevel: detectStruggleLevel(
      context.consecutiveWrong || 0,
      conversationHistory.length
    ),
    emotionalState: detectEmotionalState(message),
  };

  // Build activity context
  const activityContext: ActivityContext = {
    lessonTitle: context.currentLesson || 'Current Lesson',
    atomType: (context.atomType || 'reading') as 'video' | 'reading' | 'quiz' | 'practice',
    questionText: context.questionText,
    studentAnswer: context.selectedAnswer,
  };

  // Try RAG retrieval, but continue without it if it fails
  let ragChunks: Awaited<ReturnType<typeof retrievePedagogicalContext>> = [];
  let ragContextString = '';

  try {
    ragChunks = await retrievePedagogicalContext({
      query: message,
      courseId: context.currentCourse || 'course-1',
      lessonId: undefined,
      questionId: context.questionId,
      distractorId: context.selectedAnswer,
      studentAbility: studentContext.predictedAbility,
      preferStudentFriendly: studentContext.predictedAbility < 0.5,
      chunkTypes: context.selectedAnswer
        ? ['misconception', 'hint', 'content']
        : ['content', 'hint'],
      topK: 5,
    });

    // Format RAG context
    const formattedContext = formatRAGContext(ragChunks.map((r) => r.chunk));
    ragContextString = formatContextForPrompt(formattedContext);
  } catch (ragError) {
    console.warn('[SocraticHandler] RAG retrieval failed, continuing without grounding:', ragError);
    ragContextString = '(No course-specific context available - respond with general educational approach)';
  }

  // Get misconception if available
  const misconceptionChunk = ragChunks.find((r) => r.chunk.chunkType === 'misconception');
  if (misconceptionChunk) {
    activityContext.misconceptionExplanation = misconceptionChunk.chunk.text;
  }

  // Build prompt
  const systemPrompt = buildSocraticSystemPrompt(
    studentContext,
    activityContext,
    ragContextString
  );

  // Get intervention state from Firestore
  const conceptId = context.conceptId || context.currentAtom || 'general';
  const interventionState = await getOrCreateInterventionState(userId, conceptId);
  const interventionDirective = getInterventionDirective(interventionState);

  // Generate with ModelRouter (Sage fine-tuned model → OpenAI fallback)
  const genConfig = getSocraticGenerationConfig();
  const modelRouter = getModelRouter();

  const fullPrompt = `${systemPrompt}

# CURRENT INTERVENTION DIRECTIVE
${interventionDirective.instruction}

Examples of appropriate responses:
${interventionDirective.examples.slice(0, 2).map((e) => `- ${e}`).join('\n')}

Constraints:
${interventionDirective.constraints.slice(0, 3).map((c) => `- ${c}`).join('\n')}`;

  // Build messages array for the router
  const messages = [
    { role: 'system', content: fullPrompt },
    ...conversationHistory.slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: 'user', content: message },
  ];

  const result = await modelRouter.generate({
    messages,
    maxTokens: genConfig.maxOutputTokens,
    temperature: genConfig.temperature,
    userId,
  });

  const response = result.content;

  // Calculate basic grounding score
  const groundingScore = calculateGroundingScore(response, ragChunks);

  // Update tier if struggling (save to Firestore)
  if (isStillStruggling(message, false)) {
    const newState = advanceTier(interventionState);
    await saveInterventionState(userId, newState);
  }

  return {
    response,
    interventionTier: interventionState.currentTier,
    isGrounded: groundingScore >= MIN_GROUNDING_SCORE,
    groundingScore,
    sourceCitations: ragChunks.slice(0, 3).map((c) => ({
      chunkId: c.chunk.id,
      title: c.chunk.title || 'Course Content',
      lessonId: c.chunk.lessonId,
      relevance: c.score,
    })),
  };
}

// ============================================
// HELPERS
// ============================================

/**
 * Determine intervention zone from mastery level
 */
function determineInterventionZone(
  masteryLevel: number
): 'frustration' | 'zpd' | 'mastery' {
  const accuracy = masteryLevel / 100;
  if (accuracy < 0.36) return 'frustration';
  if (accuracy > 0.70) return 'mastery';
  return 'zpd';
}

/**
 * Get fallback error response with Socratic flavor
 */
export function getSocraticErrorResponse(): string {
  const responses = [
    "I'm having a brief connection issue, but here's a thought: What's the first thing that comes to mind when you think about your target audience? That's often the best starting point for any marketing strategy!",
    "Technical hiccup on my end! While I reconnect, consider this: If you were your ideal customer, what would make you stop scrolling? That's the key to great social media content.",
    "Give me just a moment to reconnect. In the meantime, think about this: What's one thing you learned recently that surprised you about social media marketing?",
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}
