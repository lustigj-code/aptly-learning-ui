/**
 * Coach Router
 *
 * Routes coach requests to the appropriate AI model.
 * Handles model selection logic based on configuration and A/B testing.
 *
 * Supported models:
 * - Gemini (default): Google's Gemini 2.0 Flash
 * - Sage: Fine-tuned model deployed on Modal
 * - Socratic: Enhanced RAG-grounded Socratic mode
 *
 * Part of Phase 12: Socratic RAG Coach
 */

import { isFeatureEnabled } from '@/lib/experiments/abTest';

// ============================================
// TYPES
// ============================================

export type CoachModel = 'gemini' | 'sage' | 'socratic';

export interface CoachRoutingConfig {
  useSageModel: boolean;
  sageAbTestEnabled: boolean;
  socraticModeEnabled: boolean;
  userId: string;
}

export interface ModelSelectionResult {
  model: CoachModel;
  variant?: string;
  reason: string;
}

// ============================================
// CONFIGURATION
// ============================================

/**
 * Get routing configuration from environment variables
 */
export function getRoutingConfig(): Omit<CoachRoutingConfig, 'userId' | 'socraticModeEnabled'> {
  return {
    useSageModel: process.env.USE_SAGE_MODEL === 'true',
    sageAbTestEnabled: process.env.SAGE_AB_TEST === 'true',
  };
}

// ============================================
// MODEL SELECTION
// ============================================

/**
 * Select the appropriate coach model based on configuration
 *
 * Priority order:
 * 1. Socratic mode (if enabled for user via feature flag)
 * 2. Sage model (if A/B test assigns user to treatment)
 * 3. Gemini (default fallback)
 *
 * @param config - Routing configuration including user context
 * @returns Selected model and selection reason
 */
export function selectCoachModel(config: CoachRoutingConfig): ModelSelectionResult {
  // Socratic mode takes priority if enabled
  if (config.socraticModeEnabled) {
    return {
      model: 'socratic',
      reason: 'Socratic mode enabled via feature flag',
    };
  }

  // Sage A/B test
  if (config.sageAbTestEnabled && config.useSageModel) {
    const bucket = hashUserId(config.userId);
    const variant = bucket < 50 ? 'treatment' : 'control';

    if (variant === 'treatment') {
      return {
        model: 'sage',
        variant: 'treatment',
        reason: 'Sage A/B test - treatment group',
      };
    }

    return {
      model: 'gemini',
      variant: 'control',
      reason: 'Sage A/B test - control group',
    };
  }

  // Direct Sage model usage (no A/B test)
  if (config.useSageModel && !config.sageAbTestEnabled) {
    return {
      model: 'sage',
      reason: 'Sage model enabled directly',
    };
  }

  // Default to Gemini
  return {
    model: 'gemini',
    reason: 'Default model',
  };
}

/**
 * Async version that checks feature flags
 *
 * @param userId - User's Firebase UID
 * @returns Selected model and selection reason
 */
export async function selectCoachModelAsync(userId: string): Promise<ModelSelectionResult> {
  const baseConfig = getRoutingConfig();

  // Check Socratic mode feature flag
  let socraticModeEnabled = false;
  try {
    socraticModeEnabled = await isFeatureEnabled(userId, 'useSocraticMode');
  } catch (error) {
    console.warn('[CoachRouter] Failed to check Socratic mode flag:', error);
  }

  return selectCoachModel({
    ...baseConfig,
    userId,
    socraticModeEnabled,
  });
}

// ============================================
// A/B TEST BUCKETING
// ============================================

/**
 * Hash userId to consistent bucket (0-99)
 *
 * Uses a simple hash function for deterministic bucketing.
 * Same user always gets same bucket for consistent experience.
 *
 * @param userId - User's Firebase UID
 * @returns Bucket number (0-99)
 */
function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) % 100;
}

/**
 * Get A/B test variant for a user
 *
 * @param userId - User's Firebase UID
 * @param testId - Test identifier
 * @param treatmentPercentage - Percentage of users in treatment (0-100)
 * @returns 'treatment' or 'control'
 */
export function getAbTestVariant(
  userId: string,
  testId: string,
  treatmentPercentage: number = 50
): 'treatment' | 'control' {
  // Include testId in hash for different tests to have different assignments
  const combinedKey = `${testId}_${userId}`;
  const bucket = hashUserId(combinedKey);

  return bucket < treatmentPercentage ? 'treatment' : 'control';
}

// ============================================
// MODEL CAPABILITY CHECKS
// ============================================

/**
 * Check if Sage model endpoint is configured
 */
export function isSageModelConfigured(): boolean {
  return !!(
    process.env.SAGE_MODEL_ENDPOINT ||
    process.env.USE_SAGE_MODEL === 'true'
  );
}

/**
 * Check if Socratic mode is available
 */
export function isSocraticModeAvailable(): boolean {
  // Socratic mode requires Gemini API key and vector store
  return !!(
    process.env.GOOGLE_GENAI_API_KEY &&
    (process.env.PINECONE_API_KEY || process.env.VECTOR_STORE_PROVIDER === 'firestore')
  );
}

/**
 * Get available models based on configuration
 */
export function getAvailableModels(): CoachModel[] {
  const models: CoachModel[] = ['gemini']; // Always available if API key exists

  if (!process.env.GOOGLE_GENAI_API_KEY) {
    return []; // No models available without API key
  }

  if (isSageModelConfigured()) {
    models.push('sage');
  }

  if (isSocraticModeAvailable()) {
    models.push('socratic');
  }

  return models;
}

// ============================================
// LOGGING
// ============================================

/**
 * Log model selection for analytics
 */
export function logModelSelection(
  userId: string,
  selection: ModelSelectionResult,
  requestType: string
): void {
  console.log('[CoachRouter] Model selected:', {
    userId: userId.substring(0, 8) + '...', // Truncate for privacy
    model: selection.model,
    variant: selection.variant,
    reason: selection.reason,
    requestType,
    timestamp: new Date().toISOString(),
  });
}
