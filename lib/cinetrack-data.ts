'use client'

import { createClient } from '@/lib/supabase/client'
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

export async function getCurrentUser() {
  const { data } = await getSupabase().auth.getUser()
  return data.user
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) throw new Error('AUTH_REQUIRED')
  return user
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  const payload = await response.json().catch(() => null) as { error?: string } | null
  if (!response.ok) throw new Error(payload?.error || `Request failed (${response.status}).`)
  return payload as T
}

export async function getMyProfile() {
  await requireUser()
  return requestJson<{ id: string; username: string; avatar_url: string | null; is_moderator: boolean }>('/api/profile')
}

export type WatchRoomSummary = {
  id: string
  title: string
  video_url: string | null
  video_provider: string | null
  mode: 'video' | 'timer'
  status: string
  scheduled_at: string | null
  host_id: string
  role: 'owner' | 'participant'
  host_username?: string
  participantCount?: number
  created_at?: string
}

export async function getMyWatchRooms() {
  await requireUser()
  const response = await requestJson<{ rooms: WatchRoomSummary[] }>('/api/watch/rooms')
  return response.rooms
}

export async function createRoom(input: {
  title: string
  videoUrl?: string
  movieId?: number
  mode?: 'video' | 'timer'
  invitedUsernames?: string[]
}) {
  await requireUser()
  const result = await requestJson<{ room: { id: string; title: string; video_url: string | null; video_provider: string | null; mode: 'video' | 'timer' } }>(
    '/api/watch/rooms',
    { method: 'POST', body: JSON.stringify(input) },
  )
  return result.room
}

export async function joinWatchParty(roomId: string) {
  await requireUser()
  return requestJson<{ id: string; host_id: string; title: string }>('/api/watch/rooms/join', {
    method: 'POST',
    body: JSON.stringify({ roomId }),
  })
}

export async function deleteWatchParty(roomId: string) {
  await requireUser()
  return requestJson<{ action: 'deleted' | 'left' }>(`/api/watch/rooms?id=${encodeURIComponent(roomId)}`, { method: 'DELETE' })
}

export async function updateRoomVideo(roomId: string, value: string) {
  await requireUser()
  return requestJson<{ id: string; video_url: string; video_provider: VideoProvider }>(
    '/api/watch/rooms',
    { method: 'PATCH', body: JSON.stringify({ roomId, videoUrl: value }) },
  )
}

export async function createSharedList(name: string) {
  await requireUser()
  return requestJson<{ id: string; name: string; invite_token: string }>('/api/shared-lists', {
    method: 'POST',
    body: JSON.stringify({ action: 'create', name }),
  })
}

export async function acceptSharedList(inviteToken: string) {
  await requireUser()
  return requestJson<{ id: string; name: string }>('/api/shared-lists', {
    method: 'POST',
    body: JSON.stringify({ action: 'accept', inviteToken }),
  })
}

export async function getSharedListInviteToken(listId: string) {
  await requireUser()
  const result = await requestJson<{ invite_token: string | null }>(`/api/shared-lists?id=${encodeURIComponent(listId)}`)
  return result.invite_token
}

export async function inviteSharedListMember(listId: string, username: string) {
  await requireUser()
  return requestJson<{ username: string }>('/api/shared-lists', {
    method: 'POST',
    body: JSON.stringify({ action: 'invite', listId, username }),
  })
}

export async function castSharedListVote(listId: string, movieId: number) {
  await requireUser()
  await requestJson('/api/shared-lists', {
    method: 'POST',
    body: JSON.stringify({ action: 'vote', listId, movieId }),
  })
}

export async function submitReport(targetType: 'topic' | 'message', targetId: string, reason: string) {
  await requireUser()
  await requestJson('/api/reports', {
    method: 'POST',
    body: JSON.stringify({ targetType, targetId, reason }),
  })
}

export async function saveMovie(movieId: number, status: 'watchlist' | 'watched' | 'favorite', watchedAt?: string) {
  await requireUser()
  await requestJson('/api/movies', {
    method: 'POST',
    body: JSON.stringify({ movieId, status, watchedAt }),
  })
}

export async function getMyMovies() {
  await requireUser()
  return requestJson<Array<{ movie_id: number; status: string; watched_at: string | null; rating: number | null; comment: string | null; created_at: string }>>('/api/movies')
}
