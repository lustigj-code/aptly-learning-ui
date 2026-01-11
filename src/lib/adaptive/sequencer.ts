/**
 * Adaptive Sequencer - Next Item Selection Algorithm
 *
 * Determines what the learner should do next based on:
 * 1. Critical reviews (prevent forgetting)
 * 2. Zone of proximal development (skills close to mastery)
 * 3. Quick wins (skills almost mastered)
 * 4. New learning (progress the course)
 */

import { type SkillState, type SkillMap, getSkillsByPriority, estimateAttemptsToMastery, DEFAULT_MASTERY_THRESHOLD } from '@/lib/mastery/bkt';
import { getDueForReview } from '@/lib/mastery/fsrs';
import { type ConceptMastery } from '@/lib/mastery/knowledgeGraph';
import { AI_AT_WORK_SKILL_MAP, getSkillName, getSkillModule } from '@/data/skillMap';
import { adminDb } from '@/lib/firebase/admin';

// ============================================
// TYPES
// ============================================

export interface NextItemRecommendation {
  type: 'new_content' | 'review' | 'remediation' | 'practice';
  itemId: string; // atom, concept, or generated content ID
  skillId: string; // primary skill this targets
  reason: string; // human-readable explanation
  priority: number; // 1 = highest priority
  estimatedMinutes: number;
  metadata?: {
    pMastery?: number;
    predictedRetention?: number;
    overdueBy?: number; // hours overdue
    attemptsToMastery?: number;
  };
}

export interface SequencerConfig {
  maxItems: number;
  sessionGoal: 'learn' | 'review' | 'mixed';
  availableMinutes?: number;
  userPreferences: {
    learningPace: 'light' | 'moderate' | 'intensive';
    preferredFormat: 'video' | 'reading' | 'mixed';
  };
}

export interface UserLearnerState {
  skillStates: Record<string, SkillState>;
  fsrsStates: ConceptMastery[];
  completedAtoms: string[];
  currentLessonId?: string;
}

// ============================================
// DEFAULT CONFIG
// ============================================

export const DEFAULT_SEQUENCER_CONFIG: SequencerConfig = {
  maxItems: 5,
  sessionGoal: 'mixed',
  availableMinutes: 30,
  userPreferences: {
    learningPace: 'moderate',
    preferredFormat: 'mixed',
  },
};

// ============================================
// MAIN SEQUENCER FUNCTION
// ============================================

/**
 * Main function: What should user do next?
 * Returns prioritized list of recommendations
 */
export async function getNextItems(
  userId: string,
  config: SequencerConfig = DEFAULT_SEQUENCER_CONFIG
): Promise<NextItemRecommendation[]> {
  const recommendations: NextItemRecommendation[] = [];

  // Fetch user's current learning state
  const learnerState = await fetchLearnerState(userId);

  // Priority 1: Critical Reviews (prevent forgetting)
  if (config.sessionGoal !== 'learn') {
    const criticalReviews = getCriticalReviews(learnerState);
    for (const review of criticalReviews.slice(0, 2)) {
      recommendations.push({
        ...review,
        priority: 1,
      });
    }
  }

  // Priority 2: Zone of Proximal Development (maximize learning)
  const zpd = getSkillsNearMastery(
    Object.values(learnerState.skillStates),
    { min: 0.6, max: 0.94 }
  );
  for (const skill of zpd.slice(0, 2)) {
    const attemptsLeft = estimateAttemptsToMastery(skill.pMastery);
    recommendations.push({
      type: 'practice',
      itemId: getContentForSkill(skill.skillId, 'practice'),
      skillId: skill.skillId,
      reason: `Almost there! ${attemptsLeft} more correct ${attemptsLeft === 1 ? 'answer' : 'answers'} to master "${getSkillName(skill.skillId)}"`,
      priority: 2,
      estimatedMinutes: 3,
      metadata: {
        pMastery: skill.pMastery,
        attemptsToMastery: attemptsLeft,
      },
    });
  }

  // Priority 3: Quick Wins (maintain momentum)
  const quickWins = getQuickWins(Object.values(learnerState.skillStates));
  for (const skill of quickWins.slice(0, 1)) {
    recommendations.push({
      type: 'practice',
      itemId: getContentForSkill(skill.skillId, 'quiz'),
      skillId: skill.skillId,
      reason: `Quick practice to lock in "${getSkillName(skill.skillId)}"`,
      priority: 3,
      estimatedMinutes: 2,
      metadata: {
        pMastery: skill.pMastery,
      },
    });
  }

  // Priority 4: New Learning (progress the course)
  if (config.sessionGoal !== 'review') {
    const readyToLearn = getReadyToLearnSkills(
      learnerState.skillStates,
      AI_AT_WORK_SKILL_MAP
    );
    for (const skillId of readyToLearn.slice(0, 2)) {
      const skill = AI_AT_WORK_SKILL_MAP.skills[skillId];
      recommendations.push({
        type: 'new_content',
        itemId: getContentForSkill(skillId, 'lesson'),
        skillId,
        reason: `Ready to learn: "${getSkillName(skillId)}"`,
        priority: 4,
        estimatedMinutes: skill ? estimateLessonMinutes(skill.lessonId) : 10,
        metadata: {
          pMastery: learnerState.skillStates[skillId]?.pMastery ?? 0,
        },
      });
    }
  }

  // Fallback for new users: If no recommendations, start with Module 1
  if (recommendations.length === 0) {
    console.log('[Sequencer] No recommendations found, adding starter content for new user');

    // Add the first skill (M1-genai-definition has no prerequisites)
    const starterSkill = AI_AT_WORK_SKILL_MAP.skills['M1-genai-definition'];
    if (starterSkill) {
      recommendations.push({
        type: 'new_content',
        itemId: `lesson-${starterSkill.lessonId}`,
        skillId: 'M1-genai-definition',
        reason: 'Start your learning journey: "What is Generative AI?"',
        priority: 4,
        estimatedMinutes: 15,
        metadata: { pMastery: 0 },
      });
    }
  }

  // Sort by priority, filter by available time
  return filterByTime(
    recommendations.sort((a, b) => a.priority - b.priority),
    config.availableMinutes ?? 30
  );
}

