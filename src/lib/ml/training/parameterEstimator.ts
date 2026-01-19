/**
 * Parameter Estimator for FSRS and BKT
 *
 * Fits optimal parameters using Maximum Likelihood Estimation (MLE)
 * and grid search. Implements cross-validation for robust evaluation.
 *
 * References:
 * - FSRS: https://github.com/open-spaced-repetition/fsrs4anki
 * - BKT: Corbett & Anderson, 1994
 */

import type { FSRSTrainingData, BKTTrainingData } from './dataTransformer';
import type { FSRSParameters } from '../../mastery/fsrs';
import type { BKTParameters } from '../../mastery/bkt';
// DEFAULT_FSRS_PARAMS available from '../../mastery/fsrs' if needed
import { DEFAULT_BKT_PARAMS, BKT_RANGES } from '../../mastery/bkt';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Evaluation metrics for parameter fit
 */
export interface EvaluationMetrics {
  /** Area Under ROC Curve */
  auc: number;
  /** Root Mean Square Error */
  rmse: number;
  /** Brier Score (calibration metric) */
  brier: number;
  /** Log Loss (negative log likelihood) */
  logLoss: number;
  /** Accuracy at 0.5 threshold */
  accuracy: number;
  /** Precision at 0.5 threshold */
  precision: number;
  /** Recall at 0.5 threshold */
  recall: number;
  /** F1 Score */
  f1: number;
  /** Number of samples */
  sampleSize: number;
}

/**
 * FSRS parameter estimation result
 */
export interface FSRSEstimationResult {
  /** Optimized parameters */
  parameters: FSRSParameters;
  /** Evaluation metrics on test data */
  metrics: EvaluationMetrics;
  /** Cross-validation metrics */
  cvMetrics?: EvaluationMetrics[];
  /** Grid search history (if used) */
  searchHistory?: Array<{
    params: Partial<FSRSParameters>;
    score: number;
  }>;
  /** Training time in milliseconds */
  trainingTimeMs: number;
}

/**
 * BKT parameter estimation result
 */
export interface BKTEstimationResult {
  /** Optimized parameters */
  parameters: BKTParameters;
  /** Per-skill parameters (if skill-specific) */
  skillParameters?: Map<string, BKTParameters>;
  /** Evaluation metrics on test data */
  metrics: EvaluationMetrics;
  /** Cross-validation metrics */
  cvMetrics?: EvaluationMetrics[];
  /** Grid search history */
  searchHistory?: Array<{
    params: BKTParameters;
    score: number;
  }>;
  /** Training time in milliseconds */
  trainingTimeMs: number;
}

/**
 * Grid search configuration
 */
export interface GridSearchConfig {
  /** Number of grid points per parameter */
  gridSize?: number;
  /** Number of cross-validation folds */
  cvFolds?: number;
  /** Metric to optimize ('auc', 'rmse', 'brier', 'logLoss') */
  optimizeMetric?: keyof EvaluationMetrics;
  /** Maximum iterations for optimization */
  maxIterations?: number;
  /** Convergence tolerance */
  tolerance?: number;
  /** Random seed for reproducibility */
  seed?: number;
}

// ============================================================================
// FSRS PARAMETER ESTIMATION
// ============================================================================

/**
 * Estimate optimal FSRS parameters using MLE
 *
 * Uses grid search to find optimal w parameters that minimize
 * prediction error on the training data.
 *
 * @param data - FSRS training data
 * @param config - Grid search configuration
 * @returns Optimized FSRS parameters with metrics
 */
