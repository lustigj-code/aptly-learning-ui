import { NextResponse } from 'next/server'

/**
 * CSP Violation Report Endpoint
 *
 * Receives Content-Security-Policy violation reports from browsers.
 * Reports help identify:
 * - Scripts blocked that need to be allowed
 * - Potential XSS attack attempts
 * - Misconfigured CSP directives
 *
 * Report format (CSP Level 2):
 * {
 *   "csp-report": {
 *     "document-uri": "https://example.com/page",
 *     "referrer": "",
 *     "violated-directive": "script-src",
 *     "effective-directive": "script-src",
 *     "original-policy": "...",
 *     "blocked-uri": "https://malicious.com/script.js",
 *     "status-code": 0
 *   }
 * }
 */

interface CSPReport {
  'csp-report': {
    'document-uri'?: string
    'referrer'?: string
    'violated-directive'?: string
    'effective-directive'?: string
    'original-policy'?: string
    'blocked-uri'?: string
    'status-code'?: number
    'source-file'?: string
    'line-number'?: number
    'column-number'?: number
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const contentType = request.headers.get('content-type') || ''

    // CSP reports use application/csp-report content type
    if (!contentType.includes('application/csp-report') && !contentType.includes('application/json')) {
      return new NextResponse(null, { status: 400 })
    }

    const report = (await request.json()) as CSPReport
    const cspReport = report['csp-report']

    if (!cspReport) {
      return new NextResponse(null, { status: 400 })
    }

    // Log violation for monitoring
    // In production, this could be sent to a logging service (e.g., Sentry, Datadog)
    console.warn('[CSP Violation]', {
      documentUri: cspReport['document-uri'],
      violatedDirective: cspReport['violated-directive'],
      blockedUri: cspReport['blocked-uri'],
      sourceFile: cspReport['source-file'],
      lineNumber: cspReport['line-number'],
      timestamp: new Date().toISOString(),
    })

    // Return 204 No Content as per CSP spec
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    // Log parsing errors but don't expose details
    console.error('[CSP Report] Failed to parse report:', error)
    return new NextResponse(null, { status: 400 })
  }
}

// Allow OPTIONS for CORS preflight (browsers may send this)
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
