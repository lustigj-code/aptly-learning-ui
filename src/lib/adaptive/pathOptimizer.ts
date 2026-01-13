/**
 * Learning Path Optimizer - ML-Driven Curriculum Sequencing
 *
 * Optimizes learning paths based on:
 * 1. User's current mastery state
 * 2. Learning velocity analysis
 * 3. Prerequisite relationships
 * 4. Fast-track eligibility
 */

import { adminDb } from '@/lib/firebase/admin';
import { getSkillMap } from '@/lib/skillmap/skillMapStorage';
import { type SkillState, DEFAULT_MASTERY_THRESHOLD } from '@/lib/mastery/bkt';
import { getSkillName } from '@/data/skillMap';

// ============================================
// TYPES
// ============================================

export interface LearningVelocity {
  atomsPerHour: number;
  averageAccuracy: number;
  trend: 'improving' | 'stable' | 'declining';
  confidence: number;
}

export interface PathSkill {
  skillId: string;
  skillName: string;
  order: number;
  estimatedMinutes: number;
  canSkip: boolean;
  skipReason?: string;
  prerequisites: string[];
  pMastery: number;
}

export interface OptimizedPath {
  skills: PathSkill[];
  estimatedCompletionHours: number;
  pathType: 'standard' | 'accelerated' | 'remedial';
  reasoning: string;
}

export interface CompletionEstimate {
  estimatedDays: number;
  estimatedHours: number;
  completionDate: Date;
  averageDailyMinutes: number;
  confidence: number;
}

export interface FastTrackEligibility {
  eligible: boolean;
  skillsToSkip: string[];
  timeSavedMinutes: number;
  reason: string;
}

interface SessionData {
  userId: string;
  startTime: Date;
  endTime: Date;
  atomsCompleted: number;
  correctCount: number;
  totalAttempts: number;
}

// ============================================
// CONSTANTS
// ============================================

const MASTERY_THRESHOLD_FOR_SKIP = 0.85;
const ACCELERATED_THRESHOLD = 0.7; // Average mastery above this = accelerated path
const REMEDIAL_THRESHOLD = 0.3; // Average mastery below this = remedial path
const FAST_TRACK_MIN_MASTERED_SKILLS = 3;
const DEFAULT_SKILL_MINUTES = 15;

// ============================================
// LEARNING VELOCITY CALCULATION
// ============================================

/**
 * Calculate learning velocity based on recent sessions
 * Analyzes last 7 days of user activity
 */
export async function calculateLearningVelocity(
  userId: string
): Promise<LearningVelocity> {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Fetch recent sessions
    const sessionsRef = adminDb
      .collection('sessions')
      .where('userId', '==', userId)
      .where('startTime', '>=', sevenDaysAgo)
      .orderBy('startTime', 'desc');

    const sessionsSnap = await sessionsRef.get();

    if (sessionsSnap.empty) {
      // No recent data - return default velocity
      return {
        atomsPerHour: 4, // Default assumption: 4 atoms/hour
        averageAccuracy: 0.7,
        trend: 'stable',
        confidence: 0.3, // Low confidence due to no data
      };
    }

    const sessions: SessionData[] = [];
    sessionsSnap.forEach((doc) => {
      const data = doc.data();
      sessions.push({
        userId: data.userId,
        startTime: data.startTime?.toDate() ?? new Date(),
        endTime: data.endTime?.toDate() ?? new Date(),
        atomsCompleted: data.atomsCompleted ?? 0,
        correctCount: data.correctCount ?? 0,
        totalAttempts: data.totalAttempts ?? 0,
      });
    });

    // Calculate metrics
    let totalMinutes = 0;
    let totalAtoms = 0;
    let totalCorrect = 0;
    let totalAttempts = 0;

    for (const session of sessions) {
      const durationMinutes =
        (session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60);
      totalMinutes += durationMinutes;
      totalAtoms += session.atomsCompleted;
      totalCorrect += session.correctCount;
      totalAttempts += session.totalAttempts;
    }

    const totalHours = totalMinutes / 60;
    const atomsPerHour = totalHours > 0 ? totalAtoms / totalHours : 4;
    const averageAccuracy =
      totalAttempts > 0 ? totalCorrect / totalAttempts : 0.7;

    // Calculate trend by comparing first half to second half
    const midpoint = Math.floor(sessions.length / 2);
    const firstHalf = sessions.slice(0, midpoint);
    const secondHalf = sessions.slice(midpoint);

    const firstHalfAccuracy = calculateAccuracy(firstHalf);
    const secondHalfAccuracy = calculateAccuracy(secondHalf);

    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    const diff = secondHalfAccuracy - firstHalfAccuracy;
    if (diff > 0.1) trend = 'improving';
    else if (diff < -0.1) trend = 'declining';

    // Confidence based on data amount
    const confidence = Math.min(0.95, 0.3 + sessions.length * 0.1);

    return {
      atomsPerHour: Math.round(atomsPerHour * 10) / 10,
      averageAccuracy: Math.round(averageAccuracy * 100) / 100,
      trend,
      confidence,
    };
  } catch (error) {
    console.error('[PathOptimizer] Error calculating velocity:', error);
    return {
      atomsPerHour: 4,
      averageAccuracy: 0.7,
      trend: 'stable',
      confidence: 0.3,
    };
  }
}

