/**
 * Struggle Detector Unit Tests
 *
 * Tests for the v2 confidence decay and reduced sensitivity thresholds:
 * - Same question failure tracking (2x threshold)
 * - Text atom overtime tracking (3x estimated time)
 * - Confidence decay over time
 * - shouldShowHelpPrompt decision logic
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initStruggleTracking,
  clearStruggleTracking,
  recordQuizAnswer,
  startTextAtomTracking,
  endTextAtomTracking,
  getDecayedConfidence,
  resetConfidence,
  shouldShowHelpPrompt,
  getQuestionFailureCount,
  getSessionState,
  THRESHOLDS,
} from '../struggleDetector';

// ============================================
// TEST SETUP
// ============================================

const TEST_SESSION_ID = 'test-session-123';

beforeEach(() => {
  // Clear any existing session state
  clearStruggleTracking(TEST_SESSION_ID);
  vi.useFakeTimers();
});

afterEach(() => {
  clearStruggleTracking(TEST_SESSION_ID);
  vi.useRealTimers();
});

// ============================================
// SAME QUESTION FAILURE TRACKING TESTS
// ============================================

describe('Same Question Failure Tracking', () => {
  const QUESTION_ID = 'question-abc';

  it('should not trigger help prompt on first failure', () => {
    initStruggleTracking(TEST_SESSION_ID);

    // First wrong answer
    recordQuizAnswer(TEST_SESSION_ID, QUESTION_ID, false, 10000);

    const failures = getQuestionFailureCount(TEST_SESSION_ID, QUESTION_ID);
    expect(failures).toBe(1);

    const result = shouldShowHelpPrompt(TEST_SESSION_ID, { questionId: QUESTION_ID });
    expect(result.shouldShow).toBe(false);
  });

  it('should trigger help prompt on second failure of same question', () => {
    initStruggleTracking(TEST_SESSION_ID);

    // First wrong answer
    recordQuizAnswer(TEST_SESSION_ID, QUESTION_ID, false, 10000);
    // Second wrong answer on SAME question
    recordQuizAnswer(TEST_SESSION_ID, QUESTION_ID, false, 10000);

    const failures = getQuestionFailureCount(TEST_SESSION_ID, QUESTION_ID);
    expect(failures).toBe(2);

    const result = shouldShowHelpPrompt(TEST_SESSION_ID, { questionId: QUESTION_ID });
    expect(result.shouldShow).toBe(true);
    expect(result.reason).toBe('same_question_failed_twice');
    expect(result.details).toMatchObject({
      questionId: QUESTION_ID,
      failureCount: 2,
    });
  });

  it('should NOT trigger help prompt when failing different questions', () => {
    initStruggleTracking(TEST_SESSION_ID);

    // Fail question A once
    recordQuizAnswer(TEST_SESSION_ID, 'question-A', false, 10000);
    // Fail question B once
    recordQuizAnswer(TEST_SESSION_ID, 'question-B', false, 10000);

    // Neither question has 2 failures
    const resultA = shouldShowHelpPrompt(TEST_SESSION_ID, { questionId: 'question-A' });
    const resultB = shouldShowHelpPrompt(TEST_SESSION_ID, { questionId: 'question-B' });

    expect(resultA.shouldShow).toBe(false);
    expect(resultB.shouldShow).toBe(false);
  });

  it('should reset question failure count on correct answer', () => {
    initStruggleTracking(TEST_SESSION_ID);

    // Fail once
    recordQuizAnswer(TEST_SESSION_ID, QUESTION_ID, false, 10000);
    expect(getQuestionFailureCount(TEST_SESSION_ID, QUESTION_ID)).toBe(1);

    // Get it right
    recordQuizAnswer(TEST_SESSION_ID, QUESTION_ID, true, 10000);
    expect(getQuestionFailureCount(TEST_SESSION_ID, QUESTION_ID)).toBe(0);
  });

  it('should return failure count from recordQuizAnswer', () => {
    initStruggleTracking(TEST_SESSION_ID);

    const result1 = recordQuizAnswer(TEST_SESSION_ID, QUESTION_ID, false, 10000);
    expect(result1.sameQuestionFailures).toBe(1);

    const result2 = recordQuizAnswer(TEST_SESSION_ID, QUESTION_ID, false, 10000);
    expect(result2.sameQuestionFailures).toBe(2);
  });
});

// ============================================
// TEXT ATOM OVERTIME TRACKING TESTS
// ============================================

describe('Text Atom Overtime Tracking', () => {
  const ATOM_ID = 'atom-reading-123';
  const ESTIMATED_MINUTES = 2; // 2 minutes = 120000ms

  it('should not trigger when time is within threshold', () => {
    initStruggleTracking(TEST_SESSION_ID);

    // Start tracking
    startTextAtomTracking(TEST_SESSION_ID, ATOM_ID);

    // Advance time by 2x estimated (still under 3x threshold)
    vi.advanceTimersByTime(ESTIMATED_MINUTES * 60 * 1000 * 2);

    const result = endTextAtomTracking(TEST_SESSION_ID, ATOM_ID, ESTIMATED_MINUTES);

    expect(result.exceedsThreshold).toBe(false);
    expect(result.multiplier).toBeCloseTo(2, 1);
    expect(result.struggleState.isStruggling).toBe(false);
  });

  it('should trigger when time exceeds 3x threshold', () => {
    initStruggleTracking(TEST_SESSION_ID);

    // Start tracking
    startTextAtomTracking(TEST_SESSION_ID, ATOM_ID);

    // Advance time by 3.5x estimated (exceeds 3x threshold)
    vi.advanceTimersByTime(ESTIMATED_MINUTES * 60 * 1000 * 3.5);

    const result = endTextAtomTracking(TEST_SESSION_ID, ATOM_ID, ESTIMATED_MINUTES);

    expect(result.exceedsThreshold).toBe(true);
    expect(result.multiplier).toBeCloseTo(3.5, 1);
    expect(result.struggleState.isStruggling).toBe(true);
    expect(result.struggleState.signals[0].type).toBe('time_anomaly');
    expect(result.struggleState.signals[0].context).toMatchObject({
      isTextAtomOvertime: true,
    });
  });

  it('should trigger help prompt when text atom exceeds threshold', () => {
    initStruggleTracking(TEST_SESSION_ID);

    startTextAtomTracking(TEST_SESSION_ID, ATOM_ID);
    vi.advanceTimersByTime(ESTIMATED_MINUTES * 60 * 1000 * 4); // 4x

    const trackingResult = endTextAtomTracking(TEST_SESSION_ID, ATOM_ID, ESTIMATED_MINUTES);
    expect(trackingResult.exceedsThreshold).toBe(true);

    const promptResult = shouldShowHelpPrompt(TEST_SESSION_ID, {
      textAtomExceedsThreshold: true,
    });

    expect(promptResult.shouldShow).toBe(true);
    expect(promptResult.reason).toBe('text_atom_overtime');
  });

  it('should handle missing start time gracefully', () => {
    initStruggleTracking(TEST_SESSION_ID);

    // End without starting
    const result = endTextAtomTracking(TEST_SESSION_ID, 'never-started', ESTIMATED_MINUTES);

    expect(result.timeSpentMs).toBe(0);
    expect(result.exceedsThreshold).toBe(false);
    expect(result.multiplier).toBe(0);
  });

  it('should calculate correct severity based on multiplier', () => {
    initStruggleTracking(TEST_SESSION_ID);

    // Test mild severity (3x-4x)
    startTextAtomTracking(TEST_SESSION_ID, 'atom-mild');
    vi.advanceTimersByTime(ESTIMATED_MINUTES * 60 * 1000 * 3.5);
    const mildResult = endTextAtomTracking(TEST_SESSION_ID, 'atom-mild', ESTIMATED_MINUTES);
    expect(mildResult.struggleState.signals[0].severity).toBe('mild');

    // Test moderate severity (4x-5x)
    startTextAtomTracking(TEST_SESSION_ID, 'atom-moderate');
    vi.advanceTimersByTime(ESTIMATED_MINUTES * 60 * 1000 * 4.5);
    const moderateResult = endTextAtomTracking(TEST_SESSION_ID, 'atom-moderate', ESTIMATED_MINUTES);
    expect(moderateResult.struggleState.signals[0].severity).toBe('moderate');

    // Test severe severity (>5x)
    startTextAtomTracking(TEST_SESSION_ID, 'atom-severe');
    vi.advanceTimersByTime(ESTIMATED_MINUTES * 60 * 1000 * 6);
    const severeResult = endTextAtomTracking(TEST_SESSION_ID, 'atom-severe', ESTIMATED_MINUTES);
    expect(severeResult.struggleState.signals[0].severity).toBe('severe');
  });
});

// ============================================
// CONFIDENCE DECAY TESTS
// ============================================

describe('Confidence Decay', () => {
  const QUESTION_ID = 'question-decay-test';

  it('should start with zero confidence', () => {
    initStruggleTracking(TEST_SESSION_ID);

    const confidence = getDecayedConfidence(TEST_SESSION_ID);
    expect(confidence).toBe(0);
  });

  it('should accumulate confidence on struggle signals', () => {
    initStruggleTracking(TEST_SESSION_ID);

    // Generate a struggle signal
    recordQuizAnswer(TEST_SESSION_ID, QUESTION_ID, false, 10000);
    recordQuizAnswer(TEST_SESSION_ID, QUESTION_ID, false, 10000);

    const state = getSessionState(TEST_SESSION_ID);
    expect(state?.accumulatedConfidence).toBeGreaterThan(0);
  });

  it('should decay confidence over time', () => {
    initStruggleTracking(TEST_SESSION_ID);

    // Generate struggle signals
    recordQuizAnswer(TEST_SESSION_ID, QUESTION_ID, false, 10000);
    recordQuizAnswer(TEST_SESSION_ID, QUESTION_ID, false, 10000);

    const initialConfidence = getDecayedConfidence(TEST_SESSION_ID);
    expect(initialConfidence).toBeGreaterThan(0);

    // Advance time by 2 minutes (2 decay intervals)
    vi.advanceTimersByTime(THRESHOLDS.CONFIDENCE_DECAY_INTERVAL_MS * 2);

    const decayedConfidence = getDecayedConfidence(TEST_SESSION_ID);
    expect(decayedConfidence).toBeLessThan(initialConfidence);
    expect(decayedConfidence).toBe(initialConfidence - THRESHOLDS.CONFIDENCE_DECAY_RATE * 2);
  });

  it('should not decay below zero', () => {
    initStruggleTracking(TEST_SESSION_ID);

    // Generate a small struggle signal
    recordQuizAnswer(TEST_SESSION_ID, QUESTION_ID, false, 10000);
    recordQuizAnswer(TEST_SESSION_ID, QUESTION_ID, false, 10000);

    // Advance time by many decay intervals
    vi.advanceTimersByTime(THRESHOLDS.CONFIDENCE_DECAY_INTERVAL_MS * 20);

    const decayedConfidence = getDecayedConfidence(TEST_SESSION_ID);
    expect(decayedConfidence).toBe(0);
  });

  it('should reset confidence when explicitly cleared', () => {
    initStruggleTracking(TEST_SESSION_ID);

    // Generate struggle signals
    recordQuizAnswer(TEST_SESSION_ID, QUESTION_ID, false, 10000);
    recordQuizAnswer(TEST_SESSION_ID, QUESTION_ID, false, 10000);

    expect(getDecayedConfidence(TEST_SESSION_ID)).toBeGreaterThan(0);

    resetConfidence(TEST_SESSION_ID);

    expect(getDecayedConfidence(TEST_SESSION_ID)).toBe(0);
  });

  it('should NOT show help prompt after confidence decays below threshold', () => {
    initStruggleTracking(TEST_SESSION_ID);

    // Generate struggle signals
    recordQuizAnswer(TEST_SESSION_ID, QUESTION_ID, false, 10000);
    recordQuizAnswer(TEST_SESSION_ID, QUESTION_ID, false, 10000);

    // Initially should show prompt
    const initialResult = shouldShowHelpPrompt(TEST_SESSION_ID, { questionId: QUESTION_ID });
    expect(initialResult.shouldShow).toBe(true);

    // Advance time significantly to decay confidence
    vi.advanceTimersByTime(THRESHOLDS.CONFIDENCE_DECAY_INTERVAL_MS * 10);

    // After decay, should not show prompt even though failures still exist
    const afterDecayResult = shouldShowHelpPrompt(TEST_SESSION_ID, { questionId: QUESTION_ID });
    expect(afterDecayResult.shouldShow).toBe(false);
    expect(afterDecayResult.confidence).toBeLessThan(THRESHOLDS.HELP_PROMPT_CONFIDENCE_THRESHOLD);
  });
});

// ============================================
// shouldShowHelpPrompt INTEGRATION TESTS
// ============================================

describe('shouldShowHelpPrompt', () => {
  it('should return false when no struggle conditions are met', () => {
    initStruggleTracking(TEST_SESSION_ID);

    const result = shouldShowHelpPrompt(TEST_SESSION_ID, {});

    expect(result.shouldShow).toBe(false);
    expect(result.reason).toBe('none');
  });

  it('should prioritize same-question failures over general struggles', () => {
    initStruggleTracking(TEST_SESSION_ID);

    const questionId = 'priority-test-question';

    // Fail same question twice
    recordQuizAnswer(TEST_SESSION_ID, questionId, false, 10000);
    recordQuizAnswer(TEST_SESSION_ID, questionId, false, 10000);

    const result = shouldShowHelpPrompt(TEST_SESSION_ID, {
      questionId,
      textAtomExceedsThreshold: true, // Both conditions met
    });

    // Should report the question failure reason first
    expect(result.shouldShow).toBe(true);
    expect(result.reason).toBe('same_question_failed_twice');
  });

  it('should require specific conditions - not just any struggle signal', () => {
    initStruggleTracking(TEST_SESSION_ID);

    // Generate general consecutive wrong answers (different questions)
    recordQuizAnswer(TEST_SESSION_ID, 'q1', false, 10000);
    recordQuizAnswer(TEST_SESSION_ID, 'q2', false, 10000);
    recordQuizAnswer(TEST_SESSION_ID, 'q3', false, 10000);

    // Even with many wrong answers, help prompt shouldn't show
    // because no SAME question was failed twice
    const result = shouldShowHelpPrompt(TEST_SESSION_ID, {
      questionId: 'q4', // Different question
    });

    expect(result.shouldShow).toBe(false);
  });

  it('should include confidence in result', () => {
    initStruggleTracking(TEST_SESSION_ID);

    const questionId = 'confidence-check';
    recordQuizAnswer(TEST_SESSION_ID, questionId, false, 10000);
    recordQuizAnswer(TEST_SESSION_ID, questionId, false, 10000);

    const result = shouldShowHelpPrompt(TEST_SESSION_ID, { questionId });

    expect(result.confidence).toBeGreaterThan(0);
    expect(typeof result.confidence).toBe('number');
  });
});

// ============================================
// THRESHOLD VALUES TESTS
// ============================================

describe('Threshold Configuration', () => {
  it('should have correct threshold values', () => {
    expect(THRESHOLDS.SAME_QUESTION_FAILURES_TO_HELP).toBe(2);
    expect(THRESHOLDS.TEXT_ATOM_TIME_MULTIPLIER).toBe(3);
    expect(THRESHOLDS.CONFIDENCE_DECAY_RATE).toBe(0.1);
    expect(THRESHOLDS.CONFIDENCE_DECAY_INTERVAL_MS).toBe(60000);
    expect(THRESHOLDS.HELP_PROMPT_CONFIDENCE_THRESHOLD).toBe(0.6);
  });
});
