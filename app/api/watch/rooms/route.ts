import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { detectVideoProvider } from '@/lib/cinetrack-data'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (!user || userError) {
      return NextResponse.json({ rooms: [], user: null })
    }

    // 1. Fetch rooms created by the user (only columns that exist in the database)
    const { data: owned, error: ownedError } = await supabase
      .from('rooms')
      .select('id, title, video_url, video_provider, mode, rights_confirmed_at, created_at, updated_at, host_id, movie_id')
      .eq('host_id', user.id)
      .order('created_at', { ascending: false })
      
    if (ownedError) {
      console.error('[CinéTrack] owned rooms query failed:', ownedError)
    }

    // 2. Fetch room ids where user is a participant
    const { data: memberships, error: membershipError } = await supabase
      .from('room_participants')
      .select('room_id')
      .eq('user_id', user.id)

    if (membershipError) {
      console.error('[CinéTrack] memberships query failed:', membershipError)
    }

    const ownedIds = new Set((owned ?? []).map((room) => room.id))
    const invitedIds = (memberships ?? [])
      .map((m) => m.room_id)
      .filter((id) => !ownedIds.has(id))

    // 3. Fetch rooms where user is participant
    let invitedRooms: any[] = []
    if (invitedIds.length > 0) {
      const { data: invited, error: invitedError } = await supabase
        .from('rooms')
        .select('id, title, video_url, video_provider, mode, rights_confirmed_at, created_at, updated_at, host_id, movie_id')
        .in('id', invitedIds)
        .order('created_at', { ascending: false })

      if (invitedError) {
        console.error('[CinéTrack] invited rooms query failed:', invitedError)
      } else {
        invitedRooms = invited ?? []
      }
    }

    // 4. Fetch host profiles for invited rooms to display the creator's username
    const allHostIds = Array.from(new Set(invitedRooms.map((r) => r.host_id).filter(Boolean)))
    const hostProfilesMap: Record<string, string> = {}
    if (allHostIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', allHostIds)

      if (profiles) {
        profiles.forEach((p) => {
          if (p.id && p.username) hostProfilesMap[p.id] = p.username
        })
      }
    }

    // 5. Fetch participant count for each room
    const allRoomIds = [...(owned ?? []).map((r) => r.id), ...invitedRooms.map((r) => r.id)]
    const participantCountMap: Record<string, number> = {}
    if (allRoomIds.length > 0) {
      const { data: allParticipants } = await supabase
        .from('room_participants')
        .select('room_id')
        .in('room_id', allRoomIds)

      if (allParticipants) {
        allParticipants.forEach((p) => {
          participantCountMap[p.room_id] = (participantCountMap[p.room_id] || 0) + 1
        })
      }
    }

    const formattedOwned = (owned ?? []).map((room) => ({
      ...room,
      role: 'owner' as const,
      status: 'active',
      scheduled_at: room.created_at,
      participantCount: Math.max(1, (participantCountMap[room.id] || 0)),
    }))

    const formattedInvited = invitedRooms.map((room) => ({
      ...room,
      role: 'participant' as const,
      status: 'active',
      scheduled_at: room.created_at,
      host_username: hostProfilesMap[room.host_id] || 'Un ami',
      participantCount: Math.max(1, (participantCountMap[room.id] || 0)),
    }))

    return NextResponse.json({
      rooms: [...formattedOwned, ...formattedInvited],
      user: { id: user.id, email: user.email },
    })
  } catch (error) {
    console.error('[CinéTrack] watch rooms unexpected error', error)
    return NextResponse.json({ rooms: [], error: 'ROOMS_UNAVAILABLE' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (!user || userError) {
      return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })
    }

    const body = await request.json()
    const title = (body.title || '').trim().slice(0, 120)
    const videoUrl = (body.videoUrl || '').trim()
    const mode = body.mode === 'timer' ? 'timer' : 'video'
    const movieId = body.movieId ? Number(body.movieId) : null
    const invitedUsernames = Array.isArray(body.invitedUsernames)
      ? body.invitedUsernames.filter((name: unknown): name is string => typeof name === 'string').map((name: string) => name.trim()).filter(Boolean)
      : []

    if (!title) {
      return NextResponse.json({ error: 'Donnez un titre à votre salon.' }, { status: 400 })
    }

    if (mode === 'video' && (!videoUrl || !videoUrl.startsWith('https://'))) {
      return NextResponse.json({ error: 'Ajoutez un lien HTTPS valide.' }, { status: 400 })
    }
    if (invitedUsernames.length > 20 || invitedUsernames.some((name: string) => name.replace(/^@+/, '').length > 40)) {
      return NextResponse.json({ error: 'Invitez au maximum 20 pseudos de 40 caractères chacun.' }, { status: 400 })
    }

    const roomId = crypto.randomUUID()
    const newRoom = {
      id: roomId,
      host_id: user.id,
      title,
      video_url: videoUrl || null,
      video_provider: videoUrl ? detectVideoProvider(videoUrl) : null,
      mode,
      movie_id: movieId,
      rights_confirmed_at: new Date().toISOString(),
    }

    const { error: roomError } = await supabase.from('rooms').insert(newRoom)
    if (roomError) {
      console.error('[CinéTrack] room creation failed:', roomError)
      return NextResponse.json({ error: roomError.message }, { status: 400 })
    }

    // Add the host to room_participants as well
    try {
      await supabase.from('room_participants').upsert(
        { room_id: roomId, user_id: user.id },
        { onConflict: 'room_id,user_id' }
      )
    } catch (e) {
      console.warn('[CinéTrack] could not add host to room_participants:', e)
    }

    let addedParticipants: string[] = []
    let missingParticipants: string[] = []
    let invitationError: string | null = null
    if (invitedUsernames.length > 0) {
      const { data: inviteResults, error: inviteError } = await supabase.rpc('invite_room_participants', {
        target_room_id: roomId,
        target_usernames: invitedUsernames,
      })
      if (inviteError) {
        console.error('[CinéTrack] room invitations failed:', inviteError)
        invitationError = 'Le salon est créé, mais les invitations n’ont pas pu être envoyées.'
      } else {
        const results = (inviteResults ?? []) as Array<{ requested_username: string; invited_username: string | null }>
        addedParticipants = results.flatMap((result) => result.invited_username ? [result.invited_username] : [])
        missingParticipants = results.flatMap((result) => result.invited_username ? [] : [result.requested_username])
      }
    }

    return NextResponse.json({
      success: true,
      room: {
        ...newRoom,
        role: 'owner',
        status: 'active',
        scheduled_at: newRoom.rights_confirmed_at,
        participantCount: 1 + addedParticipants.length,
      },
      invitedUsers: addedParticipants,
      notFoundUsers: missingParticipants,
      invitationError,
    })
  } catch (error) {
    console.error('[CinéTrack] room creation unexpected error:', error)
    return NextResponse.json({ error: 'Impossible de créer le salon.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (!user || userError) {
      return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('id')
    if (!roomId) {
      return NextResponse.json({ error: 'ID_REQUIRED' }, { status: 400 })
    }

    const { data: room } = await supabase
      .from('rooms')
      .select('id, host_id')
      .eq('id', roomId)
      .maybeSingle()

    if (room && room.host_id === user.id) {
      // Host deletes the whole room
      await supabase.from('room_participants').delete().eq('room_id', roomId)
      const { error } = await supabase.from('rooms').delete().eq('id', roomId)
      if (error) throw error
      return NextResponse.json({ success: true, action: 'deleted' })
    } else {
      // Participant leaves the room
      const { error } = await supabase
        .from('room_participants')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', user.id)
      if (error) throw error
      return NextResponse.json({ success: true, action: 'left' })
    }
  } catch (error) {
    console.error('[CinéTrack] room delete/leave error:', error)
    return NextResponse.json({ error: 'Action impossible.' }, { status: 500 })
  }
}
