/**
 * Efficacy Metrics Framework
 * Tracks and calculates metrics that PROVE adaptive learning works better
 * Used for A/B testing, investor reports, and product decisions
 */

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

// ============================================
// TYPES
// ============================================

export interface EfficacyMetrics {
  // Completion Metrics
  courseCompletionRate: number;      // % who finish full course
  lessonCompletionRate: number;      // % who finish lessons they start
  sessionCompletionRate: number;     // % who complete planned session items
  atomCompletionRate: number;        // % of atoms completed vs started

  // Engagement Metrics
  returnRate: {
    day1: number;                    // % who return next day
    day7: number;                    // % who return within week
    day30: number;                   // % who return within month
  };
  sessionFrequency: number;          // Sessions per week
  averageSessionLength: number;      // Minutes per session
  streakMaintenance: number;         // % who maintain 7+ day streaks

  // Learning Metrics
  skillMasteryRate: number;          // % of skills reaching 95% mastery
  averageTimeToMastery: number;      // Minutes to reach mastery per skill
  retentionRate: number;             // % retained on delayed test
  quizAccuracy: number;              // Average quiz score
  masteryVelocity: number;           // Skills mastered per hour of learning

  // Efficiency Metrics
  contentSkipRate: number;           // % of content skipped via pre-tests
  reviewEfficiency: number;          // % of reviews that maintain mastery
  interventionSuccessRate: number;   // % of struggles resolved by intervention
  coachUtilization: number;          // % of sessions where coach is used
}

export interface MetricsComparison {
  metric: string;
  controlValue: number;
  treatmentValue: number;
  absoluteDiff: number;
  percentDiff: number;
  statisticalSignificance: number;   // p-value
  isSignificant: boolean;            // p < 0.05
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface CohortMetricsResult {
  cohortId: string;
  userCount: number;
  metrics: EfficacyMetrics;
  calculatedAt: Date;
}

// ============================================
// STATISTICAL HELPERS
// ============================================

/**
 * Normal CDF approximation for p-value calculation
 */
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Two-proportion z-test for statistical significance
 */
export function calculateSignificance(
  controlN: number,
  controlSuccesses: number,
  treatmentN: number,
  treatmentSuccesses: number
): { zScore: number; pValue: number; isSignificant: boolean } {
  if (controlN === 0 || treatmentN === 0) {
    return { zScore: 0, pValue: 1, isSignificant: false };
  }

  const p1 = controlSuccesses / controlN;
  const p2 = treatmentSuccesses / treatmentN;
  const pPooled = (controlSuccesses + treatmentSuccesses) / (controlN + treatmentN);

  const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / controlN + 1 / treatmentN));

  if (se === 0) {
    return { zScore: 0, pValue: 1, isSignificant: false };
  }

  const zScore = (p2 - p1) / se;
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore)));

  return {
    zScore,
    pValue,
    isSignificant: pValue < 0.05,
  };
}

// ============================================
// METRIC CALCULATION HELPERS
// ============================================

/**
 * Calculate completion rate from arrays
 */
function calculateCompletionRate(completed: number, started: number): number {
  if (started === 0) return 0;
  return Math.round((completed / started) * 100 * 100) / 100;
}

/**
 * Calculate average from array of numbers
 */
function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 100) / 100;
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Calculate efficacy metrics for a cohort of users
 * @param cohort - Array of user IDs
 * @param dateRange - Date range for analysis
 */
