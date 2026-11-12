import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-auth'
import { tmdbFetch } from '@/lib/tmdb'
import { computeStats, type MovieInfo, type WatchedEntry } from '@/lib/profile-stats'
import { getMongoDatabase } from '@/lib/mongodb'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
    const database = await getMongoDatabase()
    const data = await database.collection<WatchedEntry & { user_id: string; status: string }>('user_movies')
      .find({ user_id: user.id, status: 'watched' }, { projection: { movie_id: 1, watched_at: 1, created_at: 1, rating: 1 } })
      .toArray()
    const entries = data.map(({ _id: _ignored, ...entry }) => entry)
    const ids = [...new Set(entries.map(entry => entry.movie_id))]

    const movies = new Map<number, MovieInfo>()
    let tmdbFailures = 0
    for (let i = 0; i < ids.length; i += 10) {
      const results = await Promise.allSettled(ids.slice(i, i + 10).map(id => tmdbFetch<MovieInfo>(`/movie/${id}`, {}, 86400)))
      results.forEach(result => (result.status === 'fulfilled' ? movies.set(result.value.id, result.value) : tmdbFailures++))
    }

    return NextResponse.json({ ...computeStats(entries, movies), partial: tmdbFailures > 0 })
  } catch (error) {
    console.error('[CinéTrack] profile stats load failed:', error)
    return NextResponse.json({ error: 'Impossible de charger votre historique' }, { status: 500 })
  }
}
