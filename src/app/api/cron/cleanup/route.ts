import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { adminDb } from '@/lib/firebase/admin'
import { logger } from '@/lib/monitoring/logger'

/**
 * Cron job for cleaning up stale data
 * Runs daily at midnight (configured in vercel.json)
 */
export async function GET(_request: Request) {
  // Verify this is a legitimate cron request from Vercel
  const headersList = await headers()
  const authHeader = headersList.get('authorization')

  // In production, verify the CRON_SECRET
  if (process.env.NODE_ENV === 'production') {
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('Unauthorized cron access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const results = {
      expiredSessions: 0,
      staleDrafts: 0,
      orphanedMedia: 0,
    }

    // Clean up expired user sessions (older than 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const expiredSessionsSnapshot = await adminDb
      .collection('userSessions')
      .where('lastActive', '<', thirtyDaysAgo)
      .limit(500)
      .get()

    const sessionBatch = adminDb.batch()
    expiredSessionsSnapshot.docs.forEach((doc) => {
      sessionBatch.delete(doc.ref)
      results.expiredSessions++
    })

    if (results.expiredSessions > 0) {
      await sessionBatch.commit()
    }

    // Clean up stale progress drafts (older than 7 days without completion)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const staleDraftsSnapshot = await adminDb
      .collection('progressDrafts')
      .where('updatedAt', '<', sevenDaysAgo)
      .where('status', '==', 'draft')
      .limit(500)
      .get()

    const draftBatch = adminDb.batch()
    staleDraftsSnapshot.docs.forEach((doc) => {
      draftBatch.delete(doc.ref)
      results.staleDrafts++
    })

    if (results.staleDrafts > 0) {
      await draftBatch.commit()
    }

    logger.info('Cron cleanup completed', { results })

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed',
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error')
    logger.error('Cron cleanup failed', error)
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
