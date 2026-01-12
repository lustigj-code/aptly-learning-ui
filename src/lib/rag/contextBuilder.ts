/**
 * Context Builder for Socratic Coach
 *
 * Combines retrieved RAG content with learner state (BKT, struggle level)
 * to build comprehensive context for LLM prompt.
 *
 * Features:
 * - Truncates to max token budget
 * - Prioritizes misconceptions when relevant
 * - Includes BKT mastery state
 * - Incorporates struggle detection signals
 *
 * Part of Phase 12.3: RAG Retrieval Integration
 */

import type { RetrievedChunk, FormattedRAGContext } from './types';
import type { SkillState } from '../mastery/bkt';
import type { StruggleSignals, InterventionZone } from '../adaptive/struggleDetection';
import { formatRAGContext, formatContextForPrompt } from './contextFormatter';

// ============================================
// TYPES
// ============================================

export interface LearnerState {
  userId: string;
  skillStates?: Record<string, SkillState>;
  currentSkillId?: string;
  currentPMastery?: number;
  struggleSignals?: StruggleSignals;
  interventionZone?: InterventionZone;
  consecutiveWrong?: number;
  totalAttempts?: number;
  emotionalState?: 'frustrated' | 'confused' | 'engaged' | 'neutral';
}

export interface RAGContext {
  chunk: RetrievedChunk;
  relevance: 'high' | 'medium' | 'low';
  type: 'misconception' | 'hint' | 'content' | 'example';
}

export interface BuiltContext {
  ragContext: string;
  learnerContext: string;
  interventionContext: string;
  fullContext: string;
  truncated: boolean;
  metadata: {
    ragChunksUsed: number;
    totalTokensEstimate: number;
    sourceCitations: SourceCitation[];
  };
}

export interface SourceCitation {
  chunkId: string;
  title: string;
  lessonId: string;
  relevance: number;
}

// ============================================
// CONFIGURATION
// ============================================

const MAX_CONTEXT_TOKENS = 2000;
const CHARS_PER_TOKEN = 4; // Rough estimate
const MAX_CONTEXT_CHARS = MAX_CONTEXT_TOKENS * CHARS_PER_TOKEN;

// Budget allocation (percentages)
const BUDGET_ALLOCATION = {
  ragContext: 0.6, // 60% for RAG content
  learnerContext: 0.2, // 20% for learner state
  interventionContext: 0.2, // 20% for intervention directives
};

// ============================================
// MAIN BUILDER FUNCTION
// ============================================

/**
 * Build comprehensive context for Socratic coach prompts
 *
 * Combines:
 * 1. Retrieved RAG content (misconceptions, hints, examples)
 * 2. Learner state (BKT mastery, struggle level)
 * 3. Intervention directives
 *
 * @param retrievedChunks - Chunks from RAG retrieval
 * @param learnerState - Current learner state
 * @param interventionLevel - Current intervention tier (1-3)
 * @returns Built context with all components
 */
export function buildContext(
  retrievedChunks: RetrievedChunk[],
  learnerState: LearnerState,
  interventionLevel: 1 | 2 | 3 = 1
): BuiltContext {
  // Calculate character budgets
  const ragBudget = Math.floor(MAX_CONTEXT_CHARS * BUDGET_ALLOCATION.ragContext);
  const learnerBudget = Math.floor(MAX_CONTEXT_CHARS * BUDGET_ALLOCATION.learnerContext);
  const interventionBudget = Math.floor(MAX_CONTEXT_CHARS * BUDGET_ALLOCATION.interventionContext);

  // Build each section
  const ragSection = buildRAGSection(retrievedChunks, ragBudget);
  const learnerSection = buildLearnerSection(learnerState, learnerBudget);
  const interventionSection = buildInterventionSection(
    learnerState,
    interventionLevel,
    interventionBudget
  );

  // Combine sections
  const fullContext = combineContextSections(
    ragSection.text,
    learnerSection.text,
    interventionSection.text
  );

  // Check if truncation occurred
  const truncated =
    ragSection.truncated || learnerSection.truncated || interventionSection.truncated;

  // Build source citations
  const sourceCitations = buildSourceCitations(retrievedChunks);

  return {
    ragContext: ragSection.text,
    learnerContext: learnerSection.text,
    interventionContext: interventionSection.text,
    fullContext,
    truncated,
    metadata: {
      ragChunksUsed: ragSection.chunksUsed,
      totalTokensEstimate: Math.ceil(fullContext.length / CHARS_PER_TOKEN),
      sourceCitations,
    },
  };
}

