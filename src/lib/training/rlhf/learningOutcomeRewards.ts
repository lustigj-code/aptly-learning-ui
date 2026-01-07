/**
 * Learning Outcome Reward Signals
 *
 * This module computes reward signals based on actual learning outcomes
 * from the Aptly platform. These rewards are used to train the RLHF model
 * to optimize for real educational impact.
 *
 * Reward sources:
 * 1. Mastery progression (from knowledge graph)
 * 2. FSRS retention data (from spaced repetition)
 * 3. Quiz/assessment scores
 * 4. Session engagement metrics
 * 5. Long-term retention signals
 */

import type { FSRSState, ConceptMastery } from '@/lib/mastery';
import type { ReviewRating } from '@/lib/mastery/fsrs';
import type { TutoringSession } from '../schema';

// Re-export compatible types for reward computation
export type MasteryLevel = 'not_started' | 'struggling' | 'learning' | 'proficient' | 'mastered';
export type FSRSCard = FSRSState;
export type Rating = ReviewRating;

// ============================================
// REWARD SIGNAL TYPES
// ============================================

export type LearningOutcomeReward = {
  // Overall reward score (0-1)
  totalReward: number;

  // Component scores
  components: {
    masteryProgression: number;    // Did mastery level improve?
    retentionImprovement: number;  // Did FSRS metrics improve?
    problemSolvingSuccess: number; // Did student solve the problem?
    engagementQuality: number;     // Was the session engaging?
    understandingGain: number;     // Did understanding increase?
    effortScore: number;           // Did student put in effort?
  };

  // Metadata
  confidence: number;  // How confident are we in this reward (0-1)
  signals: string[];   // Which signals were available
};

export type OutcomeSignalConfig = {
  // Weights for each component
  weights: {
    masteryProgression: number;
    retentionImprovement: number;
    problemSolvingSuccess: number;
    engagementQuality: number;
    understandingGain: number;
    effortScore: number;
  };

  // Thresholds
  minSessionLength: number;      // Min turns for valid session
  minEngagementTime: number;     // Min seconds per turn
  significantImprovement: number; // % improvement to count as gain
};

export const DEFAULT_OUTCOME_CONFIG: OutcomeSignalConfig = {
  weights: {
    masteryProgression: 0.25,
    retentionImprovement: 0.15,
    problemSolvingSuccess: 0.20,
    engagementQuality: 0.15,
    understandingGain: 0.15,
    effortScore: 0.10,
  },
  minSessionLength: 3,
  minEngagementTime: 10,
  significantImprovement: 0.1,
};

// ============================================
// MASTERY PROGRESSION REWARD
// ============================================

const MASTERY_LEVELS: MasteryLevel[] = [
  'not_started',
  'struggling',
  'learning',
  'proficient',
  'mastered',
];

export function computeMasteryProgressionReward(
  preMastery: MasteryLevel | undefined,
  postMastery: MasteryLevel | undefined,
): number {
  if (!preMastery || !postMastery) {
    return 0.5; // Neutral if no data
  }

  const preIndex = MASTERY_LEVELS.indexOf(preMastery);
  const postIndex = MASTERY_LEVELS.indexOf(postMastery);

  if (preIndex === -1 || postIndex === -1) {
    return 0.5;
  }

  // Improvement: positive reward
  // Regression: negative reward
  // Maintenance at high level: small positive
  const levelChange = postIndex - preIndex;

  if (levelChange > 0) {
    // Improvement - reward based on how much
    return 0.5 + (levelChange * 0.15);
  } else if (levelChange < 0) {
    // Regression - penalty
    return 0.5 + (levelChange * 0.2);
  } else {
    // Maintained level
    // Higher level = better reward for maintenance
    return 0.4 + (postIndex * 0.1);
  }
}

// ============================================
// FSRS RETENTION REWARD
// ============================================

