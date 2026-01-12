/**
 * Admin API: RAG Content Indexing
 *
 * Manages the RAG vector index for Socratic coaching
 *
 * POST /api/admin/rag/index - Index a course (or all courses)
 * GET /api/admin/rag/index - Get index statistics
 * DELETE /api/admin/rag/index - Clear index (by course or all)
 *
 * Part of Phase 12.1: Content Indexing Pipeline
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  indexCourse,
  indexAllCourses,
  getIndexStats,
  deleteCoursechunks,
  clearAllChunks,
  verifyIndex,
} from '@/lib/rag';
import { getVectorStoreConfig, isVectorStoreConfigured } from '@/lib/rag/vectorStore';
import { getEmbeddingConfig, isEmbeddingConfigured } from '@/lib/rag/embeddings';
import { getMisconceptionBankStats } from '@/lib/rag/misconceptionBank';
import { getCourse, getCourses } from '@/lib/services/courseService';
import type { Course } from '@/types';

// ============================================
// POST: Index a course (or all courses)
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Verify configuration
    if (!isEmbeddingConfigured()) {
      return NextResponse.json(
        {
          error: 'Embedding service not configured',
          message: 'Set GOOGLE_GENAI_API_KEY or OPENAI_API_KEY environment variable',
        },
        { status: 503 }
      );
    }

    if (!isVectorStoreConfigured()) {
      return NextResponse.json(
        {
          error: 'Vector store not configured',
          message: 'Firestore is not initialized or Pinecone is not configured',
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { courseId, indexAll } = body;

    // Index all courses if requested
    if (indexAll) {
      console.log('[RAG Index API] Starting full index of all courses');

      const allCourses = await getCourses();

      if (allCourses.length === 0) {
        return NextResponse.json(
          { error: 'No courses found to index' },
          { status: 404 }
        );
      }

      const result = await indexAllCourses(allCourses as Course[]);

      return NextResponse.json({
        success: true,
        message: `Successfully indexed ${allCourses.length} courses`,
        totalChunksIndexed: result.totalIndexed,
        courseResults: result.courseResults,
      });
    }

    // Index single course
    if (!courseId) {
      return NextResponse.json(
        { error: 'courseId is required (or set indexAll: true)' },
        { status: 400 }
      );
    }

    // Get course data
    const course = await getCourse(courseId);

    if (!course) {
      return NextResponse.json(
        { error: `Course not found: ${courseId}` },
        { status: 404 }
      );
    }

    console.log(`[RAG Index API] Starting indexing for course: ${courseId}`);

    // Run indexing
    const result = await indexCourse(course as Course);

    if (result.success) {
      // Verify the index after indexing
      const verification = await verifyIndex(courseId);

      return NextResponse.json({
        success: true,
        message: `Successfully indexed course: ${courseId}`,
        stats: {
          chunksIndexed: result.chunksIndexed,
          misconceptionsIndexed: result.misconceptionsIndexed,
          hintsIndexed: result.hintsIndexed,
          examplesIndexed: result.examplesIndexed,
          duration: `${result.duration}ms`,
        },
        verification,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: 'Indexing completed with errors',
          stats: {
            chunksIndexed: result.chunksIndexed,
            misconceptionsIndexed: result.misconceptionsIndexed,
            hintsIndexed: result.hintsIndexed,
            examplesIndexed: result.examplesIndexed,
            duration: `${result.duration}ms`,
          },
          errors: result.errors,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[RAG Index API] Error:', error);
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
// GET: Get index statistics
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const includeConfig = searchParams.get('includeConfig') === 'true';

    // Get index stats
    const stats = await getIndexStats(courseId || undefined);

    // Build response
    const response: Record<string, unknown> = {
      success: true,
      stats: {
        totalChunks: stats.totalChunks,
        byChunkType: stats.byType,
        byCourse: stats.byCourse,
        lastIndexed: stats.lastIndexed?.toISOString() || null,
      },
    };

    // Include configuration if requested
    if (includeConfig) {
      const vectorConfig = getVectorStoreConfig();
      const embeddingConfig = getEmbeddingConfig();
      const misconceptionStats = getMisconceptionBankStats();

      response.config = {
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
        misconceptionBank: misconceptionStats,
      };
    }

    // If courseId provided, also include verification
    if (courseId) {
      const verification = await verifyIndex(courseId);
      response.verification = verification;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[RAG Index API] Error:', error);
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
// DELETE: Clear index
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const clearAll = searchParams.get('clearAll') === 'true';

    // Require explicit confirmation for clearing all
    if (clearAll) {
      const confirm = searchParams.get('confirm');
      if (confirm !== 'true') {
        return NextResponse.json(
          {
            error: 'Confirmation required',
            message: 'Set confirm=true to clear all indexed content',
          },
          { status: 400 }
        );
      }

      console.log('[RAG Index API] Clearing all indexed content');
      const deleted = await clearAllChunks();

      return NextResponse.json({
        success: true,
        message: 'Successfully cleared all indexed content',
        chunksDeleted: deleted === -1 ? 'all' : deleted,
      });
    }

    // Delete by course ID
    if (!courseId) {
      return NextResponse.json(
        { error: 'courseId is required (or set clearAll=true&confirm=true)' },
        { status: 400 }
      );
    }

    console.log(`[RAG Index API] Clearing index for course: ${courseId}`);
    const deleted = await deleteCoursechunks(courseId);

    return NextResponse.json({
      success: true,
      message: `Successfully cleared index for course: ${courseId}`,
      chunksDeleted: deleted,
    });
  } catch (error) {
    console.error('[RAG Index API] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
