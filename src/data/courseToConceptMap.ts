/**
 * Course to Concept Mapping
 *
 * Maps course content (lessons, atoms) to concepts in the knowledge graph.
 * This enables:
 * - FSRS scheduling after atom completion
 * - Prerequisite checking for lessons
 * - Mastery gate enforcement
 */

import type { ConceptId } from '@/lib/mastery/knowledgeGraph';

// ============================================
// LESSON TO CONCEPT MAPPING
// ============================================

/**
 * Maps each lesson ID to the concept IDs it teaches
 */
export const LESSON_TO_CONCEPTS: Record<string, ConceptId[]> = {
  // Course 1: Introduction to Social Media Marketing
  'c1-m1-l1': ['smm-fundamentals'],
  'c1-m1-l2': ['platform-overview'],

  // Course 3: Social Media Advertising with Meta
  'c3-m1-l1': ['campaign-objectives', 'campaign-structure'],
  'c3-m1-l2': ['campaign-objectives'],

  // Default mappings for demo purposes
};

/**
 * Maps each atom ID to the concept IDs it reinforces
 */
export const ATOM_TO_CONCEPTS: Record<string, ConceptId[]> = {
  // Course 1, Module 1, Lesson 1 atoms
  'c1-m1-l1-a1': ['smm-fundamentals'],
  'c1-m1-l1-a2': ['smm-fundamentals'],
  'c1-m1-l1-a3': ['smm-fundamentals'],

  // Course 1, Module 1, Lesson 2 atoms
  'c1-m1-l2-a1': ['platform-overview'],
  'c1-m1-l2-a2': ['platform-overview'],

  // Course 3, Module 1, Lesson 1 atoms
  'c3-m1-l1-a1': ['campaign-structure'],
  'c3-m1-l1-a2': ['campaign-structure'],
  'c3-m1-l1-a3': ['campaign-structure'],

  // Course 3, Module 1, Lesson 2 atoms
  'c3-m1-l2-a1': ['campaign-objectives'],
  'c3-m1-l2-a2': ['campaign-objectives'],
};

/**
 * Maps lesson IDs to their prerequisite concept IDs
 * These must be mastered before the lesson is unlocked
 */
export const LESSON_PREREQUISITES: Record<string, ConceptId[]> = {
  // Course 1 - First lessons have no prerequisites
  'c1-m1-l1': [],
  'c1-m1-l2': ['smm-fundamentals'],

  // Course 3 - Requires fundamentals from Course 1 & 2
  'c3-m1-l1': ['smm-fundamentals', 'platform-overview'],
  'c3-m1-l2': ['campaign-structure'],
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get concepts associated with a specific atom
 * Falls back to lesson concepts if no atom mapping exists
 */
export function getConceptsForAtom(atomId: string): ConceptId[] {
  // Check direct atom mapping first
  if (ATOM_TO_CONCEPTS[atomId]) {
    return ATOM_TO_CONCEPTS[atomId];
  }

  // Try to extract lesson ID from atom ID (format: lessonId-aX)
  const lessonIdMatch = atomId.match(/^(.+)-a\d+$/);
  if (lessonIdMatch) {
    const lessonId = lessonIdMatch[1];
    if (LESSON_TO_CONCEPTS[lessonId]) {
      return LESSON_TO_CONCEPTS[lessonId];
    }
  }

  // Default: return empty array (no concept mapping)
  return [];
}

/**
 * Get concepts taught by a specific lesson
 */
export function getConceptsForLesson(lessonId: string): ConceptId[] {
  return LESSON_TO_CONCEPTS[lessonId] || [];
}

/**
 * Get prerequisite concepts for a specific lesson
 */
export function getPrerequisitesForLesson(lessonId: string): ConceptId[] {
  return LESSON_PREREQUISITES[lessonId] || [];
}

/**
 * Check if all prerequisites for a lesson are met
 */
export function areLessonPrerequisitesMet(
  lessonId: string,
  masteryLevels: Record<ConceptId, number>,
  threshold: number = 70
): boolean {
  const prerequisites = getPrerequisitesForLesson(lessonId);

  if (prerequisites.length === 0) {
    return true; // No prerequisites means always accessible
  }

  return prerequisites.every(conceptId => {
    const mastery = masteryLevels[conceptId] || 0;
    return mastery >= threshold;
  });
}

/**
 * Get missing prerequisites for a lesson
 * Returns concepts that haven't met the mastery threshold
 */
export function getMissingPrerequisites(
  lessonId: string,
  masteryLevels: Record<ConceptId, number>,
  threshold: number = 70
): ConceptId[] {
  const prerequisites = getPrerequisitesForLesson(lessonId);

  return prerequisites.filter(conceptId => {
    const mastery = masteryLevels[conceptId] || 0;
    return mastery < threshold;
  });
}
