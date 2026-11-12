'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/auth-provider'
import {
  Star,
  Trash2,
  Calendar,
  MessageSquare,
} from 'lucide-react'

import {
  saveMovieReview,
  getMovieReviewsData,
  deleteMovieReview,
} from '@/app/actions/reviews'

interface Review {
  id: string
  rating: number
  comment: string | null
  watched_at: string
}

interface ReviewData {
  userReview: Review | null
  stats: {
    averageRating: number
    totalReviews: number
  }
}

interface ReviewSectionProps {
  tmdbMovieId: number
}

function getTodayDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export default function ReviewSection({
  tmdbMovieId,
}: ReviewSectionProps) {
  const { user, loading: authLoading } = useAuth()
  const [userReview, setUserReview] = useState<Review | null>(null)
  const [stats, setStats] = useState({
    averageRating: 0,
    totalReviews: 0,
  })
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [watchedAt, setWatchedAt] = useState(getTodayDate)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [messageError, setMessageError] = useState(false)

  const loadData = useCallback(async () => {
    const data = (await getMovieReviewsData(tmdbMovieId)) as ReviewData

    setStats(data.stats)
    setUserReview(data.userReview)

    if (data.userReview) {
      setRating(data.userReview.rating)
      setComment(data.userReview.comment ?? '')
      setWatchedAt(
        data.userReview.watched_at?.slice(0, 10) || getTodayDate()
      )
    } else {
      setRating(5)
      setComment('')
      setWatchedAt(getTodayDate())
    }
  }, [tmdbMovieId])

  useEffect(() => {
    let active = true

    async function initialize() {
      try {
        const data = (await getMovieReviewsData(
          tmdbMovieId
        )) as ReviewData

        if (!active) return

        setStats(data.stats)
        setUserReview(data.userReview)

        if (data.userReview) {
          setRating(data.userReview.rating)
          setComment(data.userReview.comment ?? '')
          setWatchedAt(
            data.userReview.watched_at?.slice(0, 10) || getTodayDate()
          )
        }
      } catch (error) {
        if (!active) return

        console.error('Erreur chargement reviews:', error)
        setMessage(
          error instanceof Error
            ? error.message
            : 'Impossible de charger les avis.'
        )
        setMessageError(true)
      } finally {
        if (active) setInitialLoading(false)
      }
    }

    void initialize()

    return () => {
      active = false
    }
  }, [tmdbMovieId])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setMessageError(false)

    try {
      await saveMovieReview({
        tmdbMovieId,
        rating,
        comment,
        watchedAt,
      })

      await loadData()
      setMessage('Avis enregistré avec succès !')
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Impossible d’enregistrer votre avis.'
      )
      setMessageError(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!userReview || loading) return

    if (!window.confirm('Voulez-vous vraiment supprimer votre avis ?')) {
      return
    }

    setLoading(true)
    setMessage('')
    setMessageError(false)

    try {
      await deleteMovieReview(userReview.id, tmdbMovieId)
      await loadData()
      setMessage('Avis supprimé.')
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Impossible de supprimer votre avis.'
      )
      setMessageError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="grid w-full gap-5 text-[#f4f5f2] lg:grid-cols-[minmax(0,.82fr)_minmax(0,1.18fr)]">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-6 shadow-2xl shadow-black/20">
        <div className="absolute -right-16 -top-20 size-56 rounded-full bg-[#d8ff45]/[0.07] blur-3xl" aria-hidden="true" />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#d8ff45]">
                La note des spectateurs
              </p>
              <h2 className="mt-2 text-xl font-semibold">Moyenne des avis</h2>
            </div>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-medium text-white/65">
              {stats.totalReviews} avis
            </span>
          </div>

          <div className="mt-8 flex flex-wrap items-end gap-x-4 gap-y-3">
            <span className="text-5xl font-semibold tracking-tight">
              {stats.totalReviews > 0 ? stats.averageRating.toFixed(1) : '—'}
              <span className="ml-1 text-lg font-medium text-white/40">/ 5</span>
            </span>
            {stats.totalReviews > 0 ? (
              <div
                className="flex gap-1 pb-2"
                role="img"
                aria-label={`Moyenne de ${stats.averageRating.toFixed(1)} sur 5 étoiles`}
              >
                {[1, 2, 3, 4, 5].map((star) => {
                  const fill = Math.min(1, Math.max(0, stats.averageRating - star + 1))
                  return (
                    <span key={star} className="relative block size-6">
                      <Star className="absolute inset-0 size-6 text-white/20" />
                      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                        <Star className="size-6 max-w-none fill-[#d8ff45] text-[#d8ff45]" />
                      </span>
                    </span>
                  )
                })}
              </div>
            ) : null}
          </div>

          <p className="mt-4 max-w-xs text-sm leading-6 text-white/55">
            {stats.totalReviews > 0
              ? 'La note moyenne est calculée à partir de tous les avis déposés pour ce film.'
              : 'Soyez le premier à partager votre note pour ce film.'}
          </p>
        </div>
      </div>

      <div className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-xl shadow-black/10 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#d8ff45]/10 text-[#d8ff45]">
              <MessageSquare className="size-5" />
            </span>
            <div>
              <h2 className="text-xl font-semibold">{userReview ? 'Votre avis' : 'À vous de noter'}</h2>
              <p className="mt-1 text-sm text-white/50">
                {userReview ? 'Vous pouvez modifier votre note à tout moment.' : 'Partagez votre expérience avec la communauté.'}
              </p>
            </div>
          </div>

          {userReview && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              aria-label="Supprimer mon avis"
              title="Supprimer mon avis"
              className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 text-white/45 transition hover:border-red-400/40 hover:bg-red-400/10 hover:text-red-300 disabled:opacity-50"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>

        {initialLoading ? (
          <p className="text-sm text-white/50">
            Chargement de vos avis...
          </p>
        ) : authLoading ? (
          <p className="text-sm text-white/50">Vérification de votre compte...</p>
        ) : !user ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm">
            <p className="text-white/70">Connectez-vous pour noter ce film et partager votre avis.</p>
            <Link
              href={`/auth/login?next=${encodeURIComponent(`/movie/${tmdbMovieId}`)}`}
              className="mt-4 inline-flex rounded-xl bg-[#d8ff45] px-4 py-2.5 font-semibold text-black transition hover:brightness-110"
            >
              Se connecter
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-white/70">
                  Votre note
                </legend>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      aria-label={`Noter ${star} sur 5`}
                      aria-pressed={rating === star}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onFocus={() => setHoverRating(star)}
                      onBlur={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="rounded-lg p-1 transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8ff45]"
                    >
                      <Star
                        className={`size-7 transition-colors ${
                          star <= (hoverRating || rating)
                            ? 'fill-[#d8ff45] text-[#d8ff45]'
                            : 'text-white/20'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-white/40">{rating} sur 5</p>
              </fieldset>

              <label
                htmlFor="review-watched-at"
                className="text-sm font-medium text-white/70"
              >
                <span className="mb-2 flex items-center gap-2">
                  <Calendar className="size-4 text-[#d8ff45]" />
                  Date de visionnage
                </span>
                <input
                  id="review-watched-at"
                  type="date"
                  value={watchedAt}
                  onChange={(event) => setWatchedAt(event.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-[#f4f5f2] outline-none transition focus:border-[#d8ff45]/60 focus:ring-2 focus:ring-[#d8ff45]/10"
                />
              </label>
            </div>

            <div>
              <label
                htmlFor="review-comment"
                className="mb-2 flex items-center gap-2 text-sm font-medium text-white/70"
              >
                <MessageSquare className="size-4 text-[#d8ff45]" />
                Commentaire
              </label>

              <textarea
                id="review-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Qu’avez-vous pensé du film ?"
                className="w-full resize-none rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-[#f4f5f2] outline-none transition placeholder:text-white/25 focus:border-[#d8ff45]/60 focus:ring-2 focus:ring-[#d8ff45]/10"
              />

              <p className="mt-1.5 text-right text-xs text-white/35">
                {comment.length}/2000
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !watchedAt}
              className="w-full rounded-xl bg-[#d8ff45] py-3 font-semibold text-black shadow-lg shadow-[#d8ff45]/10 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? 'Enregistrement...'
                : userReview
                  ? 'Modifier mon avis'
                  : 'Enregistrer mon avis'}
            </button>
          </form>
        )}

        {message && (
          <p
            role="status"
            className={`rounded-xl border px-4 py-3 text-sm font-medium ${
              messageError ? 'border-red-400/20 bg-red-400/5 text-red-300' : 'border-[#d8ff45]/20 bg-[#d8ff45]/5 text-[#d8ff45]'
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </section>
  )
}
