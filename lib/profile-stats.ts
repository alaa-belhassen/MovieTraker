// U3 - Calcul des statistiques du profil (fonctions pures, sans accès réseau)

export type WatchedEntry = { movie_id: number; watched_at: string | null; created_at: string | null; rating: number | null }
export type MovieInfo = { id: number; title: string; poster_path: string | null; runtime: number | null; genres: { id: number; name: string }[] }

export type ProfileStats = {
  watchedCount: number
  totalMinutes: number
  favoriteGenre: string | null
  bestRated: { id: number; title: string; rating: number } | null
  monthly: { month: string; hours: number }[]
  recent: { id: number; title: string; poster_path: string | null; date: string | null }[]
}

const MONTHS = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc']
const entryDate = (e: WatchedEntry) => e.watched_at ?? e.created_at

export function computeStats(entries: WatchedEntry[], movies: Map<number, MovieInfo>, now = new Date()): ProfileStats {
  // Un film vu plusieurs fois ne compte qu'une fois (on garde la visualisation la plus récente)
  const byMovie = new Map<number, WatchedEntry>()
  for (const e of entries) {
    const prev = byMovie.get(e.movie_id)
    if (!prev || (entryDate(e) ?? '') > (entryDate(prev) ?? '')) byMovie.set(e.movie_id, e)
  }
  const watched = [...byMovie.values()].sort((a, b) => (entryDate(b) ?? '').localeCompare(entryDate(a) ?? ''))

  let totalMinutes = 0
  const genreCount = new Map<string, number>()
  let best: ProfileStats['bestRated'] = null
  for (const e of watched) {
    const info = movies.get(e.movie_id)
    totalMinutes += info?.runtime ?? 0
    info?.genres.forEach((g) => genreCount.set(g.name, (genreCount.get(g.name) ?? 0) + 1))
    if (e.rating != null && (!best || e.rating > best.rating)) best = { id: e.movie_id, title: info?.title ?? 'Film', rating: e.rating }
  }
  const favoriteGenre = [...genreCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  // Heures regardées sur les 6 derniers mois
  const buckets = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return { key: `${d.getFullYear()}-${d.getMonth()}`, month: MONTHS[d.getMonth()], minutes: 0 }
  })
  for (const e of watched) {
    const raw = entryDate(e)
    if (!raw) continue
    const d = new Date(raw)
    const bucket = buckets.find((b) => b.key === `${d.getFullYear()}-${d.getMonth()}`)
    if (bucket) bucket.minutes += movies.get(e.movie_id)?.runtime ?? 0
  }

  return {
    watchedCount: watched.length,
    totalMinutes,
    favoriteGenre,
    bestRated: best,
    monthly: buckets.map((b) => ({ month: b.month, hours: Math.round((b.minutes / 60) * 10) / 10 })),
    recent: watched.slice(0, 5).map((e) => ({ id: e.movie_id, title: movies.get(e.movie_id)?.title ?? 'Film', poster_path: movies.get(e.movie_id)?.poster_path ?? null, date: entryDate(e) })),
  }
}

export function formatDuration(totalMinutes: number) {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${h} h ${String(m).padStart(2, '0')}`
}
