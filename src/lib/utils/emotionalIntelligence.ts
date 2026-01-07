/**
 * Emotional Intelligence Module for the AI Coach
 *
 * Detects learner emotional states from behavioral signals
 * and provides appropriate response strategies.
 */

export type EmotionalState =
  | 'frustrated'
  | 'confused'
  | 'flowing'
  | 'disengaged'
  | 'anxious'
  | 'confident'
  | 'neutral';

export type EmotionalSignals = {
  // Quiz/practice performance
  recentScores: number[];
  consecutiveWrongAnswers: number;
  consecutiveCorrectAnswers: number;
  averageTimePerQuestion: number; // in seconds

  // Session behavior
  sessionDurationMinutes: number;
  atomsSkipped: number;
  atomsCompleted: number;
  hintsUsed: number;

  // Time patterns
  timeSinceLastActivity: number; // in minutes
  averageSessionLength: number; // in minutes

  // Interaction patterns
  messageLength: number; // of current message
  questionMarksInMessage: number;
  helpKeywordsUsed: boolean;
  frustrationKeywordsUsed: boolean;
};

export type EmotionalAnalysis = {
  primaryState: EmotionalState;
  confidence: number; // 0-1
  signals: string[];
  responseStrategy: string;
  toneGuidance: string[];
  suggestedOpeners: string[];
};

const FRUSTRATION_KEYWORDS = [
  "don't understand",
  "don't get it",
  "makes no sense",
  "this is stupid",
  "hate this",
  "so frustrating",
  "confused",
  "lost",
  "stuck",
  "impossible",
  "can't figure",
  "ugh",
  "argh",
  "help me",
  "give up",
  "too hard",
];

const HELP_KEYWORDS = [
  "help",
  "how do i",
  "what is",
  "explain",
  "clarify",
  "don't know",
  "not sure",
  "can you",
  "please tell",
];

/**
 * Detect emotional state from behavioral signals
 */
