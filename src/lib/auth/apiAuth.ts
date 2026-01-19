import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import * as admin from 'firebase-admin'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

/**
 * Verify authentication and return user claims
 * Use in API routes to protect endpoints
 */
export async function verifyAuth(_request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')?.value

    if (!sessionCookie) {
      return {
        authenticated: false,
        user: null,
        error: 'No session found',
      }
    }

    // Verify the session cookie
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true)

    return {
      authenticated: true,
      user: {
        uid: decodedClaims.uid,
        email: decodedClaims.email,
        emailVerified: decodedClaims.email_verified,
        customClaims: decodedClaims,
      },
      error: null,
    }
  } catch (error) {
    console.error('Auth verification error:', error)
    return {
      authenticated: false,
      user: null,
      error: 'Invalid session',
    }
  }
}

/**
 * Require authentication in API routes
 * Returns user or throws 401 error response
 */
export async function requireAuth(request: NextRequest) {
  const auth = await verifyAuth(request)

  if (!auth.authenticated) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  return auth.user
}

/**
 * Require admin role in API routes
 * Returns user or throws 403 error response
 */
export async function requireAdmin(request: NextRequest) {
  const auth = await verifyAuth(request)

  if (!auth.authenticated) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Check for admin role in custom claims
  if (auth.user?.customClaims?.role !== 'admin' && auth.user?.customClaims?.role !== 'super-admin') {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    )
  }

  return auth.user
}

/**
 * Get user's database profile
 * Use after authentication to get user data
 */
export async function getUserProfile(uid: string) {
  try {
    const userDoc = await adminDb.collection('users').doc(uid).get()

    if (!userDoc.exists) {
      return null
    }

    return userDoc.data()
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
}

/**
 * Create session cookie from ID token
 * Call from /api/auth/session after Firebase client auth
 *
 * Note: Firebase requires expiresIn to be in MILLISECONDS between:
 * - Minimum: 5 minutes (300,000 ms)
 * - Maximum: 2 weeks (1,209,600,000 ms)
 */
export async function createSessionCookie(idToken: string, expiresIn: number = 24 * 60 * 60 * 1000) {
  try {
    // Validate expiresIn is within Firebase's allowed range (5 min to 2 weeks in ms)
    const MIN_EXPIRY_MS = 5 * 60 * 1000;        // 5 minutes
    const MAX_EXPIRY_MS = 14 * 24 * 60 * 60 * 1000; // 2 weeks

    const validExpiresIn = Math.max(MIN_EXPIRY_MS, Math.min(MAX_EXPIRY_MS, expiresIn));

    // Verify the ID token first
    const _decodedToken = await adminAuth.verifyIdToken(idToken)

    // Create session cookie (24 hours expiry by default for security)
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: validExpiresIn,
    })

    return {
      success: true,
      sessionCookie,
      expiresIn,
    }
  } catch (error) {
    console.error('Error creating session cookie:', error)
    return {
      success: false,
      sessionCookie: null,
      error: 'Failed to create session',
    }
  }
}

/**
 * Revoke all sessions for a user
 * Call on logout or security events
 */
export async function revokeAllSessions(uid: string) {
  try {
    await adminAuth.revokeRefreshTokens(uid)
    return { success: true }
  } catch (error) {
    console.error('Error revoking sessions:', error)
    return { success: false, error: 'Failed to revoke sessions' }
  }
}

/**
 * Set admin role on user
 * Use Firebase CLI or admin SDK scripts
 */
export async function setAdminRole(uid: string) {
  try {
    await adminAuth.setCustomUserClaims(uid, {
      role: 'admin',
    })
    return { success: true }
  } catch (error) {
    console.error('Error setting admin role:', error)
    return { success: false, error: 'Failed to set admin role' }
  }
}

/**
 * Type for request with authenticated user
 */
export interface AuthenticatedRequest extends NextRequest {
  user?: {
    uid: string
    email?: string
    emailVerified?: boolean
    customClaims?: Record<string, unknown>
  }
}

/**
 * Verify Bearer token authentication from Authorization header
 * Returns authenticated user or error response
 * Use for API routes that receive ID tokens from client
 */
export async function verifyBearerToken(request: NextRequest): Promise<
  | { authenticated: true; userId: string; claims: admin.auth.DecodedIdToken }
  | { authenticated: false; error: NextResponse }
> {
  const authHeader = request.headers.get('authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return {
      authenticated: false,
      error: NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      ),
    }
  }

  try {
    const token = authHeader.slice(7)
    const decodedToken = await adminAuth.verifyIdToken(token)

    return {
      authenticated: true,
      userId: decodedToken.uid,
      claims: decodedToken,
    }
  } catch (error) {
    console.error('Bearer token verification failed:', error)
    return {
      authenticated: false,
      error: NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      ),
    }
  }
}

/**
 * Verify Bearer token and require admin role
 * Returns authenticated admin user or error response
 */
export async function verifyAdminBearerToken(request: NextRequest): Promise<
  | { authenticated: true; userId: string; claims: admin.auth.DecodedIdToken }
  | { authenticated: false; error: NextResponse }
> {
  const result = await verifyBearerToken(request)

  if (!result.authenticated) {
    return result
  }

  // Check for admin claim (set via Firebase Admin SDK, not email domain)
  if (!result.claims.admin) {
    return {
      authenticated: false,
      error: NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      ),
    }
  }

  return result
}

/**
 * Get authenticated user or null
 * Convenience function for API routes that just need the user object
 * Supports both session cookies and Bearer tokens (checks Bearer first for API calls)
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<{
  uid: string
  email?: string
  emailVerified?: boolean
  customClaims?: Record<string, unknown>
} | null> {
  // First, try Bearer token (preferred for API calls from client)
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7)
      const decodedToken = await adminAuth.verifyIdToken(token)
      return {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        customClaims: decodedToken,
      }
    } catch (_error) {
      // Bearer token failed, fall through to session cookie check
      console.debug('Bearer token verification failed, trying session cookie')
    }
  }

  // Fall back to session cookie verification
  const auth = await verifyAuth(request)
  return auth.authenticated ? auth.user : null
}
