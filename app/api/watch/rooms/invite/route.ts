import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
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

    const { data, error } = await supabase.rpc('invite_room_participants', {
      target_room_id: roomId,
      target_usernames: usernames,
    })
    if (error) {
      console.error('[CinéTrack] room invitations failed:', error)
      if (error.message.includes('HOST_REQUIRED')) {
        return NextResponse.json({ error: 'Seul l’hôte peut inviter des participants.' }, { status: 403 })
      }
      return NextResponse.json({ error: 'Impossible d’envoyer les invitations.' }, { status: 400 })
    }

    const results = (data ?? []) as Array<{ requested_username: string; invited_username: string | null }>
    return NextResponse.json({
      invited: results.flatMap((result) => result.invited_username ? [result.invited_username] : []),
      notFound: results.flatMap((result) => result.invited_username ? [] : [result.requested_username]),
    })
  } catch (error) {
    console.error('[CinéTrack] room invitation request failed:', error)
    return NextResponse.json({ error: 'Erreur lors de l’envoi des invitations.' }, { status: 500 })
  }
}
