'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/cinetrack-data'
import { projectedPosition } from '@/lib/watch-party-playback'

type State = { room_id: string; source_url: string | null; provider: string | null; is_playing: boolean; position_seconds: number; playback_rate: number; sequence: number; reference_at: string; updated_at: string; updated_by: string }

export function useWatchParty(roomId: string, isHost: boolean) {
  const [state, setState] = useState<State | null>(null)
  const lastSequence = useRef(0)
  useEffect(() => {
    let active = true
    const load = async () => { const { data } = await supabase.from('room_playback_state').select('*').eq('room_id', roomId).maybeSingle(); if (active && data) { lastSequence.current = data.sequence; setState(data as State) } }
    void load()
    const channel = supabase.channel(`playback-${roomId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'room_playback_state', filter: `room_id=eq.${roomId}` }, payload => { const next = payload.new as State; if (next.sequence <= lastSequence.current) return; lastSequence.current = next.sequence; setState(next) }).subscribe()
    return () => { active = false; void supabase.removeChannel(channel) }
  }, [roomId])
  const command = useCallback(async (eventType: 'video' | 'play' | 'pause' | 'seek' | 'rate', values: Partial<State>) => {
    if (!isHost) return false
    const { data, error } = await supabase.rpc('apply_room_playback_event', { target_room_id: roomId, event_type: eventType, next_source_url: values.source_url ?? null, next_provider: values.provider ?? null, next_is_playing: values.is_playing ?? null, next_position_seconds: values.position_seconds ?? null, next_playback_rate: values.playback_rate ?? null, expected_sequence: lastSequence.current })
    if (error || !data) return false
    const next = Array.isArray(data) ? data[0] : data
    if (next.sequence > lastSequence.current) { lastSequence.current = next.sequence; setState(next as State) }
    return true
  }, [isHost, roomId])
  return { state, position: state ? projectedPosition(state) : 0, command }
}
