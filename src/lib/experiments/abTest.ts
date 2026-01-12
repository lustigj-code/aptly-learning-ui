/**
 * A/B Testing Framework
 * Manages experiments, variant assignment, and result calculation
 * Used to prove adaptive learning works better than linear learning
 */

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  calculateMetrics,
  compareMetrics,
  type EfficacyMetrics,
  type MetricsComparison,
} from '@/lib/analytics/efficacy';

// ============================================
// TYPES
// ============================================

export interface ExperimentConfig {
  useAdaptiveSequencing: boolean;
  useStruggleDetection: boolean;
  useProactiveCoach: boolean;
  usePretests: boolean;
  useContentVariants: boolean;
  useSocraticMode?: boolean; // v2.0: Never give direct answers, use Socratic questioning
}

export interface Experiment {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  startDate: Date;
  endDate?: Date;
  variants: {
    control: ExperimentConfig;
    treatment: ExperimentConfig;
  };
  allocation: {
    control: number;  // e.g., 0.5 for 50%
    treatment: number; // e.g., 0.5 for 50%
  };
  metrics: string[];  // Which metrics to track
  sampleSize: {
    target: number;
    current: {
      control: number;
      treatment: number;
    };
  };
  results?: ExperimentResults;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExperimentResults {
  metrics: MetricsComparison[];
  winner: 'control' | 'treatment' | 'inconclusive';
  confidence: number;
  recommendations: string[];
  calculatedAt: Date;
}

export interface UserExperimentAssignment {
  experimentId: string;
  variant: 'control' | 'treatment';
  assignedAt: Date;
}

// ============================================
// DETERMINISTIC HASHING
// ============================================

/**
 * Simple hash function for consistent variant assignment
 * Uses same user+experiment combo to always get same variant
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get variant for user based on deterministic hash
 * Ensures same user always gets same variant for same experiment
 */
function getVariantFromHash(
  userId: string,
  experimentId: string,
  allocation: { control: number; treatment: number }
): 'control' | 'treatment' {
  const hash = hashString(`${userId}:${experimentId}`);
  const normalized = (hash % 1000) / 1000; // 0-1 range

  return normalized < allocation.control ? 'control' : 'treatment';
}

// ============================================
// EXPERIMENT MANAGEMENT
// ============================================

/**
 * Create a new experiment
 */
export async function createExperiment(
  experiment: Omit<Experiment, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const docRef = adminDb.collection('experiments').doc();

  await docRef.set({
    ...experiment,
    id: docRef.id,
    startDate: experiment.startDate instanceof Date
      ? Timestamp.fromDate(experiment.startDate)
      : experiment.startDate,
    endDate: experiment.endDate instanceof Date
      ? Timestamp.fromDate(experiment.endDate)
      : experiment.endDate,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Get an experiment by ID
 */
export async function getExperiment(experimentId: string): Promise<Experiment | null> {
  const doc = await adminDb.collection('experiments').doc(experimentId).get();

  if (!doc.exists) return null;

  const data = doc.data();
  return {
    ...data,
    id: doc.id,
    startDate: data?.startDate?.toDate?.() || new Date(data?.startDate),
    endDate: data?.endDate?.toDate?.() || (data?.endDate ? new Date(data?.endDate) : undefined),
    createdAt: data?.createdAt?.toDate?.() || new Date(),
    updatedAt: data?.updatedAt?.toDate?.() || new Date(),
  } as Experiment;
}

/**
 * Get all experiments with optional status filter
 */
export async function getExperiments(
  status?: Experiment['status']
): Promise<Experiment[]> {
  let query = adminDb.collection('experiments').orderBy('createdAt', 'desc');

  if (status) {
    query = query.where('status', '==', status) as any;
  }

  const snapshot = await query.get();

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      startDate: data.startDate?.toDate?.() || new Date(data.startDate),
      endDate: data.endDate?.toDate?.() || (data.endDate ? new Date(data.endDate) : undefined),
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
    } as Experiment;
  });
}

/**
 * Update experiment status
 */
export async function updateExperimentStatus(
  experimentId: string,
  status: Experiment['status']
): Promise<void> {
  const updates: Record<string, any> = {
    status,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (status === 'completed') {
    updates.endDate = FieldValue.serverTimestamp();
  }

  await adminDb.collection('experiments').doc(experimentId).update(updates);
}

/**
 * Update experiment sample size counts
 */
export async function updateExperimentSampleSize(
  experimentId: string,
  variant: 'control' | 'treatment'
): Promise<void> {
  const field = `sampleSize.current.${variant}`;

  await adminDb.collection('experiments').doc(experimentId).update({
    [field]: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

// ============================================
// VARIANT ASSIGNMENT
// ============================================

/**
 * Assign a user to an experiment variant
 * Uses deterministic hashing for consistent assignment
 */
export async function assignVariant(
  userId: string,
  experimentId: string
): Promise<'control' | 'treatment'> {
  // Check if already assigned
  const existingAssignment = await adminDb
    .collection('userExperiments')
    .doc(`${userId}_${experimentId}`)
    .get();

  if (existingAssignment.exists) {
    return existingAssignment.data()?.variant as 'control' | 'treatment';
  }

  // Get experiment
  const experiment = await getExperiment(experimentId);

  if (!experiment || experiment.status !== 'running') {
    throw new Error(`Experiment ${experimentId} is not running`);
  }

  // Determine variant using deterministic hash
  const variant = getVariantFromHash(userId, experimentId, experiment.allocation);

  // Store assignment
  await adminDb
    .collection('userExperiments')
    .doc(`${userId}_${experimentId}`)
    .set({
      userId,
      experimentId,
      variant,
      assignedAt: FieldValue.serverTimestamp(),
    });

  // Update experiment sample size
  await updateExperimentSampleSize(experimentId, variant);

  return variant;
}

/**
 * Get all experiments a user is assigned to
 */
export async function getUserExperiments(
  userId: string
): Promise<UserExperimentAssignment[]> {
  const snapshot = await adminDb
    .collection('userExperiments')
    .where('userId', '==', userId)
    .get();

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      experimentId: data.experimentId,
      variant: data.variant,
      assignedAt: data.assignedAt?.toDate?.() || new Date(data.assignedAt),
    };
  });
}

/**
 * Get user's variant for a specific experiment
 */
export async function getUserVariant(
  userId: string,
  experimentId: string
): Promise<'control' | 'treatment' | null> {
  const doc = await adminDb
    .collection('userExperiments')
    .doc(`${userId}_${experimentId}`)
    .get();

  if (!doc.exists) return null;

  return doc.data()?.variant as 'control' | 'treatment';
}

/**
 * Check if a feature is enabled for a user based on their experiment assignments
 */
export async function isFeatureEnabled(
  userId: string,
  feature: keyof ExperimentConfig
): Promise<boolean> {
  // Get all running experiments
  const experiments = await getExperiments('running');

  // Get user's experiment assignments
  const userExperiments = await getUserExperiments(userId);

  // Check each assignment
  for (const assignment of userExperiments) {
    const experiment = experiments.find(e => e.id === assignment.experimentId);

    if (experiment) {
      const config = experiment.variants[assignment.variant];
      if (feature in config) {
        return config[feature] ?? true; // Default to true if undefined
      }
    }
  }

  // Default: feature enabled (treatment behavior by default)
  return true;
}

/**
 * Get the full experiment config for a user
 * Merges all experiment assignments into one config
 */
export async function getUserExperimentConfig(
  userId: string
): Promise<ExperimentConfig> {
  // Default config (all features enabled)
  const defaultConfig: ExperimentConfig = {
    useAdaptiveSequencing: true,
    useStruggleDetection: true,
    useProactiveCoach: true,
    usePretests: true,
    useContentVariants: true,
    useSocraticMode: false, // Default to direct answers unless in Socratic experiment
  };

  const experiments = await getExperiments('running');
  const userExperiments = await getUserExperiments(userId);

  // Merge configs from all experiments user is in
  for (const assignment of userExperiments) {
    const experiment = experiments.find(e => e.id === assignment.experimentId);

    if (experiment) {
      const config = experiment.variants[assignment.variant];
      Object.assign(defaultConfig, config);
    }
  }

  return defaultConfig;
}

// ============================================
// RESULTS CALCULATION
// ============================================

/**
 * Get users assigned to each variant of an experiment
 */
async function getExperimentCohorts(
  experimentId: string
): Promise<{ control: string[]; treatment: string[] }> {
  const snapshot = await adminDb
    .collection('userExperiments')
    .where('experimentId', '==', experimentId)
    .get();

  const control: string[] = [];
  const treatment: string[] = [];

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.variant === 'control') {
      control.push(data.userId);
    } else {
      treatment.push(data.userId);
    }
  });

  return { control, treatment };
}

