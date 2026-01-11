/**
 * Environment Variable Validation
 * Phase 6.3: Configuration & Deployment
 *
 * Validates required environment variables on app startup
 * Crashes with helpful error messages if configuration is incomplete
 */

import { z } from 'zod';

// ============================================
// VALIDATION SCHEMAS
// ============================================

const clientEnvSchema = z.object({
  // Firebase client config (public)
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1, 'Firebase API key is required'),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1, 'Firebase auth domain is required'),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1, 'Firebase project ID is required'),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1, 'Firebase app ID is required'),

  // App configuration
  NEXT_PUBLIC_APP_URL: z.string().url('App URL must be a valid URL'),

  // Analytics (optional in development)
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
});

const serverEnvSchema = z.object({
  // Firebase Admin SDK (server-side only)
  FIREBASE_ADMIN_PROJECT_ID: z.string().min(1, 'Firebase admin project ID required'),
  FIREBASE_ADMIN_CLIENT_EMAIL: z.string().email('Firebase admin client email must be valid'),
  FIREBASE_ADMIN_PRIVATE_KEY: z.string().min(1, 'Firebase admin private key required'),

  // API Keys
  GOOGLE_GENAI_API_KEY: z.string().optional(), // Optional - app works in demo mode without

  // Security
  CRON_SECRET: z.string().min(20, 'Cron secret must be at least 20 characters').optional(),

  // Rate limiting (Upstash Redis)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Sentry (server-side)
  SENTRY_AUTH_TOKEN: z.string().optional(),

  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Combined schema
const envSchema = clientEnvSchema.merge(serverEnvSchema);

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate client-side environment variables
 * Safe to call from browser
 */
export function validateClientEnv(): void {
  const clientEnv = {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  };

  const result = clientEnvSchema.safeParse(clientEnv);

  if (!result.success) {
    const errors = result.error.issues.map((err) => `  - ${err.path.join('.')}: ${err.message}`);

    console.error('❌ Environment validation failed (client-side):');
    console.error(errors.join('\n'));

    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Missing required environment variables. Check your Vercel/hosting configuration.\n\n' +
          errors.join('\n')
      );
    }
  }
}

/**
 * Validate server-side environment variables
 * Only call from server-side code
 */
export function validateServerEnv(): void {
  // Don't run in browser
  if (typeof window !== 'undefined') {
    return;
  }

  const serverEnv = {
    FIREBASE_ADMIN_PROJECT_ID: process.env.FIREBASE_ADMIN_PROJECT_ID,
    FIREBASE_ADMIN_CLIENT_EMAIL: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    FIREBASE_ADMIN_PRIVATE_KEY: process.env.FIREBASE_ADMIN_PRIVATE_KEY,
    GOOGLE_GENAI_API_KEY: process.env.GOOGLE_GENAI_API_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
    NODE_ENV: process.env.NODE_ENV,
  };

  const result = serverEnvSchema.safeParse(serverEnv);

  if (!result.success) {
    const errors = result.error.issues.map((err) => `  - ${err.path.join('.')}: ${err.message}`);

    console.error('❌ Environment validation failed (server-side):');
    console.error(errors.join('\n'));

    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Missing required server environment variables. Check your .env.local or hosting configuration.\n\n' +
          errors.join('\n')
      );
    }
  }
}

/**
 * Validate all environment variables
 * Call this on app initialization
 */
export function validateEnv(): void {
  try {
    validateClientEnv();
    validateServerEnv();
    console.log('✅ Environment variables validated successfully');
  } catch (error) {
    console.error('💥 FATAL: App cannot start due to missing configuration');
    throw error;
  }
}

// ============================================
// TYPE-SAFE ENV ACCESS
// ============================================

/**
 * Type-safe environment variable access
 * Use this instead of process.env directly for better autocomplete and safety
 */
export const env = {
  // Client-side (public)
  firebase: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  },
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL!,
    env: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
  },
  analytics: {
    sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    posthogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    posthogHost: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  },
  // Server-side (private)
  server: {
    firebaseAdmin: {
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY,
    },
    genAI: {
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
    },
    cron: {
      secret: process.env.CRON_SECRET,
    },
    redis: {
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    },
  },
} as const;
