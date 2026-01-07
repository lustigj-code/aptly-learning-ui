import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';

const updateProfileSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1).optional(),
  avatar: z.string().url().optional().nullable(),
  preferences: z
    .object({
      learningGoal: z.string().optional().nullable(),
      experienceLevel: z.number().optional(),
      dailyGoalMinutes: z.number().optional(),
      learningPace: z.enum(['relaxed', 'steady', 'intensive', 'moderate']).optional(),
      soundEnabled: z.boolean().optional(),
      voiceEnabled: z.boolean().optional(),
      reducedMotion: z.boolean().optional(),
      selectedCharacter: z.string().optional(),
    })
    .optional(),
});

/**
 * PATCH /api/users/update-profile
 * Updates user profile data in Firestore
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = updateProfileSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { userId, name, avatar, preferences } = validation.data;

    // Build update object - only include fields that are provided
    const updateData: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (name !== undefined) {
      updateData.name = name;
    }

    if (avatar !== undefined) {
      updateData.avatar = avatar;
    }

    if (preferences !== undefined) {
      // Merge preferences with existing ones
      const userDoc = await adminDb.collection('users').doc(userId).get();
      const existingPrefs = userDoc.exists ? userDoc.data()?.preferences || {} : {};

      updateData.preferences = {
        ...existingPrefs,
        ...preferences,
      };
    }

    // Update user document
    await adminDb.collection('users').doc(userId).update(updateData);

    return NextResponse.json(
      {
        success: true,
        message: 'Profile updated successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
