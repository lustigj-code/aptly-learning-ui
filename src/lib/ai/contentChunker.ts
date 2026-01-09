/**
 * Content Chunker
 * Transforms course content into chunks suitable for embedding and retrieval
 *
 * Part of Phase 02: RAG Knowledge Base
 *
 * Chunks FSM course content (atoms, lessons) into appropriately sized pieces
 * for vector embedding and semantic search.
 */

import type {
  Atom,
  Lesson,
  ReadingContent,
  VideoContent,
  QuizContent,
  PracticeContent,
  Question,
} from '@/types';

// ============================================
// TYPES
// ============================================

export type ContentChunk = {
  id: string; // Unique ID: {courseId}_{moduleId}_{lessonId}_{atomId}_{chunkIndex}
  text: string; // The chunk content
  courseId: string;
  moduleId: string;
  lessonId: string;
  atomId: string;
  atomType: 'reading' | 'video' | 'quiz' | 'practice';
  title: string; // Lesson or atom title
  chunkIndex: number; // Position within atom
};

export type LessonContext = {
  courseId: string;
  moduleId: string;
  lessonId: string;
  lessonTitle: string;
  lessonObjectives?: string[];
};

// ============================================
// CONFIGURATION
// ============================================

const MAX_WORDS_PER_CHUNK = 500;
const OVERLAP_WORDS = 50;
const MIN_CHUNK_WORDS = 20; // Skip very short chunks

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Estimate token count from text
 * Rough estimate: tokens are approximately 1.3x word count
 * Used to keep chunks under embedding model's limit (2048 tokens for text-embedding-004)
 */
