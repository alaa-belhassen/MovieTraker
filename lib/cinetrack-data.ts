'use client'

import { createClient } from '@/lib/supabase/client'

const getSupabase = () => createClient()
export const supabase = new Proxy({}, { get: (_, property: string) => (getSupabase() as unknown as Record<string, unknown>)[property] }) as ReturnType<typeof createClient>

export async function getCurrentUser() { const { data } = await getSupabase().auth.getUser(); return data.user }
export async function requireUser() { const user = await getCurrentUser(); if (!user) throw new Error('AUTH_REQUIRED'); return user }
export async function getMyProfile() { const user = await requireUser(); const { data, error } = await getSupabase().from('profiles').select('id, username, avatar_url, is_moderator').eq('id', user.id).maybeSingle(); if (error) throw error; return data }

export type VideoProvider = 'youtube' | 'vimeo' | 'direct' | 'hls' | 'dash' | 'external'
export function extractYouTubeId(value: string) {
  try {
    const url = new URL(value.trim())
    if (!/youtube\.com$|youtu\.be$/.test(url.hostname.replace(/^www\./, ''))) return null
    if (url.hostname.replace(/^www\./, '') === 'youtu.be') return url.pathname.slice(1).split('/')[0] || null
    if (url.pathname === '/watch') return url.searchParams.get('v')
    const match = url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?]+)/)
    return match?.[1] ?? null
  } catch { return null }
}

export function extractVimeoId(value: string) {
  try {
    const url = new URL(value.trim())
    if (!/vimeo\.com$/.test(url.hostname.replace(/^www\./, ''))) return null
    return url.pathname.match(/\/(?:video\/)?(\d+)/)?.[1] ?? null
  } catch { return null }
}