function calculateAccuracy(sessions: SessionData[]): number {
  let totalCorrect = 0;
  let totalAttempts = 0;
  for (const session of sessions) {
    totalCorrect += session.correctCount;
    totalAttempts += session.totalAttempts;
  }
  return totalAttempts > 0 ? totalCorrect / totalAttempts : 0.5;
}

// ============================================
// PATH OPTIMIZATION
// ============================================

/**
 * Build an optimized learning path for a user
 * Uses topological sort respecting prerequisites
 */
export async function buildOptimizedPath(
  userId: string,
  courseId: string
): Promise<OptimizedPath> {
  try {
    // Get skill map for course
    const skillMap = await getSkillMap(courseId);
    if (!skillMap || !skillMap.skills) {
      return {
        skills: [],
        estimatedCompletionHours: 0,
        pathType: 'standard',
        reasoning: 'No skill map found for course',
      };
    }

    // Fetch user's mastery states
    const masteryStates = await fetchUserMastery(userId);

    // Calculate average mastery
    const skillIds = Object.keys(skillMap.skills);
    let totalMastery = 0;
    let masteredCount = 0;

    for (const skillId of skillIds) {
      const mastery = masteryStates[skillId]?.pMastery ?? 0;
      totalMastery += mastery;
      if (mastery >= DEFAULT_MASTERY_THRESHOLD) {
        masteredCount++;
      }
    }

    const avgMastery = skillIds.length > 0 ? totalMastery / skillIds.length : 0;

    // Determine path type
    let pathType: 'standard' | 'accelerated' | 'remedial' = 'standard';
    let reasoning = 'Following standard learning path';

    if (avgMastery >= ACCELERATED_THRESHOLD && masteredCount >= 3) {
      pathType = 'accelerated';
      reasoning = `High mastery detected (${Math.round(avgMastery * 100)}% average). Enabling skill skipping for mastered concepts.`;
    } else if (avgMastery <= REMEDIAL_THRESHOLD) {
      pathType = 'remedial';
      reasoning = `Building foundation with additional support. Current average mastery: ${Math.round(avgMastery * 100)}%`;
    }

    // Build skill list with topological sort
    const orderedSkills = topologicalSort(skillMap.skills, masteryStates);

    // Create path skills
    const pathSkills: PathSkill[] = orderedSkills.map((skillId, index) => {
      const skill = skillMap.skills[skillId];
      const mastery = masteryStates[skillId]?.pMastery ?? 0;

      // Determine if skill can be skipped
      let canSkip = false;
      let skipReason: string | undefined;

      if (pathType === 'accelerated' && mastery >= MASTERY_THRESHOLD_FOR_SKIP) {
        canSkip = true;
        skipReason = `Already mastered (${Math.round(mastery * 100)}%)`;
      }

      // Estimate minutes based on mastery
      let estimatedMinutes = DEFAULT_SKILL_MINUTES;
      if (mastery > 0.5) {
        // Less time needed for partially mastered skills
        estimatedMinutes = Math.max(5, Math.round(DEFAULT_SKILL_MINUTES * (1 - mastery * 0.5)));
      } else if (mastery < 0.2) {
        // More time for new skills
        estimatedMinutes = Math.round(DEFAULT_SKILL_MINUTES * 1.2);
      }

      return {
        skillId,
        skillName: skill?.name ?? getSkillName(skillId),
        order: index + 1,
        estimatedMinutes,
        canSkip,
        skipReason,
        prerequisites: skill?.prerequisites ?? [],
        pMastery: Math.round(mastery * 100) / 100,
      };
    });

    // Calculate total time
    const totalMinutes = pathSkills
      .filter((s) => !s.canSkip)
      .reduce((sum, s) => sum + s.estimatedMinutes, 0);

    return {
      skills: pathSkills,
      estimatedCompletionHours: Math.round((totalMinutes / 60) * 10) / 10,
      pathType,
      reasoning,
    };
  } catch (error) {
    console.error('[PathOptimizer] Error building path:', error);
    return {
      skills: [],
      estimatedCompletionHours: 0,
      pathType: 'standard',
      reasoning: 'Error building path',
    };
  }
}

