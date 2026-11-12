'use client'

import { createClient } from '@/lib/supabase/client'
import { mutate } from 'swr'
import { PROFILE_STATS_KEY } from '@/lib/profile-stats'
import {
  detectVideoProvider,
  extractVimeoId,
  extractYouTubeId,
  validateVideoUrl,
  type VideoProvider,
} from '@/lib/video-provider'

export { detectVideoProvider, extractVimeoId, extractYouTubeId, validateVideoUrl }
export type { VideoProvider }

const getSupabase = () => createClient()
export const supabase = new Proxy({}, { get: (_, property: string) => (getSupabase() as unknown as Record<string, unknown>)[property] }) as ReturnType<typeof createClient>

export async function getCurrentUser() { const { data } = await getSupabase().auth.getUser(); return data.user }
export async function requireUser() { const user = await getCurrentUser(); if (!user) throw new Error('AUTH_REQUIRED'); return user }
export async function getMyProfile() { const user = await requireUser(); const { data, error } = await getSupabase().from('profiles').select('id, username, avatar_url, is_moderator').eq('id', user.id).maybeSingle(); if (error) throw error; return data }

export type WatchRoomSummary = { id: string; title: string; video_url: string | null; video_provider: string | null; mode: 'video' | 'timer'; status: string; scheduled_at: string | null; host_id: string; role: 'owner' | 'participant' }
export async function getMyWatchRooms(): Promise<WatchRoomSummary[]> {
  const user = await requireUser()
  const client = getSupabase()
  const { data: owned, error: ownedError } = await client.from('rooms').select('id, title, video_url, video_provider, mode, status, scheduled_at, host_id').eq('host_id', user.id).order('created_at', { ascending: false })
  if (ownedError) throw ownedError
  const { data: memberships, error: membershipError } = await client.from('room_participants').select('room_id').eq('user_id', user.id)
  if (membershipError) throw membershipError
  const ownedIds = new Set((owned ?? []).map((room) => room.id))
  const invitedIds = (memberships ?? []).map((membership) => membership.room_id).filter((id) => !ownedIds.has(id))
  if (!invitedIds.length) return (owned ?? []).map((room) => ({ ...room, role: 'owner' as const }))
  const { data: invited, error: invitedError } = await client.from('rooms').select('id, title, video_url, video_provider, mode, status, scheduled_at, host_id').in('id', invitedIds).order('created_at', { ascending: false })
  if (invitedError) throw invitedError
  return [...(owned ?? []).map((room) => ({ ...room, role: 'owner' as const })), ...(invited ?? []).map((room) => ({ ...room, role: 'participant' as const }))]
}

export async function createRoom(input: { title: string; videoUrl: string; movieId?: number; mode?: 'video' | 'timer' }) {
  const user = await requireUser()
  const title = input.title.trim().slice(0, 120)
  const videoUrl = input.videoUrl.trim()
  if (!title) throw new Error('Donnez un titre à votre salon.')
  if (!validateVideoUrl(videoUrl)) throw new Error('Lien vidéo invalide.')

  // Generate the id client-side so creation does not depend on a follow-up
  // SELECT, which can be denied by RLS even when the INSERT is permitted.
  const payload = {
    id: crypto.randomUUID(),
    host_id: user.id,
    title,
    movie_id: input.movieId ?? null,
    video_url: videoUrl,
    video_provider: detectVideoProvider(videoUrl),
    mode: input.mode ?? 'video',
    rights_confirmed_at: new Date().toISOString(),
  }
  const { error } = await getSupabase().from('rooms').insert(payload)
  if (error) {
    console.error('[CinéTrack] room creation failed', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    if (error.code === '23514') throw new Error('Les informations du salon sont invalides.')
    if (error.code === '42501') throw new Error('Vous devez être connecté pour créer un salon.')
    throw new Error('Impossible de créer le salon. Réessayez.')
  }
  return {
    id: payload.id,
    title: payload.title,
    video_url: payload.video_url,
    video_provider: payload.video_provider,
    mode: payload.mode,
  }
}
export async function updateRoomVideo(roomId: string, value: string) {
  await requireUser()
  const videoUrl = value.trim()
  if (!validateVideoUrl(videoUrl)) throw new Error('Lien vidéo invalide.')

  const response = await fetch('/api/watch/rooms', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, videoUrl }),
  })
  const result = await response.json() as {
    id?: string
    video_url?: string
    video_provider?: VideoProvider
    error?: string
  }
  if (!response.ok) throw new Error(result.error ?? 'Le lien vidéo n’a pas pu être enregistré.')
  if (result.video_url !== videoUrl) throw new Error('Le lien vidéo n’a pas pu être enregistré.')
  return result
}

