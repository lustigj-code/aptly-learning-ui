/**
 * API Auth Middleware Unit Tests
 * Phase 7: Testing Foundation
 *
 * Tests for authentication middleware:
 * - Session verification
 * - Admin role checks
 * - Session cookie creation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  verifyAuth,
  requireAuth,
  requireAdmin,
  createSessionCookie,
  getUserProfile,
  getAuthenticatedUser,
} from '../apiAuth';

// ============================================
// MOCK SETUP
// ============================================

// Mock the Firebase admin imports
const mockVerifySessionCookie = vi.fn();
const mockVerifyIdToken = vi.fn();
const mockCreateSessionCookie = vi.fn();
const mockRevokeRefreshTokens = vi.fn();
const mockSetCustomUserClaims = vi.fn();
const mockCollectionGet = vi.fn();

vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifySessionCookie: (...args: unknown[]) => mockVerifySessionCookie(...args),
    verifyIdToken: (...args: unknown[]) => mockVerifyIdToken(...args),
    createSessionCookie: (...args: unknown[]) => mockCreateSessionCookie(...args),
    revokeRefreshTokens: (...args: unknown[]) => mockRevokeRefreshTokens(...args),
    setCustomUserClaims: (...args: unknown[]) => mockSetCustomUserClaims(...args),
  },
  adminDb: {
    collection: () => ({
      doc: () => ({
        get: () => mockCollectionGet(),
      }),
    }),
  },
}));

// Mock cookies
const mockGetCookie = vi.fn();
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: (name: string) => mockGetCookie(name),
  })),
}));

// Helper to create mock NextRequest
function createMockRequest(url: string = 'http://localhost/api/test'): NextRequest {
  return new NextRequest(url);
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================
// verifyAuth TESTS
// ============================================

describe('verifyAuth', () => {
  describe('Missing session', () => {
    it('should return unauthenticated when no session cookie', async () => {
      mockGetCookie.mockReturnValue(undefined);
      const request = createMockRequest();

      const result = await verifyAuth(request);

      expect(result.authenticated).toBe(false);
      expect(result.user).toBeNull();
      expect(result.error).toBe('No session found');
    });

    it('should return unauthenticated when session cookie is empty', async () => {
      mockGetCookie.mockReturnValue({ value: '' });
      const request = createMockRequest();

      const result = await verifyAuth(request);

      expect(result.authenticated).toBe(false);
    });
  });

  describe('Valid session', () => {
    it('should return authenticated user on valid session', async () => {
      mockGetCookie.mockReturnValue({ value: 'valid-session-cookie' });
      mockVerifySessionCookie.mockResolvedValue({
        uid: 'user-123',
        email: 'test@example.com',
        email_verified: true,
      });

      const request = createMockRequest();
      const result = await verifyAuth(request);

      expect(result.authenticated).toBe(true);
      expect(result.user).toEqual({
        uid: 'user-123',
        email: 'test@example.com',
        emailVerified: true,
        customClaims: expect.any(Object),
      });
      expect(result.error).toBeNull();
    });

    it('should pass checkRevoked flag to verifySessionCookie', async () => {
      mockGetCookie.mockReturnValue({ value: 'session-cookie' });
      mockVerifySessionCookie.mockResolvedValue({
        uid: 'user-123',
        email: 'test@example.com',
        email_verified: true,
      });

      const request = createMockRequest();
      await verifyAuth(request);

      expect(mockVerifySessionCookie).toHaveBeenCalledWith('session-cookie', true);
    });
  });

  describe('Invalid session', () => {
    it('should return unauthenticated on expired session', async () => {
      mockGetCookie.mockReturnValue({ value: 'expired-session' });
      mockVerifySessionCookie.mockRejectedValue(new Error('Session expired'));

      const request = createMockRequest();
      const result = await verifyAuth(request);

      expect(result.authenticated).toBe(false);
      expect(result.user).toBeNull();
      expect(result.error).toBe('Invalid session');
    });

    it('should return unauthenticated on malformed session', async () => {
      mockGetCookie.mockReturnValue({ value: 'malformed-token' });
      mockVerifySessionCookie.mockRejectedValue(new Error('Malformed token'));

      const request = createMockRequest();
      const result = await verifyAuth(request);

      expect(result.authenticated).toBe(false);
      expect(result.error).toBe('Invalid session');
    });
  });
});

// ============================================
// requireAuth TESTS
// ============================================

describe('requireAuth', () => {
  it('should return user when authenticated', async () => {
    mockGetCookie.mockReturnValue({ value: 'valid-session' });
    mockVerifySessionCookie.mockResolvedValue({
      uid: 'user-123',
      email: 'test@example.com',
      email_verified: true,
    });

    const request = createMockRequest();
    const result = await requireAuth(request);

    // Should return user object, not NextResponse
    expect(result).toHaveProperty('uid', 'user-123');
  });

  it('should return 401 response when not authenticated', async () => {
    mockGetCookie.mockReturnValue(undefined);

    const request = createMockRequest();
    const result = await requireAuth(request);

    expect(result).toBeInstanceOf(NextResponse);
    const response = result as NextResponse;
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });
});

// ============================================
// requireAdmin TESTS
// ============================================

describe('requireAdmin', () => {
  it('should return user when authenticated as admin', async () => {
    mockGetCookie.mockReturnValue({ value: 'admin-session' });
    mockVerifySessionCookie.mockResolvedValue({
      uid: 'admin-123',
      email: 'admin@example.com',
      email_verified: true,
      role: 'admin',
    });

    const request = createMockRequest();
    const result = await requireAdmin(request);

    expect(result).toHaveProperty('uid', 'admin-123');
  });

  it('should return user when authenticated as super-admin', async () => {
    mockGetCookie.mockReturnValue({ value: 'super-admin-session' });
    mockVerifySessionCookie.mockResolvedValue({
      uid: 'super-admin-123',
      email: 'superadmin@example.com',
      email_verified: true,
      role: 'super-admin',
    });

    const request = createMockRequest();
    const result = await requireAdmin(request);

    expect(result).toHaveProperty('uid', 'super-admin-123');
  });

  it('should return 401 when not authenticated', async () => {
    mockGetCookie.mockReturnValue(undefined);

    const request = createMockRequest();
    const result = await requireAdmin(request);

    expect(result).toBeInstanceOf(NextResponse);
    const response = result as NextResponse;
    expect(response.status).toBe(401);
  });

  it('should return 403 when authenticated but not admin', async () => {
    mockGetCookie.mockReturnValue({ value: 'user-session' });
    mockVerifySessionCookie.mockResolvedValue({
      uid: 'user-123',
      email: 'user@example.com',
      email_verified: true,
      role: 'user', // Not admin
    });

    const request = createMockRequest();
    const result = await requireAdmin(request);

    expect(result).toBeInstanceOf(NextResponse);
    const response = result as NextResponse;
    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.error).toBe('Admin access required');
  });

  it('should return 403 when no role set', async () => {
    mockGetCookie.mockReturnValue({ value: 'user-session' });
    mockVerifySessionCookie.mockResolvedValue({
      uid: 'user-123',
      email: 'user@example.com',
      email_verified: true,
      // No role
    });

    const request = createMockRequest();
    const result = await requireAdmin(request);

    expect(result).toBeInstanceOf(NextResponse);
    const response = result as NextResponse;
    expect(response.status).toBe(403);
  });
});

// ============================================
// createSessionCookie TESTS
// ============================================

describe('createSessionCookie', () => {
  it('should create session cookie on valid ID token', async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: 'user-123',
      email: 'test@example.com',
    });
    mockCreateSessionCookie.mockResolvedValue('new-session-cookie');

    const result = await createSessionCookie('valid-id-token');

    expect(result.success).toBe(true);
    expect(result.sessionCookie).toBe('new-session-cookie');
    expect(result.expiresIn).toBeDefined();
  });

  it('should use default 24-hour expiry', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-123' });
    mockCreateSessionCookie.mockResolvedValue('session-cookie');

    await createSessionCookie('id-token');

    // 24 hours in milliseconds = 24 * 60 * 60 * 1000 = 86400000
    expect(mockCreateSessionCookie).toHaveBeenCalledWith(
      'id-token',
      { expiresIn: 24 * 60 * 60 * 1000 }
    );
  });

  it('should use custom expiry when provided (clamped to min 5 minutes)', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-123' });
    mockCreateSessionCookie.mockResolvedValue('session-cookie');

    // Value below minimum (5 min in ms) gets clamped to minimum
    const customExpiry = 3600; // 3.6 seconds - below minimum
    await createSessionCookie('id-token', customExpiry);

    // Clamped to minimum of 5 minutes (300000 ms)
    expect(mockCreateSessionCookie).toHaveBeenCalledWith(
      'id-token',
      { expiresIn: 5 * 60 * 1000 }
    );
  });

  it('should return failure on invalid ID token', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));

    const result = await createSessionCookie('invalid-token');

    expect(result.success).toBe(false);
    expect(result.sessionCookie).toBeNull();
    expect(result.error).toBe('Failed to create session');
  });

  it('should return failure on cookie creation error', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-123' });
    mockCreateSessionCookie.mockRejectedValue(new Error('Cookie creation failed'));

    const result = await createSessionCookie('valid-token');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to create session');
  });
});

// ============================================
// getUserProfile TESTS
// ============================================

describe('getUserProfile', () => {
  it('should return user profile when exists', async () => {
    mockCollectionGet.mockResolvedValue({
      exists: true,
      data: () => ({
        displayName: 'Test User',
        email: 'test@example.com',
        createdAt: new Date(),
      }),
    });

    const profile = await getUserProfile('user-123');

    expect(profile).toEqual({
      displayName: 'Test User',
      email: 'test@example.com',
      createdAt: expect.any(Date),
    });
  });

  it('should return null when user does not exist', async () => {
    mockCollectionGet.mockResolvedValue({
      exists: false,
    });

    const profile = await getUserProfile('nonexistent-user');

    expect(profile).toBeNull();
  });

  it('should return null on database error', async () => {
    mockCollectionGet.mockRejectedValue(new Error('Database error'));

    const profile = await getUserProfile('user-123');

    expect(profile).toBeNull();
  });
});

// ============================================
// getAuthenticatedUser TESTS
// ============================================

describe('getAuthenticatedUser', () => {
  it('should return user when authenticated', async () => {
    mockGetCookie.mockReturnValue({ value: 'valid-session' });
    mockVerifySessionCookie.mockResolvedValue({
      uid: 'user-123',
      email: 'test@example.com',
      email_verified: true,
    });

    const request = createMockRequest();
    const user = await getAuthenticatedUser(request);

    expect(user).not.toBeNull();
    expect(user?.uid).toBe('user-123');
  });

  it('should return null when not authenticated', async () => {
    mockGetCookie.mockReturnValue(undefined);

    const request = createMockRequest();
    const user = await getAuthenticatedUser(request);

    expect(user).toBeNull();
  });

  it('should return null on verification failure', async () => {
    mockGetCookie.mockReturnValue({ value: 'bad-session' });
    mockVerifySessionCookie.mockRejectedValue(new Error('Verification failed'));

    const request = createMockRequest();
    const user = await getAuthenticatedUser(request);

    expect(user).toBeNull();
  });
});
