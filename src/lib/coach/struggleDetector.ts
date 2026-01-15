/**
 * Struggle Detector
 *
 * Detects struggle signals from learning behavior and determines when
 * the proactive coach should surface automatically.
 *
 * Part of Agent 2-2: Proactive Coach - Struggle Detection
 */

// ============================================
// TYPES
// ============================================

export interface StruggleSignal {
  type: 'consecutive_wrong' | 'time_anomaly' | 'reread' | 'mastery_regression' | 'help_seeking';
  severity: 'mild' | 'moderate' | 'severe';
  confidence: number;
  context: Record<string, unknown>;
}

export interface StruggleState {
  isStruggling: boolean;
  signals: StruggleSignal[];
  overallSeverity: 'none' | 'mild' | 'moderate' | 'severe';
  suggestedIntervention: InterventionType;
  skillId?: string;
}

export type InterventionType =
  | 'none'
  | 'hint'
  | 'alternative_explanation'
  | 'prerequisite_review'
  | 'simpler_practice'
  | 'coach_session'
  | 'break_suggestion'
  | 'engagement_prompt';

// Session tracking state
interface SessionTrackingState {
  sessionId: string;
  consecutiveWrongCount: number;
  lastAnswerTime: number;
  answerTimes: number[]; // Response times in ms
  contentViews: Map<string, number>; // contentId -> view count
  masteryHistory: Map<string, number[]>; // skillId -> mastery values over time
  totalAnswers: number;
  wrongAnswers: number;
  createdAt: number;
  // Enhanced tracking for confidence decay (v2)
  questionFailures: Map<string, number>; // questionId -> failure count
  textAtomStartTimes: Map<string, number>; // atomId -> start timestamp
  lastStruggleSignalTime: number; // For confidence decay calculation
  accumulatedConfidence: number; // Decays over time without new signals
}

// ============================================
// THRESHOLDS
// ============================================

const THRESHOLDS = {
  // Consecutive wrong answers
  CONSECUTIVE_WRONG_MILD: 2,
  CONSECUTIVE_WRONG_MODERATE: 3,
  CONSECUTIVE_WRONG_SEVERE: 4,

  // Time anomalies
  GUESSING_TIME_MS: 5000, // < 5s = likely guessing
  CONFUSED_TIME_MS: 180000, // > 3 minutes = confused/stuck

  // Content re-reading
  REREAD_MILD: 2,
  REREAD_MODERATE: 3,
  REREAD_SEVERE: 5,

  // Mastery regression
  MASTERY_DROP_MODERATE: 0.1, // 10% drop
  MASTERY_DROP_SEVERE: 0.2, // 20% drop

  // Overall confidence
  CONFIDENCE_THRESHOLD: 0.5,

  // Help prompt thresholds (v2 - less sensitive)
  SAME_QUESTION_FAILURES_TO_HELP: 2, // Fail same question twice
  TEXT_ATOM_TIME_MULTIPLIER: 3, // >3x estimated reading time

  // Confidence decay
  CONFIDENCE_DECAY_RATE: 0.1, // Decay per minute without new signals
  CONFIDENCE_DECAY_INTERVAL_MS: 60000, // 1 minute intervals
  HELP_PROMPT_CONFIDENCE_THRESHOLD: 0.6, // Higher threshold for help prompt
};

// ============================================
// SESSION STORAGE
// ============================================

const sessionStates = new Map<string, SessionTrackingState>();

/**
 * Initialize struggle tracking for a session
 */
export function initStruggleTracking(sessionId: string): void {
  if (!sessionStates.has(sessionId)) {
    sessionStates.set(sessionId, {
      sessionId,
      consecutiveWrongCount: 0,
      lastAnswerTime: Date.now(),
      answerTimes: [],
      contentViews: new Map(),
      masteryHistory: new Map(),
      totalAnswers: 0,
      wrongAnswers: 0,
      createdAt: Date.now(),
      // v2 fields
      questionFailures: new Map(),
      textAtomStartTimes: new Map(),
      lastStruggleSignalTime: 0,
      accumulatedConfidence: 0,
    });
  }
}

