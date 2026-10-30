import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-auth'
import { getMongoProfile } from '@/lib/mongodb-data'

export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })
    const profile = await getMongoProfile(user)
    if (!profile) return NextResponse.json({ error: 'PROFILE_UNAVAILABLE' }, { status: 500 })
    return NextResponse.json({
      id: profile.id,
      username: profile.username,
      avatar_url: profile.avatar_url,
      is_moderator: profile.is_moderator,
    })
  } catch (error) {
    console.error('[CinéTrack] profile load failed:', error)
    return NextResponse.json({ error: 'PROFILE_UNAVAILABLE' }, { status: 500 })
  }
}
