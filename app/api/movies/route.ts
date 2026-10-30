import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-auth'
import { listMovieEntries, saveMovieEntry } from '@/lib/mongodb-data'

const STATUSES = new Set(['watchlist', 'watched', 'favorite'])

export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })
    const entries = await listMovieEntries(user.id)
    return NextResponse.json(entries.map(({ _id: _ignored, ...entry }) => entry))
  } catch (error) {
    console.error('[CinéTrack] movie list load failed:', error)
    return NextResponse.json({ error: 'MOVIES_UNAVAILABLE' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })
    const body = await request.json() as { movieId?: unknown; status?: unknown; watchedAt?: unknown }
    if (typeof body.movieId !== 'number' || typeof body.status !== 'string' || !STATUSES.has(body.status)) {
      return NextResponse.json({ error: 'Invalid movie entry.' }, { status: 400 })
    }
    if (body.watchedAt !== undefined && body.watchedAt !== null && typeof body.watchedAt !== 'string') {
      return NextResponse.json({ error: 'Invalid watched date.' }, { status: 400 })
    }
    await saveMovieEntry(user.id, body.movieId, body.status as 'watchlist' | 'watched' | 'favorite', body.watchedAt as string | undefined)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[CinéTrack] movie entry save failed:', error)
    const message = error instanceof Error ? error.message : ''
    return NextResponse.json({ error: message === 'Invalid movie ID.' ? message : 'MOVIE_SAVE_FAILED' }, { status: message === 'Invalid movie ID.' ? 400 : 500 })
  }
}