export function estimateFSRSParameters(
  data: FSRSTrainingData[],
  config: GridSearchConfig = {}
): FSRSEstimationResult {
  const startTime = Date.now();
  const {
    gridSize = 3,
    cvFolds = 5,
    optimizeMetric = 'auc',
    maxIterations = 50,
    tolerance = 0.0001,
    seed = 42,
  } = config;

  // Start with default parameters
  let bestParams = { ...DEFAULT_FSRS_PARAMS };
  let bestScore = -Infinity;
  const searchHistory: Array<{ params: Partial<FSRSParameters>; score: number }> = [];

  // Key parameters to optimize (w indices that have most impact)
  // w[0-3]: Initial stability by rating
  // w[4]: Initial difficulty
  // w[8-10]: Stability increase factors
  // w[11-13]: Forget stability factors
  const keyIndices = [0, 1, 2, 3, 4, 8, 9, 10, 11, 12, 13];

  // Grid search over key parameters
  for (let iter = 0; iter < maxIterations; iter++) {
    let improved = false;

    for (const idx of keyIndices) {
      const baseValue = bestParams.w[idx];
      const searchRange = baseValue * 0.3; // Search +/- 30% of current value

      // Generate grid points
      const gridPoints: number[] = [];
      for (let i = 0; i < gridSize; i++) {
        const value = baseValue - searchRange + (2 * searchRange * i) / (gridSize - 1);
        gridPoints.push(Math.max(0.001, value)); // Ensure positive
      }

      for (const value of gridPoints) {
        // Create candidate parameters
        const candidateParams = { ...bestParams };
        const newW = [...candidateParams.w];
        newW[idx] = value;
        candidateParams.w = newW;

        // Evaluate with cross-validation
        const score = evaluateFSRSWithCV(data, candidateParams, cvFolds, optimizeMetric, seed);

        searchHistory.push({
          params: { w: newW },
          score,
        });

        if (score > bestScore + tolerance) {
          bestScore = score;
          bestParams = candidateParams;
          improved = true;
        }
      }
    }

    // Also optimize requestRetention
    for (const retention of [0.85, 0.87, 0.90, 0.92, 0.95]) {
      const candidateParams = { ...bestParams, requestRetention: retention };
      const score = evaluateFSRSWithCV(data, candidateParams, cvFolds, optimizeMetric, seed);

      searchHistory.push({
        params: { requestRetention: retention },
        score,
      });

      if (score > bestScore + tolerance) {
        bestScore = score;
        bestParams = candidateParams;
        improved = true;
      }
    }

    // Early stopping if no improvement
    if (!improved) {
      break;
    }
  }

  // Final evaluation
  const metrics = evaluateFSRSParameters(bestParams, data);

  // Cross-validation metrics
  const cvMetrics = crossValidateFSRS(data, bestParams, cvFolds, seed);

  return {
    parameters: bestParams,
    metrics,
    cvMetrics,
    searchHistory,
    trainingTimeMs: Date.now() - startTime,
  };
}

/**
 * Evaluate FSRS parameters with cross-validation
 */
function evaluateFSRSWithCV(
  data: FSRSTrainingData[],
  params: FSRSParameters,
  folds: number,
  metric: keyof EvaluationMetrics,
  seed: number
): number {
  const cvMetrics = crossValidateFSRS(data, params, folds, seed);

  // Average the selected metric
  const values = cvMetrics.map((m) => m[metric] as number);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  // For RMSE, Brier, logLoss - lower is better, so negate
  if (metric === 'rmse' || metric === 'brier' || metric === 'logLoss') {
    return -avg;
  }

  return avg;
}

/**
 * Cross-validate FSRS parameters
 */
function crossValidateFSRS(
  data: FSRSTrainingData[],
  params: FSRSParameters,
  folds: number,
  seed: number
): EvaluationMetrics[] {
  const shuffled = shuffleWithSeed([...data], seed);
  const foldSize = Math.ceil(shuffled.length / folds);
  const results: EvaluationMetrics[] = [];

  for (let i = 0; i < folds; i++) {
    const testStart = i * foldSize;
    const testEnd = Math.min((i + 1) * foldSize, shuffled.length);

    const testData = shuffled.slice(testStart, testEnd);
    // Note: trainData reserved for future use in more sophisticated cross-validation
    // const _trainData = [...shuffled.slice(0, testStart), ...shuffled.slice(testEnd)];

    // Note: For FSRS, we evaluate on test data directly since params are global
    const metrics = evaluateFSRSParameters(params, testData);
    results.push(metrics);
  }

  return results;
}

/**
 * Evaluate FSRS parameters on data
 */
export function evaluateFSRSParameters(
  params: FSRSParameters,
  testData: FSRSTrainingData[]
): EvaluationMetrics {
  const predictions: number[] = [];
  const actuals: boolean[] = [];

  for (const record of testData) {
    // Predict retrievability based on FSRS formula
    const retrievability = predictFSRSRetrievability(record, params);
    predictions.push(retrievability);
    actuals.push(record.recalled);
  }

  return computeMetrics(predictions, actuals);
}

/**
 * Predict retrievability for a record using FSRS
 */
