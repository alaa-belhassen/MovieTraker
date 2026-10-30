'use client'

import { getCurrentUser, requireUser } from '@/lib/cinetrack-data'

export type FavoriteActor = { id: number; name: string; profile_path: string | null }

async function requestFavoriteActors(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  const body = await response.json().catch(() => null) as { error?: string; actors?: FavoriteActor[] } | null
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status}).`)
  return body
}

export async function getFavoriteActors(): Promise<FavoriteActor[]> {
  const user = await getCurrentUser()
  if (!user) return []
  const body = await requestFavoriteActors('/api/favorite-actors')
  return body?.actors ?? []
}

export async function isFavoriteActor(actorId: number) {
  const actors = await getFavoriteActors()
  return actors.some(actor => actor.id === actorId)
}

export async function followActor(actor: FavoriteActor) {
  await requireUser()
  await requestFavoriteActors('/api/favorite-actors', {
    method: 'POST',
    body: JSON.stringify(actor),
  })
}

export async function unfollowActor(actorId: number) {
  await requireUser()
  await requestFavoriteActors(`/api/favorite-actors?id=${encodeURIComponent(actorId)}`, { method: 'DELETE' })
}
