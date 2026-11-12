import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-auth'
import { deleteMongoForumReply, updateMongoForumReply } from '@/lib/mongodb-data'

type Context = { params: Promise<{ replyId: string }> }

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    if (!body || typeof body.content !== 'string') return NextResponse.json({ error: 'Réponse invalide.' }, { status: 400 })
    const { replyId } = await params
    const reply = await updateMongoForumReply(replyId, user.id, body.content)
    return NextResponse.json({ reply })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const status = message === 'FORUM_FORBIDDEN' ? 403 : message === 'FORUM_REPLY_NOT_FOUND' ? 404 :
      message.startsWith('La réponse') ? 400 : 500
    if (status === 500) console.error('[CinéTrack] forum reply update failed:', error)
    return NextResponse.json({ error: status === 500 ? 'Impossible de modifier la réponse.' : message }, { status })
  }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })
    const { replyId } = await params
    await deleteMongoForumReply(replyId, user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const status = message === 'FORUM_FORBIDDEN' ? 403 : message === 'FORUM_REPLY_NOT_FOUND' ? 404 : 500
    if (status === 500) console.error('[CinéTrack] forum reply delete failed:', error)
    return NextResponse.json({ error: status === 500 ? 'Impossible de supprimer la réponse.' : message }, { status })
  }
}