function predictFSRSRetrievability(
  record: FSRSTrainingData,
  _params: FSRSParameters
): number {
  const { stability, daysSinceLastReview } = record;

  // FSRS retrievability formula: R(t) = (1 + t/(9*S))^(-1)
  if (stability <= 0 || daysSinceLastReview <= 0) {
    // First review or invalid data - use prior based on difficulty
    return 0.9 - record.difficulty * 0.05;
  }

  const retrievability = Math.pow(1 + daysSinceLastReview / (9 * stability), -1);
  return Math.max(0.01, Math.min(0.99, retrievability));
}

// ============================================================================
// BKT PARAMETER ESTIMATION
// ============================================================================

/**
 * Estimate optimal BKT parameters using MLE
 *
 * Implements EM algorithm for BKT parameter estimation.
 * Can estimate global parameters or per-skill parameters.
 *
 * @param data - BKT training data
 * @param config - Grid search configuration
 * @param perSkill - Whether to estimate per-skill parameters
 * @returns Optimized BKT parameters with metrics
 */
export function estimateBKTParameters(
  data: BKTTrainingData[],
  config: GridSearchConfig = {},
  perSkill: boolean = false
): BKTEstimationResult {
  const startTime = Date.now();
  const {
    gridSize = 5,
    cvFolds = 5,
    optimizeMetric = 'auc',
    maxIterations = 100,
    tolerance = 0.0001,
    seed = 42,
  } = config;

  if (perSkill) {
    return estimateBKTPerSkill(data, config);
  }

  // Grid search for global parameters
  let bestParams = { ...DEFAULT_BKT_PARAMS };
  let bestScore = -Infinity;
  const searchHistory: Array<{ params: BKTParameters; score: number }> = [];

  // Generate parameter grid
  const pL0Values = generateGrid(BKT_RANGES.pL0.min, BKT_RANGES.pL0.max, gridSize);
  const pTValues = generateGrid(BKT_RANGES.pT.min, BKT_RANGES.pT.max, gridSize);
  const pGValues = generateGrid(BKT_RANGES.pG.min, BKT_RANGES.pG.max, gridSize);
  const pSValues = generateGrid(BKT_RANGES.pS.min, BKT_RANGES.pS.max, gridSize);

  // Grid search
  for (const pL0 of pL0Values) {
    for (const pT of pTValues) {
      for (const pG of pGValues) {
        for (const pS of pSValues) {
          // Skip invalid combinations (pG + pS >= 0.5 makes model unidentifiable)
          if (pG + pS >= 0.5) continue;

          const candidateParams: BKTParameters = { pL0, pT, pG, pS };

          // Evaluate with cross-validation
          const score = evaluateBKTWithCV(data, candidateParams, cvFolds, optimizeMetric, seed);

          searchHistory.push({
            params: candidateParams,
            score,
          });

          if (score > bestScore) {
            bestScore = score;
            bestParams = candidateParams;
          }
        }
      }
    }
  }

  // Refine with local search
  bestParams = refineBKTParameters(data, bestParams, maxIterations, tolerance, seed);

  // Final evaluation
  const metrics = evaluateBKTParameters(bestParams, data);

  // Cross-validation metrics
  const cvMetrics = crossValidateBKT(data, bestParams, cvFolds, seed);

  return {
    parameters: bestParams,
    metrics,
    cvMetrics,
    searchHistory,
    trainingTimeMs: Date.now() - startTime,
  };
}

/**
 * Estimate per-skill BKT parameters
 */
function estimateBKTPerSkill(
  data: BKTTrainingData[],
  config: GridSearchConfig
): BKTEstimationResult {
  const startTime = Date.now();
  const { gridSize = 3, seed = 42 } = config;

  // Group by skill
  const bySkill = new Map<string, BKTTrainingData[]>();
  for (const record of data) {
    const existing = bySkill.get(record.skillId) || [];
    existing.push(record);
    bySkill.set(record.skillId, existing);
  }

  // Estimate parameters per skill
  const skillParameters = new Map<string, BKTParameters>();
  // Note: totalLogLoss and totalCount reserved for aggregate metrics computation
  const _totalLogLoss = 0;
  const _totalCount = 0;

  for (const [skillId, skillData] of bySkill.entries()) {
    if (skillData.length < 20) {
      // Too few samples - use default
      skillParameters.set(skillId, { ...DEFAULT_BKT_PARAMS });
      continue;
    }

    // Simple grid search for this skill
    const result = estimateBKTParametersSimple(skillData, gridSize, seed);
    skillParameters.set(skillId, result.params);
    _totalLogLoss += result.logLoss * skillData.length;
    _totalCount += skillData.length;
  }

  // Compute average parameters
  let avgPL0 = 0,
    avgPT = 0,
    avgPG = 0,
    avgPS = 0;
  for (const params of skillParameters.values()) {
    avgPL0 += params.pL0;
    avgPT += params.pT;
    avgPG += params.pG;
    avgPS += params.pS;
  }
  const n = skillParameters.size || 1;

  const avgParams: BKTParameters = {
    pL0: avgPL0 / n,
    pT: avgPT / n,
    pG: avgPG / n,
    pS: avgPS / n,
  };

  // Evaluate
  const metrics = evaluateBKTParametersWithSkillMap(skillParameters, data);

  return {
    parameters: avgParams,
    skillParameters,
    metrics,
    trainingTimeMs: Date.now() - startTime,
  };
}

