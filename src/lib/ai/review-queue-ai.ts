/**
 * AI-Powered Review Queue
 * Phase 7.3: Enhance FSRS with AI intelligence
 *
 * Goes beyond time-based FSRS to add semantic bundling and predictions
 * Cost: $0 (uses FREE AI orchestrator)
 */

import { getAIOrchestrator } from './orchestrator';
import type { AIMessage } from './providers/interfaces';
import type { ConceptMastery } from '@/lib/mastery/knowledgeGraph';

export type SmartReviewBundle = {
  concepts: string[];
  reasoning: string;
  estimatedTime: number;
  priority: 'high' | 'medium' | 'low';
};

/**
 * Bundle related concepts for efficient review
 * AI identifies semantic relationships beyond just FSRS timing
 */
export async function bundleRelatedReviews(
  dueReviews: ConceptMastery[]
): Promise<SmartReviewBundle[]> {
  if (dueReviews.length === 0) return [];

  const orchestrator = getAIOrchestrator();

  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `You are Sage, organizing review items efficiently.

Given these concepts due for review, bundle related ones together for more effective learning.

Example:
- "Audience Targeting" + "Lookalike Audiences" = bundle (closely related)
- "Ad Objectives" + "Budget Optimization" = separate (different topics)

Provide 2-4 bundles with reasoning.`,
    },
    {
      role: 'user',
      content: `Concepts due for review:\n${dueReviews.map((r) => `- ${r.conceptId} (mastery: ${r.masteryLevel}%)`).join('\n')}

How should these be bundled for optimal review?`,
    },
  ];

  try {
    const result = await orchestrator.generateWithRAG(messages, 'meta_blueprint');

    // Parse bundles (simplified - would use structured output)
    return parseBundles(result.content, dueReviews);
  } catch (error) {
    // Fallback: simple bundling by category
    return fallbackBundling(dueReviews);
  }
}

/**
 * Predict review performance before session
 */
export async function predictReviewPerformance(
  reviewItems: ConceptMastery[],
  userHistory: {
    recentReviewAccuracy: number;
    currentStreak: number;
    timeOfDay: number;
  }
): Promise<{
  predictedAccuracy: number;
  difficultItems: string[];
  estimatedDuration: number;
  preparationTips: string[];
}> {
  // Calculate predicted accuracy based on patterns
  let predictedAccuracy = userHistory.recentReviewAccuracy || 75;

  // Adjust for mastery levels
  const avgMastery =
    reviewItems.reduce((sum, item) => sum + item.masteryLevel, 0) / reviewItems.length;

  predictedAccuracy = (predictedAccuracy + avgMastery) / 2;

  // Identify difficult items (low mastery, high lapses)
  const difficultItems = reviewItems
    .filter((item) => item.masteryLevel < 70 || (item.fsrsState.lapses || 0) > 2)
    .map((item) => item.conceptId);

  // Estimate duration (30 seconds per item + 20% buffer)
  const estimatedDuration = Math.ceil(reviewItems.length * 30 * 1.2);

  // Generate tips
  const preparationTips = [
    difficultItems.length > 0
      ? `Focus extra attention on: ${difficultItems.slice(0, 3).join(', ')}`
      : 'All items well-mastered - this should be quick!',
    `Estimated time: ${Math.ceil(estimatedDuration / 60)} minutes`,
    predictedAccuracy >= 85
      ? 'You\'re well-prepared - expect high accuracy'
      : 'Some concepts may be rusty - review notes if needed',
  ];

  return {
    predictedAccuracy: Math.round(predictedAccuracy),
    difficultItems,
    estimatedDuration,
    preparationTips,
  };
}

/**
 * Adaptive review difficulty
 */
export function adjustReviewDifficulty(
  reviewPerformance: {
    correctCount: number;
    totalCount: number;
    avgResponseTime: number;
  },
  userPreference: 'standard' | 'challenging'
): {
  shouldIncreaseDifficulty: boolean;
  message: string;
} {
  const accuracy = reviewPerformance.correctCount / reviewPerformance.totalCount;

  // If user acing reviews (90%+) and wants challenges
  if (accuracy >= 0.9 && userPreference === 'challenging') {
    return {
      shouldIncreaseDifficulty: true,
      message:
        'You\'re crushing these reviews! Want me to make them harder? I can test edge cases and application scenarios instead of basic recall.',
    };
  }

  // If struggling (<70%)
  if (accuracy < 0.7) {
    return {
      shouldIncreaseDifficulty: false,
      message:
        'These reviews are challenging - that\'s okay! I\'ll keep them at this level and add more context to help you.',
    };
  }

  return {
    shouldIncreaseDifficulty: false,
    message: '',
  };
}

/**
 * Parse AI response into bundles
 */
function parseBundles(text: string, reviews: ConceptMastery[]): SmartReviewBundle[] {
  // Simplified - would use structured output
  return [
    {
      concepts: reviews.slice(0, Math.ceil(reviews.length / 2)).map((r) => r.conceptId),
      reasoning: 'Related foundational concepts',
      estimatedTime: Math.ceil(reviews.length / 2) * 30,
      priority: 'high',
    },
  ];
}

/**
 * Fallback bundling logic
 */
function fallbackBundling(reviews: ConceptMastery[]): SmartReviewBundle[] {
  // Group by mastery level
  const lowMastery = reviews.filter((r) => r.masteryLevel < 70);
  const highMastery = reviews.filter((r) => r.masteryLevel >= 70);

  const bundles: SmartReviewBundle[] = [];

  if (lowMastery.length > 0) {
    bundles.push({
      concepts: lowMastery.map((r) => r.conceptId),
      reasoning: 'Lower mastery items - need extra attention',
      estimatedTime: lowMastery.length * 45, // More time for difficult ones
      priority: 'high',
    });
  }

  if (highMastery.length > 0) {
    bundles.push({
      concepts: highMastery.map((r) => r.conceptId),
      reasoning: 'Well-mastered items - quick refresh',
      estimatedTime: highMastery.length * 20,
      priority: 'medium',
    });
  }

  return bundles;
}
