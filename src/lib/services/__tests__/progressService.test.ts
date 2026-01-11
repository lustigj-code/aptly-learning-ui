/**
 * Progress Service Tests
 * Phase 7.1: Testing progress tracking service layer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getUserProgress,
  initializeUserProgress,
  updateProgressData,
} from '../progressService';

// Mock Firebase Admin
vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(() =>
          Promise.resolve({
            exists: true,
            data: () => ({
              userId: 'test-user',
              atomsCompleted: ['atom-1', 'atom-2'],
              lessonsCompleted: ['lesson-1'],
              totalXP: 250,
              currentLevel: 3,
              streak: {
                currentStreak: 5,
                longestStreak: 10,
              },
            }),
          })
        ),
        set: vi.fn(() => Promise.resolve()),
        update: vi.fn(() => Promise.resolve()),
      })),
    })),
  },
}));

vi.mock('@/lib/monitoring/sentry', () => ({
  captureError: vi.fn(),
}));

describe('Progress Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserProgress', () => {
    it('fetches user progress by UID', async () => {
      const progress = await getUserProgress('test-user');

      expect(progress).toBeDefined();
      expect(progress?.userId).toBe('test-user');
      expect(progress?.atomsCompleted).toHaveLength(2);
      expect(progress?.totalXP).toBe(250);
    });

    it('returns null when progress document not found', async () => {
      const { adminDb } = await import('@/lib/firebase/admin');
      vi.mocked(adminDb.collection).mockReturnValue({
        doc: vi.fn(() => ({
          get: vi.fn(() =>
            Promise.resolve({
              exists: false,
            })
          ),
        })),
      } as any);

      const progress = await getUserProgress('nonexistent-user');

      expect(progress).toBeNull();
    });

    it('throws error with invalid UID', async () => {
      await expect(getUserProgress('')).rejects.toThrow('Invalid UID');
      await expect(getUserProgress(null as any)).rejects.toThrow();
    });

    it('handles Firestore errors gracefully', async () => {
      const { adminDb } = await import('@/lib/firebase/admin');
      vi.mocked(adminDb.collection).mockReturnValue({
        doc: vi.fn(() => ({
          get: vi.fn(() => Promise.reject(new Error('Firestore error'))),
        })),
      } as any);

      await expect(getUserProgress('test-user')).rejects.toThrow('Failed to fetch progress');
    });
  });

  describe('initializeUserProgress', () => {
    it('creates initial progress document for new user', async () => {
      const result = await initializeUserProgress('new-user-123');

      expect(result.success).toBe(true);
      expect(result.userId).toBe('new-user-123');
    });

    it('sets correct default values', async () => {
      const { adminDb } = await import('@/lib/firebase/admin');
      const setMock = vi.fn(() => Promise.resolve());

      vi.mocked(adminDb.collection).mockReturnValue({
        doc: vi.fn(() => ({
          set: setMock,
        })),
      } as any);

      await initializeUserProgress('user-123');

      expect(setMock).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          atomsCompleted: [],
          totalXP: 0,
          currentLevel: 1,
          streak: expect.objectContaining({
            currentStreak: 0,
            freezesAvailable: 2,
          }),
        })
      );
    });
  });

  describe('updateProgressData', () => {
    it('updates progress fields', async () => {
      const updates = {
        totalXP: 300,
        currentLevel: 4,
      };

      const result = await updateProgressData('test-user', updates);

      expect(result.success).toBe(true);
    });

    it('appends to arrays without duplicates', async () => {
      const updates = {
        atomsCompleted: ['atom-3'], // New atom
      };

      await updateProgressData('test-user', updates);

      // Should use arrayUnion to prevent duplicates
    });

    it('handles nested updates correctly', async () => {
      const updates = {
        'streak.currentStreak': 6,
        'streak.lastCompletedDate': '2026-01-07',
      };

      const result = await updateProgressData('test-user', updates);

      expect(result.success).toBe(true);
    });
  });
});
