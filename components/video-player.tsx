'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, LoaderCircle, Play, RefreshCw } from 'lucide-react'
import { extractVimeoId, extractYouTubeId, updateRoomVideo, validateVideoUrl } from '@/lib/cinetrack-data'

type Room = { id: string; title: string; video_url: string | null; video_provider: string | null }
type Provider = 'youtube' | 'vimeo' | 'dailymotion' | 'direct' | 'hls' | 'dash' | 'external'
type Detection = { provider: Provider; url: string; embedUrl?: string; label: string }
type PlaybackState = { roomId: string; position: number; is_playing: boolean; playback_rate: number }
type PlayerEvent = { type: 'play' | 'pause' | 'seek'; position: number }

function detect(url: string): Detection | null {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return null
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '')
    const youtubeId = extractYouTubeId(url)
    if (youtubeId) return { provider: 'youtube', url, embedUrl: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}?rel=0&playsinline=1`, label: 'YouTube' }
    const vimeoId = extractVimeoId(url)
    if (vimeoId) return { provider: 'vimeo', url, embedUrl: `https://player.vimeo.com/video/${encodeURIComponent(vimeoId)}`, label: 'Vimeo' }
    const dailymotionMatch = url.match(/(?:dailymotion\.com\/video\/|dai\.ly\/)([a-zA-Z0-9]+)/i)
    if (dailymotionMatch) return { provider: 'dailymotion', url, embedUrl: `https://www.dailymotion.com/embed/video/${encodeURIComponent(dailymotionMatch[1])}`, label: 'Dailymotion' }
    const pathname = parsed.pathname.toLowerCase()
    if (/\.(mp4|webm|ogg)$/i.test(pathname)) return { provider: 'direct', url, label: 'Fichier vidéo' }
    if (/\.m3u8$/i.test(pathname)) return { provider: 'hls', url, label: 'Flux HLS' }
    if (/\.mpd$/i.test(pathname)) return { provider: 'dash', url, label: 'Flux MPEG-DASH' }
    return { provider: 'external', url, label: host }
  } catch {
    return null
  }
}

function ExternalFallback({
  detection,
  message,
  onExtract,
  extracting = false,
  extractionError,
}: {
  detection: Detection
  message?: string
  onExtract?: () => void
  extracting?: boolean
  extractionError?: string
}) {
  return <div className="flex size-full min-h-64 flex-col items-center justify-center gap-4 p-6 text-center"><div className="grid size-12 place-items-center rounded-full bg-white/10 text-[#d8ff45]"><ExternalLink aria-hidden="true" /></div><div><p className="font-medium">{message ?? 'Cette vidéo ne peut pas être lue directement ici.'}</p><p className="mt-2 text-sm text-[#a7aaa7]">Ouvrez-la sur {detection.label} pour continuer.</p></div>{onExtract && <div className="flex flex-col items-center gap-2"><button type="button" onClick={onExtract} disabled={extracting} className="inline-flex items-center gap-2 rounded-full bg-[#d8ff45] px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">{extracting ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />} {extracting ? 'Recherche du flux…' : 'Extraire le flux vidéo'}</button>{extractionError && <p role="alert" className="max-w-md text-sm text-amber-300">{extractionError}</p>}</div>}<a href={detection.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white"><ExternalLink aria-hidden="true" /> Ouvrir la vidéo originale</a></div>
}

function emitPlayerEvent(type: PlayerEvent['type'], position: number) {
  window.dispatchEvent(new CustomEvent<PlayerEvent>('cinetrack:player-event', { detail: { type, position } }))
}

function StreamPlayer({ detection, onFailure, onLoadedMetadata }: { detection: Detection; onFailure: (reason: string) => void; onLoadedMetadata: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let disposed = false
    let instance: { destroy?: () => void } | null = null
    const setup = async () => {
      try {
        if (detection.provider === 'direct') video.src = detection.url
        else if (detection.provider === 'hls' && !video.canPlayType('application/vnd.apple.mpegurl')) {
          const module = await import('hls.js')
          if (!module.default.isSupported()) throw new Error('HLS non supporté')
          const hls = new module.default()
          hls.loadSource(detection.url)
          hls.attachMedia(video)
          hls.on(module.default.Events.ERROR, (_event, data) => { if (data.fatal) onFailure('Le flux HLS ne peut pas être chargé.') })
          instance = hls
        } else if (detection.provider === 'dash') {
          const module = await import('dashjs')
          const player = module.MediaPlayer().create()
          player.initialize(video, detection.url, false)
          player.on(module.MediaPlayer.events.ERROR, () => onFailure('Le flux MPEG-DASH ne peut pas être chargé.'))
          instance = player
        } else video.src = detection.url
      } catch (cause) {
        if (!disposed) {
          console.error('[CinéTrack] video player initialization failed:', cause)
          onFailure('Ce format vidéo n’est pas pris en charge par ce navigateur.')
        }
      }
    }
    void setup()
    return () => { disposed = true; instance?.destroy?.(); video.removeAttribute('src'); video.load() }
  }, [detection.provider, detection.url, onFailure])
  return <video ref={videoRef} controls playsInline className="size-full" onLoadedMetadata={onLoadedMetadata} onPlay={() => emitPlayerEvent('play', videoRef.current?.currentTime ?? 0)} onPause={() => emitPlayerEvent('pause', videoRef.current?.currentTime ?? 0)} onSeeked={() => emitPlayerEvent('seek', videoRef.current?.currentTime ?? 0)} onError={() => onFailure('Le flux vidéo ne peut pas être chargé.')} />
}

