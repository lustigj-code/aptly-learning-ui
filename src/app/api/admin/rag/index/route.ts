/**
 * Admin API: RAG Content Indexing
 *
 * Triggers pedagogical content indexing for courses
 *
 * POST /api/admin/rag/index - Index a course
 * GET /api/admin/rag/index - Get indexing status
 *
 * Part of Phase 12: Socratic RAG Coach
 */

import { NextRequest, NextResponse } from 'next/server';
import { indexCourse, getIndexStats } from '@/lib/rag';
import { getCourse } from '@/lib/services/courseService';

// ============================================
// POST: Index a course
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { courseId } = body;

    if (!courseId) {
      return NextResponse.json(
        { error: 'courseId is required' },
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
    const result = await indexCourse(course);

    if (result.success) {
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
// GET: Get indexing status
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');

    const stats = await getIndexStats(courseId || undefined);

    return NextResponse.json({
      success: true,
      stats,
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
