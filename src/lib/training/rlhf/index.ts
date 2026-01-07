/**
 * RLHF Module Exports
 *
 * Reinforcement Learning from Human Feedback for Sage Tutor.
 *
 * Components:
 * 1. Reward Model (Python) - Trained to predict educational quality
 * 2. PPO Trainer (Python) - Aligns model with rewards
 * 3. Learning Outcome Rewards (TypeScript) - Computes rewards from platform data
 */

// Learning outcome reward signals
export {
  type LearningOutcomeReward,
  type OutcomeSignalConfig,
  type RewardBatchInput,
  type RewardTrainingExample,
  DEFAULT_OUTCOME_CONFIG,
  computeMasteryProgressionReward,
  computeRetentionReward,
  computeProblemSolvingReward,
  computeEngagementReward,
  computeUnderstandingReward,
  computeEffortReward,
  computeLearningOutcomeReward,
  computeBatchRewards,
  aggregateSessionRewards,
  prepareRewardTrainingData,
} from './learningOutcomeRewards';

/**
 * RLHF Pipeline Overview
 *
 * The RLHF pipeline consists of three stages:
 *
 * ## Stage 1: Data Collection
 * Collect tutoring sessions with outcome labels from the platform.
 * Use the training module to log conversations and export data.
 *
 * ## Stage 2: Reward Model Training
 * Train a reward model on preference pairs (better vs worse responses).
 *
 * ```bash
 * python rewardModel.py \
 *   --train-data ./data/preferences.jsonl \
 *   --output-dir ./reward_model \
 *   --epochs 3
 * ```
 *
 * ## Stage 3: PPO Training
 * Fine-tune the SFT model using PPO with the reward model.
 *
 * ```bash
 * python ppo_trainer.py \
 *   --sft-model ./outputs/merged \
 *   --reward-model ./reward_model/checkpoint-final \
 *   --prompts ./data/prompts.jsonl \
 *   --max-steps 10000
 * ```
 *
 * ## Reward Signal Integration
 *
 * The reward combines:
 * 1. Learned reward (from reward model)
 * 2. Rule-based Socratic checks
 * 3. Learning outcome signals (from platform)
 *
 * ```typescript
 * import { computeLearningOutcomeReward } from './rlhf';
 *
 * const reward = computeLearningOutcomeReward(session, {
 *   preMastery: 'learning',
 *   postMastery: 'proficient',
 *   fsrsRating: 3,
 * });
 *
 * console.log(reward.totalReward); // 0.78
 * console.log(reward.components);  // { masteryProgression: 0.65, ... }
 * ```
 */

// Re-export types for convenience
export type { TutoringSession, LearningOutcome } from '../schema';
