/**
 * Pedagogical Content Chunker
 *
 * Extends base content chunker with LearnLM research-backed features:
 * - Misconception chunks per distractor (wrong answer)
 * - Hint chunking for tiered interventions
 * - Example chunking for worked examples
 *
 * Part of Phase 12: Socratic RAG Coach
 */

import type {
  Atom,
  Question,
  QuizContent,
  ReadingContent,
  VideoContent,
  PracticeContent,
} from '@/types';
import type { PedagogicalChunk, ChunkType } from './types';

// ============================================
// CONFIGURATION
// ============================================

const MAX_WORDS_PER_CHUNK = 500;
const MIN_CHUNK_WORDS = 20;

// ============================================
// HELPER FUNCTIONS
// ============================================

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

function generateChunkId(
  prefix: string,
  courseId: string,
  moduleId: string,
  lessonId: string,
  atomId: string,
  suffix: string
): string {
  return `${prefix}_${courseId}_${moduleId}_${lessonId}_${atomId}_${suffix}`;
}

// ============================================
// MISCONCEPTION CHUNK EXTRACTION
// ============================================

/**
 * Extract misconception chunks from quiz questions
 *
 * LearnLM research: "Index WHY each wrong answer is wrong"
 * Creates one chunk per distractor (wrong answer option)
 */
export function extractMisconceptionChunks(
  question: Question,
  questionIndex: number,
  context: {
    courseId: string;
    moduleId: string;
    lessonId: string;
    atomId: string;
    atomTitle: string;
  }
): PedagogicalChunk[] {
  const chunks: PedagogicalChunk[] = [];
  const options = question.options || [];
  const correctAnswer = question.correctAnswer;

  // For each wrong answer, create a misconception chunk
  options.forEach((optionText, optionIndex) => {
    // Skip the correct answer
    const isCorrect =
      correctAnswer === optionIndex ||
      correctAnswer === optionText ||
      (typeof correctAnswer === 'string' &&
        optionText.toLowerCase() === correctAnswer.toLowerCase());

    if (isCorrect) return;

    // Generate misconception explanation if not provided
    // In production, this would come from authored content
    const misconceptionExplanation = generateMisconceptionExplanation(
      question.question,
      optionText,
      question.explanation,
      options.find((_, i) =>
        correctAnswer === i || correctAnswer === options[i]
      ) || options[Number(correctAnswer)] || ''
    );

    const chunk: PedagogicalChunk = {
      id: generateChunkId(
        'misconception',
        context.courseId,
        context.moduleId,
        context.lessonId,
        context.atomId,
        `q${questionIndex}_d${optionIndex}`
      ),
      text: misconceptionExplanation,
      courseId: context.courseId,
      moduleId: context.moduleId,
      lessonId: context.lessonId,
      atomId: context.atomId,
      atomType: 'quiz',
      title: `Misconception: ${context.atomTitle} Q${questionIndex + 1}`,
      chunkIndex: optionIndex,

      // Pedagogical metadata
      chunkType: 'misconception',
      questionId: question.id || `q${questionIndex}`,
      distractorId: `d${optionIndex}`,
      distractorText: optionText,
      studentFriendly: true,
      difficultyLevel: question.difficulty,
      skills: question.skills,
    };

    chunks.push(chunk);
  });

  return chunks;
}

/**
 * Generate a misconception explanation when not explicitly authored
 *
 * Creates a student-friendly explanation of why the wrong answer is wrong
 * without giving away the correct answer (Socratic approach)
 */
function generateMisconceptionExplanation(
  questionText: string,
  wrongAnswer: string,
  correctExplanation: string,
  _correctAnswer: string
): string {
  // Structure for Socratic retrieval
  return `Question: "${questionText}"

Student selected: "${wrongAnswer}"

This answer is incorrect. Common reasons students choose this answer:
- It may seem related to the topic but misses the key distinction
- It could represent a partial understanding of the concept
- There may be confusion between similar concepts

Guidance approach:
- Ask the student to explain their reasoning for choosing this answer
- Help them identify what the question is specifically asking
- Guide them to reconsider without revealing the correct answer

Related concept from explanation: ${correctExplanation}`;
}

// ============================================
// HINT CHUNK EXTRACTION
// ============================================

/**
 * Extract hint chunks from content
 *
 * LearnLM research: Tiered scaffolding (Tier 1 → Tier 2 → Tier 3)
 */
