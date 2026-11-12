import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-auth'
import { deleteMongoUserData, getMongoProfile, updateMongoAvatar, updateMongoUsername } from '@/lib/mongodb-data'
import { createAdminClient } from '@/lib/supabase/admin'

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

// U2 - Modification du profil. Seuls `username` et `avatar_url` sont modifiables : is_moderator est toujours ignoré.
export async function PATCH(request: Request) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })
    const body = await request.json().catch(() => null) as { username?: unknown; avatar_url?: unknown } | null
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 })
    const hasUsername = 'username' in body
    const hasAvatar = 'avatar_url' in body
    if (!hasUsername && !hasAvatar) return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 })

    const response: { username?: string; avatar_url?: string | null } = {}
    if (hasUsername) {
      if (typeof body.username !== 'string') return NextResponse.json({ error: 'INVALID_USERNAME' }, { status: 400 })
      const result = await updateMongoUsername(user, body.username)
      if (!result.ok) {
        return result.reason === 'TAKEN'
          ? NextResponse.json({ error: 'USERNAME_TAKEN' }, { status: 409 })
          : NextResponse.json({ error: 'INVALID_USERNAME' }, { status: 400 })
      }
      response.username = result.username
    }
    if (hasAvatar) {
      const result = await updateMongoAvatar(user, body.avatar_url)
      if (!result.ok) return NextResponse.json({ error: 'INVALID_AVATAR' }, { status: 400 })
      response.avatar_url = result.avatar_url
    }
    return NextResponse.json(response)
  } catch (error) {
    console.error('[CinéTrack] profile update failed:', error)
    return NextResponse.json({ error: 'PROFILE_UNAVAILABLE' }, { status: 500 })
  }
}

// U2 - Suppression définitive du compte (données MongoDB, photo, puis compte d'authentification Supabase).
export async function DELETE(request: Request) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 })
    const body = await request.json().catch(() => null) as { confirm?: unknown } | null
    if (body?.confirm !== 'SUPPRIMER') return NextResponse.json({ error: 'CONFIRMATION_REQUIRED' }, { status: 400 })

    // On vérifie la clé AVANT d'effacer quoi que ce soit : sans elle, rien n'est supprimé.
    const admin = createAdminClient()
    if (!admin) return NextResponse.json({ error: 'ACCOUNT_DELETION_UNAVAILABLE' }, { status: 503 })

    try {
      const { data: files } = await admin.storage.from('avatars').list(user.id)
      if (files?.length) await admin.storage.from('avatars').remove(files.map((file) => `${user.id}/${file.name}`))
    } catch (error) {
      console.warn('[CinéTrack] avatar cleanup skipped:', error)
    }

    await deleteMongoUserData(user.id)
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) {
      console.error('[CinéTrack] auth user deletion failed:', error)
      return NextResponse.json({ error: 'ACCOUNT_DELETION_FAILED' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[CinéTrack] account deletion failed:', error)
    return NextResponse.json({ error: 'ACCOUNT_DELETION_FAILED' }, { status: 500 })
  }
}
