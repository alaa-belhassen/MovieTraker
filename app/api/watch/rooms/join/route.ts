import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-auth'
import { joinMongoRoom } from '@/lib/mongodb-data'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })
    }

    const body = await request.json()
    let roomId = typeof body.roomId === 'string' ? body.roomId.trim() : ''

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
    const room = await joinMongoRoom(roomId, user.id)
    if (!room) {
      return NextResponse.json({ error: 'Salon introuvable. Vérifiez le lien ou le code.' }, { status: 404 })
    }

    return NextResponse.json({ success: true, roomId: room.id, title: room.title })
  } catch (error) {
    console.error('[CinéTrack] join room error:', error)
    return NextResponse.json({ error: 'Erreur lors de la connexion au salon.' }, { status: 500 })
  }
}