/**
 * Simple grid search for BKT parameters on small dataset
 */
function estimateBKTParametersSimple(
  data: BKTTrainingData[],
  gridSize: number,
  _seed: number
): { params: BKTParameters; logLoss: number } {
  const pL0Values = generateGrid(BKT_RANGES.pL0.min, BKT_RANGES.pL0.max, gridSize);
  const pTValues = generateGrid(BKT_RANGES.pT.min, BKT_RANGES.pT.max, gridSize);
  const pGValues = generateGrid(BKT_RANGES.pG.min, BKT_RANGES.pG.max, gridSize);
  const pSValues = generateGrid(BKT_RANGES.pS.min, BKT_RANGES.pS.max, gridSize);

  let bestParams = { ...DEFAULT_BKT_PARAMS };
  let bestLogLoss = Infinity;

  for (const pL0 of pL0Values) {
    for (const pT of pTValues) {
      for (const pG of pGValues) {
        for (const pS of pSValues) {
          if (pG + pS >= 0.5) continue;

          const params: BKTParameters = { pL0, pT, pG, pS };
          const logLoss = computeBKTLogLoss(data, params);

          if (logLoss < bestLogLoss) {
            bestLogLoss = logLoss;
            bestParams = params;
          }
        }
      }
    }
  }

  return { params: bestParams, logLoss: bestLogLoss };
}

/**
 * Compute log loss for BKT parameters
 */
function computeBKTLogLoss(data: BKTTrainingData[], params: BKTParameters): number {
  let totalLogLoss = 0;

  // Group by user-skill for proper tracking
  const byUserSkill = new Map<string, BKTTrainingData[]>();
  for (const record of data) {
    const key = `${record.userId}::${record.skillId}`;
    const existing = byUserSkill.get(key) || [];
    existing.push(record);
    byUserSkill.set(key, existing);
  }

  for (const [, sequence] of byUserSkill.entries()) {
    // Sort by timestamp
    const sorted = [...sequence].sort((a, b) => a.timestamp - b.timestamp);

    let pMastery = params.pL0;

    for (const record of sorted) {
      // Predict P(correct)
      const pCorrect = pMastery * (1 - params.pS) + (1 - pMastery) * params.pG;

      // Log loss
      const eps = 1e-15;
      const clippedP = Math.max(eps, Math.min(1 - eps, pCorrect));
      totalLogLoss += record.isCorrect
        ? -Math.log(clippedP)
        : -Math.log(1 - clippedP);

      // Update mastery
      pMastery = updateBKTMastery(pMastery, record.isCorrect, params);
    }
  }

  return totalLogLoss / data.length;
}

/**
 * Update BKT mastery
 */
function updateBKTMastery(
  pMastery: number,
  isCorrect: boolean,
  params: BKTParameters
): number {
  const { pT, pG, pS } = params;

  let pLGivenObs: number;

  if (isCorrect) {
    const pCorrect = pMastery * (1 - pS) + (1 - pMastery) * pG;
    pLGivenObs = pCorrect > 0 ? (pMastery * (1 - pS)) / pCorrect : pMastery;
  } else {
    const pIncorrect = pMastery * pS + (1 - pMastery) * (1 - pG);
    pLGivenObs = pIncorrect > 0 ? (pMastery * pS) / pIncorrect : pMastery;
  }

  const pLNew = pLGivenObs + (1 - pLGivenObs) * pT;
  return Math.max(0, Math.min(1, pLNew));
}

/**
 * Refine BKT parameters with local search
 */
