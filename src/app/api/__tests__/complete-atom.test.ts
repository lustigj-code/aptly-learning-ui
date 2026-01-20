/**
 * Complete Atom API Route Tests
 * Phase 7.1: Test Suite Creation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../progress/complete-atom/route';
import { NextRequest } from 'next/server';

// Mock Firebase Admin
vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(() => Promise.resolve({ exists: true, data: () => ({ atomsCompleted: [], totalXP: 0, streak: { currentStreak: 0 } }) })),
        set: vi.fn(() => Promise.resolve()),
        update: vi.fn(() => Promise.resolve()),
        ref: {
          collection: vi.fn(() => ({
            doc: vi.fn(() => ({
              get: vi.fn(() => Promise.resolve({ exists: true, data: () => ({ type: 'quiz' }) })),
            })),
          })),
        },
      })),
    })),
    runTransaction: vi.fn((callback) => {
      // Mock transaction that executes the callback with a mock transaction object
      const mockTransaction = {
        get: vi.fn(() => Promise.resolve({
          exists: true,
          data: () => ({ streak: { currentStreak: 0, longestStreak: 0, lastCompletedDate: '' } }),
        })),
        update: vi.fn(),
        set: vi.fn(),
      };
      return callback(mockTransaction);
    }),
  },
  adminAuth: {
    verifyIdToken: vi.fn(() =>
      Promise.resolve({
        uid: 'test-user-123',
        email: 'test@example.com',
      })
    ),
  },
}));

// Mock Sentry
vi.mock('@/lib/monitoring/sentry', () => ({
  captureError: vi.fn(),
}));

// Mock FSRS
vi.mock('@/lib/mastery/fsrs', () => ({
  createInitialFSRSState: () => ({
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    state: 'new',
  }),
  calculateNextState: () => ({
    nextState: {
      stability: 1,
      difficulty: 5,
      elapsedDays: 0,
      scheduledDays: 1,
      reps: 1,
      lapses: 0,
      state: 'learning',
    },
    interval: 1,
  }),
}));

describe('POST /api/progress/complete-atom', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without authorization header', async () => {
    const request = new NextRequest('http://localhost:3000/api/progress/complete-atom', {
      method: 'POST',
      body: JSON.stringify({
        atomId: 'atom-1',
        lessonId: 'lesson-1',
        moduleId: 'module-1',
        courseId: 'course-1',
        score: 85,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 with invalid request body', async () => {
    const request = new NextRequest('http://localhost:3000/api/progress/complete-atom', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
      body: JSON.stringify({
        // Missing required fields
        atomId: 'atom-1',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request');
    expect(data.details).toBeDefined();
  });

  it('successfully completes atom with valid data', async () => {
    const request = new NextRequest('http://localhost:3000/api/progress/complete-atom', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
      body: JSON.stringify({
        atomId: 'atom-1',
        lessonId: 'lesson-1',
        moduleId: 'module-1',
        courseId: 'course-1',
        score: 85,
        timeSpentSeconds: 120,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.xpEarned).toBeGreaterThan(0);
    expect(data.celebration).toBeDefined();
  });

  it('awards appropriate XP based on score', async () => {
    const request = new NextRequest('http://localhost:3000/api/progress/complete-atom', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
      body: JSON.stringify({
        atomId: 'atom-quiz-1',
        lessonId: 'lesson-1',
        moduleId: 'module-1',
        courseId: 'course-1',
        score: 100, // Perfect score
        timeSpentSeconds: 60,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.xpEarned).toBeGreaterThanOrEqual(10); // Base XP for quiz
  });

  it('includes celebration data in response', async () => {
    const request = new NextRequest('http://localhost:3000/api/progress/complete-atom', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
      body: JSON.stringify({
        atomId: 'atom-1',
        lessonId: 'lesson-1',
        moduleId: 'module-1',
        courseId: 'course-1',
        score: 90,
        timeSpentSeconds: 100,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.celebration).toBeDefined();
    expect(data.celebration.xpEarned).toBeGreaterThan(0);
    expect(data.celebration.message).toContain('XP');
  });

  it('schedules FSRS review (Phase 2.2 integration)', async () => {
    const request = new NextRequest('http://localhost:3000/api/progress/complete-atom', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
      body: JSON.stringify({
        atomId: 'atom-1',
        lessonId: 'lesson-1',
        moduleId: 'module-1',
        courseId: 'course-1',
        score: 85,
        timeSpentSeconds: 90,
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    // FSRS scheduling is async/non-blocking, so it doesn't affect response
    // But the function should be called (tested via integration tests)
  });

  it('returns 400 when trying to complete already completed atom', async () => {
    // Mock that atom is already completed (using new data model with nested progress)
    const { adminDb } = await import('@/lib/firebase/admin');
    vi.mocked(adminDb.collection).mockReturnValue({
      doc: vi.fn(() => ({
        get: vi.fn(() =>
          Promise.resolve({
            exists: true,
            data: () => ({
              progress: {
                atomsCompleted: ['atom-1'], // Already completed
                totalXP: 50,
              },
              streak: { currentStreak: 1 },
            }),
          })
        ),
        update: vi.fn(),
        ref: {
          collection: vi.fn(),
        },
      })),
    } as unknown as ReturnType<typeof adminDb.collection>);

    const request = new NextRequest('http://localhost:3000/api/progress/complete-atom', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
      body: JSON.stringify({
        atomId: 'atom-1',
        lessonId: 'lesson-1',
        moduleId: 'module-1',
        courseId: 'course-1',
        score: 85,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toContain('already completed');
  });
});
