/**
 * Auth Session API Tests
 * Phase 7.1: Critical authentication endpoint testing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as createSession, GET as getSession } from '../auth/session/route';
import { NextRequest } from 'next/server';

// Mock Firebase Admin
vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: vi.fn((token: string) => {
      if (token === 'valid-token') {
        return Promise.resolve({
          uid: 'test-user-123',
          email: 'test@example.com',
          email_verified: true,
        });
      }
      throw new Error('Invalid token');
    }),
    createSessionCookie: vi.fn(() => Promise.resolve('session-cookie-string')),
    verifySessionCookie: vi.fn((cookie: string) => {
      if (cookie === 'valid-session') {
        return Promise.resolve({
          uid: 'test-user-123',
          email: 'test@example.com',
        });
      }
      throw new Error('Invalid session');
    }),
  },
}));

vi.mock('@/lib/monitoring/sentry', () => ({
  captureError: vi.fn(),
}));

describe('POST /api/auth/session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(data.expiresIn).toBeDefined();

    // Should set session cookie
    const setCookie = response.headers.get('set-cookie');
    expect(setCookie).toContain('session=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Secure');
    expect(setCookie).toContain('SameSite=Lax');
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

  it('returns session info when valid session exists', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/session', {
      headers: {
        Cookie: 'session=valid-session',
      },
    });

    const response = await getSession(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.authenticated).toBe(true);
    expect(data.user).toBeDefined();
  });

  it('returns unauthenticated when no session cookie', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/session');

    const response = await getSession(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.authenticated).toBe(false);
  });

  it('returns unauthenticated with invalid session cookie', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/session', {
      headers: {
        Cookie: 'session=invalid-session',
      },
    });

    const response = await getSession(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.authenticated).toBe(false);
  });
});
