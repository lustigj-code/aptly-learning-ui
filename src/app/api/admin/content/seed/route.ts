import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/apiAuth'
import { seedCoursesToFirestore } from '@/lib/services/contentService'

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request)

  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const result = await seedCoursesToFirestore()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error seeding content:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to seed content' },
      { status: 500 }
    )
  }
}
