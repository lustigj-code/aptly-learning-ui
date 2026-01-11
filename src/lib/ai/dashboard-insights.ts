/**
 * Dashboard AI Insights
 * Phase 7.1: AI-powered progress analysis and recommendations
 *
 * Generates personalized learning insights for dashboard
 * Cost: $0 (uses FREE AI orchestrator)
 */

import { getAIOrchestrator } from './orchestrator';
import type { AIMessage } from './providers/interfaces';

export type DashboardInsights = {
  weeklyProgress: string;
  learningPatterns: string[];
  optimizationSuggestions: string[];
  masteryNarration: string;
  predictiveTimeline: {
    certificationReady: string; // e.g., "6 weeks"
    confidence: number; // 0-100
    requirements: string[];
  };
  aiGenerated: boolean;
};

/**
 * Generate comprehensive dashboard insights
 */
export async function generateDashboardInsights(userData: {
  lessonsCompletedThisWeek: number;
  avgQuizScore: number;
  recentScores: number[];
  timeSpentThisWeek: number;
  streakDays: number;
  masteryLevels: Record<string, number>;
  preferredStudyTime: { hour: number; avgScore: number }[];
  currentPace: number; // lessons per week
  goal: 'certification' | 'practical' | 'career_change';
}): Promise<DashboardInsights> {
  const orchestrator = getAIOrchestrator();

  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `You are Sage, generating personalized learning insights for a student's dashboard.

Analyze their data and provide:
1. Weekly progress summary (celebrate wins, identify patterns)
2. Learning pattern observations (when they learn best, what helps them)
3. Optimization suggestions (specific, actionable improvements)
4. Mastery narration (explain their knowledge map in plain language)

Be encouraging, specific, and actionable. Use their actual data.`,
    },
    {
      role: 'user',
      content: `Student Data:
- Lessons this week: ${userData.lessonsCompletedThisWeek}
- Avg quiz score: ${userData.avgQuizScore}%
- Time spent: ${userData.timeSpentThisWeek} minutes
- Streak: ${userData.streakDays} days
- Mastery levels: ${JSON.stringify(userData.masteryLevels)}
- Study time preference: ${userData.preferredStudyTime.map(p => `${p.hour}:00 (${p.avgScore}% avg)`).join(', ')}

Generate insights.`,
    },
  ];

  try {
    const result = await orchestrator.generate(messages);

    // Parse response
    const insights = parseInsightsFromAI(result.content);

    // Calculate predictive timeline
    const timeline = calculateCertificationTimeline(userData);

    return {
      weeklyProgress: insights.weeklyProgress || result.content.substring(0, 200),
      learningPatterns: insights.learningPatterns || identifyLearningPatterns(userData),
      optimizationSuggestions: insights.optimizationSuggestions || generateOptimizationSuggestions(userData),
      masteryNarration: insights.masteryNarration || narrateMasteryMap(userData.masteryLevels),
      predictiveTimeline: timeline,
      aiGenerated: true,
    };
  } catch (error) {
    console.error('Dashboard insights error:', error);

    // Fallback to rule-based insights
    return {
      weeklyProgress: `You completed ${userData.lessonsCompletedThisWeek} lessons this week with an average score of ${userData.avgQuizScore}%. Keep up the momentum!`,
      learningPatterns: identifyLearningPatterns(userData),
      optimizationSuggestions: generateOptimizationSuggestions(userData),
      masteryNarration: narrateMasteryMap(userData.masteryLevels),
      predictiveTimeline: calculateCertificationTimeline(userData),
      aiGenerated: false,
    };
  }
}

/**
 * Parse AI-generated insights
 */
function parseInsightsFromAI(text: string): Partial<DashboardInsights> {
  // Simplified parsing - would use structured output in production
  return {
    weeklyProgress: text.split('\n')[0],
    learningPatterns: text.split('\n').filter(l => l.includes('pattern')),
    optimizationSuggestions: text.split('\n').filter(l => l.includes('suggest') || l.includes('recommend')),
  };
}

