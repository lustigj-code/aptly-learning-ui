/**
 * Intent Classifier
 *
 * Classifies user intents for routing decisions.
 * Supports both rule-based and LLM-based classification.
 */

import {
  AgentContext,
  AgentType,
  IntentClassification,
  IntentType,
  StudentState,
} from '../types';

/**
 * Intent pattern definition
 */
interface IntentPattern {
  intent: IntentType;
  patterns: RegExp[];
  keywords: string[];
  suggestedAgent: AgentType;
  priority: number;
}

/**
 * Classification context for enhanced accuracy
 */
interface ClassificationContext {
  currentActivity?: {
    type: string;
    isCorrect?: boolean;
    questionIndex?: number;
  };
  studentState?: Partial<StudentState>;
  recentMessages?: string[];
  sessionDuration?: number;
}

/**
 * Intent patterns ordered by priority
 */
const INTENT_PATTERNS: IntentPattern[] = [
  // Quiz answers - highest priority for quick matching
  {
    intent: 'quiz_answer',
    patterns: [
      /^[a-d]$/i,
      /^option\s*[a-d]$/i,
      /^answer:?\s*[a-d]$/i,
      /i('ll)?\s*(choose|pick|select|go with)\s*[a-d]/i,
      /^(it'?s|that'?s)\s*[a-d]$/i,
    ],
    keywords: ['answer', 'option', 'choice'],
    suggestedAgent: 'quiz',
    priority: 100,
  },

  // Help requests
  {
    intent: 'request_help',
    patterns: [
      /\bhelp\b/i,
      /\bstuck\b/i,
      /don'?t\s*(understand|get|know)/i,
      /i'?m\s*(confused|lost)/i,
      /can you\s*(help|explain)/i,
      /what\s*do(es)?\s*.*\s*mean/i,
      /i\s*need\s*(help|assistance)/i,
    ],
    keywords: ['help', 'stuck', 'confused', 'explain', 'understand'],
    suggestedAgent: 'remediation',
    priority: 90,
  },

  // Questions
  {
    intent: 'ask_question',
    patterns: [
      /\?$/,
      /^(what|why|how|when|where|who|which)\b/i,
      /can you (tell|show|explain)/i,
      /could you (clarify|elaborate)/i,
      /i('d)?\s*(like|want)\s*to\s*know/i,
    ],
    keywords: ['what', 'why', 'how', 'question'],
    suggestedAgent: 'remediation',
    priority: 80,
  },

  // Skip/move on requests
  {
    intent: 'skip_request',
    patterns: [
      /\bskip\b/i,
      /\bnext\b/i,
      /move\s*on/i,
      /something\s*(else|different)/i,
      /let'?s\s*continue/i,
      /i('ll)?\s*pass/i,
    ],
    keywords: ['skip', 'next', 'move', 'pass'],
    suggestedAgent: 'content',
    priority: 70,
  },

  // Review requests
  {
    intent: 'review_request',
    patterns: [
      /\breview\b/i,
      /go\s*back/i,
      /\bagain\b/i,
      /\brepeat\b/i,
      /one\s*more\s*time/i,
      /can\s*(we|i)\s*revisit/i,
      /let'?s\s*review/i,
    ],
    keywords: ['review', 'again', 'repeat', 'back'],
    suggestedAgent: 'content',
    priority: 70,
  },

  // Session completion
  {
    intent: 'session_complete',
    patterns: [
      /\bdone\b/i,
      /\bfinish(ed)?\b/i,
      /end\s*(session|learning)/i,
      /\bstop\b/i,
      /\bquit\b/i,
      /that'?s\s*(all|enough)/i,
      /i'?m\s*done/i,
      /take\s*a\s*break/i,
    ],
    keywords: ['done', 'finish', 'stop', 'quit', 'end'],
    suggestedAgent: 'summary',
    priority: 60,
  },

  // General chat/greetings
  {
    intent: 'general_chat',
    patterns: [
      /^(hi|hello|hey|yo)\b/i,
      /^(thanks|thank you)/i,
      /^(ok|okay|sure|yes|no|yeah|nope)\b/i,
      /^(good|great|awesome|nice|cool)\b/i,
    ],
    keywords: ['hi', 'hello', 'thanks', 'ok'],
    suggestedAgent: 'remediation',
    priority: 10,
  },
];

/**
 * Implicit intent signals based on context
 */
interface ImplicitSignal {
  condition: (context: ClassificationContext) => boolean;
  intent: IntentType;
  agent: AgentType;
  confidence: number;
  reason: string;
}

const IMPLICIT_SIGNALS: ImplicitSignal[] = [
  // Struggling after wrong answers
  {
    condition: (ctx) => {
      const state = ctx.studentState;
      return (state?.consecutiveWrong ?? 0) >= 2;
    },
    intent: 'struggling',
    agent: 'remediation',
    confidence: 0.85,
    reason: 'Multiple consecutive wrong answers detected',
  },

  // Disengagement from low activity
  {
    condition: (ctx) => {
      return ctx.studentState?.engagementLevel === 'low';
    },
    intent: 'disengaged',
    agent: 'motivation',
    confidence: 0.8,
    reason: 'Low engagement level detected',
  },

  // Frustration
  {
    condition: (ctx) => {
      return ctx.studentState?.emotionalState === 'frustrated';
    },
    intent: 'struggling',
    agent: 'remediation',
    confidence: 0.9,
    reason: 'Student frustration detected',
  },

  // In quiz context, any non-matching input might be an answer attempt
  {
    condition: (ctx) => {
      return ctx.currentActivity?.type === 'quiz';
    },
    intent: 'quiz_answer',
    agent: 'quiz',
    confidence: 0.6,
    reason: 'Message received during quiz activity',
  },
];

/**
 * Classify intent from a user message
 */
export function classifyIntent(
  message: string,
  context?: ClassificationContext
): IntentClassification {
  const trimmedMessage = message.trim();

  // Check explicit patterns first
  const patternMatch = matchPatterns(trimmedMessage);
  if (patternMatch && patternMatch.confidence >= 0.7) {
    return patternMatch;
  }

  // Check implicit signals from context
  if (context) {
    const implicitMatch = checkImplicitSignals(context);
    if (implicitMatch && implicitMatch.confidence >= 0.7) {
      // If we have both pattern and implicit, merge them
      if (patternMatch) {
        return {
          ...patternMatch,
          confidence: Math.max(patternMatch.confidence, implicitMatch.confidence),
          reasoning: `${patternMatch.reasoning}; ${implicitMatch.reasoning}`,
        };
      }
      return implicitMatch;
    }
  }

  // Return pattern match if we have one
  if (patternMatch) {
    return patternMatch;
  }

  // Default: need content
  return {
    type: 'need_content',
    confidence: 0.4,
    extractedEntities: extractEntities(trimmedMessage),
    suggestedAgent: 'content',
    reasoning: 'No specific intent detected, defaulting to content delivery',
  };
}

/**
 * Match message against intent patterns
 */
function matchPatterns(message: string): IntentClassification | null {
  const lowerMessage = message.toLowerCase();

  for (const pattern of INTENT_PATTERNS) {
    // Check regex patterns
    for (const regex of pattern.patterns) {
      if (regex.test(message)) {
        return {
          type: pattern.intent,
          confidence: 0.85,
          extractedEntities: extractEntities(message),
          suggestedAgent: pattern.suggestedAgent,
          reasoning: `Matched pattern: ${regex.source}`,
        };
      }
    }

    // Check keywords with lower confidence
    for (const keyword of pattern.keywords) {
      if (lowerMessage.includes(keyword)) {
        return {
          type: pattern.intent,
          confidence: 0.65,
          extractedEntities: extractEntities(message),
          suggestedAgent: pattern.suggestedAgent,
          reasoning: `Matched keyword: ${keyword}`,
        };
      }
    }
  }

  return null;
}

/**
 * Check implicit signals from context
 */
function checkImplicitSignals(
  context: ClassificationContext
): IntentClassification | null {
  for (const signal of IMPLICIT_SIGNALS) {
    if (signal.condition(context)) {
      return {
        type: signal.intent,
        confidence: signal.confidence,
        extractedEntities: {},
        suggestedAgent: signal.agent,
        reasoning: signal.reason,
      };
    }
  }
  return null;
}

/**
 * Extract entities from message
 */
function extractEntities(message: string): Record<string, string> {
  const entities: Record<string, string> = {};

  // Extract answer choice
  const answerMatch = message.match(/\b([a-d])\b/i);
  if (answerMatch) {
    entities.answer = answerMatch[1].toUpperCase();
  }

  // Extract concept mentions
  const conceptPatterns = [
    /about\s+["']?(\w+(?:\s+\w+)?)["']?/i,
    /understand\s+["']?(\w+(?:\s+\w+)?)["']?/i,
    /explain\s+["']?(\w+(?:\s+\w+)?)["']?/i,
    /what\s+is\s+["']?(\w+(?:\s+\w+)?)["']?/i,
    /what\s+does\s+["']?(\w+(?:\s+\w+)?)["']?\s+mean/i,
  ];

  for (const pattern of conceptPatterns) {
    const match = message.match(pattern);
    if (match) {
      entities.concept = match[1].trim();
      break;
    }
  }

  // Extract numbers (might be quiz question numbers)
  const numberMatch = message.match(/\b(\d+)\b/);
  if (numberMatch) {
    entities.number = numberMatch[1];
  }

  return entities;
}

/**
 * Calculate confidence adjustment based on context
 */
export function adjustConfidenceForContext(
  baseConfidence: number,
  intent: IntentType,
  context?: ClassificationContext
): number {
  if (!context) return baseConfidence;

  let adjustment = 0;

  // Boost confidence if intent matches current activity
  if (context.currentActivity) {
    if (intent === 'quiz_answer' && context.currentActivity.type === 'quiz') {
      adjustment += 0.1;
    }
    if (intent === 'review_request' && context.currentActivity.type === 'review') {
      adjustment += 0.1;
    }
  }

  // Boost help-related intents if student is struggling
  if (context.studentState) {
    const state = context.studentState;
    if (
      (intent === 'request_help' || intent === 'struggling') &&
      ((state.consecutiveWrong ?? 0) >= 1 || state.emotionalState === 'confused')
    ) {
      adjustment += 0.1;
    }
  }

  return Math.min(1.0, baseConfidence + adjustment);
}

/**
 * Get suggested follow-up intents based on current intent
 */
export function getSuggestedFollowUps(intent: IntentType): IntentType[] {
  const followUpMap: Record<IntentType, IntentType[]> = {
    quiz_answer: ['request_help', 'skip_request', 'need_content'],
    request_help: ['quiz_answer', 'need_content', 'skip_request'],
    ask_question: ['need_content', 'quiz_answer'],
    struggling: ['request_help', 'skip_request', 'session_complete'],
    session_complete: [],
    disengaged: ['session_complete', 'skip_request'],
    skip_request: ['need_content', 'quiz_answer'],
    review_request: ['quiz_answer', 'need_content'],
    need_content: ['quiz_answer', 'ask_question'],
    general_chat: ['need_content', 'ask_question'],
  };

  return followUpMap[intent] || ['need_content'];
}