export function detectVideoProvider(value: string): VideoProvider {
  const url = value.toLowerCase()
  if (extractYouTubeId(value)) return 'youtube'
  if (extractVimeoId(value)) return 'vimeo'
  if (/\.m3u8(?:$|[?#])/.test(url)) return 'hls'
  if (/\.mpd(?:$|[?#])/.test(url)) return 'dash'
  if (/\.(mp4|webm|ogg)(?:$|[?#])/.test(url)) return 'direct'
  return 'external'
}
export function validateVideoUrl(value: string) {
  const url = value.trim()
  if (!url || url.length > 2000) return false
  try { const parsed = new URL(url); return parsed.protocol === 'https:' }
  catch { return false }
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

export async function getMyWatchRooms(): Promise<WatchRoomSummary[]> {
  const user = await requireUser()
  const client = getSupabase()

  // 1. Fetch owned rooms (query only existing database columns)
  const { data: owned, error: ownedError } = await client
    .from('rooms')
    .select('id, title, video_url, video_provider, mode, rights_confirmed_at, created_at, updated_at, host_id, movie_id')
    .eq('host_id', user.id)
    .order('created_at', { ascending: false })
  if (ownedError) throw ownedError

  // 2. Fetch memberships
  const { data: memberships, error: membershipError } = await client
    .from('room_participants')
    .select('room_id')
    .eq('user_id', user.id)
  if (membershipError) throw membershipError

  const ownedIds = new Set((owned ?? []).map((room) => room.id))
  const invitedIds = (memberships ?? []).map((m) => m.room_id).filter((id) => !ownedIds.has(id))

  let invited: any[] = []
  if (invitedIds.length > 0) {
    const { data: invitedData, error: invitedError } = await client
      .from('rooms')
      .select('id, title, video_url, video_provider, mode, rights_confirmed_at, created_at, updated_at, host_id, movie_id')
      .in('id', invitedIds)
      .order('created_at', { ascending: false })
    if (invitedError) throw invitedError
    invited = invitedData ?? []
  }

  // 3. Fetch host profiles for invited rooms
  const hostIds = Array.from(new Set(invited.map((r) => r.host_id).filter(Boolean)))
  const hostMap: Record<string, string> = {}
  if (hostIds.length > 0) {
    const { data: profiles } = await client.from('profiles').select('id, username').in('id', hostIds)
    profiles?.forEach((p) => {
      if (p.id && p.username) hostMap[p.id] = p.username
    })
  }

  const formatRoom = (room: any, role: 'owner' | 'participant'): WatchRoomSummary => ({
    id: room.id,
    title: room.title,
    video_url: room.video_url,
    video_provider: room.video_provider,
    mode: room.mode ?? 'video',
    status: 'active',
    scheduled_at: room.created_at ?? null,
    created_at: room.created_at,
    host_id: room.host_id,
    role,
    host_username: role === 'participant' ? (hostMap[room.host_id] || 'Un ami') : undefined,
  })

  return [
    ...(owned ?? []).map((r) => formatRoom(r, 'owner')),
    ...invited.map((r) => formatRoom(r, 'participant')),
  ]
}

export async function createRoom(input: {
  title: string
  videoUrl?: string
  movieId?: number
  mode?: 'video' | 'timer'
  invitedUsernames?: string[]
}) {
  const user = await requireUser()
  const title = input.title.trim().slice(0, 120)
  const mode = input.mode ?? 'video'
  const videoUrl = (input.videoUrl ?? '').trim()

  if (!title) throw new Error('Donnez un titre à votre salon.')
  if (mode === 'video') {
    if (!videoUrl || !validateVideoUrl(videoUrl)) {
      throw new Error('Ajoutez un lien HTTPS valide.')
    }
  }

  const payload = {
    id: crypto.randomUUID(),
    host_id: user.id,
    title,
    movie_id: input.movieId ?? null,
    video_url: videoUrl || null,
    video_provider: videoUrl ? detectVideoProvider(videoUrl) : null,
    mode,
    rights_confirmed_at: new Date().toISOString(),
  }

  const client = getSupabase()
  const { error } = await client.from('rooms').insert(payload)
  if (error) {
    console.error('[CinéTrack] room creation failed', error)
    if (error.code === '23514') throw new Error('Les informations du salon sont invalides.')
    if (error.code === '42501') throw new Error('Vous devez être connecté pour créer un salon.')
    throw new Error('Impossible de créer le salon. Réessayez.')
  }

  // Host also added to participants
  try {
    await client.from('room_participants').upsert(
      { room_id: payload.id, user_id: user.id },
      { onConflict: 'room_id,user_id' }
    )
  } catch {}

  // Invite friends by pseudo if specified
  if (input.invitedUsernames && input.invitedUsernames.length > 0) {
    const cleanUsernames = input.invitedUsernames
      .map((u) => u.replace(/^@/, '').trim().toLowerCase())
      .filter(Boolean)

    if (cleanUsernames.length > 0) {
      try {
        const { data: profiles } = await client
          .from('profiles')
          .select('id, username')
          .in('username', cleanUsernames)

        if (profiles && profiles.length > 0) {
          const participantRows = profiles
            .filter((p) => p.id !== user.id)
            .map((p) => ({ room_id: payload.id, user_id: p.id }))

          if (participantRows.length > 0) {
            await client.from('room_participants').upsert(participantRows, { onConflict: 'room_id,user_id' })
          }
        }
      } catch (err) {
        console.warn('[CinéTrack] could not invite usernames:', err)
      }
    }
  }

  return {
    id: payload.id,
    title: payload.title,
    video_url: payload.video_url,
    video_provider: payload.video_provider,
    mode: payload.mode,
  }
}

export async function joinWatchParty(roomId: string) {
  const user = await requireUser()
  const client = getSupabase()
  const cleanId = roomId.trim().replace(/^.*\/watch\//, '').replace(/^.*\/rejoindre\//, '').trim()

  const { data: room, error: roomError } = await client.from('rooms').select('id, host_id, title').eq('id', cleanId).maybeSingle()
  if (roomError || !room) throw new Error('Salon introuvable.')

  if (room.host_id !== user.id) {
    const { error } = await client.from('room_participants').upsert(
      { room_id: room.id, user_id: user.id },
      { onConflict: 'room_id,user_id' }
    )
    if (error) throw error
  }
  return room
}

export async function deleteWatchParty(roomId: string) {
  const user = await requireUser()
  const client = getSupabase()

  const { data: room } = await client.from('rooms').select('id, host_id').eq('id', roomId).maybeSingle()
  if (room && room.host_id === user.id) {
    await client.from('room_participants').delete().eq('room_id', roomId)
    const { error } = await client.from('rooms').delete().eq('id', roomId)
    if (error) throw error
    return { action: 'deleted' }
  } else {
    const { error } = await client.from('room_participants').delete().eq('room_id', roomId).eq('user_id', user.id)
    if (error) throw error
    return { action: 'left' }
  }
}
export async function updateRoomVideo(roomId: string, value: string) { const user = await requireUser(); const videoUrl = value.trim(); if (!validateVideoUrl(videoUrl)) throw new Error('Lien vidéo invalide.'); const { data, error } = await getSupabase().from('rooms').update({ video_url: videoUrl, video_provider: detectVideoProvider(videoUrl), rights_confirmed_at: new Date().toISOString() }).eq('id', roomId).eq('host_id', user.id).select('id, video_url, video_provider, mode').single(); if (error) throw error; if (data.video_url !== videoUrl) throw new Error('Le lien vidéo n’a pas pu être enregistré.'); return data }

export async function createSharedList(name: string) { const user = await requireUser(); const { data, error } = await getSupabase().from('shared_lists').insert({ name: name.trim(), creator_id: user.id }).select('id, name, invite_token').single(); if (error) throw error; const { error: memberError } = await getSupabase().from('shared_list_members').insert({ list_id: data.id, user_id: user.id }); if (memberError) throw memberError; return data }
export async function acceptSharedList(inviteToken: string) { const user = await requireUser(); const { data: list, error } = await getSupabase().from('shared_lists').select('id, name').eq('invite_token', inviteToken).single(); if (error) throw error; const { error: memberError } = await getSupabase().from('shared_list_members').upsert({ list_id: list.id, user_id: user.id }); if (memberError) throw memberError; return list }
export async function castSharedListVote(listId: string, movieId: number) { const user = await requireUser(); const { error } = await getSupabase().from('shared_list_votes').upsert({ list_id: listId, movie_id: movieId, user_id: user.id }, { onConflict: 'list_id,movie_id,user_id' }); if (error) throw error }
export async function submitReport(targetType: 'topic' | 'message', targetId: string, reason: string) { const user = await requireUser(); const cleanReason = reason.trim().slice(0, 500); if (cleanReason.length < 3) throw new Error('Le motif doit contenir au moins 3 caractères.'); const { error } = await getSupabase().from('content_reports').insert({ reporter_id: user.id, target_type: targetType, target_id: targetId, reason: cleanReason }); if (error) throw error }
export async function saveMovie(movieId: number, status: 'watchlist' | 'watched' | 'favorite', watchedAt?: string) { const user = await requireUser(); if (status === 'watched') await getSupabase().from('user_movies').delete().eq('user_id', user.id).eq('movie_id', movieId).eq('status', 'watchlist'); if (status === 'watchlist') await getSupabase().from('user_movies').delete().eq('user_id', user.id).eq('movie_id', movieId).eq('status', 'watched'); const { error } = await getSupabase().from('user_movies').upsert({ user_id: user.id, movie_id: movieId, status, watched_at: watchedAt ?? null }, { onConflict: 'user_id,movie_id,status' }); if (error) throw error }
export async function getMyMovies() { const user = await requireUser(); const { data, error } = await getSupabase().from('user_movies').select('movie_id, status, watched_at, rating, comment, created_at').eq('user_id', user.id).order('created_at', { ascending: false }); if (error) throw error; return data ?? [] }