/**
 * Clear tracking for a session
 */
export function clearStruggleTracking(sessionId: string): void {
  sessionStates.delete(sessionId);
}

/**
 * Get session state (for debugging/testing)
 */
export function getSessionState(sessionId: string): SessionTrackingState | undefined {
  return sessionStates.get(sessionId);
}

// ============================================
// TRACKING FUNCTIONS
// ============================================

/**
 * Record an answer and evaluate struggle state
 */
export function recordAnswer(
  sessionId: string,
  isCorrect: boolean,
  responseTimeMs: number,
  skillId?: string,
  questionId?: string
): StruggleState {
  initStruggleTracking(sessionId);
  const state = sessionStates.get(sessionId)!;

  // Update tracking state
  state.totalAnswers++;
  state.answerTimes.push(responseTimeMs);
  state.lastAnswerTime = Date.now();

  if (!isCorrect) {
    state.consecutiveWrongCount++;
    state.wrongAnswers++;

    // Track question-specific failures (v2)
    if (questionId) {
      const currentFailures = state.questionFailures.get(questionId) || 0;
      const newFailures = currentFailures + 1;
      state.questionFailures.set(questionId, newFailures);

      // Update struggle signal time when same-question threshold is met
      if (newFailures >= THRESHOLDS.SAME_QUESTION_FAILURES_TO_HELP) {
        state.lastStruggleSignalTime = Date.now();
        state.accumulatedConfidence = Math.max(
          state.accumulatedConfidence,
          0.7 + (newFailures - 2) * 0.1
        );
      }
    }
  } else {
    state.consecutiveWrongCount = 0;
    // Clear question failures on correct answer
    if (questionId) {
      state.questionFailures.delete(questionId);
    }
  }

  // Keep only last 20 response times
  if (state.answerTimes.length > 20) {
    state.answerTimes = state.answerTimes.slice(-20);
  }

  // Collect signals
  const signals: StruggleSignal[] = [];

  // Check consecutive wrong
  if (state.consecutiveWrongCount >= THRESHOLDS.CONSECUTIVE_WRONG_MILD) {
    const severity = getSeverityFromConsecutiveWrong(state.consecutiveWrongCount);
    signals.push({
      type: 'consecutive_wrong',
      severity,
      confidence: calculateConsecutiveWrongConfidence(state.consecutiveWrongCount),
      context: {
        count: state.consecutiveWrongCount,
        total: state.totalAnswers,
        questionId,
      },
    });
  }

  // Check time anomaly
  const timeSignal = checkTimeAnomaly(responseTimeMs, state.answerTimes);
  if (timeSignal) {
    signals.push(timeSignal);
  }

  // Update confidence decay tracking
  if (signals.length > 0) {
    state.lastStruggleSignalTime = Date.now();
    state.accumulatedConfidence = Math.max(
      state.accumulatedConfidence,
      signals.reduce((max, s) => Math.max(max, s.confidence), 0)
    );
  }

  return evaluateStruggle(signals, skillId);
}

/**
 * Record quiz answer with question ID for same-question tracking (v2)
 */
export function recordQuizAnswer(
  sessionId: string,
  questionId: string,
  isCorrect: boolean,
  responseTimeMs: number,
  skillId?: string
): StruggleState & { sameQuestionFailures: number } {
  const result = recordAnswer(sessionId, isCorrect, responseTimeMs, skillId, questionId);
  const state = sessionStates.get(sessionId)!;
  const sameQuestionFailures = state.questionFailures.get(questionId) || 0;

  return {
    ...result,
    sameQuestionFailures,
  };
}

/**
 * Record content view and check for re-reading patterns
 */
