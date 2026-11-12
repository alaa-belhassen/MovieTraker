import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-auth'
import { listFavoriteActors, removeFavoriteActor, setFavoriteActor } from '@/lib/mongodb-data'

export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })
    return NextResponse.json({ actors: await listFavoriteActors(user.id) })
  } catch (error) {
    console.error('[CinéTrack] favorite actor load failed:', error)
    return NextResponse.json({ error: 'FAVORITES_UNAVAILABLE' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })
    const body = await request.json() as { id?: unknown; name?: unknown; profile_path?: unknown }
    if (typeof body.id !== 'number' || typeof body.name !== 'string' ||
      (body.profile_path !== null && body.profile_path !== undefined && typeof body.profile_path !== 'string')) {
      return NextResponse.json({ error: 'Invalid actor.' }, { status: 400 })
    }
    await setFavoriteActor(user.id, { id: body.id, name: body.name, profile_path: typeof body.profile_path === 'string' ? body.profile_path : null })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[CinéTrack] favorite actor save failed:', error)
    const message = error instanceof Error ? error.message : ''
    return NextResponse.json({ error: message === 'Invalid actor.' ? message : 'FAVORITE_SAVE_FAILED' }, { status: message === 'Invalid actor.' ? 400 : 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })
    const actorId = Number(new URL(request.url).searchParams.get('id'))
    if (!Number.isInteger(actorId) || actorId < 1) return NextResponse.json({ error: 'Invalid actor ID.' }, { status: 400 })
    await removeFavoriteActor(user.id, actorId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[CinéTrack] favorite actor removal failed:', error)
    return NextResponse.json({ error: 'FAVORITE_REMOVE_FAILED' }, { status: 500 })
  }
}