/**
 * Identify learning patterns from data
 */
function identifyLearningPatterns(userData: any): string[] {
  const patterns: string[] = [];

  // Time-of-day pattern
  const bestTime = userData.preferredStudyTime.reduce((best: any, current: any) =>
    current.avgScore > (best?.avgScore || 0) ? current : best
  );

  if (bestTime && bestTime.avgScore > userData.avgQuizScore + 10) {
    patterns.push(
      `You learn best in the ${getTimeOfDay(bestTime.hour)} (${bestTime.avgScore}% avg score)`
    );
  }

  // Score trend
  if (userData.recentScores.length >= 5) {
    const recent3 = userData.recentScores.slice(-3).reduce((a: number, b: number) => a + b, 0) / 3;
    const previous3 = userData.recentScores.slice(-6, -3).reduce((a: number, b: number) => a + b, 0) / 3;

    if (recent3 > previous3 + 5) {
      patterns.push(`Your scores are improving! Recent average: ${Math.round(recent3)}% (up from ${Math.round(previous3)}%)`);
    }
  }

  // Streak pattern
  if (userData.streakDays >= 7) {
    patterns.push(`${userData.streakDays}-day streak shows excellent consistency`);
  }

  return patterns;
}

/**
 * Generate optimization suggestions
 */
function generateOptimizationSuggestions(userData: any): string[] {
  const suggestions: string[] = [];

  // Study time optimization
  const bestTime = userData.preferredStudyTime.reduce((best: any, current: any) =>
    current.avgScore > (best?.avgScore || 0) ? current : best
  );

  if (bestTime) {
    suggestions.push(`Schedule study sessions around ${bestTime.hour}:00 when you perform best`);
  }

  // Pace optimization
  if (userData.currentPace < 2) {
    suggestions.push('Try increasing to 2-3 lessons/week for better momentum');
  } else if (userData.currentPace > 5 && userData.avgQuizScore < 75) {
    suggestions.push('Consider slowing pace to 3-4 lessons/week to deepen understanding');
  }

  return suggestions;
}

/**
 * Narrate mastery map in plain language
 */
function narrateMasteryMap(masteryLevels: Record<string, number>): string {
  const entries = Object.entries(masteryLevels);

  if (entries.length === 0) {
    return 'Start completing lessons to build your knowledge map!';
  }

  const strongest = entries.reduce((max, curr) => (curr[1] > max[1] ? curr : max));
  const weakest = entries.reduce((min, curr) => (curr[1] < min[1] ? curr : min));

  return `Your strongest area is ${strongest[0]} (${Math.round(strongest[1])}% mastery). ${weakest[0]} needs work (${Math.round(weakest[1])}%). Focus there next.`;
}

/**
 * Calculate timeline to certification readiness
 */
function calculateCertificationTimeline(userData: any): {
  certificationReady: string;
  confidence: number;
  requirements: string[];
} {
  // Simple calculation based on current pace and avg score
  const lessonsRemaining = 50 - (userData.lessonsCompletedThisWeek * 4); // Assume ~50 total lessons
  const weeksNeeded = Math.ceil(lessonsRemaining / userData.currentPace);

  // Confidence based on current performance
  let confidence = 50;

  if (userData.avgQuizScore >= 80) confidence += 30;
  else if (userData.avgQuizScore >= 70) confidence += 15;

  if (userData.streakDays >= 14) confidence += 15;
  else if (userData.streakDays >= 7) confidence += 10;

  const requirements: string[] = [];

  if (userData.avgQuizScore < 80) {
    requirements.push('Increase avg quiz score to 80%+');
  }

  if (Object.values(userData.masteryLevels).some((m: any) => m < 70)) {
    requirements.push('Master all concepts to 70%+ (some are below threshold)');
  }

  return {
    certificationReady: `${weeksNeeded} weeks`,
    confidence: Math.min(95, confidence),
    requirements,
  };
}

function getTimeOfDay(hour: number): string {
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}
