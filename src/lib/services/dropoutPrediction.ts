/**
 * Dropout Prediction Service
 *
 * Detects learners at risk of dropping out based on behavioral signals.
 *
 * Key Research Findings:
 * - 72-hour login gap is CRITICAL dropout threshold
 * - 60-65 hours is optimal intervention window
 * - First 2-3 weeks have 76% dropout likelihood
 * - "Silent strugglers" (zero forum interactions) are high risk
 *
 * Source: Aptly Deep Research, EdTech dropout studies
 */

// ============================================================================
// TYPES
// ============================================================================

export type DropoutRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface DropoutRisk {
  userId: string;
  riskLevel: DropoutRiskLevel;
  hoursSinceLastLogin: number;
  signals: DropoutSignal[];
  recommendedAction: RecommendedAction;
  confidence: number;
}

export interface DropoutSignal {
  type: DropoutSignalType;
  value: number | boolean;
  threshold: number | boolean;
  description: string;
}

export type DropoutSignalType =
  | 'login_gap'
  | 'video_skip'
  | 'rapid_guessing'
  | 'retention_rate'
  | 'sentiment_shift'
  | 'silent_struggler'
  | 'enrollment_risk';

export type RecommendedAction =
  | 'none'
  | 'monitor'
  | 'send_reminder'
  | 'send_streak_saver'
  | 'personalized_outreach'
  | 'urgent_intervention';

// ============================================================================
// THRESHOLDS (Research-backed)
// ============================================================================

const DROPOUT_THRESHOLDS = {
  // Login gap thresholds (hours)
  LOGIN_GAP_MEDIUM: 48,
  LOGIN_GAP_HIGH: 60,
  LOGIN_GAP_CRITICAL: 72,

  // Optimal intervention window
  INTERVENTION_WINDOW_START: 60,
  INTERVENTION_WINDOW_END: 72,

  // Video engagement
  VIDEO_SKIP_WARNING: 0.20, // > 20% skipped

  // Response patterns
  RAPID_GUESS_THRESHOLD_MS: 3000, // < 3 seconds

  // Retention
  RETENTION_DANGER_ZONE: 0.70, // < 70% retention

  // Early period (high risk)
  EARLY_PERIOD_DAYS: 21, // First 3 weeks
};

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Calculate hours since last login
 */
function hoursSince(date: Date, now: Date = new Date()): number {
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
}

/**
 * Calculate dropout risk level based on hours since last login
 *
 * Research shows:
 * - 72+ hours = CRITICAL (past tipping point)
 * - 60-72 hours = HIGH (intervention window)
 * - 48-60 hours = MEDIUM (monitor closely)
 * - < 48 hours = LOW
 */
export function calculateDropoutRiskLevel(
  hoursSinceLastLogin: number
): DropoutRiskLevel {
  if (hoursSinceLastLogin >= DROPOUT_THRESHOLDS.LOGIN_GAP_CRITICAL) {
    return 'critical';
  }
  if (hoursSinceLastLogin >= DROPOUT_THRESHOLDS.LOGIN_GAP_HIGH) {
    return 'high';
  }
  if (hoursSinceLastLogin >= DROPOUT_THRESHOLDS.LOGIN_GAP_MEDIUM) {
    return 'medium';
  }
  return 'low';
}

/**
 * Comprehensive dropout risk assessment
 */
export function assessDropoutRisk(
  userId: string,
  lastLoginAt: Date,
  behavioralData: BehavioralData,
  now: Date = new Date()
): DropoutRisk {
  const hoursSinceLogin = hoursSince(lastLoginAt, now);
  const signals = collectDropoutSignals(hoursSinceLogin, behavioralData);

  const riskLevel = calculateComprehensiveRiskLevel(signals);
  const confidence = calculateConfidence(signals);
  const recommendedAction = determineRecommendedAction(riskLevel, hoursSinceLogin, signals);

  return {
    userId,
    riskLevel,
    hoursSinceLastLogin: hoursSinceLogin,
    signals,
    recommendedAction,
    confidence,
  };
}