export function detectEmotionalState(signals: EmotionalSignals): EmotionalAnalysis {
  const detectedSignals: string[] = [];
  let frustrationScore = 0;
  let confusionScore = 0;
  let flowScore = 0;
  let disengagementScore = 0;
  let anxietyScore = 0;
  let confidenceScore = 0;

  // === FRUSTRATION DETECTION ===

  // Consecutive wrong answers
  if (signals.consecutiveWrongAnswers >= 3) {
    frustrationScore += 30;
    detectedSignals.push(`${signals.consecutiveWrongAnswers} consecutive wrong answers`);
  } else if (signals.consecutiveWrongAnswers >= 2) {
    frustrationScore += 15;
    detectedSignals.push('2 wrong answers in a row');
  }

  // Declining scores
  if (signals.recentScores.length >= 3) {
    const lastThree = signals.recentScores.slice(-3);
    if (lastThree[2] < lastThree[1] && lastThree[1] < lastThree[0]) {
      frustrationScore += 20;
      detectedSignals.push('declining quiz scores');
    }
  }

  // Frustration keywords
  if (signals.frustrationKeywordsUsed) {
    frustrationScore += 25;
    detectedSignals.push('frustration expressed in message');
  }

  // High hint usage
  if (signals.hintsUsed > 3) {
    frustrationScore += 10;
    confusionScore += 15;
    detectedSignals.push('heavy hint usage');
  }

  // === CONFUSION DETECTION ===

  // Help keywords
  if (signals.helpKeywordsUsed) {
    confusionScore += 20;
    detectedSignals.push('seeking help/clarification');
  }

  // Multiple question marks
  if (signals.questionMarksInMessage >= 2) {
    confusionScore += 15;
    detectedSignals.push('multiple questions asked');
  }

  // Very long or very short responses (confusion pattern)
  if (signals.messageLength > 0 && (signals.messageLength < 10 || signals.messageLength > 500)) {
    confusionScore += 10;
    if (signals.messageLength < 10) {
      detectedSignals.push('very short response (possible uncertainty)');
    } else {
      detectedSignals.push('very long response (possible overwhelm)');
    }
  }

  // Long time on questions
  if (signals.averageTimePerQuestion > 60) {
    confusionScore += 15;
    detectedSignals.push('taking longer than usual on questions');
  }

  // === FLOW STATE DETECTION ===

  // Consecutive correct answers
  if (signals.consecutiveCorrectAnswers >= 5) {
    flowScore += 40;
    detectedSignals.push(`${signals.consecutiveCorrectAnswers} correct answers in a row`);
  } else if (signals.consecutiveCorrectAnswers >= 3) {
    flowScore += 25;
    detectedSignals.push('streak of correct answers');
  }

  // Good session length
  if (signals.sessionDurationMinutes >= 15 && signals.sessionDurationMinutes <= 45) {
    flowScore += 10;
    detectedSignals.push('engaged session length');
  }

  // Good completion rate
  if (signals.atomsCompleted > 0 && signals.atomsSkipped === 0) {
    flowScore += 15;
    confidenceScore += 10;
    detectedSignals.push('completing content without skipping');
  }

  // Quick but accurate
  if (signals.averageTimePerQuestion < 30 && signals.consecutiveCorrectAnswers >= 2) {
    flowScore += 20;
    confidenceScore += 15;
    detectedSignals.push('quick and accurate responses');
  }

  // === DISENGAGEMENT DETECTION ===

  // Skipping content
  if (signals.atomsSkipped > 0) {
    disengagementScore += 15 * signals.atomsSkipped;
    detectedSignals.push(`skipped ${signals.atomsSkipped} content items`);
  }

  // Very short session
  if (signals.sessionDurationMinutes < 5 && signals.averageSessionLength > 10) {
    disengagementScore += 25;
    detectedSignals.push('session shorter than usual');
  }

  // Long time since last activity
  if (signals.timeSinceLastActivity > 60 * 24 * 3) { // 3+ days
    disengagementScore += 20;
    detectedSignals.push('returning after extended break');
  }

  // === ANXIETY DETECTION ===

  // Fast incorrect answers (rushing through)
  if (signals.averageTimePerQuestion < 10 && signals.consecutiveWrongAnswers >= 2) {
    anxietyScore += 25;
    detectedSignals.push('rushing through questions');
  }

  // === CONFIDENCE DETECTION ===

  // High recent scores
  if (signals.recentScores.length > 0) {
    const avgScore = signals.recentScores.reduce((a, b) => a + b, 0) / signals.recentScores.length;
    if (avgScore >= 85) {
      confidenceScore += 25;
      detectedSignals.push('consistently high scores');
    }
  }

  // Minimal hint usage with good results
  if (signals.hintsUsed === 0 && signals.consecutiveCorrectAnswers >= 2) {
    confidenceScore += 15;
    detectedSignals.push('succeeding without hints');
  }

  // === DETERMINE PRIMARY STATE ===

  const scores = {
    frustrated: frustrationScore,
    confused: confusionScore,
    flowing: flowScore,
    disengaged: disengagementScore,
    anxious: anxietyScore,
    confident: confidenceScore,
    neutral: 20, // Base score for neutral
  };

  const maxScore = Math.max(...Object.values(scores));
  const primaryState = (Object.entries(scores).find(([, score]) => score === maxScore)?.[0] || 'neutral') as EmotionalState;
  const confidence = Math.min(maxScore / 100, 1);

  // Generate response strategy based on state
  const { responseStrategy, toneGuidance, suggestedOpeners } = getResponseStrategy(primaryState, signals);

  return {
    primaryState,
    confidence,
    signals: detectedSignals,
    responseStrategy,
    toneGuidance,
    suggestedOpeners,
  };
}

/**
 * Get response strategy for a given emotional state
 */
