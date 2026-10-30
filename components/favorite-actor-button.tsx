'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { followActor, isFavoriteActor, unfollowActor } from '@/lib/favorite-actors'

export function FavoriteActorButton({ actor }: { actor: { id: number; name: string; profile_path?: string | null } }) {
  const { user } = useAuth()
  const router = useRouter()
  const [followed, setFollowed] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) { setFollowed(false); return }
    let active = true
    isFavoriteActor(actor.id).then(value => { if (active) setFollowed(value) }).catch(() => {})
    return () => { active = false }
  }, [actor.id, user])

  async function toggle() {
    if (!user) {
      router.push(`/auth/login?next=/acteur/${actor.id}`)
      return
    }
    setBusy(true)
    try {
      if (followed) {
        await unfollowActor(actor.id)
        setFollowed(false)
      } else {
        await followActor({ id: actor.id, name: actor.name, profile_path: actor.profile_path ?? null })
        setFollowed(true)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold ${followed ? 'border border-white/15 bg-white/10 text-white' : 'bg-[#d8ff45] text-black'}`}
    >
      <Heart className={`size-4 ${followed ? 'fill-[#d8ff45] text-[#d8ff45]' : ''}`} aria-hidden="true" />
      {user ? (followed ? 'Ne plus suivre' : 'Suivre cet acteur') : 'Se connecter pour suivre'}
    </button>
  )
}
