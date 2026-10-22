
'use client'

import { useState } from 'react'
import { Bookmark, Check } from 'lucide-react'
import { getCurrentUser, saveMovie } from '@/lib/cinetrack-data'

export default function MovieListActions({
  movieId,
}: {
  movieId: number
}) {
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function addToWatchlist() {
    setLoading(true)
    setError('')

    try {
      const user = await getCurrentUser()

      if (!user) {
        window.location.href = '/auth/login'
        return
      }

      await saveMovie(movieId, 'watchlist')
      setSaved(true)
    } catch {
      setError("Impossible d'ajouter le film.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={addToWatchlist}
        disabled={loading || saved}
        className="flex items-center gap-2 rounded-xl bg-lime-400 px-5 py-3 font-semibold text-black disabled:opacity-60"
      >
        {saved ? <Check size={20} /> : <Bookmark size={20} />}
        {loading
          ? 'Enregistrement...'
          : saved
            ? 'Ajouté à ma liste'
            : 'À regarder'}
      </button>

      {error && (
        <p className="mt-2 text-sm text-red-400">{error}</p>
      )}
    </div>
  )
}
