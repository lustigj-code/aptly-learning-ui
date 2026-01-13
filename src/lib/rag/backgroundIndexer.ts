/**
 * Background Indexer for RAG
 *
 * Handles periodic re-indexing of course content to keep
 * the RAG vector store up to date.
 *
 * Part of Phase 12.5: RAG Auto-Indexing
 */

import { getCourse, getCourses } from '@/lib/services/courseService';
import {
  incrementalIndex,
  indexCourseAuto,
  getIndexingStatus,
  type AutoIndexResult,
} from './autoIndexer';
import { isEmbeddingConfigured } from './embeddings';
import { isVectorStoreConfigured } from './vectorStore';
import type { Course } from '@/types';

// ============================================
// TYPES
// ============================================

export type BackgroundIndexResult = {
  success: boolean;
  coursesProcessed: number;
  totalChunksIndexed: number;
  errors: string[];
  duration: number;
  courseResults: Record<string, AutoIndexResult>;
};

export type ReindexSchedule = {
  courseId: string;
  lastIndexed: Date | null;
  priority: 'high' | 'medium' | 'low';
  reason: string;
};

// ============================================
// CONFIGURATION
// ============================================

const REINDEX_INTERVAL_HOURS = 24; // Courses not indexed in 24h need reindexing
const MAX_COURSES_PER_RUN = 5; // Limit courses per background run
const HIGH_PRIORITY_HOURS = 48; // Courses not indexed in 48h are high priority

// ============================================
// BACKGROUND REINDEX FUNCTIONS
// ============================================

/**
 * Get courses that need re-indexing
 */
export async function getCoursesNeedingReindex(): Promise<ReindexSchedule[]> {
  try {
    const status = await getIndexingStatus();
    const now = Date.now();
    const reindexThreshold = now - REINDEX_INTERVAL_HOURS * 60 * 60 * 1000;
    const highPriorityThreshold = now - HIGH_PRIORITY_HOURS * 60 * 60 * 1000;

    const schedule: ReindexSchedule[] = [];

    // Check each indexed course
    for (const courseStatus of status.courseStatuses) {
      const lastIndexedTime = courseStatus.lastIndexed?.getTime() || 0;

      if (lastIndexedTime < reindexThreshold) {
        const priority = lastIndexedTime < highPriorityThreshold ? 'high' : 'medium';
        const hoursAgo = Math.round((now - lastIndexedTime) / (60 * 60 * 1000));

        schedule.push({
          courseId: courseStatus.courseId,
          lastIndexed: courseStatus.lastIndexed,
          priority,
          reason: `Not indexed in ${hoursAgo} hours`,
        });
      }
    }

    // Get all courses from database to find unindexed ones
    const allCourses = await getCourses();
    const indexedCourseIds = new Set(status.courseStatuses.map((s) => s.courseId));

    for (const course of allCourses) {
      if (!indexedCourseIds.has(course.id)) {
        schedule.push({
          courseId: course.id,
          lastIndexed: null,
          priority: 'high',
          reason: 'Never indexed',
        });
      }
    }

    // Sort by priority (high first) then by last indexed (oldest first)
    schedule.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      const aTime = a.lastIndexed?.getTime() || 0;
      const bTime = b.lastIndexed?.getTime() || 0;
      return aTime - bTime;
    });

    return schedule;
  } catch (error) {
    console.error('[BackgroundIndexer] Error getting reindex schedule:', error);
    return [];
  }
}

/**
 * Run background re-indexing for courses that need it
 *
 * This should be called by a cron job or scheduled task
 */
