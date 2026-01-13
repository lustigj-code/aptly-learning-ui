/**
 * Coach API Route
 *
 * Main API endpoint for the Socratic AI coach.
 * Handles routing to appropriate model and response generation.
 *
 * Refactored from 1,095 lines to ~200 lines by extracting:
 * - interventionStateManager.ts (Firestore-based state)
 * - coachRouter.ts (model selection)
 * - socraticHandler.ts (Socratic mode logic)
 * - ragCoordinator.ts (RAG operations)
 * - tokenUsageTracker.ts (usage tracking)
 *
 * Part of Phase 12: Socratic RAG Coach
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { createConversation, addMessage } from '@/lib/services/coachService';
import { buildCoachContext } from '@/lib/utils/coachContext';
import { checkRateLimit, recordMessage, recordTokenUsage as recordRateLimitUsage } from '@/lib/utils/rateLimit';
import {
  getOrCreateSession,
  addTurnToSession,
  analyzeTutorResponse,
  type UserLearningState,
} from '@/lib/training';
import { getModelRouter, type GenerateRequest as SageRequest } from '@/lib/training/serving';
import { parseCoachSuggestion, applyCoachModification } from '@/lib/coach/pathModifier';

// New modular imports
import { selectCoachModelAsync, logModelSelection } from '@/lib/coach/coachRouter';
import { handleSocraticMode, getSocraticErrorResponse } from '@/lib/coach/socraticHandler';
import { recordTokenUsage, createTokenUsage } from '@/lib/coach/tokenUsageTracker';

// ============================================
// TYPES
// ============================================

type Message = {
  role: 'user' | 'assistant';
  content: string;
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
  };
  type: 'chat' | 'practice_feedback' | 'quiz_help' | 'summary';
  conversationId?: string;
  userId?: string;
  lessonId?: string;
  currentAtomId?: string;
};

// ============================================
// CONFIGURATION
// ============================================

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// System prompt (condensed version - full version in socraticHandler)
const SYSTEM_PROMPT = `You are Sage, an expert AI learning coach specializing in social media marketing and the Meta Professional Certificate. Use the Socratic method - guide discovery through questions rather than direct answers. Be warm, adaptive, and focused on building genuine understanding.`;

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

    // Select model based on routing logic
    const modelSelection = await selectCoachModelAsync(userId);
    logModelSelection(userId, modelSelection, type);

    // Handle Socratic mode if selected
    if (modelSelection.model === 'socratic' && latestMessageContent) {
      const socraticResult = await handleSocraticMode(
        userId,
        latestMessageContent,
        context,
        messages,
        lessonId
      );

      if (socraticResult) {
        await saveConversation(conversationId, latestMessageContent, socraticResult.response);
        await recordMessage(userId).catch(() => {});

        return NextResponse.json({
          message: socraticResult.response,
          conversationId,
          socraticMode: true,
          interventionTier: socraticResult.interventionTier,
          ragMetadata: {
            isGrounded: socraticResult.isGrounded,
            groundingScore: socraticResult.groundingScore,
            sourceCitations: socraticResult.sourceCitations,
            ragQueryTime: socraticResult.ragQueryTime,
          },
          modelInfo: { model: 'gemini-socratic', variant: 'socratic-rag-grounded' },
        });
      }
      // Fall back to standard mode if Socratic failed
      console.warn('[Coach API] Socratic mode failed, falling back to standard');
    }

    // Build context for non-Socratic modes
    const fullContext = await buildFullContext(userId, lessonId, currentAtomId, conversationId, context, type, latestMessageContent);

    // Generate response
    const { message, inputTokens, outputTokens, modelUsed, abVariant } = await generateResponse(
      messages,
      fullContext,
      modelSelection.model,
      userId,
      conversationId
    );

    // Record usage and save conversation
    await Promise.all([
      recordRateLimitUsage(userId, { inputTokens, outputTokens }).catch(() => {}),
      recordMessage(userId).catch(() => {}),
      saveConversation(conversationId, latestUserMsg.content, message),
      recordTokenUsage(createTokenUsage(userId, modelUsed, '/api/coach', inputTokens, outputTokens, {
        variant: abVariant,
        latencyMs: Date.now() - startTime,
        success: true,
      })).catch(() => {}),
    ]);

    // Check for path modifications
    const pathModified = await handlePathModification(userId, message);

    // Log training data (non-blocking)
    logTrainingData(conversationId, userId, lessonId, context, currentAtomId, latestUserMsg.content, message).catch(() => {});

    return NextResponse.json({
      message,
      conversationId,
      tokensUsed: { input: inputTokens, output: outputTokens, total: inputTokens + outputTokens },
      modelInfo: { model: modelUsed, variant: abVariant },
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

async function buildFullContext(
  userId: string,
  lessonId?: string,
  currentAtomId?: string,
  conversationId?: string,
  context?: RequestBody['context'],
  type?: string,
  latestMessage?: string
): Promise<string> {
  let fullContext = SYSTEM_PROMPT;

  try {
    const coachContext = await buildCoachContext(userId, lessonId, currentAtomId, conversationId, latestMessage);
    fullContext += `\n\n${coachContext.contextString}`;
  } catch {
    if (context) {
      fullContext += `\n\nStudent: ${context.userName}\nCurrent Lesson: ${context.currentLesson}\nContent Type: ${context.atomType}`;
      if (context.masteryLevel) fullContext += `\nMastery Level: ${context.masteryLevel}%`;
    }
  }

  // Add type-specific instructions
  fullContext += getTypeInstructions(type, context);

  return fullContext;
}

function getTypeInstructions(type?: string, context?: RequestBody['context']): string {
  if (type === 'practice_feedback' && context?.practiceContext) {
    try {
      const practiceData = JSON.parse(context.practiceContext);
      return `\n\n=== CURRENT TASK ===\nEvaluate the student's practice response:\nPrompt: ${practiceData.prompt || 'Not specified'}\nStudent's Response: "${practiceData.userResponse || 'No response'}"\n\nProvide: Strengths, Areas for Improvement (use Socratic questions), and a follow-up challenge.`;
    } catch { /* ignore */ }
  }
  if (type === 'quiz_help') {
    return '\n\n=== CURRENT TASK ===\nHelp with quiz question. NEVER give the answer directly. Guide through elimination and reasoning.';
  }
  if (type === 'summary') {
    return '\n\n=== CURRENT TASK ===\nProvide concise summary: 3-5 key takeaways, practical applications, one action item.';
  }
  return '';
}

