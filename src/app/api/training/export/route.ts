/**
 * Training Data Export API
 *
 * Exports tutoring sessions in various formats for model training.
 * Protected endpoint - requires admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import {
  exportAllTrainingData,
  toJSONL,
  toHuggingFaceFormat,
  calculateExportStats,
} from '@/lib/training/dataExporter';
import { getSessionsForExport } from '@/lib/training/conversationLogger';

// ============================================
// TYPES
// ============================================

type ExportFormat = 'instruction' | 'conversational' | 'preference' | 'reward' | 'huggingface' | 'all';

// ============================================
// MAIN HANDLER
// ============================================

export async function GET(request: NextRequest) {
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

    // Check admin claim - SECURITY: Only trust server-side admin claim, not email domain
    if (!decodedToken.admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const format = (searchParams.get('format') || 'all') as ExportFormat;
    const minQuality = parseFloat(searchParams.get('minQuality') || '0.5');
    const minOutcome = parseFloat(searchParams.get('minOutcome') || '0.3');
    const limit = parseInt(searchParams.get('limit') || '1000');
    const dryRun = searchParams.get('dryRun') === 'true';

    // Dry run - just return stats
    if (dryRun) {
      const sessions = await getSessionsForExport(minQuality, minOutcome, limit);
      const stats = calculateExportStats(sessions);
      return NextResponse.json({
        success: true,
        dryRun: true,
        stats,
        message: `Found ${stats.totalSessions} sessions ready for export`,
      });
    }

    // Full export
    const exportData = await exportAllTrainingData(minQuality, minOutcome, limit);

    // Format response based on requested format
    let data: string;
    let filename: string;

    switch (format) {
      case 'instruction':
        data = toJSONL(exportData.instructionExamples);
        filename = 'instruction_examples.jsonl';
        break;
      case 'conversational':
        data = toJSONL(exportData.conversationalExamples);
        filename = 'conversational_examples.jsonl';
        break;
      case 'preference':
        data = toJSONL(exportData.preferencePairs);
        filename = 'preference_pairs.jsonl';
        break;
      case 'reward':
        data = toJSONL(exportData.rewardExamples);
        filename = 'reward_examples.jsonl';
        break;
      case 'huggingface':
        data = toHuggingFaceFormat(exportData.conversationalExamples);
        filename = 'huggingface_format.jsonl';
        break;
      case 'all':
      default:
        // Return summary with download links
        return NextResponse.json({
          success: true,
          exportedSessionIds: exportData.exportedSessionIds,
          counts: {
            instructionExamples: exportData.instructionExamples.length,
            conversationalExamples: exportData.conversationalExamples.length,
            preferencePairs: exportData.preferencePairs.length,
            rewardExamples: exportData.rewardExamples.length,
          },
          data: {
            instruction: exportData.instructionExamples.slice(0, 3),
            conversational: exportData.conversationalExamples.slice(0, 2),
            preference: exportData.preferencePairs.slice(0, 2),
            reward: exportData.rewardExamples.slice(0, 3),
          },
          message: `Exported ${exportData.exportedSessionIds.length} sessions`,
        });
    }

    // Return as downloadable file
    return new NextResponse(data, {
      headers: {
        'Content-Type': 'application/jsonl',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Training Export API] Error:', errorMessage);

    return NextResponse.json(
      { error: 'Failed to export training data', message: errorMessage },
      { status: 500 }
    );
  }
}

// ============================================
// STATS ENDPOINT
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

    // Check admin claim - SECURITY: Only trust server-side admin claim, not email domain
    if (!decodedToken.admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get stats without exporting
    const sessions = await getSessionsForExport(0.5, 0.3, 10000);
    const stats = calculateExportStats(sessions);

    return NextResponse.json({
      success: true,
      stats,
      readyForExport: sessions.length,
      message: `${sessions.length} sessions available for training export`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Training Export API] Stats error:', errorMessage);

    return NextResponse.json(
      { error: 'Failed to get training stats', message: errorMessage },
      { status: 500 }
    );
  }
}
