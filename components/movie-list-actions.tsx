'use client'

import { useEffect, useState } from 'react'
import { Bookmark, Check, Eye } from 'lucide-react'
import {
  getCurrentUser,
  getMyMovies,
  saveMovie,
} from '@/lib/cinetrack-data'

export default function MovieListActions({
  movieId,
}: {
  movieId: number
}) {
  const [saved, setSaved] = useState(false)
  const [watched, setWatched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')

  // Vérifier les listes de l'utilisateur
  useEffect(() => {
    let cancelled = false

    async function checkMovieStatus() {
      try {
        const user = await getCurrentUser()

        if (!user) return

        const movies = await getMyMovies()

        if (cancelled) return

        setSaved(
          movies.some(
            (movie) =>
              movie.movie_id === movieId &&
              movie.status === 'watchlist'
          )
        )

        setWatched(
          movies.some(
            (movie) =>
              movie.movie_id === movieId &&
              movie.status === 'watched'
          )
        )
      } catch {
        if (!cancelled) {
          setError(
            "Impossible de vérifier le statut du film."
          )
        }
      } finally {
        if (!cancelled) {
          setChecking(false)
        }
      }
    }

    void checkMovieStatus()

    return () => {
      cancelled = true
    }
  }, [movieId])

  // Ajouter à la liste À regarder
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
      setWatched(false)
    } catch {
      setError(
        "Impossible d'ajouter le film à la liste."
      )
    } finally {
      setLoading(false)
    }
  }

  // Marquer le film comme vu
  async function markAsWatched() {
    setLoading(true)
    setError('')

    try {
      const user = await getCurrentUser()

      if (!user) {
        window.location.href = '/auth/login'
        return
      }

      await saveMovie(movieId, 'watched')

      setWatched(true)
      setSaved(false)
    } catch {
      setError(
        "Impossible de marquer le film comme vu."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-3">

        {/* Bouton À regarder */}
        <button
          type="button"
          onClick={addToWatchlist}
          disabled={loading || checking || saved}
          className="flex items-center gap-2 rounded-xl bg-lime-400 px-5 py-3 font-semibold text-black disabled:opacity-60"
        >
          {saved ? (
            <Check size={20} />
          ) : (
            <Bookmark size={20} />
          )}

          {checking
            ? 'Vérification...'
            : loading
              ? 'Enregistrement...'
              : saved
                ? 'Ajouté à ma liste'
                : 'À regarder'}
        </button>

        {/* Bouton Déjà vu */}
        <button
          type="button"
          onClick={markAsWatched}
          disabled={loading || checking || watched}
          className="flex items-center gap-2 rounded-xl border border-white/30 px-5 py-3 font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
        >
          {watched ? (
            <Check size={20} />
          ) : (
            <Eye size={20} />
          )}

          {checking
            ? 'Vérification...'
            : loading
              ? 'Enregistrement...'
              : watched
                ? 'Déjà vu ✓'
                : 'Marquer comme vu'}
        </button>

      </div>

      {error && (
        <p className="mt-3 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}