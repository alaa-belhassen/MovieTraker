export type PlaybackStatus = 'playing' | 'paused' | 'blocked' | 'loading' | 'ended'

export type PlaybackAdapter = {
  initialize: () => Promise<void> | void
  play: () => Promise<void> | void
  pause: () => Promise<void> | void
  seek: (position: number) => Promise<void> | void
  getCurrentPosition: () => number
  getPlaybackStatus: () => PlaybackStatus
  subscribeToEvents: (listener: (event: { type: 'play' | 'pause' | 'seek' | 'error' | 'ended'; position: number }) => void) => () => void
  destroy: () => void
}

export type ResolvedPlaybackSource = { url: string; provider: 'youtube' | 'vimeo' | 'dailymotion' | 'native' | 'hls' | 'dash' | 'external'; id?: string; embedUrl?: string }

export function resolvePlaybackSource(value: string): ResolvedPlaybackSource | null {
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'https:') return null
    const host = url.hostname.replace(/^www\./, '').toLowerCase()
    if (host === 'youtube.com' || host === 'youtu.be') {
      const id = host === 'youtu.be' ? url.pathname.slice(1).split('/')[0] : url.searchParams.get('v') ?? url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1]
      return id ? { url: url.toString(), provider: 'youtube', id, embedUrl: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?enablejsapi=1&playsinline=1` } : null
    }
    if (host === 'vimeo.com' || host === 'player.vimeo.com') { const id = url.pathname.match(/\/(?:video\/)?(\d+)/)?.[1]; return id ? { url: url.toString(), provider: 'vimeo', id, embedUrl: `https://player.vimeo.com/video/${id}` } : null }
    if (host === 'dailymotion.com' || host === 'dai.ly') { const id = host === 'dai.ly' ? url.pathname.slice(1) : url.pathname.match(/\/video\/([^_/?]+)/)?.[1]; return id ? { url: url.toString(), provider: 'dailymotion', id, embedUrl: `https://www.dailymotion.com/embed/video/${id}` } : null }
    if (/\.m3u8(?:$|[?#])/i.test(url.pathname + url.search)) return { url: url.toString(), provider: 'hls' }
    if (/\.mpd(?:$|[?#])/i.test(url.pathname + url.search)) return { url: url.toString(), provider: 'dash' }
    if (/\.(mp4|webm|ogg)(?:$|[?#])/i.test(url.pathname + url.search)) return { url: url.toString(), provider: 'native' }
    return { url: url.toString(), provider: 'external' }
  } catch { return null }
}

export function projectedPosition(state: { position_seconds: number; is_playing: boolean; reference_at: string; playback_rate: number }, now = Date.now()) {
  if (!state.is_playing) return state.position_seconds
  const elapsed = Math.max(0, now - Date.parse(state.reference_at)) / 1000
  return state.position_seconds + elapsed * state.playback_rate
}
