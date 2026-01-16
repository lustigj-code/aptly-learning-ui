import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

type ServiceStatus = 'ok' | 'error' | 'missing';

type HealthResponse = {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: {
    firebase: ServiceStatus;
    environment: ServiceStatus;
  };
  checks: {
    firebase?: string;
    environment?: string[];
  };
};

/**
 * GET /api/health
 * Health check endpoint for monitoring and deployment verification
 * Returns service connectivity status and environment configuration
 */
export async function GET() {
  const response: HealthResponse = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    services: {
      firebase: 'ok',
      environment: 'ok',
    },
    checks: {},
  };

  // Check Firebase connectivity
  try {
    // Simple Firestore read to verify connectivity
    await adminDb.collection('_health').doc('ping').get();
    response.services.firebase = 'ok';
  } catch (error) {
    response.services.firebase = 'error';
    response.checks.firebase = error instanceof Error ? error.message : 'Unknown error';
    response.status = 'degraded';
  }

  // Check critical environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'FIREBASE_ADMIN_PROJECT_ID',
  ];

  const missingEnvVars = requiredEnvVars.filter((v) => !process.env[v]);

  if (missingEnvVars.length > 0) {
    response.services.environment = 'missing';
    response.checks.environment = missingEnvVars;
    response.status = 'degraded';
  }

  // Determine overall status
  const allServicesOk = Object.values(response.services).every((s) => s === 'ok');
  if (!allServicesOk) {
    response.status = response.services.firebase === 'error' ? 'unhealthy' : 'degraded';
  }

  const statusCode = response.status === 'healthy' ? 200 : response.status === 'degraded' ? 200 : 503;

  return NextResponse.json(response, { status: statusCode });
}
