/**
 * Coach SSE Streaming Endpoint
 *
 * Streams AI coach responses character-by-character using Server-Sent Events.
 * This provides a natural typing effect for the AI coach interface.
 *
 * SSE Message Format:
 * - delta: Contains a single character with its index
 * - done: Signals stream completion
 * - error: Contains error information
 *
 * Integration Notes:
 * - Currently uses mock streaming for demonstration
 * - Will integrate with geminiClient.ts for actual AI responses
 * - Will integrate with orchestrator.ts for multi-agent processing
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/apiAuth';

// SSE Event Types
interface DeltaEvent {
  type: 'delta';
  content: string;
  index: number;
}

interface DoneEvent {
  type: 'done';
}

interface ErrorEvent {
  type: 'error';
  error: string;
}

type SSEEvent = DeltaEvent | DoneEvent | ErrorEvent;

// Request body type
interface StreamRequestBody {
  message: string;
  lessonId?: string;
  atomId?: string;
  context?: {
    courseId?: string;
    moduleId?: string;
    masteryLevel?: number;
    conversationHistory?: Array<{ role: string; content: string }>;
  };
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  // Verify authentication
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Parse request body for user message and context
  let body: StreamRequestBody;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid request body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { message, lessonId, atomId, context } = body;

  if (!message || typeof message !== 'string') {
    return new Response(
      JSON.stringify({ error: 'Message is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const enqueueEvent = (event: SSEEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        // TODO: Replace with actual Gemini streaming call
        // In production, use the existing geminiClient with streaming
        // and integrate with the orchestrator for multi-agent processing
        //
        // Example future integration:
        // const orchestrator = getOrchestrator({ enableStreaming: true });
        // const stream = orchestrator.streamMessage(userId, courseId, message, context);
        // for await (const chunk of stream) {
        //   enqueueEvent({ type: 'delta', content: chunk, index: i++ });
        // }

        // For now, create a mock response that demonstrates the SSE pattern
        // The response varies based on context to show the system working
        const mockResponse = generateMockResponse(message, lessonId, atomId, context);

        // Stream character by character with natural typing rhythm
        for (let i = 0; i < mockResponse.length; i++) {
          const chunk: DeltaEvent = {
            type: 'delta',
            content: mockResponse[i],
            index: i,
          };
          enqueueEvent(chunk);

          // Add natural typing rhythm (varies between 20-50ms)
          // Slightly longer pause after punctuation for natural reading
          const isPunctuation = ['.', '!', '?', ','].includes(mockResponse[i]);
          const delay = isPunctuation ? 50 + Math.random() * 100 : 20 + Math.random() * 30;
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Send completion signal
        enqueueEvent({ type: 'done' });
        controller.close();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Stream error';
        console.error('[Coach Stream] Error:', errorMessage);

        const errorChunk: ErrorEvent = {
          type: 'error',
          error: errorMessage,
        };
        enqueueEvent(errorChunk);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}

/**
 * Generate a mock response based on the user's message and context.
 * This simulates what the actual AI coach would respond with.
 */
function generateMockResponse(
  message: string,
  lessonId?: string,
  atomId?: string,
  context?: StreamRequestBody['context']
): string {
  const lowerMessage = message.toLowerCase();

  // Build context prefix for more personalized responses
  // This demonstrates how context will be used in the real implementation
  const hasContext = lessonId || atomId || context?.masteryLevel !== undefined;
  const masteryLevel = context?.masteryLevel ?? 0;

  // Detect message intent and provide appropriate mock response
  if (lowerMessage.includes('help') || lowerMessage.includes('stuck')) {
    const prefix = masteryLevel < 50
      ? "No worries - this is a challenging concept! "
      : "You're doing great, let's work through this together. ";
    return prefix + "Let me help break it down. What specific part is giving you trouble? Sometimes it helps to think about the problem in smaller pieces.";
  }

  if (lowerMessage.includes('explain') || lowerMessage.includes('understand')) {
    return "Great question! Let me explain this step by step. The key idea here is to understand the underlying principle first. Can you tell me what you already know about this topic?";
  }

  if (lowerMessage.includes('wrong') || lowerMessage.includes('incorrect')) {
    return "That's okay - making mistakes is part of learning! Let's look at this together. What was your reasoning for that answer? Understanding your thought process helps me guide you better.";
  }

  if (lowerMessage.includes('quiz') || lowerMessage.includes('test')) {
    const readinessNote = masteryLevel >= 70
      ? "Based on your progress, you're in good shape! "
      : "Let's make sure you're ready. ";
    return readinessNote + "Before we dive into the assessment, what topics would you like to review?";
  }

  if (lowerMessage.includes('practice') || lowerMessage.includes('example')) {
    return "Practice makes progress! Let's work through an example together. I'll guide you through each step, and you tell me what you think comes next.";
  }

  // Default Socratic coaching response with context awareness
  const contextNote = hasContext
    ? `I'm here to help you with ${lessonId ? 'this lesson' : atomId ? 'this section' : 'your learning'}. `
    : "";
  return contextNote + "Let me ask you a question to get us started - what do you think is the main idea here? Sometimes explaining it in your own words helps clarify your understanding.";
}

// Use nodejs runtime for authentication support (requires cookies)
export const runtime = 'nodejs';