/**
 * Calculate experiment results
 */
export async function calculateResults(
  experimentId: string
): Promise<ExperimentResults> {
  const experiment = await getExperiment(experimentId);

  if (!experiment) {
    throw new Error(`Experiment ${experimentId} not found`);
  }

  // Get cohorts
  const cohorts = await getExperimentCohorts(experimentId);

  // Define date range for analysis
  const dateRange = {
    start: experiment.startDate,
    end: experiment.endDate || new Date(),
  };

  // Calculate metrics for each cohort
  const controlMetrics = await calculateMetrics(cohorts.control, dateRange);
  const treatmentMetrics = await calculateMetrics(cohorts.treatment, dateRange);

  // Compare metrics
  const comparisons = compareMetrics(
    controlMetrics,
    treatmentMetrics,
    cohorts.control.length,
    cohorts.treatment.length
  );

  // Filter to only tracked metrics
  const trackedComparisons = comparisons.filter(c =>
    experiment.metrics.includes(c.metric) ||
    experiment.metrics.some(m => c.metric.startsWith(m))
  );

  // Determine winner
  const significantImprovements = trackedComparisons.filter(c =>
    c.isSignificant && c.treatmentValue > c.controlValue
  );
  const significantRegressions = trackedComparisons.filter(c =>
    c.isSignificant && c.treatmentValue < c.controlValue
  );

  let winner: 'control' | 'treatment' | 'inconclusive' = 'inconclusive';
  let confidence = 0;

  if (significantImprovements.length > significantRegressions.length) {
    winner = 'treatment';
    confidence = (significantImprovements.length / trackedComparisons.length) * 100;
  } else if (significantRegressions.length > significantImprovements.length) {
    winner = 'control';
    confidence = (significantRegressions.length / trackedComparisons.length) * 100;
  }

  // Generate recommendations
  const recommendations: string[] = [];

  if (winner === 'treatment') {
    recommendations.push('Consider rolling out treatment features to all users.');

    for (const improvement of significantImprovements) {
      recommendations.push(
        `${improvement.metric}: +${improvement.percentDiff.toFixed(1)}% improvement (p=${improvement.statisticalSignificance.toFixed(4)})`
      );
    }
  } else if (winner === 'control') {
    recommendations.push('Treatment features may need refinement before broader rollout.');

    for (const regression of significantRegressions) {
      recommendations.push(
        `${regression.metric}: ${regression.percentDiff.toFixed(1)}% regression (p=${regression.statisticalSignificance.toFixed(4)})`
      );
    }
  } else {
    recommendations.push('Insufficient evidence to determine a winner. Consider extending the experiment or increasing sample size.');

    const samplesNeeded = Math.ceil(
      (experiment.sampleSize.target - cohorts.control.length - cohorts.treatment.length) / 2
    );

    if (samplesNeeded > 0) {
      recommendations.push(`Need approximately ${samplesNeeded * 2} more users to reach target sample size.`);
    }
  }

  const results: ExperimentResults = {
    metrics: trackedComparisons,
    winner,
    confidence: Math.round(confidence),
    recommendations,
    calculatedAt: new Date(),
  };

  // Store results
  await adminDb.collection('experiments').doc(experimentId).update({
    results,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return results;
}

// ============================================
// INITIAL EXPERIMENTS
// ============================================

/**
 * Pre-defined experiments to start with
 */
export const INITIAL_EXPERIMENTS: Omit<Experiment, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Adaptive vs Linear Learning Path',
    description: 'Test if adaptive sequencing improves completion and mastery',
    status: 'draft',
    startDate: new Date(),
    variants: {
      control: {
        useAdaptiveSequencing: false,
        useStruggleDetection: false,
        useProactiveCoach: false,
        usePretests: false,
        useContentVariants: false,
      },
      treatment: {
        useAdaptiveSequencing: true,
        useStruggleDetection: true,
        useProactiveCoach: true,
        usePretests: true,
        useContentVariants: true,
      },
    },
    allocation: {
      control: 0.5,
      treatment: 0.5,
    },
    metrics: [
      'courseCompletionRate',
      'lessonCompletionRate',
      'skillMasteryRate',
      'averageTimeToMastery',
      'retentionRate',
    ],
    sampleSize: {
      target: 200,
      current: { control: 0, treatment: 0 },
    },
  },
  {
    name: 'Proactive vs Reactive Coach',
    description: 'Test if proactive interventions improve struggle resolution',
    status: 'draft',
    startDate: new Date(),
    variants: {
      control: {
        useAdaptiveSequencing: true,
        useStruggleDetection: true,
        useProactiveCoach: false, // Only difference
        usePretests: true,
        useContentVariants: true,
      },
      treatment: {
        useAdaptiveSequencing: true,
        useStruggleDetection: true,
        useProactiveCoach: true, // Coach intervenes proactively
        usePretests: true,
        useContentVariants: true,
      },
    },
    allocation: {
      control: 0.5,
      treatment: 0.5,
    },
    metrics: [
      'interventionSuccessRate',
      'sessionCompletionRate',
      'returnRate.day1',
      'returnRate.day7',
      'skillMasteryRate',
    ],
    sampleSize: {
      target: 200,
      current: { control: 0, treatment: 0 },
    },
  },
  {
    name: 'Pre-test Skipping Impact',
    description: 'Test if allowing content skipping improves efficiency without hurting retention',
    status: 'draft',
    startDate: new Date(),
    variants: {
      control: {
        useAdaptiveSequencing: true,
        useStruggleDetection: true,
        useProactiveCoach: true,
        usePretests: false, // No pre-tests
        useContentVariants: true,
      },
      treatment: {
        useAdaptiveSequencing: true,
        useStruggleDetection: true,
        useProactiveCoach: true,
        usePretests: true, // Pre-tests enabled
        useContentVariants: true,
      },
    },
    allocation: {
      control: 0.5,
      treatment: 0.5,
    },
    metrics: [
      'averageTimeToMastery',
      'skillMasteryRate',
      'retentionRate',
      'contentSkipRate',
      'pretestPassRate',
    ],
    sampleSize: {
      target: 200,
      current: { control: 0, treatment: 0 },
    },
  },
  // v2.0 Experiment: Socratic Coach
  {
    name: 'Socratic Coach vs Direct Coach',
    description: 'Test if Socratic questioning (never giving direct answers) improves learning outcomes vs traditional coaching',
    status: 'draft',
    startDate: new Date(),
    variants: {
      control: {
        useAdaptiveSequencing: true,
        useStruggleDetection: true,
        useProactiveCoach: true,
        usePretests: true,
        useContentVariants: true,
        useSocraticMode: false, // Direct answers allowed
      },
      treatment: {
        useAdaptiveSequencing: true,
        useStruggleDetection: true,
        useProactiveCoach: true,
        usePretests: true,
        useContentVariants: true,
        useSocraticMode: true, // Never gives direct answers, uses questioning
      },
    },
    allocation: {
      control: 0.5,
      treatment: 0.5,
    },
    metrics: [
      'contentSkipRate',
      'averageTimeToMastery',
      'retentionRate',
      'courseCompletionRate',
    ],
    sampleSize: {
      target: 200,
      current: { control: 0, treatment: 0 },
    },
  },
];

/**
 * Initialize all predefined experiments
 */
export async function initializeExperiments(): Promise<string[]> {
  const experimentIds: string[] = [];

  for (const experiment of INITIAL_EXPERIMENTS) {
    const id = await createExperiment(experiment);
    experimentIds.push(id);
  }

  return experimentIds;
}

/**
 * Start an experiment (change status to running)
 */
export async function startExperiment(experimentId: string): Promise<void> {
  await adminDb.collection('experiments').doc(experimentId).update({
    status: 'running',
    startDate: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Pause an experiment
 */
export async function pauseExperiment(experimentId: string): Promise<void> {
  await updateExperimentStatus(experimentId, 'paused');
}

/**
 * Complete an experiment and calculate final results
 */
export async function completeExperiment(
  experimentId: string
): Promise<ExperimentResults> {
  await updateExperimentStatus(experimentId, 'completed');
  return calculateResults(experimentId);
}
