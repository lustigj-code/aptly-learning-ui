/**
 * Optimal Timing System for Proactive Coach
 *
 * Determines when the coach should appear at optimal learning moments:
 * - Mastery milestones (50%, 75%, 90%, 95%)
 * - Session transitions (warmup -> main, main -> cooldown, etc.)
 * - Difficult content preparation
 * - Optimal review times
 * - Daily check-ins
 */

import { getSkillName } from '@/data/skillMap';

// ============================================
// TYPES
// ============================================

export type TimingTriggerType =
  | 'mastery_milestone'
  | 'session_transition'
  | 'difficult_content_prep'
  | 'review_optimal_time'
  | 'session_recap'
  | 'daily_check_in';

export type TimingPriority = 'high' | 'medium' | 'low';

export interface CoachMessage {
  title: string;
  body: string;
  action?: string;
  actionLabel?: string;
}

export interface TimingTrigger {
  type: TimingTriggerType;
  priority: TimingPriority;
  message: CoachMessage;
  context: Record<string, unknown>;
}

export type SessionPhase = 'warmup' | 'main' | 'cooldown' | 'complete';

export interface AtomDifficulty {
  atomId: string;
  difficulty: 'easy' | 'medium' | 'hard';
  prerequisiteSkills: string[];
  estimatedMinutes: number;
}

// ============================================
// MASTERY MILESTONES
// ============================================

const MASTERY_MILESTONES = [0.50, 0.75, 0.90, 0.95];

/**
 * Get milestone messages based on mastery level
 */
function getMilestoneMessage(milestone: number, skillName: string): CoachMessage {
  const milestonePercent = Math.round(milestone * 100);

  const messages: Record<number, CoachMessage> = {
    50: {
      title: 'Halfway There!',
      body: `You're making great progress on "${skillName}"! You've reached 50% mastery. Keep it up!`,
      actionLabel: 'Continue Learning',
    },
    75: {
      title: 'Strong Progress!',
      body: `Excellent work! You've mastered 75% of "${skillName}". You're getting really good at this.`,
      actionLabel: 'Keep Going',
    },
    90: {
      title: 'Almost Mastered!',
      body: `Amazing! You're at 90% mastery for "${skillName}". Just a little more practice to lock it in.`,
      actionLabel: 'Finish Strong',
    },
    95: {
      title: 'Skill Mastered!',
      body: `Congratulations! You've mastered "${skillName}"! This knowledge will serve you well.`,
      actionLabel: 'Celebrate',
    },
  };

  return messages[milestonePercent] || {
    title: 'Milestone Reached!',
    body: `You've reached ${milestonePercent}% mastery on "${skillName}"!`,
    actionLabel: 'Continue',
  };
}

/**
 * Check if user has crossed a mastery milestone
 */
export function checkMasteryMilestone(
  userId: string,
  skillId: string,
  newMastery: number,
  previousMastery: number
): TimingTrigger | null {
  // Find the highest milestone crossed
  for (let i = MASTERY_MILESTONES.length - 1; i >= 0; i--) {
    const milestone = MASTERY_MILESTONES[i];

    // Check if we just crossed this milestone
    if (newMastery >= milestone && previousMastery < milestone) {
      const skillName = getSkillName(skillId);
      const message = getMilestoneMessage(milestone, skillName);

      return {
        type: 'mastery_milestone',
        priority: milestone >= 0.90 ? 'high' : 'medium',
        message,
        context: {
          userId,
          skillId,
          skillName,
          milestone,
          newMastery,
          previousMastery,
        },
      };
    }
  }

  return null;
}

// ============================================
// DIFFICULT CONTENT PREPARATION
// ============================================

/**
 * Check if upcoming content is difficult and user may need preparation
 */
export function checkDifficultContentPrep(
  userId: string,
  upcomingAtom: AtomDifficulty,
  userMastery: Record<string, number>
): TimingTrigger | null {
  const { atomId, difficulty, prerequisiteSkills, estimatedMinutes } = upcomingAtom;

  // Check if content is hard
  const isHardContent = difficulty === 'hard';

  // Check for weak prerequisites (any prereq below 70% mastery)
  const weakPrerequisites = prerequisiteSkills.filter(
    skillId => (userMastery[skillId] || 0) < 0.70
  );

  // Only trigger if hard content or weak prerequisites
  if (!isHardContent && weakPrerequisites.length === 0) {
    return null;
  }

  // Build appropriate message
  let message: CoachMessage;

  if (weakPrerequisites.length > 0) {
    const weakSkillNames = weakPrerequisites
      .slice(0, 2)
      .map(id => getSkillName(id))
      .join(' and ');

    message = {
      title: 'Quick Review Suggested',
      body: `The next section builds on ${weakSkillNames}. A quick review might help you get the most out of it.`,
      action: 'review_prerequisites',
      actionLabel: 'Review First',
    };
  } else {
    message = {
      title: 'Challenging Content Ahead',
      body: `This next section is more advanced (about ${estimatedMinutes} minutes). Take your time, and I'm here if you need help.`,
      action: 'acknowledge',
      actionLabel: 'I\'m Ready',
    };
  }

  return {
    type: 'difficult_content_prep',
    priority: weakPrerequisites.length > 0 ? 'high' : 'medium',
    message,
    context: {
      userId,
      atomId,
      difficulty,
      prerequisiteSkills,
      weakPrerequisites,
      estimatedMinutes,
    },
  };
}

