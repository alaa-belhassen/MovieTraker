'use client'

import { createClient } from '@/lib/supabase/client'
import { getCurrentUser, requireUser } from '@/lib/cinetrack-data'

export type FavoriteActor = { id: number; name: string; profile_path: string | null }

const storageKey = (userId: string) => `cinetrack-favorite-actors:${userId}`

function readLocal(userId: string): FavoriteActor[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    const parsed = raw ? JSON.parse(raw) as FavoriteActor[] : []
    return Array.isArray(parsed) ? parsed.filter(actor => Number.isInteger(actor.id) && actor.name) : []
  } catch {
    return []
  }
}

function writeLocal(userId: string, actors: FavoriteActor[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(storageKey(userId), JSON.stringify(actors))
}

async function withTimeout<T>(promise: Promise<T>, ms = 2500) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ])
}

async function readRemote(): Promise<FavoriteActor[] | null> {
  try {
    const user = await requireUser()
    const { data, error } = await withTimeout(createClient()
      .from('favorite_actors')
      .select('actor_id, name, profile_path')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }))
    if (error) return null
    return (data ?? []).map(row => ({ id: row.actor_id, name: row.name || `Acteur ${row.actor_id}`, profile_path: row.profile_path }))
  } catch {
    return null
  }
}

function merge(local: FavoriteActor[], remote: FavoriteActor[]) {
  const byId = new Map<number, FavoriteActor>()
  for (const actor of [...remote, ...local]) byId.set(actor.id, actor)
  return [...byId.values()]
}

export async function getFavoriteActors(): Promise<FavoriteActor[]> {
  const user = await getCurrentUser()
  if (!user) return []
  const local = readLocal(user.id)
  const remote = await readRemote()
  const actors = remote ? merge(local, remote) : local
  writeLocal(user.id, actors)
  return actors
}

export async function isFavoriteActor(actorId: number) {
  const user = await getCurrentUser()
  if (!user) return false
  return readLocal(user.id).some(actor => actor.id === actorId)
}

export async function followActor(actor: FavoriteActor) {
  const user = await requireUser()
  const next = [actor, ...readLocal(user.id).filter(item => item.id !== actor.id)]
  writeLocal(user.id, next)
  void withTimeout(createClient().from('favorite_actors').upsert({
    user_id: user.id,
    actor_id: actor.id,
    name: actor.name,
    profile_path: actor.profile_path,
  }, { onConflict: 'user_id,actor_id' })).catch(() => {})
}

export async function unfollowActor(actorId: number) {
  const user = await requireUser()
  writeLocal(user.id, readLocal(user.id).filter(actor => actor.id !== actorId))
  void withTimeout(createClient().from('favorite_actors').delete().eq('user_id', user.id).eq('actor_id', actorId)).catch(() => {})
}
