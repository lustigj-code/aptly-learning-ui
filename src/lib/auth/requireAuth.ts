/**
 * IDOR Protection Utility
 *
 * Centralized authentication and authorization utility that:
 * 1. Verifies Bearer tokens from Authorization header
 * 2. Prevents IDOR attacks by validating userId params match authenticated user
 * 3. Supports admin override for admin-only routes
 *
 * Usage:
 *   const userId = await requireAuthWithIdor(request);
 *   // Returns verified userId or throws NextResponse error
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

/**
 * Custom error class for authentication failures
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401,
    public errorCode: string = 'UNAUTHORIZED'
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Options for requireAuthWithIdor
 */
export interface RequireAuthOptions {
  /**
   * If true, allows userId query param but validates it matches authenticated user
   * If false (default), ignores userId param and just returns authenticated user
   */
  allowUserId?: boolean;

  /**
   * If true, also checks for userId in request body (for POST requests)
   */
  checkBody?: boolean;

  /**
   * If true, allows admins to access any user's data
   * Admin status is checked via custom claims or user document role
   */
  allowAdminOverride?: boolean;

  /**
   * Parsed request body (to avoid double-parsing)
   * Only used when checkBody is true
   */
  parsedBody?: Record<string, unknown>;
}

/**
 * Result of successful authentication
 */
export interface AuthResult {
  /** The authenticated user's ID (always from the verified token) */
  userId: string;

  /** Whether the user is an admin */
  isAdmin: boolean;

  /** The target userId being accessed (same as userId unless admin override) */
  targetUserId: string;
}

/**
 * Verify Bearer token and optionally validate IDOR protection
 *
 * This is the primary function for API route authentication with IDOR protection.
 *
 * @param request - NextRequest object
 * @param options - Configuration options
 * @returns AuthResult with verified userId or throws AuthError
 *
 * @example
 * // Basic usage - just verify authentication
 * const { userId } = await requireAuthWithIdor(request);
 *
 * @example
 * // With IDOR protection - validate userId param matches authenticated user
 * const { targetUserId } = await requireAuthWithIdor(request, { allowUserId: true });
 *
 * @example
 * // Admin route - allow admin to access any user
 * const { targetUserId, isAdmin } = await requireAuthWithIdor(request, {
 *   allowUserId: true,
 *   allowAdminOverride: true,
 * });
 */
export async function requireAuthWithIdor(
  request: NextRequest,
  options: RequireAuthOptions = {}
): Promise<AuthResult> {
  const { allowUserId = false, checkBody = false, allowAdminOverride = false, parsedBody } = options;

  // Extract and verify Bearer token
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Authorization header with Bearer token required', 401, 'MISSING_TOKEN');
  }

  let authenticatedUserId: string;
  let isAdmin = false;

  try {
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    authenticatedUserId = decodedToken.uid;

    // Check admin claim from token
    if (decodedToken.admin === true) {
      isAdmin = true;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token verification failed';
    throw new AuthError(`Invalid token: ${message}`, 401, 'INVALID_TOKEN');
  }

  // If we need to check admin status from Firestore (when not in token claims)
  if (allowAdminOverride && !isAdmin) {
    try {
      const userDoc = await adminDb.collection('users').doc(authenticatedUserId).get();
      const userData = userDoc.data();
      if (userData?.role === 'admin' || userData?.role === 'super-admin') {
        isAdmin = true;
      }
    } catch {
      // Continue without admin status if fetch fails
    }
  }

  // Default target is the authenticated user
  let targetUserId = authenticatedUserId;

  // Check for userId parameter if IDOR validation is enabled
  if (allowUserId) {
    // Check query params first
    const searchParams = request.nextUrl.searchParams;
    let requestedUserId = searchParams.get('userId');

    // Check body if enabled and no query param found
    if (!requestedUserId && checkBody && parsedBody) {
      requestedUserId = parsedBody.userId as string | null;
    }

    // If a userId was provided, validate it
    if (requestedUserId) {
      // Allow if matches authenticated user
      if (requestedUserId === authenticatedUserId) {
        targetUserId = requestedUserId;
      }
      // Allow if admin override is enabled and user is admin
      else if (allowAdminOverride && isAdmin) {
        targetUserId = requestedUserId;
      }
      // Otherwise, IDOR attempt - reject
      else {
        throw new AuthError(
          'Cannot access other users data',
          403,
          'IDOR_VIOLATION'
        );
      }
    }
  }

  return {
    userId: authenticatedUserId,
    isAdmin,
    targetUserId,
  };
}

/**
 * Simple wrapper that returns userId or NextResponse error
 *
 * Use this for cleaner code when you just need the userId string:
 *
 * @example
 * const result = await getAuthenticatedUserId(request, { allowUserId: true });
 * if (result instanceof NextResponse) return result;
 * const userId = result;
 */
export async function getAuthenticatedUserId(
  request: NextRequest,
  options: RequireAuthOptions = {}
): Promise<string | NextResponse> {
  try {
    const { targetUserId } = await requireAuthWithIdor(request, options);
    return targetUserId;
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message, code: error.errorCode },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
  }
}

/**
 * Validate that a userId from request body matches authenticated user
 *
 * Use for POST/PUT requests where userId comes from body instead of query params.
 *
 * @example
 * const body = await request.json();
 * const result = await validateBodyUserId(request, body.userId);
 * if (result instanceof NextResponse) return result;
 * const userId = result;
 */
export async function validateBodyUserId(
  request: NextRequest,
  bodyUserId: string | undefined | null,
  options: Omit<RequireAuthOptions, 'checkBody' | 'parsedBody'> = {}
): Promise<string | NextResponse> {
  try {
    const { userId: authenticatedUserId, isAdmin } = await requireAuthWithIdor(request, {
      ...options,
      allowUserId: false, // We'll check manually
    });

    // If no userId in body, use authenticated user
    if (!bodyUserId) {
      return authenticatedUserId;
    }

    // Allow if matches authenticated user
    if (bodyUserId === authenticatedUserId) {
      return bodyUserId;
    }

    // Allow if admin override
    if (options.allowAdminOverride && isAdmin) {
      return bodyUserId;
    }

    // IDOR attempt
    return NextResponse.json(
      { error: 'Cannot access other users data', code: 'IDOR_VIOLATION' },
      { status: 403 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message, code: error.errorCode },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
  }
}
