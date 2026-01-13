/**
 * Analytics Event System
 * Tracks all learning events for efficacy measurement and A/B testing
 * Stores events in Firestore for analysis
 */

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getUserVariant } from '@/lib/experiments/abTest';

// ============================================
// TYPES
// ============================================

/**
 * All event types we track in the learning flow
 */
export type EventType =
  // Session Events
  | 'session_start'
  | 'session_end'
  // Atom Events
  | 'atom_start'
  | 'atom_complete'
  | 'atom_abandon'
  // Lesson Events
  | 'lesson_start'
  | 'lesson_complete'
  // Course Events
  | 'course_start'
  | 'course_complete'
  // Quiz Events
  | 'quiz_start'
  | 'quiz_answer'
  | 'quiz_complete'
  // Review Events
  | 'review_start'
  | 'review_complete'
  // Mastery Events
  | 'skill_mastered'
  | 'skill_regression'
  // Struggle & Intervention Events
  | 'struggle_detected'
  | 'intervention_shown'
  | 'intervention_accepted'
  | 'intervention_dismissed'
  // Pre-test Events
  | 'pretest_start'
  | 'pretest_complete'
  | 'content_skipped'
  // Coach Events
  | 'coach_message_sent'
  | 'coach_message_received'
  | 'coach_session_start'
  | 'coach_session_end'
  // Path Events
  | 'path_modified'
  | 'path_item_inserted'
  | 'path_item_skipped'
  // Retention Test Events
  | 'retention_test_scheduled'
  | 'retention_test_available'
  | 'retention_test_started'
  | 'retention_test_completed'
  // Interleaving Events (Phase 13)
  | 'interleaved_session_complete';

/**
 * Base analytics event structure
 */
export interface AnalyticsEvent {
  id?: string;
  eventType: EventType;
  userId: string;
  timestamp: Date;
  sessionId: string;
  experimentId?: string;
  experimentVariant?: 'control' | 'treatment';
  properties: Record<string, unknown>;
}

/**
 * Event properties for specific event types
 */
export interface SessionStartProperties {
  deviceType: 'mobile' | 'tablet' | 'desktop';
  browser?: string;
  plannedItems?: number;
  sessionGoal?: string;
  [key: string]: unknown;
}

export interface SessionEndProperties {
  durationMinutes: number;
  plannedItems: number;
  completedItems: number;
  atomsCompleted: number;
  quizzesTaken: number;
  [key: string]: unknown;
}

export interface AtomCompleteProperties {
  atomId: string;
  atomType: 'video' | 'reading' | 'practice' | 'quiz' | 'project';
  timeSpentSeconds: number;
  lessonId: string;
  moduleId: string;
  courseId: string;
  xpEarned?: number;
  [key: string]: unknown;
}

export interface QuizAnswerProperties {
  quizId: string;
  questionId: string;
  questionIndex: number;
  isCorrect: boolean;
  selectedAnswer: string | number;
  correctAnswer: string | number;
  timeToAnswerSeconds: number;
  skillsTested: string[];
  [key: string]: unknown;
}

export interface QuizCompleteProperties {
  quizId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpentSeconds: number;
  passed: boolean;
  attemptNumber: number;
  [key: string]: unknown;
}

export interface SkillMasteredProperties {
  skillId: string;
  skillName: string;
  previousMastery: number;
  newMastery: number;
  attemptCount: number;
  timeToMasteryMinutes: number;
  [key: string]: unknown;
}

export interface StruggleDetectedProperties {
  skillId: string;
  struggleScore: number;
  signals: {
    consecutiveFailures: number;
    masteryStalling: boolean;
    timeIncreasing: boolean;
    hintDependency: boolean;
  };
  recommendedIntervention: string;
  [key: string]: unknown;
}

export interface InterventionProperties {
  interventionId: string;
  interventionType: 'prerequisite_review' | 'alternative_explanation' | 'simpler_practice' | 'coach_session' | 'break_suggestion';
  skillId: string;
  masteryBefore?: number;
  masteryAfter?: number;
  masteryImproved?: boolean;
  [key: string]: unknown;
}

export interface PretestCompleteProperties {
  lessonId: string;
  score: number;
  skillsTested: string[];
  canSkip: boolean;
  contentToSkip?: string[];
  [key: string]: unknown;
}

