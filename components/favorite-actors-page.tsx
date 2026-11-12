'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Heart, Loader2, Users } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { getFavoriteActors, unfollowActor, type FavoriteActor } from '@/lib/favorite-actors'

const image = (path: string | null, size = 'w342') => path ? `https://image.tmdb.org/t/p/${size}${path}` : null

export default function FavoriteActorsPage({ embedded = false }: { embedded?: boolean }) {
  const { user, loading: authLoading } = useAuth()
  const [actors, setActors] = useState<FavoriteActor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [removingId, setRemovingId] = useState<number | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) { setActors([]); setLoading(false); return }
    let active = true
    setLoading(true)
    getFavoriteActors()
      .then(list => { if (active) setActors(list) })
      .catch(() => { if (active) setError('Impossible de charger les acteurs suivis. Réessayez.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [authLoading, user])

  async function remove(actorId: number) {
    setRemovingId(actorId)
    setError('')
    try {
      await unfollowActor(actorId)
      setActors(current => current.filter(actor => actor.id !== actorId))
    } catch {
      setError('Impossible de ne plus suivre cet acteur. Réessayez.')
    } finally {
      setRemovingId(null)
    }
  }

  const Container = embedded ? 'div' : 'main'

  return (
    <Container id={embedded ? undefined : 'main-content'} className={embedded ? 'mt-8 text-foreground' : 'min-h-screen bg-[#080909] px-5 pb-24 pt-10 text-[#f4f5f2] sm:px-8'}>
      <div className={embedded ? '' : 'mx-auto max-w-7xl'}>
        {embedded ? (
          <h2 className="text-xl font-semibold">Acteurs suivis</h2>
        ) : (
          <>
            <p className="mb-3 text-xs uppercase tracking-[0.22em] text-[#d8ff45]">Module 5 · C4</p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">Acteurs suivis</h1>
            <p className="mt-3 max-w-2xl text-[#a7aaa7]">Vos acteurs préférés, pour les retrouver plus tard depuis leur page.</p>
          </>
        )}

        {!user && !authLoading && (
          <div className="mt-12 rounded-2xl border border-dashed border-white/15 p-10 text-center">
            <p className="text-[#a7aaa7]">Connectez-vous pour suivre des acteurs et consulter cette liste.</p>
            <Link href="/auth/login?next=/acteurs-suivis" className="mt-6 inline-flex rounded-full bg-[#d8ff45] px-5 py-3 font-semibold text-black">Se connecter</Link>
          </div>
        )}

        {user && loading && <div className="mt-16 flex justify-center"><Loader2 className="size-6 animate-spin text-[#d8ff45]" aria-label="Chargement" /></div>}

        {user && !loading && error && <p role="alert" className="mt-8 text-sm text-red-400">{error}</p>}

        {user && !loading && !error && actors.length === 0 && (
          <div className="mt-12 rounded-2xl border border-dashed border-white/15 p-10 text-center">
            <Users className="mx-auto size-10 text-white/30" aria-hidden="true" />
            <p className="mt-4 text-[#a7aaa7]">Vous ne suivez encore aucun acteur.</p>
            <Link href="/actors" className="mt-6 inline-flex rounded-full border border-white/15 px-5 py-3 text-sm font-semibold">Découvrir des acteurs</Link>
          </div>
        )}

        {user && !loading && !error && actors.length > 0 && (
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {actors.map(actor => {
              const photo = image(actor.profile_path)
              return (
                <article key={actor.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                  <Link href={`/acteur/${actor.id}`} className="block">
                    <div className="aspect-[3/4] bg-white/10">
                      {photo ? <img src={photo} alt={`Photo de ${actor.name}`} className="size-full object-cover" /> : <span className="flex size-full items-center justify-center p-3 text-center text-xs text-white/45">Photo indisponible</span>}
                    </div>
                    <h2 className="truncate p-3 text-sm font-medium">{actor.name}</h2>
                  </Link>
                  <button type="button" onClick={() => void remove(actor.id)} disabled={removingId === actor.id} className="flex w-full items-center justify-center gap-2 border-t border-white/10 px-3 py-2 text-xs text-[#a7aaa7] hover:text-white disabled:opacity-50">
                    <Heart className="size-3 fill-[#d8ff45] text-[#d8ff45]" aria-hidden="true" /> {removingId === actor.id ? 'Mise à jour…' : 'Ne plus suivre'}
                  </button>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </Container>
  )
}
