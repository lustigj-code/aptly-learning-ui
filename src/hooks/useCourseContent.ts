/**
 * useCourseContent Hook
 *
 * Fetches course content from Firestore with React Query caching.
 * Falls back to Course Registry for development/offline use.
 */

'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Firestore,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  getAllCourses,
  getModule,
  getLesson,
  FSM_COURSE,
  FSM_MODULE_1,
} from '@/data/courseRegistry';
import type { Course, Module, Lesson, Atom } from '@/types';

// Provide backwards-compatible functions
const AI_WORK_COURSES: Course[] = [FSM_COURSE];
const AI_WORK_MODULE_1 = FSM_MODULE_1;
function getAllAIWorkLessons() {
  return FSM_MODULE_1.lessons || [];
}
import type { VideoContent } from '@/types';

// Flag to use Firestore (set to true when content is migrated)
const USE_FIRESTORE = process.env.NEXT_PUBLIC_USE_FIRESTORE_CONTENT === 'true';

// Helper to get non-null db
function getFirestore(): Firestore | null {
  if (!USE_FIRESTORE || !db) return null;
  return db;
}

// ============================================
// QUERY FUNCTIONS
// ============================================

async function fetchCourse(courseId: string): Promise<Course | null> {
  const firestore = getFirestore();
  if (!firestore) {
    // Check registry
    const courses = getAllCourses();
    return courses.find(c => c.id === courseId) || null;
  }

  try {
    const courseRef = doc(firestore, 'courses', courseId);
    const courseSnap = await getDoc(courseRef);

    if (!courseSnap.exists()) {
      // Fallback to registry
      const courses = getAllCourses();
      return courses.find(c => c.id === courseId) || null;
    }

    const data = courseSnap.data();
    return {
      id: data.id,
      number: data.number,
      title: data.title,
      description: data.description,
      objectives: data.objectives || [],
      estimatedHours: data.estimatedHours,
      modules: [], // Modules are fetched separately
      isLocked: data.isLocked,
      prerequisites: data.prerequisites || [],
    };
  } catch (error) {
    console.error('Error fetching course from Firestore:', error);
    // Fallback to registry
    const courses = getAllCourses();
    return courses.find(c => c.id === courseId) || null;
  }
}

async function fetchModule(moduleId: string): Promise<Module | null> {
  const firestore = getFirestore();
  if (!firestore) {
    return getModule(moduleId) || null;
  }

  try {
    const moduleRef = doc(firestore, 'modules', moduleId);
    const moduleSnap = await getDoc(moduleRef);

    if (!moduleSnap.exists()) {
      return getModule(moduleId) || null;
    }

    const data = moduleSnap.data();

    // Fetch lessons for this module
    const lessonsQuery = query(
      collection(firestore, 'lessons'),
      where('moduleId', '==', moduleId),
      orderBy('number', 'asc')
    );
    const lessonsSnap = await getDocs(lessonsQuery);

    const lessons: Lesson[] = await Promise.all(
      lessonsSnap.docs.map(async (lessonDoc) => {
        const lessonData = lessonDoc.data();

        // Fetch atoms for this lesson
        const atomsQuery = query(
          collection(firestore, 'atoms'),
          where('lessonId', '==', lessonDoc.id)
        );
        const atomsSnap = await getDocs(atomsQuery);

        const atoms: Atom[] = atomsSnap.docs.map((atomDoc) => {
          const atomData = atomDoc.data();
          return {
            id: atomData.id,
            lessonId: atomData.lessonId,
            type: atomData.type,
            title: atomData.title,
            content: atomData.content,
            estimatedMinutes: atomData.estimatedMinutes,
            isRequired: atomData.isRequired,
            masteryThreshold: atomData.masteryThreshold,
          } as Atom;
        });

        return {
          id: lessonData.id,
          moduleId: lessonData.moduleId,
          number: lessonData.number,
          title: lessonData.title,
          objectives: lessonData.objectives || [],
          estimatedMinutes: lessonData.estimatedMinutes,
          atoms: atoms,
          isLocked: lessonData.isLocked,
        };
      })
    );

    return {
      id: data.id,
      courseId: data.courseId,
      number: data.number,
      title: data.title,
      objectives: data.objectives || [],
      estimatedMinutes: data.estimatedMinutes,
      lessons: lessons,
      isLocked: data.isLocked,
    };
  } catch (error) {
    console.error('Error fetching module from Firestore:', error);
    return getModule(moduleId) || null;
  }
}

