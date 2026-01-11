/**
 * Continuous Improvement System
 * Phase 9: RLHF (Reinforcement Learning from Human Feedback)
 *
 * Collects feedback and creates preference dataset for ongoing model improvement
 * Cost: $0 (data collection is free, retraining uses free Colab)
 */

export type ResponseFeedback = {
  responseId: string;
  userId: string;
  conversationId: string;
  prompt: string;
  response: string;
  rating: 'thumbs_up' | 'thumbs_down' | null;
  detailedFeedback: string | null;
  implicitSignals: {
    userAskedFollowUp: boolean;
    userCompletedLesson: boolean;
    userAbandonedSession: boolean;
    timeToNextAction: number; // seconds
  };
  timestamp: Date;
};

export type PreferencePair = {
  id: string;
  prompt: string;
  chosen: string;
  rejected: string;
  reason: string;
  conceptTested: string;
  scenario: string;
};

/**
 * Collect user feedback on AI responses
 */
export async function collectResponseFeedback(
  responseId: string,
  rating: 'thumbs_up' | 'thumbs_down',
  detailedFeedback?: string
): Promise<void> {
  // Store in Firestore for analysis
  const { adminDb } = await import('@/lib/firebase/admin');

  await adminDb.collection('aiResponseFeedback').doc(responseId).set({
    rating,
    detailedFeedback: detailedFeedback || null,
    timestamp: new Date(),
  });

  console.log(`✅ Feedback collected: ${rating}`);
}

/**
 * Generate preference pairs from feedback
 * Used for DPO (Direct Preference Optimization) training
 */
export async function generatePreferencePairs(): Promise<PreferencePair[]> {
  const { adminDb } = await import('@/lib/firebase/admin');

  // Fetch responses with both thumbs_up and thumbs_down for same prompts
  const feedbackSnapshot = await adminDb.collection('aiResponseFeedback').limit(1000).get();

  const byPrompt: Map<string, ResponseFeedback[]> = new Map();

  feedbackSnapshot.docs.forEach((doc) => {
    const data = doc.data() as ResponseFeedback;
    const existing = byPrompt.get(data.prompt) || [];
    byPrompt.set(data.prompt, [...existing, data]);
  });

  // Create preference pairs
  const pairs: PreferencePair[] = [];

  byPrompt.forEach((responses, prompt) => {
    const liked = responses.filter((r) => r.rating === 'thumbs_up');
    const disliked = responses.filter((r) => r.rating === 'thumbs_down');

    // Create pairs
    liked.forEach((chosen) => {
      disliked.forEach((rejected) => {
        pairs.push({
          id: `${chosen.responseId}-vs-${rejected.responseId}`,
          prompt,
          chosen: chosen.response,
          rejected: rejected.response,
          reason: chosen.detailedFeedback || 'User preferred this response',
          conceptTested: extractConcept(prompt),
          scenario: 'user_feedback',
        });
      });
    });
  });

  return pairs;
}

/**
 * Analyze feedback trends
 */
export async function analyzeFeedbackTrends(): Promise<{
  overallRating: number; // % positive
  commonIssues: string[];
  improvementAreas: string[];
  strengths: string[];
}> {
  const { adminDb } = await import('@/lib/firebase/admin');

  const feedbackSnapshot = await adminDb
    .collection('aiResponseFeedback')
    .orderBy('timestamp', 'desc')
    .limit(500)
    .get();

  const feedback = feedbackSnapshot.docs.map((doc) => doc.data() as ResponseFeedback);

  // Calculate overall rating
  const ratedFeedback = feedback.filter((f) => f.rating);
  const positive = ratedFeedback.filter((f) => f.rating === 'thumbs_up').length;
  const overallRating = (positive / ratedFeedback.length) * 100;

  // Extract common issues from negative feedback
  const negativeComments = feedback
    .filter((f) => f.rating === 'thumbs_down' && f.detailedFeedback)
    .map((f) => f.detailedFeedback!);

  const commonIssues = extractCommonThemes(negativeComments);

  // Extract strengths from positive feedback
  const positiveComments = feedback
    .filter((f) => f.rating === 'thumbs_up' && f.detailedFeedback)
    .map((f) => f.detailedFeedback!);

  const strengths = extractCommonThemes(positiveComments);

  return {
    overallRating: Math.round(overallRating),
    commonIssues,
    improvementAreas: commonIssues,
    strengths,
  };
}

/**
 * Schedule monthly retraining
 */
export async function scheduleMonthlyRetraining(): Promise<{
  nextRetrainingDate: Date;
  preferencePairsCount: number;
  retrainingRecommended: boolean;
}> {
  const pairs = await generatePreferencePairs();

  // Recommend retraining if we have 100+ new preference pairs
  const retrainingRecommended = pairs.length >= 100;

  // Next retraining: first of next month
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return {
    nextRetrainingDate: nextMonth,
    preferencePairsCount: pairs.length,
    retrainingRecommended,
  };
}

/**
 * Extract common themes from feedback comments
 */
function extractCommonThemes(comments: string[]): string[] {
  // Simple keyword frequency analysis
  const keywords: Map<string, number> = new Map();

  comments.forEach((comment) => {
    const words = comment.toLowerCase().split(/\s+/);
    words.forEach((word) => {
      if (word.length > 4) {
        keywords.set(word, (keywords.get(word) || 0) + 1);
      }
    });
  });

  // Get top 5 most common
  return Array.from(keywords.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

function extractConcept(prompt: string): string {
  // Extract concept from prompt (simplified)
  const concepts = ['audience targeting', 'conversion', 'ad creative', 'budget', 'roi'];
  return concepts.find((c) => prompt.toLowerCase().includes(c)) || 'general';
}

/**
 * Domain knowledge update monitoring
 */
export async function monitorDomainUpdates(): Promise<{
  lastCheck: Date;
  updatesFound: string[];
  requiresAction: boolean;
}> {
  // In production, would monitor Meta Blueprint for updates
  // For now, return placeholder

  return {
    lastCheck: new Date(),
    updatesFound: [],
    requiresAction: false,
  };
}