/**
 * Behavioral data for risk assessment
 */
export interface BehavioralData {
  videoSkipRatio?: number;
  rapidGuessingRatio?: number;
  retentionRate?: number;
  forumInteractions?: number;
  daysSinceEnrollment?: number;
  recentSentimentScore?: number; // -1 to 1
  previousSentimentScore?: number;
}

/**
 * Collect all dropout signals
 */
function collectDropoutSignals(
  hoursSinceLogin: number,
  data: BehavioralData
): DropoutSignal[] {
  const signals: DropoutSignal[] = [];

  // Login gap (always collected)
  signals.push({
    type: 'login_gap',
    value: hoursSinceLogin,
    threshold: DROPOUT_THRESHOLDS.LOGIN_GAP_HIGH,
    description: `${hoursSinceLogin} hours since last login`,
  });

  // Video skip ratio
  if (data.videoSkipRatio !== undefined) {
    signals.push({
      type: 'video_skip',
      value: data.videoSkipRatio,
      threshold: DROPOUT_THRESHOLDS.VIDEO_SKIP_WARNING,
      description: `${Math.round(data.videoSkipRatio * 100)}% of video content skipped`,
    });
  }

  // Rapid guessing
  if (data.rapidGuessingRatio !== undefined && data.rapidGuessingRatio > 0.3) {
    signals.push({
      type: 'rapid_guessing',
      value: data.rapidGuessingRatio,
      threshold: 0.3,
      description: `${Math.round(data.rapidGuessingRatio * 100)}% of responses under 3 seconds`,
    });
  }

  // Retention rate
  if (data.retentionRate !== undefined) {
    signals.push({
      type: 'retention_rate',
      value: data.retentionRate,
      threshold: DROPOUT_THRESHOLDS.RETENTION_DANGER_ZONE,
      description: `${Math.round(data.retentionRate * 100)}% retention rate`,
    });
  }

  // Silent struggler (no forum interactions)
  if (data.forumInteractions !== undefined && data.forumInteractions === 0) {
    signals.push({
      type: 'silent_struggler',
      value: true,
      threshold: false,
      description: 'No forum or community interactions',
    });
  }

  // Early enrollment risk
  if (data.daysSinceEnrollment !== undefined &&
      data.daysSinceEnrollment <= DROPOUT_THRESHOLDS.EARLY_PERIOD_DAYS) {
    signals.push({
      type: 'enrollment_risk',
      value: data.daysSinceEnrollment,
      threshold: DROPOUT_THRESHOLDS.EARLY_PERIOD_DAYS,
      description: `Day ${data.daysSinceEnrollment} of high-risk early period`,
    });
  }

  // Sentiment shift
  if (data.recentSentimentScore !== undefined &&
      data.previousSentimentScore !== undefined) {
    const shift = data.previousSentimentScore - data.recentSentimentScore;
    if (shift > 0.3) { // Significant negative shift
      signals.push({
        type: 'sentiment_shift',
        value: shift,
        threshold: 0.3,
        description: 'Detected negative sentiment shift in recent interactions',
      });
    }
  }

  return signals;
}

/**
 * Calculate comprehensive risk level from all signals
 */
function calculateComprehensiveRiskLevel(signals: DropoutSignal[]): DropoutRiskLevel {
  const loginGapSignal = signals.find(s => s.type === 'login_gap');
  const hoursSinceLogin = loginGapSignal?.value as number || 0;

  // Critical: Past 72-hour threshold
  if (hoursSinceLogin >= DROPOUT_THRESHOLDS.LOGIN_GAP_CRITICAL) {
    return 'critical';
  }

  // Count risk factors
  let riskScore = 0;

  for (const signal of signals) {
    switch (signal.type) {
      case 'login_gap':
        if (hoursSinceLogin >= 60) riskScore += 3;
        else if (hoursSinceLogin >= 48) riskScore += 1;
        break;
      case 'video_skip':
        if ((signal.value as number) > 0.3) riskScore += 2;
        else if ((signal.value as number) > 0.2) riskScore += 1;
        break;
      case 'rapid_guessing':
        riskScore += 2;
        break;
      case 'retention_rate':
        if ((signal.value as number) < 0.7) riskScore += 2;
        break;
      case 'silent_struggler':
        riskScore += 1;
        break;
      case 'enrollment_risk':
        riskScore += 1;
        break;
      case 'sentiment_shift':
        riskScore += 2;
        break;
    }
  }

  // Map score to risk level
  if (riskScore >= 5) return 'high';
  if (riskScore >= 3) return 'medium';
  return 'low';
}