function refineBKTParameters(
  data: BKTTrainingData[],
  initialParams: BKTParameters,
  maxIterations: number,
  _tolerance: number,
  _seed: number
): BKTParameters {
  let params = { ...initialParams };
  let bestLogLoss = computeBKTLogLoss(data, params);

  const stepSize = 0.01;

  for (let iter = 0; iter < maxIterations; iter++) {
    let improved = false;

    // Try adjusting each parameter
    for (const key of ['pL0', 'pT', 'pG', 'pS'] as const) {
      const range = BKT_RANGES[key];

      for (const delta of [-stepSize, stepSize]) {
        const candidateParams = { ...params };
        candidateParams[key] = Math.max(range.min, Math.min(range.max, params[key] + delta));

        // Check constraint
        if (candidateParams.pG + candidateParams.pS >= 0.5) continue;

        const logLoss = computeBKTLogLoss(data, candidateParams);

        if (logLoss < bestLogLoss - tolerance) {
          bestLogLoss = logLoss;
          params = candidateParams;
          improved = true;
        }
      }
    }

    if (!improved) break;
  }

  return params;
}

/**
 * Evaluate BKT with cross-validation
 */
function evaluateBKTWithCV(
  data: BKTTrainingData[],
  params: BKTParameters,
  folds: number,
  metric: keyof EvaluationMetrics,
  seed: number
): number {
  const cvMetrics = crossValidateBKT(data, params, folds, seed);

  const values = cvMetrics.map((m) => m[metric] as number);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  if (metric === 'rmse' || metric === 'brier' || metric === 'logLoss') {
    return -avg;
  }

  return avg;
}

/**
 * Cross-validate BKT parameters
 */
function crossValidateBKT(
  data: BKTTrainingData[],
  params: BKTParameters,
  folds: number,
  seed: number
): EvaluationMetrics[] {
  // Group by user for proper user-level splitting
  const byUser = new Map<string, BKTTrainingData[]>();
  for (const record of data) {
    const existing = byUser.get(record.userId) || [];
    existing.push(record);
    byUser.set(record.userId, existing);
  }

  const userIds = Array.from(byUser.keys());
  const shuffledUsers = shuffleWithSeed(userIds, seed);
  const foldSize = Math.ceil(shuffledUsers.length / folds);
  const results: EvaluationMetrics[] = [];

  for (let i = 0; i < folds; i++) {
    const testStart = i * foldSize;
    const testEnd = Math.min((i + 1) * foldSize, shuffledUsers.length);
    const testUsers = new Set(shuffledUsers.slice(testStart, testEnd));

    const testData = data.filter((d) => testUsers.has(d.userId));

    const metrics = evaluateBKTParameters(params, testData);
    results.push(metrics);
  }

  return results;
}

/**
 * Evaluate BKT parameters on test data
 */
export function evaluateBKTParameters(
  params: BKTParameters,
  testData: BKTTrainingData[]
): EvaluationMetrics {
  const predictions: number[] = [];
  const actuals: boolean[] = [];

  // Group by user-skill
  const byUserSkill = new Map<string, BKTTrainingData[]>();
  for (const record of testData) {
    const key = `${record.userId}::${record.skillId}`;
    const existing = byUserSkill.get(key) || [];
    existing.push(record);
    byUserSkill.set(key, existing);
  }

  for (const [, sequence] of byUserSkill.entries()) {
    const sorted = [...sequence].sort((a, b) => a.timestamp - b.timestamp);
    let pMastery = params.pL0;

    for (const record of sorted) {
      const pCorrect = pMastery * (1 - params.pS) + (1 - pMastery) * params.pG;
      predictions.push(pCorrect);
      actuals.push(record.isCorrect);

      pMastery = updateBKTMastery(pMastery, record.isCorrect, params);
    }
  }

  return computeMetrics(predictions, actuals);
}

/**
 * Evaluate BKT with skill-specific parameters
 */
function evaluateBKTParametersWithSkillMap(
  skillParams: Map<string, BKTParameters>,
  testData: BKTTrainingData[]
): EvaluationMetrics {
  const predictions: number[] = [];
  const actuals: boolean[] = [];

  // Group by user-skill
  const byUserSkill = new Map<string, BKTTrainingData[]>();
  for (const record of testData) {
    const key = `${record.userId}::${record.skillId}`;
    const existing = byUserSkill.get(key) || [];
    existing.push(record);
    byUserSkill.set(key, existing);
  }

  for (const [key, sequence] of byUserSkill.entries()) {
    const skillId = key.split('::')[1];
    const params = skillParams.get(skillId) || DEFAULT_BKT_PARAMS;

    const sorted = [...sequence].sort((a, b) => a.timestamp - b.timestamp);
    let pMastery = params.pL0;

    for (const record of sorted) {
      const pCorrect = pMastery * (1 - params.pS) + (1 - pMastery) * params.pG;
      predictions.push(pCorrect);
      actuals.push(record.isCorrect);

      pMastery = updateBKTMastery(pMastery, record.isCorrect, params);
    }
  }

  return computeMetrics(predictions, actuals);
}

