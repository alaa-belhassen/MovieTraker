import 'server-only'

import { randomUUID } from 'node:crypto'
import type { User } from '@supabase/supabase-js'
import type { Document } from 'mongodb'
import { getMongoDatabase } from '@/lib/mongodb'
import { detectVideoProvider, validateVideoUrl, type VideoProvider } from '@/lib/video-provider'

type WatchRoomSummary = {
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

type ProfileDocument = Document & {
  id: string
  username: string
  avatar_url: string | null
  is_moderator: boolean
}

type RoomDocument = Document & {
  id: string
  host_id: string
  title: string
  video_url: string | null
  video_provider: VideoProvider | null
  mode: 'video' | 'timer'
  movie_id: number | null
  rights_confirmed_at: string
  created_at: string
}

type MovieDocument = Document & {
  user_id: string
  movie_id: number
  status: 'watchlist' | 'watched' | 'favorite'
  watched_at: string | null
  rating?: number | null
  comment?: string | null
  created_at: string
}

function getUsername(user: User) {
  const metadataName = user.user_metadata?.username
  const emailName = user.email?.split('@')[0]
  const candidate = typeof metadataName === 'string' ? metadataName : emailName
  const username = candidate?.trim().replace(/^@+/, '').slice(0, 40)
  return username || `user-${user.id.slice(0, 8)}`
}

export async function ensureMongoProfile(user: User) {
  const database = await getMongoDatabase()
  const username = getUsername(user)
  const avatar = user.user_metadata?.avatar_url
  await database.collection<ProfileDocument>('profiles').updateOne(
    { id: user.id },
    {
      $setOnInsert: {
        id: user.id,
        username,
        username_normalized: username.toLowerCase(),
        avatar_url: typeof avatar === 'string' ? avatar : null,
        is_moderator: false,
        created_at: new Date().toISOString(),
      },
    },
    { upsert: true },
  )
  return database.collection<ProfileDocument>('profiles').findOne({ id: user.id })
}

export async function getMongoProfile(user: User) {
  return ensureMongoProfile(user)
}

export async function listMovieEntries(userId: string) {
  const database = await getMongoDatabase()
  return database.collection<MovieDocument>('user_movies')
    .find({ user_id: userId })
    .sort({ created_at: -1 })
    .toArray()
}

export async function saveMovieEntry(userId: string, movieId: number, status: MovieDocument['status'], watchedAt?: string) {
  if (!Number.isInteger(movieId) || movieId < 1) throw new Error('Invalid movie ID.')
  const database = await getMongoDatabase()
  const movies = database.collection<MovieDocument>('user_movies')
  if (status === 'watched') await movies.deleteOne({ user_id: userId, movie_id: movieId, status: 'watchlist' })
  if (status === 'watchlist') await movies.deleteOne({ user_id: userId, movie_id: movieId, status: 'watched' })
  await movies.updateOne(
    { user_id: userId, movie_id: movieId, status },
    {
      $set: { watched_at: watchedAt ?? null },
      $setOnInsert: { user_id: userId, movie_id: movieId, status, created_at: new Date().toISOString() },
    },
    { upsert: true },
  )
}

export async function listFavoriteActors(userId: string) {
  const database = await getMongoDatabase()
  const actors = await database.collection('favorite_actors')
    .find({ user_id: userId })
    .sort({ created_at: -1 })
    .toArray()
  return actors.map(actor => ({
    id: actor.actor_id as number,
    name: (actor.name as string) || `Acteur ${actor.actor_id}`,
    profile_path: (actor.profile_path as string | null) ?? null,
  }))
}

export async function setFavoriteActor(userId: string, actor: { id: number; name: string; profile_path: string | null }) {
  if (!Number.isInteger(actor.id) || actor.id < 1 || !actor.name.trim()) throw new Error('Invalid actor.')
  const database = await getMongoDatabase()
  await database.collection('favorite_actors').updateOne(
    { user_id: userId, actor_id: actor.id },
    {
      $set: { name: actor.name.trim().slice(0, 160), profile_path: actor.profile_path },
      $setOnInsert: { user_id: userId, actor_id: actor.id, created_at: new Date().toISOString() },
    },
    { upsert: true },
  )
}

export async function removeFavoriteActor(userId: string, actorId: number) {
  if (!Number.isInteger(actorId) || actorId < 1) throw new Error('Invalid actor ID.')
  const database = await getMongoDatabase()
  await database.collection('favorite_actors').deleteOne({ user_id: userId, actor_id: actorId })
}

async function addRoomParticipant(roomId: string, userId: string) {
  const database = await getMongoDatabase()
  await database.collection('room_participants').updateOne(
    { room_id: roomId, user_id: userId },
    { $setOnInsert: { room_id: roomId, user_id: userId, created_at: new Date().toISOString() } },
    { upsert: true },
  )
}

export async function listMongoRooms(userId: string): Promise<WatchRoomSummary[]> {
  const database = await getMongoDatabase()
  const rooms = database.collection<RoomDocument>('rooms')
  const [owned, memberships] = await Promise.all([
    rooms.find({ host_id: userId }).sort({ created_at: -1 }).toArray(),
    database.collection('room_participants').find({ user_id: userId }).toArray(),
  ])
  const ownedIds = new Set(owned.map(room => room.id))
  const invitedIds = memberships.map(row => row.room_id as string).filter(id => !ownedIds.has(id))
  const invited = invitedIds.length
    ? await rooms.find({ id: { $in: invitedIds } }).sort({ created_at: -1 }).toArray()
    : []
  const allRooms = [...owned, ...invited]
  const roomIds = allRooms.map(room => room.id)
  const participants = roomIds.length
    ? await database.collection('room_participants').find({ room_id: { $in: roomIds } }).toArray()
    : []
  const counts = new Map<string, number>()
  for (const participant of participants) counts.set(participant.room_id as string, (counts.get(participant.room_id as string) ?? 0) + 1)

  const hostIds = [...new Set(invited.map(room => room.host_id))]
  const profiles = hostIds.length
    ? await database.collection<ProfileDocument>('profiles').find({ id: { $in: hostIds } }).toArray()
    : []
  const hostNames = new Map(profiles.map(profile => [profile.id, profile.username]))
  const formatRoom = (room: RoomDocument, role: 'owner' | 'participant'): WatchRoomSummary => ({
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
    host_username: role === 'participant' ? (hostNames.get(room.host_id) || 'Un ami') : undefined,
    participantCount: Math.max(1, counts.get(room.id) ?? 0),
  })

  return [...owned.map(room => formatRoom(room, 'owner')), ...invited.map(room => formatRoom(room, 'participant'))]
}

export async function createMongoRoom(user: User, input: {
  title: string
  videoUrl?: string
  movieId?: number
  mode?: 'video' | 'timer'
  invitedUsernames?: string[]
}) {
  const title = input.title.trim().slice(0, 120)
  const mode = input.mode ?? 'video'
  const videoUrl = (input.videoUrl ?? '').trim()
  const cleanNames = [...new Set((input.invitedUsernames ?? [])
    .map(name => name.replace(/^@+/, '').trim().toLowerCase())
    .filter(Boolean))]
  if (!title) throw new Error('Donnez un titre à votre salon.')
  if (mode === 'video' && (!videoUrl || !validateVideoUrl(videoUrl))) throw new Error('Ajoutez un lien HTTPS valide.')
  if (input.movieId != null && (!Number.isInteger(input.movieId) || input.movieId < 1)) throw new Error('Invalid movie ID.')
  if (cleanNames.length > 20 || cleanNames.some(name => name.length > 40)) throw new Error('Invitez au maximum 20 pseudos de 40 caractères chacun.')

  const database = await getMongoDatabase()
  const now = new Date().toISOString()
  const room: RoomDocument = {
    id: randomUUID(),
    host_id: user.id,
    title,
    video_url: videoUrl || null,
    video_provider: videoUrl ? detectVideoProvider(videoUrl) : null,
    mode,
    movie_id: input.movieId ?? null,
    rights_confirmed_at: now,
    created_at: now,
  }
  await database.collection<RoomDocument>('rooms').insertOne(room)
  await addRoomParticipant(room.id, user.id)
  await database.collection('room_playback_state').insertOne({
    room_id: room.id,
    source_url: room.video_url,
    provider: room.video_provider,
    is_playing: false,
    position_seconds: 0,
    playback_rate: 1,
    sequence: 0,
    reference_at: now,
    updated_at: now,
    updated_by: user.id,
  })

  const inviteProfiles = cleanNames.length
    ? await database.collection<ProfileDocument>('profiles').find({ username_normalized: { $in: cleanNames } }).toArray()
    : []
  const inviteIds = inviteProfiles.filter(profile => profile.id !== user.id).map(profile => profile.id)
  await Promise.all(inviteIds.map(userId => addRoomParticipant(room.id, userId)))
  return {
    ...room,
    role: 'owner' as const,
    status: 'active',
    scheduled_at: room.created_at,
    participantCount: Math.max(1, inviteIds.length + 1),
    invitedUsers: inviteProfiles.filter(profile => profile.id !== user.id).map(profile => profile.username),
    notFoundUsers: cleanNames.filter(name => !inviteProfiles.some(profile => profile.username_normalized === name)),
  }
}

export async function getMongoRoom(roomId: string, userId: string, join = false) {
  const database = await getMongoDatabase()
  const room = await database.collection<RoomDocument>('rooms').findOne({ id: roomId })
  if (!room) return null
  if (join && room.host_id !== userId) await addRoomParticipant(roomId, userId)
  const member = room.host_id === userId || await database.collection('room_participants').findOne({ room_id: roomId, user_id: userId })
  if (!member) return null
  return room
}

export async function joinMongoRoom(roomId: string, userId: string) {
  const database = await getMongoDatabase()
  const room = await database.collection<RoomDocument>('rooms').findOne({ id: roomId }, { projection: { id: 1, host_id: 1, title: 1 } })
  if (!room) return null
  if (room.host_id !== userId) await addRoomParticipant(roomId, userId)
  return room
}

export async function leaveOrDeleteMongoRoom(roomId: string, userId: string) {
  const database = await getMongoDatabase()
  const room = await database.collection<RoomDocument>('rooms').findOne({ id: roomId }, { projection: { host_id: 1 } })
  if (room?.host_id === userId) {
    await Promise.all([
      database.collection('rooms').deleteOne({ id: roomId, host_id: userId }),
      database.collection('room_participants').deleteMany({ room_id: roomId }),
      database.collection('room_playback_state').deleteOne({ room_id: roomId }),
    ])
    return 'deleted' as const
  }
  await database.collection('room_participants').deleteOne({ room_id: roomId, user_id: userId })
  return 'left' as const
}

export async function updateMongoRoomVideo(roomId: string, userId: string, value: string) {
  const videoUrl = value.trim()
  if (!validateVideoUrl(videoUrl)) throw new Error('Lien vidéo invalide.')
  const database = await getMongoDatabase()
  const update = {
    video_url: videoUrl,
    video_provider: detectVideoProvider(videoUrl),
    rights_confirmed_at: new Date().toISOString(),
  }
  const result = await database.collection<RoomDocument>('rooms').updateOne({ id: roomId, host_id: userId }, { $set: update })
  if (!result.matchedCount) throw new Error('Le lien vidéo n’a pas pu être enregistré.')
  await database.collection('room_playback_state').updateOne(
    { room_id: roomId },
    {
      $set: {
        source_url: videoUrl,
        provider: update.video_provider,
        is_playing: false,
        position_seconds: 0,
        reference_at: update.rights_confirmed_at,
        updated_at: update.rights_confirmed_at,
        updated_by: userId,
      },
      $inc: { sequence: 1 },
    },
  )
  return { id: roomId, video_url: videoUrl, video_provider: update.video_provider }
}

export async function inviteMongoRoomParticipants(roomId: string, usernames: string[], userId: string) {
  const database = await getMongoDatabase()
  const room = await database.collection<RoomDocument>('rooms').findOne({ id: roomId, host_id: userId }, { projection: { id: 1 } })
  if (!room) throw new Error('HOST_REQUIRED')
  const requested = usernames.map(name => name.replace(/^@+/, '').trim()).filter(Boolean)
  if (!requested.length || requested.length > 20 || requested.some(name => name.length > 40)) throw new Error('INVALID_INVITES')
  const normalized = [...new Set(requested.map(name => name.toLowerCase()))]
  const profiles = await database.collection<ProfileDocument>('profiles')
    .find({ username_normalized: { $in: normalized } })
    .toArray()
  await Promise.all(profiles.filter(profile => profile.id !== userId).map(profile => addRoomParticipant(roomId, profile.id)))
  const byName = new Map(profiles.map(profile => [profile.username_normalized, profile.username]))
  return requested.map(requested_username => ({
    requested_username,
    invited_username: byName.get(requested_username.toLowerCase()) ?? null,
  }))
}

export async function createMongoSharedList(name: string, user: User) {
  const cleanName = name.trim()
  if (cleanName.length < 3 || cleanName.length > 50) throw new Error('Le nom doit contenir entre 3 et 50 caractères.')
  const database = await getMongoDatabase()
  const list = { id: randomUUID(), name: cleanName, invite_token: randomUUID(), creator_id: user.id, created_at: new Date().toISOString() }
  await database.collection('shared_lists').insertOne(list)
  await database.collection('shared_list_members').insertOne({ list_id: list.id, user_id: user.id, created_at: list.created_at })
  return list
}

export async function acceptMongoSharedList(inviteToken: string, userId: string) {
  const database = await getMongoDatabase()
  const list = await database.collection('shared_lists').findOne({ invite_token: inviteToken }, { projection: { id: 1, name: 1 } })
  if (!list) throw new Error('LIST_NOT_FOUND')
  await database.collection('shared_list_members').updateOne(
    { list_id: list.id, user_id: userId },
    { $setOnInsert: { list_id: list.id, user_id: userId, created_at: new Date().toISOString() } },
    { upsert: true },
  )
  return { id: list.id as string, name: list.name as string }
}

export async function getMongoListInviteToken(listId: string, userId: string) {
  const database = await getMongoDatabase()
  const member = await database.collection('shared_list_members').findOne({ list_id: listId, user_id: userId })
  if (!member) throw new Error('LIST_ACCESS_DENIED')
  return database.collection('shared_lists').findOne({ id: listId }, { projection: { invite_token: 1 } })
}

export async function inviteMongoSharedListMember(listId: string, username: string, userId: string) {
  const database = await getMongoDatabase()
  const member = await database.collection('shared_list_members').findOne({ list_id: listId, user_id: userId })
  if (!member) throw new Error('LIST_ACCESS_DENIED')
  const profile = await database.collection<ProfileDocument>('profiles').findOne({ username_normalized: username.trim().replace(/^@+/, '').toLowerCase() })
  if (!profile) throw new Error('USER_NOT_FOUND')
  await database.collection('shared_list_members').updateOne(
    { list_id: listId, user_id: profile.id },
    { $setOnInsert: { list_id: listId, user_id: profile.id, created_at: new Date().toISOString() } },
    { upsert: true },
  )
  return profile
}

export async function voteMongoSharedList(listId: string, movieId: number, userId: string) {
  if (!Number.isInteger(movieId) || movieId < 1) throw new Error('Invalid movie ID.')
  const database = await getMongoDatabase()
  const member = await database.collection('shared_list_members').findOne({ list_id: listId, user_id: userId })
  if (!member) throw new Error('LIST_ACCESS_DENIED')
  await database.collection('shared_list_votes').updateOne(
    { list_id: listId, movie_id: movieId, user_id: userId },
    { $setOnInsert: { list_id: listId, movie_id: movieId, user_id: userId, created_at: new Date().toISOString() } },
    { upsert: true },
  )
}

export async function submitMongoReport(userId: string, targetType: 'topic' | 'message', targetId: string, reason: string) {
  const cleanReason = reason.trim().slice(0, 500)
  if (!targetId.trim() || cleanReason.length < 3) throw new Error('Le motif doit contenir au moins 3 caractères.')
  const database = await getMongoDatabase()
  await database.collection('content_reports').insertOne({
    reporter_id: userId,
    target_type: targetType,
    target_id: targetId.trim(),
    reason: cleanReason,
    created_at: new Date().toISOString(),
  })
}
