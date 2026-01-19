/**
 * RAG Context Formatter
 *
 * Formats retrieved chunks for injection into Socratic prompts
 * Based on LearnLM research: prioritize misconceptions, structure for Socratic questioning
 *
 * Part of Phase 12: Socratic RAG Coach
 */

import type { FormattedRAGContext } from './types';

// ============================================
// CONFIGURATION
// ============================================

const DEFAULT_MAX_LENGTH = 2000; // Max characters for context injection
const _MISCONCEPTION_PRIORITY = 2; // Misconceptions get 2x the character budget

// ============================================
// MAIN FORMATTING FUNCTIONS
// ============================================

/**
 * Format retrieved chunks for Socratic prompt injection
 *
 * LearnLM research priorities:
 * 1. Misconception context (if student selected wrong answer)
 * 2. Related course content
 * 3. Available hints (for tiered intervention)
 * 4. Worked examples (last resort)
 */
export function formatRAGContext(
  chunks: PedagogicalChunk[],
  maxLength: number = DEFAULT_MAX_LENGTH
): FormattedRAGContext {
  if (chunks.length === 0) {
    return {
      misconceptions: '',
      relatedContent: '',
      hints: '',
      examples: '',
      totalChunks: 0,
      truncated: false,
    };
  }

  // Separate chunks by type
  const misconceptions = chunks.filter((c) => c.chunkType === 'misconception');
  const content = chunks.filter((c) => c.chunkType === 'content');
  const hints = chunks.filter((c) => c.chunkType === 'hint');
  const examples = chunks.filter((c) => c.chunkType === 'example');

  // Allocate character budget (misconceptions get priority)
  const misconceptionBudget = Math.floor(maxLength * 0.4);
  const contentBudget = Math.floor(maxLength * 0.35);
  const hintBudget = Math.floor(maxLength * 0.15);
  const exampleBudget = Math.floor(maxLength * 0.1);

  let truncated = false;

  // Format each section with budget
  const formattedMisconceptions = formatMisconceptionSection(
    misconceptions,
    misconceptionBudget
  );
  if (formattedMisconceptions.truncated) truncated = true;

  const formattedContent = formatContentSection(content, contentBudget);
  if (formattedContent.truncated) truncated = true;

  const formattedHints = formatHintSection(hints, hintBudget);
  if (formattedHints.truncated) truncated = true;

  const formattedExamples = formatExampleSection(examples, exampleBudget);
  if (formattedExamples.truncated) truncated = true;

  return {
    misconceptions: formattedMisconceptions.text,
    relatedContent: formattedContent.text,
    hints: formattedHints.text,
    examples: formattedExamples.text,
    totalChunks: chunks.length,
    truncated,
  };
}

/**
 * Format misconception chunks with distractor context
 *
 * Critical for Socratic approach: know WHY the wrong answer is wrong
 */
function formatMisconceptionSection(
  chunks: PedagogicalChunk[],
  maxLength: number
): { text: string; truncated: boolean } {
  if (chunks.length === 0) {
    return { text: '', truncated: false };
  }

  let text = '';
  let truncated = false;

  // Sort by distractorId for consistency
  const sorted = [...chunks].sort((a, b) =>
    (a.distractorId || '').localeCompare(b.distractorId || '')
  );

  for (const chunk of sorted.slice(0, 3)) { // Max 3 misconceptions
    const entry = `Distractor "${chunk.distractorText || 'Unknown'}":\n${chunk.text}\n\n`;

    if (text.length + entry.length > maxLength) {
      truncated = true;
      break;
    }

    text += entry;
  }

  return { text: text.trim(), truncated };
}

/**
 * Format content chunks grouped by lesson
 */
