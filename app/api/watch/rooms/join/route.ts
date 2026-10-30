import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (!user || userError) {
      return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })
    }

    const body = await request.json()
    let roomId = (body.roomId || '').trim()

    // If the user pasted a full URL, extract the ID
    if (roomId.includes('/watch/')) {
      roomId = roomId.split('/watch/')[1].split('?')[0].split('/')[0]
    } else if (roomId.includes('/rejoindre/')) {
      roomId = roomId.split('/rejoindre/')[1].split('?')[0].split('/')[0]
    }

    if (!roomId) {
      return NextResponse.json({ error: 'ID ou lien de salon requis.' }, { status: 400 })
    }

    // Verify room exists
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, title, host_id')
      .eq('id', roomId)
      .maybeSingle()

    if (roomError || !room) {
      return NextResponse.json({ error: 'Salon introuvable. Vérifiez le lien ou le code.' }, { status: 404 })
    }

    // If not host, join room_participants
    if (room.host_id !== user.id) {
      const { error: partError } = await supabase
        .from('room_participants')
        .upsert(
          { room_id: room.id, user_id: user.id },
          { onConflict: 'room_id,user_id' }
        )

      if (partError) {
        console.error('[CinéTrack] failed to join room participants:', partError)
        return NextResponse.json({ error: 'Impossible de rejoindre le salon.' }, { status: 400 })
      }
    }

    return NextResponse.json({ success: true, roomId: room.id, title: room.title })
  } catch (error) {
    console.error('[CinéTrack] join room error:', error)
    return NextResponse.json({ error: 'Erreur lors de la connexion au salon.' }, { status: 500 })
  }
}