export async function runBackgroundReindex(): Promise<BackgroundIndexResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const courseResults: Record<string, AutoIndexResult> = {};
  let totalChunksIndexed = 0;
  let coursesProcessed = 0;

  console.log('[BackgroundIndexer] Starting background reindex');

  try {
    // Check services are configured
    if (!isEmbeddingConfigured()) {
      throw new Error('Embedding service not configured');
    }
    if (!isVectorStoreConfigured()) {
      throw new Error('Vector store not configured');
    }

    // Get courses needing reindex
    const schedule = await getCoursesNeedingReindex();
    console.log(`[BackgroundIndexer] Found ${schedule.length} courses needing reindex`);

    if (schedule.length === 0) {
      console.log('[BackgroundIndexer] No courses need reindexing');
      return {
        success: true,
        coursesProcessed: 0,
        totalChunksIndexed: 0,
        errors: [],
        duration: Date.now() - startTime,
        courseResults: {},
      };
    }

    // Process up to MAX_COURSES_PER_RUN
    const toProcess = schedule.slice(0, MAX_COURSES_PER_RUN);

    for (const item of toProcess) {
      console.log(
        `[BackgroundIndexer] Processing ${item.courseId} (${item.priority} priority: ${item.reason})`
      );

      try {
        const course = await getCourse(item.courseId);
        if (!course) {
          errors.push(`Course not found: ${item.courseId}`);
          continue;
        }

        // Use incremental index if previously indexed, full index if never indexed
        let result: AutoIndexResult;
        if (item.lastIndexed) {
          result = await incrementalIndex(course as Course, item.lastIndexed);
        } else {
          result = await indexCourseAuto(course as Course);
        }

        courseResults[item.courseId] = result;
        totalChunksIndexed += result.chunksIndexed;
        coursesProcessed++;

        if (!result.success) {
          errors.push(...result.errors.map((e) => `${item.courseId}: ${e}`));
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`${item.courseId}: ${msg}`);
        console.error(`[BackgroundIndexer] Error processing ${item.courseId}:`, error);
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      `[BackgroundIndexer] Completed in ${duration}ms. Processed: ${coursesProcessed}, Chunks: ${totalChunksIndexed}`
    );

    return {
      success: errors.length === 0,
      coursesProcessed,
      totalChunksIndexed,
      errors,
      duration,
      courseResults,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    errors.push(msg);
    console.error('[BackgroundIndexer] Fatal error:', error);

    return {
      success: false,
      coursesProcessed,
      totalChunksIndexed,
      errors,
      duration: Date.now() - startTime,
      courseResults,
    };
  }
}

/**
 * Force full reindex of a specific course
 */
export async function forceReindexCourse(courseId: string): Promise<AutoIndexResult> {
  console.log(`[BackgroundIndexer] Force reindex for course: ${courseId}`);

  try {
    const course = await getCourse(courseId);
    if (!course) {
      return {
        success: false,
        chunksIndexed: 0,
        chunksRemoved: 0,
        errors: [`Course not found: ${courseId}`],
        duration: 0,
      };
    }

    return await indexCourseAuto(course as Course);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[BackgroundIndexer] Error force reindexing ${courseId}:`, error);

    return {
      success: false,
      chunksIndexed: 0,
      chunksRemoved: 0,
      errors: [msg],
      duration: 0,
    };
  }
}

/**
 * Force full reindex of all courses
 */
export async function forceReindexAll(): Promise<BackgroundIndexResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const courseResults: Record<string, AutoIndexResult> = {};
  let totalChunksIndexed = 0;
  let coursesProcessed = 0;

  console.log('[BackgroundIndexer] Starting full reindex of all courses');

  try {
    const allCourses = await getCourses();

    for (const course of allCourses) {
      console.log(`[BackgroundIndexer] Reindexing course: ${course.id}`);

      try {
        const result = await indexCourseAuto(course as Course);
        courseResults[course.id] = result;
        totalChunksIndexed += result.chunksIndexed;
        coursesProcessed++;

        if (!result.success) {
          errors.push(...result.errors.map((e) => `${course.id}: ${e}`));
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`${course.id}: ${msg}`);
      }
    }

    return {
      success: errors.length === 0,
      coursesProcessed,
      totalChunksIndexed,
      errors,
      duration: Date.now() - startTime,
      courseResults,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    errors.push(msg);

    return {
      success: false,
      coursesProcessed,
      totalChunksIndexed,
      errors,
      duration: Date.now() - startTime,
      courseResults,
    };
  }
}

/**
 * Get background indexer statistics
 */
export async function getBackgroundIndexerStats(): Promise<{
  scheduledCourses: number;
  highPriorityCourses: number;
  lastRunAt: Date | null;
  nextRunRecommended: boolean;
  schedule: ReindexSchedule[];
}> {
  const schedule = await getCoursesNeedingReindex();
  const highPriority = schedule.filter((s) => s.priority === 'high').length;

  return {
    scheduledCourses: schedule.length,
    highPriorityCourses: highPriority,
    lastRunAt: null, // Would need to track this separately
    nextRunRecommended: schedule.length > 0,
    schedule: schedule.slice(0, 10), // Return top 10
  };
}
