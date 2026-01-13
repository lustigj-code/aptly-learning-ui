/**
 * Resume State API
 *
 * Saves and retrieves resume state for mid-content resume.
 * Allows users to pick up exactly where they left off.
 *
 * GET - Fetch current resume state
 * POST - Save resume state
 * DELETE - Clear resume state
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function GET(request: NextRequest) {
  // Verify authentication
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let authenticatedUserId: string;
  try {
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    authenticatedUserId = decodedToken.uid;
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const requestedUserId = searchParams.get('userId');

  // IDOR Protection
  if (requestedUserId && requestedUserId !== authenticatedUserId) {
    return NextResponse.json({ error: 'Cannot access other users data' }, { status: 403 });
  }

  const userId = authenticatedUserId;

  try {
    // Try new learners collection first
    const progressDoc = await adminDb.doc(`learners/${userId}/data/progress`).get();

    if (progressDoc.exists && progressDoc.data()?.resumeState) {
      return NextResponse.json({
        success: true,
        resumeState: progressDoc.data()?.resumeState,
      });
    }

    // Fallback to old users collection
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (userDoc.exists && userDoc.data()?.resumeState) {
      return NextResponse.json({
        success: true,
        resumeState: userDoc.data()?.resumeState,
      });
    }

    return NextResponse.json({
      success: true,
      resumeState: null,
    });
  } catch (error) {
    console.error('[Resume API] GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch resume state' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Verify authentication
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let authenticatedUserId: string;
  try {
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    authenticatedUserId = decodedToken.uid;
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { userId, resumeState } = body;

    // IDOR Protection
    if (userId && userId !== authenticatedUserId) {
      return NextResponse.json({ error: 'Cannot modify other users data' }, { status: 403 });
    }

    const targetUserId = authenticatedUserId;

    // Validate resume state
    if (!resumeState || !resumeState.atomId || !resumeState.atomType) {
      return NextResponse.json({ error: 'Invalid resume state' }, { status: 400 });
    }

    // Update both collections for backwards compatibility
    const updateData = {
      resumeState: {
        atomId: resumeState.atomId,
        atomType: resumeState.atomType,
        videoTimestamp: resumeState.videoTimestamp ?? null,
        quizQuestionIndex: resumeState.quizQuestionIndex ?? null,
        quizAnswers: resumeState.quizAnswers ?? null,
        scrollPosition: resumeState.scrollPosition ?? null,
        practiceResponse: resumeState.practiceResponse ?? null,
        lastUpdated: FieldValue.serverTimestamp(),
      },
      lastActiveAt: FieldValue.serverTimestamp(),
    };

    // Update new learners collection
    const progressRef = adminDb.doc(`learners/${targetUserId}/data/progress`);
    await progressRef.set(updateData, { merge: true });

    // Also update old users collection for backwards compatibility
    const userRef = adminDb.collection('users').doc(targetUserId);
    await userRef.update({
      'progress.resumeState': updateData.resumeState,
    });

    return NextResponse.json({
      success: true,
      message: 'Resume state saved',
    });
  } catch (error) {
    console.error('[Resume API] POST Error:', error);
    return NextResponse.json({ error: 'Failed to save resume state' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  // Verify authentication
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let authenticatedUserId: string;
  try {
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    authenticatedUserId = decodedToken.uid;
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  try {
    // Clear in new learners collection
    const progressRef = adminDb.doc(`learners/${authenticatedUserId}/data/progress`);
    await progressRef.update({
      resumeState: FieldValue.delete(),
    });

    // Also clear in old users collection
    const userRef = adminDb.collection('users').doc(authenticatedUserId);
    await userRef.update({
      'progress.resumeState': FieldValue.delete(),
    });

    return NextResponse.json({
      success: true,
      message: 'Resume state cleared',
    });
  } catch (error) {
    console.error('[Resume API] DELETE Error:', error);
    return NextResponse.json({ error: 'Failed to clear resume state' }, { status: 500 });
  }
}
