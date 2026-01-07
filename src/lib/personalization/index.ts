/**
 * Personalization System Exports
 */

// Learning Style Adaptation
export {
  type LearningStyle,
  type ContentFormat,
  type UserPreferences,
  type FormatEffectiveness,
  type AdaptationProfile,
  type ContentRecommendation,
  detectLearningStyle,
  getRecommendedFormat,
  getSessionRecommendation,
  updateFormatEffectiveness,
  createInitialProfile,
} from './learningStyleAdapter';

// Goal-Based Personalization
export {
  type UserGoal,
  type GoalProfile,
  type PersonalizedExperience,
  type ContentPriority,
  type DashboardConfig,
  type CoachPersonality,
  type Milestone,
  generatePersonalizedExperience,
  getMotivationalMessage,
  getCoachInstructions,
} from './goalPersonalization';

// Adaptive Difficulty
export {
  type DifficultyLevel,
  type PerformanceWindow,
  type DifficultyState,
  type AdjustmentEvent,
  type DifficultyAdjustment,
  calculateDifficultyAdjustment,
  applyDifficultyAdjustment,
  recordPerformance,
  createInitialDifficultyState,
  selectContentForDifficulty,
  getDifficultyDescription,
} from './adaptiveDifficulty';
