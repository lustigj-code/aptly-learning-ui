/**
 * Course Registry
 *
 * Single source of truth for all course data in Aptly Learning.
 * Consolidates AI at Work and Social Media Marketing courses.
 */

import type { Course, Module, Lesson, Atom } from '@/types';
import {
  AI_AT_WORK_COURSE,
  AI_WORK_MODULE_1,
  AI_WORK_MODULE_2,
  AI_WORK_MODULE_3,
  AI_WORK_MODULE_4,
  AI_AT_WORK_MODULES,
} from './aiAtWorkCourse';
import { COURSES as SOCIAL_MEDIA_COURSES, COURSE_1_MODULE_1 } from './mockData';

// ============================================
// COURSE REGISTRY
// ============================================

/**
 * All available courses in the platform
 */
export const ALL_COURSES: Course[] = [
  // Primary course: AI at Work
  {
    ...AI_AT_WORK_COURSE,
    modules: AI_AT_WORK_MODULES,
  },
  // Social Media Marketing courses (for future use)
  ...SOCIAL_MEDIA_COURSES,
];

/**
 * Default course ID for new users
 */
export const DEFAULT_COURSE_ID = 'ai-at-work';

/**
 * Course metadata for quick lookups (without full module data)
 */
export interface CourseMetadata {
  id: string;
  title: string;
  description: string;
  estimatedHours: number;
  moduleCount: number;
  lessonCount: number;
  isLocked: boolean;
}

// ============================================
// COURSE LOOKUP FUNCTIONS
// ============================================

/**
 * Get a course by ID
 */
export function getCourse(courseId: string): Course | undefined {
  return ALL_COURSES.find(c => c.id === courseId);
}

/**
 * Get the default course (AI at Work)
 */
export function getDefaultCourse(): Course {
  const course = getCourse(DEFAULT_COURSE_ID);
  if (!course) {
    throw new Error(`Default course ${DEFAULT_COURSE_ID} not found`);
  }
  return course;
}

/**
 * Get all available courses
 */
export function getAllCourses(): Course[] {
  return ALL_COURSES;
}

/**
 * Get course metadata (lightweight, without full module data)
 */
export function getCourseMetadata(courseId: string): CourseMetadata | undefined {
  const course = getCourse(courseId);
  if (!course) return undefined;

  const lessonCount = course.modules?.reduce(
    (total, mod) => total + (mod.lessons?.length ?? 0),
    0
  ) ?? 0;

  return {
    id: course.id,
    title: course.title,
    description: course.description,
    estimatedHours: course.estimatedHours,
    moduleCount: course.modules?.length ?? 0,
    lessonCount,
    isLocked: course.isLocked,
  };
}

/**
 * Get all course metadata
 */
export function getAllCourseMetadata(): CourseMetadata[] {
  return ALL_COURSES.map(c => getCourseMetadata(c.id)!).filter(Boolean);
}

// ============================================
// MODULE LOOKUP FUNCTIONS
// ============================================

/**
 * Get all modules for a course
 */
export function getCourseModules(courseId: string): Module[] {
  const course = getCourse(courseId);
  return course?.modules ?? [];
}

/**
 * Get a specific module by ID
 */
export function getModule(moduleId: string): Module | undefined {
  for (const course of ALL_COURSES) {
    const module = course.modules?.find(m => m.id === moduleId);
    if (module) return module;
  }
  return undefined;
}

/**
 * Get a module with its parent course ID
 */
export function getModuleWithCourse(moduleId: string): { module: Module; courseId: string } | undefined {
  for (const course of ALL_COURSES) {
    const module = course.modules?.find(m => m.id === moduleId);
    if (module) return { module, courseId: course.id };
  }
  return undefined;
}

// ============================================
// LESSON LOOKUP FUNCTIONS
// ============================================

/**
 * Get all lessons for a module
 */
export function getModuleLessons(moduleId: string): Lesson[] {
  const module = getModule(moduleId);
  return module?.lessons ?? [];
}

/**
 * Get a specific lesson by ID
 */
export function getLesson(lessonId: string): Lesson | undefined {
  for (const course of ALL_COURSES) {
    for (const module of course.modules ?? []) {
      const lesson = module.lessons?.find(l => l.id === lessonId);
      if (lesson) return lesson;
    }
  }
  return undefined;
}

/**
 * Get a lesson with its parent module and course IDs
 */
