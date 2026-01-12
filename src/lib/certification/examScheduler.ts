/**
 * Exam Scheduler - Workload Calculator for Certification Exams
 *
 * Calculates optimal study schedules based on:
 * - User's certification exam date
 * - Current mastery levels across all skills
 * - Target retention rate (default 95%)
 * - Historical learning rate from interactions
 *
 * Uses FSRS retrievability predictions to estimate workload.
 */

import { calculateRetrievability } from '@/lib/mastery/fsrs';
import type { FSRSState } from '@/lib/mastery/knowledgeGraph';

// ============================================
// TYPES
// ============================================

export interface ExamScheduleConfig {
  examDate: Date;
  targetRetention: number; // 0.90-0.99, default 0.95
  userId: string;
}

export interface SkillReadinessStatus {
  skillId: string;
  skillName: string;
  category: string;
  currentMastery: number; // 0-100
  predictedRetentionAtExam: number; // 0-1
  status: 'mastered' | 'in_progress' | 'not_started' | 'at_risk';
  reviewsNeeded: number;
  priority: number; // 1-10, higher = more urgent
}

export interface ExamReadinessResult {
  // Overall metrics
  overallReadiness: number; // 0-100 percentage
  predictedReadinessAtExam: number; // 0-100
  daysUntilExam: number;

  // Skill breakdown
  skillsBreakdown: {
    mastered: number;
    inProgress: number;
    notStarted: number;
    atRisk: number;
    total: number;
  };

  // Schedule recommendations
  dailyReviewTarget: number;
  dailyNewItemTarget: number;
  estimatedDailyMinutes: number;

  // Status indicator
  trackingStatus: 'ahead' | 'on_track' | 'behind' | 'critical';

  // Detailed skill readiness
  skillReadiness: SkillReadinessStatus[];

  // Schedule metadata
  calculatedAt: Date;
  examDate: Date;
  targetRetention: number;
}

export interface DailySchedule {
  date: Date;
  reviewItems: string[]; // Skill IDs to review
  newItems: string[]; // New skills to learn
  estimatedMinutes: number;
  isEmergencyMode: boolean; // Last week cramming
}