/**
 * Topological sort of skills respecting prerequisites
 */
function topologicalSort(
  skills: Record<string, { prerequisites: string[]; name: string; lessonId: string }>,
  masteryStates: Record<string, SkillState>
): string[] {
  const result: string[] = [];
  const skillIds = Object.keys(skills);

  // Build in-degree map
  const inDegree: Record<string, number> = {};
  const adjList: Record<string, string[]> = {};

  for (const skillId of skillIds) {
    inDegree[skillId] = 0;
    adjList[skillId] = [];
  }

  // Count prerequisites (in-degree)
  for (const skillId of skillIds) {
    const prereqs = skills[skillId]?.prerequisites ?? [];
    inDegree[skillId] = prereqs.filter((p) => skillIds.includes(p)).length;

    // Build adjacency list (reverse direction for topological sort)
    for (const prereq of prereqs) {
      if (skillIds.includes(prereq)) {
        if (!adjList[prereq]) adjList[prereq] = [];
        adjList[prereq].push(skillId);
      }
    }
  }

  // Start with skills that have no prerequisites
  const queue: string[] = [];
  for (const skillId of skillIds) {
    if (inDegree[skillId] === 0) {
      queue.push(skillId);
    }
  }

  // Process queue
  while (queue.length > 0) {
    // Sort queue by mastery (lower mastery first for remedial focus)
    queue.sort((a, b) => {
      const masteryA = masteryStates[a]?.pMastery ?? 0;
      const masteryB = masteryStates[b]?.pMastery ?? 0;
      return masteryA - masteryB;
    });

    const skillId = queue.shift()!;
    result.push(skillId);

    // Reduce in-degree of dependent skills
    for (const dependent of adjList[skillId] ?? []) {
      inDegree[dependent]--;
      if (inDegree[dependent] === 0) {
        queue.push(dependent);
      }
    }
  }

  return result;
}

// ============================================
// COMPLETION ESTIMATE
// ============================================

/**
 * Estimate when user will complete the course
 */
