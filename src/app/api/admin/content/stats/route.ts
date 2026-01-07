import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/apiAuth'
import { getContentStats } from '@/lib/services/contentService'

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)

  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const stats = await getContentStats()
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error getting content stats:', error)
    return NextResponse.json(
      { error: 'Failed to get content stats' },
      { status: 500 }
    )
  }
}
