/**
 * Course Content Parser
 *
 * Extracts structured content from courses for AI skill map generation.
 * Parses the nested structure: course → module → lesson → atoms
 * and extracts text content suitable for AI analysis.
 */

import { COURSES, COURSE_1_MODULE_1, COURSE_3_MODULE_1 } from '@/data/mockData';
import type {
  ParsedCourseContent,
  ParsedModule,
  ParsedLesson,
  ParsedAtom,
  ParsedQuestion,
} from './types';
import type { Course, Module, Lesson, Atom } from '@/types';

// ============================================
// MODULE REGISTRY
// ============================================

/**
 * Map of course IDs to their detailed modules
 * In production, this would come from Firestore
 */
const MODULE_REGISTRY: Record<string, Module[]> = {
  'course-1': [COURSE_1_MODULE_1],
  'course-3': [COURSE_3_MODULE_1],
};

// ============================================
// CONTENT EXTRACTION HELPERS
// ============================================

/**
 * Extract text content from a video atom
 */
function extractVideoContent(atom: Atom): string {
  const content = atom.content as {
    transcript?: string;
    keyTakeaways?: string[];
    chapters?: { title: string }[];
  };

  const parts: string[] = [];

  // Add transcript if available
  if (content.transcript) {
    parts.push(content.transcript);
  }

  // Add key takeaways
  if (content.keyTakeaways?.length) {
    parts.push('Key Takeaways:');
    parts.push(...content.keyTakeaways.map((t) => `- ${t}`));
  }

  // Add chapter titles for context
  if (content.chapters?.length) {
    parts.push('Topics covered:');
    parts.push(...content.chapters.map((c) => `- ${c.title}`));
  }

  // Fallback to title if no content
  if (parts.length === 0) {
    parts.push(atom.title);
  }

  return parts.join('\n');
}

/**
 * Extract text content from a reading atom
 */
function extractReadingContent(atom: Atom): string {
  const content = atom.content as {
    body?: string;
    highlights?: string[];
  };

  const parts: string[] = [];

  // Add body content (markdown)
  if (content.body) {
    parts.push(content.body);
  }

  // Add highlights
  if (content.highlights?.length) {
    parts.push('\nHighlights:');
    parts.push(...content.highlights.map((h) => `- ${h}`));
  }

  // Fallback to title
  if (parts.length === 0) {
    parts.push(atom.title);
  }

  return parts.join('\n');
}

/**
 * Extract questions from a quiz atom
 */
function extractQuestions(atom: Atom): ParsedQuestion[] {
  const content = atom.content as {
    questions?: Array<{
      id: string;
      question: string;
      options: string[];
      correctAnswer: number;
      explanation?: string;
      difficulty?: number;
      skills?: string[];
    }>;
  };

  if (!content.questions?.length) {
    return [];
  }

  return content.questions.map((q) => ({
    id: q.id,
    question: q.question,
    options: q.options,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
    difficulty: q.difficulty,
    skill: q.skills?.[0], // Take first skill if mapped
  }));
}

/**
 * Extract text content from a quiz atom
 */
function extractQuizContent(atom: Atom): string {
  const questions = extractQuestions(atom);

  if (questions.length === 0) {
    return atom.title;
  }

  const parts: string[] = [`Quiz: ${atom.title}`];

  questions.forEach((q, i) => {
    parts.push(`\nQuestion ${i + 1}: ${q.question}`);
    q.options.forEach((opt, j) => {
      const marker = j === q.correctAnswer ? '✓' : ' ';
      parts.push(`  ${marker} ${opt}`);
    });
    if (q.explanation) {
      parts.push(`  Explanation: ${q.explanation}`);
    }
  });

  return parts.join('\n');
}

/**
 * Extract text content from a practice atom
 */
function extractPracticeContent(atom: Atom): string {
  const content = atom.content as {
    prompt?: string;
    context?: string;
    expectedOutcomes?: string[];
  };

  const parts: string[] = [`Practice: ${atom.title}`];

  if (content.prompt) {
    parts.push(`\nPrompt: ${content.prompt}`);
  }

  if (content.context) {
    parts.push(`Context: ${content.context}`);
  }

  if (content.expectedOutcomes?.length) {
    parts.push('\nExpected Outcomes:');
    parts.push(...content.expectedOutcomes.map((o) => `- ${o}`));
  }

  return parts.join('\n');
}

/**
 * Extract text content from a project atom
 */
function extractProjectContent(atom: Atom): string {
  const content = atom.content as {
    description?: string;
    instructions?: string;
    requirements?: string[];
    deliverables?: string[];
  };

  const parts: string[] = [`Project: ${atom.title}`];

  if (content.description) {
    parts.push(`\nDescription: ${content.description}`);
  }

  if (content.instructions) {
    parts.push(`\nInstructions: ${content.instructions}`);
  }

  if (content.requirements?.length) {
    parts.push('\nRequirements:');
    parts.push(...content.requirements.map((r) => `- ${r}`));
  }

  if (content.deliverables?.length) {
    parts.push('\nDeliverables:');
    parts.push(...content.deliverables.map((d) => `- ${d}`));
  }

  return parts.join('\n');
}

/**
 * Extract text content from any atom type
 */