export async function calculateMetrics(
  cohort: string[],
  dateRange: DateRange
): Promise<EfficacyMetrics> {
  if (cohort.length === 0) {
    return getEmptyMetrics();
  }

  // Aggregate data from all users in cohort
  const userMetrics: EfficacyMetrics[] = [];

  for (const userId of cohort) {
    try {
      const metrics = await calculateUserMetrics(userId, dateRange);
      userMetrics.push(metrics);
    } catch (error) {
      console.error(`Error calculating metrics for user ${userId}:`, error);
    }
  }

  if (userMetrics.length === 0) {
    return getEmptyMetrics();
  }

  // Average all metrics across users
  return {
    courseCompletionRate: calculateAverage(userMetrics.map(m => m.courseCompletionRate)),
    lessonCompletionRate: calculateAverage(userMetrics.map(m => m.lessonCompletionRate)),
    sessionCompletionRate: calculateAverage(userMetrics.map(m => m.sessionCompletionRate)),
    atomCompletionRate: calculateAverage(userMetrics.map(m => m.atomCompletionRate)),
    returnRate: {
      day1: calculateAverage(userMetrics.map(m => m.returnRate.day1)),
      day7: calculateAverage(userMetrics.map(m => m.returnRate.day7)),
      day30: calculateAverage(userMetrics.map(m => m.returnRate.day30)),
    },
    sessionFrequency: calculateAverage(userMetrics.map(m => m.sessionFrequency)),
    averageSessionLength: calculateAverage(userMetrics.map(m => m.averageSessionLength)),
    streakMaintenance: calculateAverage(userMetrics.map(m => m.streakMaintenance)),
    skillMasteryRate: calculateAverage(userMetrics.map(m => m.skillMasteryRate)),
    averageTimeToMastery: calculateAverage(userMetrics.map(m => m.averageTimeToMastery)),
    retentionRate: calculateAverage(userMetrics.map(m => m.retentionRate)),
    quizAccuracy: calculateAverage(userMetrics.map(m => m.quizAccuracy)),
    masteryVelocity: calculateAverage(userMetrics.map(m => m.masteryVelocity)),
    contentSkipRate: calculateAverage(userMetrics.map(m => m.contentSkipRate)),
    reviewEfficiency: calculateAverage(userMetrics.map(m => m.reviewEfficiency)),
    interventionSuccessRate: calculateAverage(userMetrics.map(m => m.interventionSuccessRate)),
    coachUtilization: calculateAverage(userMetrics.map(m => m.coachUtilization)),
  };
}

/**
 * Calculate efficacy metrics for a single user
 * @param userId - User's Firebase UID
 * @param dateRange - Date range for analysis
 */
export async function calculateUserMetrics(
  userId: string,
  dateRange: DateRange
): Promise<EfficacyMetrics> {
  // Get user progress data
  const progressDoc = await adminDb.collection('userProgress').doc(userId).get();
  const progress = progressDoc.data();

  // Get analytics events for this user in date range
  const eventsSnapshot = await adminDb
    .collection('analyticsEvents')
    .where('userId', '==', userId)
    .where('timestamp', '>=', Timestamp.fromDate(dateRange.start))
    .where('timestamp', '<=', Timestamp.fromDate(dateRange.end))
    .get();

  const events = eventsSnapshot.docs.map(doc => doc.data());

  // Get skill states
  const skillsSnapshot = await adminDb
    .collection('skillStates')
    .doc(userId)
    .collection('skills')
    .get();

  const skills = skillsSnapshot.docs.map(doc => doc.data());

  // Get retention test results
  const retentionSnapshot = await adminDb
    .collection('retentionTests')
    .where('userId', '==', userId)
    .where('status', '==', 'completed')
    .get();

  const retentionTests = retentionSnapshot.docs.map(doc => doc.data());

  // Calculate metrics
  return {
    // Completion Metrics
    courseCompletionRate: calculateCompletionRateFromEvents(events, 'course'),
    lessonCompletionRate: calculateCompletionRateFromEvents(events, 'lesson'),
    sessionCompletionRate: calculateSessionCompletionRate(events),
    atomCompletionRate: calculateCompletionRateFromEvents(events, 'atom'),

    // Engagement Metrics
    returnRate: calculateReturnRates(events, dateRange),
    sessionFrequency: calculateSessionFrequency(events, dateRange),
    averageSessionLength: calculateAverageSessionLength(events),
    streakMaintenance: calculateStreakMaintenance(progress),

    // Learning Metrics
    skillMasteryRate: calculateSkillMasteryRate(skills),
    averageTimeToMastery: calculateAverageTimeToMastery(skills, events),
    retentionRate: calculateRetentionRate(retentionTests),
    quizAccuracy: calculateQuizAccuracy(events),
    masteryVelocity: calculateMasteryVelocity(skills, progress),

    // Efficiency Metrics
    contentSkipRate: calculateContentSkipRate(events),
    reviewEfficiency: calculateReviewEfficiency(events),
    interventionSuccessRate: calculateInterventionSuccessRate(events),
    coachUtilization: calculateCoachUtilization(events),
  };
}

