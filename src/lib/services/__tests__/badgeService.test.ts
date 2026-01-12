/**
 * Badge Service Tests
 * Phase 7.1: Testing badge service layer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getBadge,
  getUserBadges,
  awardBadge,
  userHasBadge,
  checkBadgeCriteria,
  getUserBadgeCount,
} from '../badgeService';

// Create mock functions at module scope
const docGetMock = vi.fn();
const docSetMock = vi.fn();
const docUpdateMock = vi.fn();
const collectionGetMock = vi.fn();

// Mock Firebase Admin with support for both collection().get() and collection().doc().get()
vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: vi.fn(() => ({
      // Collection-level get (for getBadges, checkBadgeCriteria)
      get: collectionGetMock,
      // Document-level operations
      doc: vi.fn(() => ({
        get: docGetMock,
        set: docSetMock,
        update: docUpdateMock,
      })),
    })),
  },
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: vi.fn(() => new Date()),
    arrayUnion: vi.fn((items) => items),
    increment: vi.fn((n) => n),
  },
}));

vi.mock('@/lib/monitoring/sentry', () => ({
  captureError: vi.fn(),
}));

describe('Badge Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock: user document with badges array
    docGetMock.mockResolvedValue({
      exists: true,
      id: 'test-user',
      data: () => ({
        badges: [
          { id: 'badge-1', title: 'First Steps', earnedAt: new Date() },
          { id: 'badge-2', title: 'Explorer', earnedAt: new Date() },
        ],
        progress: {
          atomsCompleted: ['a1', 'a2', 'a3'],
          lessonsCompleted: ['l1'],
          totalTimeSpentMinutes: 120,
        },
        streak: {
          currentStreak: 7,
        },
      }),
    });

    // Default mock: collection of badges
    collectionGetMock.mockResolvedValue({
      docs: [
        {
          id: 'badge-1',
          data: () => ({
            type: 'achievement',
            title: 'First Steps',
            description: 'Complete your first atom',
            icon: '🎯',
            criteria: { type: 'completion', threshold: 1 },
            rarity: 'common',
          }),
        },
        {
          id: 'badge-streak',
          data: () => ({
            type: 'streak',
            title: 'Week Warrior',
            description: 'Maintain a 7-day streak',
            icon: '🔥',
            criteria: { type: 'streak', threshold: 7 },
            rarity: 'rare',
          }),
        },
      ],
      forEach: function(callback: (doc: any) => void) {
        this.docs.forEach(callback);
      },
    });

    docSetMock.mockResolvedValue(undefined);
    docUpdateMock.mockResolvedValue(undefined);
  });

  describe('getBadge', () => {
    it('fetches a single badge by ID', async () => {
      docGetMock.mockResolvedValueOnce({
        exists: true,
        id: 'badge-1',
        data: () => ({
          type: 'achievement',
          title: 'First Steps',
          description: 'Complete your first atom',
          icon: '🎯',
          criteria: { type: 'completion', threshold: 1 },
          rarity: 'common',
        }),
      });

      const badge = await getBadge('badge-1');

      expect(badge).toBeDefined();
      expect(badge?.id).toBe('badge-1');
      expect(badge?.title).toBe('First Steps');
    });

    it('returns null when badge not found', async () => {
      docGetMock.mockResolvedValueOnce({
        exists: false,
      });

      const badge = await getBadge('nonexistent-badge');

      expect(badge).toBeNull();
    });

    it('throws error with invalid badgeId', async () => {
      await expect(getBadge('')).rejects.toThrow('Invalid badgeId');
    });
  });

  describe('getUserBadges', () => {
    it('fetches badges for a user', async () => {
      const badges = await getUserBadges('test-user');

      expect(badges).toHaveLength(2);
      expect(badges[0].id).toBe('badge-1');
      expect(badges[1].id).toBe('badge-2');
    });

    it('returns empty array when user has no badges', async () => {
      docGetMock.mockResolvedValueOnce({
        exists: true,
        data: () => ({ badges: [] }),
      });

      const badges = await getUserBadges('test-user');

      expect(badges).toHaveLength(0);
    });

    it('returns empty array when user document not found', async () => {
      docGetMock.mockResolvedValueOnce({
        exists: false,
      });

      const badges = await getUserBadges('nonexistent-user');

      expect(badges).toHaveLength(0);
    });

    it('throws error with invalid UID', async () => {
      await expect(getUserBadges('')).rejects.toThrow('Invalid UID');
    });
  });

  describe('userHasBadge', () => {
    it('returns true when user has the badge', async () => {
      const hasBadge = await userHasBadge('test-user', 'badge-1');

      expect(hasBadge).toBe(true);
    });

    it('returns false when user does not have the badge', async () => {
      const hasBadge = await userHasBadge('test-user', 'badge-99');

      expect(hasBadge).toBe(false);
    });

    it('throws error when uid or badgeId is missing', async () => {
      await expect(userHasBadge('', 'badge-1')).rejects.toThrow('required');
      await expect(userHasBadge('test-user', '')).rejects.toThrow('required');
    });
  });

  describe('awardBadge', () => {
    it('awards a badge to user', async () => {
      // Mock badge exists
      docGetMock.mockResolvedValueOnce({
        exists: true,
        id: 'badge-new',
        data: () => ({
          type: 'achievement',
          title: 'New Badge',
          description: 'A new badge',
          icon: '⭐',
          criteria: { type: 'completion', threshold: 1 },
          rarity: 'common',
        }),
      });

      await expect(awardBadge('test-user', 'badge-new')).resolves.not.toThrow();
      expect(docUpdateMock).toHaveBeenCalled();
    });

    it('throws error when badge does not exist', async () => {
      docGetMock.mockResolvedValueOnce({
        exists: false,
      });

      await expect(awardBadge('test-user', 'nonexistent')).rejects.toThrow('not found');
    });

    it('throws error when uid or badgeId is missing', async () => {
      await expect(awardBadge('', 'badge-1')).rejects.toThrow('required');
      await expect(awardBadge('test-user', '')).rejects.toThrow('required');
    });
  });

  describe('checkBadgeCriteria', () => {
    it('returns array of newly awarded badge IDs', async () => {
      // User doesn't have badge-streak yet, but meets criteria (7-day streak)
      docGetMock.mockResolvedValue({
        exists: true,
        data: () => ({
          badges: [{ id: 'badge-1' }], // Only has badge-1
          progress: {
            atomsCompleted: ['a1', 'a2', 'a3'],
          },
          streak: {
            currentStreak: 7, // Meets streak badge criteria
          },
        }),
      });

      const awarded = await checkBadgeCriteria('test-user');

      expect(Array.isArray(awarded)).toBe(true);
    });

    it('returns empty array when no new badges earned', async () => {
      // User already has all badges that criteria match
      docGetMock.mockResolvedValue({
        exists: true,
        data: () => ({
          badges: [{ id: 'badge-1' }, { id: 'badge-streak' }],
          progress: { atomsCompleted: ['a1'] },
          streak: { currentStreak: 7 },
        }),
      });

      const awarded = await checkBadgeCriteria('test-user');

      expect(awarded).toEqual([]);
    });

    it('throws error when user not found', async () => {
      docGetMock.mockResolvedValueOnce({
        exists: false,
      });

      await expect(checkBadgeCriteria('nonexistent-user')).rejects.toThrow('User not found');
    });

    it('throws error with invalid UID', async () => {
      await expect(checkBadgeCriteria('')).rejects.toThrow('Invalid UID');
    });
  });

  describe('getUserBadgeCount', () => {
    it('returns count of user badges', async () => {
      const count = await getUserBadgeCount('test-user');

      expect(count).toBe(2);
    });

    it('returns 0 when user has no badges', async () => {
      docGetMock.mockResolvedValueOnce({
        exists: true,
        data: () => ({ badges: [] }),
      });

      const count = await getUserBadgeCount('test-user');

      expect(count).toBe(0);
    });

    it('throws error with invalid UID', async () => {
      await expect(getUserBadgeCount('')).rejects.toThrow('Invalid UID');
    });
  });
});
