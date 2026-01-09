/**
 * Dynamic Skill Map Types
 *
 * Types for AI-powered dynamic skill map generation.
 * Extends the existing BKT types to support:
 * - AI-generated skill maps with metadata
 * - Parsed course content for AI analysis
 * - Version control and approval workflow
 */

// Re-export core types from BKT for convenience
export {
  type BKTParameters,
  type Skill,
  type SkillMap,
  type SkillState,
  type SkillHistoryEntry,
  DEFAULT_BKT_PARAMS,
  EASY_BKT_PARAMS,
  HARD_BKT_PARAMS,
} from '@/lib/mastery/bkt';

import type { BKTParameters, Skill } from '@/lib/mastery/bkt';

// ============================================
// DYNAMIC SKILL MAP TYPES
// ============================================

/**
 * Status of a dynamically generated skill map
 */
export type SkillMapStatus = 'draft' | 'approved' | 'active';

/**
 * Who/what generated the skill map
 */
export type SkillMapGenerator = 'ai' | 'manual';

/**
 * Metadata about skill map generation
 */
export interface SkillMapMetadata {
  generatedAt: Date;
  generatedBy: SkillMapGenerator;
  model?: string; // e.g., "gemini-2.0-flash-exp"
  promptVersion?: string; // Version of the prompt used
  approvedAt?: Date;
  approvedBy?: string; // User ID who approved
}

/**
 * Dynamic skill map - extends SkillMap with metadata for AI generation
 *
 * Skill IDs follow pattern: `{courseId}-{moduleNum}-{skillNum}`
 * Example: "course-1-M1-01" for first skill in module 1 of course-1
 */
export interface DynamicSkillMap {
  id: string; // e.g., "course-1-skillmap"
  courseId: string; // Reference to course
  version: number; // For versioning (increments on regeneration)
  status: SkillMapStatus;
  skills: Record<string, Skill>; // Same structure as existing SkillMap
  metadata: SkillMapMetadata;
  // Timestamps for Firestore
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// PARSED COURSE CONTENT TYPES
// ============================================

/**
 * Parsed question from quiz atoms
 */
export interface ParsedQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  difficulty?: number;
  skill?: string; // Existing skill mapping if available
}

/**
 * Parsed atom (learning content unit)
 */
export interface ParsedAtom {
  id: string;
  type: 'video' | 'reading' | 'quiz' | 'practice';
  title: string;
  content: string; // Text content, transcript, or body
  questions?: ParsedQuestion[]; // For quiz atoms
  keyTakeaways?: string[]; // For video/reading atoms
  estimatedMinutes?: number;
}

/**
 * Parsed lesson
 */
export interface ParsedLesson {
  id: string;
  title: string;
  objectives: string[];
  atoms: ParsedAtom[];
  estimatedMinutes?: number;
}

/**
 * Parsed module
 */
export interface ParsedModule {
  id: string;
  number: number;
  title: string;
  objectives: string[];
  lessons: ParsedLesson[];
  estimatedMinutes?: number;
}

/**
 * Parsed course content - input to AI skill map generator
 *
 * This is the structured extraction of course content
 * that gets sent to Gemini for skill extraction.
 */
export interface ParsedCourseContent {
  courseId: string;
  title: string;
  description?: string;
  objectives: string[];
  modules: ParsedModule[];
  // Summary stats
  totalModules: number;
  totalLessons: number;
  totalAtoms: number;
}

// ============================================
// SKILL EXTRACTION TYPES
// ============================================

/**
 * AI-extracted skill before BKT parameters are assigned
 */
export interface ExtractedSkill {
  id: string;
  name: string;
  description: string;
  lessonId: string;
  moduleId: string;
  prerequisites: string[]; // Other skill IDs
  difficulty: 'easy' | 'medium' | 'hard';
  bloomLevel: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
}

/**
 * Result from AI skill extraction
 */
export interface SkillExtractionResult {
  courseId: string;
  extractedSkills: ExtractedSkill[];
  model: string;
  timestamp: Date;
  promptTokens?: number;
  completionTokens?: number;
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Map BKT parameters based on difficulty
 */
export function getBKTParamsForDifficulty(difficulty: ExtractedSkill['difficulty']): BKTParameters {
  // Import defaults inline to avoid circular deps
  const EASY: BKTParameters = { pL0: 0.2, pT: 0.4, pG: 0.25, pS: 0.05 };
  const MEDIUM: BKTParameters = { pL0: 0.1, pT: 0.3, pG: 0.25, pS: 0.1 };
  const HARD: BKTParameters = { pL0: 0.05, pT: 0.2, pG: 0.2, pS: 0.15 };

  switch (difficulty) {
    case 'easy':
      return EASY;
    case 'hard':
      return HARD;
    case 'medium':
    default:
      return MEDIUM;
  }
}

/**
 * Convert extracted skill to full Skill with BKT params
 */
export function extractedSkillToSkill(extracted: ExtractedSkill): Skill {
  return {
    id: extracted.id,
    name: extracted.name,
    lessonId: extracted.lessonId,
    prerequisites: extracted.prerequisites,
    bktParams: getBKTParamsForDifficulty(extracted.difficulty),
  };
}