// ============================================
// SESSION TRANSITIONS
// ============================================

/**
 * Get transition messages for session phases
 */
function getTransitionMessage(
  currentPhase: SessionPhase,
  nextPhase: SessionPhase,
  sessionProgress: { itemsCompleted: number; totalItems: number }
): CoachMessage {
  const progressPercent = Math.round(
    (sessionProgress.itemsCompleted / sessionProgress.totalItems) * 100
  );

  const transitions: Record<string, CoachMessage> = {
    'warmup_main': {
      title: 'Warm-up Complete!',
      body: 'Great job getting warmed up! Now let\'s dive into the main learning material.',
      actionLabel: 'Let\'s Go',
    },
    'main_cooldown': {
      title: 'Almost Done!',
      body: `You've completed ${progressPercent}% of today's session. Let's wrap up with a quick review.`,
      actionLabel: 'Review Time',
    },
    'cooldown_complete': {
      title: 'Session Complete!',
      body: 'Excellent work today! Your brain is building new connections. See you next time!',
      actionLabel: 'Finish Session',
    },
    'warmup_complete': {
      title: 'Great Session!',
      body: 'Nice job completing today\'s warm-up review. Your memory is staying sharp!',
      actionLabel: 'Done',
    },
    'main_complete': {
      title: 'Learning Complete!',
      body: 'You\'ve finished today\'s main learning block. Great progress!',
      actionLabel: 'Celebrate',
    },
  };

  const key = `${currentPhase}_${nextPhase}`;
  return transitions[key] || {
    title: 'Moving Forward',
    body: 'Ready for the next part of your session?',
    actionLabel: 'Continue',
  };
}

/**
 * Check for session phase transitions
 */
export function checkSessionTransition(
  sessionProgress: { itemsCompleted: number; totalItems: number },
  currentPhase: SessionPhase,
  nextPhase: SessionPhase
): TimingTrigger | null {
  // Skip if no phase change
  if (currentPhase === nextPhase) {
    return null;
  }

  const message = getTransitionMessage(currentPhase, nextPhase, sessionProgress);

  // Higher priority for session completion
  const priority: TimingPriority = nextPhase === 'complete' ? 'high' : 'medium';

  return {
    type: 'session_transition',
    priority,
    message,
    context: {
      currentPhase,
      nextPhase,
      sessionProgress,
    },
  };
}

// ============================================
// OPTIMAL REVIEW TIME
// ============================================

/**
 * Check if current time is optimal for review based on user preferences
 */
export function checkOptimalReviewTime(
  userId: string,
  preferredLearningTime?: 'morning' | 'afternoon' | 'evening',
  dueReviewCount: number = 0,
  lastReviewDate?: Date
): TimingTrigger | null {
  // Skip if no reviews due
  if (dueReviewCount === 0) {
    return null;
  }

  const now = new Date();
  const currentHour = now.getHours();

  // Determine current time of day
  let currentTimeOfDay: 'morning' | 'afternoon' | 'evening';
  if (currentHour >= 5 && currentHour < 12) {
    currentTimeOfDay = 'morning';
  } else if (currentHour >= 12 && currentHour < 17) {
    currentTimeOfDay = 'afternoon';
  } else {
    currentTimeOfDay = 'evening';
  }

  // Check if it's the user's preferred learning time
  const isPreferredTime = preferredLearningTime === currentTimeOfDay;

  // Build message based on context
  let message: CoachMessage;

  if (isPreferredTime && dueReviewCount > 0) {
    message = {
      title: 'Perfect Time to Review!',
      body: `You have ${dueReviewCount} review${dueReviewCount > 1 ? 's' : ''} due, and it's your favorite learning time. Quick reviews now will help lock in your knowledge.`,
      action: 'start_review',
      actionLabel: 'Start Reviews',
    };
  } else if (dueReviewCount >= 5) {
    message = {
      title: 'Reviews Building Up',
      body: `You have ${dueReviewCount} reviews waiting. A few minutes now prevents them from piling up!`,
      action: 'start_review',
      actionLabel: 'Review Now',
    };
  } else {
    // Lower priority for small review counts at non-optimal times
    return null;
  }

  return {
    type: 'review_optimal_time',
    priority: isPreferredTime ? 'high' : 'medium',
    message,
    context: {
      userId,
      currentTimeOfDay,
      preferredLearningTime,
      dueReviewCount,
      isPreferredTime,
      lastReviewDate,
    },
  };
}