// ============================================
// SECTION BUILDERS
// ============================================

/**
 * Build RAG context section from retrieved chunks
 */
function buildRAGSection(
  chunks: RetrievedChunk[],
  maxChars: number
): { text: string; truncated: boolean; chunksUsed: number } {
  if (chunks.length === 0) {
    return {
      text: 'No relevant course content found for this query.',
      truncated: false,
      chunksUsed: 0,
    };
  }

  // Use the existing formatter with appropriate budget
  const formatted = formatRAGContext(
    chunks.map((c) => c.chunk),
    maxChars
  );

  const text = formatContextForPrompt(formatted);

  return {
    text,
    truncated: formatted.truncated,
    chunksUsed: formatted.totalChunks,
  };
}

/**
 * Build learner state section
 */
function buildLearnerSection(
  learnerState: LearnerState,
  maxChars: number
): { text: string; truncated: boolean } {
  const sections: string[] = [];

  // Current skill mastery
  if (learnerState.currentPMastery !== undefined) {
    const masteryPercent = Math.round(learnerState.currentPMastery * 100);
    const masteryLevel = getMasteryDescription(learnerState.currentPMastery);
    sections.push(
      `Current Skill Mastery: ${masteryPercent}% (${masteryLevel})`
    );
  }

  // Struggle signals
  if (learnerState.struggleSignals) {
    const { severity, signals, confidence } = learnerState.struggleSignals;
    if (confidence > 0.5) {
      sections.push(
        `Struggle Level: ${severity} (confidence: ${Math.round(confidence * 100)}%)`
      );
      if (signals.consecutiveWrong > 0) {
        sections.push(`Consecutive Wrong: ${signals.consecutiveWrong}`);
      }
      if (signals.masteryStalling) {
        sections.push('Note: Mastery appears to be stalling');
      }
    }
  }

  // Intervention zone
  if (learnerState.interventionZone) {
    const zoneDescription = getZoneDescription(learnerState.interventionZone);
    sections.push(`Learning Zone: ${zoneDescription}`);
  }

  // Emotional state
  if (learnerState.emotionalState && learnerState.emotionalState !== 'neutral') {
    sections.push(
      `Detected Emotional State: ${learnerState.emotionalState}`
    );
  }

  // Consecutive wrong (simple version)
  if (
    learnerState.consecutiveWrong !== undefined &&
    learnerState.consecutiveWrong > 0 &&
    !learnerState.struggleSignals
  ) {
    sections.push(`Consecutive Wrong Answers: ${learnerState.consecutiveWrong}`);
  }

  if (sections.length === 0) {
    return { text: '', truncated: false };
  }

  let text = `## LEARNER STATE\n${sections.join('\n')}`;

  // Truncate if needed
  if (text.length > maxChars) {
    text = text.substring(0, maxChars - 3) + '...';
    return { text, truncated: true };
  }

  return { text, truncated: false };
}

/**
 * Build intervention directive section
 */
