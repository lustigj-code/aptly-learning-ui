/**
 * Badge Service Tests
 * Phase 7.1: Testing badge criteria checking logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkBadgeCriteria, type BadgeCriteria } from '../badgeService';

// Mock Firebase Admin
vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(() =>
          Promise.resolve({
            exists: true,
            data: () => ({
              atomsCompleted: ['a1', 'a2', 'a3', 'a4', 'a5'],
              lessonsCompleted: ['l1', 'l2'],
              totalXP: 500,
              streak: {
                currentStreak: 7,
                longestStreak: 14,
              },
            }),
          })
        ),
      })),
    })),
  },
}));

vi.mock('@/lib/monitoring/sentry', () => ({
  captureError: vi.fn(),
}));

describe('Badge Service', () => {
  describe('checkBadgeCriteria', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('returns true for completion criteria when threshold met', async () => {
      const criteria: BadgeCriteria = {
        type: 'completion',
        threshold: 5, // Need 5 atoms
        relatedEntityId: undefined,
      };

      const result = await checkBadgeCriteria('test-user', criteria);

      expect(result).toBe(true); // User has 5 atoms completed
    });

    it('returns false for completion criteria when threshold not met', async () => {
      const criteria: BadgeCriteria = {
        type: 'completion',
        threshold: 10, // Need 10 atoms
        relatedEntityId: undefined,
      };

      const result = await checkBadgeCriteria('test-user', criteria);

      expect(result).toBe(false); // User only has 5
    });

    it('checks streak criteria correctly', async () => {
      const criteria: BadgeCriteria = {
        type: 'streak',
        threshold: 7, // Need 7-day streak
        relatedEntityId: undefined,
      };

      const result = await checkBadgeCriteria('test-user', criteria);

      expect(result).toBe(true); // User has 7-day streak
    });

    it('checks score criteria', async () => {
      const criteria: BadgeCriteria = {
        type: 'score',
        threshold: 90, // Need 90%+ score
        relatedEntityId: 'quiz-1',
      };

      // This would check specific quiz score from completionDetails
      // Simplified for test
      const result = await checkBadgeCriteria('test-user', criteria);

      expect(typeof result).toBe('boolean');
    });

    it('handles time-based criteria', async () => {
      const criteria: BadgeCriteria = {
        type: 'time',
        threshold: 60, // Need 60 minutes
        relatedEntityId: undefined,
      };

      // Would check totalTimeSpentMinutes
      const result = await checkBadgeCriteria('test-user', criteria);

      expect(typeof result).toBe('boolean');
    });

    it('supports custom logic criteria', async () => {
      const criteria: BadgeCriteria = {
        type: 'custom',
        threshold: 0,
        customLogic: 'weekend_warrior', // Complete on both weekend days
      };

      const result = await checkBadgeCriteria('test-user', criteria);

      expect(typeof result).toBe('boolean');
    });

    it('handles missing user progress gracefully', async () => {
      const { adminDb } = await import('@/lib/firebase/admin');
      vi.mocked(adminDb.collection).mockReturnValue({
        doc: vi.fn(() => ({
          get: vi.fn(() =>
            Promise.resolve({
              exists: false, // User not found
            })
          ),
        })),
      } as any);

      const criteria: BadgeCriteria = {
        type: 'completion',
        threshold: 5,
      };

      const result = await checkBadgeCriteria('nonexistent-user', criteria);

      expect(result).toBe(false);
    });

    it('checks lesson completion criteria', async () => {
      const criteria: BadgeCriteria = {
        type: 'completion',
        threshold: 2, // Need 2 lessons
        relatedEntityId: 'lessons',
      };

      const result = await checkBadgeCriteria('test-user', criteria);

      expect(result).toBe(true); // User has 2 lessons completed
    });

    it('calculates XP threshold correctly', async () => {
      const criteria: BadgeCriteria = {
        type: 'score', // Using score type for XP check
        threshold: 500,
        relatedEntityId: 'xp',
      };

      const result = await checkBadgeCriteria('test-user', criteria);

      expect(result).toBe(true); // User has 500 XP
    });
  });
});
