/**
 * Dashboard AI Insights API
 *
 * Returns ML-driven learning insights including:
 * - Learning velocity (atoms/hour with trend)
 * - Predicted completion date with confidence
 * - Strongest skill and focus area recommendations
 * - Model information (BKT vs Hybrid)
 *
 * All insights include "why" explanations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import type { SkillState } from '@/lib/mastery/bkt';
import { CONTENT, MASTERY } from '@/config/constants';

/**
 * AI Insights Response Type
 */
interface AIInsights {
  velocity: {
    atomsPerHour: number;
    trend: 'increasing' | 'stable' | 'decreasing';
    percentChange: number;
  };
  completion: {
    predictedDate: string;
    confidence: number;
    daysRemaining: number;
  };
  skills: {
    strongest: {
      name: string;
      mastery: number;
      reason: string;
    };
    focusArea: {
      name: string;
      mastery: number;
      reason: string;
    };
  };
  averageDailyMinutes: number;
  modelInfo: {
    type: 'BKT' | 'Hybrid' | 'DKT';
    version: string;
    lastUpdated: string;
  };
}

export async function GET(request: NextRequest) {
  // Verify authentication
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let authenticatedUserId: string;
  try {
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    authenticatedUserId = decodedToken.uid;
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const requestedUserId = searchParams.get('userId');

  if (!requestedUserId) {
    return NextResponse.json(
      { error: 'userId query param required' },
      { status: 400 }
    );
  }

  // IDOR Protection: Users can only access their own data
  if (requestedUserId !== authenticatedUserId) {
    return NextResponse.json(
      { error: 'Cannot access other users data' },
      { status: 403 }
    );
  }

  const userId = authenticatedUserId;

  try {
    // Fetch user data
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();

    // Fetch skill states
    const skillStatesRef = adminDb.collection('skillStates').doc(userId).collection('skills');
    const skillStatesSnap = await skillStatesRef.get();

    const skillStates: Record<string, SkillState> = {};
    skillStatesSnap.forEach((doc) => {
      const data = doc.data();
      skillStates[doc.id] = {
        skillId: doc.id,
        pMastery: data.pMastery ?? 0,
        attempts: data.attempts ?? 0,
        correctCount: data.correctCount ?? 0,
        lastAttempt: data.lastAttempt?.toDate() ?? new Date(),
        history: data.history ?? [],
      };
    });

    // Fetch interaction logs for velocity calculation (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const interactionsRef = adminDb
      .collection('interactions')
      .where('userId', '==', userId)
      .where('timestamp', '>=', sevenDaysAgo)
      .orderBy('timestamp', 'desc')
      .limit(500);

    const interactionsSnap = await interactionsRef.get();
    const recentInteractions: {
      timestamp: Date;
      isCorrect: boolean;
      skillId: string;
      responseTimeMs?: number;
    }[] = [];

    interactionsSnap.forEach((doc) => {
      const data = doc.data();
      recentInteractions.push({
        timestamp: data.timestamp?.toDate() ?? new Date(),
        isCorrect: data.isCorrect ?? false,
        skillId: data.skillId ?? '',
        responseTimeMs: data.responseTimeMs,
      });
    });

    // Calculate insights
    const insights = calculateInsights(
      userId,
      userData,
      skillStates,
      recentInteractions
    );

    return NextResponse.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    console.error('[Dashboard Insights API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}

/**
 * Calculate AI insights from user data
 */
function calculateInsights(
  userId: string,
  userData: FirebaseFirestore.DocumentData | undefined,
  skillStates: Record<string, SkillState>,
  recentInteractions: {
    timestamp: Date;
    isCorrect: boolean;
    skillId: string;
    responseTimeMs?: number;
  }[]
): AIInsights {
  // Calculate learning velocity
  const velocity = calculateVelocity(recentInteractions);

  // Calculate skill insights
  const skillInsights = calculateSkillInsights(skillStates);

  // Calculate predicted completion
  const completion = calculateCompletion(
    userData,
    skillStates,
    velocity.atomsPerHour
  );

  // Calculate average daily study time
  const averageDailyMinutes = calculateAverageDailyMinutes(recentInteractions);

  // Determine model type based on interaction count
  const totalInteractions = Object.values(skillStates).reduce(
    (sum, state) => sum + state.attempts,
    0
  );
  const modelType: 'BKT' | 'Hybrid' | 'DKT' =
    totalInteractions < 20 ? 'BKT' : totalInteractions < 50 ? 'Hybrid' : 'Hybrid';

  return {
    velocity,
    completion,
    skills: skillInsights,
    averageDailyMinutes,
    modelInfo: {
      type: modelType,
      version: '15.1',
      lastUpdated: new Date().toISOString(),
    },
  };
}

/**
 * Calculate learning velocity from recent interactions
 */
function calculateVelocity(
  interactions: { timestamp: Date; isCorrect: boolean }[]
): {
  atomsPerHour: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  percentChange: number;
} {
  if (interactions.length === 0) {
    return { atomsPerHour: 0, trend: 'stable', percentChange: 0 };
  }

  // Split into two halves for trend comparison
  const midpoint = Math.floor(interactions.length / 2);
  const recentHalf = interactions.slice(0, midpoint);
  const olderHalf = interactions.slice(midpoint);

  // Calculate atoms per hour for each half
  const calculateAtomsPerHour = (
    items: { timestamp: Date; isCorrect: boolean }[]
  ) => {
    if (items.length < 2) return 0;
    const firstTimestamp = items[items.length - 1].timestamp.getTime();
    const lastTimestamp = items[0].timestamp.getTime();
    const hours = Math.max(0.1, (lastTimestamp - firstTimestamp) / (1000 * 60 * 60));
    return items.length / hours;
  };

  const recentVelocity = calculateAtomsPerHour(recentHalf);
  const olderVelocity = calculateAtomsPerHour(olderHalf);

  // Calculate overall velocity
  const totalHours = interactions.length > 1
    ? Math.max(
        0.1,
        (interactions[0].timestamp.getTime() -
          interactions[interactions.length - 1].timestamp.getTime()) /
          (1000 * 60 * 60)
      )
    : 1;
  const atomsPerHour = interactions.length / totalHours;

  // Determine trend
  let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
  let percentChange = 0;

  if (olderVelocity > 0) {
    percentChange = Math.round(
      ((recentVelocity - olderVelocity) / olderVelocity) * 100
    );
    if (percentChange > 10) {
      trend = 'increasing';
    } else if (percentChange < -10) {
      trend = 'decreasing';
    }
  }

  return {
    atomsPerHour: Math.round(atomsPerHour * 10) / 10,
    trend,
    percentChange,
  };
}

/**
 * Calculate skill insights (strongest and focus area)
 */
function calculateSkillInsights(skillStates: Record<string, SkillState>): {
  strongest: { name: string; mastery: number; reason: string };
  focusArea: { name: string; mastery: number; reason: string };
} {
  const skills = Object.values(skillStates);

  if (skills.length === 0) {
    return {
      strongest: {
        name: 'Getting Started',
        mastery: 0,
        reason: 'Complete your first learning atoms to see skill insights.',
      },
      focusArea: {
        name: 'First Lesson',
        mastery: 0,
        reason: 'Start learning to identify focus areas.',
      },
    };
  }

  // Sort by mastery
  const sortedByMastery = [...skills].sort((a, b) => b.pMastery - a.pMastery);

  // Find strongest skill (highest mastery with meaningful attempts)
  const strongestSkill = sortedByMastery.find((s) => s.attempts >= 3) || sortedByMastery[0];

  // Find focus area (lowest mastery with recent activity)
  const focusSkill =
    sortedByMastery
      .filter((s) => s.attempts > 0)
      .reverse()
      .find((s) => s.pMastery < MASTERY.THRESHOLD_PROFICIENT) || sortedByMastery[sortedByMastery.length - 1];

  // Generate skill names from IDs (simplified - in production, fetch from skill map)
  const formatSkillName = (skillId: string): string => {
    return skillId
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .replace(/ai/gi, 'AI');
  };

  // Generate reasons
  const strongestReason = generateStrongestReason(strongestSkill);
  const focusReason = generateFocusReason(focusSkill);

  return {
    strongest: {
      name: formatSkillName(strongestSkill.skillId),
      mastery: Math.round(strongestSkill.pMastery * 100),
      reason: strongestReason,
    },
    focusArea: {
      name: formatSkillName(focusSkill.skillId),
      mastery: Math.round(focusSkill.pMastery * 100),
      reason: focusReason,
    },
  };
}

/**
 * Generate explanation for strongest skill
 */
function generateStrongestReason(skill: SkillState): string {
  const accuracy = skill.attempts > 0
    ? Math.round((skill.correctCount / skill.attempts) * 100)
    : 0;

  if (skill.pMastery >= 0.9 && accuracy >= 85) {
    return `You answered ${accuracy}% of questions correctly with ${skill.attempts} attempts. Excellent retention.`;
  }
  if (skill.pMastery >= MASTERY.THRESHOLD_PROFICIENT) {
    return `Strong performance with ${skill.correctCount} correct answers from ${skill.attempts} attempts.`;
  }
  return `You've practiced this ${skill.attempts} times with improving results.`;
}

/**
 * Generate explanation for focus area
 */
function generateFocusReason(skill: SkillState): string {
  if (skill.pMastery < 0.3) {
    return 'This concept needs more practice to build foundation. Focus here to unlock advanced topics.';
  }
  if (skill.pMastery < 0.5) {
    return 'Below target mastery. Additional practice will help reinforce understanding.';
  }
  if (skill.pMastery < MASTERY.THRESHOLD_PROFICIENT) {
    return 'Getting close to mastery. A few more successful reviews will solidify this knowledge.';
  }
  return 'Review this periodically to maintain high mastery.';
}

/**
 * Calculate predicted completion date
 */
function calculateCompletion(
  userData: FirebaseFirestore.DocumentData | undefined,
  skillStates: Record<string, SkillState>,
  atomsPerHour: number
): {
  predictedDate: string;
  confidence: number;
  daysRemaining: number;
} {
  // Get progress data
  const progress = userData?.progress || {};
  const lessonsCompleted = progress.lessonsCompleted?.length || 0;

  // Calculate remaining work
  const remainingLessons = CONTENT.TOTAL_LESSONS - lessonsCompleted;
  const remainingAtoms = remainingLessons * CONTENT.ATOMS_PER_LESSON;

  // Calculate days remaining
  let daysRemaining: number;
  let confidence: number;

  if (atomsPerHour <= 0) {
    // No activity - use default estimate
    daysRemaining = Math.ceil(remainingAtoms / 8); // Assume 8 atoms/day
    confidence = 30;
  } else {
    // Calculate based on current velocity
    const hoursPerDay = 0.5; // Assume 30 min/day average
    const atomsPerDay = atomsPerHour * hoursPerDay;
    daysRemaining = Math.ceil(remainingAtoms / Math.max(1, atomsPerDay));

    // Confidence based on data quality
    const totalAttempts = Object.values(skillStates).reduce(
      (sum, s) => sum + s.attempts,
      0
    );
    confidence = Math.min(90, 40 + totalAttempts * 2);
  }

  // Cap at reasonable range
  daysRemaining = Math.max(1, Math.min(365, daysRemaining));

  const predictedDate = new Date();
  predictedDate.setDate(predictedDate.getDate() + daysRemaining);

  return {
    predictedDate: predictedDate.toISOString(),
    confidence,
    daysRemaining,
  };
}

/**
 * Calculate average daily study time from interactions
 */
function calculateAverageDailyMinutes(
  interactions: { timestamp: Date; responseTimeMs?: number }[]
): number {
  if (interactions.length === 0) return 0;

  // Group interactions by day
  const dayMap = new Map<string, number>();

  interactions.forEach((interaction) => {
    const dayKey = interaction.timestamp.toISOString().split('T')[0];
    const minutes = interaction.responseTimeMs
      ? interaction.responseTimeMs / (1000 * 60)
      : 1; // Default 1 minute per interaction

    dayMap.set(dayKey, (dayMap.get(dayKey) || 0) + minutes);
  });

  // Calculate average
  const totalDays = dayMap.size || 1;
  const totalMinutes = Array.from(dayMap.values()).reduce((sum, m) => sum + m, 0);

  // Add estimated overhead per interaction (reading, thinking)
  const overheadMinutes = interactions.length * 0.5;

  return Math.round((totalMinutes + overheadMinutes) / totalDays);
}
