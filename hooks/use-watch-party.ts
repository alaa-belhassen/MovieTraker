'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
      try {
        const response = await fetch(`/api/watch/rooms/playback?roomId=${encodeURIComponent(roomId)}`)
        if (!response.ok) throw new Error(`Playback state request failed (${response.status}).`)
        accept(await response.json() as State)
      } catch (error) {
        console.error('[CinéTrack] playback state load failed:', error)
      }
    }
    void load()
    const interval = window.setInterval(() => { void load() }, 1500)
    return () => { active = false; window.clearInterval(interval) }
  }, [roomId])
  const command = useCallback(async (eventType: 'video' | 'play' | 'pause' | 'seek' | 'rate', values: Partial<State>) => {
    if (!isHost) return false
    if (lastSequence.current === 0) {
      try {
        const response = await fetch(`/api/watch/rooms/playback?roomId=${encodeURIComponent(roomId)}`)
        if (!response.ok) throw new Error(`Playback state request failed (${response.status}).`)
        const current = await response.json() as State
        lastSequence.current = current.sequence
        setState(current)
      } catch (error) {
        console.error('[CinéTrack] playback state load before command failed:', error)
        return false
      }
    }

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const expectedSequence = lastSequence.current
      let next: State
      try {
        const response = await fetch('/api/watch/rooms/playback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId,
            eventType,
            expectedSequence,
            source_url: values.source_url,
            provider: values.provider,
            is_playing: values.is_playing,
            position_seconds: values.position_seconds,
            playback_rate: values.playback_rate,
          }),
        })
        if (!response.ok) throw new Error(`Playback command request failed (${response.status}).`)
        next = await response.json() as State
      } catch (error) {
        console.error('[CinéTrack] playback command failed:', error)
        return false
      }
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
