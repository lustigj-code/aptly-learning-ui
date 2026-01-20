import { NextResponse } from 'next/server'

/**
 * Security headers for production
 *
 * CSP Notes:
 * - unsafe-eval: Required by Google APIs SDK (gapi) and PostHog
 * - unsafe-inline: Required for Tailwind/Next.js style injection
 * - report-uri: Sends violation reports to /api/csp-report for monitoring
 */
export const securityHeaders = {
  // Content Security Policy
  'Content-Security-Policy': [
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
    "upgrade-insecure-requests",
    "report-uri /api/csp-report",
  ].join('; '),

  // Prevent clickjacking
  'X-Frame-Options': 'SAMEORIGIN',

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // XSS Protection (legacy browsers)
  'X-XSS-Protection': '1; mode=block',

  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions policy (feature policy)
  'Permissions-Policy': [
    'accelerometer=()',
    'camera=()',
    'geolocation=()',
    'gyroscope=()',
    'magnetometer=()',
    'microphone=()',
    'payment=()',
    'usb=()',
  ].join(', '),

  // HSTS (only in production with HTTPS)
  ...(process.env.NODE_ENV === 'production' && {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  }),
}

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    if (value) {
      response.headers.set(key, value)
    }
  })

  return response
}

/**
 * Create response with security headers
 */
export function createSecureResponse(
  body: BodyInit | null,
  init?: ResponseInit
): NextResponse {
  const response = new NextResponse(body, init)
  return applySecurityHeaders(response)
}

/**
 * CORS headers for API routes
 */
export function getCorsHeaders(origin?: string | null): Record<string, string> {
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    'http://localhost:3000',
    'http://localhost:3001',
  ].filter(Boolean) as string[]

  const isAllowed = origin && allowedOrigins.includes(origin)

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0] || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-csrf-token',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  }
}

/**
 * Handle CORS preflight request
 */
export function handleCorsPrelight(request: Request): NextResponse {
  const origin = request.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  })
}
