import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-auth'
import { createMongoRoomMessage, ensureMongoProfile, listMongoRoomMessages } from '@/lib/mongodb-data'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })

    const roomId = request.nextUrl.searchParams.get('roomId')?.trim()
    if (!roomId) return NextResponse.json({ error: 'Salon invalide.' }, { status: 400 })

    try {
      const messages = await listMongoRoomMessages(roomId, user.id)
      return NextResponse.json({ messages })
    } catch (error) {
      if (error instanceof Error && error.message === 'ROOM_ACCESS_DENIED') {
        return NextResponse.json({ error: 'Vous ne pouvez pas accéder aux messages de ce salon.' }, { status: 403 })
      }
      throw error
    }
  } catch (error) {
    console.error('[CinéTrack] room chat history load failed:', error)
    return NextResponse.json({ error: 'Impossible de charger les messages du salon.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
    }
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
    }
    const roomId = 'roomId' in body && typeof body.roomId === 'string' ? body.roomId.trim() : ''
    const text = 'text' in body && typeof body.text === 'string' ? body.text : ''
    if (!roomId) return NextResponse.json({ error: 'Salon invalide.' }, { status: 400 })
    if (!text.trim() || text.trim().length > 500) {
      return NextResponse.json({ error: 'Le message doit contenir entre 1 et 500 caractères.' }, { status: 400 })
    }

    try {
      const profile = await ensureMongoProfile(user)
      if (!profile) throw new Error('Authenticated user profile could not be loaded.')
      const message = await createMongoRoomMessage(roomId, user.id, profile.username, text)
      return NextResponse.json({ message }, { status: 201 })
    } catch (error) {
      if (error instanceof Error && error.message === 'ROOM_ACCESS_DENIED') {
        return NextResponse.json({ error: 'Vous ne pouvez pas envoyer de message dans ce salon.' }, { status: 403 })
      }
      if (error instanceof Error && error.message === 'INVALID_ROOM_MESSAGE') {
        return NextResponse.json({ error: 'Le message doit contenir entre 1 et 500 caractères.' }, { status: 400 })
      }
      throw error
    }
  } catch (error) {
    console.error('[CinéTrack] room chat message send failed:', error)
    return NextResponse.json({ error: 'Impossible d’envoyer le message.' }, { status: 500 })
  }
}