export function estimateTokens(text: string): number {
  const words = countWords(text);
  return Math.ceil(words * 1.3);
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

/**
 * Generate a unique chunk ID
 */
function generateChunkId(
  courseId: string,
  moduleId: string,
  lessonId: string,
  atomId: string,
  chunkIndex: number
): string {
  return `${courseId}_${moduleId}_${lessonId}_${atomId}_${chunkIndex}`;
}

/**
 * Split text into paragraphs
 */
function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Split text by section headers (markdown-style ## or ###)
 */
function splitBySections(text: string): string[] {
  const sections = text.split(/(?=^##+ )/gm);
  return sections.map((s) => s.trim()).filter((s) => s.length > 0);
}

/**
 * Split text into chunks of approximately maxWords, with overlap
 */
function chunkTextWithOverlap(
  text: string,
  maxWords: number = MAX_WORDS_PER_CHUNK,
  overlapWords: number = OVERLAP_WORDS
): string[] {
  const words = text.split(/\s+/).filter((w) => w.length > 0);

  if (words.length <= maxWords) {
    return [text.trim()];
  }

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < words.length) {
    const endIndex = Math.min(startIndex + maxWords, words.length);
    const chunkWords = words.slice(startIndex, endIndex);
    chunks.push(chunkWords.join(' '));

    // Move start index, but include overlap
    startIndex = endIndex - overlapWords;

    // If remaining is less than minWords + overlap, include in last chunk
    if (words.length - startIndex < MIN_CHUNK_WORDS + overlapWords) {
      break;
    }
  }

  // Handle any remaining words
  if (startIndex < words.length) {
    const remaining = words.slice(startIndex);
    if (remaining.length >= MIN_CHUNK_WORDS) {
      chunks.push(remaining.join(' '));
    } else if (chunks.length > 0) {
      // Append to last chunk if too short
      chunks[chunks.length - 1] += ' ' + remaining.join(' ');
    }
  }

  return chunks.filter((c) => countWords(c) >= MIN_CHUNK_WORDS);
}

// ============================================
// CONTENT EXTRACTORS
// ============================================

/**
 * Extract text content from reading atom
 */
function extractReadingContent(content: ReadingContent): string {
  const parts: string[] = [];

  if (content.body) {
    parts.push(content.body);
  }

  if (content.highlights && content.highlights.length > 0) {
    parts.push('\nKey Highlights:\n' + content.highlights.map((h) => `- ${h}`).join('\n'));
  }

  return parts.join('\n\n');
}

/**
 * Extract text content from video atom (transcript or description)
 */
function extractVideoContent(content: VideoContent): string {
  const parts: string[] = [];

  if (content.transcript) {
    parts.push(content.transcript);
  }

  if (content.keyTakeaways && content.keyTakeaways.length > 0) {
    parts.push('\nKey Takeaways:\n' + content.keyTakeaways.map((t) => `- ${t}`).join('\n'));
  }

  // If no transcript, create a summary from chapters
  if (!content.transcript && content.chapters && content.chapters.length > 0) {
    parts.push(
      'Video Chapters:\n' + content.chapters.map((c) => `- ${c.title} (${c.time}s)`).join('\n')
    );
  }

  return parts.join('\n\n');
}

/**
 * Extract text content from quiz atom (questions with options)
 */
function extractQuizContent(content: QuizContent): string[] {
  // Each question becomes a separate chunk
  return content.questions.map((question: Question) => {
    const parts: string[] = [`Question: ${question.question}`];

    if (question.options && question.options.length > 0) {
      parts.push('Options:');
      question.options.forEach((opt, i) => {
        parts.push(`  ${String.fromCharCode(65 + i)}. ${opt}`);
      });
    }

    if (question.explanation) {
      parts.push(`Explanation: ${question.explanation}`);
    }

    if (question.skills && question.skills.length > 0) {
      parts.push(`Related Skills: ${question.skills.join(', ')}`);
    }

    return parts.join('\n');
  });
}

/**
 * Extract text content from practice atom
 */
function extractPracticeContent(content: PracticeContent): string {
  const parts: string[] = [];

  parts.push(`Practice Exercise: ${content.type}`);

  if (content.prompt) {
    parts.push(`Prompt: ${content.prompt}`);
  }

  if (content.context) {
    parts.push(`Context: ${content.context}`);
  }

  if (content.expectedOutcomes && content.expectedOutcomes.length > 0) {
    parts.push('Expected Outcomes:');
    content.expectedOutcomes.forEach((outcome) => {
      parts.push(`- ${outcome}`);
    });
  }

  if (content.rubric && content.rubric.length > 0) {
    parts.push('Evaluation Criteria:');
    content.rubric.forEach((item) => {
      parts.push(`- ${item.criterion} (${Math.round(item.weight * 100)}%)`);
    });
  }

  return parts.join('\n');
}

// ============================================
// MAIN CHUNKING FUNCTIONS
// ============================================

/**
 * Chunk a single atom into content chunks
 *
 * @param atom - The atom to chunk
 * @param lessonContext - Context about the lesson containing this atom
 * @returns Array of content chunks
 */
export function chunkAtom(
  atom: Atom,
  lessonContext: { courseId: string; moduleId: string; lessonId: string }
): ContentChunk[] {
  const { courseId, moduleId, lessonId } = lessonContext;
  const chunks: ContentChunk[] = [];

  // Determine atom type (normalize to our supported types)
  const atomType = normalizeAtomType(atom.type);

  // Extract text based on atom type
  let textParts: string[] = [];

  switch (atomType) {
    case 'reading': {
      const content = atom.content as ReadingContent;
      const fullText = extractReadingContent(content);

      // If content is small enough, keep it as one chunk
      if (countWords(fullText) <= MAX_WORDS_PER_CHUNK) {
        textParts = [fullText.trim()];
      } else {
        // Try to split by sections first, then by paragraphs
        const sections = splitBySections(fullText);
        if (sections.length > 1) {
          textParts = sections.flatMap((section) => chunkTextWithOverlap(section));
        } else {
          // Split long content while preserving context
          textParts = chunkTextWithOverlap(fullText);
        }
      }
      break;
    }

    case 'video': {
      const content = atom.content as VideoContent;
      const fullText = extractVideoContent(content);
      textParts = chunkTextWithOverlap(fullText);
      break;
    }

    case 'quiz': {
      const content = atom.content as QuizContent;
      // Each question is its own chunk
      textParts = extractQuizContent(content);
      break;
    }

    case 'practice': {
      const content = atom.content as PracticeContent;
      const fullText = extractPracticeContent(content);
      textParts = chunkTextWithOverlap(fullText);
      break;
    }

    default:
      // For unknown types, try to extract any string content
      if (typeof atom.content === 'string') {
        textParts = chunkTextWithOverlap(atom.content);
      }
  }

  // Convert text parts to chunks
  textParts.forEach((text, index) => {
    if (countWords(text) >= MIN_CHUNK_WORDS) {
      chunks.push({
        id: generateChunkId(courseId, moduleId, lessonId, atom.id, index),
        text: text.trim(),
        courseId,
        moduleId,
        lessonId,
        atomId: atom.id,
        atomType,
        title: atom.title,
        chunkIndex: index,
      });
    }
  });

  return chunks;
}

/**
 * Chunk an entire lesson into content chunks
 * Prepends lesson title and objectives to the first chunk
 *
 * @param lesson - The lesson to chunk
 * @param context - Context about the course and module
 * @returns Array of content chunks from all atoms
 */
export function chunkLesson(
  lesson: Lesson,
  context: { courseId: string; moduleId: string }
): ContentChunk[] {
  const { courseId, moduleId } = context;
  const lessonContext = {
    courseId,
    moduleId,
    lessonId: lesson.id,
  };

  // Process all atoms
  const allChunks: ContentChunk[] = [];

  for (const atom of lesson.atoms) {
    const atomChunks = chunkAtom(atom, lessonContext);
    allChunks.push(...atomChunks);
  }

  // Prepend lesson metadata to the first chunk
  if (allChunks.length > 0) {
    const lessonHeader = buildLessonHeader(lesson);
    allChunks[0].text = lessonHeader + '\n\n' + allChunks[0].text;

    // Update title to include lesson title
    allChunks[0].title = `${lesson.title} - ${allChunks[0].title}`;
  } else {
    // If no atom chunks, create a single chunk with lesson metadata
    const lessonHeader = buildLessonHeader(lesson);
    if (countWords(lessonHeader) >= MIN_CHUNK_WORDS) {
      allChunks.push({
        id: generateChunkId(courseId, moduleId, lesson.id, 'metadata', 0),
        text: lessonHeader,
        courseId,
        moduleId,
        lessonId: lesson.id,
        atomId: 'metadata',
        atomType: 'reading',
        title: lesson.title,
        chunkIndex: 0,
      });
    }
  }

  return allChunks;
}

/**
 * Build a header string with lesson metadata
 */
function buildLessonHeader(lesson: Lesson): string {
  const parts: string[] = [`Lesson: ${lesson.title}`];

  if (lesson.objectives && lesson.objectives.length > 0) {
    parts.push('Learning Objectives:');
    lesson.objectives.forEach((obj) => {
      parts.push(`- ${obj}`);
    });
  }

  if (lesson.estimatedMinutes) {
    parts.push(`Estimated Time: ${lesson.estimatedMinutes} minutes`);
  }

  return parts.join('\n');
}

/**
 * Normalize atom type to our supported types
 */
function normalizeAtomType(type: string): 'reading' | 'video' | 'quiz' | 'practice' {
  const normalizedType = type.toLowerCase();

  if (normalizedType === 'reading' || normalizedType === 'text') {
    return 'reading';
  }
  if (normalizedType === 'video') {
    return 'video';
  }
  if (normalizedType === 'quiz' || normalizedType === 'assessment') {
    return 'quiz';
  }
  if (normalizedType === 'practice' || normalizedType === 'exercise' || normalizedType === 'project') {
    return 'practice';
  }

  // Default to reading for unknown types
  return 'reading';
}

/**
 * Get chunking configuration
 * Useful for debugging and documentation
 */
export function getChunkingConfig(): {
  maxWordsPerChunk: number;
  overlapWords: number;
  minChunkWords: number;
} {
  return {
    maxWordsPerChunk: MAX_WORDS_PER_CHUNK,
    overlapWords: OVERLAP_WORDS,
    minChunkWords: MIN_CHUNK_WORDS,
  };
}
