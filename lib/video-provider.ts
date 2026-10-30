export type VideoProvider = 'youtube' | 'vimeo' | 'direct' | 'hls' | 'dash' | 'external'

export function extractYouTubeId(value: string) {
  try {
    const url = new URL(value.trim())
    if (!/youtube\.com$|youtu\.be$/.test(url.hostname.replace(/^www\./, ''))) return null
    if (url.hostname.replace(/^www\./, '') === 'youtu.be') return url.pathname.slice(1).split('/')[0] || null
    if (url.pathname === '/watch') return url.searchParams.get('v')
    const match = url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?]+)/)
    return match?.[1] ?? null
  } catch { return null }
}

export function extractVimeoId(value: string) {
  try {
    const url = new URL(value.trim())
    if (!/vimeo\.com$/.test(url.hostname.replace(/^www\./, ''))) return null
    return url.pathname.match(/\/(?:video\/)?(\d+)/)?.[1] ?? null
  } catch { return null }
}

export function detectVideoProvider(value: string): VideoProvider {
  const url = value.toLowerCase()
  if (extractYouTubeId(value)) return 'youtube'
  if (extractVimeoId(value)) return 'vimeo'
  if (/\.m3u8(?:$|[?#])/.test(url)) return 'hls'
  if (/\.mpd(?:$|[?#])/.test(url)) return 'dash'
  if (/\.(mp4|webm|ogg)(?:$|[?#])/.test(url)) return 'direct'
  return 'external'
}

export function validateVideoUrl(value: string) {
  const url = value.trim()
  if (!url || url.length > 2000) return false
  try { const parsed = new URL(url); return parsed.protocol === 'https:' }
  catch { return false }
}
