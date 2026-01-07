import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { revokeAllSessions, verifyAuth } from '@/lib/auth/apiAuth'

/**
 * POST /api/auth/logout
 * Logout user by revoking session and clearing cookies
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const auth = await verifyAuth(request)

    if (auth.authenticated && auth.user?.uid) {
      // Revoke all refresh tokens (optional but recommended)
      await revokeAllSessions(auth.user.uid)
    }

    // Clear session cookie
    const cookieStore = await cookies()
    cookieStore.delete('session')

    return NextResponse.json(
      {
        success: true,
        message: 'Logged out successfully',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Logout error:', error)

    // Still clear the cookie even if revoke fails
    const cookieStore = await cookies()
    cookieStore.delete('session')

    return NextResponse.json(
      {
        success: true,
        message: 'Logged out',
      },
      { status: 200 }
    )
  }
}