/**
 * Compare metrics between control and treatment cohorts
 */
export function compareMetrics(
  control: EfficacyMetrics,
  treatment: EfficacyMetrics,
  controlN: number,
  treatmentN: number
): MetricsComparison[] {
  const comparisons: MetricsComparison[] = [];
  const metricsToCompare: (keyof Omit<EfficacyMetrics, 'returnRate'>)[] = [
    'courseCompletionRate',
    'lessonCompletionRate',
    'sessionCompletionRate',
    'atomCompletionRate',
    'sessionFrequency',
    'averageSessionLength',
    'streakMaintenance',
    'skillMasteryRate',
    'averageTimeToMastery',
    'retentionRate',
    'quizAccuracy',
    'masteryVelocity',
    'contentSkipRate',
    'reviewEfficiency',
    'interventionSuccessRate',
    'coachUtilization',
  ];

  for (const metric of metricsToCompare) {
    const controlValue = control[metric] as number;
    const treatmentValue = treatment[metric] as number;
    const absoluteDiff = treatmentValue - controlValue;
    const percentDiff = controlValue !== 0
      ? ((treatmentValue - controlValue) / controlValue) * 100
      : 0;

    // Convert rates to counts for significance calculation
    const controlSuccesses = Math.round((controlValue / 100) * controlN);
    const treatmentSuccesses = Math.round((treatmentValue / 100) * treatmentN);

    const significance = calculateSignificance(
      controlN,
      controlSuccesses,
      treatmentN,
      treatmentSuccesses
    );

    comparisons.push({
      metric,
      controlValue: Math.round(controlValue * 100) / 100,
      treatmentValue: Math.round(treatmentValue * 100) / 100,
      absoluteDiff: Math.round(absoluteDiff * 100) / 100,
      percentDiff: Math.round(percentDiff * 100) / 100,
      statisticalSignificance: Math.round(significance.pValue * 10000) / 10000,
      isSignificant: significance.isSignificant,
    });
  }

  // Add return rate comparisons
  for (const day of ['day1', 'day7', 'day30'] as const) {
    const controlValue = control.returnRate[day];
    const treatmentValue = treatment.returnRate[day];
    const absoluteDiff = treatmentValue - controlValue;
    const percentDiff = controlValue !== 0
      ? ((treatmentValue - controlValue) / controlValue) * 100
      : 0;

    const controlSuccesses = Math.round((controlValue / 100) * controlN);
    const treatmentSuccesses = Math.round((treatmentValue / 100) * treatmentN);

    const significance = calculateSignificance(
      controlN,
      controlSuccesses,
      treatmentN,
      treatmentSuccesses
    );

    comparisons.push({
      metric: `returnRate.${day}`,
      controlValue: Math.round(controlValue * 100) / 100,
      treatmentValue: Math.round(treatmentValue * 100) / 100,
      absoluteDiff: Math.round(absoluteDiff * 100) / 100,
      percentDiff: Math.round(percentDiff * 100) / 100,
      statisticalSignificance: Math.round(significance.pValue * 10000) / 10000,
      isSignificant: significance.isSignificant,
    });
  }

  return comparisons;
}

/**
 * Store calculated metrics for a cohort
 */
