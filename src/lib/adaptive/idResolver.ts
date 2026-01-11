/**
 * ID Resolver - Maps sequencer item IDs to actual content IDs
 *
 * The sequencer generates IDs like:
 * - "lesson-1.1" for lessons
 * - "quiz-1.1-M1-genai-definition" for quizzes
 * - "practice-M1-genai-definition" for practice
 * - "review-M1-genai-definition" for reviews
 *
 * The actual course content uses IDs like:
 * - "1.1", "1.2", "2.1" for lessons
 *
 * This module bridges the gap.
 */

export type ContentType = 'lesson' | 'quiz' | 'practice' | 'review';

export interface ParsedItemId {
  type: ContentType;
  lessonId: string;
  skillId?: string;
}

/**
 * Parse a sequencer item ID into its components
 *
 * Examples:
 * - "lesson-1.1" → { type: 'lesson', lessonId: '1.1' }
 * - "quiz-1.1-M1-genai-definition" → { type: 'quiz', lessonId: '1.1', skillId: 'M1-genai-definition' }
 * - "practice-M1-genai-definition" → { type: 'practice', lessonId: '', skillId: 'M1-genai-definition' }
 * - "review-M1-genai-definition" → { type: 'review', lessonId: '', skillId: 'M1-genai-definition' }
 * - "1.1" → { type: 'lesson', lessonId: '1.1' } (bare lesson ID)
 */
export function parseSequencerItemId(itemId: string): ParsedItemId {
  // Handle lesson- prefix
  if (itemId.startsWith('lesson-')) {
    return {
      type: 'lesson',
      lessonId: itemId.replace('lesson-', ''),
    };
  }

  // Handle quiz- prefix: "quiz-1.1-M1-genai-definition"
  if (itemId.startsWith('quiz-')) {
    const parts = itemId.replace('quiz-', '').split('-');
    // First part is the lesson ID (e.g., "1.1")
    const lessonId = parts[0];
    // Rest is the skill ID joined back together
    const skillId = parts.slice(1).join('-');
    return {
      type: 'quiz',
      lessonId,
      skillId,
    };
  }

  // Handle practice- prefix
  if (itemId.startsWith('practice-')) {
    return {
      type: 'practice',
      lessonId: '',
      skillId: itemId.replace('practice-', ''),
    };
  }

  // Handle review- prefix
  if (itemId.startsWith('review-')) {
    return {
      type: 'review',
      lessonId: '',
      skillId: itemId.replace('review-', ''),
    };
  }

  // If no prefix, assume it's a bare lesson ID (e.g., "1.1")
  // Check if it looks like a lesson ID (contains a dot with numbers)
  if (/^\d+\.\d+$/.test(itemId)) {
    return {
      type: 'lesson',
      lessonId: itemId,
    };
  }

  // Default fallback: treat as lesson
  return {
    type: 'lesson',
    lessonId: itemId,
  };
}

/**
 * Extract just the lesson ID from a sequencer item ID
 */
export function getLessonIdFromItemId(itemId: string): string {
  const parsed = parseSequencerItemId(itemId);
  return parsed.lessonId;
}

/**
 * Get the content type from a sequencer item ID
 */
export function getContentTypeFromItemId(itemId: string): ContentType {
  const parsed = parseSequencerItemId(itemId);
  return parsed.type;
}

/**
 * Check if an item ID represents a lesson
 */
export function isLessonItem(itemId: string): boolean {
  return getContentTypeFromItemId(itemId) === 'lesson';
}

/**
 * Check if an item ID represents a review
 */
export function isReviewItem(itemId: string): boolean {
  return getContentTypeFromItemId(itemId) === 'review';
}

/**
 * Build a sequencer item ID from components
 * (inverse of parseSequencerItemId)
 */
export function buildItemId(type: ContentType, lessonId: string, skillId?: string): string {
  switch (type) {
    case 'lesson':
      return `lesson-${lessonId}`;
    case 'quiz':
      return `quiz-${lessonId}-${skillId}`;
    case 'practice':
      return `practice-${skillId}`;
    case 'review':
      return `review-${skillId}`;
  }
}
