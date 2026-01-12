/**
 * Exam Readiness Calculator
 *
 * Calculates exam preparedness based on FSRS retrievability projections.
 * Used for Exam Mode feature to help users prepare for certification exams.
 */

import type { ConceptMastery, FSRSState } from './knowledgeGraph';

// ============================================
// TYPES
// ============================================

export type ExamReadinessResult = {
  overallReadiness: number; // 0-100 percentage
  daysUntilExam: number;
  onTrack: boolean;
  dailyReviewsNeeded: number;
  conceptsAtRisk: ConceptAtRisk[];
  projectedRetention: number; // Average retention at exam date
};

export type ConceptAtRisk = {
  conceptId: string;
  conceptName: string;
  currentRetention: number;
  projectedRetention: number; // At exam date
  daysBehind: number; // How many days overdue for review
};

export type DailyWorkload = {
  dailyReviewsNeeded: number;
  totalConceptsToReview: number;
  conceptsAtRisk: string[];
  daysUntilExam: number;
  onTrack: boolean;
  suggestedSchedule: DaySchedule[];
};

export type DaySchedule = {
  date: Date;
  reviewCount: number;
  conceptIds: string[];
};

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Calculate retrievability (probability of recall) for a given stability and elapsed time
 * Uses the FSRS formula: R(t) = (1 + t/(9*S))^(-1)
 */
function calculateRetrievability(stability: number, elapsedDays: number): number {
  if (stability <= 0) return 0;
  return Math.pow(1 + elapsedDays / (9 * stability), -1);
}

/**
 * Calculate the number of days until retention drops to a target level
 * Inverse of retrievability formula
 */
function daysUntilRetention(stability: number, targetRetention: number): number {
  if (stability <= 0 || targetRetention <= 0 || targetRetention >= 1) return 0;
  return 9 * stability * (Math.pow(targetRetention, -1) - 1);
}

/**
 * Predict retention at a future date given current FSRS state
 */
export function predictRetentionAtDate(
  mastery: ConceptMastery,
  targetDate: Date
): number {
  const { stability } = mastery.fsrsState;
  const now = new Date();
  const lastReviewDate = mastery.lastReviewedAt;

  // Calculate total elapsed days from last review to target date
  const elapsedFromReview = (targetDate.getTime() - lastReviewDate.getTime()) / (24 * 60 * 60 * 1000);

  if (elapsedFromReview < 0) {
    // Target date is before last review - return current retention
    const currentElapsed = (now.getTime() - lastReviewDate.getTime()) / (24 * 60 * 60 * 1000);
    return calculateRetrievability(stability, Math.max(0, currentElapsed)) * 100;
  }

  return calculateRetrievability(stability, elapsedFromReview) * 100;
}

/**
 * Calculate overall exam readiness percentage
 * Weighted average of concept retentions projected to exam date
 */
