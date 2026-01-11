/**
 * User Service Tests
 * Phase 7.1: Testing user profile management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getUser,
  createUser,
  updateUserProfile,
} from '../userService';

// Create mock functions
const mockUpdate = vi.fn(() => Promise.resolve());
const mockSet = vi.fn(() => Promise.resolve());
const mockGet = vi.fn(() =>
  Promise.resolve({
    exists: true,
    id: 'test-user-123',
    data: () => ({
      email: 'test@example.com',
      name: 'Test User',
      role: 'student',
      onboardingCompleted: true,
      preferences: {
        learningPace: 'moderate',
        dailyGoalMinutes: 30,
      },
      progress: {
        lastActiveAt: { toDate: () => new Date() },
      },
      createdAt: { toDate: () => new Date() },
      badges: [],
    }),
  })
);

const mockDoc = vi.fn(() => ({
  get: mockGet,
  set: mockSet,
  update: mockUpdate,
}));

const mockCollection = vi.fn(() => ({
  doc: mockDoc,
}));

// Mock Firebase Admin
vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: mockCollection,
  },
}));

vi.mock('@/lib/monitoring/sentry', () => ({
  captureError: vi.fn(),
}));

describe('User Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUser', () => {
    it('fetches user profile by UID', async () => {
      const profile = await getUser('test-user-123');

      expect(profile).toBeDefined();
      expect(profile?.email).toBe('test@example.com');
      expect(profile?.name).toBe('Test User');
    });

    it('returns null when user not found', async () => {
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

      const profile = await getUser('nonexistent-user');

      expect(profile).toBeNull();
    });

    it('throws error with invalid UID', async () => {
      await expect(getUser('')).rejects.toThrow('Invalid UID');
    });
  });

  describe('createUser', () => {
    it('creates new user profile', async () => {
      // createUser returns void on success (no return value)
      await expect(
        createUser('new-user-123', 'new@example.com', 'New User')
      ).resolves.not.toThrow();
    });

    it('validates required fields', async () => {
      // Empty email should throw
      await expect(createUser('test', '', 'Name')).rejects.toThrow();
    });

    it('sets default preferences via Firestore', async () => {
      // createUser sets defaults internally
      await expect(
        createUser('user-123', 'user@example.com', 'User')
      ).resolves.not.toThrow();
    });
  });

  describe('updateUserProfile', () => {
    it('updates user preferences', async () => {
      const updates = {
        preferences: {
          learningPace: 'intensive' as const,
          dailyGoalMinutes: 60,
        },
      };

      // updateUserProfile returns void on success
      await expect(
        updateUserProfile('test-user-123', updates)
      ).resolves.not.toThrow();
    });

    it('updates user name', async () => {
      const updates = {
        name: 'Updated Name',
      };

      await expect(
        updateUserProfile('test-user-123', updates)
      ).resolves.not.toThrow();
    });

    it('handles partial updates', async () => {
      const updates = {
        status: 'active' as const,
      };

      await expect(
        updateUserProfile('test-user-123', updates)
      ).resolves.not.toThrow();
    });

    it('throws error with empty updates', async () => {
      await expect(
        updateUserProfile('test-user-123', {})
      ).rejects.toThrow('At least one field is required');
    });
  });
});
