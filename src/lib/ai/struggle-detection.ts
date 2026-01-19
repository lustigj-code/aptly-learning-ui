/**
 * Struggle Detection System
 * Phase 4.1: Proactive AI - Detect when users need help
 *
 * Analyzes behavioral signals to predict and prevent student struggles
 * Cost: $0 (client-side analysis)
 */

export type StruggleSignals = {
  consecutiveWrongAnswers: number;
  longPausesOnContent: boolean;
  hintUsageRate: number;
  quizRetakeCount: number;
  timeSpentVsEstimated: number;
  emotionalKeywords: string[];
  sessionAbandonmentRisk: number;
};

export type StruggleLevel = 'none' | 'mild' | 'moderate' | 'severe';

export type StruggleAnalysis = {
  level: StruggleLevel;
  score: number; // 0-100
  signals: StruggleSignals;
  suggestedIntervention: string | null;
  shouldIntervene: boolean;
  interventionType: 'hint' | 'scaffold' | 'prerequisite_review' | 'break_suggestion' | null;
};

/**
 * Analyze user behavior to detect struggle
 */
export function detectStruggle(behavior: {
  recentQuizScores: number[];
  atomTimeSpent: number;
  estimatedTime: number;
  hintsViewed: number;
  questionsAttempted: number;
  quizRetakes: number;
  recentCoachMessages: string[];
  sessionDuration: number;
  previousSessionAbandoned: boolean;
}): StruggleAnalysis {
  const signals: StruggleSignals = {
    consecutiveWrongAnswers: behavior.recentQuizScores.filter((s) => s < 60).length,

    longPausesOnContent:
      behavior.atomTimeSpent > behavior.estimatedTime * 1.5 && behavior.estimatedTime > 0,

    hintUsageRate:
      behavior.questionsAttempted > 0 ? behavior.hintsViewed / behavior.questionsAttempted : 0,

    quizRetakeCount: behavior.quizRetakes,

    timeSpentVsEstimated:
      behavior.estimatedTime > 0 ? behavior.atomTimeSpent / behavior.estimatedTime : 1,

    emotionalKeywords: extractEmotionalKeywords(behavior.recentCoachMessages),

    sessionAbandonmentRisk: calculateAbandonmentRisk(
      behavior.sessionDuration,
      behavior.previousSessionAbandoned
    ),
  };

  // Calculate struggle score (0-100)
  const score = calculateStruggleScore(signals);

  // Determine level
  let level: StruggleLevel = 'none';
  if (score > 75) level = 'severe';
  else if (score > 50) level = 'moderate';
  else if (score > 25) level = 'mild';

  // Determine intervention
  const intervention = determineIntervention(signals, score);

  return {
    level,
    score,
    signals,
    suggestedIntervention: intervention.message,
    shouldIntervene: score > 40, // Intervene at moderate+ struggle
    interventionType: intervention.type,
  };
}

/**
 * Calculate overall struggle score
 */
function calculateStruggleScore(signals: StruggleSignals): number {
  let score = 0;

  // Wrong answers (0-30 points)
  score += Math.min(signals.consecutiveWrongAnswers * 10, 30);

  // Long pauses (0-15 points)
  if (signals.longPausesOnContent) score += 15;

  // High hint usage (0-20 points)
  score += Math.min(signals.hintUsageRate * 40, 20);

  // Quiz retakes (0-15 points)
  score += Math.min(signals.quizRetakeCount * 5, 15);

  // Emotional keywords (0-10 points)
  score += Math.min(signals.emotionalKeywords.length * 2, 10);

  // Abandonment risk (0-10 points)
  score += signals.sessionAbandonmentRisk;

  return Math.min(score, 100);
}

/**
 * Extract emotional keywords indicating frustration/confusion
 */
function extractEmotionalKeywords(messages: string[]): string[] {
  const keywords = [
    'confused',
    'stuck',
    'don\'t understand',
    'frustrated',
    'hard',
    'difficult',
    'help',
    'what',
    'why doesn\'t',
    'this doesn\'t make sense',
  ];

  const found: string[] = [];
  const text = messages.join(' ').toLowerCase();

  for (const keyword of keywords) {
    if (text.includes(keyword)) {
      found.push(keyword);
    }
  }

  return found;
}

/**
 * Calculate risk of session abandonment
 */
function calculateAbandonmentRisk(sessionDuration: number, previouslyAbandoned: boolean): number {
  let risk = 0;

  // Very short session (less than 5 minutes)
  if (sessionDuration < 5 * 60) risk += 5;

  // Previously abandoned
  if (previouslyAbandoned) risk += 5;

  return risk;
}

/**
 * Determine appropriate intervention
 */
function determineIntervention(
  signals: StruggleSignals,
  score: number
): {
  message: string | null;
  type: StruggleAnalysis['interventionType'];
} {
  // Severe struggle (score > 75)
  if (score > 75) {
    return {
      message:
        "I notice this concept is really tricky. Let's step back and review the prerequisites - it'll make this much clearer. Want to take a 5-minute refresher?",
      type: 'prerequisite_review',
    };
  }

  // Moderate struggle (score 50-75)
  if (score > 50) {
    // High retakes
    if (signals.quizRetakeCount >= 2) {
      return {
        message:
          "You've tried this quiz a couple times. Before attempting again, let's break down the concepts differently. I have an analogy that might help - want to hear it?",
        type: 'scaffold',
      };
    }

    // Emotional keywords detected
    if (signals.emotionalKeywords.length > 0) {
      return {
        message:
          "This one trips everyone up at first. Here's a different way to think about it that my students find helpful...",
        type: 'hint',
      };
    }

    return {
      message: "Want a hint to guide your thinking? I can ask questions that point you in the right direction.",
      type: 'hint',
    };
  }

  // Mild struggle (score 25-50) - gentle nudge
  if (score > 25) {
    if (signals.timeSpentVsEstimated > 2) {
      return {
        message:
          "You've been working on this for a while - that shows dedication! Taking a 2-minute break often helps things click. Want to pause and come back?",
        type: 'break_suggestion',
      };
    }
  }

  // No intervention needed
  return {
    message: null,
    type: null,
  };
}

/**
 * Hook for React components to use struggle detection
 */
export function useStruggleDetection(_userId: string) {
  // In a real hook, this would:
  // 1. Subscribe to user behavior events
  // 2. Continuously analyze for struggle
  // 3. Trigger interventions when detected
  // 4. Track intervention effectiveness

  // Placeholder for now - will be fully implemented in Phase 4 integration
  return {
    currentStruggleLevel: 'none' as StruggleLevel,
    shouldShowIntervention: false,
    interventionMessage: null as string | null,
  };
}
