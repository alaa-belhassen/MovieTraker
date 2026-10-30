import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-auth'
import { inviteMongoRoomParticipants } from '@/lib/mongodb-data'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })
    }

    const body = await request.json()
    const roomId = typeof body.roomId === 'string' ? body.roomId.trim() : ''
    const usernames = Array.isArray(body.usernames)
      ? body.usernames.filter((name: unknown): name is string => typeof name === 'string').map((name: string) => name.trim()).filter(Boolean)
      : []

    if (!roomId) return NextResponse.json({ error: 'Choisissez un salon valide.' }, { status: 400 })
    if (usernames.length === 0) return NextResponse.json({ error: 'Saisissez au moins un pseudo.' }, { status: 400 })
    if (usernames.length > 20 || usernames.some((name: string) => name.replace(/^@+/, '').length > 40)) {
      return NextResponse.json({ error: 'Invitez au maximum 20 pseudos de 40 caractères chacun.' }, { status: 400 })
    }

    let results
    try {
      results = await inviteMongoRoomParticipants(roomId, usernames, user.id)
    } catch (error) {
      if (error instanceof Error && error.message === 'HOST_REQUIRED') {
        return NextResponse.json({ error: 'Seul l’hôte peut inviter des participants.' }, { status: 403 })
      }
      if (error instanceof Error && error.message === 'INVALID_INVITES') {
        return NextResponse.json({ error: 'Invitations invalides.' }, { status: 400 })
      }
      throw error
    }
    return NextResponse.json({
      invited: results.flatMap((result) => result.invited_username ? [result.invited_username] : []),
      notFound: results.flatMap((result) => result.invited_username ? [] : [result.requested_username]),
    })
  } catch (error) {
    console.error('[CinéTrack] room invitation request failed:', error)
    return NextResponse.json({ error: 'Erreur lors de l’envoi des invitations.' }, { status: 500 })
  }
}
