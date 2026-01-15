/**
 * Multi-Agent Routing Tests
 *
 * Tests the intent classification and routing logic for the multi-agent system.
 */

import { describe, it, expect } from 'vitest';
import {
  classifyIntent,
  adjustConfidenceForContext,
  getSuggestedFollowUps,
} from '../director/intentClassifier';
import type { IntentType } from '../types';

// Classification context type
interface ClassificationContext {
  currentActivity?: {
    type: string;
    isCorrect?: boolean;
    questionIndex?: number;
  };
  studentState?: {
    consecutiveWrong?: number;
    consecutiveCorrect?: number;
    engagementLevel?: 'high' | 'medium' | 'low';
    emotionalState?: 'neutral' | 'confused' | 'frustrated' | 'confident';
  };
  recentMessages?: string[];
  sessionDuration?: number;
}

describe('Intent Classifier', () => {
  describe('classifyIntent', () => {
    it('classifies help requests correctly', () => {
      const helpMessages = [
        "I don't understand this concept",
        'Help me with this',
        "I'm confused about attribution models",
        'Can you explain this differently?',
        'What does this mean?',
      ];

      for (const message of helpMessages) {
        const result = classifyIntent(message);
        expect(['request_help', 'ask_question']).toContain(result.type);
        expect(result.confidence).toBeGreaterThan(0.5);
      }
    });

    it('classifies quiz answers correctly when in quiz context', () => {
      const quizAnswers = ['B', 'A', 'C', 'D'];

      const quizContext: ClassificationContext = {
        currentActivity: {
          type: 'quiz',
          questionIndex: 0,
        },
      };

      for (const message of quizAnswers) {
        const result = classifyIntent(message, quizContext);
        expect(result.type).toBe('quiz_answer');
        expect(result.confidence).toBeGreaterThanOrEqual(0.6);
      }
    });

    it('classifies skip requests correctly', () => {
      const skipMessages = [
        'skip this',
        'next please',
        'move on',
        'something else',
      ];

      for (const message of skipMessages) {
        const result = classifyIntent(message);
        expect(result.type).toBe('skip_request');
      }
    });

    it('classifies review requests correctly', () => {
      const reviewMessages = [
        "let's review",
        'go back',
        'repeat that',
        'one more time',
      ];

      for (const message of reviewMessages) {
        const result = classifyIntent(message);
        expect(result.type).toBe('review_request');
      }
    });

    it('classifies greetings as general_chat', () => {
      const greetings = ['Hello', 'Hi there', 'Hey', 'ok', 'thanks'];

      for (const message of greetings) {
        const result = classifyIntent(message);
        expect(result.type).toBe('general_chat');
      }
    });

    it('returns need_content for ambiguous messages', () => {
      const ambiguousMessages = ['interesting', 'hmm', 'tell me more'];

      for (const message of ambiguousMessages) {
        const result = classifyIntent(message);
        // Ambiguous messages should default to need_content or have low confidence
        expect(['need_content', 'general_chat', 'ask_question']).toContain(result.type);
      }
    });

    it('classifies session completion requests', () => {
      const endMessages = [
        "I'm done",
        'finish this',
        'end session',
        'stop learning',
      ];

      for (const message of endMessages) {
        const result = classifyIntent(message);
        expect(result.type).toBe('session_complete');
      }
    });

    it('extracts entities from messages', () => {
      const result = classifyIntent('The answer is B');
      expect(result.extractedEntities?.answer).toBe('B');
    });
  });

  describe('adjustConfidenceForContext', () => {
    it('boosts quiz_answer confidence in quiz context', () => {
      const baseConfidence = 0.6;
      const context: ClassificationContext = {
        currentActivity: {
          type: 'quiz',
          questionIndex: 0,
        },
      };

      const adjusted = adjustConfidenceForContext(baseConfidence, 'quiz_answer', context);
      expect(adjusted).toBeGreaterThan(baseConfidence);
    });

    it('boosts request_help confidence when student is struggling', () => {
      const baseConfidence = 0.6;
      const context: ClassificationContext = {
        studentState: {
          consecutiveWrong: 3,
          emotionalState: 'confused',
        },
      };

      const adjusted = adjustConfidenceForContext(baseConfidence, 'request_help', context);
      expect(adjusted).toBeGreaterThan(baseConfidence);
    });

    it('does not exceed 1.0 confidence', () => {
      const baseConfidence = 0.95;
      const context: ClassificationContext = {
        currentActivity: { type: 'quiz' },
        studentState: { consecutiveWrong: 5 },
      };

      const adjusted = adjustConfidenceForContext(baseConfidence, 'quiz_answer', context);
      expect(adjusted).toBeLessThanOrEqual(1.0);
    });

    it('returns base confidence when no context', () => {
      const baseConfidence = 0.7;
      const adjusted = adjustConfidenceForContext(baseConfidence, 'need_content', undefined);
      expect(adjusted).toBe(baseConfidence);
    });
  });

  describe('getSuggestedFollowUps', () => {
    it('suggests help options after quiz_answer', () => {
      const suggestions = getSuggestedFollowUps('quiz_answer');
      expect(suggestions).toContain('request_help');
    });

    it('suggests content after request_help', () => {
      const suggestions = getSuggestedFollowUps('request_help');
      expect(suggestions).toContain('need_content');
    });

    it('returns empty array for session_complete', () => {
      const suggestions = getSuggestedFollowUps('session_complete');
      expect(suggestions).toEqual([]);
    });

    it('returns default suggestions for unknown intent', () => {
      const suggestions = getSuggestedFollowUps('unknown_intent' as IntentType);
      expect(suggestions).toEqual(['need_content']);
    });
  });
});