export function extractHintChunks(
  question: Question,
  questionIndex: number,
  context: {
    courseId: string;
    moduleId: string;
    lessonId: string;
    atomId: string;
    atomTitle: string;
  }
): PedagogicalChunk[] {
  const chunks: PedagogicalChunk[] = [];

  // Generate tiered hints based on the question and explanation
  const hints = generateTieredHints(
    question.question,
    question.explanation,
    question.skills
  );

  hints.forEach((hint, tier) => {
    const chunk: PedagogicalChunk = {
      id: generateChunkId(
        'hint',
        context.courseId,
        context.moduleId,
        context.lessonId,
        context.atomId,
        `q${questionIndex}_tier${tier + 1}`
      ),
      text: hint,
      courseId: context.courseId,
      moduleId: context.moduleId,
      lessonId: context.lessonId,
      atomId: context.atomId,
      atomType: 'quiz',
      title: `Hint Tier ${tier + 1}: ${context.atomTitle} Q${questionIndex + 1}`,
      chunkIndex: tier,

      chunkType: 'hint',
      questionId: question.id || `q${questionIndex}`,
      studentFriendly: true,
      difficultyLevel: question.difficulty,
      skills: question.skills,
    };

    chunks.push(chunk);
  });

  return chunks;
}

/**
 * Generate tiered hints following LearnLM hierarchy
 *
 * Tier 1: Metacognitive (ask about thinking)
 * Tier 2: Specific guidance (point to area of confusion)
 * Tier 3: Worked example (last resort)
 */
function generateTieredHints(
  questionText: string,
  explanation: string,
  skills: string[]
): string[] {
  const skillsContext = skills.length > 0 ? skills.join(', ') : 'this topic';

  return [
    // Tier 1: Metacognitive
    `For this question about ${skillsContext}:
Socratic approach: Ask the student to explain their reasoning
- "What made you choose that answer?"
- "Can you walk me through your thinking?"
- "What do you already know about ${skillsContext}?"`,

    // Tier 2: Specific guidance
    `For this question about ${skillsContext}:
Guide to specific area:
- Focus on what the question is specifically asking
- Consider the key terms and their precise meanings
- Think about the relationship between the concepts involved
Context: ${explanation.substring(0, 200)}${explanation.length > 200 ? '...' : ''}`,

    // Tier 3: Worked example structure
    `For this question about ${skillsContext}:
If student is still struggling after Tier 1 and 2, provide a worked example of a SIMILAR problem:
- Show the approach step by step
- Explain the reasoning at each step
- Ask them to apply the same approach to the original question
- Do NOT give them the direct answer

Full explanation for reference: ${explanation}`,
  ];
}

// ============================================
// CONTENT CHUNK EXTRACTION
// ============================================

/**
 * Extract content chunks from reading material
 */
export function extractContentChunks(
  atom: Atom,
  context: {
    courseId: string;
    moduleId: string;
    lessonId: string;
  }
): PedagogicalChunk[] {
  const chunks: PedagogicalChunk[] = [];
  const atomType = normalizeAtomType(atom.type);

  let textParts: string[] = [];

  switch (atomType) {
    case 'reading': {
      const content = atom.content as ReadingContent;
      const fullText = extractReadingText(content);
      textParts = chunkText(fullText);
      break;
    }

    case 'video': {
      const content = atom.content as VideoContent;
      const fullText = extractVideoText(content);
      textParts = chunkText(fullText);
      break;
    }

    case 'quiz': {
      // For quizzes, extract question content (separate from misconceptions)
      const content = atom.content as QuizContent;
      textParts = content.questions.map((q, i) => formatQuestionAsContent(q, i));
      break;
    }

    case 'practice': {
      const content = atom.content as PracticeContent;
      const fullText = extractPracticeText(content);
      textParts = chunkText(fullText);
      break;
    }
  }

  textParts.forEach((text, index) => {
    if (countWords(text) >= MIN_CHUNK_WORDS) {
      chunks.push({
        id: generateChunkId(
          'content',
          context.courseId,
          context.moduleId,
          context.lessonId,
          atom.id,
          `${index}`
        ),
        text: text.trim(),
        courseId: context.courseId,
        moduleId: context.moduleId,
        lessonId: context.lessonId,
        atomId: atom.id,
        atomType,
        title: atom.title,
        chunkIndex: index,
        chunkType: 'content',
        studentFriendly: true,
      });
    }
  });

  return chunks;
}

// ============================================
// TEXT EXTRACTION HELPERS
// ============================================

