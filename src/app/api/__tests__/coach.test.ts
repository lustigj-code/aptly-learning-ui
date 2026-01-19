/**
 * Coach API Route Tests
 * Phase 7.1: Critical API endpoint testing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../coach/route';
import { NextRequest } from 'next/server';

// Mock Firebase Admin with nested collection support
vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: vi.fn(() =>
      Promise.resolve({
        uid: 'test-user-123',
        email: 'test@example.com',
      })
    ),
  },
  adminDb: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(() => Promise.resolve({ exists: false })),
        set: vi.fn(() => Promise.resolve()),
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            get: vi.fn(() => Promise.resolve({ exists: false })),
            set: vi.fn(() => Promise.resolve()),
          })),
        })),
      })),
      add: vi.fn(() => Promise.resolve({ id: 'new-doc-id' })),
    })),
  },
}));

// Mock Gemini
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: vi.fn(() => ({
      startChat: vi.fn(() => ({
        sendMessage: vi.fn(() =>
          Promise.resolve({
            response: {
              text: () => "That's a great question! What do you already know about this topic?",
              usageMetadata: {
                promptTokenCount: 150,
                candidatesTokenCount: 50,
              },
            },
          })
        ),
      })),
    })),
  })),
}));

// Mock services
vi.mock('@/lib/services/coachService', () => ({
  createConversation: vi.fn(() => Promise.resolve('conv-123')),
  addMessage: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/utils/coachContext', () => ({
  buildCoachContext: vi.fn(() =>
    Promise.resolve({
      user: { name: 'Test', goal: 'certification', experienceLevel: 50 },
      performance: { xp: 100, currentStreak: 3 },
      contextString: 'User context string...',
    })
  ),
}));

vi.mock('@/lib/utils/rateLimit', () => ({
  checkRateLimit: vi.fn(() => Promise.resolve({ hasMessages: true, remaining: 9 })),
  recordMessage: vi.fn(() => Promise.resolve()),
  recordTokenUsage: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/training', () => ({
  getOrCreateSession: vi.fn(() => Promise.resolve('session-123')),
  addTurnToSession: vi.fn(() => Promise.resolve()),
  analyzeTutorResponse: vi.fn(() => ({ isSocratic: true, askedQuestion: true })),
}));

vi.mock('@/lib/training/serving', () => ({
  getModelRouter: vi.fn(() => ({
    generate: vi.fn(() =>
      Promise.resolve({
        content: "What do you think makes a good social media post?",
        tokensUsed: { prompt: 100, completion: 30 },
        model: 'sage-v1',
        latencyMs: 450,
        estimatedCost: 0.001,
      })
    ),
  })),
}));

vi.mock('@/lib/monitoring/sentry', () => ({
  captureError: vi.fn(),
}));

// Mock Agent Orchestrator - this is the main AI processing path
vi.mock('@/lib/agents/orchestrator', () => ({
  getOrchestrator: vi.fn(() => ({
    processMessage: vi.fn(() =>
      Promise.resolve({
        responses: [
          {
            message: "That's a great question! What do you think makes effective targeting?",
            isGrounded: true,
            groundingScore: 0.85,
            citations: [],
          },
        ],
        agentsUsed: ['director', 'remediation'],
        totalTokens: 200,
        totalTimeMs: 450,
        errors: [],
        success: true,
        finalState: {
          studentState: { mastery: 0.65, engagement: 0.8 },
        },
      })
    ),
  })),
}));

// Mock user memory service
vi.mock('@/lib/services/userMemoryService', () => ({
  getMemory: vi.fn(() => Promise.resolve(null)),
  buildMemorySummary: vi.fn(() => Promise.resolve(null)),
}));

// Mock memory extractor
vi.mock('@/lib/coach/memoryExtractor', () => ({
  analyzeConversation: vi.fn(() => Promise.resolve()),
  quickExtract: vi.fn(() => Promise.resolve()),
}));

// Mock token usage tracker
vi.mock('@/lib/coach/tokenUsageTracker', () => ({
  recordTokenUsage: vi.fn(() => Promise.resolve()),
  createTokenUsage: vi.fn(() => ({})),
}));

// Mock coach actions parser
vi.mock('@/types/coachActions', () => ({
  parseCoachActions: vi.fn((message: string) => ({
    actions: [],
    cleanMessage: message,
  })),
}));

describe('POST /api/coach', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires userId in request', async () => {
    const request = new NextRequest('http://localhost:3000/api/coach', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello!' }],
        context: {
          userName: 'Test',
          currentCourse: 'Course 1',
          currentModule: 'Module 1',
          currentLesson: 'Lesson 1',
          currentAtom: 'Atom 1',
          atomType: 'reading',
        },
        type: 'chat',
        // No userId provided
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('userId is required');
  });

  it('returns conversation ID when initialized with empty messages', async () => {
    const request = new NextRequest('http://localhost:3000/api/coach', {
      method: 'POST',
      body: JSON.stringify({
        messages: [],
        context: {
          userName: 'Test',
          currentCourse: 'Course 1',
          currentModule: 'Module 1',
          currentLesson: 'Lesson 1',
          currentAtom: 'Atom 1',
          atomType: 'reading',
        },
        type: 'chat',
        userId: 'test-user-123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBeNull();
    expect(data.conversationId).toBeDefined();
  });

  it('handles long messages without crashing', async () => {
    const longMessage = 'a'.repeat(5000); // Long but not unreasonable

    const request = new NextRequest('http://localhost:3000/api/coach', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: longMessage }],
        context: {
          userName: 'Test',
          currentCourse: 'Course 1',
          currentModule: 'Module 1',
          currentLesson: 'Lesson 1',
          currentAtom: 'Atom 1',
          atomType: 'reading',
        },
        type: 'chat',
        userId: 'test-user-123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    // Should succeed since orchestrator is mocked
    expect(response.status).toBe(200);
    expect(data.message).toBeDefined();
  });

  it('successfully sends chat message with valid input', async () => {
    process.env.GOOGLE_GENAI_API_KEY = 'test-key';

    const request = new NextRequest('http://localhost:3000/api/coach', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'What is a lookalike audience?' }],
        context: {
          userName: 'Alice',
          currentCourse: 'Social Media Marketing',
          currentModule: 'Audience Targeting',
          currentLesson: 'Advanced Audiences',
          currentAtom: 'Lookalike Audiences',
          atomType: 'reading',
          masteryLevel: 75,
        },
        type: 'chat',
        userId: 'test-user-123',
        lessonId: 'lesson-123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBeDefined();
    expect(data.conversationId).toBeDefined();
    // The response now includes orchestration metadata instead of tokensUsed/modelInfo
    expect(data.orchestration).toBeDefined();
    expect(data.orchestration.success).toBe(true);
    expect(data.orchestration.agentsUsed).toEqual(['director', 'remediation']);
  });

  it('enforces rate limits', async () => {
    const { checkRateLimit } = await import('@/lib/utils/rateLimit');
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ hasMessages: false, remaining: 0 });

    process.env.GOOGLE_GENAI_API_KEY = 'test-key';

    const request = new NextRequest('http://localhost:3000/api/coach', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Help me!' }],
        context: {
          userName: 'Test',
          currentCourse: 'Course',
          currentModule: 'Module',
          currentLesson: 'Lesson',
          currentAtom: 'Atom',
          atomType: 'quiz',
        },
        type: 'chat',
        userId: 'rate-limited-user',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe('Rate limit exceeded');
    expect(data.messagesRemaining).toBe(0);
  });

  it('handles different message types (practice_feedback)', async () => {
    process.env.GOOGLE_GENAI_API_KEY = 'test-key';

    const request = new NextRequest('http://localhost:3000/api/coach', {
      method: 'POST',
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'Here is my campaign strategy: Target women 25-34 interested in fitness...',
          },
        ],
        context: {
          userName: 'Alice',
          currentCourse: 'Course',
          currentModule: 'Module',
          currentLesson: 'Lesson',
          currentAtom: 'Practice Exercise',
          atomType: 'practice',
          practiceContext: JSON.stringify({
            rubric: [
              { criterion: 'Audience Targeting', weight: 30 },
              { criterion: 'Budget Allocation', weight: 25 },
            ],
            expectedOutcomes: ['Clear target audience', 'Realistic budget'],
          }),
        },
        type: 'practice_feedback',
        userId: 'test-user-123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBeDefined();
  });

  it('logs training data for model improvement', async () => {
    process.env.GOOGLE_GENAI_API_KEY = 'test-key';
    const { addTurnToSession } = await import('@/lib/training');

    const request = new NextRequest('http://localhost:3000/api/coach', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Explain ROI in social media marketing' }],
        context: {
          userName: 'Test',
          currentCourse: 'Course',
          currentModule: 'Module',
          currentLesson: 'Lesson',
          currentAtom: 'Atom',
          atomType: 'reading',
        },
        type: 'chat',
        userId: 'test-user-123',
        lessonId: 'lesson-123',
        conversationId: 'conv-123',
        currentAtomId: 'atom-123',
      }),
    });

    await POST(request);

    // Wait for async operations to complete
    // logTrainingData is called with .catch(() => {}) so we need to let the event loop run
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Verify training turns were logged
    expect(addTurnToSession).toHaveBeenCalledWith(
      expect.any(String),
      'user',
      'Explain ROI in social media marketing'
    );
    expect(addTurnToSession).toHaveBeenCalledWith(
      expect.any(String),
      'tutor',
      expect.any(String)
    );
  });
});