function formatContentSection(
  chunks: PedagogicalChunk[],
  maxLength: number
): { text: string; truncated: boolean } {
  if (chunks.length === 0) {
    return { text: '', truncated: false };
  }

  let text = '';
  let truncated = false;

  // Group by lesson for readability
  const byLesson: Record<string, PedagogicalChunk[]> = {};
  for (const chunk of chunks) {
    const key = chunk.title || chunk.lessonId;
    if (!byLesson[key]) byLesson[key] = [];
    byLesson[key].push(chunk);
  }

  for (const [lessonTitle, lessonChunks] of Object.entries(byLesson)) {
    for (const chunk of lessonChunks.slice(0, 2)) { // Max 2 per lesson
      const entry = `From "${lessonTitle}":\n${chunk.text}\n\n`;

      if (text.length + entry.length > maxLength) {
        truncated = true;
        break;
      }

      text += entry;
    }

    if (truncated) break;
  }

  return { text: text.trim(), truncated };
}

/**
 * Format hint chunks with tier indication
 */
function formatHintSection(
  chunks: PedagogicalChunk[],
  maxLength: number
): { text: string; truncated: boolean } {
  if (chunks.length === 0) {
    return { text: '', truncated: false };
  }

  let text = '';
  let truncated = false;

  // Sort by tier (tier 1 first)
  const sorted = [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex);

  for (const chunk of sorted.slice(0, 3)) { // Max 3 hints (one per tier)
    const tierNum = chunk.chunkIndex + 1;
    const entry = `Tier ${tierNum} Hint:\n${chunk.text}\n\n`;

    if (text.length + entry.length > maxLength) {
      truncated = true;
      break;
    }

    text += entry;
  }

  return { text: text.trim(), truncated };
}

/**
 * Format example chunks
 */
function formatExampleSection(
  chunks: PedagogicalChunk[],
  maxLength: number
): { text: string; truncated: boolean } {
  if (chunks.length === 0) {
    return { text: '', truncated: false };
  }

  let text = '';
  let truncated = false;

  for (const chunk of chunks.slice(0, 2)) { // Max 2 examples
    const entry = `Worked Example:\n${chunk.text}\n\n`;

    if (text.length + entry.length > maxLength) {
      truncated = true;
      break;
    }

    text += entry;
  }

  return { text: text.trim(), truncated };
}

// ============================================
// SPECIALIZED FORMATTERS
// ============================================

/**
 * Format misconception context specifically for a wrong answer
 *
 * Used when we know which distractor the student selected
 */
export function formatMisconceptionForDistractor(
  misconceptionChunk: PedagogicalChunk | null,
  studentAnswer: string
): string {
  if (!misconceptionChunk) {
    return `The student answered "${studentAnswer}". Guide them to discover why this might not be correct without revealing the answer.`;
  }

  return `The student answered "${studentAnswer}".

Common misconception for this answer:
${misconceptionChunk.text}

Use this understanding to craft a Socratic question that helps them discover the flaw in their reasoning without directly telling them the answer.`;
}

/**
 * Format complete RAG context as a single string for prompt injection
 */
export function formatContextForPrompt(context: FormattedRAGContext): string {
  const sections: string[] = [];

  if (context.misconceptions) {
    sections.push(`## MISCONCEPTION CONTEXT (CRITICAL)
${context.misconceptions}`);
  }

  if (context.relatedContent) {
    sections.push(`## RELATED COURSE CONTENT
${context.relatedContent}`);
  }

  if (context.hints) {
    sections.push(`## AVAILABLE HINTS (Use according to intervention tier)
${context.hints}`);
  }

  if (context.examples) {
    sections.push(`## WORKED EXAMPLES (Tier 3 only)
${context.examples}`);
  }

  if (sections.length === 0) {
    return 'No specific course content retrieved for this query.';
  }

  let result = sections.join('\n\n');

  if (context.truncated) {
    result += '\n\n[Context truncated for length]';
  }

  return result;
}

/**
 * Create a minimal context string for quick lookups
 */
export function formatMinimalContext(chunks: PedagogicalChunk[]): string {
  if (chunks.length === 0) return '';

  return chunks
    .slice(0, 3)
    .map((c) => c.text.substring(0, 200) + (c.text.length > 200 ? '...' : ''))
    .join('\n\n---\n\n');
}
