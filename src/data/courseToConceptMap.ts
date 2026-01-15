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
  // === FSM Course (Social Media Marketing) ===
  'fsm-l1': ['smm-fundamentals'],
  'fsm-l2': ['platform-overview', 'audience-basics'],
  'fsm-l3': ['platform-overview', 'creative-fundamentals'],
  'fsm-l4': ['smm-fundamentals'],
  'fsm-l5': ['platform-overview'],
  'fsm-l6': ['campaign-objectives'],
  'fsm-l7': ['budget-basics'],

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
  // === FSM Course Atoms ===
  // Lesson 1: History of Facebook
  'fsm-l1-video': ['smm-fundamentals'],
  'fsm-l1-reading': ['smm-fundamentals'],
  'fsm-l1-quiz': ['smm-fundamentals'],

  // Lesson 2: Instagram Audience
  'fsm-l2-video': ['platform-overview', 'audience-basics'],
  'fsm-l2-reading': ['audience-basics'],
  'fsm-l2-quiz': ['platform-overview', 'audience-basics'],

  // Lesson 3: Snapchat Messaging
  'fsm-l3-video': ['platform-overview', 'creative-fundamentals'],
  'fsm-l3-reading': ['platform-overview'],
  'fsm-l3-quiz': ['platform-overview', 'creative-fundamentals'],

  // Lesson 4: Social Media Policy
  'fsm-l4-video': ['smm-fundamentals'],
  'fsm-l4-reading': ['smm-fundamentals'],
  'fsm-l4-quiz': ['smm-fundamentals'],

  // Lesson 5: Channel Selection
  'fsm-l5-video': ['platform-overview'],
  'fsm-l5-reading': ['platform-overview'],
  'fsm-l5-quiz': ['platform-overview'],

  // Lesson 6: Campaign Objectives
  'fsm-l6-video': ['campaign-objectives'],
  'fsm-l6-reading': ['campaign-objectives'],
  'fsm-l6-quiz': ['campaign-objectives'],

  // Lesson 7: Campaign Budgeting
  'fsm-l7-video': ['budget-basics'],
  'fsm-l7-reading': ['budget-basics'],
  'fsm-l7-quiz': ['budget-basics'],

  // === Legacy / Demo Mappings ===
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
  // === FSM Course Prerequisites ===
  'fsm-l1': [], // No prerequisites
  'fsm-l2': ['smm-fundamentals'], // Needs fundamentals
  'fsm-l3': ['smm-fundamentals', 'platform-overview'], // Needs platform knowledge
  'fsm-l4': ['smm-fundamentals'], // Needs fundamentals
  'fsm-l5': ['smm-fundamentals', 'audience-basics'], // Needs audience knowledge
  'fsm-l6': ['smm-fundamentals', 'platform-overview'], // Needs platform knowledge
  'fsm-l7': ['campaign-objectives'], // Needs objectives

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
