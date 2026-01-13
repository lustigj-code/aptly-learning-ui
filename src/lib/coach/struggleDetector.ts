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
  skillId?: string
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
  } else {
    state.consecutiveWrongCount = 0;
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
      },
    });
  }

  // Check time anomaly
  const timeSignal = checkTimeAnomaly(responseTimeMs, state.answerTimes);
  if (timeSignal) {
    signals.push(timeSignal);
  }

  return evaluateStruggle(signals, skillId);
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
