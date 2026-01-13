/**
 * ML Training Data Pipeline - Public API
 *
 * This module provides tools for:
 * - Loading external learning datasets (EdNet, ASSISTments)
 * - Transforming data to FSRS and BKT training formats
 * - Estimating optimal model parameters using MLE
 *
 * Usage:
 * ```typescript
 * import {
 *   loadEdNetData,
 *   transformToBKTFormat,
 *   estimateBKTParameters,
 * } from '@/lib/ml/training';
 *
 * // Load and transform data
 * const interactions = await loadEdNetData('./data/ednet.csv');
 * const bktData = transformToBKTFormat(interactions);
 *
 * // Estimate optimal parameters
 * const result = estimateBKTParameters(bktData);
 * console.log('Optimal BKT params:', result.parameters);
 * console.log('AUC:', result.metrics.auc);
 * ```
 */

// ============================================================================
// DATA LOADING
// ============================================================================

export {
  // Main loaders
  loadEdNetData,
  loadASSISTmentsData,
  loadJSONData,
  loadData,

  // Validation
  validateDataset,

  // Utilities
  detectFileFormat,
  sampleByUser,
} from './ednetLoader';

export type {
  // Core types
  EdNetInteraction,
  ValidationResult,
  ValidationError,
  DatasetStats,
  LoadOptions,
  FieldMapping,
} from './ednetLoader';

// ============================================================================
// DATA TRANSFORMATION
// ============================================================================

export {
  // FSRS transformation
  transformToFSRSFormat,

  // BKT transformation
  transformToBKTFormat,

  // Hybrid model transformation
  transformToTrainingSequences,

  // Train/test splitting
  splitTrainTest,

  // Feature derivation
  calculateDerivedFeatures,

  // Cold-start handling
  filterColdStart,
} from './dataTransformer';

export type {
  // Training data formats
  FSRSTrainingData,
  BKTTrainingData,

  // Skill mapping
  SkillMapping,

  // Options
  TransformOptions,
} from './dataTransformer';

// ============================================================================
// PARAMETER ESTIMATION
// ============================================================================

export {
  // FSRS estimation
  estimateFSRSParameters,
  evaluateFSRSParameters,

  // BKT estimation
  estimateBKTParameters,
  evaluateBKTParameters,

  // Generic evaluation
  evaluateParameterFit,
} from './parameterEstimator';

export type {
  // Results
  FSRSEstimationResult,
  BKTEstimationResult,

  // Metrics
  EvaluationMetrics,

  // Configuration
  GridSearchConfig,
} from './parameterEstimator';