export interface LearningRateEstimate {
  averageAttemptsToMastery: number;
  averageTimePerReview: number; // minutes
  sessionFrequency: number; // sessions per day
  retentionRate: number;
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_TARGET_RETENTION = 0.95;
const MASTERY_THRESHOLD = 0.95; // 95% pMastery = mastered
const AT_RISK_THRESHOLD = 0.70; // Below 70% predicted retention = at risk
const MIN_STABILITY_FOR_MASTERED = 7; // 7+ days stability = stable mastery

// Time estimates (minutes)
const MINUTES_PER_NEW_SKILL = 15;
const MINUTES_PER_REVIEW = 5;
const MAX_DAILY_MINUTES = 120;

// Emergency mode (last 7 days before exam)
const EMERGENCY_MODE_DAYS = 7;
const EMERGENCY_REVIEW_MULTIPLIER = 2;

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Calculate days between two dates
 */
export function getDaysUntilExam(examDate: Date, fromDate: Date = new Date()): number {
  const diff = examDate.getTime() - fromDate.getTime();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

/**
 * Predict retention at exam date for a skill
 */
export function predictRetentionAtExam(
  fsrsState: FSRSState,
  lastReviewedAt: Date,
  examDate: Date
): number {
  if (!fsrsState || fsrsState.stability <= 0) {
    return 0;
  }

  const now = new Date();
  const daysSinceReview = Math.max(0,
    (now.getTime() - lastReviewedAt.getTime()) / (24 * 60 * 60 * 1000)
  );
  const daysUntilExam = getDaysUntilExam(examDate);
  const totalDays = daysSinceReview + daysUntilExam;

  return calculateRetrievability(fsrsState.stability, totalDays);
}

/**
 * Estimate reviews needed to maintain target retention until exam
 */
export function estimateReviewsNeeded(
  currentStability: number,
  daysUntilExam: number,
  targetRetention: number = DEFAULT_TARGET_RETENTION
): number {
  if (currentStability <= 0 || daysUntilExam <= 0) {
    return daysUntilExam > 0 ? Math.ceil(daysUntilExam / 3) : 0;
  }

  // Calculate optimal interval for target retention
  // R(t) = (1 + t/(9*S))^(-1) = targetRetention
  // Solving for t: t = 9 * S * (R^(-1) - 1)
  const optimalInterval = 9 * currentStability * (Math.pow(targetRetention, -1) - 1);

  // Number of reviews = days until exam / optimal interval
  const reviewsNeeded = Math.ceil(daysUntilExam / Math.max(1, optimalInterval));

  return Math.max(0, reviewsNeeded);
}

/**
 * Calculate skill readiness status
 */
export function calculateSkillReadiness(
  skill: {
    id: string;
    name: string;
    category: string;
    pMastery?: number;
    fsrsState?: FSRSState;
    lastReviewedAt?: Date;
    attempts?: number;
  },
  examDate: Date,
  targetRetention: number = DEFAULT_TARGET_RETENTION
): SkillReadinessStatus {
  const pMastery = skill.pMastery ?? 0;
  const stability = skill.fsrsState?.stability ?? 0;
  const lastReviewed = skill.lastReviewedAt ?? new Date();
  const attempts = skill.attempts ?? 0;
  const daysUntilExam = getDaysUntilExam(examDate);

  // Predict retention at exam
  const predictedRetention = skill.fsrsState
    ? predictRetentionAtExam(skill.fsrsState, lastReviewed, examDate)
    : 0;

  // Determine status
  let status: SkillReadinessStatus['status'];
  if (attempts === 0) {
    status = 'not_started';
  } else if (pMastery >= MASTERY_THRESHOLD && stability >= MIN_STABILITY_FOR_MASTERED) {
    status = 'mastered';
  } else if (predictedRetention < AT_RISK_THRESHOLD && pMastery > 0.3) {
    status = 'at_risk';
  } else {
    status = 'in_progress';
  }

  // Calculate reviews needed
  const reviewsNeeded = estimateReviewsNeeded(stability, daysUntilExam, targetRetention);

  // Calculate priority (1-10)
  // Higher priority for: lower predicted retention, lower mastery, more reviews needed
  let priority = 5;
  if (status === 'not_started') {
    priority = 8;
  } else if (status === 'at_risk') {
    priority = 10;
  } else if (status === 'in_progress') {
    priority = Math.min(10, Math.max(1, Math.ceil(10 * (1 - predictedRetention))));
  } else {
    priority = Math.max(1, Math.ceil(5 * (1 - predictedRetention)));
  }

  return {
    skillId: skill.id,
    skillName: skill.name,
    category: skill.category,
    currentMastery: Math.round(pMastery * 100),
    predictedRetentionAtExam: predictedRetention,
    status,
    reviewsNeeded,
    priority,
  };
}

/**
 * Main function: Calculate overall exam readiness
 */
export function calculateExamReadiness(
  skills: Array<{
    id: string;
    name: string;
    category: string;
    pMastery?: number;
    fsrsState?: FSRSState;
    lastReviewedAt?: Date;
    attempts?: number;
  }>,
  config: ExamScheduleConfig
): ExamReadinessResult {
  const { examDate, targetRetention = DEFAULT_TARGET_RETENTION } = config;
  const daysUntilExam = getDaysUntilExam(examDate);
  const now = new Date();

  // Calculate readiness for each skill
  const skillReadiness = skills.map(skill =>
    calculateSkillReadiness(skill, examDate, targetRetention)
  );

  // Aggregate skill status counts
  const skillsBreakdown = {
    mastered: skillReadiness.filter(s => s.status === 'mastered').length,
    inProgress: skillReadiness.filter(s => s.status === 'in_progress').length,
    notStarted: skillReadiness.filter(s => s.status === 'not_started').length,
    atRisk: skillReadiness.filter(s => s.status === 'at_risk').length,
    total: skills.length,
  };

  // Calculate overall readiness
  const totalSkills = skills.length || 1;
  const overallReadiness = Math.round(
    (skillReadiness.reduce((sum, s) => sum + s.currentMastery, 0) / totalSkills)
  );

  // Predict readiness at exam
  const predictedReadinessAtExam = Math.round(
    (skillReadiness.reduce((sum, s) => sum + s.predictedRetentionAtExam * 100, 0) / totalSkills)
  );

  // Calculate daily targets
  const totalReviewsNeeded = skillReadiness.reduce((sum, s) => sum + s.reviewsNeeded, 0);
  const newSkillsToLearn = skillsBreakdown.notStarted;

  const dailyReviewTarget = daysUntilExam > 0
    ? Math.ceil(totalReviewsNeeded / daysUntilExam)
    : totalReviewsNeeded;

  const dailyNewItemTarget = daysUntilExam > 0
    ? Math.ceil(newSkillsToLearn / Math.max(1, daysUntilExam - EMERGENCY_MODE_DAYS))
    : newSkillsToLearn;

  // Estimate daily time
  const isEmergencyMode = daysUntilExam <= EMERGENCY_MODE_DAYS;
  const reviewMultiplier = isEmergencyMode ? EMERGENCY_REVIEW_MULTIPLIER : 1;
  const estimatedDailyMinutes = Math.min(
    MAX_DAILY_MINUTES,
    (dailyReviewTarget * MINUTES_PER_REVIEW * reviewMultiplier) +
    (dailyNewItemTarget * MINUTES_PER_NEW_SKILL)
  );

  // Determine tracking status
  let trackingStatus: ExamReadinessResult['trackingStatus'];
  const expectedReadiness = calculateExpectedReadiness(daysUntilExam);
  const readinessGap = overallReadiness - expectedReadiness;

  if (daysUntilExam <= 0) {
    trackingStatus = 'critical';
  } else if (readinessGap >= 10) {
    trackingStatus = 'ahead';
  } else if (readinessGap >= -5) {
    trackingStatus = 'on_track';
  } else if (readinessGap >= -20) {
    trackingStatus = 'behind';
  } else {
    trackingStatus = 'critical';
  }

  // Sort skills by priority (highest first)
  const sortedSkillReadiness = [...skillReadiness].sort((a, b) => b.priority - a.priority);

  return {
    overallReadiness,
    predictedReadinessAtExam,
    daysUntilExam,
    skillsBreakdown,
    dailyReviewTarget,
    dailyNewItemTarget,
    estimatedDailyMinutes,
    trackingStatus,
    skillReadiness: sortedSkillReadiness,
    calculatedAt: now,
    examDate,
    targetRetention,
  };
}

/**
 * Calculate expected readiness based on days until exam
 * Uses a simple linear progression model
 */
function calculateExpectedReadiness(daysUntilExam: number): number {
  // Assume 60-day typical prep period
  const typicalPrepDays = 60;

  // Expected: start at 0, reach 95% by exam day
  // If exam is 60 days away and it's day 30, expected = 50%
  const daysCompleted = Math.max(0, typicalPrepDays - daysUntilExam);
  const progressRatio = Math.min(1, daysCompleted / typicalPrepDays);

  return Math.round(progressRatio * 95);
}

/**
 * Generate daily study schedule
 */
export function generateDailySchedule(
  readinessResult: ExamReadinessResult,
  currentDate: Date = new Date()
): DailySchedule {
  const { daysUntilExam, skillReadiness, dailyReviewTarget, dailyNewItemTarget } = readinessResult;
  const isEmergencyMode = daysUntilExam <= EMERGENCY_MODE_DAYS;

  // Get items needing review (sorted by priority)
  const reviewItems = skillReadiness
    .filter(s => s.status === 'at_risk' || s.status === 'in_progress')
    .sort((a, b) => b.priority - a.priority)
    .slice(0, isEmergencyMode ? dailyReviewTarget * 2 : dailyReviewTarget)
    .map(s => s.skillId);

  // Get new items to learn
  const newItems = skillReadiness
    .filter(s => s.status === 'not_started')
    .slice(0, isEmergencyMode ? 0 : dailyNewItemTarget) // No new items in emergency mode
    .map(s => s.skillId);

  // Calculate time
  const reviewMinutes = reviewItems.length * MINUTES_PER_REVIEW * (isEmergencyMode ? 1.5 : 1);
  const newMinutes = newItems.length * MINUTES_PER_NEW_SKILL;
  const estimatedMinutes = Math.round(Math.min(MAX_DAILY_MINUTES, reviewMinutes + newMinutes));

  return {
    date: currentDate,
    reviewItems,
    newItems,
    estimatedMinutes,
    isEmergencyMode,
  };
}

/**
 * Estimate learning rate from interaction history
 */
export function estimateLearningRate(
  interactionHistory: Array<{
    correct: boolean;
    responseTimeMs: number;
    attemptNumber: number;
  }>
): LearningRateEstimate {
  if (interactionHistory.length === 0) {
    return {
      averageAttemptsToMastery: 5,
      averageTimePerReview: 5,
      sessionFrequency: 1,
      retentionRate: 0.85,
    };
  }

  // Calculate accuracy
  const correctCount = interactionHistory.filter(i => i.correct).length;
  const retentionRate = correctCount / interactionHistory.length;

  // Estimate attempts to mastery
  const maxAttempt = Math.max(...interactionHistory.map(i => i.attemptNumber));
  const averageAttemptsToMastery = Math.max(3, Math.min(10, maxAttempt));

  // Average response time
  const avgResponseMs = interactionHistory.reduce((sum, i) => sum + i.responseTimeMs, 0)
    / interactionHistory.length;
  const averageTimePerReview = Math.max(2, Math.min(15, avgResponseMs / 60000)); // Convert to minutes

  return {
    averageAttemptsToMastery,
    averageTimePerReview,
    sessionFrequency: 1,
    retentionRate,
  };
}

/**
 * Adjust schedule based on learning rate
 */
export function adjustScheduleForLearningRate(
  baseSchedule: DailySchedule,
  learningRate: LearningRateEstimate
): DailySchedule {
  // Slower learners need more time but fewer items
  const efficiencyFactor = learningRate.retentionRate / 0.85; // Normalize to 85% baseline

  const adjustedReviewCount = Math.max(1, Math.round(
    baseSchedule.reviewItems.length * Math.min(1.2, Math.max(0.8, efficiencyFactor))
  ));

  const adjustedNewCount = Math.max(0, Math.round(
    baseSchedule.newItems.length * Math.min(1.5, Math.max(0.5, efficiencyFactor))
  ));

  return {
    ...baseSchedule,
    reviewItems: baseSchedule.reviewItems.slice(0, adjustedReviewCount),
    newItems: baseSchedule.newItems.slice(0, adjustedNewCount),
    estimatedMinutes: Math.round(
      adjustedReviewCount * learningRate.averageTimePerReview +
      adjustedNewCount * MINUTES_PER_NEW_SKILL
    ),
  };
}

/**
 * Get tracking status message and color
 */
export function getTrackingStatusInfo(status: ExamReadinessResult['trackingStatus']): {
  message: string;
  color: string;
  bgColor: string;
  icon: 'check' | 'alert' | 'warning' | 'critical';
} {
  switch (status) {
    case 'ahead':
      return {
        message: 'Ahead of schedule',
        color: 'text-success',
        bgColor: 'bg-success/10',
        icon: 'check',
      };
    case 'on_track':
      return {
        message: 'On track',
        color: 'text-teal',
        bgColor: 'bg-teal/10',
        icon: 'check',
      };
    case 'behind':
      return {
        message: 'Behind schedule',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow/10',
        icon: 'warning',
      };
    case 'critical':
      return {
        message: 'Needs immediate attention',
        color: 'text-error',
        bgColor: 'bg-error/10',
        icon: 'critical',
      };
  }
}

/**
 * Format days until exam as human-readable string
 */
export function formatDaysUntilExam(days: number): string {
  if (days < 0) {
    return 'Exam date passed';
  }
  if (days === 0) {
    return 'Exam is today!';
  }
  if (days === 1) {
    return '1 day left';
  }
  if (days < 7) {
    return `${days} days left`;
  }
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    const remainingDays = days % 7;
    return remainingDays > 0
      ? `${weeks} week${weeks > 1 ? 's' : ''}, ${remainingDays} day${remainingDays > 1 ? 's' : ''}`
      : `${weeks} week${weeks > 1 ? 's' : ''}`;
  }
  const months = Math.floor(days / 30);
  const remainingDays = days % 30;
  return remainingDays > 0
    ? `${months} month${months > 1 ? 's' : ''}, ${remainingDays} day${remainingDays > 1 ? 's' : ''}`
    : `${months} month${months > 1 ? 's' : ''}`;
}
