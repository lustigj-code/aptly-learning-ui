/**
 * Admin API: RAG Indexing Status
 *
 * Provides status information about the RAG index including:
 * - Total documents and chunks indexed
 * - Last full index timestamp
 * - Pending updates
 * - Per-course indexing status
 *
 * Part of Phase 12.5: RAG Auto-Indexing
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/apiAuth';
import { getIndexingStatus } from '@/lib/rag/autoIndexer';
import { getBackgroundIndexerStats } from '@/lib/rag/backgroundIndexer';
import { getVectorStoreConfig, isVectorStoreConfigured, getVectorStats } from '@/lib/rag/vectorStore';
import { getEmbeddingConfig, isEmbeddingConfigured } from '@/lib/rag/embeddings';

// ============================================
// GET: Get RAG indexing status
// ============================================

export async function GET(request: NextRequest) {
  // Verify admin access
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    // Get indexing status
    const indexingStatus = await getIndexingStatus();

    // Get background indexer stats
    const backgroundStats = await getBackgroundIndexerStats();

    // Get vector store stats
    let vectorStats = null;
    if (isVectorStoreConfigured()) {
      try {
        vectorStats = await getVectorStats();
      } catch (error) {
        console.error('[RAG Status API] Error getting vector stats:', error);
      }
    }

    // Get configuration
    const vectorConfig = getVectorStoreConfig();
    const embeddingConfig = getEmbeddingConfig();

    // Build response
    const response = {
      success: true,

      // Summary stats
      summary: {
        totalDocuments: indexingStatus.totalDocuments,
        totalChunks: vectorStats?.totalVectors || indexingStatus.totalChunks,
        lastFullIndex: indexingStatus.lastFullIndex?.toISOString() || null,
        pendingUpdates: indexingStatus.pendingUpdates,
      },

      // Background indexer status
      backgroundIndexer: {
        scheduledCourses: backgroundStats.scheduledCourses,
        highPriorityCourses: backgroundStats.highPriorityCourses,
        nextRunRecommended: backgroundStats.nextRunRecommended,
      },

      // Per-course status
      courses: indexingStatus.courseStatuses.map((s) => ({
        courseId: s.courseId,
        lastIndexed: s.lastIndexed?.toISOString() || null,
        chunksCount: s.chunksCount,
        status: !s.lastIndexed
          ? 'never_indexed'
          : s.needsReindex
          ? 'needs_update'
          : 'up_to_date',
      })),

      // Reindex schedule (top priority items)
      reindexSchedule: backgroundStats.schedule.map((s) => ({
        courseId: s.courseId,
        lastIndexed: s.lastIndexed?.toISOString() || null,
        priority: s.priority,
        reason: s.reason,
      })),

      // Configuration status
      config: {
        vectorStore: {
          provider: vectorConfig.provider,
          configured: vectorConfig.configured,
          indexName: vectorConfig.indexName,
          collection: vectorConfig.collection,
          dimension: vectorConfig.dimension,
        },
        embedding: {
          provider: embeddingConfig.provider,
          model: embeddingConfig.model,
          dimensions: embeddingConfig.dimensions,
          configured: isEmbeddingConfigured(),
        },
      },

      // Vector store breakdown (if available)
      vectorBreakdown: vectorStats
        ? {
            provider: vectorStats.provider,
            totalVectors: vectorStats.totalVectors,
            byChunkType: vectorStats.byChunkType,
            byCourse: vectorStats.byCourse,
            lastUpdated: vectorStats.lastUpdated?.toISOString() || null,
          }
        : null,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[RAG Status API] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================
// POST: Trigger background reindex
// ============================================

export async function POST(request: NextRequest) {
  // Verify admin access
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { action, courseId } = body;

    // Import dynamically to avoid circular dependencies
    const { runBackgroundReindex, forceReindexCourse, forceReindexAll } = await import(
      '@/lib/rag/backgroundIndexer'
    );

    let result;

    switch (action) {
      case 'background':
        // Run normal background reindex
        console.log('[RAG Status API] Triggering background reindex');
        result = await runBackgroundReindex();
        break;

      case 'force_course':
        // Force reindex specific course
        if (!courseId) {
          return NextResponse.json(
            { error: 'courseId required for force_course action' },
            { status: 400 }
          );
        }
        console.log(`[RAG Status API] Force reindexing course: ${courseId}`);
        result = await forceReindexCourse(courseId);
        break;

      case 'force_all':
        // Force reindex all courses (dangerous!)
        console.log('[RAG Status API] Force reindexing ALL courses');
        result = await forceReindexAll();
        break;

      default:
        return NextResponse.json(
          {
            error: 'Invalid action',
            message: 'Valid actions: background, force_course, force_all',
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: result.success,
      action,
      result: {
        chunksIndexed: 'chunksIndexed' in result ? result.chunksIndexed : result.totalChunksIndexed,
        coursesProcessed: 'coursesProcessed' in result ? result.coursesProcessed : 1,
        errors: result.errors,
        duration: result.duration,
      },
    });
  } catch (error) {
    console.error('[RAG Status API] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
