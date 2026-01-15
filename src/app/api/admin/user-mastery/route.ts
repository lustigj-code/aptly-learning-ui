/**
 * Admin User Mastery API
 *
 * Fetches mastery levels for any user (admin only)
 * Used by the Admin Knowledge Graph visualization
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  // Verify authentication
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let adminUserId: string;
  try {
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    adminUserId = decodedToken.uid;
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // Verify admin role
  try {
    const adminDoc = await adminDb.collection('users').doc(adminUserId).get();
    const adminData = adminDoc.data();
    if (!adminData || adminData.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Failed to verify admin status' }, { status: 500 });
  }

  const searchParams = request.nextUrl.searchParams;
  const targetUserId = searchParams.get('userId');

  if (!targetUserId) {
    return NextResponse.json(
      { error: 'userId query param required' },
      { status: 400 }
    );
  }

  try {
    // Fetch concept mastery data for the target user
    const conceptMasteryRef = adminDb
      .collection('conceptMastery')
      .doc(targetUserId)
      .collection('concepts');
    const conceptMasterySnap = await conceptMasteryRef.get();

    const masteryLevels: Record<string, number> = {};
    conceptMasterySnap.forEach((doc) => {
      const data = doc.data();
      masteryLevels[doc.id] = data.masteryLevel ?? 0;
    });

    // Also fetch user info for context
    const userDoc = await adminDb.collection('users').doc(targetUserId).get();
    const userData = userDoc.data();

    return NextResponse.json({
      success: true,
      userId: targetUserId,
      userExists: userDoc.exists,
      userEmail: userData?.email || null,
      userName: userData?.displayName || null,
      masteryLevels,
      conceptCount: Object.keys(masteryLevels).length,
    });
  } catch (error) {
    console.error('[Admin User Mastery API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user mastery data' },
      { status: 500 }
    );
  }
}
