/**
 * Coach API Route Tests
 * Phase 7.1: Critical API endpoint testing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../coach/route';
import { NextRequest } from 'next/server';

// Mock Firebase Admin
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
      })),
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

describe('POST /api/coach', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires valid request body with Zod validation', async () => {
    const request = new NextRequest('http://localhost:3000/api/coach', {
      method: 'POST',
      body: JSON.stringify({
        // Invalid: missing required fields
        messages: [],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
    expect(data.details).toBeDefined();
  });

  it('validates message content length', async () => {
    const longMessage = 'a'.repeat(11000); // Exceeds 10k limit

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
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
  });

  it('validates message array length (max 50)', async () => {
    const tooManyMessages = Array.from({ length: 51 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i}`,
    }));

    const request = new NextRequest('http://localhost:3000/api/coach', {
      method: 'POST',
      body: JSON.stringify({
        messages: tooManyMessages,
        context: {
          userName: 'Test',
          currentCourse: 'Course 1',
          currentModule: 'Module 1',
          currentLesson: 'Lesson 1',
          currentAtom: 'Atom 1',
          atomType: 'reading',
        },
        type: 'chat',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
  });

  it('returns mock response when API key is missing', async () => {
    // Temporarily remove API key
    const originalKey = process.env.GOOGLE_GENAI_API_KEY;
    delete process.env.GOOGLE_GENAI_API_KEY;

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
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBeDefined();
    expect(data.conversationId).toBe('demo-conversation');

    // Restore API key
    if (originalKey) process.env.GOOGLE_GENAI_API_KEY = originalKey;
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
    expect(data.tokensUsed).toBeDefined();
    expect(data.modelInfo).toBeDefined();
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