export interface ContentSkippedProperties {
  contentId: string;
  contentType: 'atom' | 'lesson';
  reason: 'pretest_passed' | 'already_mastered';
  skillsMastered: string[];
  [key: string]: unknown;
}

export interface CoachMessageProperties {
  messageId: string;
  context: string;
  isProactive: boolean;
  skillContext?: string;
  struggleContext?: boolean;
  [key: string]: unknown;
}

export interface PathModifiedProperties {
  modificationType: 'insert' | 'replace' | 'skip' | 'reorder';
  reason: string;
  itemsAffected: string[];
  triggeredBy: 'coach' | 'system' | 'user';
  [key: string]: unknown;
}

export interface ReviewCompleteProperties {
  skillId: string;
  previousMastery: number;
  newMastery: number;
  maintainedMastery: boolean;
  daysSinceLastReview: number;
  reviewResult: 'easy' | 'good' | 'hard' | 'again';
  [key: string]: unknown;
}

export interface RetentionTestProperties {
  testId: string;
  skillIds: string[];
  delayDays: number;
  originalMastery?: Record<string, number>;
  currentScores?: Record<string, number>;
  overallRetention?: number;
  [key: string]: unknown;
}

/**
 * Properties for interleaved session completion (Phase 13)
 */
export interface InterleavedSessionCompleteProperties {
  /** Total items in session */
  totalItems: number;
  /** Number of review items (interleaved) */
  reviewItems: number;
  /** Number of new learning items */
  newItems: number;
  /** Actual interleaving ratio achieved */
  interleavingRatio: number;
  /** User's configured intensity setting */
  intensitySetting: 'light' | 'moderate' | 'heavy';
  /** Accuracy on review items (0-1) */
  reviewAccuracy: number;
  /** Accuracy on new items (0-1) */
  newItemAccuracy: number;
  /** Review items completed */
  reviewItemsCompleted: number;
  /** Session duration in minutes */
  durationMinutes: number;
  /** Whether interleaving was enabled */
  interleavingEnabled: boolean;
  [key: string]: unknown;
}

// ============================================
// EVENT TRACKING FUNCTIONS
// ============================================

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Track a single analytics event
 */