function buildInterventionSection(
  learnerState: LearnerState,
  tier: 1 | 2 | 3,
  maxChars: number
): { text: string; truncated: boolean } {
  const directives: string[] = [];

  // Tier-specific guidance
  switch (tier) {
    case 1:
      directives.push(
        'TIER 1 - Metacognitive Questioning:',
        '- Ask what the student already knows or thinks about the topic',
        '- Use questions like "What made you choose that answer?"',
        '- Do NOT give hints or point to the answer yet'
      );
      break;
    case 2:
      directives.push(
        'TIER 2 - Specific Guidance:',
        '- Point to the specific area of confusion',
        '- Use questions like "Notice that the question asks about..."',
        '- Do NOT give the answer directly'
      );
      break;
    case 3:
      directives.push(
        'TIER 3 - Worked Example:',
        '- Provide a worked example of a SIMILAR (not the same) problem',
        '- Show the method step by step',
        '- Then ask them to apply the method to their question'
      );
      break;
  }

  // Emotional adjustments
  if (learnerState.emotionalState === 'frustrated') {
    directives.push(
      '',
      'EMOTIONAL ADJUSTMENT:',
      'Student appears frustrated. First acknowledge their effort and provide encouragement before continuing.'
    );
  } else if (learnerState.emotionalState === 'confused') {
    directives.push(
      '',
      'EMOTIONAL ADJUSTMENT:',
      'Student appears confused. Use simpler language and break down the concept further.'
    );
  }

  // Severity adjustments
  if (learnerState.struggleSignals?.severity === 'severe') {
    directives.push(
      '',
      'SEVERITY NOTE:',
      'Student is severely struggling. Consider suggesting a break or offering to revisit prerequisites.'
    );
  }

  let text = `## INTERVENTION DIRECTIVE\n${directives.join('\n')}`;

  // Truncate if needed
  if (text.length > maxChars) {
    text = text.substring(0, maxChars - 3) + '...';
    return { text, truncated: true };
  }

  return { text, truncated: false };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Combine context sections into final string
 */
function combineContextSections(
  ragContext: string,
  learnerContext: string,
  interventionContext: string
): string {
  const sections = [ragContext, learnerContext, interventionContext].filter(
    (s) => s.length > 0
  );
  return sections.join('\n\n');
}

/**
 * Build source citations from chunks
 */
function buildSourceCitations(chunks: RetrievedChunk[]): SourceCitation[] {
  return chunks.slice(0, 5).map((c) => ({
    chunkId: c.chunk.id,
    title: c.chunk.title || 'Untitled',
    lessonId: c.chunk.lessonId,
    relevance: c.score,
  }));
}

/**
 * Get human-readable mastery description
 */
function getMasteryDescription(pMastery: number): string {
  if (pMastery >= 0.95) return 'Mastered';
  if (pMastery >= 0.7) return 'Proficient';
  if (pMastery >= 0.5) return 'Developing';
  if (pMastery >= 0.3) return 'Emerging';
  return 'Novice';
}

/**
 * Get human-readable zone description
 */
function getZoneDescription(zone: InterventionZone): string {
  switch (zone) {
    case 'frustration':
      return 'Below ZPD (too hard) - needs more support';
    case 'zpd':
      return 'Zone of Proximal Development (optimal for learning)';
    case 'mastery':
      return 'Above ZPD (ready for new challenge)';
    default:
      return zone;
  }
}

// ============================================
// QUICK CONTEXT BUILDERS
// ============================================

/**
 * Build minimal context for quick responses
 */
export function buildMinimalContext(
  chunks: RetrievedChunk[],
  learnerState: LearnerState
): string {
  const topChunks = chunks.slice(0, 2);
  const content = topChunks.map((c) => c.chunk.text.substring(0, 300)).join('\n\n');

  const mastery = learnerState.currentPMastery
    ? `Mastery: ${Math.round(learnerState.currentPMastery * 100)}%`
    : '';

  return `${content}\n\n${mastery}`.trim();
}

/**
 * Build context focused on misconceptions
 */
export function buildMisconceptionContext(
  chunks: RetrievedChunk[],
  studentAnswer: string
): string {
  const misconceptionChunks = chunks.filter(
    (c) => c.chunk.chunkType === 'misconception'
  );

  if (misconceptionChunks.length === 0) {
    return `Student answered "${studentAnswer}". No specific misconception identified for this answer.`;
  }

  const misconception = misconceptionChunks[0].chunk;
  return `Student answered "${studentAnswer}".

## IDENTIFIED MISCONCEPTION
${misconception.text}

Use this understanding to guide the student to discover the flaw in their reasoning without revealing the answer.`;
}

/**
 * Convert RAGContext array to RetrievedChunk array
 */
export function ragContextToChunks(contexts: RAGContext[]): RetrievedChunk[] {
  return contexts.map((c) => c.chunk);
}

// ============================================
// EXPORTS
// ============================================

export {
  MAX_CONTEXT_TOKENS,
  MAX_CONTEXT_CHARS,
  CHARS_PER_TOKEN,
  BUDGET_ALLOCATION,
};
