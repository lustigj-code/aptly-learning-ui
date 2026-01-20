/**
 * Synthetic Training Data Generation API
 *
 * Generates synthetic Socratic dialogue examples for model training.
 * Protected endpoint - requires admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { adminAuth } from '@/lib/firebase/admin';
import {
  generateSocraticConversations,
  generatePreferencePairsData,
  generateInstructionData,
  formatForTraining,
  CURRICULUM_TOPICS,
  STUDENT_PERSONAS,
} from '@/lib/training/syntheticDataGenerator';

// ============================================
// MAIN HANDLER
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decodedToken = await adminAuth.verifyIdToken(token);

    if (!decodedToken.admin && !decodedToken.email?.endsWith('@aptly.io')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Check for Gemini API key
    const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: 'GOOGLE_GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);

    // Parse request body
    const body = await request.json();
    const {
      type = 'conversations',
      count = 10, // Default to small batch
    } = body;

    let data;

    switch (type) {
      case 'conversations':
        const conversations = await generateSocraticConversations(genAI, count);
        data = formatForTraining({
          conversations,
          preferencePairs: [],
          instructions: [],
        });
        return NextResponse.json({
          success: true,
          type: 'conversations',
          count: conversations.length,
          sample: conversations.slice(0, 2),
          downloadData: data.conversationsJsonl,
        });

      case 'preference':
        const pairs = await generatePreferencePairsData(genAI, count);
        data = formatForTraining({
          conversations: [],
          preferencePairs: pairs,
          instructions: [],
        });
        return NextResponse.json({
          success: true,
          type: 'preference',
          count: pairs.length,
          sample: pairs.slice(0, 2),
          downloadData: data.preferencePairsJsonl,
        });

      case 'instruction':
        const instructions = await generateInstructionData(genAI, count);
        data = formatForTraining({
          conversations: [],
          preferencePairs: [],
          instructions,
        });
        return NextResponse.json({
          success: true,
          type: 'instruction',
          count: instructions.length,
          sample: instructions.slice(0, 2),
          downloadData: data.instructionsJsonl,
        });

      default:
        return NextResponse.json(
          { error: `Unknown type: ${type}. Use 'conversations', 'preference', or 'instruction'` },
          { status: 400 }
        );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Synthetic Data API] Error:', errorMessage);

    return NextResponse.json(
      { error: 'Failed to generate synthetic data', message: errorMessage },
      { status: 500 }
    );
  }
}

// ============================================
// GET - Show available options
// ============================================

export async function GET() {
  return NextResponse.json({
    info: 'Synthetic Training Data Generator',
    availableTypes: ['conversations', 'preference', 'instruction'],
    curriculum: {
      modules: CURRICULUM_TOPICS.length,
      topics: CURRICULUM_TOPICS.flatMap(m => m.topics).length,
      personas: STUDENT_PERSONAS.length,
    },
    usage: {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer <firebase-id-token>',
        'Content-Type': 'application/json',
      },
      body: {
        type: 'conversations | preference | instruction',
        count: 'number (default 10)',
      },
    },
    example: {
      type: 'conversations',
      count: 50,
    },
  });
}