// ============================================
// DAILY CHECK-IN
// ============================================

/**
 * Get daily check-in message based on streak and progress
 */
export function getDailyCheckIn(
  currentStreak: number,
  todayProgress: { minutesStudied: number; lessonsCompleted: number }
): TimingTrigger {
  const { minutesStudied, lessonsCompleted } = todayProgress;

  let message: CoachMessage;
  let priority: TimingPriority = 'medium';

  // User hasn't started today
  if (minutesStudied === 0 && lessonsCompleted === 0) {
    if (currentStreak >= 7) {
      message = {
        title: `${currentStreak} Day Streak!`,
        body: 'You\'re on fire! Keep your streak alive with a quick session today.',
        action: 'start_learning',
        actionLabel: 'Start Learning',
      };
      priority = 'high';
    } else if (currentStreak > 0) {
      message = {
        title: 'Welcome Back!',
        body: `Day ${currentStreak + 1} awaits! Let's keep the momentum going.`,
        action: 'start_learning',
        actionLabel: 'Continue Streak',
      };
    } else {
      message = {
        title: 'Ready to Learn?',
        body: 'Start your learning journey today and build a streak!',
        action: 'start_learning',
        actionLabel: 'Start Now',
      };
    }
  }
  // User has made some progress
  else if (lessonsCompleted > 0) {
    message = {
      title: 'Great Progress Today!',
      body: `You've completed ${lessonsCompleted} lesson${lessonsCompleted > 1 ? 's' : ''} and studied for ${minutesStudied} minutes. Keep it up!`,
      action: 'continue_learning',
      actionLabel: 'Keep Going',
    };
  }
  // User started but hasn't completed a lesson
  else {
    message = {
      title: 'Almost There!',
      body: `You've studied for ${minutesStudied} minutes. Finish a lesson to mark today complete!`,
      action: 'continue_learning',
      actionLabel: 'Continue',
    };
  }

  return {
    type: 'daily_check_in',
    priority,
    message,
    context: {
      currentStreak,
      todayProgress,
    },
  };
}

// ============================================
// SESSION RECAP
// ============================================

/**
 * Generate a session recap trigger
 */
export function getSessionRecap(
  sessionStats: {
    itemsCompleted: number;
    totalItems: number;
    minutesSpent: number;
    skillsImproved: string[];
    xpEarned: number;
  }
): TimingTrigger {
  const { itemsCompleted, totalItems, minutesSpent, skillsImproved, xpEarned } = sessionStats;

  const completionPercent = Math.round((itemsCompleted / totalItems) * 100);

  let body = `You completed ${itemsCompleted} of ${totalItems} items in ${minutesSpent} minutes.`;

  if (skillsImproved.length > 0) {
    const skillNames = skillsImproved.slice(0, 2).map(id => getSkillName(id)).join(' and ');
    body += ` You improved on ${skillNames}.`;
  }

  if (xpEarned > 0) {
    body += ` +${xpEarned} XP earned!`;
  }

  return {
    type: 'session_recap',
    priority: completionPercent >= 100 ? 'high' : 'medium',
    message: {
      title: completionPercent >= 100 ? 'Session Complete!' : 'Session Summary',
      body,
      action: 'view_progress',
      actionLabel: 'View Progress',
    },
    context: {
      sessionStats,
      completionPercent,
    },
  };
}

// ============================================
// TIMING PREFERENCES
// ============================================

export interface TimingPreferences {
  showMilestones: boolean;
  showTransitions: boolean;
  showDifficultyPrep: boolean;
  showReviewReminders: boolean;
  showDailyCheckIn: boolean;
}

export const DEFAULT_TIMING_PREFERENCES: TimingPreferences = {
  showMilestones: true,
  showTransitions: true,
  showDifficultyPrep: true,
  showReviewReminders: true,
  showDailyCheckIn: true,
};

/**
 * Filter triggers based on user preferences
 */
export function filterByPreferences(
  trigger: TimingTrigger | null,
  preferences: TimingPreferences
): TimingTrigger | null {
  if (!trigger) return null;

  switch (trigger.type) {
    case 'mastery_milestone':
      return preferences.showMilestones ? trigger : null;
    case 'session_transition':
    case 'session_recap':
      return preferences.showTransitions ? trigger : null;
    case 'difficult_content_prep':
      return preferences.showDifficultyPrep ? trigger : null;
    case 'review_optimal_time':
      return preferences.showReviewReminders ? trigger : null;
    case 'daily_check_in':
      return preferences.showDailyCheckIn ? trigger : null;
    default:
      return trigger;
  }
}
