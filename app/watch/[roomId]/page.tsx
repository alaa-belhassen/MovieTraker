import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WatchRoom, WatchRoomError } from '@/components/watch-page'

export default async function Page({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?next=/watch/${roomId}`)
  const { data: room, error } = await supabase.from('rooms').select('id, title, video_url, video_provider, mode, host_id').eq('id', roomId).maybeSingle()
  if (error) {
    console.error('[CinéTrack] rooms query failed', { message: error.message, code: error.code })
    return <WatchRoomError />
  }
  if (!room) notFound()

  // Ensure invited participant is added to room_participants in Supabase
  if (room.host_id !== user.id) {
    try {
      await supabase.from('room_participants').upsert(
        { room_id: room.id, user_id: user.id },
        { onConflict: 'room_id,user_id' }
      )
    } catch (err) {
      console.warn('[CinéTrack] participant upsert warning:', err)
    }
  }

  return <WatchRoom initialRoom={room} isHost={room.host_id === user.id} />
}