// ============================================
// HELPER FUNCTIONS - PRIORITY SELECTION
// ============================================

/**
 * Get skills in the Zone of Proximal Development (close to mastery)
 */
export function getSkillsNearMastery(
  skillStates: SkillState[],
  range: { min: number; max: number }
): SkillState[] {
  return skillStates
    .filter(s => s.pMastery >= range.min && s.pMastery < range.max)
    .sort((a, b) => b.pMastery - a.pMastery); // Closest to mastery first
}

/**
 * Get skills that are decaying and need review
 */
export function getDecayingSkills(
  skillStates: SkillState[],
  fsrsStates: ConceptMastery[]
): SkillState[] {
  const dueReviews = getDueForReview(fsrsStates, 10);
  const dueIds = new Set(dueReviews.map(r => r.conceptId));

  return skillStates.filter(s => dueIds.has(s.skillId));
}

/**
 * Get skills ready to learn (prerequisites met, not yet started/mastered)
 */
export function getReadyToLearnSkills(
  skillStates: Record<string, SkillState>,
  skillMap: SkillMap
): string[] {
  const ready: string[] = [];

  for (const skillId of Object.keys(skillMap.skills)) {
    const skill = skillMap.skills[skillId];
    const currentPMastery = skillStates[skillId]?.pMastery ?? 0;

    // Skip if already mastered or significantly started
    if (currentPMastery >= DEFAULT_MASTERY_THRESHOLD || currentPMastery > 0.3) {
      continue;
    }

    // Check if all prerequisites are mastered
    const prerequisitesMet = skill.prerequisites.every(prereqId => {
      const prereqState = skillStates[prereqId];
      return prereqState && prereqState.pMastery >= DEFAULT_MASTERY_THRESHOLD;
    });

    // Skills with no prerequisites are always ready
    if (skill.prerequisites.length === 0 || prerequisitesMet) {
      ready.push(skillId);
    }
  }

  // Sort by course progression (earlier modules first)
  return ready.sort((a, b) => {
    const moduleA = getSkillModule(a);
    const moduleB = getSkillModule(b);
    return moduleA - moduleB;
  });
}

/**
 * Get critical reviews - skills overdue and at risk of forgetting
 */
function getCriticalReviews(learnerState: UserLearnerState): NextItemRecommendation[] {
  const reviews: NextItemRecommendation[] = [];
  const now = new Date();

  for (const fsrsState of learnerState.fsrsStates) {
    if (fsrsState.nextReviewAt <= now) {
      const overdueHours = (now.getTime() - fsrsState.nextReviewAt.getTime()) / (1000 * 60 * 60);

      // Prioritize reviews overdue by >24 hours
      if (overdueHours > 24) {
        reviews.push({
          type: 'review',
          itemId: getContentForSkill(fsrsState.conceptId, 'review'),
          skillId: fsrsState.conceptId,
          reason: `Prevent forgetting: "${getSkillName(fsrsState.conceptId)}" (${Math.round(overdueHours)}h overdue)`,
          priority: 1,
          estimatedMinutes: 3,
          metadata: {
            overdueBy: overdueHours,
            predictedRetention: calculatePredictedRetention(fsrsState),
          },
        });
      }
    }
  }

  // Sort by how overdue
  return reviews.sort((a, b) =>
    (b.metadata?.overdueBy ?? 0) - (a.metadata?.overdueBy ?? 0)
  );
}