type YouTubePlayer = {
  destroy: () => void
  getCurrentTime: () => number
  getDuration: () => number
  getPlayerState: () => number
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  playVideo: () => void
  pauseVideo: () => void
  setPlaybackRate: (rate: number) => void
}
type YouTubeApi = {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string
      playerVars: Record<string, string | number>
      events: {
        onReady: () => void
        onError: (event: { data: number }) => void
        onStateChange: (event: { data: number }) => void
      }
    },
  ) => YouTubePlayer
}
declare global { interface Window { YT?: YouTubeApi; onYouTubeIframeAPIReady?: () => void } }

function YouTubePlayerView({
  detection,
  onBlocked,
  playbackState,
}: {
  detection: Detection
  onBlocked: (reason: string) => void
  playbackState: PlaybackState | null
}) {
  const mountRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YouTubePlayer | null>(null)
  const playbackStateRef = useRef(playbackState)
  const suppressEventsRef = useRef(false)
  const suppressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const applyStateRef = useRef<(state: PlaybackState) => void>(() => {})
  const [ready, setReady] = useState(false)
  const videoId = detection.embedUrl?.split('/embed/')[1]?.split('?')[0] ?? ''

  playbackStateRef.current = playbackState

  useEffect(() => {
    let cancelled = false
    let pollTimer: ReturnType<typeof setInterval> | null = null
    let previousPosition = 0
    let previousTick = 0

    applyStateRef.current = (state) => {
      const player = playerRef.current
      if (!player) return
      const currentPosition = player.getCurrentTime()
      const duration = player.getDuration()
      const target = duration > 0 ? Math.min(state.position, duration) : state.position
      const shouldSeek = Number.isFinite(currentPosition) && Math.abs(currentPosition - target) > 0.75

      if (suppressTimeoutRef.current) clearTimeout(suppressTimeoutRef.current)
      suppressEventsRef.current = true
      if (shouldSeek) player.seekTo(target, true)
      try {
        player.setPlaybackRate(state.playback_rate)
      } catch (error) {
        console.warn('[CinéTrack] YouTube playback rate is unsupported:', error)
      }
      if (state.is_playing) player.playVideo()
      else player.pauseVideo()
      suppressTimeoutRef.current = setTimeout(() => {
        suppressEventsRef.current = false
        suppressTimeoutRef.current = null
      }, 1000)
    }

    const init = () => {
      if (cancelled || !mountRef.current || !window.YT || !videoId) return
      playerRef.current?.destroy()
      playerRef.current = new window.YT.Player(mountRef.current, {
        videoId: decodeURIComponent(videoId),
        playerVars: { rel: 0, playsinline: 1, origin: window.location.origin, enablejsapi: 1 },
        events: {
          onReady: () => {
            if (cancelled) return
            setReady(true)
            if (process.env.NODE_ENV === 'development') console.info('[CinéTrack] YouTube player ready', videoId)
            if (playbackStateRef.current) applyStateRef.current(playbackStateRef.current)
            previousPosition = playerRef.current?.getCurrentTime() ?? 0
            previousTick = Date.now()
            pollTimer = setInterval(() => {
              const player = playerRef.current
              if (!player || suppressEventsRef.current) return
              const now = Date.now()
              const currentPosition = player.getCurrentTime()
              const elapsed = (now - previousTick) / 1000
              const expectedAdvance = player.getPlayerState() === 1 ? elapsed : 0
              if (
                Number.isFinite(currentPosition) &&
                Math.abs((currentPosition - previousPosition) - expectedAdvance) > 1.5
              ) {
                emitPlayerEvent('seek', currentPosition)
              }
              previousPosition = currentPosition
              previousTick = now
            }, 500)
          },
          onError: (event) => {
            if (process.env.NODE_ENV === 'development') console.info('[CinéTrack] YouTube player error', event.data, videoId)
            const reason = event.data === 101 || event.data === 150 ? 'Le propriétaire de cette vidéo a désactivé la lecture sur les autres sites.' : event.data === 100 ? 'Cette vidéo YouTube est introuvable ou privée.' : 'YouTube ne peut pas lire cette vidéo ici.'
            onBlocked(reason)
          },
          onStateChange: (event) => {
            if (suppressEventsRef.current || !playerRef.current) return
            if (event.data === 1) emitPlayerEvent('play', playerRef.current.getCurrentTime())
            else if (event.data === 2 || event.data === 0) emitPlayerEvent('pause', playerRef.current.getCurrentTime())
          },
        },
      })
    }
    if (window.YT) init()
    else {
      const previous = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => { previous?.(); init() }
      if (!document.querySelector('script[data-youtube-iframe-api]')) { const script = document.createElement('script'); script.src = 'https://www.youtube.com/iframe_api'; script.async = true; script.dataset.youtubeIframeApi = 'true'; document.head.appendChild(script) }
    }
    return () => {
      cancelled = true
      if (pollTimer) clearInterval(pollTimer)
      if (suppressTimeoutRef.current) clearTimeout(suppressTimeoutRef.current)
      suppressEventsRef.current = false
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [videoId, onBlocked])

  useEffect(() => {
    if (playbackState) applyStateRef.current(playbackState)
  }, [playbackState])

  return <div className="relative size-full"><div ref={mountRef} className="size-full" />{!ready && <div className="absolute inset-0 grid place-items-center bg-black/50 text-sm text-[#a7aaa7]">Chargement de YouTube…</div>}</div>
}

function isPlaybackState(value: unknown): value is PlaybackState {
  if (typeof value !== 'object' || value === null) return false
  const state = value as Record<string, unknown>
  return typeof state.roomId === 'string' && typeof state.position === 'number' && Number.isFinite(state.position) &&
    state.position >= 0 && typeof state.is_playing === 'boolean' && typeof state.playback_rate === 'number' &&
    Number.isFinite(state.playback_rate) && state.playback_rate > 0
}

function isPlayerEvent(value: unknown): value is PlayerEvent {
  if (typeof value !== 'object' || value === null) return false
  const event = value as Record<string, unknown>
  return ['play', 'pause', 'seek'].includes(String(event.type)) && typeof event.position === 'number' && Number.isFinite(event.position)
}

export function Player({ room, onChanged, isHost = false }: { room: Room; onChanged: (room: Room) => void; isHost?: boolean }) {
  const [edit, setEdit] = useState(false)
  const [url, setUrl] = useState(room.video_url ?? '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [extractionError, setExtractionError] = useState('')
  const [extractedDetection, setExtractedDetection] = useState<Detection | null>(null)
  const [failed, setFailed] = useState(false)
  const [failureReason, setFailureReason] = useState('')
  const syncingRef = useRef(false)
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const playbackStateRef = useRef<PlaybackState | null>(null)
  const extractionControllerRef = useRef<AbortController | null>(null)
  const [playbackState, setPlaybackState] = useState<PlaybackState | null>(null)
  const playerRef = useRef<HTMLDivElement>(null)
  const detection = useMemo(() => room.video_url ? detect(room.video_url) : null, [room.video_url])
  const playerDetection = extractedDetection ?? detection
  const handleProviderFailure = useCallback((reason?: string) => { setFailureReason(reason ?? 'Cette vidéo ne peut pas être lue directement ici.'); setFailed(true) }, [])

  useEffect(() => {
    extractionControllerRef.current?.abort()
    extractionControllerRef.current = null
    setUrl(room.video_url ?? '')
    setExtracting(false)
    setExtractionError('')
    setExtractedDetection(null)
    setFailed(false)
    setFailureReason('')
    return () => { extractionControllerRef.current?.abort() }
  }, [room.id, room.video_url])

  const extractStream = async () => {
    if (!detection || detection.provider !== 'external') return
    extractionControllerRef.current?.abort()
    const controller = new AbortController()
    extractionControllerRef.current = controller
    setExtracting(true)
    setExtractionError('')
    try {
      const response = await fetch('/api/watch/rooms/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id }),
        signal: controller.signal,
      })
      const result = await response.json() as { error?: unknown; streamUrl?: unknown; provider?: unknown }
      if (!response.ok) {
        const message = result.error === 'AUTH_REQUIRED'
          ? 'Connectez-vous pour extraire le flux vidéo.'
          : result.error === 'ROOM_FORBIDDEN'
            ? 'Vous n’avez pas accès à cette séance.'
            : result.error === 'VIDEO_EXTRACTION_UNAVAILABLE'
              ? 'Le service d’extraction est momentanément indisponible.'
              : 'Impossible d’extraire un flux compatible. Le site peut bloquer la lecture ou nécessiter une connexion.'
        throw new Error(message)
      }
      if (typeof result.streamUrl !== 'string' || (result.provider !== 'direct' && result.provider !== 'hls')) {
        throw new Error('La source n’a pas fourni de flux vidéo compatible.')
      }
      const streamUrl = new URL(result.streamUrl)
      if (streamUrl.protocol !== 'https:') throw new Error('Le flux vidéo retourné est invalide.')
      setExtractedDetection({
        provider: result.provider,
        url: streamUrl.href,
        label: 'Flux extrait',
      })
      setFailed(false)
      setFailureReason('')
    } catch (cause) {
      if (!controller.signal.aborted) {
        setExtractionError(cause instanceof Error
          ? cause.message
          : 'Impossible d’extraire un flux compatible. Le site peut bloquer la lecture ou nécessiter une connexion.')
      }
    } finally {
      if (extractionControllerRef.current === controller) {
        extractionControllerRef.current = null
        setExtracting(false)
      }
    }
  }

  const applyPlaybackState = useCallback((state: PlaybackState) => {
    const video = playerRef.current?.querySelector('video')
    if (!video || !video.currentSrc || video.readyState < HTMLMediaElement.HAVE_METADATA) return
    const target = Number.isFinite(video.duration) ? Math.min(state.position, video.duration) : state.position
    const shouldSeek = Math.abs(video.currentTime - target) > 0.75
    const shouldPlay = state.is_playing && video.paused
    const shouldPause = !state.is_playing && !video.paused
    if (shouldSeek) video.currentTime = target
    video.playbackRate = state.playback_rate
    if (!shouldSeek && !shouldPlay && !shouldPause) return
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
    syncingRef.current = true
    if (shouldPlay) {
      void video.play().catch((cause: unknown) => setFailureReason(
        cause instanceof DOMException && cause.name === 'NotAllowedError'
          ? 'La lecture automatique est bloquée par le navigateur.'
          : 'Impossible de synchroniser la lecture vidéo.',
      ))
    } else if (shouldPause) video.pause()
    syncTimeoutRef.current = setTimeout(() => { syncingRef.current = false; syncTimeoutRef.current = null }, 250)
  }, [])

  useEffect(() => {
    const onState = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail
      if (!isPlaybackState(detail)) {
        console.error('[CinéTrack] received an invalid playback state:', detail)
        return
      }
      if (detail.roomId !== room.id) return
      playbackStateRef.current = detail
      setPlaybackState(detail)
      if (['direct', 'hls'].includes(playerDetection?.provider ?? '')) applyPlaybackState(detail)
    }
    const onLocal = (event: Event) => {
      if (syncingRef.current) return
      const detail = (event as CustomEvent<unknown>).detail
      if (!isPlayerEvent(detail)) {
        console.error('[CinéTrack] received an invalid player event:', detail)
        return
      }
      window.dispatchEvent(new CustomEvent<PlayerEvent>('cinetrack:local-playback', { detail }))
    }
    window.addEventListener('cinetrack:playback-state', onState)
    window.addEventListener('cinetrack:player-event', onLocal)
    return () => {
      window.removeEventListener('cinetrack:playback-state', onState)
      window.removeEventListener('cinetrack:player-event', onLocal)
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
      syncingRef.current = false
    }
  }, [applyPlaybackState, playerDetection?.provider, room.id])

  const save = async () => {
    setError('')
    if (!validateVideoUrl(url)) { setError('Ajoutez un lien HTTPS valide.'); return }
    setLoading(true)
    try {
      const updated = await updateRoomVideo(room.id, url)
      onChanged({ ...room, ...updated })
      setEdit(false)
      setFailed(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de sauvegarder ce lien.')
    } finally {
      setLoading(false)
    }
  }

  if (!detection || !playerDetection) return <div className="grid aspect-video place-items-center rounded-2xl border border-white/10 bg-black p-8 text-center"><p className="text-[#a7aaa7]">Cette séance utilise le minuteur partagé, sans vidéo intégrée.</p></div>
  return <div className="space-y-3" data-watch-room={room.id}>
    <div ref={playerRef} className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">
      {failed || playerDetection.provider === 'external' || playerDetection.provider === 'dash'
        ? <ExternalFallback detection={detection} message={failureReason || (playerDetection.provider === 'dash' ? 'Les flux MPEG-DASH ne sont pas pris en charge par ce navigateur.' : undefined)} onExtract={detection.provider === 'external' ? extractStream : undefined} extracting={extracting} extractionError={extractionError} />
        : playerDetection.provider === 'youtube'
          ? <YouTubePlayerView detection={playerDetection} onBlocked={handleProviderFailure} playbackState={playbackState} />
          : playerDetection.provider === 'direct' || playerDetection.provider === 'hls'
            ? <StreamPlayer detection={playerDetection} onFailure={handleProviderFailure} onLoadedMetadata={() => { if (playbackStateRef.current) applyPlaybackState(playbackStateRef.current) }} />
            : <iframe key={playerDetection.embedUrl} src={playerDetection.embedUrl} title={`${room.title} — ${playerDetection.label}`} className="size-full border-0" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" onError={() => handleProviderFailure()} />}
      {!failed && playerDetection.provider !== 'external' && <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-xs text-white"><Play aria-hidden="true" /> {playerDetection.label}</span>}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><span className="text-[#a7aaa7]">Source détectée : {detection.label}</span><div className="flex gap-2"><a href={detection.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 hover:bg-white/15"><ExternalLink aria-hidden="true" /> Ouvrir</a>{isHost && <button onClick={() => { setEdit((value) => !value); setError('') }} className="rounded-full bg-white/10 px-3 py-2 hover:bg-white/15">Modifier le lien</button>}</div></div>
    {edit && <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><label className="block text-sm font-medium" htmlFor="room-video-url">Lien vidéo<input id="room-video-url" value={url} onChange={(event) => setUrl(event.target.value)} type="url" inputMode="url" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-[#d8ff45]" /></label>{error && <p role="alert" className="mt-2 text-sm text-amber-300">{error}</p>}<div className="mt-3 flex flex-wrap gap-2"><button onClick={save} disabled={loading} className="inline-flex items-center gap-2 rounded-full bg-[#d8ff45] px-4 py-2 font-semibold text-black disabled:opacity-60">{loading ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null} Enregistrer</button><button onClick={() => setEdit(false)} className="rounded-full bg-white/10 px-4 py-2">Annuler</button></div></div>}
    {failureReason && !failed && <p role="status" className="text-sm text-amber-300">{failureReason}</p>}
    {failed && <button onClick={() => { if (detection.provider === 'external') setExtractedDetection(null); setFailed(false); setFailureReason(''); setExtractionError('') }} className="inline-flex items-center gap-2 text-sm text-[#d8ff45]"><RefreshCw aria-hidden="true" /> Réessayer</button>}
  </div>
}
