/**
 * Badges API Route Tests
 * Phase 7.1: Testing badge criteria and progress tracking
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as checkCriteria } from '../badges/check-criteria/route';
import { GET as getProgress } from '../badges/progress/route';
import { NextRequest } from 'next/server';

// Mock Firebase Admin
vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(() =>
          Promise.resolve({
            exists: true,
            data: () => ({
              atomsCompleted: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10'],
              lessonsCompleted: ['l1', 'l2', 'l3'],
              totalXP: 500,
              currentLevel: 4,
              streak: {
                currentStreak: 7,
                longestStreak: 14,
              },
            }),
          })
        ),
      })),
      where: vi.fn(() => ({
        get: vi.fn(() =>
          Promise.resolve({
            docs: [
              {
                id: 'first-steps',
                data: () => ({
                  title: 'First Steps',
                  criteria: { type: 'completion', threshold: 1 },
                }),
              },
              {
                id: 'week-warrior',
                data: () => ({
                  title: 'Week Warrior',
                  criteria: { type: 'streak', threshold: 7 },
                }),
              },
            ],
          })
        ),
      })),
    })),
  },
}));

describe('GET /api/badges/check-criteria', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires userId query parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/badges/check-criteria');

    const response = await checkCriteria(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('returns badge eligibility based on user progress', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/badges/check-criteria?userId=test-user-123'
    );

    const response = await checkCriteria(request);

    expect(response.status).toBe(200);
  });

  it('validates userId format', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/badges/check-criteria?userId=' + 'x'.repeat(150) // Too long
    );

    const response = await checkCriteria(request);

    expect(response.status).toBe(400);
  });
});

describe('GET /api/badges/progress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires userId query parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/badges/progress');

    const response = await getProgress(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('returns progress toward all badges', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/badges/progress?userId=test-user-123'
    );

    const response = await getProgress(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.badges).toBeDefined();
    expect(Array.isArray(data.badges)).toBe(true);
  });

  it('shows earned badges separately from unearned', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/badges/progress?userId=test-user-123'
    );

    const response = await getProgress(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Response should indicate which badges are earned vs in progress
  });
});