async function generateResponse(
  messages: Message[],
  fullContext: string,
  selectedModel: string,
  userId: string,
  conversationId: string | null
): Promise<{ message: string; inputTokens: number; outputTokens: number; modelUsed: string; abVariant?: string }> {
  const lastUserMessage = messages[messages.length - 1];

  // Try Sage model if selected
  if (selectedModel === 'sage') {
    try {
      const sageRouter = getModelRouter();
      const sageMessages: SageRequest['messages'] = [
        { role: 'system', content: fullContext },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ];

      const sageResponse = await sageRouter.generate({
        messages: sageMessages,
        maxTokens: 1024,
        temperature: 0.8,
        userId,
        sessionId: conversationId || undefined,
      });

      return {
        message: sageResponse.content,
        inputTokens: sageResponse.tokensUsed.prompt,
        outputTokens: sageResponse.tokensUsed.completion,
        modelUsed: sageResponse.model,
        abVariant: sageResponse.variant,
      };
    } catch (error) {
      console.warn('[Coach API] Sage model failed, falling back to Gemini:', error);
    }
  }

  // Default to Gemini
  const historyMessages = messages.slice(0, -1);
  const firstUserIndex = historyMessages.findIndex((m) => m.role === 'user');
  const validHistory = firstUserIndex >= 0 ? historyMessages.slice(firstUserIndex) : [];

  const chat = model.startChat({
    history: validHistory.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    generationConfig: { maxOutputTokens: 1024, temperature: 0.8, topP: 0.95 },
    systemInstruction: { role: 'user', parts: [{ text: fullContext }] },
  });

  const response = await chat.sendMessage(lastUserMessage.content);
  const responseText = response.response.text() || "I'm having a moment - let me gather my thoughts. Could you rephrase that?";
  const usageMetadata = response.response.usageMetadata;

  return {
    message: responseText,
    inputTokens: usageMetadata?.promptTokenCount || 0,
    outputTokens: usageMetadata?.candidatesTokenCount || 0,
    modelUsed: 'gemini',
  };
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