/**
 * Get quick wins - skills very close to mastery
 */
function getQuickWins(skillStates: SkillState[]): SkillState[] {
  return skillStates
    .filter(s => s.pMastery >= 0.90 && s.pMastery < DEFAULT_MASTERY_THRESHOLD)
    .sort((a, b) => b.pMastery - a.pMastery);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Fetch user's complete learning state from Firestore
 */
async function fetchLearnerState(userId: string): Promise<UserLearnerState> {
  try {
    // Fetch skill states
    const skillStatesRef = adminDb.collection('skillStates').doc(userId).collection('skills');
    const skillStatesSnap = await skillStatesRef.get();

    const skillStates: Record<string, SkillState> = {};
    skillStatesSnap.forEach(doc => {
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

    // Fetch FSRS states
    const fsrsRef = adminDb.collection('conceptMastery').doc(userId).collection('concepts');
    const fsrsSnap = await fsrsRef.get();

    const fsrsStates: ConceptMastery[] = [];
    fsrsSnap.forEach(doc => {
      const data = doc.data();
      fsrsStates.push({
        conceptId: doc.id,
        userId,
        masteryLevel: data.masteryLevel ?? 0,
        lastReviewedAt: data.lastReviewedAt?.toDate() ?? new Date(),
        lastQuizScore: data.lastQuizScore ?? 0,
        reviewCount: data.reviewCount ?? 0,
        correctStreak: data.correctStreak ?? 0,
        incorrectStreak: data.incorrectStreak ?? 0,
        fsrsState: data.fsrsState ?? {
          stability: 0,
          difficulty: 0,
          elapsedDays: 0,
          scheduledDays: 0,
          reps: 0,
          lapses: 0,
          state: 'new',
        },
        nextReviewAt: data.nextReviewAt?.toDate() ?? new Date(),
        history: data.history ?? [],
      });
    });

    // Fetch completed atoms
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const completedAtoms = userData?.progress?.atomsCompleted ?? [];
    const currentLessonId = userData?.progress?.currentLessonId;

    return {
      skillStates,
      fsrsStates,
      completedAtoms,
      currentLessonId,
    };
  } catch (error) {
    console.error('Error fetching learner state:', error);
    return {
      skillStates: {},
      fsrsStates: [],
      completedAtoms: [],
    };
  }
}

/**
 * Get appropriate content ID for a skill
 */
function getContentForSkill(
  skillId: string,
  contentType: 'lesson' | 'quiz' | 'practice' | 'review'
): string {
  const skill = AI_AT_WORK_SKILL_MAP.skills[skillId];
  if (!skill) return skillId;

  // Map to content based on type
  switch (contentType) {
    case 'lesson':
      return `lesson-${skill.lessonId}`;
    case 'quiz':
      return `quiz-${skill.lessonId}-${skillId}`;
    case 'practice':
      return `practice-${skillId}`;
    case 'review':
      return `review-${skillId}`;
    default:
      return skillId;
  }
}

/**
 * Estimate lesson duration in minutes
 */
function estimateLessonMinutes(lessonId: string): number {
  // Default estimates by lesson type
  const estimates: Record<string, number> = {
    '1.1': 15,
    '1.2': 12,
    '1.3': 10,
    '2.1': 15,
    '2.2': 12,
    '2.3': 10,
    '3.1': 15,
    '3.2': 18,
    '3.3': 12,
    '4.1': 10,
    '4.2': 15,
    '4.3': 18,
    '4.4': 15,
  };

  return estimates[lessonId] ?? 12;
}

/**
 * Calculate predicted retention based on FSRS state
 */
function calculatePredictedRetention(mastery: ConceptMastery): number {
  const { stability } = mastery.fsrsState;
  const elapsedDays = (Date.now() - mastery.lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24);

  if (stability <= 0) return 0;

  // FSRS retention formula
  return Math.pow(1 + elapsedDays / (9 * stability), -1) * 100;
}

/**
 * Filter recommendations by available time
 */
function filterByTime(
  recommendations: NextItemRecommendation[],
  availableMinutes: number
): NextItemRecommendation[] {
  const filtered: NextItemRecommendation[] = [];
  let totalMinutes = 0;

  for (const rec of recommendations) {
    // Always include at least one item, even if slightly over time
    if (filtered.length === 0 || totalMinutes + rec.estimatedMinutes <= availableMinutes) {
      filtered.push(rec);
      totalMinutes += rec.estimatedMinutes;
    }
  }

  return filtered;
}

// ============================================
// EXPORTS
// ============================================

export {
  fetchLearnerState,
  getContentForSkill,
  estimateLessonMinutes,
  calculatePredictedRetention,
};