export async function trackEvent(
  type: EventType,
  userId: string,
  sessionId: string,
  properties: Record<string, unknown> = {},
  experimentId?: string
): Promise<string> {
  // Get experiment variant if in an experiment
  let experimentVariant: 'control' | 'treatment' | undefined;

  if (experimentId) {
    experimentVariant = await getUserVariant(userId, experimentId) || undefined;
  }

  const event: Omit<AnalyticsEvent, 'id'> = {
    eventType: type,
    userId,
    timestamp: new Date(),
    sessionId,
    experimentId,
    experimentVariant,
    properties,
  };

  const docRef = await adminDb.collection('analyticsEvents').add({
    ...event,
    timestamp: FieldValue.serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Track multiple events in a batch (for efficiency)
 */
export async function trackEvents(
  events: Omit<AnalyticsEvent, 'id'>[]
): Promise<string[]> {
  const batch = adminDb.batch();
  const eventIds: string[] = [];

  for (const event of events) {
    const docRef = adminDb.collection('analyticsEvents').doc();
    eventIds.push(docRef.id);

    batch.set(docRef, {
      ...event,
      timestamp: event.timestamp instanceof Date
        ? Timestamp.fromDate(event.timestamp)
        : FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
  return eventIds;
}

/**
 * Query events for analysis
 */
export async function queryEvents(filters: {
  userId?: string;
  eventTypes?: EventType[];
  dateRange?: { start: Date; end: Date };
  experimentId?: string;
  variant?: 'control' | 'treatment';
  sessionId?: string;
  limit?: number;
}): Promise<AnalyticsEvent[]> {
  let query: FirebaseFirestore.Query = adminDb.collection('analyticsEvents');

  if (filters.userId) {
    query = query.where('userId', '==', filters.userId);
  }

  if (filters.eventTypes && filters.eventTypes.length > 0) {
    // Firestore 'in' queries limited to 10 values
    if (filters.eventTypes.length <= 10) {
      query = query.where('eventType', 'in', filters.eventTypes);
    }
  }

  if (filters.dateRange) {
    query = query
      .where('timestamp', '>=', Timestamp.fromDate(filters.dateRange.start))
      .where('timestamp', '<=', Timestamp.fromDate(filters.dateRange.end));
  }

  if (filters.experimentId) {
    query = query.where('experimentId', '==', filters.experimentId);
  }

  if (filters.variant) {
    query = query.where('experimentVariant', '==', filters.variant);
  }

  if (filters.sessionId) {
    query = query.where('sessionId', '==', filters.sessionId);
  }

  query = query.orderBy('timestamp', 'desc');

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const snapshot = await query.get();

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      eventType: data.eventType,
      userId: data.userId,
      timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp),
      sessionId: data.sessionId,
      experimentId: data.experimentId,
      experimentVariant: data.experimentVariant,
      properties: data.properties || {},
    } as AnalyticsEvent;
  });
}

/**
 * Get event counts for a user
 */
export async function getEventCounts(
  userId: string,
  eventTypes: EventType[],
  dateRange?: { start: Date; end: Date }
): Promise<Record<EventType, number>> {
  const events = await queryEvents({
    userId,
    eventTypes,
    dateRange,
  });

  const counts: Record<string, number> = {};

  for (const type of eventTypes) {
    counts[type] = events.filter(e => e.eventType === type).length;
  }

  return counts as Record<EventType, number>;
}

// ============================================
// CONVENIENCE TRACKING FUNCTIONS
// ============================================

/**
 * Track session start
 */
export async function trackSessionStart(
  userId: string,
  sessionId: string,
  properties: SessionStartProperties,
  experimentId?: string
): Promise<string> {
  return trackEvent('session_start', userId, sessionId, properties, experimentId);
}

/**
 * Track session end
 */
export async function trackSessionEnd(
  userId: string,
  sessionId: string,
  properties: SessionEndProperties,
  experimentId?: string
): Promise<string> {
  return trackEvent('session_end', userId, sessionId, properties, experimentId);
}

/**
 * Track atom completion
 */
export async function trackAtomComplete(
  userId: string,
  sessionId: string,
  properties: AtomCompleteProperties,
  experimentId?: string
): Promise<string> {
  return trackEvent('atom_complete', userId, sessionId, properties, experimentId);
}

/**
 * Track quiz answer
 */
export async function trackQuizAnswer(
  userId: string,
  sessionId: string,
  properties: QuizAnswerProperties,
  experimentId?: string
): Promise<string> {
  return trackEvent('quiz_answer', userId, sessionId, properties, experimentId);
}

/**
 * Track quiz completion
 */
export async function trackQuizComplete(
  userId: string,
  sessionId: string,
  properties: QuizCompleteProperties,
  experimentId?: string
): Promise<string> {
  return trackEvent('quiz_complete', userId, sessionId, properties, experimentId);
}

/**
 * Track skill mastery
 */
export async function trackSkillMastered(
  userId: string,
  sessionId: string,
  properties: SkillMasteredProperties,
  experimentId?: string
): Promise<string> {
  return trackEvent('skill_mastered', userId, sessionId, properties, experimentId);
}

/**
 * Track struggle detection
 */
export async function trackStruggleDetected(
  userId: string,
  sessionId: string,
  properties: StruggleDetectedProperties,
  experimentId?: string
): Promise<string> {
  return trackEvent('struggle_detected', userId, sessionId, properties, experimentId);
}

/**
 * Track intervention shown
 */
export async function trackInterventionShown(
  userId: string,
  sessionId: string,
  properties: InterventionProperties,
  experimentId?: string
): Promise<string> {
  return trackEvent('intervention_shown', userId, sessionId, properties, experimentId);
}

/**
 * Track intervention accepted
 */
export async function trackInterventionAccepted(
  userId: string,
  sessionId: string,
  properties: InterventionProperties,
  experimentId?: string
): Promise<string> {
  return trackEvent('intervention_accepted', userId, sessionId, properties, experimentId);
}

/**
 * Track pretest completion
 */
export async function trackPretestComplete(
  userId: string,
  sessionId: string,
  properties: PretestCompleteProperties,
  experimentId?: string
): Promise<string> {
  return trackEvent('pretest_complete', userId, sessionId, properties, experimentId);
}

/**
 * Track content skipped
 */
export async function trackContentSkipped(
  userId: string,
  sessionId: string,
  properties: ContentSkippedProperties,
  experimentId?: string
): Promise<string> {
  return trackEvent('content_skipped', userId, sessionId, properties, experimentId);
}

/**
 * Track coach message sent
 */
export async function trackCoachMessageSent(
  userId: string,
  sessionId: string,
  properties: CoachMessageProperties,
  experimentId?: string
): Promise<string> {
  return trackEvent('coach_message_sent', userId, sessionId, properties, experimentId);
}

/**
 * Track path modification
 */
export async function trackPathModified(
  userId: string,
  sessionId: string,
  properties: PathModifiedProperties,
  experimentId?: string
): Promise<string> {
  return trackEvent('path_modified', userId, sessionId, properties, experimentId);
}

/**
 * Track review completion
 */
export async function trackReviewComplete(
  userId: string,
  sessionId: string,
  properties: ReviewCompleteProperties,
  experimentId?: string
): Promise<string> {
  return trackEvent('review_complete', userId, sessionId, properties, experimentId);
}

/**
 * Track retention test events
 */
export async function trackRetentionTest(
  eventType: 'retention_test_scheduled' | 'retention_test_available' | 'retention_test_started' | 'retention_test_completed',
  userId: string,
  sessionId: string,
  properties: RetentionTestProperties,
  experimentId?: string
): Promise<string> {
  return trackEvent(eventType, userId, sessionId, properties, experimentId);
}

/**
 * Track interleaved session completion (Phase 13)
 *
 * Logs effectiveness metrics for interleaving:
 * - How many review items were included
 * - Accuracy on review vs new items
 * - User's intensity setting
 */
export async function trackInterleavedSessionComplete(
  userId: string,
  sessionId: string,
  properties: InterleavedSessionCompleteProperties,
  experimentId?: string
): Promise<string> {
  return trackEvent('interleaved_session_complete', userId, sessionId, properties, experimentId);
}

// ============================================
// ANALYTICS AGGREGATION
// ============================================

/**
 * Get daily active users count
 */
export async function getDailyActiveUsers(date: Date): Promise<number> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const events = await queryEvents({
    eventTypes: ['session_start'],
    dateRange: { start: startOfDay, end: endOfDay },
  });

  const uniqueUsers = new Set(events.map(e => e.userId));
  return uniqueUsers.size;
}

/**
 * Get weekly active users count
 */
export async function getWeeklyActiveUsers(endDate: Date): Promise<number> {
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 7);

  const events = await queryEvents({
    eventTypes: ['session_start'],
    dateRange: { start: startDate, end: endDate },
  });

  const uniqueUsers = new Set(events.map(e => e.userId));
  return uniqueUsers.size;
}

