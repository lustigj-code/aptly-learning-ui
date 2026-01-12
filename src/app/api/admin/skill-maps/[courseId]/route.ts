/**
 * Admin Skill Map Detail API
 *
 * Get details for a specific skill map.
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { getSkillMap } from '@/lib/skillmap';
import { parseCourse } from '@/lib/skillmap/courseParser';

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
 * GET /api/admin/skill-maps/[courseId]
 * Get skill map details for a course
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.authorized) return auth.error!;

    const { courseId } = await params;
    const skillMap = await getSkillMap(courseId);
    const course = parseCourse(courseId);

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      course: {
        courseId: course.courseId,
        title: course.title,
        description: course.description,
        totalModules: course.totalModules,
        totalLessons: course.totalLessons,
      },
      skillMap: skillMap
        ? {
            id: skillMap.id,
            courseId: skillMap.courseId,
            version: skillMap.version,
            status: skillMap.status,
            skills: skillMap.skills,
            metadata: {
              generatedAt: skillMap.metadata.generatedAt,
              generatedBy: skillMap.metadata.generatedBy,
              model: skillMap.metadata.model,
              approvedAt: skillMap.metadata.approvedAt,
            },
          }
        : null,
    });
  } catch (error) {
    console.error('Fetch skill map detail error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch skill map' },
      { status: 500 }
    );
  }
}
