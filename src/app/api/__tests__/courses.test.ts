/**
 * Courses API Routes Tests
 * Phase 7.1: Testing course management endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getCourses } from '../courses/route';
import { GET as getCourse } from '../courses/[courseId]/route';
import { NextRequest } from 'next/server';
import '@/lib/firebase/admin';

// Note: Global mock in src/test/setup.ts provides chainable Firestore mock

// Mock other dependencies
vi.mock('@/lib/monitoring/sentry', () => ({
  captureError: vi.fn(),
}));

vi.mock('@/lib/data/userProgressLayer', () => ({
  getUserProgress: vi.fn(() => Promise.resolve({
    progress: {
      atomsCompleted: [],
      lessonsCompleted: [],
      modulesCompleted: [],
      coursesCompleted: [],
      totalXP: 0,
      currentLevel: 1,
      overallPercentage: 0,
    },
    streak: {
      currentStreak: 0,
      longestStreak: 0,
    },
    source: 'users',
  })),
  getAtomsCompleted: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@/data/courseRegistry', () => ({
  getAllCourses: vi.fn(() => [
    {
      id: 'mock-course-1',
      number: 1,
      title: 'Mock Course 1',
      description: 'A mock course for testing',
      objectives: ['Learn testing'],
      estimatedHours: 5,
      isLocked: false,
      prerequisites: [],
    },
  ]),
}));

describe('GET /api/courses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns list of courses', async () => {
    // The global mock returns { empty: false, docs: [] } by default
    // This means Firestore "has data" but with no docs, returning empty array
    // The route only falls back to registry when snapshot.empty is true
    const request = new NextRequest('http://localhost:3000/api/courses');

    const response = await getCourses(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.courses).toBeDefined();
    expect(Array.isArray(data.courses)).toBe(true);
    // With the mock, we get an empty courses array (Firestore returns no docs)
    // This is expected behavior - the mock simulates a Firestore with no published courses
  });

  it('handles userId query parameter without error', async () => {
    const request = new NextRequest('http://localhost:3000/api/courses?userId=test-user');

    const response = await getCourses(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.courses).toBeDefined();
  });
});

describe('GET /api/courses/[courseId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns course details when course exists', async () => {
    // The global mock returns { exists: true, data: () => ({}) } by default
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
});
