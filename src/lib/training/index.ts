/**
 * Training Module Exports
 *
 * Infrastructure for collecting training data, exporting in various formats,
 * and preparing data for fine-tuning the vertical AI tutor.
 */

// Schema types
export {
  type ConversationTurn,
  type TurnMetadata,
  type TutoringSession,
  type UserLearningState,
  type SessionQualityMetrics,
  type LearningOutcome,
  type SessionAnnotation,
  type InstructionExample,
  type ConversationalExample,
  type PreferencePair,
  type RewardExample,
  type DataCollectionConfig,
  DEFAULT_COLLECTION_CONFIG,
  calculateOutcomeScore,
  calculateQualityMetrics,
  createEmptyTurnMetadata,
} from './schema';

// Conversation logging
export {
  analyzeTutorResponse,
  analyzeUserMessage,
  createTurn,
  createTutoringSession,
  addTurnToSession,
  completeSession,
  getTutoringSession,
  getOrCreateSession,
  updateReturnBehavior,
  getSessionsForExport,
  markSessionsExported,
} from './conversationLogger';

// Data export
export {
  sessionToInstructionExamples,
  sessionToConversationalExample,
  generatePreferencePairs,
  generateSyntheticPreferencePairs,
  sessionToRewardExamples,
  exportAllTrainingData,
  toJSONL,
  toHuggingFaceFormat,
  calculateExportStats,
  type ExportStats,
} from './dataExporter';

// Evaluation framework
export {
  type EvaluationDimension,
  type DimensionScore,
  type TurnEvaluation,
  type SessionEvaluation,
  type ABTestConfig,
  type ABVariant,
  type ABTestResult,
  type ABTestAnalysis,
  type VariantStats,
  type EvalDatasetEntry,
  evaluateTurnWithLLM,
  evaluateSession,
  assignVariant,
  calculateSignificance,
  analyzeABTest,
  generateEvalDataset,
} from './evaluation';

// RLHF - Learning outcome rewards
export {
  type LearningOutcomeReward,
  type OutcomeSignalConfig,
  type RewardBatchInput,
  type RewardTrainingExample,
  DEFAULT_OUTCOME_CONFIG,
  computeLearningOutcomeReward,
  computeBatchRewards,
  prepareRewardTrainingData,
} from './rlhf';

// Model serving
export {
  type ModelProvider,
  type ModelConfig,
  type RouterConfig,
  type GenerateRequest,
  type GenerateResponse,
  type HealthStatus,
  DEFAULT_ROUTER_CONFIG,
  ModelRouter,
  getModelRouter,
  resetModelRouter,
} from './serving';