export function recordContentView(sessionId: string, contentId: string): StruggleState {
  initStruggleTracking(sessionId);
  const state = sessionStates.get(sessionId)!;

  // Increment view count
  const currentCount = state.contentViews.get(contentId) || 0;
  state.contentViews.set(contentId, currentCount + 1);

  const viewCount = currentCount + 1;
  const signals: StruggleSignal[] = [];

  // Check for re-reading
  if (viewCount >= THRESHOLDS.REREAD_MILD) {
    const severity = getSeverityFromRereadCount(viewCount);
    signals.push({
      type: 'reread',
      severity,
      confidence: calculateRereadConfidence(viewCount),
      context: {
        contentId,
        viewCount,
      },
    });
  }

  return evaluateStruggle(signals);
}

/**
 * Record mastery change and check for regression
 */
export function recordMasteryChange(
  sessionId: string,
  skillId: string,
  newMastery: number
): StruggleState {
  initStruggleTracking(sessionId);
  const state = sessionStates.get(sessionId)!;

  // Get or initialize mastery history for this skill
  const history = state.masteryHistory.get(skillId) || [];
  history.push(newMastery);
  state.masteryHistory.set(skillId, history);

  // Keep only last 10 mastery values
  if (history.length > 10) {
    state.masteryHistory.set(skillId, history.slice(-10));
  }

  const signals: StruggleSignal[] = [];

  // Check for mastery regression
  if (history.length >= 2) {
    const prevMastery = history[history.length - 2];
    const drop = prevMastery - newMastery;

    if (drop >= THRESHOLDS.MASTERY_DROP_MODERATE) {
      const severity = drop >= THRESHOLDS.MASTERY_DROP_SEVERE ? 'severe' : 'moderate';
      signals.push({
        type: 'mastery_regression',
        severity,
        confidence: calculateMasteryRegressionConfidence(drop, history),
        context: {
          skillId,
          previousMastery: prevMastery,
          newMastery,
          drop,
        },
      });
    }
  }

  return evaluateStruggle(signals, skillId);
}

// ============================================
// TEXT ATOM TIME TRACKING (v2)
// ============================================

/**
 * Start tracking time spent on a text atom
 */
export function startTextAtomTracking(sessionId: string, atomId: string): void {
  initStruggleTracking(sessionId);
  const state = sessionStates.get(sessionId)!;
  state.textAtomStartTimes.set(atomId, Date.now());
}

/**
 * End tracking and check if user spent >3x estimated reading time
 * @param estimatedMinutes - The atom's estimatedMinutes field
 * @returns Object with time spent info and struggle state
 */
export function endTextAtomTracking(
  sessionId: string,
  atomId: string,
  estimatedMinutes: number
): {
  timeSpentMs: number;
  estimatedMs: number;
  exceedsThreshold: boolean;
  multiplier: number;
  struggleState: StruggleState;
} {
  initStruggleTracking(sessionId);
  const state = sessionStates.get(sessionId)!;

  const startTime = state.textAtomStartTimes.get(atomId);
  if (!startTime) {
    return {
      timeSpentMs: 0,
      estimatedMs: estimatedMinutes * 60 * 1000,
      exceedsThreshold: false,
      multiplier: 0,
      struggleState: evaluateStruggle([]),
    };
  }

  const timeSpentMs = Date.now() - startTime;
  const estimatedMs = estimatedMinutes * 60 * 1000;
  const multiplier = estimatedMs > 0 ? timeSpentMs / estimatedMs : 0;
  const exceedsThreshold = multiplier > THRESHOLDS.TEXT_ATOM_TIME_MULTIPLIER;

  // Clean up tracking
  state.textAtomStartTimes.delete(atomId);

  const signals: StruggleSignal[] = [];

  if (exceedsThreshold) {
    // Confidence increases with how much they exceeded the threshold
    const excessMultiplier = multiplier - THRESHOLDS.TEXT_ATOM_TIME_MULTIPLIER;
    const confidence = Math.min(0.5 + excessMultiplier * 0.15, 0.95);

    signals.push({
      type: 'time_anomaly',
      severity: multiplier > 5 ? 'severe' : multiplier > 4 ? 'moderate' : 'mild',
      confidence,
      context: {
        atomId,
        timeSpentMs,
        estimatedMs,
        multiplier,
        isTextAtomOvertime: true,
      },
    });

    // Update confidence decay tracking
    state.lastStruggleSignalTime = Date.now();
    state.accumulatedConfidence = Math.max(state.accumulatedConfidence, confidence);
  }

  return {
    timeSpentMs,
    estimatedMs,
    exceedsThreshold,
    multiplier,
    struggleState: evaluateStruggle(signals),
  };
}