/**
 * Calculate confidence in risk assessment
 */
function calculateConfidence(signals: DropoutSignal[]): number {
  // More signals = higher confidence
  const signalCount = signals.length;
  const baseConfidence = Math.min(0.5, signalCount * 0.1);

  // Login gap is high-confidence signal
  const loginGapSignal = signals.find(s => s.type === 'login_gap');
  const hasLoginData = loginGapSignal !== undefined;

  // Multiple corroborating signals increase confidence
  const riskSignalCount = signals.filter(s => {
    if (typeof s.value === 'number' && typeof s.threshold === 'number') {
      return s.type === 'retention_rate'
        ? s.value < s.threshold
        : s.value > s.threshold;
    }
    return s.value === true;
  }).length;

  const corroborationBonus = riskSignalCount > 2 ? 0.2 : riskSignalCount > 1 ? 0.1 : 0;

  return Math.min(1, baseConfidence + (hasLoginData ? 0.3 : 0) + corroborationBonus);
}

/**
 * Determine recommended action based on risk assessment
 */
function determineRecommendedAction(
  riskLevel: DropoutRiskLevel,
  hoursSinceLogin: number,
  signals: DropoutSignal[]
): RecommendedAction {
  // Critical: Urgent intervention needed
  if (riskLevel === 'critical') {
    return 'urgent_intervention';
  }

  // High risk in intervention window: Streak saver or personalized outreach
  if (riskLevel === 'high') {
    if (hoursSinceLogin >= 60 && hoursSinceLogin < 72) {
      return 'send_streak_saver';
    }
    return 'personalized_outreach';
  }

  // Medium risk: Send reminder
  if (riskLevel === 'medium') {
    return 'send_reminder';
  }

  // Low risk but in early period: Monitor
  const enrollmentSignal = signals.find(s => s.type === 'enrollment_risk');
  if (enrollmentSignal) {
    return 'monitor';
  }

  return 'none';
}

/**
 * Check if user is in optimal intervention window (60-65 hours)
 */
export function isInInterventionWindow(
  lastLoginAt: Date,
  now: Date = new Date()
): boolean {
  const hours = hoursSince(lastLoginAt, now);
  return hours >= DROPOUT_THRESHOLDS.INTERVENTION_WINDOW_START &&
         hours < DROPOUT_THRESHOLDS.LOGIN_GAP_CRITICAL;
}

/**
 * Get users at risk for batch processing
 */
export function filterUsersAtRisk(
  users: Array<{ userId: string; lastLoginAt: Date }>,
  minRiskLevel: DropoutRiskLevel = 'high'
): Array<{ userId: string; lastLoginAt: Date; hoursSinceLogin: number }> {
  const now = new Date();
  const riskLevels: DropoutRiskLevel[] = ['low', 'medium', 'high', 'critical'];
  const minIndex = riskLevels.indexOf(minRiskLevel);

  return users
    .map(user => ({
      ...user,
      hoursSinceLogin: hoursSince(user.lastLoginAt, now),
    }))
    .filter(user => {
      const level = calculateDropoutRiskLevel(user.hoursSinceLogin);
      return riskLevels.indexOf(level) >= minIndex;
    })
    .sort((a, b) => b.hoursSinceLogin - a.hoursSinceLogin); // Most at-risk first
}

// ============================================================================
// EXPORTS
// ============================================================================

export { DROPOUT_THRESHOLDS };