function getResponseStrategy(
  state: EmotionalState,
  signals: EmotionalSignals
): { responseStrategy: string; toneGuidance: string[]; suggestedOpeners: string[] } {
  switch (state) {
    case 'frustrated':
      return {
        responseStrategy: 'Acknowledge difficulty, normalize struggle, simplify approach, remind of past wins',
        toneGuidance: [
          'Be extra empathetic and patient',
          'Use phrases like "This trips up a lot of people"',
          'Break the problem into smaller pieces',
          'Offer a different approach or analogy',
          'Remind them of something they got right before',
        ],
        suggestedOpeners: [
          "I hear you - this is one of the trickier concepts. Let's slow down and approach it differently.",
          "You know what? This particular topic catches a lot of people. You're not alone here.",
          "Let's take a step back. I think I can explain this in a way that will click better for you.",
          "Before we tackle this again, remember how you nailed [previous concept]? Same brain, different topic.",
        ],
      };

    case 'confused':
      return {
        responseStrategy: 'Clarify understanding, use different examples, check foundational knowledge',
        toneGuidance: [
          'Avoid adding more complexity',
          'Use simpler language and analogies',
          'Ask clarifying questions to find the gap',
          'Validate that confusion is normal in learning',
        ],
        suggestedOpeners: [
          "Let me try explaining that differently. Think of it like this...",
          "Good question! Let's make sure we're on the same page first - what part feels most unclear?",
          "I want to make sure I'm explaining this well. Can you tell me what you DO understand so far?",
          "Sometimes it helps to step back to basics. Let's start from the ground up.",
        ],
      };

    case 'flowing':
      return {
        responseStrategy: 'Challenge appropriately, maintain momentum, introduce advanced concepts',
        toneGuidance: [
          'Match their energy - be enthusiastic',
          'Push them with harder questions',
          'Connect concepts across lessons',
          'Celebrate without breaking flow',
        ],
        suggestedOpeners: [
          "You're crushing it! Ready for something a bit more challenging?",
          "I love seeing you in the zone like this. Let's push further...",
          "You've got this down. Now, here's where it gets interesting...",
          "Perfect! Since you've mastered that, let me show you how it connects to something bigger.",
        ],
      };

    case 'disengaged':
      return {
        responseStrategy: 'Re-engage with relevance, connect to goals, lower barrier to re-entry',
        toneGuidance: [
          "Don't guilt or pressure",
          'Connect material to their stated goals',
          'Make next steps feel manageable',
          "Remind them why they're doing this",
        ],
        suggestedOpeners: [
          "Hey! Any time spent learning is time well spent. What would be most helpful right now?",
          "Welcome back! Even 5 minutes moves you forward. What feels most relevant to work on?",
          "Good to see you! I remember you were interested in [goal]. Want to pick up where we left off?",
          "Every expert was once a beginner who showed up imperfectly. What can we tackle today?",
        ],
      };

    case 'anxious':
      return {
        responseStrategy: 'Reduce pressure, normalize mistakes, focus on process over results',
        toneGuidance: [
          'Slow down the pace',
          'Emphasize that mistakes are learning',
          'Remove time pressure language',
          'Build confidence with smaller wins',
        ],
        suggestedOpeners: [
          "Take your time - there's no rush here. Learning isn't a race.",
          "Hey, mistakes are just data. They show us where to focus. What made you choose that answer?",
          "Remember, understanding matters more than speed. Let's slow down and think through this together.",
          "You don't have to get everything right to learn. Let's focus on the process.",
        ],
      };

    case 'confident':
      return {
        responseStrategy: 'Validate expertise, provide advanced challenges, invite teaching back',
        toneGuidance: [
          'Treat them as capable',
          'Challenge with edge cases',
          'Ask them to explain concepts',
          'Introduce nuance and complexity',
        ],
        suggestedOpeners: [
          "You're really getting this! Can you explain it back to me in your own words?",
          "Nice work! Here's an edge case to consider - what would you do if...?",
          "You've got a solid foundation. Ready to go deeper into the nuances?",
          "I'm impressed! Let me throw a curveball at you...",
        ],
      };

    case 'neutral':
    default:
      return {
        responseStrategy: 'Standard Socratic engagement, maintain warmth, check for engagement',
        toneGuidance: [
          'Be warm and encouraging',
          'Ask engaging questions',
          'Build connection gradually',
          'Watch for emotional signals',
        ],
        suggestedOpeners: [
          "Great question! Let's work through this together.",
          "I'm curious - what's your initial thinking on this?",
          "Let's explore this step by step. What do you already know about...?",
          "Interesting! Before I answer, tell me what you think.",
        ],
      };
  }
}

/**
 * Analyze message text for emotional keywords
 */
export function analyzeMessageForEmotions(message: string): {
  helpKeywordsUsed: boolean;
  frustrationKeywordsUsed: boolean;
  questionMarksCount: number;
} {
  const lowerMessage = message.toLowerCase();

  const helpKeywordsUsed = HELP_KEYWORDS.some(keyword => lowerMessage.includes(keyword));
  const frustrationKeywordsUsed = FRUSTRATION_KEYWORDS.some(keyword => lowerMessage.includes(keyword));
  const questionMarksCount = (message.match(/\?/g) || []).length;

  return {
    helpKeywordsUsed,
    frustrationKeywordsUsed,
    questionMarksCount,
  };
}

/**
 * Build emotional context string for the AI coach
 */
export function buildEmotionalContext(analysis: EmotionalAnalysis): string {
  if (analysis.confidence < 0.2) {
    return ''; // Not confident enough to add emotional context
  }

  return `
=== LEARNER EMOTIONAL STATE ===
Detected State: ${analysis.primaryState.toUpperCase()} (confidence: ${Math.round(analysis.confidence * 100)}%)
Behavioral Signals:
${analysis.signals.map(s => `- ${s}`).join('\n')}

Response Strategy: ${analysis.responseStrategy}

Tone Guidance:
${analysis.toneGuidance.map(t => `- ${t}`).join('\n')}

Consider opening with something like:
"${analysis.suggestedOpeners[Math.floor(Math.random() * analysis.suggestedOpeners.length)]}"
`;
}
