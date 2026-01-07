import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

// Initialize Redis client if credentials are available
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null

// Auth endpoints: 5 requests per minute per IP (brute force protection)
const authLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      analytics: true,
      prefix: 'ratelimit:auth',
    })
  : null

// Profile creation: 3 requests per hour per IP (spam protection)
const profileLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '1 h'),
      analytics: true,
      prefix: 'ratelimit:profile',
    })
  : null

// General API: 60 requests per minute per IP
const generalLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, '1 m'),
      analytics: true,
      prefix: 'ratelimit:general',
    })
  : null

export type RateLimitType = 'auth' | 'profile' | 'general'

function getLimiter(type: RateLimitType) {
  switch (type) {
    case 'auth':
      return authLimiter
    case 'profile':
      return profileLimiter
    case 'general':
      return generalLimiter
    default:
      return generalLimiter
  }
}

function getIdentifier(request: NextRequest): string {
  // Try to get real IP from various headers
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  const vercelIp = request.headers.get('x-vercel-forwarded-for')

  // Use the most specific IP available
  const ip = vercelIp?.split(',')[0]?.trim()
    || cfConnectingIp
    || realIp
    || forwardedFor?.split(',')[0]?.trim()
    || 'unknown'

  return ip
}

export type RateLimitResult = {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

/**
 * Check rate limit for a request
 * Returns success=true if request is allowed, false if rate limited
 */
export async function checkRateLimit(
  request: NextRequest,
  type: RateLimitType = 'general'
): Promise<RateLimitResult> {
  const limiter = getLimiter(type)

  // If no Redis configured, allow all requests (dev mode)
  if (!limiter) {
    return {
      success: true,
      limit: 999,
      remaining: 999,
      reset: 0,
    }
  }

  const identifier = getIdentifier(request)

  try {
    const result = await limiter.limit(identifier)

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    }
  } catch (error) {
    console.error('Rate limit check failed:', error)
    // On error, allow request (fail open for availability)
    return {
      success: true,
      limit: 999,
      remaining: 999,
      reset: 0,
    }
  }
}

/**
 * Create a rate limited response with appropriate headers
 */
export function rateLimitedResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: 'Too many requests',
      message: 'Please wait before trying again',
      retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
    },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.reset.toString(),
        'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
      },
    }
  )
}

/**
 * Add rate limit headers to a response
 */
export function addRateLimitHeaders(response: NextResponse, result: RateLimitResult): NextResponse {
  response.headers.set('X-RateLimit-Limit', result.limit.toString())
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
  response.headers.set('X-RateLimit-Reset', result.reset.toString())
  return response
}