async function fetchLesson(lessonId: string): Promise<Lesson | null> {
  const firestore = getFirestore();
  if (!firestore) {
    return getLesson(lessonId) || null;
  }

  try {
    const lessonRef = doc(firestore, 'lessons', lessonId);
    const lessonSnap = await getDoc(lessonRef);

    if (!lessonSnap.exists()) {
      return getLesson(lessonId) || null;
    }

    const data = lessonSnap.data();

    // Fetch atoms for this lesson
    const atomsQuery = query(
      collection(firestore, 'atoms'),
      where('lessonId', '==', lessonId)
    );
    const atomsSnap = await getDocs(atomsQuery);

    const atoms: Atom[] = atomsSnap.docs.map((atomDoc) => {
      const atomData = atomDoc.data();
      return {
        id: atomData.id,
        lessonId: atomData.lessonId,
        type: atomData.type,
        title: atomData.title,
        content: atomData.content,
        estimatedMinutes: atomData.estimatedMinutes,
        isRequired: atomData.isRequired,
        masteryThreshold: atomData.masteryThreshold,
      } as Atom;
    });

    return {
      id: data.id,
      moduleId: data.moduleId,
      number: data.number,
      title: data.title,
      objectives: data.objectives || [],
      estimatedMinutes: data.estimatedMinutes,
      atoms: atoms,
      isLocked: data.isLocked,
    };
  } catch (error) {
    console.error('Error fetching lesson from Firestore:', error);
    return getLesson(lessonId) || null;
  }
}

async function fetchAllCourses(): Promise<Course[]> {
  const firestore = getFirestore();
  if (!firestore) {
    return getAllCourses();
  }

  try {
    const coursesSnap = await getDocs(collection(firestore, 'courses'));

    if (coursesSnap.empty) {
      return getAllCourses(); // Fallback to registry
    }

    return coursesSnap.docs.map((courseDoc) => {
      const data = courseDoc.data();
      return {
        id: data.id,
        number: data.number,
        title: data.title,
        description: data.description,
        objectives: data.objectives || [],
        estimatedHours: data.estimatedHours,
        modules: [], // Modules fetched separately
        isLocked: data.isLocked,
        prerequisites: data.prerequisites || [],
      };
    });
  } catch (error) {
    console.error('Error fetching courses from Firestore:', error);
    return getAllCourses();
  }
}

// ============================================
// HOOKS
// ============================================

// Static course content cache duration (24 hours)
// Course content is relatively static, so aggressive caching reduces API calls
const COURSE_CONTENT_STALE_TIME = 24 * 60 * 60 * 1000; // 24 hours
const COURSE_CONTENT_GC_TIME = 24 * 60 * 60 * 1000; // 24 hours

export function useCourse(courseId: string) {
  return useQuery({
    queryKey: ['course', courseId],
    queryFn: () => fetchCourse(courseId),
    staleTime: COURSE_CONTENT_STALE_TIME,
    gcTime: COURSE_CONTENT_GC_TIME,
    enabled: !!courseId,
  });
}

export function useModule(moduleId: string) {
  return useQuery({
    queryKey: ['module', moduleId],
    queryFn: () => fetchModule(moduleId),
    staleTime: COURSE_CONTENT_STALE_TIME,
    gcTime: COURSE_CONTENT_GC_TIME,
    enabled: !!moduleId,
  });
}

export function useLesson(lessonId: string) {
  return useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: () => fetchLesson(lessonId),
    staleTime: COURSE_CONTENT_STALE_TIME,
    gcTime: COURSE_CONTENT_GC_TIME,
    enabled: !!lessonId,
  });
}