export function getLessonWithContext(lessonId: string): {
  lesson: Lesson;
  moduleId: string;
  courseId: string;
} | undefined {
  for (const course of ALL_COURSES) {
    for (const module of course.modules ?? []) {
      const lesson = module.lessons?.find(l => l.id === lessonId);
      if (lesson) {
        return {
          lesson,
          moduleId: module.id,
          courseId: course.id,
        };
      }
    }
  }
  return undefined;
}

// ============================================
// ATOM LOOKUP FUNCTIONS
// ============================================

/**
 * Get all atoms for a lesson
 */
export function getLessonAtoms(lessonId: string): Atom[] {
  const lesson = getLesson(lessonId);
  return lesson?.atoms ?? [];
}

/**
 * Get a specific atom by ID
 */
export function getAtom(atomId: string): Atom | undefined {
  for (const course of ALL_COURSES) {
    for (const module of course.modules ?? []) {
      for (const lesson of module.lessons ?? []) {
        const atom = lesson.atoms?.find(a => a.id === atomId);
        if (atom) return atom;
      }
    }
  }
  return undefined;
}

/**
 * Get an atom with its full context
 */
export function getAtomWithContext(atomId: string): {
  atom: Atom;
  lessonId: string;
  moduleId: string;
  courseId: string;
} | undefined {
  for (const course of ALL_COURSES) {
    for (const module of course.modules ?? []) {
      for (const lesson of module.lessons ?? []) {
        const atom = lesson.atoms?.find(a => a.id === atomId);
        if (atom) {
          return {
            atom,
            lessonId: lesson.id,
            moduleId: module.id,
            courseId: course.id,
          };
        }
      }
    }
  }
  return undefined;
}

// ============================================
// BREADCRUMB HELPERS
// ============================================

/**
 * Generate breadcrumb data for a given context
 */
export function getBreadcrumbs(
  courseId: string,
  moduleId?: string,
  lessonId?: string
): { label: string; href: string }[] {
  const breadcrumbs: { label: string; href: string }[] = [];

  const course = getCourse(courseId);
  if (course) {
    breadcrumbs.push({
      label: course.title,
      href: `/dashboard`,
    });
  }

  if (moduleId) {
    const module = getModule(moduleId);
    if (module) {
      breadcrumbs.push({
        label: `Module ${module.number}: ${module.title}`,
        href: `/learn?module=${moduleId}`,
      });
    }
  }

  if (lessonId) {
    const lesson = getLesson(lessonId);
    if (lesson) {
      breadcrumbs.push({
        label: `Lesson ${lesson.number}: ${lesson.title}`,
        href: `/learn?lesson=${lessonId}`,
      });
    }
  }

  return breadcrumbs;
}

// ============================================
// PROGRESS HELPERS
// ============================================

/**
 * Calculate course progress percentage
 */
export function calculateCourseProgress(
  courseId: string,
  completedAtomIds: string[]
): number {
  const course = getCourse(courseId);
  if (!course) return 0;

  let totalAtoms = 0;
  let completedAtoms = 0;

  for (const module of course.modules ?? []) {
    for (const lesson of module.lessons ?? []) {
      for (const atom of lesson.atoms ?? []) {
        totalAtoms++;
        if (completedAtomIds.includes(atom.id)) {
          completedAtoms++;
        }
      }
    }
  }

  return totalAtoms > 0 ? Math.round((completedAtoms / totalAtoms) * 100) : 0;
}

/**
 * Get the next atom to learn in a course
 */
export function getNextAtom(
  courseId: string,
  completedAtomIds: string[]
): Atom | undefined {
  const course = getCourse(courseId);
  if (!course) return undefined;

  for (const module of course.modules ?? []) {
    for (const lesson of module.lessons ?? []) {
      for (const atom of lesson.atoms ?? []) {
        if (!completedAtomIds.includes(atom.id)) {
          return atom;
        }
      }
    }
  }

  return undefined;
}

// ============================================
// EXPORTS FOR BACKWARDS COMPATIBILITY
// ============================================

// Re-export AI at Work modules for direct access
export {
  AI_AT_WORK_COURSE,
  AI_WORK_MODULE_1,
  AI_WORK_MODULE_2,
  AI_WORK_MODULE_3,
  AI_WORK_MODULE_4,
  AI_AT_WORK_MODULES,
} from './aiAtWorkCourse';

// Re-export Social Media modules for direct access
export { COURSE_1_MODULE_1 } from './mockData';
