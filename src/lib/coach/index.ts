/**
 * Coach Module Index
 *
 * Exports for Socratic coaching functionality:
 * - Socratic prompts (Phase 12.2)
 * - Intervention hierarchy (Phase 12.2)
 * - LearnLM prompts (Phase 12.2)
 * - Socratic coach service (Phase 12.2)
 * - Grounded response generation (Phase 12.3)
 * - Response validation (Phase 12.3)
 * - Path modification
 *
 * Part of Phase 12.2: Socratic Prompt Architecture
 * Part of Phase 12.3: RAG Retrieval Integration
 */

// ============================================
// SOCRATIC PROMPTS (Phase 12.2)
// ============================================

export {
  buildSocraticPrompt,
  addEmotionalAdaptation,
  SOCRATIC_TEMPLATES,
  BASE_SOCRATIC_SYSTEM_PROMPT,
  LEVEL_1_PROMPT,
  LEVEL_2_PROMPT,
  LEVEL_3_PROMPT,
} from './socraticPrompts';

export type {
  SocraticPromptContext,
  SocraticPromptResult,
  InterventionLevel as SocraticInterventionLevel,
  InterventionType as SocraticInterventionType,
} from './socraticPrompts';

// ============================================
// INTERVENTION HIERARCHY (Phase 12.2)
// ============================================

export {
  selectIntervention,
  selectInterventionWithState,
  createInterventionState,
  updateInterventionState,
  resetInterventionState,
  shouldEscalateImmediately,
  hasShownUnderstanding,
  getInterventionSummary as getHierarchySummary,
  serializeState as serializeHierarchyState,
  deserializeState as deserializeHierarchyState,
  DEFAULT_INTERVENTION_CONFIG,
} from './interventionHierarchy';

export type {
  InterventionSelection,
  InterventionConfig,
  InterventionState as HierarchyInterventionState,
} from './interventionHierarchy';

// ============================================
// LEARNLM PROMPTS (Phase 12.2)
// ============================================

export {
  buildScaffoldedPrompt,
  generateMetacognitivePrompt,
  getAllMetacognitivePrompts,
  buildMetacognitiveSection,
  generateTransferPrompt,
  buildTransferSection,
  detectStruggle,
  buildStruggleResponseSection,
  getLearnLMGenerationConfig,
  DEFAULT_LEARNLM_CONFIG,
  SCAFFOLDING_TECHNIQUES,
} from './learnLMPrompts';

export type {
  ScaffoldingContext,
  MetacognitivePrompt,
  TransferPrompt,
  LearnLMConfig,
  StruggleIndicators,
} from './learnLMPrompts';

// ============================================
// SOCRATIC COACH SERVICE (Phase 12.2)
// ============================================

export {
  generateSocraticResponse,
  clearInterventionState,
  getInterventionStateInfo,
  serializeAllStates,
  restoreStates,
  getBKTContext,
} from './socraticCoachService';

export type {
  SocraticCoachContext,
  SocraticCoachResult,
  SocraticLogEntry,
} from './socraticCoachService';

// ============================================
// GROUNDED COACH (Phase 12.3)
// ============================================

export type {
  InterventionLevel,
  SocraticResponse,
  GenerationOptions,
  CoachContext,
} from './groundedCoach';

export {
  generateGroundedResponse,
  generateWrongAnswerResponse,
  generateHelpResponse,
  generateCorrectAnswerResponse,
  calculateGroundingScore,
  MIN_GROUNDING_SCORE,
} from './groundedCoach';

// ============================================
// RESPONSE VALIDATION (Phase 12.3)
// ============================================

export type {
  ValidationResult,
  ValidationFlag,
  GroundingMetrics,
} from './responseValidation';

export {
  validateResponse,
  logGroundingMetrics,
  createGroundingMetrics,
  formatCitations,
  appendCitations,
  SOCRATIC_KEYWORDS,
  DIRECT_ANSWER_PATTERNS,
} from './responseValidation';

// ============================================
// PATH MODIFIER
// ============================================

export {
  parseCoachSuggestion,
  applyCoachModification,
  insertRemediation,
  skipAhead,
  replaceWithSimpler,
  getLearningPath,
  advanceInPath,
  getCurrentPathItem,
} from './pathModifier';

export type {
  PathModification,
  LearningPathItem,
  LearningPath,
  PathModificationLog,
} from './pathModifier';
