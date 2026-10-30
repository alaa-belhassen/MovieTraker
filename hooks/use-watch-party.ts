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
    lastSequence.current = 0
    setState(null)
    const accept = (next: State) => {
      if (!active || next.sequence <= lastSequence.current) return
      lastSequence.current = next.sequence
      setState(next)
    }
    const load = async () => {
      const { data, error } = await supabase.from('room_playback_state').select('*').eq('room_id', roomId).maybeSingle()
      if (error) {
        console.error('[CinéTrack] playback state load failed:', error)
        return
      }
      if (data) accept(data as State)
    }
    const channel = supabase
      .channel(`playback-${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_playback_state', filter: `room_id=eq.${roomId}` }, payload => {
        if (payload.new) accept(payload.new as State)
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') void load()
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`[CinéTrack] playback realtime subscription failed: ${status}`)
        }
      })
    return () => { active = false; void supabase.removeChannel(channel) }
  }, [roomId])
  const command = useCallback(async (eventType: 'video' | 'play' | 'pause' | 'seek' | 'rate', values: Partial<State>) => {
    if (!isHost) return false
    if (lastSequence.current === 0) {
      const { data: current, error: loadError } = await supabase
        .from('room_playback_state')
        .select('*')
        .eq('room_id', roomId)
        .maybeSingle()
      if (loadError) {
        console.error('[CinéTrack] playback state load before command failed:', loadError)
        return false
      }
      if (current) {
        lastSequence.current = current.sequence
        setState(current as State)
      }
    }

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const expectedSequence = lastSequence.current
      const { data, error } = await supabase.rpc('apply_room_playback_event', { target_room_id: roomId, event_type: eventType, next_source_url: values.source_url ?? null, next_provider: values.provider ?? null, next_is_playing: values.is_playing ?? null, next_position_seconds: values.position_seconds ?? null, next_playback_rate: values.playback_rate ?? null, expected_sequence: expectedSequence })
      if (error) {
        console.error('[CinéTrack] playback command failed:', error)
        return false
      }
      if (!data) {
        console.error('[CinéTrack] playback command returned no state')
        return false
      }

      const next = (Array.isArray(data) ? data[0] : data) as State
      if (next.sequence === expectedSequence + 1) {
        lastSequence.current = next.sequence
        setState(next)
        return true
      }
      if (next.sequence <= expectedSequence) {
        console.error('[CinéTrack] playback command did not advance the room state')
        return false
      }
      lastSequence.current = next.sequence
      setState(next)
    }
    console.error('[CinéTrack] playback command could not be applied after a concurrent update')
    return false
  }, [isHost, roomId])
  return { state, position: state ? projectedPosition(state) : 0, command }
}