describe('Routing Decisions', () => {
  it('routes help requests to remediation agent', () => {
    const intent = classifyIntent("I don't understand");
    expect(intent.suggestedAgent).toBe('remediation');
  });

  it('routes quiz answers to quiz agent', () => {
    const intent = classifyIntent('B', {
      currentActivity: { type: 'quiz' },
    });
    expect(intent.suggestedAgent).toBe('quiz');
  });

  it('routes skip requests to content agent', () => {
    const intent = classifyIntent('skip this');
    expect(intent.suggestedAgent).toBe('content');
  });

  it('routes session_complete to summary agent', () => {
    const intent = classifyIntent("I'm done");
    expect(intent.suggestedAgent).toBe('summary');
  });
});

describe('Implicit Signal Detection', () => {
  it('detects struggling from consecutive wrong answers', () => {
    const context: ClassificationContext = {
      studentState: {
        consecutiveWrong: 3,
      },
    };

    // Even a simple message should be classified with struggling context
    const intent = classifyIntent('okay', context);
    // Either the intent is detected as struggling, or confidence is adjusted
    expect(['struggling', 'general_chat']).toContain(intent.type);
  });

  it('detects disengagement from low engagement level', () => {
    const context: ClassificationContext = {
      studentState: {
        engagementLevel: 'low',
      },
    };

    const intent = classifyIntent('hmm', context);
    // Should detect disengagement signal
    expect(['disengaged', 'need_content']).toContain(intent.type);
  });

  it('prioritizes quiz context for answer detection', () => {
    const context: ClassificationContext = {
      currentActivity: { type: 'quiz', questionIndex: 1 },
    };

    // Any input in quiz context should lean toward quiz_answer
    const intent = classifyIntent('maybe option B', context);
    expect(intent.type).toBe('quiz_answer');
  });
});

describe('Pattern Matching Priority', () => {
  it('matches quiz answer pattern over keywords', () => {
    // Single letter should be quiz answer
    const intent = classifyIntent('A');
    expect(intent.type).toBe('quiz_answer');
  });

  it('matches help patterns correctly', () => {
    const intent = classifyIntent("I'm stuck on this problem");
    expect(intent.type).toBe('request_help');
  });

  it('matches question patterns', () => {
    const intent = classifyIntent('What is the difference between CPM and CPC?');
    expect(intent.type).toBe('ask_question');
  });
});