export function useAllCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: fetchAllCourses,
    staleTime: COURSE_CONTENT_STALE_TIME,
    gcTime: COURSE_CONTENT_GC_TIME,
  });
}

// ============================================
// VIDEO PREFETCHING
// ============================================

/**
 * Get the next lesson in sequence within the same module or next module
 */
function getNextLessonId(
  currentLessonId: string,
  moduleData: Module | null
): string | null {
  if (!moduleData?.lessons) return null;

  const currentIndex = moduleData.lessons.findIndex(l => l.id === currentLessonId);
  if (currentIndex === -1) return null;

  // Check if there's a next lesson in the same module
  if (currentIndex < moduleData.lessons.length - 1) {
    return moduleData.lessons[currentIndex + 1].id;
  }

  return null;
}

/**
 * Extract video URLs from a lesson's atoms
 */
function getVideoUrlsFromLesson(lesson: Lesson | null): string[] {
  if (!lesson?.atoms) return [];

  return lesson.atoms
    .filter(atom => atom.type === 'video')
    .map(atom => {
      const content = atom.content as VideoContent;
      return content?.videoUrl;
    })
    .filter((url): url is string => !!url);
}

/**
 * Prefetch video assets using link prefetch hints
 * This tells the browser to fetch resources in idle time
 */
function prefetchVideoAssets(videoUrls: string[]): void {
  if (typeof document === 'undefined') return;

  videoUrls.forEach(url => {
    // Check if prefetch link already exists
    const existingLink = document.querySelector(`link[href="${url}"]`);
    if (existingLink) return;

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'video';
    link.href = url;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
}

/**
 * Hook to prefetch the next lesson's video assets.
 *
 * This improves UX by loading video content in the background while
 * the user is completing the current lesson. Uses browser prefetch
 * hints to load resources during idle time.
 *
 * @param currentLessonId - The ID of the lesson the user is currently viewing
 * @param moduleId - The ID of the current module (optional, improves prefetch accuracy)
 *
 * @example
 * ```tsx
 * // In a lesson component
 * usePrefetchNextLesson(currentLesson.id, currentModule.id);
 * ```
 */
export function usePrefetchNextLesson(
  currentLessonId: string | null,
  moduleId?: string | null
) {
  // Get current module data if moduleId is provided
  const { data: moduleData } = useModule(moduleId || '');

  // Determine the next lesson ID
  const nextLessonId = currentLessonId && moduleData
    ? getNextLessonId(currentLessonId, moduleData)
    : null;

  // Fetch next lesson data
  const { data: nextLesson } = useQuery({
    queryKey: ['lesson', nextLessonId, 'prefetch'],
    queryFn: () => fetchLesson(nextLessonId!),
    staleTime: COURSE_CONTENT_STALE_TIME,
    gcTime: COURSE_CONTENT_GC_TIME,
    enabled: !!nextLessonId,
  });

  // Effect to prefetch video assets when next lesson data is available
  useEffect(() => {
    if (!nextLesson) return;

    const videoUrls = getVideoUrlsFromLesson(nextLesson);
    if (videoUrls.length > 0) {
      // Delay prefetching slightly to prioritize current page resources
      const timeoutId = setTimeout(() => {
        prefetchVideoAssets(videoUrls);
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [nextLesson]);

  return {
    nextLessonId,
    isPrefetching: !!nextLessonId && !nextLesson,
    prefetchedLesson: nextLesson,
  };
}

/**
 * Manually trigger prefetch for a specific lesson's videos.
 * Useful when you know which lesson the user will navigate to next.
 *
 * @param lessonId - The ID of the lesson to prefetch videos for
 */
export async function prefetchLessonVideos(lessonId: string): Promise<void> {
  const lesson = await fetchLesson(lessonId);
  if (!lesson) return;

  const videoUrls = getVideoUrlsFromLesson(lesson);
  prefetchVideoAssets(videoUrls);
}

// ============================================
// UTILITY EXPORTS
// ============================================

export {
  fetchCourse,
  fetchModule,
  fetchLesson,
  fetchAllCourses,
  USE_FIRESTORE,
  getVideoUrlsFromLesson,
  prefetchVideoAssets,
};
