'use server'

import { getAuthenticatedUser as getApiAuthenticatedUser } from '@/lib/api-auth'
import { getMongoDatabase } from '@/lib/mongodb'
import { ObjectId, type Document } from 'mongodb'
import { revalidatePath } from 'next/cache'

type SaveMovieReviewInput = {
  tmdbMovieId: number
  rating: number
  comment: string
  watchedAt: string
}

type MovieReviewDocument = Document & {
  user_id: string
  tmdb_movie_id: number
  rating: number
  comment: string
  watched_at: string
  created_at: Date
  updated_at: Date
}

function validateMovieId(tmdbMovieId: number) {
  if (!Number.isSafeInteger(tmdbMovieId) || tmdbMovieId <= 0) {
    throw new Error('Identifiant de film invalide.')
  }
}

function validateWatchedAt(watchedAt: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(watchedAt) ||
    Number.isNaN(Date.parse(`${watchedAt}T00:00:00Z`)) ||
    new Date(`${watchedAt}T00:00:00Z`).toISOString().slice(0, 10) !== watchedAt
  ) {
    throw new Error('Date de visionnage invalide.')
  }
}

async function getAuthenticatedUser() {
  const user = await getApiAuthenticatedUser()
  if (!user) {
    throw new Error('Vous devez être connecté pour effectuer cette action.')
  }
  return user
}

async function getReviewsCollection() {
  const database = await getMongoDatabase()
  return database.collection<MovieReviewDocument>('reviews')
}

export async function saveMovieReview({
  tmdbMovieId,
  rating,
  comment,
  watchedAt,
}: SaveMovieReviewInput) {
  validateMovieId(tmdbMovieId)

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error('La note doit être comprise entre 1 et 5.')
  }

  if (typeof comment !== 'string' || comment.length > 2000) {
    throw new Error('Le commentaire ne doit pas dépasser 2000 caractères.')
  }

  if (typeof watchedAt !== 'string') {
    throw new Error('Date de visionnage invalide.')
  }

  validateWatchedAt(watchedAt)

  const user = await getAuthenticatedUser()
  const reviews = await getReviewsCollection()
  const now = new Date()

  try {
    await reviews.updateOne(
      { user_id: user.id, tmdb_movie_id: tmdbMovieId },
      {
        $set: {
          rating,
          comment: comment.trim(),
          watched_at: watchedAt,
          updated_at: now,
        },
        $setOnInsert: {
          user_id: user.id,
          tmdb_movie_id: tmdbMovieId,
          created_at: now,
        },
      },
      { upsert: true },
    )
  } catch (error) {
    console.error('[CinéTrack] movie review save failed:', error)
    throw new Error('Impossible d’enregistrer votre avis.')
  }

  revalidatePath(`/movie/${tmdbMovieId}`)
  revalidatePath(`/film/${tmdbMovieId}`)

  return { success: true }
}

export async function getMovieReviewsData(tmdbMovieId: number) {
  validateMovieId(tmdbMovieId)

  const user = await getApiAuthenticatedUser()

  const reviews = await getReviewsCollection()

  try {
    const [userReview, aggregate] = await Promise.all([
      user
        ? reviews.findOne({
            tmdb_movie_id: tmdbMovieId,
            user_id: user.id,
          })
        : Promise.resolve(null),
      reviews
        .aggregate<{ averageRating: number; totalReviews: number }>([
          { $match: { tmdb_movie_id: tmdbMovieId } },
          {
            $group: {
              _id: null,
              averageRating: { $avg: '$rating' },
              totalReviews: { $sum: 1 },
            },
          },
        ])
        .next(),
    ])

    return {
      userReview: userReview
        ? {
            id: userReview._id.toString(),
            rating: userReview.rating,
            comment: userReview.comment,
            watched_at: userReview.watched_at,
          }
        : null,
      stats: {
        averageRating: aggregate ? Number(aggregate.averageRating.toFixed(1)) : 0,
        totalReviews: aggregate?.totalReviews ?? 0,
      },
    }
  } catch (error) {
    console.error('[CinéTrack] movie reviews load failed:', error)
    throw new Error('Impossible de récupérer les avis et les statistiques.')
  }
}

export async function deleteMovieReview(reviewId: string, tmdbMovieId: number) {
  validateMovieId(tmdbMovieId)

  if (typeof reviewId !== 'string' || !ObjectId.isValid(reviewId)) {
    throw new Error('Identifiant d’avis invalide.')
  }

  const user = await getAuthenticatedUser()
  const reviews = await getReviewsCollection()

  try {
    const result = await reviews.deleteOne({
      _id: new ObjectId(reviewId),
      tmdb_movie_id: tmdbMovieId,
      user_id: user.id,
    })

    if (result.deletedCount === 0) {
      throw new Error('Avis introuvable ou accès non autorisé.')
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Avis introuvable ou accès non autorisé.') {
      throw error
    }

    console.error('[CinéTrack] movie review deletion failed:', error)
    throw new Error('Impossible de supprimer cet avis.')
  }

  revalidatePath(`/movie/${tmdbMovieId}`)
  revalidatePath(`/film/${tmdbMovieId}`)

  return { success: true }
}
