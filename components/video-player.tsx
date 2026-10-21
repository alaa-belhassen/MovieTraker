'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, LoaderCircle, Play, RefreshCw } from 'lucide-react'
import { extractVimeoId, extractYouTubeId, updateRoomVideo, validateVideoUrl } from '@/lib/cinetrack-data'

type Room = { id: string; title: string; video_url: string | null; video_provider: string | null }

type Provider = 'youtube' | 'vimeo' | 'dailymotion' | 'direct' | 'hls' | 'dash' | 'external'

type Detection = { provider: Provider; url: string; embedUrl?: string; label: string }

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
    if (/\.(mp4|webm|ogg)(?:$|\?)/i.test(pathname)) return { provider: 'direct', url, label: 'Fichier vidéo' }
    if (/\.m3u8(?:$|\?)/i.test(pathname)) return { provider: 'hls', url, label: 'Flux HLS' }
    if (/\.mpd(?:$|\?)/i.test(pathname)) return { provider: 'dash', url, label: 'Flux MPEG-DASH' }
    return { provider: 'external', url, label: host }
  } catch { return null }
}

function ExternalFallback({ detection, message }: { detection: Detection; message?: string }) {
  return <div className="flex size-full min-h-64 flex-col items-center justify-center gap-4 p-6 text-center"><div className="grid size-12 place-items-center rounded-full bg-white/10 text-[#d8ff45]"><ExternalLink aria-hidden="true" /></div><div><p className="font-medium">{message ?? 'Cette vidéo ne peut pas être lue directement ici.'}</p><p className="mt-2 text-sm text-[#a7aaa7]">Ouvrez-la sur {detection.label} pour continuer.</p></div><a href={detection.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2 rounded-full bg-[#d8ff45] px-4 py-2 text-sm font-semibold text-black"><ExternalLink aria-hidden="true" /> Ouvrir la vidéo originale</a></div>
}

function StreamPlayer({ detection, onFailure }: { detection: Detection; onFailure: (reason: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const video = videoRef.current
    if (!video || detection.provider === 'direct') return
    let disposed = false
    let instance: { destroy?: () => void; reset?: () => void } | null = null
    const setup = async () => {
      try {
        if (detection.provider === 'hls' && !video.canPlayType('application/vnd.apple.mpegurl')) {
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
      } catch { if (!disposed) onFailure('Ce format vidéo n’est pas pris en charge par ce navigateur.') }
    }
    void setup()
    return () => { disposed = true; instance?.destroy?.(); video.removeAttribute('src'); video.load() }
  }, [detection.provider, detection.url, onFailure])
  return <video ref={videoRef} controls playsInline className="size-full" onPlay={() => window.dispatchEvent(new CustomEvent('cinetrack:player-event', { detail: { type: 'play', position: videoRef.current?.currentTime ?? 0 } }))} onPause={() => window.dispatchEvent(new CustomEvent('cinetrack:player-event', { detail: { type: 'pause', position: videoRef.current?.currentTime ?? 0 } }))} onSeeked={() => window.dispatchEvent(new CustomEvent('cinetrack:player-event', { detail: { type: 'seek', position: videoRef.current?.currentTime ?? 0 } }))} onError={() => onFailure('Le flux vidéo ne peut pas être chargé.')} />
}

type YouTubePlayer = { destroy: () => void }
type YouTubeApi = { Player: new (element: HTMLElement, options: { videoId: string; playerVars: Record<string, string | number>; events: { onReady: () => void; onError: (event: { data: number }) => void } }) => YouTubePlayer }
declare global { interface Window { YT?: YouTubeApi; onYouTubeIframeAPIReady?: () => void } }

function YouTubePlayerView({ detection, onBlocked }: { detection: Detection; onBlocked: (reason: string) => void }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YouTubePlayer | null>(null)
  const [ready, setReady] = useState(false)
  const videoId = detection.embedUrl?.split('/embed/')[1]?.split('?')[0] ?? ''

  useEffect(() => {
    let cancelled = false
    const init = () => {
      if (cancelled || !mountRef.current || !window.YT || !videoId) return
      playerRef.current?.destroy()
      playerRef.current = new window.YT.Player(mountRef.current, {
        videoId: decodeURIComponent(videoId),
        playerVars: { rel: 0, playsinline: 1, origin: window.location.origin, enablejsapi: 1 },
        events: {
          onReady: () => { if (!cancelled) { setReady(true); if (process.env.NODE_ENV === 'development') console.info('[CinéTrack] YouTube player ready', videoId) } },
          onError: (event) => {
            if (process.env.NODE_ENV === 'development') console.info('[CinéTrack] YouTube player error', event.data, videoId)
            const reason = event.data === 101 || event.data === 150 ? 'Le propriétaire de cette vidéo a désactivé la lecture sur les autres sites.' : event.data === 100 ? 'Cette vidéo YouTube est introuvable ou privée.' : 'YouTube ne peut pas lire cette vidéo ici.'
            onBlocked(reason)
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
    return () => { cancelled = true; playerRef.current?.destroy(); playerRef.current = null }
  }, [videoId, onBlocked])

  return <div className="relative size-full"><div ref={mountRef} className="size-full" />{!ready && <div className="absolute inset-0 grid place-items-center bg-black/50 text-sm text-[#a7aaa7]">Chargement de YouTube…</div>}</div>
}

export function Player({ room, onChanged, isHost = false }: { room: Room; onChanged: (room: Room) => void; isHost?: boolean }) {
  const [edit, setEdit] = useState(false)
  const [url, setUrl] = useState(room.video_url ?? '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [failureReason, setFailureReason] = useState('')
  const syncingRef = useRef(false)
  const detection = useMemo(() => room.video_url ? detect(room.video_url) : null, [room.video_url])
  const handleProviderFailure = useCallback((reason?: string) => { setFailureReason(reason ?? 'Cette vidéo ne peut pas être lue directement ici.'); setFailed(true) }, [])
  useEffect(() => { setFailed(false); setFailureReason('') }, [room.video_url])
  useEffect(() => {
    const onState = (event: Event) => {
      const detail = (event as CustomEvent<{ roomId: string; position: number; is_playing: boolean; playback_rate: number }>).detail
      if (!detail || detail.roomId !== room.id || !['direct', 'hls'].includes(detection?.provider ?? '')) return
      const video = document.querySelector<HTMLVideoElement>(`[data-watch-room="${room.id}"] video`)
      if (!video) return
      if (Math.abs(video.currentTime - detail.position) > 0.75) video.currentTime = detail.position
      video.playbackRate = detail.playback_rate || 1
      syncingRef.current = true
      if (detail.is_playing) void video.play().catch(() => setFailureReason('La lecture automatique est bloquée par le navigateur.'))
      else video.pause()
      window.setTimeout(() => { syncingRef.current = false }, 250)
    }
    const onLocal = (event: Event) => {
      const detail = (event as CustomEvent<{ type: string; position: number }>).detail
      if (detail) window.dispatchEvent(new CustomEvent('cinetrack:local-playback', { detail }))
    }
    window.addEventListener('cinetrack:playback-state', onState)
    window.addEventListener('cinetrack:player-event', onLocal)
    return () => { window.removeEventListener('cinetrack:playback-state', onState); window.removeEventListener('cinetrack:player-event', onLocal) }
  }, [room.id, detection?.provider])
  const save = async () => {
    setError('')
    if (!validateVideoUrl(url)) { setError('Ajoutez un lien HTTPS valide.'); return }
    setLoading(true)
    try {
      const updated = await updateRoomVideo(room.id, url)
      onChanged({ ...room, ...updated })
      setEdit(false)
      setFailed(false)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Impossible de sauvegarder ce lien.') } finally { setLoading(false) }
  }
  if (!detection) return <div className="grid aspect-video place-items-center rounded-2xl border border-white/10 bg-black p-8 text-center"><p className="text-[#a7aaa7]">Cette séance utilise le minuteur partagé, sans vidéo intégrée.</p></div>
  return <div className="space-y-3" data-watch-room={room.id}>
    <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">
      {failed || detection.provider === 'external' || detection.provider === 'dash' ? <ExternalFallback detection={detection} message={failureReason || (detection.provider === 'dash' ? 'Les flux MPEG-DASH ne sont pas pris en charge par ce navigateur.' : undefined)} /> : detection.provider === 'youtube' ? <YouTubePlayerView detection={detection} onBlocked={handleProviderFailure} /> : detection.provider === 'direct' || detection.provider === 'hls' ? <StreamPlayer detection={detection} onFailure={handleProviderFailure} /> : <iframe key={detection.embedUrl} src={detection.embedUrl} title={`${room.title} — ${detection.label}`} className="size-full border-0" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" onError={() => handleProviderFailure()} />}
      {!failed && detection.provider !== 'external' && <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-xs text-white"><Play aria-hidden="true" /> {detection.label}</span>}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><span className="text-[#a7aaa7]">Source détectée : {detection.label}</span><div className="flex gap-2"><a href={detection.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 hover:bg-white/15"><ExternalLink aria-hidden="true" /> Ouvrir</a>{isHost && <button onClick={() => { setEdit((value) => !value); setError('') }} className="rounded-full bg-white/10 px-3 py-2 hover:bg-white/15">Modifier le lien</button>}</div></div>
    {edit && <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><label className="block text-sm font-medium" htmlFor="room-video-url">Lien vidéo<input id="room-video-url" value={url} onChange={(event) => setUrl(event.target.value)} type="url" inputMode="url" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 outline-none focus:border-[#d8ff45]" /></label>{error && <p role="alert" className="mt-2 text-sm text-amber-300">{error}</p>}<div className="mt-3 flex flex-wrap gap-2"><button onClick={save} disabled={loading} className="inline-flex items-center gap-2 rounded-full bg-[#d8ff45] px-4 py-2 font-semibold text-black disabled:opacity-60">{loading ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null} Enregistrer</button><button onClick={() => setEdit(false)} className="rounded-full bg-white/10 px-4 py-2">Annuler</button></div></div>}
    {failed && <button onClick={() => setFailed(false)} className="inline-flex items-center gap-2 text-sm text-[#d8ff45]"><RefreshCw aria-hidden="true" /> Réessayer</button>}
  </div>
}