export async function storeCohortMetrics(
  cohortId: string,
  metrics: EfficacyMetrics,
  userCount: number
): Promise<void> {
  await adminDb.collection('cohortMetrics').doc(cohortId).set({
    metrics,
    userCount,
    calculatedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Get stored metrics for a cohort
 */
export async function getCohortMetrics(
  cohortId: string
): Promise<CohortMetricsResult | null> {
  const doc = await adminDb.collection('cohortMetrics').doc(cohortId).get();

  if (!doc.exists) return null;

  const data = doc.data();
  return {
    cohortId,
    userCount: data?.userCount || 0,
    metrics: data?.metrics || getEmptyMetrics(),
    calculatedAt: data?.calculatedAt?.toDate() || new Date(),
  };
}

// ============================================
// METRIC CALCULATION HELPERS
// ============================================

function getEmptyMetrics(): EfficacyMetrics {
  return {
    courseCompletionRate: 0,
    lessonCompletionRate: 0,
    sessionCompletionRate: 0,
    atomCompletionRate: 0,
    returnRate: { day1: 0, day7: 0, day30: 0 },
    sessionFrequency: 0,
    averageSessionLength: 0,
    streakMaintenance: 0,
    skillMasteryRate: 0,
    averageTimeToMastery: 0,
    retentionRate: 0,
    quizAccuracy: 0,
    masteryVelocity: 0,
    contentSkipRate: 0,
    reviewEfficiency: 0,
    interventionSuccessRate: 0,
    coachUtilization: 0,
  };
}

function calculateCompletionRateFromEvents(
  events: any[],
  type: 'course' | 'lesson' | 'atom'
): number {
  const startEvents = events.filter(e => e.eventType === `${type}_start`);
  const completeEvents = events.filter(e => e.eventType === `${type}_complete`);

  if (startEvents.length === 0) return 0;
  return calculateCompletionRate(completeEvents.length, startEvents.length);
}

function calculateSessionCompletionRate(events: any[]): number {
  const sessionStarts = events.filter(e => e.eventType === 'session_start');
  const sessionEnds = events.filter(e => e.eventType === 'session_end');

  // Count sessions that completed planned items
  const completedSessions = sessionEnds.filter(e =>
    e.properties?.plannedItems === e.properties?.completedItems
  ).length;

  if (sessionStarts.length === 0) return 0;
  return calculateCompletionRate(completedSessions, sessionStarts.length);
}

function calculateReturnRates(
  events: any[],
  dateRange: DateRange
): { day1: number; day7: number; day30: number } {
  if (events.length === 0) {
    return { day1: 0, day7: 0, day30: 0 };
  }

  // Get unique active days
  const activeDays = new Set(
    events.map(e => {
      const date = e.timestamp?.toDate?.() || new Date(e.timestamp);
      return date.toISOString().split('T')[0];
    })
  );

  const sortedDays = Array.from(activeDays).sort();
  if (sortedDays.length < 2) {
    return { day1: 0, day7: 0, day30: 0 };
  }

  // Calculate return rates based on gaps between active days
  let returnedDay1 = 0;
  let returnedDay7 = 0;
  let returnedDay30 = 0;
  let totalOpportunities = sortedDays.length - 1;

  for (let i = 0; i < sortedDays.length - 1; i++) {
    const current = new Date(sortedDays[i]);
    const next = new Date(sortedDays[i + 1]);
    const daysDiff = Math.floor((next.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 1) returnedDay1++;
    if (daysDiff <= 7) returnedDay7++;
    if (daysDiff <= 30) returnedDay30++;
  }

  return {
    day1: calculateCompletionRate(returnedDay1, totalOpportunities),
    day7: calculateCompletionRate(returnedDay7, totalOpportunities),
    day30: calculateCompletionRate(returnedDay30, totalOpportunities),
  };
}

function calculateSessionFrequency(events: any[], dateRange: DateRange): number {
  const sessionStarts = events.filter(e => e.eventType === 'session_start');
  const weeks = Math.max(
    1,
    (dateRange.end.getTime() - dateRange.start.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
  return Math.round((sessionStarts.length / weeks) * 100) / 100;
}

function calculateAverageSessionLength(events: any[]): number {
  const sessionEnds = events.filter(e =>
    e.eventType === 'session_end' && e.properties?.durationMinutes
  );

  if (sessionEnds.length === 0) return 0;

  const durations = sessionEnds.map(e => e.properties.durationMinutes);
  return calculateAverage(durations);
}

function calculateStreakMaintenance(progress: any): number {
  if (!progress?.streak) return 0;

  const longestStreak = progress.streak.longestStreak || 0;
  return longestStreak >= 7 ? 100 : (longestStreak / 7) * 100;
}

function calculateSkillMasteryRate(skills: any[]): number {
  if (skills.length === 0) return 0;

  const masteredSkills = skills.filter(s => s.pMastery >= 0.95).length;
  return calculateCompletionRate(masteredSkills, skills.length);
}

function calculateAverageTimeToMastery(skills: any[], events: any[]): number {
  const masteredSkills = skills.filter(s =>
    s.pMastery >= 0.95 && s.masteredAt && s.firstAttemptAt
  );

  if (masteredSkills.length === 0) return 0;

  const times = masteredSkills.map(s => {
    const masteredAt = s.masteredAt?.toDate?.() || new Date(s.masteredAt);
    const firstAttempt = s.firstAttemptAt?.toDate?.() || new Date(s.firstAttemptAt);
    return (masteredAt.getTime() - firstAttempt.getTime()) / (1000 * 60); // Minutes
  });

  return calculateAverage(times);
}

function calculateRetentionRate(retentionTests: any[]): number {
  if (retentionTests.length === 0) return 0;

  const retentionScores = retentionTests.map(t => t.results?.overallRetention || 0);
  return calculateAverage(retentionScores);
}

function calculateQuizAccuracy(events: any[]): number {
  const quizAnswers = events.filter(e => e.eventType === 'quiz_answer');

  if (quizAnswers.length === 0) return 0;

  const correctAnswers = quizAnswers.filter(e => e.properties?.isCorrect).length;
  return calculateCompletionRate(correctAnswers, quizAnswers.length);
}

function calculateMasteryVelocity(skills: any[], progress: any): number {
  const masteredSkills = skills.filter(s => s.pMastery >= 0.95).length;
  const totalHours = (progress?.totalTimeSpentMinutes || 0) / 60;

  if (totalHours === 0) return 0;
  return Math.round((masteredSkills / totalHours) * 100) / 100;
}

function calculateContentSkipRate(events: any[]): number {
  const pretestCompletes = events.filter(e => e.eventType === 'pretest_complete');
  const contentSkips = events.filter(e => e.eventType === 'content_skipped');

  if (pretestCompletes.length === 0) return 0;
  return calculateCompletionRate(contentSkips.length, pretestCompletes.length);
}

function calculateReviewEfficiency(events: any[]): number {
  const reviewCompletes = events.filter(e => e.eventType === 'review_complete');

  if (reviewCompletes.length === 0) return 0;

  const maintainedMastery = reviewCompletes.filter(e =>
    e.properties?.maintainedMastery
  ).length;

  return calculateCompletionRate(maintainedMastery, reviewCompletes.length);
}

function calculateInterventionSuccessRate(events: any[]): number {
  const interventionsShown = events.filter(e => e.eventType === 'intervention_shown');
  const interventionsAccepted = events.filter(e => e.eventType === 'intervention_accepted');

  if (interventionsShown.length === 0) return 0;

  // Check if mastery improved after intervention
  const successfulInterventions = interventionsAccepted.filter(e =>
    e.properties?.masteryImproved
  ).length;

  return calculateCompletionRate(successfulInterventions, interventionsShown.length);
}

function calculateCoachUtilization(events: any[]): number {
  const sessions = events.filter(e =>
    e.eventType === 'session_start' || e.eventType === 'session_end'
  );

  const uniqueSessionIds = new Set(sessions.map(e => e.sessionId));
  const totalSessions = uniqueSessionIds.size;

  if (totalSessions === 0) return 0;

  const sessionsWithCoach = events.filter(e =>
    e.eventType === 'coach_message_sent'
  );
  const sessionsUsingCoach = new Set(sessionsWithCoach.map(e => e.sessionId)).size;

  return calculateCompletionRate(sessionsUsingCoach, totalSessions);
}
