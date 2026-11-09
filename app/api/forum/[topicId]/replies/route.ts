import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-auth'
import { createMongoForumReply } from '@/lib/mongodb-data'

type Context = { params: Promise<{ topicId: string }> }

export async function POST(request: NextRequest, { params }: Context) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    if (!body || typeof body.content !== 'string') {
      return NextResponse.json({ error: 'Réponse invalide.' }, { status: 400 })
    }
    const { topicId } = await params
    const reply = await createMongoForumReply(topicId, user, body.content)
    return NextResponse.json({ reply }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const status = message === 'FORUM_TOPIC_NOT_FOUND' ? 404 :
      message.startsWith('La réponse') ? 400 : 500
    if (status === 500) console.error('[CinéTrack] forum reply create failed:', error)
    return NextResponse.json({ error: status === 500 ? 'Impossible de publier la réponse.' : message }, { status })
  }
}
