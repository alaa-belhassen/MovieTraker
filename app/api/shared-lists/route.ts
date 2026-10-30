import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-auth'
import {
  acceptMongoSharedList,
  createMongoSharedList,
  getMongoListInviteToken,
  inviteMongoSharedListMember,
  voteMongoSharedList,
} from '@/lib/mongodb-data'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })
    const listId = new URL(request.url).searchParams.get('id')
    if (!listId) return NextResponse.json({ error: 'LIST_ID_REQUIRED' }, { status: 400 })
    const list = await getMongoListInviteToken(listId, user.id)
    return NextResponse.json({ invite_token: list?.invite_token ?? null })
  } catch (error) {
    console.error('[CinéTrack] shared list link load failed:', error)
    return NextResponse.json({ error: 'LIST_UNAVAILABLE' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })
    const body = await request.json() as Record<string, unknown>

    if (body.action === 'create' && typeof body.name === 'string') {
      return NextResponse.json(await createMongoSharedList(body.name, user), { status: 201 })
    }
    if (body.action === 'accept' && typeof body.inviteToken === 'string') {
      return NextResponse.json(await acceptMongoSharedList(body.inviteToken, user.id))
    }
    if (body.action === 'invite' && typeof body.listId === 'string' && typeof body.username === 'string') {
      const profile = await inviteMongoSharedListMember(body.listId, body.username, user.id)
      return NextResponse.json({ username: profile.username })
    }
    if (body.action === 'vote' && typeof body.listId === 'string' && typeof body.movieId === 'number') {
      await voteMongoSharedList(body.listId, body.movieId, user.id)
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ error: 'Invalid shared list action.' }, { status: 400 })
  } catch (error) {
    console.error('[CinéTrack] shared list action failed:', error)
    const message = error instanceof Error ? error.message : ''
    const status = message === 'LIST_ACCESS_DENIED' ? 403 : message === 'USER_NOT_FOUND' || message === 'LIST_NOT_FOUND' ? 404 : message.startsWith('Le nom') || message === 'Invalid movie ID.' ? 400 : 500
    const publicMessage = status === 403 ? 'LIST_ACCESS_DENIED' : status === 404 ? message : status === 400 ? message : 'SHARED_LIST_FAILED'
    return NextResponse.json({ error: publicMessage }, { status })
  }
}
