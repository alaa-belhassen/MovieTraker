import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-auth'
import { getMongoRoom } from '@/lib/mongodb-data'
import { getMongoDatabase } from '@/lib/mongodb'
import { validateVideoUrl, type VideoProvider } from '@/lib/video-provider'

type PlaybackState = {
  room_id: string
  source_url: string | null
  provider: VideoProvider | null
  is_playing: boolean
  position_seconds: number
  playback_rate: number
  sequence: number
  reference_at: string
  updated_at: string
  updated_by: string
}

async function getOrCreatePlaybackState(roomId: string, userId: string): Promise<PlaybackState> {
  const database = await getMongoDatabase()
  const collection = database.collection<PlaybackState>('room_playback_state')
  const now = new Date().toISOString()
  try {
    await collection.updateOne(
      { room_id: roomId },
      {
        $setOnInsert: {
          room_id: roomId,
          source_url: null,
          provider: null,
          is_playing: false,
          position_seconds: 0,
          playback_rate: 1,
          sequence: 0,
          reference_at: now,
          updated_at: now,
          updated_by: userId,
        },
      },
      { upsert: true },
    )
  } catch (error) {
    if (!(error && typeof error === 'object' && 'code' in error && error.code === 11000)) throw error
  }
  const state = await collection.findOne({ room_id: roomId })
  if (!state) throw new Error('Playback state missing after upsert.')
  return state
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })
    const roomId = new URL(request.url).searchParams.get('roomId')
    if (!roomId) return NextResponse.json({ error: 'ROOM_ID_REQUIRED' }, { status: 400 })
    const room = await getMongoRoom(roomId, user.id)
    if (!room) return NextResponse.json({ error: 'ROOM_FORBIDDEN' }, { status: 403 })
    return NextResponse.json(await getOrCreatePlaybackState(roomId, user.id))
  } catch (error) {
    console.error('[CinéTrack] playback state load failed:', error)
    return NextResponse.json({ error: 'PLAYBACK_UNAVAILABLE' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })
    const body = await request.json() as Record<string, unknown>
    const roomId = typeof body.roomId === 'string' ? body.roomId : ''
    const eventType = body.eventType
    const expectedSequence = body.expectedSequence
    if (!roomId || !Number.isInteger(expectedSequence) || (eventType !== 'video' && eventType !== 'play' && eventType !== 'pause' && eventType !== 'seek' && eventType !== 'rate')) {
      return NextResponse.json({ error: 'Invalid playback event.' }, { status: 400 })
    }

    const room = await getMongoRoom(roomId, user.id)
    if (!room) return NextResponse.json({ error: 'ROOM_FORBIDDEN' }, { status: 403 })
    if (room.host_id !== user.id) return NextResponse.json({ error: 'HOST_REQUIRED' }, { status: 403 })
    if (body.position_seconds !== undefined &&
      (typeof body.position_seconds !== 'number' || body.position_seconds < 0 || body.position_seconds > 86400 * 30)) {
      return NextResponse.json({ error: 'Invalid playback position.' }, { status: 400 })
    }
    if (body.playback_rate !== undefined &&
      (typeof body.playback_rate !== 'number' || body.playback_rate <= 0 || body.playback_rate > 4)) {
      return NextResponse.json({ error: 'Invalid playback rate.' }, { status: 400 })
    }
    if (body.is_playing !== undefined && typeof body.is_playing !== 'boolean') {
      return NextResponse.json({ error: 'Invalid playback state.' }, { status: 400 })
    }
    if (eventType === 'video' && (typeof body.source_url !== 'string' || !validateVideoUrl(body.source_url))) {
      return NextResponse.json({ error: 'Invalid video URL.' }, { status: 400 })
    }

    const collection = (await getMongoDatabase()).collection<PlaybackState>('room_playback_state')
    const now = new Date().toISOString()
    const set: Partial<PlaybackState> = { reference_at: now, updated_at: now, updated_by: user.id }
    if (typeof body.source_url === 'string') set.source_url = body.source_url
    if (typeof body.provider === 'string' || body.provider === null) set.provider = body.provider as VideoProvider | null
    if (typeof body.is_playing === 'boolean') set.is_playing = body.is_playing
    if (typeof body.position_seconds === 'number') set.position_seconds = body.position_seconds
    if (typeof body.playback_rate === 'number') set.playback_rate = body.playback_rate

    await collection.updateOne(
      { room_id: roomId, sequence: expectedSequence as number },
      { $set: set, $inc: { sequence: 1 } },
    )
    return NextResponse.json(await getOrCreatePlaybackState(roomId, user.id))
  } catch (error) {
    console.error('[CinéTrack] playback command failed:', error)
    return NextResponse.json({ error: 'PLAYBACK_UPDATE_FAILED' }, { status: 500 })
  }
}
