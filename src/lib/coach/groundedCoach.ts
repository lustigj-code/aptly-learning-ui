/**
 * Grounded Socratic Coach
 *
 * Generates responses grounded in retrieved course content.
 * Implements RAG-enhanced Socratic tutoring with:
 * - Context-aware response generation
 * - Source citation tracking
 * - Hallucination detection
 * - Intervention tier compliance
 *
 * Part of Phase 12.3: RAG Retrieval Integration
 *
 * Updated: Now uses ModelRouter (Sage fine-tuned model) instead of Gemini directly
 */

import { getModelRouter } from '@/lib/training/serving/modelRouter';
import type { RetrievedChunk } from '../rag/types';
import type { LearnerState, BuiltContext, SourceCitation } from '../rag/contextBuilder';
import { buildContext, buildMisconceptionContext } from '../rag/contextBuilder';
import {
  buildSocraticSystemPrompt,
  getSocraticGenerationConfig,
  type StudentContext,
  type ActivityContext,
} from '../rag/socraticPrompts';
import { getInterventionDirective, type InterventionState } from '../rag/interventionManager';

// ============================================
// TYPES
// ============================================

export type InterventionLevel = 1 | 2 | 3;

export interface SocraticResponse {
  message: string;
  isGrounded: boolean;
  groundingScore: number;
  sourceCitations: SourceCitation[];
  interventionTier: InterventionLevel;
  metadata: {
    tokensUsed: number;
    latencyMs: number;
    ragChunksUsed: number;
    truncated: boolean;
  };
}

export interface GenerationOptions {
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
}

export interface CoachContext {
  lessonTitle: string;
  atomType: 'video' | 'reading' | 'quiz' | 'practice';
  questionText?: string;
  studentAnswer?: string;
  correctAnswer?: string;
}

// ============================================
// CONFIGURATION
// ============================================

const MIN_GROUNDING_SCORE = 0.5;

// ModelRouter handles Sage (fine-tuned) → OpenAI fallback automatically

// ============================================
// MAIN GENERATION FUNCTION
// ============================================

/**
 * Generate a grounded Socratic response
 *
 * Uses retrieved RAG context to ground the response in course content.
 * Tracks grounding score and source citations.
 *
 * @param userMessage - The student's message/question
 * @param retrievedContext - Retrieved RAG chunks
 * @param learnerState - Current learner state (BKT, struggle level)
 * @param interventionLevel - Current intervention tier (1-3)
 * @param coachContext - Activity context (lesson, question, etc.)
 * @param conversationHistory - Previous conversation turns
 * @returns Grounded Socratic response with metadata
 */