/**
 * Get monthly active users count
 */
export async function getMonthlyActiveUsers(endDate: Date): Promise<number> {
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 30);

  const events = await queryEvents({
    eventTypes: ['session_start'],
    dateRange: { start: startDate, end: endDate },
  });

  const uniqueUsers = new Set(events.map(e => e.userId));
  return uniqueUsers.size;
}

/**
 * Get event summary for dashboard
 */
export async function getEventSummary(
  dateRange: { start: Date; end: Date }
): Promise<{
  totalEvents: number;
  uniqueUsers: number;
  eventsByType: Record<string, number>;
  avgSessionLength: number;
  totalSessions: number;
}> {
  const events = await queryEvents({ dateRange });

  const uniqueUsers = new Set(events.map(e => e.userId));
  const eventsByType: Record<string, number> = {};

  for (const event of events) {
    eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
  }

  // Calculate average session length
  const sessionEnds = events.filter(e => e.eventType === 'session_end');
  const totalSessionMinutes = sessionEnds.reduce((sum, e) => {
    return sum + (e.properties?.durationMinutes as number || 0);
  }, 0);

  const avgSessionLength = sessionEnds.length > 0
    ? Math.round(totalSessionMinutes / sessionEnds.length)
    : 0;

  const totalSessions = events.filter(e => e.eventType === 'session_start').length;

  return {
    totalEvents: events.length,
    uniqueUsers: uniqueUsers.size,
    eventsByType,
    avgSessionLength,
    totalSessions,
  };
}