// ============================================
// CONFIDENCE DECAY (v2)
// ============================================

/**
 * Calculate decayed confidence based on time since last struggle signal
 */
export function getDecayedConfidence(sessionId: string, currentTime?: number): number {
  const state = sessionStates.get(sessionId);
  if (!state || state.accumulatedConfidence === 0) {
    return 0;
  }

  const now = currentTime ?? Date.now();
  const timeSinceLastSignal = now - state.lastStruggleSignalTime;
  const decayIntervals = Math.floor(timeSinceLastSignal / THRESHOLDS.CONFIDENCE_DECAY_INTERVAL_MS);
  const decay = decayIntervals * THRESHOLDS.CONFIDENCE_DECAY_RATE;

  return Math.max(0, state.accumulatedConfidence - decay);
}

/**
 * Reset accumulated confidence (e.g., after user dismisses help prompt)
 */
export function resetConfidence(sessionId: string): void {
  const state = sessionStates.get(sessionId);
  if (state) {
    state.accumulatedConfidence = 0;
    state.lastStruggleSignalTime = 0;
  }
}

// ============================================
// HELP PROMPT DECISION (v2)
// ============================================

/**
 * Determine if the "Need Help?" prompt should be shown
 *
 * The prompt triggers ONLY if:
 * 1. User fails the same quiz question twice, OR
 * 2. User spends >3x estimated reading time on a text atom
 *
 * Confidence decay applies: if significant time has passed since the struggle
 * signal, the prompt won't show (user may have moved on).
 */
export function shouldShowHelpPrompt(
  sessionId: string,
  options: {
    questionId?: string;
    textAtomExceedsThreshold?: boolean;
    currentTime?: number;
  } = {}
): {
  shouldShow: boolean;
  reason: 'same_question_failed_twice' | 'text_atom_overtime' | 'none';
  confidence: number;
  details: Record<string, unknown>;
} {
  initStruggleTracking(sessionId);
  const state = sessionStates.get(sessionId)!;
  const now = options.currentTime ?? Date.now();

  // Check for same question failed twice
  if (options.questionId) {
    const failures = state.questionFailures.get(options.questionId) || 0;
    if (failures >= THRESHOLDS.SAME_QUESTION_FAILURES_TO_HELP) {
      // For same-question failures, use a higher base confidence
      // Since this is a specific trigger, we're confident the user needs help
      const baseConfidence = 0.7 + (failures - 2) * 0.1; // 0.7 for 2 failures, increases with more

      // Calculate decay from last struggle signal
      const timeSinceLastSignal = now - state.lastStruggleSignalTime;
      const decayIntervals = Math.floor(timeSinceLastSignal / THRESHOLDS.CONFIDENCE_DECAY_INTERVAL_MS);
      const decay = decayIntervals * THRESHOLDS.CONFIDENCE_DECAY_RATE;
      const effectiveConfidence = Math.max(0, baseConfidence - decay);

      if (effectiveConfidence >= THRESHOLDS.HELP_PROMPT_CONFIDENCE_THRESHOLD) {
        return {
          shouldShow: true,
          reason: 'same_question_failed_twice',
          confidence: effectiveConfidence,
          details: {
            questionId: options.questionId,
            failureCount: failures,
            threshold: THRESHOLDS.SAME_QUESTION_FAILURES_TO_HELP,
          },
        };
      }
    }
  }

  // Check for text atom overtime
  if (options.textAtomExceedsThreshold) {
    // For text atom overtime, the confidence was already set when tracking ended
    const decayedConfidence = getDecayedConfidence(sessionId, now);
    if (decayedConfidence >= THRESHOLDS.HELP_PROMPT_CONFIDENCE_THRESHOLD) {
      return {
        shouldShow: true,
        reason: 'text_atom_overtime',
        confidence: decayedConfidence,
        details: {
          timeMultiplierThreshold: THRESHOLDS.TEXT_ATOM_TIME_MULTIPLIER,
        },
      };
    }
  }

  const finalConfidence = getDecayedConfidence(sessionId, now);
  return {
    shouldShow: false,
    reason: 'none',
    confidence: finalConfidence,
    details: {
      questionFailures: options.questionId
        ? state.questionFailures.get(options.questionId) || 0
        : 0,
      textAtomExceedsThreshold: options.textAtomExceedsThreshold || false,
    },
  };
}

