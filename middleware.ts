import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Security headers for all responses
const securityHeaders = {
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
}

// CSP for production
// Note: unsafe-eval is currently required for:
// - Google APIs SDK (gapi) uses eval internally
// - PostHog analytics SDK
// - Some Next.js dev mode features
// TODO: Monitor CSP reports to identify if we can remove unsafe-eval
const cspHeader = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com https://www.googleapis.com https://us.i.posthog.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https: http:",
  "media-src 'self' https://www.youtube.com https://youtube.com https://firebasestorage.googleapis.com",
  "frame-src 'self' https://www.youtube.com https://youtube.com https://accounts.google.com https://aptly-study-app.firebaseapp.com",
  "connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://apis.google.com https://us.i.posthog.com https://*.sentry.io wss://*.firebaseio.com https://firebasestorage.googleapis.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "report-uri /api/csp-report",
].join('; ')

/**
 * Middleware for security headers only
 *
 * Note: Auth protection is handled client-side via Firebase Auth hooks.
 * Server-side session cookies require Firebase Admin SDK which isn't configured.
 * Each protected page uses the useAuth hook for client-side auth checking.
 */
export async function middleware(_request: NextRequest) {
  // Apply security headers to all responses
  const response = NextResponse.next()
  applySecurityHeaders(response)
  return response
}

/**
 * Apply security headers to response
 */
function applySecurityHeaders(response: NextResponse) {
  // Apply standard security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // Apply CSP
  response.headers.set('Content-Security-Policy', cspHeader)

  // HSTS in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }
}

/**
 * Configure which routes should go through middleware
 * Note: API routes are excluded since they handle their own headers
 * The CSP report endpoint (/api/csp-report) must be accessible without CSP headers
 */
export const config = {
  matcher: [
    // Match all routes except static files and api routes
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
}