export async function generateGroundedResponse(
  userMessage: string,
  retrievedContext: RetrievedChunk[],
  learnerState: LearnerState,
  interventionLevel: InterventionLevel,
  coachContext?: CoachContext,
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[]
): Promise<SocraticResponse> {
  const startTime = Date.now();

  // Build comprehensive context
  const builtContext = buildContext(
    retrievedContext,
    learnerState,
    interventionLevel
  );

  // Build student context for prompt
  const studentContext: StudentContext = {
    name: 'Student', // Would come from user profile in production
    predictedAbility: learnerState.currentPMastery ?? 0.5,
    consecutiveWrong: learnerState.consecutiveWrong ?? 0,
    currentStruggleLevel: mapStruggleSeverity(learnerState.struggleSignals?.severity),
    emotionalState: learnerState.emotionalState,
  };

  // Build activity context
  const activityContext: ActivityContext = {
    lessonTitle: coachContext?.lessonTitle ?? 'Current Lesson',
    atomType: coachContext?.atomType ?? 'reading',
    questionText: coachContext?.questionText,
    studentAnswer: coachContext?.studentAnswer,
    correctAnswer: coachContext?.correctAnswer,
    misconceptionExplanation: getMisconceptionFromContext(retrievedContext),
  };

  // Build the system prompt
  const systemPrompt = buildSocraticSystemPrompt(
    studentContext,
    activityContext,
    builtContext.ragContext
  );

  // Add intervention directive
  const interventionState: InterventionState = {
    currentTier: interventionLevel,
    tier1Attempts: interventionLevel > 1 ? 2 : 0,
    tier2Attempts: interventionLevel > 2 ? 2 : 0,
    tier3Used: false,
    conceptId: 'current',
    startedAt: new Date(),
    lastInteractionAt: new Date(),
  };
  const interventionDirective = getInterventionDirective(interventionState);

  const fullPrompt = `${systemPrompt}

## CURRENT INTERVENTION DIRECTIVE
${interventionDirective.instruction}

Example responses for this tier:
${interventionDirective.examples.slice(0, 2).map((e) => `- ${e}`).join('\n')}

Constraints:
${interventionDirective.constraints.slice(0, 3).map((c) => `- ${c}`).join('\n')}`;

  // Get generation config
  const genConfig = getSocraticGenerationConfig();

  try {
    // Use ModelRouter (Sage fine-tuned → OpenAI fallback)
    const modelRouter = getModelRouter();

    // Build messages array for the router
    const messages = [
      { role: 'system', content: fullPrompt },
      ...(conversationHistory ?? []).slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user', content: userMessage },
    ];

    // Generate response via ModelRouter
    const result = await modelRouter.generate({
      messages,
      maxTokens: genConfig.maxOutputTokens,
      temperature: genConfig.temperature,
      userId: learnerState.userId,
    });

    const responseText = result.content;

    // Calculate grounding score
    const groundingScore = calculateGroundingScore(
      responseText,
      retrievedContext
    );

    // Get token usage from result
    const tokensUsed = result.tokensUsed.prompt + result.tokensUsed.completion;

    const latencyMs = Date.now() - startTime;

    return {
      message: responseText,
      isGrounded: groundingScore >= MIN_GROUNDING_SCORE,
      groundingScore,
      sourceCitations: builtContext.metadata.sourceCitations,
      interventionTier: interventionLevel,
      metadata: {
        tokensUsed,
        latencyMs,
        ragChunksUsed: builtContext.metadata.ragChunksUsed,
        truncated: builtContext.truncated,
      },
    };
  } catch (error) {
    console.error('[GroundedCoach] Generation failed:', error);

    // Return fallback response
    return {
      message: getFallbackResponse(interventionLevel),
      isGrounded: false,
      groundingScore: 0,
      sourceCitations: [],
      interventionTier: interventionLevel,
      metadata: {
        tokensUsed: 0,
        latencyMs: Date.now() - startTime,
        ragChunksUsed: 0,
        truncated: false,
      },
    };
  }
}

// ============================================
// SPECIALIZED GENERATORS
// ============================================

/**
 * Generate response for wrong answer scenario
 */
export async function generateWrongAnswerResponse(
  questionText: string,
  studentAnswer: string,
  retrievedContext: RetrievedChunk[],
  learnerState: LearnerState,
  interventionLevel: InterventionLevel
): Promise<SocraticResponse> {
  // Build misconception-focused context
  const misconceptionContext = buildMisconceptionContext(
    retrievedContext,
    studentAnswer
  );

  const userMessage = `I answered "${studentAnswer}" but I'm not sure if that's right.`;

  return generateGroundedResponse(
    userMessage,
    retrievedContext,
    learnerState,
    interventionLevel,
    {
      lessonTitle: 'Current Lesson',
      atomType: 'quiz',
      questionText,
      studentAnswer,
    }
  );
}

/**
 * Generate response for help request
 */
export async function generateHelpResponse(
  helpRequest: string,
  retrievedContext: RetrievedChunk[],
  learnerState: LearnerState,
  interventionLevel: InterventionLevel,
  coachContext?: CoachContext
): Promise<SocraticResponse> {
  return generateGroundedResponse(
    helpRequest,
    retrievedContext,
    learnerState,
    interventionLevel,
    coachContext
  );
}

/**
 * Generate response for correct answer (verification)
 */
export async function generateCorrectAnswerResponse(
  questionText: string,
  studentAnswer: string,
  learnerState: LearnerState
): Promise<SocraticResponse> {
  const userMessage = `I answered "${studentAnswer}". Is that correct?`;

  // Minimal RAG context needed for correct answers
  return generateGroundedResponse(userMessage, [], learnerState, 1, {
    lessonTitle: 'Current Lesson',
    atomType: 'quiz',
    questionText,
    studentAnswer,
  });
}

