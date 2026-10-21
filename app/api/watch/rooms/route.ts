import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ rooms: [] })

    const [{ data: owned, error: ownedError }, { data: memberships, error: membershipError }] = await Promise.all([
      supabase.from('rooms').select('id, title, video_url, video_provider, mode, status, scheduled_at, host_id').eq('host_id', user.id).order('created_at', { ascending: false }),
      supabase.from('room_participants').select('room_id').eq('user_id', user.id),
    ])
    if (ownedError || membershipError) throw ownedError ?? membershipError

    const ownedIds = new Set((owned ?? []).map((room) => room.id))
    const invitedIds = (memberships ?? []).map((membership) => membership.room_id).filter((id) => !ownedIds.has(id))
    const invited = invitedIds.length ? await supabase.from('rooms').select('id, title, video_url, video_provider, mode, status, scheduled_at, host_id').in('id', invitedIds).order('created_at', { ascending: false }) : { data: [], error: null }
    if (invited.error) throw invited.error

    return NextResponse.json({ rooms: [...(owned ?? []).map((room) => ({ ...room, role: 'owner' })), ...(invited.data ?? []).map((room) => ({ ...room, role: 'participant' }))] })
  } catch (error) {
    console.error('[CinéTrack] watch rooms request failed', error)
    return NextResponse.json({ rooms: [], error: 'ROOMS_UNAVAILABLE' }, { status: 200 })
  }
}