export async function createSharedList(name: string) { const user = await requireUser(); const { data, error } = await getSupabase().from('shared_lists').insert({ name: name.trim(), creator_id: user.id }).select('id, name, invite_token').single(); if (error) throw error; const { error: memberError } = await getSupabase().from('shared_list_members').insert({ list_id: data.id, user_id: user.id }); if (memberError) throw memberError; return data }
export async function acceptSharedList(inviteToken: string) { const user = await requireUser(); const { data: list, error } = await getSupabase().from('shared_lists').select('id, name').eq('invite_token', inviteToken).single(); if (error) throw error; const { error: memberError } = await getSupabase().from('shared_list_members').upsert({ list_id: list.id, user_id: user.id }); if (memberError) throw memberError; return list }
export async function castSharedListVote(listId: string, movieId: number) { const user = await requireUser(); const { error } = await getSupabase().from('shared_list_votes').upsert({ list_id: listId, movie_id: movieId, user_id: user.id }, { onConflict: 'list_id,movie_id,user_id' }); if (error) throw error }
export async function submitReport(targetType: 'topic' | 'message', targetId: string, reason: string) { const user = await requireUser(); const cleanReason = reason.trim().slice(0, 500); if (cleanReason.length < 3) throw new Error('Le motif doit contenir au moins 3 caractères.'); const { error } = await getSupabase().from('content_reports').insert({ reporter_id: user.id, target_type: targetType, target_id: targetId, reason: cleanReason }); if (error) throw error }
type MovieStatus = 'watchlist' | 'watched' | 'favorite'

async function requestMovieEntries(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  const body = await response.json().catch(() => null) as { error?: string } | null
  if (!response.ok) throw new Error(body?.error ?? `Movie request failed (${response.status}).`)
  return body
}

function refreshProfileStats() {
  void mutate(
    PROFILE_STATS_KEY,
    async () => {
      const response = await fetch(PROFILE_STATS_KEY, { cache: 'no-store' })
      if (!response.ok) throw new Error(`Profile stats request failed (${response.status}).`)
      return response.json()
    },
    { revalidate: false },
  ).catch((error) => {
    console.error('[CinéTrack] profile stats refresh failed:', error)
  })
}

export async function saveMovie(movieId: number, status: MovieStatus, watchedAt?: string) {
  await requireUser()
  await requestMovieEntries('/api/movies', {
    method: 'POST',
    body: JSON.stringify({ movieId, status, watchedAt }),
  })
  refreshProfileStats()
}

export async function getMyMovies() {
  await requireUser()
  const response = await fetch('/api/movies', { cache: 'no-store' })
  const body = await response.json().catch(() => null) as { error?: string } | Array<{
    movie_id: number
    status: MovieStatus
    watched_at: string | null
    rating: number | null
    comment: string | null
    created_at: string
  }> | null
  if (!response.ok) throw new Error(!Array.isArray(body) ? body?.error ?? `Movie request failed (${response.status}).` : `Movie request failed (${response.status}).`)
  if (!Array.isArray(body)) throw new Error(body?.error ?? 'Invalid movie list response.')
  return body
}

export async function removeMovie(movieId: number, status: MovieStatus) {
  await requireUser()
  await requestMovieEntries(`/api/movies?movieId=${encodeURIComponent(movieId)}&status=${encodeURIComponent(status)}`, {
    method: 'DELETE',
  })
  refreshProfileStats()
}
