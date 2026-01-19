/**
 * Question Bank
 *
 * Extracts and indexes all quiz questions from course data.
 * Provides functions to retrieve questions by skill, difficulty, etc.
 * Used by QuizAgent to get real questions instead of placeholders.
 */

import type { Question } from '@/types';
import { getAllCourses } from './courseRegistry';

// ============================================
// TYPES
// ============================================

export interface IndexedQuestion extends Question {
  /** Unique global ID for the question */
  globalId: string;
  /** Course this question belongs to */
  courseId: string;
  /** Module this question belongs to */
  moduleId: string;
  /** Lesson this question belongs to */
  lessonId: string;
  /** Atom (quiz) this question belongs to */
  atomId: string;
}

interface QuestionIndex {
  /** All questions indexed by global ID */
  byId: Map<string, IndexedQuestion>;
  /** Questions indexed by skill ID */
  bySkill: Map<string, IndexedQuestion[]>;
  /** Questions indexed by difficulty level */
  byDifficulty: Map<number, IndexedQuestion[]>;
  /** Questions indexed by course ID */
  byCourse: Map<string, IndexedQuestion[]>;
}

// ============================================
// QUESTION INDEX (lazy-loaded singleton)
// ============================================

let questionIndex: QuestionIndex | null = null;

/**
 * Build the question index from all course data
 */
function buildQuestionIndex(): QuestionIndex {
  const index: QuestionIndex = {
    byId: new Map(),
    bySkill: new Map(),
    byDifficulty: new Map(),
    byCourse: new Map(),
  };

  const courses = getAllCourses();

  for (const course of courses) {
    const courseQuestions: IndexedQuestion[] = [];

    for (const mod of course.modules) {
      for (const lesson of mod.lessons) {
        for (const atom of lesson.atoms) {
          // Only process quiz atoms
          if (atom.type !== 'quiz') continue;

          const quizContent = atom.content as { questions: Question[]; passingScore: number };
          if (!quizContent.questions) continue;

          for (const question of quizContent.questions) {
            // Create a globally unique ID
            const globalId = `${course.id}-${mod.id}-${lesson.id}-${atom.id}-${question.id}`;

            const indexedQuestion: IndexedQuestion = {
              ...question,
              globalId,
              courseId: course.id,
              moduleId: mod.id,
              lessonId: lesson.id,
              atomId: atom.id,
            };

            // Index by ID
            index.byId.set(globalId, indexedQuestion);

            // Index by course
            courseQuestions.push(indexedQuestion);

            // Index by skill
            for (const skill of question.skills || []) {
              const skillQuestions = index.bySkill.get(skill) || [];
              skillQuestions.push(indexedQuestion);
              index.bySkill.set(skill, skillQuestions);
            }

            // Index by difficulty
            const difficulty = question.difficulty || 2;
            const diffQuestions = index.byDifficulty.get(difficulty) || [];
            diffQuestions.push(indexedQuestion);
            index.byDifficulty.set(difficulty, diffQuestions);
          }
        }
      }
    }

    index.byCourse.set(course.id, courseQuestions);
  }

  return index;
}

/**
 * Get the question index (builds it on first call)
 */
function getQuestionIndex(): QuestionIndex {
  if (!questionIndex) {
    questionIndex = buildQuestionIndex();
  }
  return questionIndex;
}

// ============================================
// QUERY FUNCTIONS
// ============================================

/**
 * Get all available questions
 */
export function getAllQuestions(): IndexedQuestion[] {
  const index = getQuestionIndex();
  return Array.from(index.byId.values());
}

/**
 * Get a question by its global ID
 */
export function getQuestionById(globalId: string): IndexedQuestion | undefined {
  const index = getQuestionIndex();
  return index.byId.get(globalId);
}

/**
 * Get questions for a specific skill
 */
export function getQuestionsBySkill(skillId: string): IndexedQuestion[] {
  const index = getQuestionIndex();
  return index.bySkill.get(skillId) || [];
}

/**
 * Get questions by difficulty level (1-5)
 */
export function getQuestionsByDifficulty(difficulty: number): IndexedQuestion[] {
  const index = getQuestionIndex();
  return index.byDifficulty.get(difficulty) || [];
}

/**
 * Get questions for a specific course
 */
export function getQuestionsByCourse(courseId: string): IndexedQuestion[] {
  const index = getQuestionIndex();
  return index.byCourse.get(courseId) || [];
}

/**
 * Get questions matching criteria with optional filtering
 */
export function queryQuestions(options: {
  skillId?: string;
  difficulty?: number;
  courseId?: string;
  excludeIds?: string[];
  limit?: number;
}): IndexedQuestion[] {
  let results: IndexedQuestion[] = getAllQuestions();

  // Filter by skill
  if (options.skillId) {
    const skillQuestions = new Set(getQuestionsBySkill(options.skillId).map(q => q.globalId));
    results = results.filter(q => skillQuestions.has(q.globalId));
  }

  // Filter by difficulty (with tolerance of ±1)
  if (options.difficulty !== undefined) {
    const targetDiff = Math.max(1, Math.min(5, Math.round(options.difficulty * 5)));
    results = results.filter(q => {
      const qDiff = q.difficulty || 2;
      return Math.abs(qDiff - targetDiff) <= 1;
    });
  }

  // Filter by course
  if (options.courseId) {
    results = results.filter(q => q.courseId === options.courseId);
  }

  // Exclude specific questions
  if (options.excludeIds && options.excludeIds.length > 0) {
    const excludeSet = new Set(options.excludeIds);
    results = results.filter(q => !excludeSet.has(q.globalId));
  }

  // Shuffle results for variety
  results = shuffleArray(results);

  // Limit results
  if (options.limit && options.limit > 0) {
    results = results.slice(0, options.limit);
  }

  return results;
}

/**
 * Get a random question matching criteria
 */
export function getRandomQuestion(options: {
  skillId?: string;
  difficulty?: number;
  courseId?: string;
  excludeIds?: string[];
}): IndexedQuestion | undefined {
  const questions = queryQuestions({ ...options, limit: 1 });
  return questions[0];
}

/**
 * Get question count statistics
 */
export function getQuestionStats(): {
  total: number;
  bySkill: Record<string, number>;
  byDifficulty: Record<number, number>;
  byCourse: Record<string, number>;
} {
  const index = getQuestionIndex();

  const bySkill: Record<string, number> = {};
  index.bySkill.forEach((questions, skill) => {
    bySkill[skill] = questions.length;
  });

  const byDifficulty: Record<number, number> = {};
  index.byDifficulty.forEach((questions, diff) => {
    byDifficulty[diff] = questions.length;
  });

  const byCourse: Record<string, number> = {};
  index.byCourse.forEach((questions, course) => {
    byCourse[course] = questions.length;
  });

  return {
    total: index.byId.size,
    bySkill,
    byDifficulty,
    byCourse,
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Convert question difficulty (1-5) to normalized value (0-1)
 */
export function normalizeDifficulty(difficulty: number): number {
  return (difficulty - 1) / 4; // 1->0, 2->0.25, 3->0.5, 4->0.75, 5->1
}

/**
 * Convert normalized difficulty (0-1) to question difficulty (1-5)
 */
export function denormalizeDifficulty(normalized: number): number {
  return Math.round(normalized * 4) + 1; // 0->1, 0.25->2, 0.5->3, 0.75->4, 1->5
}

/**
 * Invalidate the cached question index (call if course data changes)
 */
export function invalidateQuestionIndex(): void {
  questionIndex = null;
}
