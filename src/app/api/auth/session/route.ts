import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSessionCookie, getAuthenticatedUser, revokeAllSessions } from '@/lib/auth/apiAuth'
import { checkRateLimit, rateLimitedResponse } from '@/lib/security/rateLimiter'
import { z } from 'zod'

const sessionSchema = z.object({
  idToken: z.string().min(1, 'ID token required'),
})

/**
 * POST /api/auth/session
 * Creates a secure session cookie from Firebase ID token
 * Called after successful Firebase authentication on client
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit check - 5 requests per minute per IP
    const rateLimitResult = await checkRateLimit(request, 'auth')
    if (!rateLimitResult.success) {
      return rateLimitedResponse(rateLimitResult)
    }

    const body = await request.json()

    // Validate input
    const validation = sessionSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { idToken } = validation.data

    // Create session cookie from ID token
    const result = await createSessionCookie(idToken)

    if (!result.success || !result.sessionCookie) {
      return NextResponse.json(
        { error: result.error || 'Failed to create session' },
        { status: 401 }
      )
    }

    // Set secure HTTP-only cookie
    // Note: maxAge is in seconds, expiresIn is in milliseconds
    const cookieStore = await cookies()
    cookieStore.set('session', result.sessionCookie, {
      maxAge: Math.floor(result.expiresIn / 1000),
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      httpOnly: true, // Prevent JavaScript access
      sameSite: 'lax', // CSRF protection
      path: '/',
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Session created successfully',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Session creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auth/session
 * Get current session status (for debugging/client-side checks)
 */
export async function GET(_request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')

    if (!sessionCookie) {
      return NextResponse.json(
        { authenticated: false },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { authenticated: true },
      { status: 200 }
    )
  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json(
      { authenticated: false },
      { status: 200 }
    )
  }
}

/**
 * DELETE /api/auth/session
 * Logout - revokes session and clears cookie
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get current user before clearing session
    const user = await getAuthenticatedUser(request)

    // Clear the session cookie regardless of auth status
    const cookieStore = await cookies()
    cookieStore.delete('session')

    // If user was authenticated, revoke all Firebase sessions
    if (user?.uid) {
      await revokeAllSessions(user.uid)
    }

    return NextResponse.json(
      { success: true, message: 'Logged out successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Logout error:', error)
    // Still clear cookie even on error
    const cookieStore = await cookies()
    cookieStore.delete('session')

    return NextResponse.json(
      { success: true, message: 'Session cleared' },
      { status: 200 }
    )
  }
}
