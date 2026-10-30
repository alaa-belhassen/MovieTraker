'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Star,
  Trash2,
  CheckCircle,
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
    <section className="w-full space-y-4 text-[#F7F3EA]">
      <div className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-[#1E2440] p-4 shadow">
        <div>
          <p className="text-xs font-semibold uppercase text-[#8E93AD]">
            Note des spectateurs
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-2xl font-bold text-[#F5B841]">
              {stats.totalReviews > 0
                ? `${stats.averageRating} / 5`
                : 'Pas encore de note'}
            </span>
            <Star className="size-5 fill-[#F5B841] text-[#F5B841]" />
          </div>
        </div>

        <span className="text-sm text-[#8E93AD]">
          {stats.totalReviews} avis
        </span>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/5 bg-[#1E2440] p-5 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-lg font-bold">
            <CheckCircle
              className={`size-5 ${
                userReview ? 'text-[#E63946]' : 'text-[#8E93AD]'
              }`}
            />
            {userReview ? 'Votre avis' : 'Marquer comme « Déjà vu »'}
          </h3>

          {userReview && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              aria-label="Supprimer mon avis"
              title="Supprimer mon avis"
              className="text-[#8E93AD] transition hover:text-[#E63946] disabled:opacity-50"
            >
              <Trash2 className="size-5" />
            </button>
          )}
        </div>

        {initialLoading ? (
          <p className="text-sm text-[#8E93AD]">
            Chargement de vos avis...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="review-watched-at"
                className="mb-1 flex items-center gap-1 text-xs text-[#8E93AD]"
              >
                <Calendar className="size-3.5" />
                Date de visionnage
              </label>

              <input
                id="review-watched-at"
                type="date"
                value={watchedAt}
                onChange={(event) => setWatchedAt(event.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-[#0F1220] p-2.5 text-sm text-[#F7F3EA] focus:border-[#E63946] focus:outline-none"
              />
            </div>

            <fieldset>
              <legend className="mb-1 text-xs text-[#8E93AD]">
                Votre note
              </legend>

              <div className="flex gap-2">
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
                    className="rounded p-1 focus:outline-none focus:ring-2 focus:ring-[#F5B841]"
                  >
                    <Star
                      className={`size-7 ${
                        star <= (hoverRating || rating)
                          ? 'fill-[#F5B841] text-[#F5B841]'
                          : 'text-gray-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <label
                htmlFor="review-comment"
                className="mb-1 flex items-center gap-1 text-xs text-[#8E93AD]"
              >
                <MessageSquare className="size-3.5" />
                Commentaire
              </label>

              <textarea
                id="review-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Qu’avez-vous pensé du film ?"
                className="w-full resize-none rounded-lg border border-white/10 bg-[#0F1220] p-3 text-sm text-[#F7F3EA] focus:border-[#E63946] focus:outline-none"
              />

              <p className="mt-1 text-right text-xs text-[#8E93AD]">
                {comment.length}/2000
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !watchedAt}
              className="w-full rounded-xl bg-[#E63946] py-3 font-bold text-white transition hover:bg-[#E63946]/90 disabled:cursor-not-allowed disabled:opacity-50"
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
            className={`text-center text-sm font-medium ${
              messageError ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </section>
  )
}