export function computeRetentionReward(
  preCard: FSRSCard | undefined,
  postCard: FSRSCard | undefined,
  rating: Rating | undefined,
): number {
  // No FSRS data available
  if (!preCard && !postCard) {
    return 0.5;
  }

  let reward = 0.5;

  // Rating-based reward
  if (rating !== undefined) {
    switch (rating) {
      case 1: // Again - forgot
        reward = 0.2;
        break;
      case 2: // Hard - struggled
        reward = 0.4;
        break;
      case 3: // Good - remembered
        reward = 0.7;
        break;
      case 4: // Easy - mastered
        reward = 0.9;
        break;
    }
  }

  // Stability improvement
  if (preCard && postCard) {
    const stabilityChange = postCard.stability - preCard.stability;
    if (stabilityChange > 0) {
      reward = Math.min(1, reward + 0.1);
    }

    // Difficulty decrease (getting easier)
    const difficultyChange = postCard.difficulty - preCard.difficulty;
    if (difficultyChange < 0) {
      reward = Math.min(1, reward + 0.05);
    }
  }

  return reward;
}

// ============================================
// PROBLEM SOLVING REWARD
// ============================================

export function computeProblemSolvingReward(
  session: TutoringSession,
): number {
  const outcomes = session.outcomes;

  if (!outcomes) {
    return 0.5;
  }

  let reward = 0.3; // Base reward for trying

  // Primary goal achieved
  if (outcomes.completedAtom) {
    reward += 0.3;
  }

  // Demonstrated understanding
  if (outcomes.demonstratedUnderstanding) {
    reward += 0.3;
  }

  // Score improvement
  if (outcomes.scoreImprovement && outcomes.scoreImprovement > 0) {
    reward += Math.min(0.2, outcomes.scoreImprovement / 100);
  }

  // Didn't need multiple attempts (learned efficiently)
  if (!outcomes.neededMultipleAttempts) {
    reward = Math.min(1, reward + 0.1);
  }

  return Math.min(1, reward);
}

// ============================================
// ENGAGEMENT QUALITY REWARD
// ============================================

export function computeEngagementReward(
  session: TutoringSession,
  config: OutcomeSignalConfig = DEFAULT_OUTCOME_CONFIG,
): number {
  const turns = session.turns;

  if (turns.length < config.minSessionLength) {
    return 0.3; // Too short to evaluate
  }

  let reward = 0.5;

  // Student response lengths (shows thinking)
  const studentTurns = turns.filter(t => t.role === 'user');
  const avgStudentLength = studentTurns.reduce(
    (sum, t) => sum + t.content.length, 0
  ) / studentTurns.length;

  if (avgStudentLength > 100) {
    reward += 0.1; // Substantive responses
  } else if (avgStudentLength < 20) {
    reward -= 0.1; // Very short responses
  }

  // Questions asked by student (shows engagement)
  const studentQuestions = studentTurns.filter(
    t => t.content.includes('?')
  ).length;

  if (studentQuestions > 0) {
    reward += 0.1;
  }

  // Conversation continuation (didn't abandon)
  if (session.outcomes?.continuedLearning) {
    reward += 0.1;
  }

  // Time on task (from metadata)
  const totalTime = turns.reduce(
    (sum, t) => sum + (t.metadata?.responseTimeMs || 0), 0
  );
  const avgTimePerTurn = totalTime / turns.length / 1000; // Convert ms to seconds

  if (avgTimePerTurn >= config.minEngagementTime) {
    reward += 0.1; // Took time to think
  }

  return Math.max(0, Math.min(1, reward));
}

// ============================================
// UNDERSTANDING GAIN REWARD
// ============================================