function extractAtomContent(atom: Atom): string {
  switch (atom.type) {
    case 'video':
      return extractVideoContent(atom);
    case 'reading':
      return extractReadingContent(atom);
    case 'quiz':
      return extractQuizContent(atom);
    case 'practice':
      return extractPracticeContent(atom);
    case 'project':
      return extractProjectContent(atom);
    default:
      return atom.title;
  }
}

// ============================================
// PARSING FUNCTIONS
// ============================================

/**
 * Parse a single atom into structured format
 */
function parseAtom(atom: Atom): ParsedAtom {
  const parsed: ParsedAtom = {
    id: atom.id,
    type: atom.type,
    title: atom.title,
    content: extractAtomContent(atom),
    estimatedMinutes: atom.estimatedMinutes,
  };

  // Add questions for quiz atoms
  if (atom.type === 'quiz') {
    parsed.questions = extractQuestions(atom);
  }

  // Add key takeaways for video/reading
  if (atom.type === 'video' || atom.type === 'reading') {
    const content = atom.content as { keyTakeaways?: string[] };
    if (content.keyTakeaways?.length) {
      parsed.keyTakeaways = content.keyTakeaways;
    }
  }

  return parsed;
}

/**
 * Parse a lesson into structured format
 */
function parseLesson(lesson: Lesson): ParsedLesson {
  return {
    id: lesson.id,
    title: lesson.title,
    objectives: lesson.objectives,
    atoms: lesson.atoms.map(parseAtom),
    estimatedMinutes: lesson.estimatedMinutes,
  };
}

/**
 * Parse a module into structured format
 */
function parseModule(module: Module): ParsedModule {
  return {
    id: module.id,
    number: module.number,
    title: module.title,
    objectives: module.objectives,
    lessons: module.lessons.map(parseLesson),
    estimatedMinutes: module.estimatedMinutes,
  };
}

/**
 * Get course by ID from the COURSES array
 */
function getCourseById(courseId: string): Course | undefined {
  return COURSES.find((c) => c.id === courseId);
}

/**
 * Get detailed modules for a course
 */
function getModulesForCourse(courseId: string): Module[] {
  // First check the module registry
  const registeredModules = MODULE_REGISTRY[courseId];
  if (registeredModules?.length) {
    return registeredModules;
  }

  // Fallback to modules on the course object
  const course = getCourseById(courseId);
  if (course?.modules?.length) {
    return course.modules;
  }

  return [];
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Parse a single course into structured format for AI analysis
 *
 * @param courseId - The ID of the course to parse
 * @returns Parsed course content or null if not found
 *
 * @example
 * const content = parseCourse('course-1');
 * // content.modules contains structured lesson/atom data
 */
export function parseCourse(courseId: string): ParsedCourseContent | null {
  const course = getCourseById(courseId);

  if (!course) {
    console.warn(`[courseParser] Course not found: ${courseId}`);
    return null;
  }

  const modules = getModulesForCourse(courseId);
  const parsedModules = modules.map(parseModule);

  // Calculate totals
  const totalLessons = parsedModules.reduce((sum, m) => sum + m.lessons.length, 0);
  const totalAtoms = parsedModules.reduce(
    (sum, m) => sum + m.lessons.reduce((lsum, l) => lsum + l.atoms.length, 0),
    0
  );

  const parsed: ParsedCourseContent = {
    courseId: course.id,
    title: course.title,
    description: course.description,
    objectives: course.objectives,
    modules: parsedModules,
    totalModules: parsedModules.length,
    totalLessons,
    totalAtoms,
  };

  console.log(
    `[courseParser] Parsed ${course.id}: ${parsedModules.length} modules, ${totalLessons} lessons, ${totalAtoms} atoms`
  );

  return parsed;
}

/**
 * Parse all available courses
 *
 * @returns Array of parsed course content
 *
 * @example
 * const allCourses = parseAllCourses();
 * allCourses.forEach(c => console.log(c.title, c.totalAtoms));
 */
export function parseAllCourses(): ParsedCourseContent[] {
  const parsed: ParsedCourseContent[] = [];

  for (const course of COURSES) {
    const content = parseCourse(course.id);
    if (content && content.totalAtoms > 0) {
      parsed.push(content);
    }
  }

  console.log(
    `[courseParser] Parsed ${parsed.length} courses with content (${COURSES.length} total courses)`
  );

  return parsed;
}

/**
 * Get a summary of available course content
 *
 * @returns Summary object with course stats
 */
export function getCourseSummary(): {
  totalCourses: number;
  coursesWithContent: number;
  courses: Array<{
    id: string;
    title: string;
    modules: number;
    lessons: number;
    atoms: number;
  }>;
} {
  const courses: Array<{
    id: string;
    title: string;
    modules: number;
    lessons: number;
    atoms: number;
  }> = [];

  for (const course of COURSES) {
    const modules = getModulesForCourse(course.id);
    const lessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);
    const atoms = modules.reduce(
      (sum, m) => sum + m.lessons.reduce((lsum, l) => lsum + l.atoms.length, 0),
      0
    );

    courses.push({
      id: course.id,
      title: course.title,
      modules: modules.length,
      lessons,
      atoms,
    });
  }

  return {
    totalCourses: COURSES.length,
    coursesWithContent: courses.filter((c) => c.atoms > 0).length,
    courses,
  };
}
