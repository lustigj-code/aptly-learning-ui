/**
 * Progress Service Tests
 * Phase 7.1: Testing progress tracking service layer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getUserProgress,
  initializeProgress,
  updateProgress,
} from '../progressService';

// Create mock functions at module scope
const getMock = vi.fn();
const setMock = vi.fn();
const updateMock = vi.fn();

// Mock Firebase Admin
vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: getMock,
        set: setMock,
        update: updateMock,
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

describe('Progress Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementations - note: progress is nested inside user document
    getMock.mockResolvedValue({
      exists: true,
      data: () => ({
        progress: {
          atomsCompleted: ['atom-1', 'atom-2'],
          lessonsCompleted: ['lesson-1'],
          xp: 250,
          totalTimeSpentMinutes: 120,
          overallPercentage: 45,
        },
        lastActiveAt: { toDate: () => new Date() },
      }),
    });
    setMock.mockResolvedValue(undefined);
    updateMock.mockResolvedValue(undefined);
  });

  describe('getUserProgress', () => {
    it('fetches user progress by UID', async () => {
      const progress = await getUserProgress('test-user');

      expect(progress).toBeDefined();
      // userId is set from the uid argument, not from stored data
      expect(progress?.userId).toBe('test-user');
      expect(progress?.atomsCompleted).toHaveLength(2);
      expect(progress?.xp).toBe(250);
    });

    it('returns null when progress document not found', async () => {
      getMock.mockResolvedValueOnce({
        exists: false,
      });

      const progress = await getUserProgress('nonexistent-user');

      expect(progress).toBeNull();
    });

    it('throws error with invalid UID', async () => {
      await expect(getUserProgress('')).rejects.toThrow('Invalid uid');
      await expect(getUserProgress(null as unknown as string)).rejects.toThrow();
    });

    it('handles Firestore errors gracefully', async () => {
      getMock.mockRejectedValueOnce(new Error('Firestore error'));

      await expect(getUserProgress('test-user')).rejects.toThrow('Failed to fetch progress');
    });
  });

  describe('initializeProgress', () => {
    it('creates initial progress document for new user', async () => {
      // Mock user doesn't exist, so set() should be called
      getMock.mockResolvedValueOnce({ exists: false });

      await expect(initializeProgress('new-user-123')).resolves.not.toThrow();
      expect(setMock).toHaveBeenCalled();
    });

    it('sets correct default values for new user', async () => {
      // Mock user doesn't exist
      getMock.mockResolvedValueOnce({ exists: false });

      await initializeProgress('user-123');

      expect(setMock).toHaveBeenCalledWith(
        expect.objectContaining({
          progress: expect.objectContaining({
            atomsCompleted: [],
            xp: 0,
            overallPercentage: 0,
          }),
        })
      );
    });

    it('updates existing user progress', async () => {
      // Mock user exists, so update() should be called
      getMock.mockResolvedValueOnce({ exists: true });

      await initializeProgress('existing-user');

      expect(updateMock).toHaveBeenCalled();
    });

    it('throws error with invalid UID', async () => {
      await expect(initializeProgress('')).rejects.toThrow('Invalid uid');
    });
  });

  describe('updateProgress', () => {
    it('updates progress fields', async () => {
      const updates = {
        xp: 300,
        overallPercentage: 50,
      };

      // Function returns void on success, should not throw
      await expect(updateProgress('test-user', updates)).resolves.not.toThrow();
      expect(updateMock).toHaveBeenCalled();
    });

    it('throws error with empty updates', async () => {
      await expect(updateProgress('test-user', {})).rejects.toThrow('At least one field');
    });

    it('handles nested updates correctly', async () => {
      const updates = {
        overallPercentage: 60,
      };

      await updateProgress('test-user', updates);

      expect(updateMock).toHaveBeenCalled();
    });
  });
});
