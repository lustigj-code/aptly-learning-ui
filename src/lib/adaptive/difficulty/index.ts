/**
 * Difficulty Selection Module - Public API
 *
 * Exports adaptive difficulty selection functionality for the learning platform.
 */

export {
  // Core functions
  getOptimalDifficulty,
  selectItemsByDifficulty,
  adjustDifficultyFromPerformance,

  // UI helpers
  getDifficultyLabel,
  getAllDifficultyLevels,
  normalizeDifficulty,

  // Internal exports for advanced usage
  calculateOptimalFromMastery,
  DIFFICULTY_THRESHOLDS,

  // Configuration
  DEFAULT_DIFFICULTY_CONFIG,

  // Types
  type DifficultyConfig,
  type ItemDifficulty,
  type DifficultySelection,
  type DifficultyLabel,
} from './difficultySelector';
