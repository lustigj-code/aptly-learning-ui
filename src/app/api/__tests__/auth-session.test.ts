/**
 * Auth Session API Tests
 * Phase 7.1: Critical authentication endpoint testing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as createSession, GET as getSession } from '../auth/session/route';
import { NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

// Note: The global mock in src/test/setup.ts provides the base mock for @/lib/firebase/admin
// We customize it here for specific test scenarios

vi.mock('@/lib/monitoring/sentry', () => ({
  captureError: vi.fn(),
}));

describe('POST /api/auth/session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default successful behavior
    vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({
      uid: 'test-user-123',
      email: 'test@example.com',
      email_verified: true,
    } as never);
    vi.mocked(adminAuth.createSessionCookie).mockResolvedValue('session-cookie-string');
  });

  it('creates session cookie with valid ID token', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/session', {
      method: 'POST',
      body: JSON.stringify({
        idToken: 'valid-token',
      }),
    });

    const response = await createSession(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns 400 without idToken', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/session', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await createSession(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('returns 401 with invalid ID token', async () => {
    // Mock verifyIdToken to reject for this test
    vi.mocked(adminAuth.verifyIdToken).mockRejectedValueOnce(new Error('Invalid token'));

    const request = new NextRequest('http://localhost:3000/api/auth/session', {
      method: 'POST',
      body: JSON.stringify({
        idToken: 'invalid-token',
      }),
    });

    const response = await createSession(request);

    expect(response.status).toBe(401);
  });

  it('validates idToken format with Zod', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/session', {
      method: 'POST',
      body: JSON.stringify({
        idToken: 123, // Wrong type
      }),
    });

    const response = await createSession(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid');
  });
});

describe('GET /api/auth/session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 status for session check', async () => {
    // The GET endpoint uses cookies() from next/headers which is mocked
    // It just checks if cookie exists and returns authenticated status
    const request = new NextRequest('http://localhost:3000/api/auth/session');

    const response = await getSession(request);
    const data = await response.json();

    // With the mocked cookies() returning null, it should return unauthenticated
    expect(response.status).toBe(200);
    expect(typeof data.authenticated).toBe('boolean');
  });
});
