import { isIP } from 'node:net'
import { NextResponse, type NextRequest } from 'next/server'
import youtubeDl, { type Payload } from 'youtube-dl-exec'
import { getAuthenticatedUser } from '@/lib/api-auth'
import { getMongoRoom } from '@/lib/mongodb-data'
import { detectVideoProvider, validateVideoUrl } from '@/lib/video-provider'

export const runtime = 'nodejs'
export const maxDuration = 30

function isExtractableUrl(value: string) {
  if (!validateVideoUrl(value)) return false
  const url = new URL(value)
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '')
  return !url.username && !url.password &&
    !isIP(hostname) &&
    hostname.includes('.') &&
    hostname !== 'localhost' &&
    !hostname.endsWith('.localhost') &&
    !hostname.endsWith('.local') &&
    !hostname.endsWith('.internal')
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 })
    }
    if (typeof body !== 'object' || body === null || !('roomId' in body) ||
      typeof body.roomId !== 'string' || !body.roomId.trim()) {
      return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 })
    }

    const room = await getMongoRoom(body.roomId, user.id)
    if (!room) return NextResponse.json({ error: 'ROOM_FORBIDDEN' }, { status: 403 })
    if (!room.video_url || detectVideoProvider(room.video_url) !== 'external' || !isExtractableUrl(room.video_url)) {
      return NextResponse.json({ error: 'INVALID_VIDEO_URL' }, { status: 400 })
    }

    let result: string | Payload
    try {
      result = await youtubeDl(
        room.video_url,
        {
          format: 'best[ext=mp4][acodec!=none][vcodec!=none]/best[acodec!=none][vcodec!=none]',
          getUrl: true,
          ignoreConfig: true,
          noCookies: true,
          noPlaylist: true,
          noWarnings: true,
          retries: 1,
          socketTimeout: 10,
        },
        { timeout: 25_000, killSignal: 'SIGKILL' },
      )
    } catch (error) {
      console.error('[CinéTrack] video stream extraction failed:', error instanceof Error ? error.name : 'Unknown error')
      return NextResponse.json({ error: 'VIDEO_EXTRACTION_FAILED' }, { status: 422 })
    }

    if (typeof result !== 'string') {
      return NextResponse.json({ error: 'VIDEO_EXTRACTION_FAILED' }, { status: 422 })
    }

    const streamUrls = result.trim().split(/\r?\n/)
    if (streamUrls.length !== 1 || !streamUrls[0]) {
      return NextResponse.json({ error: 'VIDEO_EXTRACTION_FAILED' }, { status: 422 })
    }

    const streamUrl = streamUrls[0]
    const parsedStreamUrl = new URL(streamUrl)
    if (parsedStreamUrl.protocol !== 'https:') {
      return NextResponse.json({ error: 'VIDEO_EXTRACTION_FAILED' }, { status: 422 })
    }
    const isHls = /\.m3u8$/i.test(parsedStreamUrl.pathname)

    return NextResponse.json(
      { streamUrl, provider: isHls ? 'hls' : 'direct' },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('[CinéTrack] video extraction request failed:', error instanceof Error ? error.name : 'Unknown error')
    return NextResponse.json({ error: 'VIDEO_EXTRACTION_UNAVAILABLE' }, { status: 500 })
  }
}
