import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';

// ============================================
// VALIDATION SCHEMAS
// ============================================

const subscribeSchema = z.object({
  token: z.string().min(1, 'FCM token is required'),
  platform: z.enum(['web', 'ios', 'android']).default('web'),
});

const unsubscribeSchema = z.object({
  token: z.string().min(1, 'FCM token is required'),
});

// ============================================
// HELPERS
// ============================================

/**
 * Extract user ID from authorization header
 */
function getUserIdFromHeader(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

// ============================================
// POST - Subscribe to notifications
// ============================================

/**
 * POST /api/notifications/subscribe
 *
 * Subscribe a device to push notifications by saving the FCM token.
 *
 * Request body:
 * - token: string (FCM registration token)
 * - platform: 'web' | 'ios' | 'android' (default: 'web')
 *
 * Response:
 * - success: boolean
 * - message: string
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const userId = getUserIdFromHeader(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authorization header required' },
        { status: 401 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validation = subscribeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { token, platform } = validation.data;

    // Create a unique document ID from userId and token suffix
    const tokenSuffix = token.slice(-10);
    const docId = `${userId}_${tokenSuffix}`;

    // Save or update the FCM token
    const tokenRef = adminDb.collection('fcmTokens').doc(docId);

    await tokenRef.set(
      {
        userId,
        token,
        platform,
        isActive: true,
        createdAt: FieldValue.serverTimestamp(),
        lastUsedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Also update the user's notification preferences to indicate they have a device registered
    const prefsRef = adminDb.collection('notificationPreferences').doc(userId);
    await prefsRef.set(
      {
        hasActiveDevice: true,
        lastDeviceRegistered: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Successfully subscribed to notifications',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json(
      {
        error: 'Failed to subscribe',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE - Unsubscribe from notifications
// ============================================

/**
 * DELETE /api/notifications/subscribe
 *
 * Unsubscribe a device from push notifications by deactivating the FCM token.
 *
 * Request body:
 * - token: string (FCM registration token to deactivate)
 *
 * Response:
 * - success: boolean
 * - message: string
 */
export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user
    const userId = getUserIdFromHeader(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authorization header required' },
        { status: 401 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validation = unsubscribeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { token } = validation.data;

    // Find and deactivate the token
    const tokensSnap = await adminDb
      .collection('fcmTokens')
      .where('userId', '==', userId)
      .where('token', '==', token)
      .get();

    if (tokensSnap.empty) {
      return NextResponse.json(
        {
          success: true,
          message: 'Token not found or already deactivated',
        },
        { status: 200 }
      );
    }

    // Deactivate all matching tokens
    const batch = adminDb.batch();
    tokensSnap.docs.forEach((doc) => {
      batch.update(doc.ref, {
        isActive: false,
        deactivatedAt: FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();

    // Check if user has any remaining active tokens
    const remainingTokensSnap = await adminDb
      .collection('fcmTokens')
      .where('userId', '==', userId)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    // Update notification preferences if no more active devices
    if (remainingTokensSnap.empty) {
      const prefsRef = adminDb.collection('notificationPreferences').doc(userId);
      await prefsRef.set(
        {
          hasActiveDevice: false,
        },
        { merge: true }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Successfully unsubscribed from notifications',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json(
      {
        error: 'Failed to unsubscribe',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================
// GET - Check subscription status
// ============================================

/**
 * GET /api/notifications/subscribe?token=xxx
 *
 * Check if a specific token is subscribed for the authenticated user.
 *
 * Query params:
 * - token: string (optional, FCM registration token)
 *
 * Response:
 * - isSubscribed: boolean
 * - activeTokenCount: number
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const userId = getUserIdFromHeader(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authorization header required' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    // If specific token provided, check that token
    if (token) {
      const tokensSnap = await adminDb
        .collection('fcmTokens')
        .where('userId', '==', userId)
        .where('token', '==', token)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      return NextResponse.json(
        {
          isSubscribed: !tokensSnap.empty,
          token: token.slice(-10) + '...',
        },
        { status: 200 }
      );
    }

    // Otherwise, count all active tokens for user
    const tokensSnap = await adminDb
      .collection('fcmTokens')
      .where('userId', '==', userId)
      .where('isActive', '==', true)
      .get();

    return NextResponse.json(
      {
        isSubscribed: !tokensSnap.empty,
        activeTokenCount: tokensSnap.size,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Check subscription error:', error);
    return NextResponse.json(
      {
        error: 'Failed to check subscription',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
