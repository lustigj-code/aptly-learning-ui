import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

/**
 * Verify authentication and return user claims
 * Use in API routes to protect endpoints
 */
export async function verifyAuth(request: NextRequest) {
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
 */
export async function createSessionCookie(idToken: string, expiresIn: number = 60 * 60 * 24 * 5) {
  try {
    // Verify the ID token first
    const decodedToken = await adminAuth.verifyIdToken(idToken)

    // Create session cookie (5 days expiry by default)
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn,
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
    customClaims?: Record<string, any>
  }
}

/**
 * Get authenticated user or null
 * Convenience function for API routes that just need the user object
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<{
  uid: string
  email?: string
  emailVerified?: boolean
  customClaims?: Record<string, any>
} | null> {
  const auth = await verifyAuth(request)
  return auth.authenticated ? auth.user : null
}