export function computeUnderstandingReward(
  preUnderstanding: number | undefined,
  postUnderstanding: number | undefined,
  session: TutoringSession,
): number {
  // Use explicit understanding scores if available
  if (preUnderstanding !== undefined && postUnderstanding !== undefined) {
    const improvement = postUnderstanding - preUnderstanding;

    if (improvement > 0.2) {
      return 0.9; // Significant improvement
    } else if (improvement > 0) {
      return 0.7; // Some improvement
    } else if (improvement === 0) {
      return 0.5; // No change
    } else {
      return 0.3; // Regression (concerning)
    }
  }

  // Infer from session signals
  let inferredGain = 0.5;

  // Look for "aha" moments
  const studentTurns = session.turns.filter(t => t.role === 'user');
  const ahaIndicators = [
    'i get it', 'oh i see', 'makes sense', 'i understand',
    'that helps', 'now i see', 'aha', 'ohh', 'got it',
  ];

  for (const turn of studentTurns) {
    const lower = turn.content.toLowerCase();
    if (ahaIndicators.some(ind => lower.includes(ind))) {
      inferredGain += 0.1;
    }
  }

  // Look for confusion indicators
  const confusionIndicators = [
    "i don't understand", "confused", "lost", "what do you mean",
    "still don't get", "this is hard", "i give up",
  ];

  const lastFewTurns = studentTurns.slice(-3);
  for (const turn of lastFewTurns) {
    const lower = turn.content.toLowerCase();
    if (confusionIndicators.some(ind => lower.includes(ind))) {
      inferredGain -= 0.1;
    }
  }

  return Math.max(0, Math.min(1, inferredGain));
}

// ============================================
// EFFORT SCORE REWARD
// ============================================

export function computeEffortReward(session: TutoringSession): number {
  const studentTurns = session.turns.filter(t => t.role === 'user');

  if (studentTurns.length === 0) {
    return 0;
  }

  let effortScore = 0.5;

  // Attempted to solve (didn't just ask for answer)
  const attemptIndicators = [
    'i tried', 'my answer', 'i got', 'i think',
    'let me try', "here's what i did", 'so if',
  ];

  let attempts = 0;
  for (const turn of studentTurns) {
    const lower = turn.content.toLowerCase();
    if (attemptIndicators.some(ind => lower.includes(ind))) {
      attempts++;
    }
  }

  if (attempts > 0) {
    effortScore += 0.2;
  }

  // Showed work
  const workIndicators = [
    '=', '+', '-', '*', '/', 'step', 'first', 'then',
    'because', 'since', 'so that', 'therefore',
  ];

  let showedWork = false;
  for (const turn of studentTurns) {
    if (workIndicators.some(ind => turn.content.includes(ind))) {
      showedWork = true;
      break;
    }
  }

  if (showedWork) {
    effortScore += 0.1;
  }

  // Multiple attempts (persistence)
  if (studentTurns.length >= 5) {
    effortScore += 0.1;
  }

  // Asked clarifying questions
  const clarifyingQuestions = studentTurns.filter(
    t => t.content.includes('?') &&
    !t.content.toLowerCase().includes('what is the answer')
  ).length;

  if (clarifyingQuestions > 0) {
    effortScore += 0.1;
  }

  return Math.max(0, Math.min(1, effortScore));
}

// ============================================
// COMPOSITE LEARNING OUTCOME REWARD
// ============================================

export function computeLearningOutcomeReward(
  session: TutoringSession,
  context: {
    preMastery?: MasteryLevel;
    postMastery?: MasteryLevel;
    preFSRS?: FSRSCard;
    postFSRS?: FSRSCard;
    fsrsRating?: Rating;
    preUnderstanding?: number;
    postUnderstanding?: number;
  } = {},
  config: OutcomeSignalConfig = DEFAULT_OUTCOME_CONFIG,
): LearningOutcomeReward {
  const signals: string[] = [];

  // Compute each component
  const masteryReward = computeMasteryProgressionReward(
    context.preMastery,
    context.postMastery,
  );
  if (context.preMastery || context.postMastery) {
    signals.push('mastery');
  }

  const retentionReward = computeRetentionReward(
    context.preFSRS,
    context.postFSRS,
    context.fsrsRating,
  );
  if (context.preFSRS || context.postFSRS || context.fsrsRating) {
    signals.push('retention');
  }

  const problemReward = computeProblemSolvingReward(session);
  if (session.outcomes?.completedAtom !== undefined) {
    signals.push('problem_solving');
  }

  const engagementReward = computeEngagementReward(session, config);
  signals.push('engagement'); // Always available

  const understandingReward = computeUnderstandingReward(
    context.preUnderstanding,
    context.postUnderstanding,
    session,
  );
  if (context.preUnderstanding !== undefined) {
    signals.push('understanding');
  }

  const effortReward = computeEffortReward(session);
  signals.push('effort'); // Always available

  // Compute weighted sum
  const { weights } = config;
  const totalReward = (
    masteryReward * weights.masteryProgression +
    retentionReward * weights.retentionImprovement +
    problemReward * weights.problemSolvingSuccess +
    engagementReward * weights.engagementQuality +
    understandingReward * weights.understandingGain +
    effortReward * weights.effortScore
  );

  // Confidence based on available signals
  const possibleSignals = 6;
  const confidence = signals.length / possibleSignals;

  return {
    totalReward,
    components: {
      masteryProgression: masteryReward,
      retentionImprovement: retentionReward,
      problemSolvingSuccess: problemReward,
      engagementQuality: engagementReward,
      understandingGain: understandingReward,
      effortScore: effortReward,
    },
    confidence,
    signals,
  };
}

