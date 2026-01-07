import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/privacy', '/help']

// Routes that require admin role
const ADMIN_ROUTES = ['/admin']

// Security headers for all responses
const securityHeaders = {
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
}

// CSP for production
const cspHeader = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com https://www.googleapis.com https://us.i.posthog.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https: http:",
  "media-src 'self' https://www.youtube.com https://youtube.com",
  "frame-src 'self' https://www.youtube.com https://youtube.com https://accounts.google.com https://aptly-study-app.firebaseapp.com",
  "connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://apis.google.com https://us.i.posthog.com https://*.sentry.io wss://*.firebaseio.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ')

/**
 * Middleware for route protection, RBAC, and security headers
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get('session')?.value

  // Check if route is public
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname)

  // If no session and route requires auth
  if (!sessionCookie && !isPublicRoute) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    applySecurityHeaders(response)
    return response
  }

  // If has session and trying to access login/signup
  if (sessionCookie && (pathname === '/login' || pathname === '/signup')) {
    const response = NextResponse.redirect(new URL('/dashboard', request.url))
    applySecurityHeaders(response)
    return response
  }

  // Check admin routes (basic check - full verification in API routes)
  if (pathname.startsWith('/admin')) {
    if (!sessionCookie) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      applySecurityHeaders(response)
      return response
    }
  }

  // Continue with security headers
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
 */
export const config = {
  matcher: [
    // Match all routes except static files and api routes
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
}
