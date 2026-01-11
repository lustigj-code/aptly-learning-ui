/**
 * Experiments Module
 * Central export for A/B testing functionality
 */

export {
  // Experiment Management
  createExperiment,
  getExperiment,
  getExperiments,
  updateExperimentStatus,
  startExperiment,
  pauseExperiment,
  completeExperiment,
  initializeExperiments,
  // Variant Assignment
  assignVariant,
  getUserExperiments,
  getUserVariant,
  isFeatureEnabled,
  getUserExperimentConfig,
  // Results
  calculateResults,
  // Constants
  INITIAL_EXPERIMENTS,
  // Types
  type Experiment,
  type ExperimentConfig,
  type ExperimentResults,
  type UserExperimentAssignment,
} from './abTest';
