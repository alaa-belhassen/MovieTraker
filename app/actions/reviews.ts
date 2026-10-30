```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { revalidatePath } from 'next/cache'

type SaveMovieReviewInput = {
  tmdbMovieId: number
  rating: number
  comment: string
  watchedAt: string
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
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    throw new Error('Vous devez être connecté pour effectuer cette action.')
  }

  return data.user
}

async function getReviewsCollection() {
  const client = await clientPromise
  const db = client.db('MovieTraker')

  return db.collection('reviews')
}

// CREATE / UPDATE
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
      {
        user_id: user.id,
        tmdb_movie_id: tmdbMovieId,
      },
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
      { upsert: true }
    )
  } catch (error) {
    console.error('Erreur sauvegarde avis:', error)
    throw new Error('Impossible d’enregistrer votre avis.')
  }

  revalidatePath(`/movie/${tmdbMovieId}`)

  return { success: true }
}

// READ
export async function getMovieReviewsData(tmdbMovieId: number) {
  validateMovieId(tmdbMovieId)

  const user = await getAuthenticatedUser()
  const reviews = await getReviewsCollection()

  try {
    const userReview = await reviews.findOne({
      tmdb_movie_id: tmdbMovieId,
      user_id: user.id,
    })

    const allReviews = await reviews
      .find(
        { tmdb_movie_id: tmdbMovieId },
        { projection: { rating: 1 } }
      )
      .toArray()

    const totalReviews = allReviews.length

    const averageRating =
      totalReviews > 0
        ? Number(
            (
              allReviews.reduce(
                (sum, review) => sum + Number(review.rating),
                0
              ) / totalReviews
            ).toFixed(1)
          )
        : 0

    // Convertir ObjectId en string pour le transmettre au composant client.
    const serializedUserReview = userReview
      ? {
          ...userReview,
          id: userReview._id.toString(),
          _id: userReview._id.toString(),
          created_at:
            userReview.created_at instanceof Date
              ? userReview.created_at.toISOString()
              : userReview.created_at,
          updated_at:
            userReview.updated_at instanceof Date
              ? userReview.updated_at.toISOString()
              : userReview.updated_at,
        }
      : null

    return {
      userReview: serializedUserReview,
      stats: {
        averageRating,
        totalReviews,
      },
    }
  } catch (error) {
    console.error('Erreur récupération avis:', error)
    throw new Error('Impossible de récupérer votre avis et les statistiques.')
  }
}

// DELETE
export async function deleteMovieReview(
  reviewId: string,
  tmdbMovieId: number
) {
  validateMovieId(tmdbMovieId)

  if (
    typeof reviewId !== 'string' ||
    !ObjectId.isValid(reviewId)
  ) {
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
    if (
      error instanceof Error &&
      error.message === 'Avis introuvable ou accès non autorisé.'
    ) {
      throw error
    }

    console.error('Erreur suppression avis:', error)
    throw new Error('Impossible de supprimer cet avis.')
  }

  revalidatePath(`/movie/${tmdbMovieId}`)

  return { success: true }
}
```