/**
 * Get current question failure count for a specific question
 */
export function getQuestionFailureCount(sessionId: string, questionId: string): number {
  const state = sessionStates.get(sessionId);
  if (!state) return 0;
  return state.questionFailures.get(questionId) || 0;
}

// ============================================
// EVALUATION FUNCTIONS
// ============================================

/**
 * Evaluate overall struggle state from signals
 */
export function evaluateStruggle(signals: StruggleSignal[], skillId?: string): StruggleState {
  if (signals.length === 0) {
    return {
      isStruggling: false,
      signals: [],
      overallSeverity: 'none',
      suggestedIntervention: 'none',
      skillId,
    };
  }

  // Calculate overall severity (take the worst)
  const overallSeverity = getOverallSeverity(signals);

  // Calculate average confidence
  const avgConfidence =
    signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;

  // Only consider struggling if confidence is high enough
  const isStruggling =
    avgConfidence >= THRESHOLDS.CONFIDENCE_THRESHOLD &&
    overallSeverity !== 'none';

  // Get suggested intervention
  const suggestedIntervention = getSuggestedIntervention(signals, overallSeverity);

  return {
    isStruggling,
    signals,
    overallSeverity,
    suggestedIntervention,
    skillId,
  };
}

/**
 * Get suggested intervention based on signals and severity
 */