export function calculateExamReadiness(
  conceptMasteries: ConceptMastery[],
  examDate: Date,
  targetRetention: number = 0.95 // Default 95%
): ExamReadinessResult {
  const now = new Date();
  const daysUntilExam = Math.ceil((examDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

  if (conceptMasteries.length === 0) {
    return {
      overallReadiness: 0,
      daysUntilExam,
      onTrack: false,
      dailyReviewsNeeded: 0,
      conceptsAtRisk: [],
      projectedRetention: 0,
    };
  }

  let totalProjectedRetention = 0;
  const conceptsAtRisk: ConceptAtRisk[] = [];

  for (const mastery of conceptMasteries) {
    const projectedRetention = predictRetentionAtDate(mastery, examDate);
    totalProjectedRetention += projectedRetention;

    // Calculate current retention
    const elapsedDays = (now.getTime() - mastery.lastReviewedAt.getTime()) / (24 * 60 * 60 * 1000);
    const currentRetention = calculateRetrievability(mastery.fsrsState.stability, elapsedDays) * 100;

    // Check if concept is at risk (projected retention below target)
    if (projectedRetention < targetRetention * 100) {
      // Calculate how many days behind schedule
      const daysToTarget = daysUntilRetention(mastery.fsrsState.stability, targetRetention);
      const daysBehind = Math.max(0, elapsedDays - daysToTarget);

      conceptsAtRisk.push({
        conceptId: mastery.conceptId,
        conceptName: mastery.conceptId, // Would be enriched with actual name in real use
        currentRetention,
        projectedRetention,
        daysBehind: Math.round(daysBehind),
      });
    }
  }

  const avgProjectedRetention = totalProjectedRetention / conceptMasteries.length;

  // Calculate if on track (at least 80% of concepts will meet target retention)
  const conceptsMeetingTarget = conceptMasteries.length - conceptsAtRisk.length;
  const percentageMeetingTarget = conceptsMeetingTarget / conceptMasteries.length;
  const onTrack = percentageMeetingTarget >= 0.8 && avgProjectedRetention >= targetRetention * 100 * 0.9;

  // Estimate daily reviews needed
  const dailyReviewsNeeded = Math.ceil(conceptsAtRisk.length / Math.max(1, daysUntilExam));

  return {
    overallReadiness: Math.round(Math.min(100, avgProjectedRetention / targetRetention)),
    daysUntilExam,
    onTrack,
    dailyReviewsNeeded: Math.max(dailyReviewsNeeded, conceptsAtRisk.length > 0 ? 1 : 0),
    conceptsAtRisk: conceptsAtRisk.sort((a, b) => a.projectedRetention - b.projectedRetention),
    projectedRetention: Math.round(avgProjectedRetention),
  };
}

/**
 * Calculate required daily workload to hit target retention by exam date
 */
export function calculateDailyWorkload(
  conceptMasteries: ConceptMastery[],
  examDate: Date,
  targetRetention: number = 0.95
): DailyWorkload {
  const now = new Date();
  const daysUntilExam = Math.ceil((examDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

  if (daysUntilExam <= 0) {
    return {
      dailyReviewsNeeded: 0,
      totalConceptsToReview: 0,
      conceptsAtRisk: [],
      daysUntilExam: 0,
      onTrack: false,
      suggestedSchedule: [],
    };
  }

  // Find concepts that need review before exam
  const conceptsNeedingReview: Array<{
    conceptId: string;
    urgency: number; // Days overdue or will become overdue
  }> = [];

  for (const mastery of conceptMasteries) {
    const projectedRetention = predictRetentionAtDate(mastery, examDate) / 100;

    if (projectedRetention < targetRetention) {
      // Calculate urgency based on how far below target
      const urgency = (targetRetention - projectedRetention) * 100;
      conceptsNeedingReview.push({
        conceptId: mastery.conceptId,
        urgency,
      });
    }
  }

  // Sort by urgency (most urgent first)
  conceptsNeedingReview.sort((a, b) => b.urgency - a.urgency);

  const totalConceptsToReview = conceptsNeedingReview.length;
  const dailyReviewsNeeded = Math.ceil(totalConceptsToReview / daysUntilExam);

  // Create suggested schedule
  const suggestedSchedule: DaySchedule[] = [];
  let conceptIndex = 0;

  for (let day = 0; day < Math.min(daysUntilExam, 14); day++) { // Show up to 14 days
    const date = new Date(now.getTime() + day * 24 * 60 * 60 * 1000);
    const conceptIds: string[] = [];

    for (let i = 0; i < dailyReviewsNeeded && conceptIndex < totalConceptsToReview; i++) {
      conceptIds.push(conceptsNeedingReview[conceptIndex].conceptId);
      conceptIndex++;
    }

    if (conceptIds.length > 0) {
      suggestedSchedule.push({
        date,
        reviewCount: conceptIds.length,
        conceptIds,
      });
    }
  }

  return {
    dailyReviewsNeeded,
    totalConceptsToReview,
    conceptsAtRisk: conceptsNeedingReview.slice(0, 10).map(c => c.conceptId), // Top 10 most urgent
    daysUntilExam,
    onTrack: totalConceptsToReview === 0 || dailyReviewsNeeded <= 5,
    suggestedSchedule,
  };
}

/**
 * Get a human-readable status message for exam readiness
 */
export function getReadinessMessage(readiness: ExamReadinessResult): string {
  const { overallReadiness, daysUntilExam, onTrack, conceptsAtRisk } = readiness;

  if (daysUntilExam <= 0) {
    return 'Your exam date has passed. Update your exam date to continue tracking.';
  }

  if (overallReadiness >= 95) {
    return `Excellent! You're ${overallReadiness}% ready. Keep maintaining your knowledge with regular reviews.`;
  }

  if (overallReadiness >= 80) {
    if (onTrack) {
      return `Good progress! You're ${overallReadiness}% ready with ${daysUntilExam} days to go. Stay consistent!`;
    }
    return `You're ${overallReadiness}% ready. Focus on ${conceptsAtRisk.length} concepts that need extra attention.`;
  }

  if (overallReadiness >= 60) {
    return `Making progress at ${overallReadiness}% ready. Review ${readiness.dailyReviewsNeeded} concepts daily to stay on track.`;
  }

  return `You're ${overallReadiness}% ready with ${daysUntilExam} days until your exam. Consider increasing your daily review goal.`;
}
