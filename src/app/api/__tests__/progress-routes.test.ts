/**
 * Progress API Routes Tests
 * Phase 7.1: Testing progress tracking endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as completeLesson } from '../progress/complete-lesson/route';
import { POST as updateStreak } from '../progress/update-streak/route';
import { POST as useFreeze } from '../progress/use-freeze/route';
import { NextRequest } from 'next/server';

// Mock Firebase
vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(() =>
          Promise.resolve({
            exists: true,
            data: () => ({
              userId: 'test-user',
              lessonsCompleted: [],
              totalXP: 100,
              currentLevel: 2,
              streak: {
                currentStreak: 5,
                longestStreak: 10,
                lastCompletedDate: new Date().toISOString().split('T')[0],
                freezesAvailable: 2,
                freezesUsed: [],
              },
            }),
          })
        ),
        update: vi.fn(() => Promise.resolve()),
      })),
    })),
  },
  adminAuth: {
    verifyIdToken: vi.fn(() => Promise.resolve({ uid: 'test-user' })),
  },
}));

vi.mock('@/lib/monitoring/sentry', () => ({
  captureError: vi.fn(),
}));

describe('POST /api/progress/complete-lesson', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires authentication', async () => {
    const request = new NextRequest('http://localhost:3000/api/progress/complete-lesson', {
      method: 'POST',
      body: JSON.stringify({
        lessonId: 'lesson-1',
        moduleId: 'module-1',
        courseId: 'course-1',
      }),
    });

    const response = await completeLesson(request);

    expect(response.status).toBe(401);
  });

  it('validates request body with Zod', async () => {
    const request = new NextRequest('http://localhost:3000/api/progress/complete-lesson', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        // Missing required fields
        lessonId: 'lesson-1',
      }),
    });

    const response = await completeLesson(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request');
  });

  it('successfully completes lesson', async () => {
    const request = new NextRequest('http://localhost:3000/api/progress/complete-lesson', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({
        lessonId: 'lesson-1',
        moduleId: 'module-1',
        courseId: 'course-1',
        score: 85,
      }),
    });

    const response = await completeLesson(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.xpEarned).toBeGreaterThan(0);
  });
});

describe('POST /api/progress/update-streak', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires authentication', async () => {
    const request = new NextRequest('http://localhost:3000/api/progress/update-streak', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await updateStreak(request);

    expect(response.status).toBe(401);
  });

  it('updates streak on daily completion', async () => {
    const request = new NextRequest('http://localhost:3000/api/progress/update-streak', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({}),
    });

    const response = await updateStreak(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.streak).toBeDefined();
  });
});

describe('POST /api/progress/use-freeze', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires authentication', async () => {
    const request = new NextRequest('http://localhost:3000/api/progress/use-freeze', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await useFreeze(request);

    expect(response.status).toBe(401);
  });

  it('uses freeze when available', async () => {
    const request = new NextRequest('http://localhost:3000/api/progress/use-freeze', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({}),
    });

    const response = await useFreeze(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns error when no freezes available', async () => {
    // Mock no freezes available
    const { adminDb } = await import('@/lib/firebase/admin');
    vi.mocked(adminDb.collection).mockReturnValue({
      doc: vi.fn(() => ({
        get: vi.fn(() =>
          Promise.resolve({
            exists: true,
            data: () => ({
              streak: {
                freezesAvailable: 0, // No freezes
              },
            }),
          })
        ),
        update: vi.fn(),
      })),
    } as unknown as ReturnType<typeof adminDb.collection>);

    const request = new NextRequest('http://localhost:3000/api/progress/use-freeze', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({}),
    });

    const response = await useFreeze(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('No freezes available');
  });
});
