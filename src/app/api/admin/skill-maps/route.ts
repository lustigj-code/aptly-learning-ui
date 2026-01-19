/**
 * Admin Skill Maps API
 *
 * Provides endpoints for managing skill maps in the admin interface.
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import {
  getAllSkillMaps,
  updateSkillMapStatus,
  generateAndSaveSkillMap,
} from '@/lib/skillmap';
import { parseAllCourses, parseCourse } from '@/lib/skillmap/courseParser';

/**
 * Verify admin access via Firebase ID token
 */
async function verifyAdminAuth(request: NextRequest): Promise<{ authorized: boolean; error?: NextResponse }> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      authorized: false,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  try {
    const token = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(token);
    return { authorized: true };
  } catch {
    return {
      authorized: false,
      error: NextResponse.json({ error: 'Invalid token' }, { status: 401 }),
    };
  }
}

/**
 * GET /api/admin/skill-maps
 * Fetch all courses with their skill map status
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.authorized) return auth.error!;

    const skillMaps = await getAllSkillMaps();
    const courses = parseAllCourses();

    // Map courses to their skill map status
    const courseStatus = courses.map(course => {
      const skillMap = skillMaps.find(sm => sm.courseId === course.courseId);
      return {
        courseId: course.courseId,
        title: course.title,
        hasSkillMap: !!skillMap,
        status: skillMap?.status ?? 'none',
        skillCount: skillMap ? Object.keys(skillMap.skills).length : 0,
        generatedAt: skillMap?.metadata.generatedAt ?? null,
        version: skillMap?.version ?? 0,
      };
    });

    return NextResponse.json({
      success: true,
      courses: courseStatus,
    });
  } catch (error) {
    console.error('Fetch skill maps error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch skill maps' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/skill-maps
 * Generate skill map for a course
 * Body: { courseId: string, autoApprove?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.authorized) return auth.error!;

    const { courseId, autoApprove } = await request.json();

    if (!courseId) {
      return NextResponse.json(
        { error: 'courseId is required' },
        { status: 400 }
      );
    }

    const course = parseCourse(courseId);
    if (!course) {
      return NextResponse.json(
        { error: `Course not found: ${courseId}` },
        { status: 404 }
      );
    }

    // Generate skill map using AI
    const skillMap = await generateAndSaveSkillMap(courseId, autoApprove ?? false);

    return NextResponse.json({
      success: true,
      skillMap: {
        courseId: skillMap.courseId,
        status: skillMap.status,
        skillCount: Object.keys(skillMap.skills).length,
        version: skillMap.version,
      },
    });
  } catch (error) {
    console.error('Generate skill map error:', error);
    return NextResponse.json(
      { error: 'Failed to generate skill map' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/skill-maps
 * Update skill map status
 * Body: { courseId: string, status: 'draft' | 'approved' | 'active' }
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.authorized) return auth.error!;

    const { courseId, status } = await request.json();

    if (!courseId || !status) {
      return NextResponse.json(
        { error: 'courseId and status are required' },
        { status: 400 }
      );
    }

    if (!['draft', 'approved', 'active'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be draft, approved, or active' },
        { status: 400 }
      );
    }

    await updateSkillMapStatus(courseId, status);

    return NextResponse.json({
      success: true,
      message: `Skill map status updated to ${status}`,
    });
  } catch (error) {
    console.error('Update skill map status error:', error);
    return NextResponse.json(
      { error: 'Failed to update skill map status' },
      { status: 500 }
    );
  }
}
