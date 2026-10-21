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
  return <WatchRoom initialRoom={room} isHost={room.host_id === user.id} />
}