// ============================================
// GROUNDING SCORE CALCULATION
// ============================================

/**
 * Calculate how well the response is grounded in retrieved content
 *
 * Checks for:
 * 1. Content overlap with retrieved chunks
 * 2. Use of key concepts from chunks
 * 3. Absence of likely hallucinated claims
 */
function calculateGroundingScore(
  response: string,
  retrievedChunks: RetrievedChunk[]
): number {
  if (retrievedChunks.length === 0) {
    // No RAG context - can't verify grounding
    return 0.3; // Low but not zero (response may still be valid)
  }

  const responseLower = response.toLowerCase();
  let score = 0;
  let totalWeight = 0;

  // Extract key terms from retrieved chunks
  const keyTerms = new Set<string>();
  for (const chunk of retrievedChunks) {
    const words = chunk.chunk.text
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 4);
    words.forEach((w) => keyTerms.add(w));
  }

  // Check term overlap
  const keyTermArray = Array.from(keyTerms);
  let matchedTerms = 0;
  for (const term of keyTermArray.slice(0, 50)) {
    if (responseLower.includes(term)) {
      matchedTerms++;
    }
  }
  const termOverlap = keyTermArray.length > 0
    ? matchedTerms / Math.min(keyTermArray.length, 50)
    : 0;

  score += termOverlap * 0.4;
  totalWeight += 0.4;

  // Check for direct chunk content usage
  let chunkUsage = 0;
  for (const chunk of retrievedChunks.slice(0, 3)) {
    const chunkLower = chunk.chunk.text.toLowerCase();
    // Check if any substantial phrase from chunk appears in response
    const phrases = chunkLower.split(/[.!?]/).filter((p) => p.length > 20);
    for (const phrase of phrases.slice(0, 3)) {
      const words = phrase.trim().split(/\s+/).slice(0, 5).join(' ');
      if (responseLower.includes(words)) {
        chunkUsage += 0.3;
      }
    }
  }
  score += Math.min(chunkUsage, 0.3);
  totalWeight += 0.3;

  // Penalize potential hallucination indicators
  const hallucinationIndicators = [
    'research shows',
    'studies indicate',
    'according to experts',
    'statistics show',
    'data suggests',
  ];
  let hallucinations = 0;
  for (const indicator of hallucinationIndicators) {
    if (responseLower.includes(indicator)) {
      // Check if this claim is backed by chunks
      const isSupported = retrievedChunks.some((c) =>
        c.chunk.text.toLowerCase().includes(indicator)
      );
      if (!isSupported) {
        hallucinations++;
      }
    }
  }
  const hallucinationPenalty = hallucinations * 0.1;
  score -= hallucinationPenalty;

  // Response length factor (very short responses may not use context)
  if (response.length < 50) {
    score *= 0.7;
  }

  // Normalize score to 0-1 range
  return Math.max(0, Math.min(1, score / totalWeight + 0.3));
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Map struggle severity to StudentContext format
 */
function mapStruggleSeverity(
  severity?: 'mild' | 'moderate' | 'severe'
): 'none' | 'mild' | 'moderate' | 'severe' {
  return severity ?? 'none';
}

/**
 * Extract misconception explanation from retrieved chunks
 */
function getMisconceptionFromContext(chunks: RetrievedChunk[]): string | undefined {
  const misconception = chunks.find((c) => c.chunk.chunkType === 'misconception');
  return misconception?.chunk.text;
}

/**
 * Get fallback response for when generation fails
 */
function getFallbackResponse(tier: InterventionLevel): string {
  switch (tier) {
    case 1:
      return "What's your thinking on this? Walk me through how you approached it.";
    case 2:
      return "Let's take a step back. What part of the question stands out to you as most important?";
    case 3:
      return "I'd like to show you a similar example. Give me a moment, and we can work through it together.";
    default:
      return "Let's think about this together. What do you already know about this topic?";
  }
}

// ============================================
// VALIDATION EXPORTS
// ============================================

export { calculateGroundingScore, MIN_GROUNDING_SCORE };
