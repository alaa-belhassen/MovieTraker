import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-auth'
import {
  createMongoRoom,
  ensureMongoProfile,
  leaveOrDeleteMongoRoom,
  listMongoRooms,
  updateMongoRoomVideo,
} from '@/lib/mongodb-data'

export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ rooms: [], user: null }, { status: 401 })
    return NextResponse.json({ rooms: await listMongoRooms(user.id), user: { id: user.id, email: user.email } })
  } catch (error) {
    console.error('[CinéTrack] watch rooms query failed:', error)
    return NextResponse.json({ error: 'ROOMS_UNAVAILABLE' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })
    const body = await request.json() as Record<string, unknown>
    if (typeof body.title !== 'string') return NextResponse.json({ error: 'Donnez un titre à votre salon.' }, { status: 400 })
    const mode = body.mode === 'timer' ? 'timer' : 'video'
    const invitedUsernames = Array.isArray(body.invitedUsernames)
      ? body.invitedUsernames.filter((name): name is string => typeof name === 'string').map(name => name.trim()).filter(Boolean)
      : []
    if (Array.isArray(body.invitedUsernames) && body.invitedUsernames.length !== invitedUsernames.length) {
      return NextResponse.json({ error: 'Invitations invalides.' }, { status: 400 })
    }

    await ensureMongoProfile(user)
    const room = await createMongoRoom(user, {
      title: body.title,
      videoUrl: typeof body.videoUrl === 'string' ? body.videoUrl : '',
      movieId: typeof body.movieId === 'number' ? body.movieId : undefined,
      mode,
      invitedUsernames,
    })
    return NextResponse.json({
      success: true,
      room: {
        id: room.id,
        host_id: room.host_id,
        title: room.title,
        video_url: room.video_url,
        video_provider: room.video_provider,
        mode: room.mode,
        movie_id: room.movie_id,
        role: room.role,
        status: room.status,
        scheduled_at: room.scheduled_at,
        participantCount: room.participantCount,
      },
      invitedUsers: room.invitedUsers,
      notFoundUsers: room.notFoundUsers,
    })
  } catch (error) {
    console.error('[CinéTrack] room creation failed:', error)
    const message = error instanceof Error ? error.message : ''
    const status = message.startsWith('Invitez') || message.startsWith('Ajoutez') || message.startsWith('Donnez') || message === 'Invalid movie ID.' ? 400 : 500
    return NextResponse.json({ error: status === 400 ? message : 'Impossible de créer le salon.' }, { status })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })
    const body = await request.json() as Record<string, unknown>
    if (typeof body.roomId !== 'string' || typeof body.videoUrl !== 'string') {
      return NextResponse.json({ error: 'Informations du salon invalides.' }, { status: 400 })
    }
    return NextResponse.json(await updateMongoRoomVideo(body.roomId, user.id, body.videoUrl))
  } catch (error) {
    console.error('[CinéTrack] room video update failed:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Action impossible.' }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })
    const roomId = new URL(request.url).searchParams.get('id')
    if (!roomId) return NextResponse.json({ error: 'ID_REQUIRED' }, { status: 400 })
    const action = await leaveOrDeleteMongoRoom(roomId, user.id)
    return NextResponse.json({ success: true, action })
  } catch (error) {
    console.error('[CinéTrack] room delete/leave failed:', error)
    return NextResponse.json({ error: 'Action impossible.' }, { status: 500 })
  }
}