// ============================================
// BATCH REWARD COMPUTATION
// ============================================

export type RewardBatchInput = {
  session: TutoringSession;
  context?: {
    preMastery?: MasteryLevel;
    postMastery?: MasteryLevel;
    preFSRS?: FSRSCard;
    postFSRS?: FSRSCard;
    fsrsRating?: Rating;
    preUnderstanding?: number;
    postUnderstanding?: number;
  };
};

export function computeBatchRewards(
  inputs: RewardBatchInput[],
  config: OutcomeSignalConfig = DEFAULT_OUTCOME_CONFIG,
): LearningOutcomeReward[] {
  return inputs.map(input =>
    computeLearningOutcomeReward(input.session, input.context || {}, config)
  );
}

// ============================================
// REWARD AGGREGATION FOR TRAINING
// ============================================

export function aggregateSessionRewards(
  session: TutoringSession,
  outcomeReward: LearningOutcomeReward,
): number[] {
  /**
   * Returns per-turn rewards for training.
   *
   * Most of the reward comes at the end (outcome),
   * but we also give small intermediate rewards for good behavior.
   */
  const numTurns = session.turns.filter(t => t.role === 'tutor').length;

  if (numTurns === 0) {
    return [];
  }

  // Distribute 30% of reward throughout, 70% at end
  const distributeRatio = 0.3;
  const finalRatio = 0.7;

  const perTurnReward = (outcomeReward.totalReward * distributeRatio) / numTurns;
  const finalReward = outcomeReward.totalReward * finalRatio;

  const rewards: number[] = [];

  session.turns.forEach((turn, i) => {
    if (turn.role === 'tutor') {
      const isLast = i === session.turns.length - 1;

      if (isLast) {
        rewards.push(perTurnReward + finalReward);
      } else {
        // Intermediate reward based on turn quality
        let intermediate = perTurnReward;

        // Bonus for Socratic behavior in this turn
        const content = turn.content.toLowerCase();
        if (content.includes('?')) intermediate += 0.02;
        if (content.includes('what do you think')) intermediate += 0.01;
        if (content.includes('great') || content.includes('good')) intermediate += 0.01;

        rewards.push(intermediate);
      }
    }
  });

  return rewards;
}

// ============================================
// EXPORT FOR TRAINING
// ============================================

export type RewardTrainingExample = {
  sessionId: string;
  turns: Array<{
    role: 'user' | 'tutor';
    content: string;
    reward?: number;
  }>;
  outcomeReward: LearningOutcomeReward;
};

export function prepareRewardTrainingData(
  sessions: TutoringSession[],
  contexts: Map<string, RewardBatchInput['context']> = new Map(),
): RewardTrainingExample[] {
  return sessions.map(session => {
    const context = contexts.get(session.id) || {};
    const outcomeReward = computeLearningOutcomeReward(session, context);
    const perTurnRewards = aggregateSessionRewards(session, outcomeReward);

    let rewardIndex = 0;
    const turns = session.turns.map(turn => ({
      role: turn.role,
      content: turn.content,
      reward: turn.role === 'tutor' ? perTurnRewards[rewardIndex++] : undefined,
    }));

    return {
      sessionId: session.id,
      turns,
      outcomeReward,
    };
  });
}
