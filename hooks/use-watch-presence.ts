'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/cinetrack-data'

type Participant = { key: string; userId: string; username: string; isHost: boolean }

export function useWatchPresence(roomId: string, user: { id: string } | null, username?: string | null, isHost = false) {
  const [participants, setParticipants] = useState<Participant[]>([])

  useEffect(() => {
    if (!user) return
    const channel = supabase.channel(`presence-${roomId}`, { config: { presence: { key: user.id } } })
    const sync = () => {
      const byUserId = new Map<string, Participant>()
      for (const presence of Object.values(channel.presenceState<{ userId: string; username: string; isHost: boolean }>()).flat()) {
        byUserId.set(presence.userId, {
          key: presence.userId,
          userId: presence.userId,
          username: presence.username || 'Utilisateur',
          isHost: presence.isHost,
        })
      }
      const next = [...byUserId.values()]
      setParticipants(next)
    }
    channel.on('presence', { event: 'sync' }, sync).on('presence', { event: 'join' }, sync).on('presence', { event: 'leave' }, sync)
    void channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await channel.track({ userId: user.id, username: username || 'Utilisateur', isHost })
    })
    return () => { void supabase.removeChannel(channel) }
  }, [roomId, user, username, isHost])

  return participants
}