function extractReadingText(content: ReadingContent): string {
  const parts: string[] = [];
  if (content.body) parts.push(content.body);
  if (content.highlights?.length) {
    parts.push('Key Points:\n' + content.highlights.map((h) => `- ${h}`).join('\n'));
  }
  return parts.join('\n\n');
}

function extractVideoText(content: VideoContent): string {
  const parts: string[] = [];
  if (content.transcript) parts.push(content.transcript);
  if (content.keyTakeaways?.length) {
    parts.push('Key Takeaways:\n' + content.keyTakeaways.map((t) => `- ${t}`).join('\n'));
  }
  return parts.join('\n\n');
}

function extractPracticeText(content: PracticeContent): string {
  const parts: string[] = [];
  parts.push(`Practice: ${content.type}`);
  if (content.prompt) parts.push(`Prompt: ${content.prompt}`);
  if (content.context) parts.push(`Context: ${content.context}`);
  if (content.expectedOutcomes?.length) {
    parts.push('Expected Outcomes:\n' + content.expectedOutcomes.map((o) => `- ${o}`).join('\n'));
  }
  return parts.join('\n\n');
}

function formatQuestionAsContent(question: Question, index: number): string {
  const parts: string[] = [`Question ${index + 1}: ${question.question}`];

  if (question.options?.length) {
    parts.push('Options:');
    question.options.forEach((opt, i) => {
      parts.push(`  ${String.fromCharCode(65 + i)}. ${opt}`);
    });
  }

  if (question.explanation) {
    parts.push(`Explanation: ${question.explanation}`);
  }

  if (question.skills?.length) {
    parts.push(`Skills: ${question.skills.join(', ')}`);
  }

  return parts.join('\n');
}

function chunkText(text: string, maxWords: number = MAX_WORDS_PER_CHUNK): string[] {
  const words = text.split(/\s+/).filter((w) => w.length > 0);

  if (words.length <= maxWords) {
    return [text.trim()];
  }

  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += maxWords) {
    const chunk = words.slice(i, i + maxWords).join(' ');
    chunks.push(chunk);
  }

  return chunks;
}

function normalizeAtomType(type: string): 'reading' | 'video' | 'quiz' | 'practice' {
  const normalized = type.toLowerCase();
  if (normalized === 'reading' || normalized === 'text') return 'reading';
  if (normalized === 'video') return 'video';
  if (normalized === 'quiz' || normalized === 'assessment') return 'quiz';
  if (normalized === 'practice' || normalized === 'exercise' || normalized === 'project') return 'practice';
  return 'reading';
}

// ============================================
// MAIN CHUNKING FUNCTION
// ============================================

/**
 * Extract all pedagogical chunks from an atom
 *
 * Returns content chunks plus:
 * - Misconception chunks for quiz distractors
 * - Hint chunks for tiered interventions
 */
export function chunkAtomPedagogically(
  atom: Atom,
  context: {
    courseId: string;
    moduleId: string;
    lessonId: string;
  }
): PedagogicalChunk[] {
  const allChunks: PedagogicalChunk[] = [];

  // Extract standard content chunks
  const contentChunks = extractContentChunks(atom, context);
  allChunks.push(...contentChunks);

  // For quizzes, also extract misconception and hint chunks
  if (atom.type === 'quiz') {
    const quizContent = atom.content as QuizContent;

    quizContent.questions.forEach((question, questionIndex) => {
      // Misconception chunks per distractor
      const misconceptionChunks = extractMisconceptionChunks(
        question,
        questionIndex,
        {
          ...context,
          atomId: atom.id,
          atomTitle: atom.title,
        }
      );
      allChunks.push(...misconceptionChunks);

      // Hint chunks for tiered intervention
      const hintChunks = extractHintChunks(
        question,
        questionIndex,
        {
          ...context,
          atomId: atom.id,
          atomTitle: atom.title,
        }
      );
      allChunks.push(...hintChunks);
    });
  }

  return allChunks;
}

/**
 * Get chunking statistics
 */
export function getChunkStats(chunks: PedagogicalChunk[]): {
  total: number;
  byType: Record<ChunkType, number>;
  byAtomType: Record<string, number>;
} {
  const byType: Record<ChunkType, number> = {
    content: 0,
    misconception: 0,
    hint: 0,
    example: 0,
  };

  const byAtomType: Record<string, number> = {};

  for (const chunk of chunks) {
    byType[chunk.chunkType]++;
    byAtomType[chunk.atomType] = (byAtomType[chunk.atomType] || 0) + 1;
  }

  return {
    total: chunks.length,
    byType,
    byAtomType,
  };
}