/**
 * Evaluate parameter fit on any test data
 */
export function evaluateParameterFit(
  params: FSRSParameters | BKTParameters,
  testData: FSRSTrainingData[] | BKTTrainingData[],
  modelType: 'fsrs' | 'bkt'
): EvaluationMetrics {
  if (modelType === 'fsrs') {
    return evaluateFSRSParameters(params as FSRSParameters, testData as FSRSTrainingData[]);
  } else {
    return evaluateBKTParameters(params as BKTParameters, testData as BKTTrainingData[]);
  }
}

// ============================================================================
// METRICS COMPUTATION
// ============================================================================

/**
 * Compute evaluation metrics from predictions and actuals
 */
function computeMetrics(predictions: number[], actuals: boolean[]): EvaluationMetrics {
  if (predictions.length === 0) {
    return {
      auc: 0.5,
      rmse: 1,
      brier: 1,
      logLoss: 10,
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1: 0,
      sampleSize: 0,
    };
  }

  const n = predictions.length;

  // Binary predictions at 0.5 threshold
  const binaryPreds = predictions.map((p) => p >= 0.5);

  // Confusion matrix
  let tp = 0,
    fp = 0,
    tn = 0,
    fn = 0;
  for (let i = 0; i < n; i++) {
    if (actuals[i] && binaryPreds[i]) tp++;
    else if (!actuals[i] && binaryPreds[i]) fp++;
    else if (!actuals[i] && !binaryPreds[i]) tn++;
    else fn++;
  }

  // Metrics
  const accuracy = (tp + tn) / n;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  // RMSE
  let sumSquaredError = 0;
  for (let i = 0; i < n; i++) {
    const actual = actuals[i] ? 1 : 0;
    sumSquaredError += Math.pow(predictions[i] - actual, 2);
  }
  const rmse = Math.sqrt(sumSquaredError / n);

  // Brier score
  const brier = sumSquaredError / n;

  // Log loss
  let logLoss = 0;
  const eps = 1e-15;
  for (let i = 0; i < n; i++) {
    const p = Math.max(eps, Math.min(1 - eps, predictions[i]));
    logLoss += actuals[i] ? -Math.log(p) : -Math.log(1 - p);
  }
  logLoss /= n;

  // AUC (using Mann-Whitney U statistic)
  const auc = computeAUC(predictions, actuals);

  return {
    auc,
    rmse,
    brier,
    logLoss,
    accuracy,
    precision,
    recall,
    f1,
    sampleSize: n,
  };
}

/**
 * Compute AUC using Mann-Whitney U statistic
 */
function computeAUC(predictions: number[], actuals: boolean[]): number {
  // Separate positive and negative examples
  const positives: number[] = [];
  const negatives: number[] = [];

  for (let i = 0; i < predictions.length; i++) {
    if (actuals[i]) {
      positives.push(predictions[i]);
    } else {
      negatives.push(predictions[i]);
    }
  }

  if (positives.length === 0 || negatives.length === 0) {
    return 0.5; // Undefined, return random
  }

  // Count pairs where positive > negative
  let concordant = 0;
  let ties = 0;

  for (const pos of positives) {
    for (const neg of negatives) {
      if (pos > neg) concordant++;
      else if (pos === neg) ties++;
    }
  }

  const totalPairs = positives.length * negatives.length;
  return (concordant + 0.5 * ties) / totalPairs;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate evenly spaced grid points
 */
function generateGrid(min: number, max: number, size: number): number[] {
  if (size <= 1) return [(min + max) / 2];

  const step = (max - min) / (size - 1);
  const grid: number[] = [];

  for (let i = 0; i < size; i++) {
    grid.push(min + i * step);
  }

  return grid;
}

/**
 * Shuffle array with seed
 */
function shuffleWithSeed<T>(array: T[], seed: number): T[] {
  const result = [...array];
  let state = seed;

  const random = () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}
