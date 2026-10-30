import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-auth'
import { submitMongoReport } from '@/lib/mongodb-data'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })
    const body = await request.json() as { targetType?: unknown; targetId?: unknown; reason?: unknown }
    if ((body.targetType !== 'topic' && body.targetType !== 'message') ||
      typeof body.targetId !== 'string' || typeof body.reason !== 'string') {
      return NextResponse.json({ error: 'Invalid report.' }, { status: 400 })
    }
    await submitMongoReport(user.id, body.targetType, body.targetId, body.reason)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[CinéTrack] report submission failed:', error)
    const message = error instanceof Error ? error.message : ''
    return NextResponse.json({ error: message.startsWith('Le motif') ? message : 'REPORT_FAILED' }, { status: message.startsWith('Le motif') ? 400 : 500 })
  }
}
