/**
 * Coach API Route
 *
 * Main API endpoint for the Socratic AI coach.
 * Routes all messages through the AgentOrchestrator which implements:
 * - POMDP-based student state modeling
 * - Multi-agent routing (Director → Content/Quiz/Remediation)
 * - Cognitive load detection and intervention
 * - RAG-grounded responses with citations
 *
 * Flow: Request → Auth → Rate Limit → Orchestrator → Response
 *
 * The orchestrator manages:
 * - DirectorAgent: Intent classification, POMDP routing
 * - ContentAgent: Lesson content delivery
 * - QuizAgent: Assessment and feedback
 * - RemediationAgent: Scaffolded help when struggling
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { createConversation, addMessage } from '@/lib/services/coachService';
import { checkRateLimit, recordMessage, recordTokenUsage as recordRateLimitUsage } from '@/lib/utils/rateLimit';
import {
  getOrCreateSession,
  addTurnToSession,
  analyzeTutorResponse,
  type UserLearningState,
} from '@/lib/training';
import { parseCoachSuggestion, applyCoachModification } from '@/lib/coach/pathModifier';
import { getSocraticErrorResponse } from '@/lib/coach/socraticHandler';
import { recordTokenUsage, createTokenUsage } from '@/lib/coach/tokenUsageTracker';
// Phase 3: Action parsing
import { parseCoachActions } from '@/types/coachActions';

// Agent Orchestrator - Routes through multi-agent system with POMDP
import { getOrchestrator } from '@/lib/agents/orchestrator';

// ============================================
// TYPES
// ============================================

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

// Phase 2: Immediate context for real-time awareness
type ImmediateContext = {
  questionId: string;
  questionText: string;
  selectedAnswer: string;
  wasCorrect: boolean;
  attemptNumber: number;
};

type RequestBody = {
  messages: Message[];
  context: {
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
    // Phase 2: Real-time context
    immediateContext?: ImmediateContext;
  };
  type: 'chat' | 'practice_feedback' | 'quiz_help' | 'summary';
  conversationId?: string;
  userId?: string;
  lessonId?: string;
  currentAtomId?: string;
};

// ============================================
// MAIN API HANDLER
// ============================================

export async function POST(request: NextRequest) {
  let userId: string | null = null;
  let conversationId: string | null = null;
  const startTime = Date.now();

  try {
    // Parse request
    const body: RequestBody = await request.json();
    const { messages, context, type, conversationId: providedConvId, userId: providedUserId, lessonId, currentAtomId } = body;

    // Authenticate user
    userId = await authenticateUser(request, providedUserId);
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(userId).catch(() => ({ hasMessages: true }));
    if (!rateLimitResult.hasMessages) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', message: `You've reached the limit. Please wait a moment.`, messagesRemaining: 0 },
        { status: 429 }
      );
    }

    // Get or create conversation
    conversationId = providedConvId || await createConversation(userId, lessonId);

    // If no messages, just return conversation ID (initialization)
    if (!messages?.length) {
      return NextResponse.json({ message: null, conversationId });
    }

    const latestUserMsg = messages[messages.length - 1];
    const latestMessageContent = latestUserMsg?.role === 'user' ? latestUserMsg.content : undefined;

    if (!latestMessageContent) {
      return NextResponse.json({ message: null, conversationId });
    }

    // ================================================
    // ROUTE THROUGH MULTI-AGENT ORCHESTRATOR
    // This replaces direct Gemini calls with the full
    // POMDP-driven multi-agent system (Director, Content,
    // Quiz, Remediation agents with cognitive load detection)
    // ================================================

    const orchestrator = getOrchestrator({
      maxSteps: 10,
      timeoutMs: 120000, // 2 min for Modal cold starts
      enableFallbacks: true,
      enableMetrics: true,
    });

    // Map request type to activity type for orchestrator context
    type ActivityType = 'video' | 'quiz' | 'reading' | 'practice' | 'review';
    const activityTypeMap: Record<string, ActivityType> = {
      chat: 'reading',
      practice_feedback: 'practice',
      quiz_help: 'quiz',
      summary: 'reading',
    };

    // Build current activity context (optional, only if we have activity details)
    const currentActivity = context?.atomType ? {
      type: activityTypeMap[type] || 'reading' as ActivityType,
      contentId: currentAtomId || context?.currentAtom || '',
      startedAt: new Date(),
      progress: 0,
      selectedAnswer: context?.selectedAnswer,
    } : undefined;

    // Process through the orchestrator (Director → POMDP routing → Specialist agents)
    const orchestrationResult = await orchestrator.processMessage(
      conversationId,
      userId,
      context?.currentCourse || 'default',
      latestMessageContent,
      {
        moduleId: context?.currentModule,
        lessonId: context?.currentLesson || lessonId,
        atomId: currentAtomId || context?.currentAtom,
        userMessage: latestMessageContent,
        currentActivity,
        // Phase 2: Pass immediate context for real-time awareness
        immediateContext: context?.immediateContext,
      }
    );

    // Extract the final response message from orchestration
    const finalResponse = orchestrationResult.responses.length > 0
      ? orchestrationResult.responses[orchestrationResult.responses.length - 1]
      : null;

    const rawMessage = finalResponse?.message || getSocraticErrorResponse();
    const totalTokens = orchestrationResult.totalTokens;

    // Phase 3: Parse actions from the AI response
    const { actions, cleanMessage } = parseCoachActions(rawMessage);
    const responseMessage = cleanMessage;

    // Record usage and save conversation
    await Promise.all([
      recordRateLimitUsage(userId, { inputTokens: totalTokens, outputTokens: 0 }).catch(() => {}),
      recordMessage(userId).catch(() => {}),
      saveConversation(conversationId, latestMessageContent, responseMessage),
      recordTokenUsage(createTokenUsage(userId, 'orchestrator', '/api/coach', totalTokens, 0, {
        variant: orchestrationResult.agentsUsed.join('→'),
        latencyMs: Date.now() - startTime,
        success: orchestrationResult.success,
      })).catch(() => {}),
    ]);

    // Check for path modifications in the response
    const pathModified = await handlePathModification(userId, responseMessage);

    // Log training data (non-blocking)
    logTrainingData(conversationId, userId, lessonId, context, currentAtomId, latestMessageContent, responseMessage).catch(() => {});

    // Return with orchestration metadata
    return NextResponse.json({
      message: responseMessage,
      conversationId,
      // Phase 3: Include parsed actions for UI
      actions: actions.length > 0 ? actions : undefined,
      orchestration: {
        success: orchestrationResult.success,
        agentsUsed: orchestrationResult.agentsUsed,
        totalTokens: orchestrationResult.totalTokens,
        totalTimeMs: orchestrationResult.totalTimeMs,
        errors: orchestrationResult.errors.length > 0 ? orchestrationResult.errors : undefined,
      },
      studentState: orchestrationResult.finalState?.studentState,
      ragMetadata: finalResponse ? {
        isGrounded: finalResponse.isGrounded,
        groundingScore: finalResponse.groundingScore,
        sourceCitations: finalResponse.citations,
      } : undefined,
      pathModified,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Coach API] Error:', { message: errorMessage, userId, conversationId });

    return NextResponse.json(
      { message: getErrorResponse(errorMessage), error: true, conversationId },
      { status: 500 }
    );
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function authenticateUser(request: NextRequest, providedUserId?: string): Promise<string | null> {
  if (providedUserId) return providedUserId;

  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decodedToken = await adminAuth.verifyIdToken(token);
      return decodedToken.uid;
    }
  } catch {
    const sessionId = request.headers.get('x-session-id');
    return sessionId || 'anonymous';
  }
  return null;
}

async function saveConversation(conversationId: string | null, userMessage: string, assistantMessage: string): Promise<void> {
  if (!conversationId) return;
  try {
    await addMessage(conversationId, 'user', userMessage);
    await addMessage(conversationId, 'coach', assistantMessage);
  } catch (error) {
    console.warn('Could not save conversation:', error);
  }
}

async function handlePathModification(userId: string, message: string): Promise<boolean> {
  try {
    const modification = parseCoachSuggestion(message);
    if (modification) {
      const result = await applyCoachModification(userId, modification);
      return result.success;
    }
  } catch (error) {
    console.warn('Could not apply path modification:', error);
  }
  return false;
}

async function logTrainingData(
  conversationId: string | null,
  userId: string,
  lessonId?: string,
  context?: RequestBody['context'],
  currentAtomId?: string,
  userMessage?: string,
  assistantMessage?: string
): Promise<void> {
  if (!conversationId || !lessonId || !context || !userMessage || !assistantMessage) return;

  const userState: UserLearningState = {
    masteryLevel: context.masteryLevel || 0,
    experienceLevel: 50,
    currentStreak: 0,
    totalTimeSpentMinutes: 0,
    lessonsCompleted: 0,
    averageQuizScore: 0,
    strugglingConcepts: [],
    strongConcepts: [],
    emotionalState: 'neutral',
    adaptiveDifficulty: 'intermediate',
  };

  const sessionId = await getOrCreateSession(
    conversationId,
    userId,
    lessonId,
    context.currentLesson || 'Unknown Lesson',
    context.currentModule || '',
    context.currentCourse || '',
    userState,
    currentAtomId,
    context.atomType as 'reading' | 'video' | 'quiz' | 'practice' | undefined
  );

  await addTurnToSession(sessionId, 'user', userMessage);
  await addTurnToSession(sessionId, 'tutor', assistantMessage);

  const metrics = analyzeTutorResponse(assistantMessage);
  console.log('[Training] Response metrics:', {
    sessionId,
    isSocratic: metrics.isSocratic,
    askedQuestion: metrics.askedQuestion,
    gaveDirectAnswer: metrics.gaveDirectAnswer,
  });
}

function getErrorResponse(errorMessage: string): string {
  if (errorMessage.includes('API key')) {
    return "Coach requires AI API configuration. Please check your environment setup.";
  }
  if (errorMessage.includes('quota') || errorMessage.includes('rate')) {
    return "I'm getting a lot of questions right now! Give me a moment and try again.";
  }
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return "I'm having trouble connecting to my AI service. Please check your internet connection.";
  }
  return getSocraticErrorResponse();
}
