/**
 * Courses API Routes Tests
 * Phase 7.1: Testing course management endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getCourses } from '../courses/route';
import { GET as getCourse } from '../courses/[courseId]/route';
import { NextRequest } from 'next/server';

// Mock Firebase Admin
vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: vi.fn(() => ({
      where: vi.fn(() => ({
        orderBy: vi.fn(() => ({
          get: vi.fn(() =>
            Promise.resolve({
              empty: false,
              docs: [
                {
                  id: 'course-1',
                  data: () => ({
                    number: 1,
                    title: 'Social Media Marketing Fundamentals',
                    description: 'Learn the basics',
                    objectives: ['Understand platforms', 'Create content'],
                    estimatedHours: 10,
                    isLocked: false,
                    prerequisites: [],
                    isPublished: true,
                  }),
                },
              ],
            })
          ),
        })),
      })),
      doc: vi.fn(() => ({
        get: vi.fn(() =>
          Promise.resolve({
            exists: true,
            id: 'course-1',
            data: () => ({
              number: 1,
              title: 'Social Media Marketing Fundamentals',
              isPublished: true,
            }),
          })
        ),
        collection: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            get: vi.fn(() => Promise.resolve({ docs: [] })),
          })),
        })),
      })),
    })),
  },
}));

vi.mock('@/lib/monitoring/sentry', () => ({
  captureError: vi.fn(),
}));

describe('GET /api/courses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns list of published courses', async () => {
    const request = new NextRequest('http://localhost:3000/api/courses');

    const response = await getCourses(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.courses).toBeDefined();
    expect(Array.isArray(data.courses)).toBe(true);
  });

  it('includes user progress when userId provided', async () => {
    const request = new NextRequest('http://localhost:3000/api/courses?userId=test-user');

    const response = await getCourses(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.courses).toBeDefined();
  });

  it('validates userId format', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/courses?userId=' + 'x'.repeat(150) // Too long
    );

    const response = await getCourses(request);

    expect(response.status).toBe(400);
  });

  it('falls back to mock data when Firestore empty', async () => {
    const { adminDb } = await import('@/lib/firebase/admin');
    vi.mocked(adminDb.collection).mockReturnValue({
      where: vi.fn(() => ({
        orderBy: vi.fn(() => ({
          get: vi.fn(() =>
            Promise.resolve({
              empty: true, // No courses in Firestore
              docs: [],
            })
          ),
        })),
      })),
    } as unknown as ReturnType<typeof adminDb.collection>);

    const request = new NextRequest('http://localhost:3000/api/courses');

    const response = await getCourses(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.courses).toBeDefined();
    expect(data.courses.length).toBeGreaterThan(0); // Mock data returned
  });
});

describe('GET /api/courses/[courseId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns course details with modules and lessons', async () => {
    const request = new NextRequest('http://localhost:3000/api/courses/course-1');

    const response = await getCourse(request, {
      params: Promise.resolve({ courseId: 'course-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.course).toBeDefined();
    expect(data.course.id).toBe('course-1');
  });

  it('validates courseId parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/courses/invalid');

    const response = await getCourse(request, {
      params: Promise.resolve({ courseId: '' }), // Empty ID
    });

    expect(response.status).toBe(400);
  });

  it('returns 404 for nonexistent course', async () => {
    const { adminDb } = await import('@/lib/firebase/admin');
    vi.mocked(adminDb.collection).mockReturnValue({
      doc: vi.fn(() => ({
        get: vi.fn(() =>
          Promise.resolve({
            exists: false,
          })
        ),
      })),
    } as unknown as ReturnType<typeof adminDb.collection>);

    const request = new NextRequest('http://localhost:3000/api/courses/nonexistent');

    const response = await getCourse(request, {
      params: Promise.resolve({ courseId: 'nonexistent' }),
    });

    expect(response.status).toBe(404);
  });
});
