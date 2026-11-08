import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-auth'
import { deleteMongoForumTopic, getMongoForumTopic, updateMongoForumTopic } from '@/lib/mongodb-data'

type Context = { params: Promise<{ topicId: string }> }

export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const { topicId } = await params
    const discussion = await getMongoForumTopic(topicId)
    if (!discussion) return NextResponse.json({ error: 'Discussion introuvable.' }, { status: 404 })
    return NextResponse.json({ discussion }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[CinéTrack] forum discussion load failed:', error)
    return NextResponse.json({ error: 'Impossible de charger cette discussion.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    if (!body || typeof body.title !== 'string' || typeof body.content !== 'string' || typeof body.category !== 'string') {
      return NextResponse.json({ error: 'Informations de discussion invalides.' }, { status: 400 })
    }
    const { topicId } = await params
    const topic = await updateMongoForumTopic(topicId, user.id, {
      title: body.title,
      content: body.content,
      category: body.category,
    })
    return NextResponse.json({ topic })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const status = message === 'FORUM_FORBIDDEN' ? 403 : message === 'FORUM_TOPIC_NOT_FOUND' ? 404 :
      message.startsWith('Le titre') || message.startsWith('Le message') || message.startsWith('Catégorie') ? 400 : 500
    if (status === 500) console.error('[CinéTrack] forum discussion update failed:', error)
    return NextResponse.json({ error: status === 500 ? 'Impossible de modifier la discussion.' : message }, { status })
  }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })
    const { topicId } = await params
    await deleteMongoForumTopic(topicId, user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const status = message === 'FORUM_FORBIDDEN' ? 403 : message === 'FORUM_TOPIC_NOT_FOUND' ? 404 : 500
    if (status === 500) console.error('[CinéTrack] forum discussion delete failed:', error)
    return NextResponse.json({ error: status === 500 ? 'Impossible de supprimer la discussion.' : message }, { status })
  }
}
