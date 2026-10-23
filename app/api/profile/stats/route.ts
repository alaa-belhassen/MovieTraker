import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { tmdbFetch } from '@/lib/tmdb'
import { computeStats, type MovieInfo, type WatchedEntry } from '@/lib/profile-stats'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const { data, error } = await supabase
    .from('user_movies')
    .select('movie_id, watched_at, created_at, rating')
    .eq('user_id', user.id)
    .eq('status', 'watched')
  if (error) return NextResponse.json({ error: 'Impossible de charger votre historique' }, { status: 500 })

  const entries = (data ?? []) as WatchedEntry[]
  const ids = [...new Set(entries.map((e) => e.movie_id))]

  // Genre et durée viennent de TMDB (mis en cache 24 h). Un film en échec est simplement ignoré.
  const movies = new Map<number, MovieInfo>()
  let tmdbFailures = 0
  for (let i = 0; i < ids.length; i += 10) {
    const results = await Promise.allSettled(ids.slice(i, i + 10).map((id) => tmdbFetch<MovieInfo>(`/movie/${id}`, {}, 86400)))
    results.forEach((r) => (r.status === 'fulfilled' ? movies.set(r.value.id, r.value) : tmdbFailures++))
  }

  return NextResponse.json({ ...computeStats(entries, movies), partial: tmdbFailures > 0 })
}