export function getSuggestedIntervention(
  signals: StruggleSignal[],
  severity: 'none' | 'mild' | 'moderate' | 'severe'
): InterventionType {
  if (severity === 'none') {
    return 'none';
  }

  // Get the primary signal type
  const primarySignal = signals.reduce(
    (best, current) =>
      current.confidence > best.confidence ? current : best,
    signals[0]
  );

  // Severe cases - suggest break or direct help
  if (severity === 'severe') {
    if (primarySignal.type === 'consecutive_wrong') {
      return 'break_suggestion';
    }
    if (primarySignal.type === 'mastery_regression') {
      return 'prerequisite_review';
    }
    return 'coach_session';
  }

  // Moderate cases
  if (severity === 'moderate') {
    switch (primarySignal.type) {
      case 'consecutive_wrong':
        return 'alternative_explanation';
      case 'time_anomaly':
        // Guessing vs confused
        const context = primarySignal.context as { isGuessing?: boolean };
        if (context.isGuessing) {
          return 'engagement_prompt';
        }
        return 'hint';
      case 'reread':
        return 'alternative_explanation';
      case 'mastery_regression':
        return 'simpler_practice';
      default:
        return 'hint';
    }
  }

  // Mild cases - gentle nudge
  switch (primarySignal.type) {
    case 'consecutive_wrong':
      return 'hint';
    case 'time_anomaly':
      return 'engagement_prompt';
    case 'reread':
      return 'hint';
    default:
      return 'hint';
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getSeverityFromConsecutiveWrong(count: number): 'mild' | 'moderate' | 'severe' {
  if (count >= THRESHOLDS.CONSECUTIVE_WRONG_SEVERE) return 'severe';
  if (count >= THRESHOLDS.CONSECUTIVE_WRONG_MODERATE) return 'moderate';
  return 'mild';
}

function getSeverityFromRereadCount(count: number): 'mild' | 'moderate' | 'severe' {
  if (count >= THRESHOLDS.REREAD_SEVERE) return 'severe';
  if (count >= THRESHOLDS.REREAD_MODERATE) return 'moderate';
  return 'mild';
}

function getOverallSeverity(
  signals: StruggleSignal[]
): 'none' | 'mild' | 'moderate' | 'severe' {
  if (signals.length === 0) return 'none';

  const hasSevere = signals.some((s) => s.severity === 'severe');
  if (hasSevere) return 'severe';

  const hasModerate = signals.some((s) => s.severity === 'moderate');
  if (hasModerate) return 'moderate';

  return 'mild';
}

function calculateConsecutiveWrongConfidence(count: number): number {
  // Confidence increases with consecutive wrong answers
  // 2 wrong = 0.5, 3 wrong = 0.7, 4+ wrong = 0.9
  if (count >= 4) return 0.9;
  if (count >= 3) return 0.7;
  return 0.5;
}

function calculateRereadConfidence(viewCount: number): number {
  // Confidence increases with views
  // 2 views = 0.4, 3 views = 0.6, 5+ views = 0.85
  if (viewCount >= 5) return 0.85;
  if (viewCount >= 3) return 0.6;
  return 0.4;
}

function calculateMasteryRegressionConfidence(
  drop: number,
  history: number[]
): number {
  // Higher confidence if we have more history and bigger drop
  const historyFactor = Math.min(history.length / 5, 1); // Max 1.0 at 5+ data points
  const dropFactor = Math.min(drop / 0.3, 1); // Max 1.0 at 30% drop
  return 0.3 + 0.5 * dropFactor + 0.2 * historyFactor;
}

function checkTimeAnomaly(
  responseTimeMs: number,
  recentTimes: number[]
): StruggleSignal | null {
  // Check for guessing (too fast)
  if (responseTimeMs < THRESHOLDS.GUESSING_TIME_MS) {
    // Count recent fast responses
    const recentFast = recentTimes
      .slice(-5)
      .filter((t) => t < THRESHOLDS.GUESSING_TIME_MS).length;

    if (recentFast >= 2) {
      return {
        type: 'time_anomaly',
        severity: recentFast >= 4 ? 'moderate' : 'mild',
        confidence: 0.5 + recentFast * 0.1,
        context: {
          isGuessing: true,
          responseTimeMs,
          recentFastCount: recentFast,
        },
      };
    }
  }

  // Check for confusion (too slow)
  if (responseTimeMs > THRESHOLDS.CONFUSED_TIME_MS) {
    return {
      type: 'time_anomaly',
      severity: 'moderate',
      confidence: 0.7,
      context: {
        isGuessing: false,
        isConfused: true,
        responseTimeMs,
      },
    };
  }

  return null;
}

// ============================================
// INTERVENTION MESSAGES
// ============================================

/**
 * Get a friendly message for the intervention type
 */
export function getInterventionMessage(intervention: InterventionType): string {
  switch (intervention) {
    case 'hint':
      return "Need a hint? I can help guide you to the answer.";
    case 'alternative_explanation':
      return "Let me try explaining this a different way.";
    case 'prerequisite_review':
      return "Let's review some foundational concepts that will make this easier.";
    case 'simpler_practice':
      return "How about we try some simpler practice questions first?";
    case 'coach_session':
      return "I'm here to help! Let's work through this together.";
    case 'break_suggestion':
      return "You've been working hard! Sometimes a short break helps things click.";
    case 'engagement_prompt':
      return "Take your time - there's no rush. Really think about this one.";
    default:
      return "I'm here if you need help!";
  }
}

/**
 * Get a suggested action text for the intervention
 */
export function getInterventionAction(intervention: InterventionType): string {
  switch (intervention) {
    case 'hint':
      return 'Get a hint';
    case 'alternative_explanation':
      return 'Show different explanation';
    case 'prerequisite_review':
      return 'Review basics';
    case 'simpler_practice':
      return 'Try easier questions';
    case 'coach_session':
      return 'Talk to Sage';
    case 'break_suggestion':
      return 'Take a short break';
    case 'engagement_prompt':
      return 'I understand';
    default:
      return 'Get help';
  }
}

// ============================================
// EXPORTS
// ============================================

export { THRESHOLDS };
