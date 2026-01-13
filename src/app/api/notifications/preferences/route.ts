import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { z } from 'zod';

// ============================================
// VALIDATION SCHEMAS
// ============================================

const notificationPreferencesSchema = z.object({
  enabled: z.boolean().optional(),
  streakReminders: z.boolean().optional(),
  reviewReminders: z.boolean().optional(),
  masteryAlerts: z.boolean().optional(),
  achievements: z.boolean().optional(),
  courseReminders: z.boolean().optional(),
  weeklySummary: z.boolean().optional(),
  quietHoursStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().nullable(),
  quietHoursEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().nullable(),
  preferredReminderTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().nullable(),
  timezone: z.string().optional(),
});

// ============================================
// DEFAULT PREFERENCES
// ============================================

const DEFAULT_PREFERENCES = {
  enabled: true,
  streakReminders: true,
  reviewReminders: true,
  masteryAlerts: true,
  achievements: true,
  courseReminders: true,
  weeklySummary: true,
  quietHoursStart: null,
  quietHoursEnd: null,
  preferredReminderTime: null,
  timezone: 'UTC',
};

// ============================================
// HELPER: Verify user authentication
// ============================================

async function verifyAuth(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const idToken = authHeader.slice(7);

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return decodedToken.uid;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

// ============================================
// GET /api/notifications/preferences
// Fetch user notification preferences
// ============================================

export async function GET(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get preferences from Firestore
    const prefsRef = adminDb.collection('notificationPreferences').doc(userId);
    const prefsSnap = await prefsRef.get();

    if (!prefsSnap.exists) {
      // Return default preferences
      return NextResponse.json({
        success: true,
        preferences: DEFAULT_PREFERENCES,
        isDefault: true,
      });
    }

    const preferences = prefsSnap.data();

    // Merge with defaults to ensure all fields exist
    const mergedPreferences = {
      ...DEFAULT_PREFERENCES,
      ...preferences,
    };

    return NextResponse.json({
      success: true,
      preferences: mergedPreferences,
      isDefault: false,
    });
  } catch (error) {
    console.error('Get notification preferences error:', error);
    return NextResponse.json(
      { error: 'Failed to get notification preferences' },
      { status: 500 }
    );
  }
}

// ============================================
// PUT /api/notifications/preferences
// Update user notification preferences
// ============================================

export async function PUT(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validation = notificationPreferencesSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const updates = validation.data;

    // Update preferences in Firestore
    const prefsRef = adminDb.collection('notificationPreferences').doc(userId);

    await prefsRef.set(
      {
        ...updates,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    // Fetch updated preferences
    const prefsSnap = await prefsRef.get();
    const preferences = prefsSnap.data();

    // Merge with defaults
    const mergedPreferences = {
      ...DEFAULT_PREFERENCES,
      ...preferences,
    };

    return NextResponse.json({
      success: true,
      preferences: mergedPreferences,
      message: 'Preferences updated successfully',
    });
  } catch (error) {
    console.error('Update notification preferences error:', error);
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
}

// ============================================
// PATCH /api/notifications/preferences
// Partial update (alias for PUT with merge)
// ============================================

export async function PATCH(request: NextRequest) {
  return PUT(request);
}

// ============================================
// DELETE /api/notifications/preferences
// Reset preferences to defaults
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Delete user preferences (they'll get defaults on next fetch)
    const prefsRef = adminDb.collection('notificationPreferences').doc(userId);
    await prefsRef.delete();

    return NextResponse.json({
      success: true,
      preferences: DEFAULT_PREFERENCES,
      message: 'Preferences reset to defaults',
    });
  } catch (error) {
    console.error('Reset notification preferences error:', error);
    return NextResponse.json(
      { error: 'Failed to reset notification preferences' },
      { status: 500 }
    );
  }
}
