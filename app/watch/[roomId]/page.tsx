import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMongoRoom } from '@/lib/mongodb-data'
import { WatchRoom, WatchRoomError } from '@/components/watch-page'

export default async function Page({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?next=/watch/${roomId}`)
  let room
  try {
    room = await getMongoRoom(roomId, user.id, true)
  } catch (error) {
    console.error('[CinéTrack] MongoDB rooms query failed', error)
    return <WatchRoomError />
  }
  if (!room) notFound()

  return <WatchRoom initialRoom={{
    id: room.id,
    title: room.title,
    video_url: room.video_url,
    video_provider: room.video_provider,
    mode: room.mode,
    host_id: room.host_id,
  }} isHost={room.host_id === user.id} />
}