export async function getCompletionEstimate(
  userId: string,
  courseId: string
): Promise<CompletionEstimate> {
  try {
    // Get path and velocity
    const [path, velocity] = await Promise.all([
      buildOptimizedPath(userId, courseId),
      calculateLearningVelocity(userId),
    ]);

    // Get user's average daily minutes
    const avgDailyMinutes = await getAverageDailyMinutes(userId);

    // Calculate remaining skills (non-skippable, not mastered)
    const remainingSkills = path.skills.filter(
      (s) => !s.canSkip && s.pMastery < DEFAULT_MASTERY_THRESHOLD
    );

    const remainingMinutes = remainingSkills.reduce(
      (sum, s) => sum + s.estimatedMinutes,
      0
    );

    // Estimate days based on daily study time
    const estimatedDays =
      avgDailyMinutes > 0
        ? Math.ceil(remainingMinutes / avgDailyMinutes)
        : Math.ceil(remainingMinutes / 15); // Default 15 min/day

    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + estimatedDays);

    return {
      estimatedDays,
      estimatedHours: Math.round((remainingMinutes / 60) * 10) / 10,
      completionDate,
      averageDailyMinutes: Math.round(avgDailyMinutes),
      confidence: velocity.confidence,
    };
  } catch (error) {
    console.error('[PathOptimizer] Error estimating completion:', error);
    return {
      estimatedDays: 30,
      estimatedHours: 10,
      completionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      averageDailyMinutes: 15,
      confidence: 0.3,
    };
  }
}

async function getAverageDailyMinutes(userId: string): Promise<number> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sessionsRef = adminDb
      .collection('sessions')
      .where('userId', '==', userId)
      .where('startTime', '>=', thirtyDaysAgo);

    const sessionsSnap = await sessionsRef.get();

    if (sessionsSnap.empty) return 15; // Default

    // Group by day
    const minutesByDay: Record<string, number> = {};

    sessionsSnap.forEach((doc) => {
      const data = doc.data();
      const startTime = data.startTime?.toDate() ?? new Date();
      const endTime = data.endTime?.toDate() ?? new Date();
      const dayKey = startTime.toISOString().split('T')[0];
      const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

      minutesByDay[dayKey] = (minutesByDay[dayKey] ?? 0) + duration;
    });

    const days = Object.keys(minutesByDay).length;
    const totalMinutes = Object.values(minutesByDay).reduce((a, b) => a + b, 0);

    return days > 0 ? totalMinutes / days : 15;
  } catch {
    return 15;
  }
}

// ============================================
// FAST TRACK ELIGIBILITY
// ============================================

/**
 * Check if user is eligible for fast-track
 * Eligible if 3+ skills already mastered
 */
export async function checkFastTrackEligibility(
  userId: string,
  courseId: string
): Promise<FastTrackEligibility> {
  try {
    const path = await buildOptimizedPath(userId, courseId);

    const skillsToSkip = path.skills
      .filter((s) => s.canSkip)
      .map((s) => s.skillId);

    const timeSavedMinutes = path.skills
      .filter((s) => s.canSkip)
      .reduce((sum, s) => sum + s.estimatedMinutes, 0);

    const eligible = skillsToSkip.length >= FAST_TRACK_MIN_MASTERED_SKILLS;

    let reason: string;
    if (eligible) {
      reason = `You've demonstrated mastery in ${skillsToSkip.length} skills. Fast-track enabled!`;
    } else if (skillsToSkip.length > 0) {
      reason = `Almost there! Master ${FAST_TRACK_MIN_MASTERED_SKILLS - skillsToSkip.length} more skills for fast-track.`;
    } else {
      reason = 'Complete lessons to unlock fast-track options.';
    }

    return {
      eligible,
      skillsToSkip,
      timeSavedMinutes,
      reason,
    };
  } catch (error) {
    console.error('[PathOptimizer] Error checking fast-track:', error);
    return {
      eligible: false,
      skillsToSkip: [],
      timeSavedMinutes: 0,
      reason: 'Unable to determine fast-track eligibility',
    };
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function fetchUserMastery(
  userId: string
): Promise<Record<string, SkillState>> {
  try {
    const skillStatesRef = adminDb
      .collection('skillStates')
      .doc(userId)
      .collection('skills');
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

    return skillStates;
  } catch (error) {
    console.error('[PathOptimizer] Error fetching mastery:', error);
    return {};
  }
}

// ============================================
// EXPORTS
// ============================================

export {
  MASTERY_THRESHOLD_FOR_SKIP,
  ACCELERATED_THRESHOLD,
  REMEDIAL_THRESHOLD,
  FAST_TRACK_MIN_MASTERED_SKILLS,
};
